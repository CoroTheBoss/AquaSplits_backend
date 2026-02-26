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
import { TimeParser } from '../../utils/time-parser';
import { ResultWithId } from '../../database/schema/result.schema';
import { FicrPdfParser } from './ficr.pdf.parser';

@Injectable()
export class FicrService {
  private readonly logger = new Logger(FicrService.name);
  private readonly DELAY_BETWEEN_COMPETITIONS = 1000; // 1 second
  private readonly DELAY_BETWEEN_ATHLETES = 500; // 500ms

  constructor(
    private readonly client: FicrClient,
    private readonly parser: FicrParser,
    private readonly pdfParser: FicrPdfParser,
    private readonly competitionRepository: CompetitionRepository,
    private readonly athleteRepository: AthleteRepository,
    private readonly raceRepository: RaceRepository,
    private readonly resultRepository: ResultRepository,
    private readonly relayRepository: RelayRepository,
    private readonly ingestionOperationRepository: IngestionOperationRepository,
  ) {}

  /**
   * Pauses execution for a specified amount of time.
   *
   * @param ms - The delay duration in milliseconds.
   * @returns A Promise that resolves after the given time has elapsed.
   *
   * @example
   * await this.delay(1000); // waits for 1 second
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

  /**
   * Ingests a specific FICR competition by year, team code, and competition ID.
   *
   * This is the same flow as ingestFicrByYear but for a single competition.
   * It fetches the schedule for the year, filters by teamCode and competitionId,
   * then uses the existing ingestCompetition flow.
   *
   * @param year - The year of the competition.
   * @param teamCode - The team code (competition number) of the competition.
   * @param competitionId - The competition ID.
   * @throws Error if the competition is not found or ingestion fails.
   *
   * @example
   * await this.ingestFicrCompetition(2024, 12345, 67890);
   */
  async ingestFicrCompetition(
    year: number,
    teamCode: number,
    competitionId: number,
  ): Promise<void> {
    this.logger.log(
      `Starting FICR ingestion for competition year ${year}, teamCode ${teamCode}, ID ${competitionId}`,
    );

    // 1) Get schedule for year
    const schedule = await this.client.fetchSchedule(year);

    // 2) Select specific competition by filtering teamCode and competitionId
    const competitionDto = schedule.find(
      (c) => c.TeamCode === teamCode && c.ID === competitionId,
    );

    if (!competitionDto) {
      throw new Error(
        `Competition not found in FICR for year ${year}, teamCode ${teamCode}, ID ${competitionId}`,
      );
    }

    // 3) Ingest competition using the same flow as ingestFicrByYear
    await this.ingestCompetition(competitionDto, year);

    this.logger.log(
      `Completed FICR ingestion for competition ${competitionId}`,
    );
  }

  /**
   * Ingests a swimming competition from an external source (FICR) into the system.
   *
   * The ingestion process follows these steps:
   * 1. Parses the competition DTO into the internal format.
   * 2. Checks if the competition should be skipped (e.g., already ingested or invalid).
   * 3. Upserts the competition in the database to obtain its ID.
   * 4. Creates an ingestion operation record to track progress.
   * 5. Executes ingestion steps in order:
   *    - Competition metadata
   *    - Events within the competition
   *    - Results for each event
   * 6. Updates the competition document with races and final status.
   * 7. Handles errors by marking the ingestion operation and competition source status as failed.
   *
   * @param competitionDto - The raw competition data from FICR.
   * @param year - The year of the competition, used for processing events and results.
   * @returns A Promise that resolves when the competition has been ingested successfully, or rejects if an error occurs.
   *
   * @throws Error if any step of the ingestion fails; the operation status will be updated accordingly.
   *
   * @example
   * await this.ingestCompetition(ficrCompetitionDto, 2026);
   */
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

  /**
   * Determines whether a competition should be skipped during ingestion.
   *
   * The competition will be skipped if:
   * 1. The competition date is in the future (less than 24 hours old).
   * 2. The competition has already been ingested successfully from FICR (status COMPLETED).
   *
   * @param ficrId - The ID of the competition from the FICR source.
   * @param competitionData - Partial competition data, including at least the date and name.
   * @returns A Promise resolving to `true` if the competition should be skipped, `false` otherwise.
   *
   * @example
   * const skip = await this.shouldSkipCompetition(12345, competitionData);
   * if (skip) {
   *   console.log('Skipping ingestion for this competition.');
   * }
   */
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

  /**
   * Executes the ingestion step for a competition.
   *
   * This step updates the ingestion operation status to indicate the competition
   * is being processed and performs the actual upsert of the competition data
   * in the database.
   *
   * In case of an error, the ingestion operation is marked as FAILED and the
   * error is rethrown.
   *
   * @param operationId - The ID of the ingestion operation tracking this process.
   * @param competitionId - The ID of the competition being ingested.
   * @param competitionData - Partial competition data to upsert.
   * @returns A Promise that resolves when the competition step has been completed successfully.
   */
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

      // Upsert competition
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

  /**
   * Executes the ingestion step for the events of a competition.
   *
   * This step updates the ingestion operation status to indicate events are being processed,
   * fetches the list of athlete entries from the external source (FICR), and returns it.
   *
   * In case of an error, the ingestion operation is marked as FAILED and the error is rethrown.
   *
   * @param operationId - The ID of the ingestion operation tracking this process.
   * @param competitionDto - The raw competition data from FICR.
   * @param year - The year of the competition, used for fetching entries.
   * @returns A Promise that resolves to the list of athlete entries for the competition.
   */
  private async ingestEventsStep(
    operationId: Types.ObjectId,
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

      // Fetch entry list
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

  /**
   * Executes the ingestion step for athlete results in a competition.
   *
   * This step performs the following:
   * 1. Updates the ingestion operation status to indicate result processing has started.
   * 2. Iterates over all athlete entries and processes their individual results.
   *    - Tracks the number of processed and failed athletes.
   *    - Aggregates created results and collects associated race IDs.
   * 3. Processes relay results after all individual athletes have been handled.
   *
   * The method handles errors for individual athletes gracefully, allowing ingestion
   * to continue for other athletes, while logging failures.
   *
   * @param operationId - The ID of the ingestion operation tracking this process.
   * @param competitionId - The ID of the competition being ingested.
   * @param competitionDto - The raw competition data from FICR.
   * @param year - The year of the competition, used for processing results.
   * @param entryList - The list of athlete entries to process.
   * @returns A Promise resolving to an object containing:
   *   - processedAthletes: number of athletes successfully processed
   *   - failedAthletes: number of athletes that failed processing
   *   - resultsCreated: total number of results created
   *   - races: list of unique race IDs created during ingestion
   *
   * @example
   * const { processedAthletes, failedAthletes } = await this.ingestResultsStep(
   *   operationId,
   *   competitionId,
   *   competitionDto,
   *   2026,
   *   entryList,
   * );
   */
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

    // Process athlete results
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

  /**
   * Processes the results of a single athlete for a given competition.
   *
   * This method performs the following steps:
   * 1. Fetches the athlete's results from the external source (FICR).
   * 2. Parses and upserts the athlete in the local database.
   * 3. Groups the results by event and processes each event:
   *    - Finds or creates the corresponding race.
   *    - Determines if the event is a relay or individual race.
   *    - For individual events:
   *       - Sorts splits by distance.
   *       - Converts split times to milliseconds using TimeParser.
   *       - Builds final result data including category, rank, and splits.
   *    - For relay events:
   *       - Aggregates relay timing data for later processing.
   * 4. Bulk creates result entries in the database.
   *
   * @param operationId - The ID of the ingestion operation tracking this process.
   * @param competitionDto - The raw competition data from FICR.
   * @param year - The year of the competition, used for processing results.
   * @param athleteEntry - The athlete entry information to process.
   * @returns A Promise resolving to an object containing:
   *   - resultsCount: number of individual results created for this athlete
   *   - raceIds: list of race IDs associated with the processed results
   *   - relayData: array of relay entries to be processed later
   *
   * @example
   * const { resultsCount, raceIds, relayData } = await this.processAthleteResults(
   *   operationId,
   *   competitionDto,
   *   2026,
   *   athleteEntry,
   * );
   */
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
    const resultsToCreate: Partial<ResultWithId>[] = [];

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

        // Process individual event and push to results array
        resultsToCreate.push(
          this.parser.parseResult(tempi, athlete._id, race._id),
        );
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

  /**
   * Processes relay events for a competition.
   *
   * This method performs the following steps:
   * 1. Collects and deduplicates all relay timing data from athletes.
   * 2. Groups relay tempi by relay characteristics (category, lane, heat, etc.).
   * 3. Resolves the race for each relay group.
   * 4. Builds a relay document with leg assignments and split times.
   * 5. Finds or creates the relay in the database.
   * 6. If a new relay is created, generates corresponding results for each leg.
   *
   * @param competitionId - The ID of the competition for which relays are being processed.
   * @param relayData - Array of relay timing entries, including athlete IDs, race IDs, and split times.
   * @returns A Promise that resolves once all relays and leg results have been processed and persisted.
   *
   * @example
   * await this.processRelays(competitionId, relayData);
   */
  private async processRelays(
    competitionId: Types.ObjectId,
    relayData: Array<{
      athleteId: Types.ObjectId;
      raceId: Types.ObjectId;
      tempi: FicrTempoDto[];
    }>,
  ): Promise<void> {
    if (!relayData.length) return;

    // 1) Group relay tempi by relay (categoria+tipo_gara+batteria+corsia)
    const relayGroups = this.groupTempiByRelay(relayData);
    let relaysCreated = 0;
    let legResultsCreated = 0;

    // 2) Process each relay group
    await asyncForEach(
      Array.from(relayGroups.values()),
      async ({ raceId, tempi: group }) => {
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
            displayTime: l.displayTime,
            millis: l.millis,
          }));
          if (legResults.length > 0) {
            await this.resultRepository.createMany(legResults);
            legResultsCreated += legResults.length;
          }
        }
      },
    );

    if (relaysCreated > 0) {
      this.logger.log(
        `Created ${relaysCreated} relays and ${legResultsCreated} relay-leg results for competition ${competitionId.toString()}`,
      );
    }
  }

  /**
   * Groups relay tempi by relay characteristics (categoria + tipo_gara + batteria + corsia),
   * keeping the raceId from the relay data entry each tempo belongs to.
   *
   * Only tempi with Staffetta = true are included. All tempi in a group share the same race.
   *
   * @param relayData - Array of relay entries, each containing athleteId, raceId, and tempi.
   * @returns A Map from relay key to { raceId, tempi } for that relay.
   *
   * @example
   * const relayGroups = this.groupTempiByRelay(relayData);
   */
  private groupTempiByRelay(
    relayData: Array<{
      athleteId: Types.ObjectId;
      raceId: Types.ObjectId;
      tempi: FicrTempoDto[];
    }>,
  ): Map<string, { raceId: Types.ObjectId; tempi: FicrTempoDto[] }> {
    const groups = new Map<
      string,
      { raceId: Types.ObjectId; tempi: FicrTempoDto[] }
    >();

    relayData.forEach((entry) => {
      entry.tempi.forEach((t) => {
        if (!t.Staffetta) return;
        const key = `${t.Categoria}_${t.TipoGara}_${t.Batteria}_${t.Corsia}_`;
        const existing = groups.get(key);
        if (existing) {
          existing.tempi.push(t);
        } else {
          groups.set(key, { raceId: entry.raceId, tempi: [t] });
        }
      });
    });

    return groups;
  }

  /**
   * Maps athletes to their respective legs in a relay group.
   *
   * For a given relay group, identifies which athlete swam each leg based on
   * matching category, event type, lane, and heat, and resolves their leg number.
   *
   * @param relayData - Array of relay entries, each containing athleteId and tempi.
   * @param group - Array of tempi representing a single relay group.
   * @returns A Map where the key is the leg number and the value is the athlete's ID.
   *
   * @example
   * const athleteByLeg = this.resolveAthleteByLeg(relayData, relayGroup);
   */
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

      const leg = relevantTempi[0].Frazione;

      if (!athleteByLeg.has(leg)) {
        athleteByLeg.set(leg, entry.athleteId);
      }
    });

    return athleteByLeg;
  }

  /**
   * Removes duplicate relay tempi from the provided array.
   *
   * Duplicates are identified by the combination of fraction (Frazione), distance (Metri),
   * and recorded time (Tempo). Only the first occurrence of each unique combination is kept.
   *
   * @param tempi - Array of relay tempi to deduplicate.
   * @returns A new array containing only unique tempi.
   *
   * @example
   * const uniqueTempi = this.deduplicateTempi(relayTempi);
   */
  private deduplicateTempi(tempi: FicrTempoDto[]): FicrTempoDto[] {
    const map = new Map<string, FicrTempoDto>();

    tempi.forEach((t) => {
      const key = `${t.Frazione}_${t.Metri}`;
      if (!map.has(key)) {
        map.set(key, t);
      }
    });

    return Array.from(map.values());
  }

  /**
   * Groups relay tempi by leg number (Frazione).
   *
   * Organizes the provided tempi into a map where each key is a leg number
   * and the value is an array of tempi corresponding to that leg.
   *
   * @param tempi - Array of relay tempi to group.
   * @returns A Map with leg numbers as keys and arrays of tempi as values.
   *
   * @example
   * const tempiByLeg = this.groupByLeg(relayTempi);
   */
  private groupByLeg(tempi: FicrTempoDto[]): Map<number, FicrTempoDto[]> {
    const map = new Map<number, FicrTempoDto[]>();

    tempi.forEach((t) => {
      const list = map.get(t.Frazione) ?? [];
      list.push(t);
      map.set(t.Frazione, list);
    });

    return map;
  }

  /**
   * Builds a relay document from grouped relay tempi and athlete assignments.
   *
   * This method constructs a Partial<RelayWithId> object representing the relay,
   * including legs, splits, total time, rank, and team information.
   * Returns null if the relay data is invalid (e.g., missing legs or inconsistent splits).
   *
   * @param competitionId - The ID of the competition.
   * @param raceId - The ID of the race associated with the relay.
   * @param category - The category of the relay (e.g., age group or gender).
   * @param numLegs - Expected number of legs in the relay.
   * @param lapDistance - Distance of each lap in the pool.
   * @param byLeg - Map of leg number to array of tempi for that leg.
   * @param athleteByLeg - Map of leg number to athlete ID swimming that leg.
   * @returns A Partial<RelayWithId> representing the relay, or null if invalid.
   *
   * @example
   * const relayDoc = this.buildRelayDoc(competitionId, raceId, 'M', 4, 50, byLeg, athleteByLeg);
   */
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

  /**
   * Constructs the legs and split times for a relay based on individual leg tempi.
   *
   * This method calculates:
   * 1. Cumulative time at each handoff distance.
   * 2. Individual leg times by subtracting previous cumulative times.
   * 3. RelayLeg objects for each athlete, including display time and milliseconds.
   * 4. Split times corresponding to each handoff distance.
   * 5. Final relay time, rank, and team information if available.
   *
   * @param numLegs - Number of legs in the relay.
   * @param lapDistance - Distance of each lap in the pool.
   * @param byLeg - Map of leg number to array of tempi for that leg.
   * @param athleteByLeg - Map of leg number to athlete ID swimming that leg.
   * @returns An object containing:
   *   - legs: Array of RelayLeg objects with times per leg.
   *   - splits: Array of cumulative split times at each handoff distance.
   *   - finalTime: Total relay time (display and milliseconds), or null if not computable.
   *   - rank: Optional rank of the relay team.
   *   - team: Optional team name.
   *
   * @example
   * const { legs, splits, finalTime } = this.buildLegsAndSplits(
   *   4,
   *   50,
   *   byLegMap,
   *   athleteByLegMap,
   * );
   */
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
    Array.from({ length: numLegs }, (_, i) => i + 1).forEach((i) => {
      handoffDistances.push(i * lapDistance);
    });

    // Cumulative time at each handoff
    const cumulAtHandoff: number[] = [];
    handoffDistances.forEach((D) => {
      let millis = 0;
      Array.from(byLeg.values()).forEach((tempi) => {
        if (millis > 0) return;
        const t = tempi.find((x) => x.Metri === D);
        if (t) millis = TimeParser.toMillis(t.Tempo.trim());
      });
      cumulAtHandoff.push(millis);
    });

    // Leg time = cumulative at end of this leg minus cumulative at end of previous leg
    const legMillis: number[] = [];
    cumulAtHandoff.forEach((cumul, i) => {
      const prev = i === 0 ? 0 : cumulAtHandoff[i - 1];
      legMillis.push(cumul - prev);
    });

    // Build legs
    Array.from({ length: numLegs }, (_, i) => i + 1).forEach((leg) => {
      const athleteId = athleteByLeg.get(leg);
      if (!athleteId) {
        this.logger.warn(`Missing athlete for leg ${leg}`);
        return;
      }
      const legTimeMillis = legMillis[leg - 1] ?? 0;
      legs.push({
        athlete: athleteId,
        leg,
        displayTime: TimeParser.toDisplayTime(legTimeMillis),
        millis: legTimeMillis,
      });
    });

    // Build splits with current (cumulative) and partial (interval since previous split)
    handoffDistances.forEach((distance, i) => {
      const currentMillis = cumulAtHandoff[i];
      const current = {
        millis: currentMillis,
        displayTime: TimeParser.toDisplayTime(currentMillis),
      };
      const partialMillis =
        i === 0 ? currentMillis : currentMillis - cumulAtHandoff[i - 1];
      const partial = {
        millis: partialMillis,
        displayTime: TimeParser.toDisplayTime(partialMillis),
      };
      splits.push({
        distance,
        current,
        partial,
        leg: i + 1,
      });
    });

    if (cumulAtHandoff.length > 0) {
      const lastMillis = cumulAtHandoff[numLegs - 1];
      finalTime = {
        displayTime: TimeParser.toDisplayTime(lastMillis),
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

  /**
   * Validates that a relay has the expected number of legs and correct leg numbering.
   *
   * Ensures that the legs array contains exactly the expectedCount of RelayLegs
   * and that leg numbers are sequential from 1 to expectedCount.
   *
   * @param legs - Array of RelayLeg objects to validate.
   * @param expectedCount - The expected number of legs in the relay.
   * @returns True if the legs are valid, false otherwise.
   *
   * @example
   * const isValid = this.validateLegs(relayLegs, 4);
   */
  private validateLegs(legs: RelayLeg[], expectedCount: number): boolean {
    if (legs.length !== expectedCount) return false;
    const nums = legs.map((l) => l.leg).sort((a, b) => a - b);
    const expected = Array.from(
      { length: expectedCount },
      (_, i) => i + 1,
    ).join(',');
    return nums.join(',') === expected;
  }

  async getRelays(teamCode: number, year: number, raceId: number) {
    const pdfList = await this.client.fetchPdfList(teamCode, year, raceId);
    await asyncForEach(pdfList, async (pdfInfo) => {
      if (pdfInfo.cat !== 'RESULT') return;

      const name = pdfInfo.filename?.toLowerCase() ?? '';

      const isRelay = /4x/i.test(name);
      const isDetailed = /\bdett\b/i.test(name);

      if (!isRelay || !isDetailed) return;

      const pdfData = await this.client.getPdf(pdfInfo.file);

      const parsed =
        await this.pdfParser.parseRelayPdf(pdfData);

      this.logger.log(
        `Relay PDF "${pdfInfo.filename}": ${parsed.relays.length} teams, event "${parsed.eventName ?? '?'}"`,
      );
      if (parsed.relays.length > 0) {
        parsed.relays.forEach((r, idx) => {
          this.logger.debug(
            `  ${idx + 1}. ${r.rank ?? 'SQ'} ${r.teamName ?? '—'} ${r.displayTime} (${r.legs.length} legs)`,
          );
        });
      }
    });
  }
}
