import { Injectable } from '@nestjs/common';
import { FicrRaceDto } from './dto/ficr-race.dto';
import { FicrResponse } from './dto/ficr.response';
import axios from 'axios';
import { FicrAthleteBaseDto } from './dto/ficr-athlete-base.dto';
import { FicrAthleteSplitsDto } from './dto/ficr-athlete-splits.dto';

@Injectable()
export class FicrClient {
  async fetchSchedule(year: number): Promise<FicrRaceDto[]> {
    const url = `https://apinuoto.ficr.it/NUO/mpcache-30/get/schedule/${year}/*/*`;

    try {
      const response = await axios.get<FicrResponse<FicrRaceDto[]>>(url);

      if (!response.data.status) {
        new Error(`FICR API returned error: ${response.data.message}`);
      }

      return response.data.data;
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        throw new Error(
          `Errore chiamata FICR: HTTP ${err.response?.status ?? 'Unknown'} - ${err.message}`,
        );
      }
      if (err instanceof Error) {
        throw new Error(`Unexpected error: ${err.message}`);
      }
      throw new Error(`Unexpected non-error thrown: ${String(err)}`);
    }
  }

  async fetchAthletesList(
    teamCode: number,
    year: number,
    raceId: number,
  ): Promise<FicrAthleteBaseDto[]> {
    const url = `https://apinuoto.ficr.it/NUO/mpcache-30/get/allathletes/${year}/${teamCode}/${raceId}`;

    try {
      const response = await axios.get<FicrResponse<FicrAthleteBaseDto[]>>(url);

      if (!response.data.status) {
        new Error(`FICR API returned error: ${response.data.message}`);
      }

      return response.data.data;
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        throw new Error(
          `Errore chiamata FICR: HTTP ${err.response?.status ?? 'Unknown'} - ${err.message}`,
        );
      }
      if (err instanceof Error) {
        throw new Error(`Unexpected error: ${err.message}`);
      }
      throw new Error(`Unexpected non-error thrown: ${String(err)}`);
    }
  }

  async fetchAthleteRaceTimes(
    teamCode: number,
    year: number,
    raceId: number,
    athleteNumber: number,
  ): Promise<FicrAthleteSplitsDto> {
    const url = `https://apinuoto.ficr.it/NUO/mpcache-30/get/atleta/${year}/${teamCode}/${raceId}/${athleteNumber}`;

    try {
      const response = await axios.get<FicrResponse<FicrAthleteSplitsDto>>(url);

      if (!response.data.status) {
        new Error(`FICR API returned error: ${response.data.message}`);
      }

      return response.data.data;
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        throw new Error(
          `Errore chiamata FICR: HTTP ${err.response?.status ?? 'Unknown'} - ${err.message}`,
        );
      }
      if (err instanceof Error) {
        throw new Error(`Unexpected error: ${err.message}`);
      }
      throw new Error(`Unexpected non-error thrown: ${String(err)}`);
    }
  }
}
