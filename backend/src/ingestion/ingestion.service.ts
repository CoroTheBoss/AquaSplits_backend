import { Injectable, Logger } from '@nestjs/common';
import { FicrService } from '../sources/ficr/ficr.service';
import { AthleteRepository } from '../database/repository/athlete.repository';
import { RaceRepository } from '../database/repository/race.repository';
import { ResultRepository } from '../database/repository/result.repository';
import { Types } from 'mongoose';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private readonly ficrService: FicrService,
    private readonly athleteRepository: AthleteRepository,
    private readonly raceRepository: RaceRepository,
    private readonly resultRepository: ResultRepository,
  ) {}

  async ingestRaces(year: number) {
    this.logger.log(`Fetching races from FICR for year ${year}`);
    const races = await this.ficrService.getRaces(year);
    
    this.logger.log(`Saving ${races.length} races to database`);
    const saved = await this.raceRepository.bulkUpsert(races);
    
    this.logger.log(`Successfully ingested ${saved.length} races`);
    return { count: saved.length, races: saved };
  }

  async ingestAthletes(year: number, raceId: string | number, teamCode: number) {
    const race = await this.findRace(raceId);
    if (!race) {
      throw new Error(`Race not found: ${raceId}`);
    }

    this.logger.log(`Fetching athletes from FICR for race ${race.name}`);
    const athletes = await this.ficrService.getAthletes(teamCode, year, Number(raceId));
    
    this.logger.log(`Saving ${athletes.length} athletes to database`);
    const saved = await this.athleteRepository.bulkUpsert(athletes);
    
    this.logger.log(`Successfully ingested ${saved.length} athletes`);
    return { count: saved.length, athletes: saved };
  }

  async ingestResults(year: number, raceId: string | number, athleteId: string | number, teamCode: number) {
    const race = await this.findRace(raceId);
    if (!race) {
      throw new Error(`Race not found: ${raceId}`);
    }

    const athlete = await this.findAthlete(athleteId);
    if (!athlete) {
      throw new Error(`Athlete not found: ${athleteId}`);
    }

    if (!athlete.ficrId) {
      throw new Error(`Athlete ${athlete._id} has no FICR ID`);
    }

    this.logger.log(`Fetching results for athlete ${athlete.firstName} ${athlete.lastName}`);
    const resultsData = await this.ficrService.getResults(teamCode, year, Number(raceId), Number(athlete.ficrId));
    
    const mappedResults = resultsData.map((result) => ({
      ...result,
      athlete: athlete._id,
      race: race._id,
    }));

    this.logger.log(`Saving ${mappedResults.length} results to database`);
    const saved = await this.resultRepository.bulkUpsert(mappedResults);
    
    this.logger.log(`Successfully ingested ${saved.length} results`);
    return { count: saved.length, results: saved };
  }

  async ingestCompleteRace(year: number, raceId: string | number, teamCode: number) {
    this.logger.log(`Starting complete race ingestion for race ${raceId}`);

    // Ensure race exists
    let race = await this.findRace(raceId);
    if (!race) {
      await this.ingestRaces(year);
      race = await this.findRace(raceId);
      if (!race) {
        throw new Error(`Race ${raceId} not found after fetching schedule`);
      }
    }

    // Ingest athletes
    const athletesResult = await this.ingestAthletes(year, raceId, teamCode);

    // Ingest results for each athlete
    const allResults: any[] = [];
    for (const athlete of athletesResult.athletes) {
      try {
        if (!athlete.ficrId) {
          this.logger.warn(`Skipping athlete ${athlete._id} - no FICR ID`);
          continue;
        }

        const results = await this.ingestResults(year, raceId, athlete.ficrId, teamCode);
        allResults.push(...results.results);
      } catch (error: any) {
        this.logger.error(`Error ingesting results for athlete ${athlete._id}: ${error?.message}`);
      }
    }

    this.logger.log(`Complete race ingestion finished: ${athletesResult.count} athletes, ${allResults.length} results`);
    return {
      race,
      athletes: athletesResult.athletes,
      results: allResults,
      summary: {
        athletesCount: athletesResult.count,
        resultsCount: allResults.length,
      },
    };
  }

  private async findRace(raceId: string | number) {
    if (typeof raceId === 'string' && Types.ObjectId.isValid(raceId)) {
      return this.raceRepository.findById(raceId);
    }
    return this.raceRepository.findByFicrId(raceId.toString());
  }

  private async findAthlete(athleteId: string | number) {
    if (typeof athleteId === 'string' && Types.ObjectId.isValid(athleteId)) {
      return this.athleteRepository.findById(athleteId);
    }
    return this.athleteRepository.findByFicrId(athleteId.toString());
  }
}
