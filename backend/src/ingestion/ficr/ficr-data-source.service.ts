import { Injectable } from '@nestjs/common';
import { IDataSource } from '../interfaces/data-source.interface';
import { FicrClient } from './ficr.client';
import { FicrMapper } from './ficr.mapper';
import { Athlete } from '../../database/schema/athlete.schema';
import { Race } from '../../database/schema/race.schema';
import { Result } from '../../database/schema/result.schema';

@Injectable()
export class FicrDataSourceService implements IDataSource {
  constructor(
    private readonly ficrClient: FicrClient,
    private readonly ficrMapper: FicrMapper,
  ) {}

  getName(): string {
    return 'ficr';
  }

  async fetchRaces(year: number): Promise<Partial<Race>[]> {
    const raceDtos = await this.ficrClient.fetchSchedule(year);
    return raceDtos.map((dto) => this.ficrMapper.mapRace(dto));
  }

  async fetchAthletes(
    year: number,
    raceId: string | number,
    additionalParams?: Record<string, any>,
  ): Promise<Partial<Athlete>[]> {
    const teamCode = additionalParams?.teamCode;
    if (!teamCode) {
      throw new Error('teamCode is required for FICR athlete fetching');
    }

    const athleteDtos = await this.ficrClient.fetchAthletesList(
      teamCode,
      year,
      Number(raceId),
    );

    return athleteDtos.map((dto) => this.ficrMapper.mapAthlete(dto));
  }

  async fetchResults(
    year: number,
    raceId: string | number,
    athleteId: string | number,
    additionalParams?: Record<string, any>,
  ): Promise<Partial<Result>[]> {
    const teamCode = additionalParams?.teamCode;
    if (!teamCode) {
      throw new Error('teamCode is required for FICR result fetching');
    }

    const splitsDto = await this.ficrClient.fetchAthleteRaceTimes(
      teamCode,
      year,
      Number(raceId),
      Number(athleteId),
    );

    // For now, we need athlete and race ObjectIds, but we only have FICR IDs
    // This will be handled by the ingestion service
    return this.ficrMapper.mapResultsFromSplits(
      athleteId as any,
      raceId as any,
      splitsDto,
    );
  }
}
