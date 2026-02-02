import { Injectable, Logger } from '@nestjs/common';
import { FicrClient } from './ficr.client';
import { FicrParser } from './ficr.parser';
import { CompetitionRepository } from '../../database/repository/competition.repository';
import { AthleteRepository } from '../../database/repository/athlete.repository';
import { RaceRepository } from '../../database/repository/race.repository';
import { ResultRepository } from '../../database/repository/result.repository';
import { RelayRepository } from '../../database/repository/relay.repository';
import { IngestionOperationRepository } from '../../database/repository/ingestion-operation.repository';
import { Types } from 'mongoose';
import { asyncForEach } from '../../utils/async-for-each';
import { Source } from '../../type/source.enum';
import { IngestionStatus } from '../../type/ingestion-status.enum';
import { IngestionStep } from '../../type/ingestion-step.enum';
import { CompetitionDocument } from '../../database/schema/competition.schema';
import { FicrCompetitionDto } from './dto/ficr-competition.dto';
import { FicrAthleteEntryListDto } from './dto/ficr-athlete.dto';
import { FicrTempoDto } from './dto/fict-tempo.dto';
import {
  Relay,
  RelayLeg,
  RelayWithId,
} from '../../database/schema/relay.schema';
import { PoolLength } from '../../type/pool-length.enum';

@Injectable()
export class FicrService {
  private readonly logger = new Logger(FicrService.name);
  private readonly DELAY_BETWEEN_COMPETITIONS = 1000; // 1 second
  private readonly DELAY_BETWEEN_ATHLETES = 500; // 500ms

  constructor(
    private readonly client: FicrClient,
    private readonly parser: FicrParser,
    private readonly competitionRepository: CompetitionRepository,
    private readonly athleteRepository: AthleteRepository,
    private readonly raceRepository: RaceRepository,
    private readonly resultRepository: ResultRepository,
    private readonly relayRepository: RelayRepository,
    private readonly ingestionOperationRepository: IngestionOperationRepository,
  ) {}

  /**
   * Utility to add delay between API calls
   */
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async ingestFicrByYear(year: number) {
    this.logger.log(`Starting FICR ingestion for year ${year}`);

    const schedule = await this.client.fetchSchedule(year);
    this.logger.log(`Found ${schedule.length} competitions in schedule`);

    await asyncForEach(schedule, async (competitionDto, index) => {
      if (index > 0) {
        await this.delay(this.DELAY_BETWEEN_COMPETITIONS);
      }

      try {
        await this.ingestCompetition(competitionDto, year);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Error processing competition ${competitionDto.ID}: ${errorMessage}`,
        );
      }
    });

    this.logger.log(`Completed FICR ingestion for year ${year}`);
  }

  private async ingestCompetition(
    competitionDto: FicrCompetitionDto,
    year: number,
  ): Promise<void> {
    const competitionData = this.parser.parseCompetition(competitionDto);

    // Check if competition should be skipped
    if (await this.shouldSkipCompetition(competitionDto.ID, competitionData)) {
      return;
    }

    this.logger.log(
      `Processing competition ${competitionDto.ID} (${competitionData.name})`,
    );

    // Upsert competition first to get the ID
    const competition =
      await this.competitionRepository.upsertOne(competitionData);
    const competitionId = competition._id;

    // 1) Create ingestion operation
    const operation = await this.ingestionOperationRepository.create({
      competition: competitionId,
      source: Source.FICR,
      status: IngestionStatus.STARTED,
      step: IngestionStep.COMPETITION,
      startedAt: new Date(),
    });

    let currentStep = IngestionStep.COMPETITION;

    try {
      // 2) Execute ingestion steps
      await this.ingestCompetitionStep(
        operation._id,
        competitionId,
        competitionData,
      );
      currentStep = IngestionStep.EVENTS;

      const entryList = await this.ingestEventsStep(
        operation._id,
        competitionId,
        competitionDto,
        year,
      );
      currentStep = IngestionStep.RESULTS;

      const { processedAthletes, failedAthletes, resultsCreated, races } =
        await this.ingestResultsStep(
          operation._id,
          competitionId,
          competitionDto,
          year,
          entryList,
        );

      // Update competition with races
      await this.competitionRepository.updateRaces(competitionId, races);

      // 3) Update operation as completed/partial
      const finalStatus =
        failedAthletes > 0
          ? IngestionStatus.PARTIAL
          : IngestionStatus.COMPLETED;

      await this.ingestionOperationRepository.updateStatus(
        operation._id,
        finalStatus,
        IngestionStep.RESULTS,
        undefined,
        new Date(),
      );

      // Update competition source status (quick lookup)
      await this.competitionRepository.updateSourceStatus(
        competitionId,
        Source.FICR,
        finalStatus,
      );

      this.logger.log(
        `Completed processing competition ${competitionDto.ID} - Processed: ${processedAthletes}, Failed: ${failedAthletes}, Results: ${resultsCreated}`,
      );
    } catch (error) {
      // 3) Update operation with error
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await this.ingestionOperationRepository.updateStatus(
        operation._id,
        IngestionStatus.FAILED,
        currentStep,
        errorMessage,
        new Date(),
      );

      // Update competition source status
      await this.competitionRepository.updateSourceStatus(
        competitionId,
        Source.FICR,
        IngestionStatus.FAILED,
      );

      throw error;
    }
  }

  private async shouldSkipCompetition(
    ficrId: number,
    competitionData: Partial<CompetitionDocument>,
  ): Promise<boolean> {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    if (competitionData.date && competitionData.date.getTime() > oneDayAgo) {
      return true;
    }

    const existingCompetition = await this.competitionRepository.findByFicrId(
      ficrId.toString(),
    );

    if (!existingCompetition?.sourceStatuses) {
      return false;
    }

    const ficrStatus = existingCompetition.sourceStatuses.find(
      (s) => s.source === Source.FICR,
    );

    if (
      ficrStatus?.lastStatus === IngestionStatus.COMPLETED &&
      ficrStatus.lastIngestedAt
    ) {
      this.logger.log(
        `Competition ${ficrId} (${competitionData.name}) already completed ingestion from FICR on ${ficrStatus.lastIngestedAt.toString()}, skipping`,
      );
      return true;
    }

    return false;
  }

  private async ingestCompetitionStep(
    operationId: Types.ObjectId,
    competitionId: Types.ObjectId,
    competitionData: Partial<CompetitionDocument>,
  ): Promise<void> {
    try {
      // Update operation step
      await this.ingestionOperationRepository.updateStatus(
        operationId,
        IngestionStatus.STARTED,
        IngestionStep.COMPETITION,
      );

      // Do the actual work - upsert competition
      await this.competitionRepository.upsertOne(competitionData);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await this.ingestionOperationRepository.updateStatus(
        operationId,
        IngestionStatus.FAILED,
        IngestionStep.COMPETITION,
        errorMessage,
        new Date(),
      );
      throw error;
    }
  }

  private async ingestEventsStep(
    operationId: Types.ObjectId,
    competitionId: Types.ObjectId,
    competitionDto: FicrCompetitionDto,
    year: number,
  ): Promise<FicrAthleteEntryListDto[]> {
    try {
      // Update operation step
      await this.ingestionOperationRepository.updateStatus(
        operationId,
        IngestionStatus.STARTED,
        IngestionStep.EVENTS,
      );

      // Do the actual work - fetch entry list
      const entryList = await this.client.fetchEntryList(
        competitionDto.TeamCode,
        year,
        competitionDto.ID,
      );

      this.logger.log(
        `Found ${entryList.length} athletes in competition ${competitionDto.ID}`,
      );

      await this.delay(200);

      return entryList;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await this.ingestionOperationRepository.updateStatus(
        operationId,
        IngestionStatus.FAILED,
        IngestionStep.EVENTS,
        errorMessage,
        new Date(),
      );
      throw error;
    }
  }

  private async ingestResultsStep(
    operationId: Types.ObjectId,
    competitionId: Types.ObjectId,
    competitionDto: FicrCompetitionDto,
    year: number,
    entryList: FicrAthleteEntryListDto[],
  ): Promise<{
    processedAthletes: number;
    failedAthletes: number;
    resultsCreated: number;
    races: Types.ObjectId[];
  }> {
    // Update operation step
    await this.ingestionOperationRepository.updateStatus(
      operationId,
      IngestionStatus.STARTED,
      IngestionStep.RESULTS,
    );

    let processedAthletes = 0;
    let failedAthletes = 0;
    let totalResultsCreated = 0;
    const racesSet = new Set<string>(); // Track unique race IDs
    const allRelayData: Array<{
      athleteId: Types.ObjectId;
      raceId: Types.ObjectId;
      tempi: FicrTempoDto[];
    }> = [];

    // Do the actual work - process athlete results
    await asyncForEach(entryList, async (athleteEntry, athleteIndex) => {
      try {
        if (athleteIndex > 0) {
          await this.delay(this.DELAY_BETWEEN_ATHLETES);
        }

        const { resultsCount, raceIds, relayData } =
          await this.processAthleteResults(
            operationId,
            competitionDto,
            year,
            athleteEntry,
          );

        totalResultsCreated += resultsCount;
        raceIds.forEach((id) => racesSet.add(id.toString()));
        allRelayData.push(...relayData);
        processedAthletes++;
      } catch (error) {
        failedAthletes++;
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Error processing athlete ${athleteEntry.Numero} in competition ${competitionDto.ID}: ${errorMessage}`,
        );
      }
    });

    // Process relays after all athletes are processed
    if (allRelayData.length > 0) {
      await this.processRelays(competitionId, allRelayData);
    }

    const races = Array.from(racesSet).map((id) => new Types.ObjectId(id));

    return {
      processedAthletes,
      failedAthletes,
      resultsCreated: totalResultsCreated,
      races,
    };
  }

  private async processAthleteResults(
    operationId: Types.ObjectId,
    competitionDto: FicrCompetitionDto,
    year: number,
    athleteEntry: FicrAthleteEntryListDto,
  ): Promise<{
    resultsCount: number;
    raceIds: Types.ObjectId[];
    relayData: Array<{
      athleteId: Types.ObjectId;
      raceId: Types.ObjectId;
      tempi: FicrTempoDto[];
    }>;
  }> {
    // Fetch athlete results
    const athleteResultsDto = await this.client.fetchAthleteResults(
      competitionDto.TeamCode,
      year,
      competitionDto.ID,
      athleteEntry.Numero,
    );

    // Parse and upsert athlete
    const athleteData = this.parser.parseAthlete(athleteResultsDto.atleta);
    const athlete = await this.athleteRepository.upsertOne(athleteData);

    // Group results by event (DescrGara)
    const eventsMap = new Map<string, typeof athleteResultsDto.tempi>();
    athleteResultsDto.tempi.forEach((tempo) => {
      const key = tempo.DescrGara.trim();
      const arr = eventsMap.get(key) ?? [];
      arr.push(tempo);
      eventsMap.set(key, arr);
    });

    // Process each event and build results array
    const resultsToCreate: Array<{
      athlete: Types.ObjectId;
      race: Types.ObjectId;
      category?: string;
      displayTime: string;
      millis: number;
      rank?: number;
      splits?: Array<{
        distance: number;
        displayTime: string;
        millis: number;
      }>;
    }> = [];

    const raceIds: Types.ObjectId[] = [];
    const relayData: Array<{
      athleteId: Types.ObjectId;
      raceId: Types.ObjectId;
      tempi: FicrTempoDto[];
    }> = [];

    await asyncForEach(
      Array.from(eventsMap.entries()),
      async ([eventDescription, tempi]) => {
        // Parse event from description
        const event = this.parser.parseEvent(eventDescription);
        if (!event) {
          this.logger.warn(
            `Could not parse event from description: ${eventDescription}`,
          );
          return;
        }

        // Pool length from FICR competition DTO (required; default 50 if not 25 or 50)
        const poolLength =
          competitionDto.pi_LunghezzaVasca === 25
            ? PoolLength.L25
            : competitionDto.pi_LunghezzaVasca === 50
              ? PoolLength.L50
              : PoolLength.L50;

        // Find or create race for this event
        const race = await this.raceRepository.findOrCreate({
          stroke: event.stroke,
          totalDistance: event.totalDistance,
          lapDistance: event.lapDistance,
          relay: event.relay,
          legs: event.legs,
          gender: 'X', // Mixed/unknown from event description; can be refined from category if needed
          name: event.name,
          poolLength,
        });

        // Track race ID
        if (!raceIds.some((id) => id.equals(race._id))) {
          raceIds.push(race._id);
        }

        // Check if this is a relay event
        const isRelay = tempi.some((t) => t.Staffetta);
        if (isRelay) {
          const relayTempi = tempi.filter((t) => t.Staffetta);
          relayData.push({
            athleteId: athlete._id,
            raceId: race._id,
            tempi: relayTempi,
          });
          return;
        }

        // Process individual event
        // Sort tempi by distance (meters)
        const sortedTempi = tempi.sort((a, b) => a.Metri - b.Metri);

        // Create splits
        const splits = sortedTempi.map((t) => ({
          distance: t.Metri,
          displayTime: t.Tempo.trim(),
          millis: this.parser.timeToMillis(t.Tempo.trim()),
        }));

        // Final split is the result time
        const finalSplit = splits[splits.length - 1];

        const category = sortedTempi[0]?.Categoria?.trim() ?? '';
        resultsToCreate.push({
          athlete: athlete._id,
          race: race._id,
          category,
          displayTime: finalSplit.displayTime,
          millis: finalSplit.millis,
          rank: sortedTempi[0]?.Pos,
          splits,
        });
      },
    );

    // Create results in bulk
    if (resultsToCreate.length > 0) {
      await this.resultRepository.createMany(resultsToCreate);
      this.logger.log(
        `Created ${resultsToCreate.length} results for athlete ${athlete.firstName} ${athlete.lastName}`,
      );
    }

    return {
      resultsCount: resultsToCreate.length,
      raceIds,
      relayData,
    };
  }

  /** Groups relay tempi by (Categoria, TipoGara, Corsia, Batteria); each group = one relay team. */
  private async processRelays(
    competitionId: Types.ObjectId,
    relayData: Array<{
      athleteId: Types.ObjectId;
      raceId: Types.ObjectId;
      tempi: FicrTempoDto[];
    }>,
  ): Promise<void> {
    if (!relayData.length) return;

    const relayTempi = this.collectRelayTempi(relayData);
    const relayGroups = this.groupTempiByRelay(relayTempi);
    let relaysCreated = 0;
    let legResultsCreated = 0;

    await asyncForEach(Array.from(relayGroups.values()), async (group) => {
      const raceId = this.getRaceIdForGroup(relayData, group);
      if (!raceId) {
        this.logger.warn(
          `Could not resolve raceId for relay ${group[0].Categoria}_${group[0].TipoGara}_${group[0].Corsia}_${group[0].Batteria}`,
        );
        return;
      }

      const race = await this.raceRepository.findById(raceId);
      if (!race) {
        this.logger.warn(`Race ${raceId.toString()} not found for relay`);
        return;
      }

      const athleteByLeg = this.resolveAthleteByLeg(relayData, group);
      const uniqueTempi = this.deduplicateTempi(group);
      const byLeg = this.groupByLeg(uniqueTempi);

      const category = group[0].Categoria?.trim() ?? '';
      const relayDoc = this.buildRelayDoc(
        competitionId,
        raceId,
        category,
        race.legs,
        race.lapDistance,
        byLeg,
        athleteByLeg,
      );

      if (!relayDoc) return;

      const { relay: savedRelay, created } =
        await this.relayRepository.findOrCreate(relayDoc);
      if (created) {
        relaysCreated += 1;
        const legResults = (savedRelay.legs ?? []).map((l) => ({
          athlete: l.athlete,
          race: savedRelay.race,
          relay: savedRelay._id,
          leg: l.leg,
          category: savedRelay.category,
          displayTime: l.displayTime ?? '0.0',
          millis: l.millis ?? 0,
        }));
        if (legResults.length > 0) {
          await this.resultRepository.createMany(legResults);
          legResultsCreated += legResults.length;
        }
      }
    });

    if (relaysCreated > 0) {
      this.logger.log(
        `Created ${relaysCreated} relays and ${legResultsCreated} relay-leg results for competition ${competitionId.toString()}`,
      );
    }
  }

  /** Returns raceId for the relay group by matching the first tempo to relayData. */
  private getRaceIdForGroup(
    relayData: Array<{ raceId: Types.ObjectId; tempi: FicrTempoDto[] }>,
    group: FicrTempoDto[],
  ): Types.ObjectId | null {
    if (group.length === 0) return null;

    const ref = group[0];
    let resolved: Types.ObjectId | null = null;

    relayData.forEach((entry) => {
      entry.tempi.forEach((t) => {
        if (
          t.Staffetta &&
          t.Categoria === ref.Categoria &&
          t.TipoGara === ref.TipoGara &&
          t.Corsia === ref.Corsia &&
          t.Batteria === ref.Batteria
        ) {
          resolved = entry.raceId;
        }
      });
    });

    return resolved;
  }

  /** Flattens all relay tempi from relayData (one array per athlete) into a single array. */
  private collectRelayTempi(
    relayData: Array<{
      athleteId: Types.ObjectId;
      raceId: Types.ObjectId;
      tempi: FicrTempoDto[];
    }>,
  ): FicrTempoDto[] {
    const result: FicrTempoDto[] = [];

    relayData.forEach((entry) => {
      entry.tempi.forEach((t) => {
        if (t.Staffetta) {
          result.push(t);
        }
      });
    });

    return result;
  }

  /** Groups tempi by relay key (Categoria_TipoGara_Corsia_Batteria). */
  private groupTempiByRelay(
    tempi: FicrTempoDto[],
  ): Map<string, FicrTempoDto[]> {
    const groups = new Map<string, FicrTempoDto[]>();

    tempi.forEach((t) => {
      const key = `${t.Categoria}_${t.TipoGara}_${t.Corsia}_${t.Batteria}`;
      const group = groups.get(key) ?? [];
      group.push(t);
      groups.set(key, group);
    });

    return groups;
  }

  /** Maps leg number → athleteId by matching relayData tempi to this group and using Frazione. */
  private resolveAthleteByLeg(
    relayData: Array<{ athleteId: Types.ObjectId; tempi: FicrTempoDto[] }>,
    group: FicrTempoDto[],
  ): Map<number, Types.ObjectId> {
    const athleteByLeg = new Map<number, Types.ObjectId>();
    if (group.length === 0) return athleteByLeg;

    const ref = group[0];

    relayData.forEach((entry) => {
      const relevantTempi = entry.tempi.filter(
        (t) =>
          t.Staffetta &&
          t.Categoria === ref.Categoria &&
          t.TipoGara === ref.TipoGara &&
          t.Corsia === ref.Corsia &&
          t.Batteria === ref.Batteria,
      );

      if (relevantTempi.length === 0) return;

      const leg = this.resolveAthleteLeg(relevantTempi);

      if (leg && !athleteByLeg.has(leg)) {
        athleteByLeg.set(leg, entry.athleteId);
      }
    });

    return athleteByLeg;
  }

  /** Picks the leg (Frazione) that appears most often in this athlete's tempi. */
  private resolveAthleteLeg(tempi: FicrTempoDto[]): number | null {
    const counts = new Map<number, number>();

    tempi.forEach((t) => {
      if (!t.Staffetta) return;
      counts.set(t.Frazione, (counts.get(t.Frazione) ?? 0) + 1);
    });

    let resolved: number | null = null;
    let max = 0;

    counts.forEach((count, leg) => {
      if (count > max) {
        max = count;
        resolved = leg;
      }
    });

    return resolved;
  }

  /** Removes duplicate splits: the same (Frazione, Metri, Tempo) appears once per athlete, we keep one per (leg, distance, time). */
  private deduplicateTempi(tempi: FicrTempoDto[]): FicrTempoDto[] {
    const map = new Map<string, FicrTempoDto>();

    tempi.forEach((t) => {
      const key = `${t.Frazione}_${t.Metri}_${t.Tempo}`;
      if (!map.has(key)) {
        map.set(key, t);
      }
    });

    return Array.from(map.values());
  }

  /** Groups splits by leg number (Frazione). Used for leg times and handoff cumulative times. */
  private groupByLeg(tempi: FicrTempoDto[]): Map<number, FicrTempoDto[]> {
    const map = new Map<number, FicrTempoDto[]>();

    tempi.forEach((t) => {
      const list = map.get(t.Frazione) ?? [];
      list.push(t);
      map.set(t.Frazione, list);
    });

    return map;
  }

  /** Builds one relay document from byLeg, athleteByLeg, and race lap/leg config. */
  private buildRelayDoc(
    competitionId: Types.ObjectId,
    raceId: Types.ObjectId,
    category: string,
    numLegs: number,
    lapDistance: number,
    byLeg: Map<number, FicrTempoDto[]>,
    athleteByLeg: Map<number, Types.ObjectId>,
  ): Partial<RelayWithId> | null {
    if (byLeg.size !== numLegs) {
      this.logger.warn(
        `Invalid relay: expected ${numLegs} legs, found ${byLeg.size}`,
      );
      return null;
    }

    const { legs, splits, finalTime, rank, team } = this.buildLegsAndSplits(
      numLegs,
      lapDistance,
      byLeg,
      athleteByLeg,
    );

    if (!finalTime || !this.validateLegs(legs, numLegs)) return null;

    const ref = Array.from(byLeg.values())[0][0];

    return {
      competition: competitionId,
      race: raceId,
      category,
      lane: ref.Corsia,
      heat: ref.Batteria,
      team,
      displayTime: finalTime.displayTime,
      millis: finalTime.millis,
      rank,
      legs: legs.sort((a, b) => a.leg - b.leg),
      splits,
    };
  }

  /** Leg times and splits from handoff distances (lapDistance × 1..numLegs). Uses cumulative split at each handoff. */
  private buildLegsAndSplits(
    numLegs: number,
    lapDistance: number,
    byLeg: Map<number, FicrTempoDto[]>,
    athleteByLeg: Map<number, Types.ObjectId>,
  ): {
    legs: RelayLeg[];
    splits: Relay['splits'];
    finalTime: { displayTime: string; millis: number } | null;
    rank?: number;
    team?: string;
  } {
    const legs: RelayLeg[] = [];
    const splits: Relay['splits'] = [];
    let finalTime: { displayTime: string; millis: number } | null = null;
    let rank: number | undefined;
    let team: string | undefined;

    // Handoff distances: 50, 100, 150, 200 for 4×50; 200, 400, 600, 800 for 4×200
    const handoffDistances: number[] = [];
    for (let i = 1; i <= numLegs; i++) {
      handoffDistances.push(i * lapDistance);
    }

    // Cumulative time at each handoff: take split at that distance from any leg
    const cumulAtHandoff: number[] = [];
    for (let i = 0; i < numLegs; i++) {
      const D = handoffDistances[i];
      let millis = 0;
      const legArrays = Array.from(byLeg.values());
      legArrays.forEach((tempi) => {
        if (millis > 0) return;
        const t = tempi.find((x) => x.Metri === D);
        if (t) millis = this.parser.timeToMillis(t.Tempo.trim());
      });
      cumulAtHandoff.push(millis);
    }

    // Leg time = cumulative at end of this leg minus cumulative at end of previous leg
    const legMillis: number[] = [];
    for (let i = 0; i < numLegs; i++) {
      const prev = i === 0 ? 0 : cumulAtHandoff[i - 1];
      legMillis.push(cumulAtHandoff[i] - prev);
    }

    for (let leg = 1; leg <= numLegs; leg++) {
      const athleteId = athleteByLeg.get(leg);
      if (!athleteId) {
        this.logger.warn(`Missing athlete for leg ${leg}`);
        continue;
      }
      const legTimeMillis = legMillis[leg - 1] ?? 0;
      legs.push({
        athlete: athleteId,
        leg,
        displayTime: this.millisToDisplayTime(legTimeMillis),
        millis: legTimeMillis,
      });
    }

    // One split per handoff distance: cumulative time at that distance, with the leg that swam to it
    for (let i = 0; i < numLegs; i++) {
      const distance = handoffDistances[i];
      const millis = cumulAtHandoff[i];
      splits.push({
        distance,
        displayTime: this.millisToDisplayTime(millis),
        millis,
        leg: i + 1,
      });
    }

    if (cumulAtHandoff.length > 0) {
      const lastMillis = cumulAtHandoff[numLegs - 1];
      finalTime = {
        displayTime: this.millisToDisplayTime(lastMillis),
        millis: lastMillis,
      };
      const lastLegTempi = byLeg.get(numLegs);
      if (lastLegTempi?.length) {
        const atTotal = lastLegTempi.find(
          (t) => t.Metri === handoffDistances[numLegs - 1],
        );
        if (atTotal) {
          rank = atTotal.Pos;
          team = atTotal.Squadra?.toString();
        }
      }
    }

    return { legs, splits, finalTime, rank, team };
  }

  private millisToDisplayTime(millis: number): string {
    if (millis <= 0) return '0.0';
    const totalSeconds = millis / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const secInt = Math.floor(seconds);
    const centis = Math.round((seconds - secInt) * 100);
    if (minutes > 0) {
      return `${minutes}'${secInt.toString().padStart(2, '0')}.${centis.toString().padStart(2, '0')}`;
    }
    return `${secInt}.${centis.toString().padStart(2, '0')}`;
  }

  private validateLegs(legs: RelayLeg[], expectedCount: number): boolean {
    if (legs.length !== expectedCount) return false;
    const nums = legs.map((l) => l.leg).sort((a, b) => a - b);
    const expected = Array.from(
      { length: expectedCount },
      (_, i) => i + 1,
    ).join(',');
    return nums.join(',') === expected;
  }
}
