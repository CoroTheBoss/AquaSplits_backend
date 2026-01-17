import { Injectable } from '@nestjs/common';
import { FicrRaceDto } from './dto/ficr-race.dto';
import { FicrAthleteBaseDto } from './dto/ficr-athlete-base.dto';
import { FicrAthleteSplitsDto } from './dto/ficr-athlete-splits.dto';
import { FicrTempoDto } from './dto/fict-tempo.dto';
import { Types } from 'mongoose';

@Injectable()
export class FicrMapper {
  mapRace(dto: FicrRaceDto): Partial<any> {
    // Parse date from Data field (format might be "YYYY-MM-DD" or similar)
    const raceDate = dto.Data ? new Date(dto.Data) : new Date();

    // Extract year from the date or use Year field
    const year = raceDate.getFullYear() || dto.Year;

    return {
      name: dto.Description || dto.ma_Descrizione || 'Unknown Race',
      date: raceDate,
      location: dto.Place || '',
      poolLength: dto.pi_LunghezzaVasca || 50, // Default to 50m
      ficrRaceId: dto.ID.toString(),
      source: 'ficr',
      year: year,
    };
  }

  mapAthlete(
    dto: FicrAthleteBaseDto | { atleta: FicrAthleteBaseDto },
    athleteNumber?: number,
  ): Partial<any> {
    // Handle both direct DTO and nested structure
    const athlete = 'atleta' in dto ? dto.atleta : dto;
    const num =
      athleteNumber || ('Numero' in athlete ? athlete.Numero : undefined);

    return {
      firstName: athlete.Nome || '',
      lastName: athlete.Cognome || '',
      ficrId: num ? num.toString() : undefined,
      // Note: Base DTO doesn't have gender/nationality, need full DTO for that
    };
  }

  mapAthleteFull(dto: {
    Nome: string;
    Cognome: string;
    Codice: string;
    Naz: string;
    Sex: string;
    Anno?: number;
  }): Partial<any> {
    const birthYear = dto.Anno;
    const birthDate = birthYear
      ? new Date(birthYear, 0, 1) // Approximate to Jan 1st of birth year
      : undefined;

    return {
      firstName: dto.Nome || '',
      lastName: dto.Cognome || '',
      ficrId: dto.Codice || undefined,
      gender: dto.Sex?.toUpperCase() || undefined,
      nationality: dto.Naz?.toUpperCase() || undefined,
      birthDate: birthDate,
    };
  }

  mapResult(
    athleteId: string | Types.ObjectId,
    raceId: string | Types.ObjectId,
    tempoDto: FicrTempoDto,
  ): Partial<any> {
    const time = tempoDto.Tempo || '';
    const millis = this.timeToMillis(time);

    return {
      athlete: athleteId,
      race: raceId,
      event: tempoDto.DescrGara || tempoDto.ba_Descrizione || 'Unknown Event',
      time: time,
      millis: millis,
      rank: tempoDto.Pos || undefined,
      // Note: Splits would need to be calculated from Frazione data if available
    };
  }

  mapResultsFromSplits(
    athleteId: string | Types.ObjectId,
    raceId: string | Types.ObjectId,
    splitsDto: FicrAthleteSplitsDto,
  ): Partial<any>[] {
    if (!splitsDto.tempi || splitsDto.tempi.length === 0) {
      return [];
    }

    return splitsDto.tempi.map((tempo) =>
      this.mapResult(athleteId, raceId, tempo),
    );
  }

  private timeToMillis(timeStr: string): number {
    if (!timeStr || timeStr.trim() === '') return 0;

    // Handle different formats: "00:58.45", "58.45", "1:02.10"
    const cleanTime = timeStr.trim();

    // Check if it contains colon (MM:SS.mmm format)
    if (cleanTime.includes(':')) {
      const parts = cleanTime.split(':');
      if (parts.length < 2) return 0;

      const minutes = parseInt(parts[0], 10) || 0;
      const secondsPart = parts[1];
      const secondsWithMillis = secondsPart.split('.');
      const seconds = parseInt(secondsWithMillis[0], 10) || 0;

      // Handle milliseconds (could be 2 or 3 digits)
      let millis = 0;
      if (secondsWithMillis[1]) {
        const millisStr = secondsWithMillis[1];
        if (millisStr.length === 2) {
          millis = parseInt(millisStr, 10) * 10; // "45" -> 450ms
        } else if (millisStr.length === 3) {
          millis = parseInt(millisStr, 10); // "450" -> 450ms
        } else {
          millis = parseInt(millisStr, 10);
        }
      }

      return minutes * 60000 + seconds * 1000 + millis;
    } else {
      // Format: "58.45" (seconds.milliseconds)
      const parts = cleanTime.split('.');
      const seconds = parseInt(parts[0], 10) || 0;
      const millis = parts[1]
        ? parts[1].length === 2
          ? parseInt(parts[1], 10) * 10
          : parseInt(parts[1], 10)
        : 0;
      return seconds * 1000 + millis;
    }
  }
}
