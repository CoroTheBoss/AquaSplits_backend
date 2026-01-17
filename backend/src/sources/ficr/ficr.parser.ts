import { Injectable } from '@nestjs/common';
import { FicrRaceDto } from './dto/ficr-race.dto';
import { FicrAthleteBaseDto } from './dto/ficr-athlete-base.dto';
import { FicrAthleteSplitsDto } from './dto/ficr-athlete-splits.dto';
import { FicrTempoDto } from './dto/fict-tempo.dto';
import { Distance, Stroke } from '../../database/schema/event.enum';
import { Types } from 'mongoose';

@Injectable()
export class FicrParser {
  parseRace(dto: FicrRaceDto) {
    const raceDate = dto.Data ? new Date(dto.Data) : new Date();
    const year = raceDate.getFullYear() || dto.Year;

    return {
      name: dto.Description || dto.ma_Descrizione || 'Unknown Race',
      date: raceDate,
      location: dto.Place || '',
      poolLength: dto.pi_LunghezzaVasca || 50,
      ficrRaceId: dto.ID.toString(),
      source: 'ficr',
      year: year,
    };
  }

  parseAthlete(
    dto: FicrAthleteBaseDto | { atleta: FicrAthleteBaseDto },
    athleteNumber?: number,
  ) {
    const athlete = 'atleta' in dto ? dto.atleta : dto;
    const num =
      athleteNumber || ('Numero' in athlete ? athlete.Numero : undefined);

    return {
      firstName: athlete.Nome || '',
      lastName: athlete.Cognome || '',
      ficrId: num ? num.toString() : undefined,
    };
  }

  parseResult(
    athleteId: string | Types.ObjectId,
    raceId: string | Types.ObjectId,
    tempoDto: FicrTempoDto,
  ) {
    const time = tempoDto.Tempo || '';
    if (!time) return null;

    const eventStr = tempoDto.DescrGara || tempoDto.ba_Descrizione || '';
    const event = this.parseEvent(eventStr);

    if (!event) {
      const distance = tempoDto.Metri as Distance;
      if (distance && Object.values(Distance).includes(distance)) {
        return {
          athlete: athleteId,
          race: raceId,
          event: { distance, stroke: Stroke.FREESTYLE },
          time,
          millis: this.timeToMillis(time),
          rank: tempoDto.Pos || undefined,
        };
      }
      return null;
    }

    return {
      athlete: athleteId,
      race: raceId,
      event: { distance: event.distance, stroke: event.stroke },
      time,
      millis: this.timeToMillis(time),
      rank: tempoDto.Pos || undefined,
    };
  }

  parseResults(
    athleteId: string | Types.ObjectId,
    raceId: string | Types.ObjectId,
    splitsDto: FicrAthleteSplitsDto,
  ) {
    if (!splitsDto.tempi || splitsDto.tempi.length === 0) {
      return [];
    }

    return splitsDto.tempi
      .map((tempo) => this.parseResult(athleteId, raceId, tempo))
      .filter((result) => result !== null);
  }

  private parseEvent(
    eventStr: string,
  ): { distance: Distance; stroke: Stroke } | null {
    if (!eventStr) return null;

    const normalized = eventStr.toLowerCase().trim();
    let distance: Distance | null = null;
    let stroke: Stroke | null = null;

    const distanceMatch = normalized.match(/(\d+)\s*m/);
    if (distanceMatch) {
      const dist = parseInt(distanceMatch[1], 10);
      if (Object.values(Distance).includes(dist as Distance)) {
        distance = dist as Distance;
      }
    }

    if (
      normalized.includes('freestyle') ||
      normalized.includes('stile libero') ||
      normalized.includes('sl')
    ) {
      stroke = Stroke.FREESTYLE;
    } else if (
      normalized.includes('backstroke') ||
      normalized.includes('dorso') ||
      normalized.includes('do')
    ) {
      stroke = Stroke.BACKSTROKE;
    } else if (
      normalized.includes('breaststroke') ||
      normalized.includes('rana') ||
      normalized.includes('br')
    ) {
      stroke = Stroke.BREASTSTROKE;
    } else if (
      normalized.includes('butterfly') ||
      normalized.includes('farfalla') ||
      normalized.includes('fa')
    ) {
      stroke = Stroke.BUTTERFLY;
    } else if (
      normalized.includes('medley') ||
      normalized.includes('misti') ||
      normalized.includes('mi')
    ) {
      stroke = Stroke.INDIVIDUAL_MEDLEY;
    }

    if (distance && stroke) {
      return { distance, stroke };
    }

    return null;
  }

  private timeToMillis(timeStr: string): number {
    if (!timeStr || timeStr.trim() === '') return 0;

    const cleanTime = timeStr.trim();

    if (cleanTime.includes(':')) {
      const parts = cleanTime.split(':');
      if (parts.length < 2) return 0;

      const minutes = parseInt(parts[0], 10) || 0;
      const secondsPart = parts[1];
      const secondsWithMillis = secondsPart.split('.');
      const seconds = parseInt(secondsWithMillis[0], 10) || 0;

      let millis = 0;
      if (secondsWithMillis[1]) {
        const millisStr = secondsWithMillis[1];
        millis =
          millisStr.length === 2
            ? parseInt(millisStr, 10) * 10
            : parseInt(millisStr, 10);
      }

      return minutes * 60000 + seconds * 1000 + millis;
    } else {
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
