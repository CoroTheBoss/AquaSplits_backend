import { Injectable } from '@nestjs/common';
import { FicrClient } from './ficr/ficr.client';
import { FicrRaceDto } from './ficr/dto/ficr-race.dto';
import { FicrAthleteBaseDto } from './ficr/dto/ficr-athlete-base.dto';
import { FicrAthleteSplitsDto } from './ficr/dto/ficr-athlete-splits.dto';

@Injectable()
export class IngestionService {
  constructor(private readonly client: FicrClient) {}

  async getSchedule(year: number): Promise<FicrRaceDto[]> {
    return this.client.fetchSchedule(year);
  }

  async getAthletesList(
    year: number,
    teamCode: number,
    raceId: number,
  ): Promise<FicrAthleteBaseDto[]> {
    return this.client.fetchAthletesList(year, teamCode, raceId);
  }

  async getAthleteRaceTimes(
    year: number,
    teamCode: number,
    raceId: number,
    athleteNumber: number,
  ): Promise<FicrAthleteSplitsDto> {
    return this.client.fetchAthleteRaceTimes(
      year,
      teamCode,
      raceId,
      athleteNumber,
    );
  }
}
