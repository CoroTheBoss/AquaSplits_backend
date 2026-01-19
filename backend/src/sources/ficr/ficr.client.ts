import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { FicrRaceDto } from './dto/ficr-race.dto';
import { FicrResponse } from './dto/ficr.response';
import {
  FicrAthleteEntryListDto,
  FicrAthleteSplitsDto,
} from './dto/ficr-athlete.dto';

@Injectable()
export class FicrClient {
  private readonly baseUrl = 'https://apinuoto.ficr.it/NUO/mpcache-30';

  async fetchSchedule(year: number): Promise<FicrRaceDto[]> {
    const url = `${this.baseUrl}/get/schedule/${year}/*/*`;
    const response = await axios.get<FicrResponse<FicrRaceDto[]>>(url);

    if (!response.data.status) {
      throw new Error(`FICR API error: ${response.data.message}`);
    }

    return response.data.data;
  }

  async fetchEntryList(
    teamCode: number,
    year: number,
    raceId: number,
  ): Promise<FicrAthleteEntryListDto[]> {
    const url = `${this.baseUrl}/get/allathletes/${year}/${teamCode}/${raceId}`;
    const response =
      await axios.get<FicrResponse<FicrAthleteEntryListDto[]>>(url);

    if (!response.data.status) {
      throw new Error(`FICR API error: ${response.data.message}`);
    }

    return response.data.data;
  }

  async fetchAthleteResults(
    teamCode: number,
    year: number,
    raceId: number,
    athleteNumber: number,
  ): Promise<FicrAthleteSplitsDto> {
    const url = `${this.baseUrl}/get/atleta/${year}/${teamCode}/${raceId}/${athleteNumber}`;
    const response = await axios.get<FicrResponse<FicrAthleteSplitsDto>>(url);

    if (!response.data.status) {
      throw new Error(`FICR API error: ${response.data.message}`);
    }

    return response.data.data;
  }
}
