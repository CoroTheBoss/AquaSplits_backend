import { Injectable } from '@nestjs/common';
import { FicrClient } from './ficr.client';
import { FicrParser } from './ficr.parser';
import { Competition } from '../../database/schema/competition.schema';

@Injectable()
export class FicrService {
  constructor(
    private readonly client: FicrClient,
    private readonly parser: FicrParser,
  ) {}

  async getRaces(year: number): Promise<Partial<Competition>[]> {
    const dtos = await this.client.fetchSchedule(year);
    return dtos.map((dto) => this.parser.parseRace(dto));
  }

  async getResults(
    teamCode: number,
    year: number,
    raceId: number,
    athleteNumber: number,
  ) {
    const dto = await this.client.fetchAthleteResults(
      teamCode,
      year,
      raceId,
      athleteNumber,
    );
    // Return raw parsed results without IDs - ingestion service will map them
    return dto.tempi
      .map((tempo) => this.parser.parseResult(null as any, null as any, tempo))
      .filter((result) => result !== null)
      .map((result) => {
        const { athlete, race, ...rest } = result;
        return rest;
      });
  }
}
