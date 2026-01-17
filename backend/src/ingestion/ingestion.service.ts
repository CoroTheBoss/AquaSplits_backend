import { Injectable, Logger } from '@nestjs/common';
import { IDataSource } from './interfaces/data-source.interface';
import { FicrDataSourceService } from './ficr/ficr-data-source.service';
import { AthleteRepository } from '../database/repository/athlete.repository';
import { RaceRepository } from '../database/repository/race.repository';
import { ResultRepository } from '../database/repository/result.repository';
import { Types } from 'mongoose';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);
  private readonly dataSources: Map<string, IDataSource> = new Map();

  constructor(
    private readonly ficrDataSource: FicrDataSourceService,
    private readonly athleteRepository: AthleteRepository,
    private readonly raceRepository: RaceRepository,
    private readonly resultRepository: ResultRepository,
  ) {
    // Register data sources
    this.dataSources.set('ficr', ficrDataSource);
  }

  /**
   * Ingest races from a data source for a given year
   */
  async ingestRaces(sourceName: string, year: number) {
    const dataSource = this.dataSources.get(sourceName);
    if (!dataSource) {
      throw new Error(`Data source '${sourceName}' not found`);
    }

    this.logger.log(`Fetching races from ${sourceName} for year ${year}`);
    const races = await dataSource.fetchRaces(year);

    this.logger.log(`Upserting ${races.length} races`);
    const results = await this.raceRepository.bulkUpsert(races);

    this.logger.log(`Successfully ingested ${results.length} races`);
    return {
      source: sourceName,
      year,
      count: results.length,
      races: results,
    };
  }

  /**
   * Ingest athletes from a data source for a specific race
   */
  async ingestAthletes(
    sourceName: string,
    year: number,
    raceId: string | number,
    additionalParams?: Record<string, any>,
  ) {
    const dataSource = this.dataSources.get(sourceName);
    if (!dataSource) {
      throw new Error(`Data source '${sourceName}' not found`);
    }

    // First, get or find the race
    let race;
    if (typeof raceId === 'string' && Types.ObjectId.isValid(raceId)) {
      race = await this.raceRepository.findById(raceId);
    } else {
      race = await this.raceRepository.findByFicrId(raceId.toString());
    }

    if (!race) {
      throw new Error(`Race not found: ${raceId}`);
    }

    this.logger.log(
      `Fetching athletes from ${sourceName} for race ${race._id} (${race.name})`,
    );
    const athletes = await dataSource.fetchAthletes(year, raceId, additionalParams);

    this.logger.log(`Upserting ${athletes.length} athletes`);
    const results = await this.athleteRepository.bulkUpsert(athletes);

    this.logger.log(`Successfully ingested ${results.length} athletes`);
    return {
      source: sourceName,
      raceId: race._id,
      count: results.length,
      athletes: results,
    };
  }

  /**
   * Ingest results for a specific athlete in a race
   */
  async ingestResults(
    sourceName: string,
    year: number,
    raceId: string | number,
    athleteId: string | number,
    additionalParams?: Record<string, any>,
  ) {
    const dataSource = this.dataSources.get(sourceName);
    if (!dataSource) {
      throw new Error(`Data source '${sourceName}' not found`);
    }

    // Get or find the race
    let race;
    if (typeof raceId === 'string' && Types.ObjectId.isValid(raceId)) {
      race = await this.raceRepository.findById(raceId);
    } else {
      race = await this.raceRepository.findByFicrId(raceId.toString());
    }

    if (!race) {
      throw new Error(`Race not found: ${raceId}`);
    }

    // Get or find the athlete
    let athlete;
    if (typeof athleteId === 'string' && Types.ObjectId.isValid(athleteId)) {
      athlete = await this.athleteRepository.findById(athleteId);
    } else {
      athlete = await this.athleteRepository.findByFicrId(athleteId.toString());
    }

    if (!athlete) {
      throw new Error(`Athlete not found: ${athleteId}`);
    }

    this.logger.log(
      `Fetching results from ${sourceName} for athlete ${athlete._id} in race ${race._id}`,
    );
    const results = await dataSource.fetchResults(
      year,
      raceId,
      athleteId,
      additionalParams,
    );

    // Map FICR IDs to MongoDB ObjectIds
    const mappedResults = results.map((result) => ({
      ...result,
      athlete: athlete._id,
      race: race._id,
    }));

    this.logger.log(`Upserting ${mappedResults.length} results`);
    const upsertedResults = await this.resultRepository.bulkUpsert(mappedResults);

    this.logger.log(`Successfully ingested ${upsertedResults.length} results`);
    return {
      source: sourceName,
      raceId: race._id,
      athleteId: athlete._id,
      count: upsertedResults.length,
      results: upsertedResults,
    };
  }

  /**
   * Ingest complete race data (athletes + results) for a race
   */
  async ingestCompleteRace(
    sourceName: string,
    year: number,
    raceId: string | number,
    teamCode: number,
  ) {
    this.logger.log(
      `Starting complete race ingestion for ${sourceName}, year ${year}, race ${raceId}`,
    );

    // Step 1: Ensure race exists
    let race;
    if (typeof raceId === 'string' && Types.ObjectId.isValid(raceId)) {
      race = await this.raceRepository.findById(raceId);
    } else {
      race = await this.raceRepository.findByFicrId(raceId.toString());
    }

    if (!race) {
      // Try to fetch races first
      await this.ingestRaces(sourceName, year);
      race = await this.raceRepository.findByFicrId(raceId.toString());
      if (!race) {
        throw new Error(`Race ${raceId} not found after fetching schedule`);
      }
    }

    // Step 2: Ingest athletes
    const athletesResult = await this.ingestAthletes(sourceName, year, raceId, {
      teamCode,
    });

    // Step 3: Ingest results for each athlete
    const allResults: any[] = [];
    for (const athlete of athletesResult.athletes) {
      try {
        const ficrId = athlete.ficrId;
        if (!ficrId) {
          this.logger.warn(
            `Skipping athlete ${athlete._id} - no FICR ID found`,
          );
          continue;
        }

        const results = await this.ingestResults(
          sourceName,
          year,
          raceId,
          ficrId,
          { teamCode },
        );
        allResults.push(...(results.results || []));
      } catch (error: any) {
        this.logger.error(
          `Error ingesting results for athlete ${athlete._id}: ${error?.message || String(error)}`,
        );
        // Continue with other athletes
      }
    }

    this.logger.log(
      `Complete race ingestion finished: ${athletesResult.count} athletes, ${allResults.length} results`,
    );

    return {
      race: race,
      athletes: athletesResult.athletes,
      results: allResults,
      summary: {
        athletesCount: athletesResult.count,
        resultsCount: allResults.length,
      },
    };
  }

  /**
   * Register a new data source
   */
  registerDataSource(dataSource: IDataSource) {
    this.dataSources.set(dataSource.getName(), dataSource);
    this.logger.log(`Registered data source: ${dataSource.getName()}`);
  }

  /**
   * Get list of available data sources
   */
  getAvailableSources(): string[] {
    return Array.from(this.dataSources.keys());
  }
}
