import { Injectable } from '@nestjs/common';
import { FicrRaceDto } from './dto/ficr-race.dto';
import { FicrTempoDto } from './dto/fict-tempo.dto';
import { Stroke } from '../../type/stroke.enum';
import { Types } from 'mongoose';
import { Distance } from '../../type/distance.enum';
import { Source } from '../../type/source.enum';
import { PoolLength } from '../../type/pool-length.enum';
import { CompetitionDocument } from '../../database/schema/competition.schema';
import { FicrAthleteDto, FicrAthleteSplitsDto } from './dto/ficr-athlete.dto';
import { AthleteDocument } from '../../database/schema/athlete.schema';
import { ResultWithId } from '../../database/schema/result.schema';

@Injectable()
export class FicrParser {
  parseCompetition(dto: FicrRaceDto): Partial<CompetitionDocument> {
    const raceDate = new Date(dto.Data);

    return {
      name: dto.Description || dto.DSC || dto.ma_Descrizione,
      ficrTeam: dto.TeamCode,
      date: raceDate,
      location: dto.Place,
      poolLength: dto.pi_LunghezzaVasca,
      ficrId: dto.ID,
      nLanes: dto.pi_NumeroCorsie,
      source: Source.FICR,
    };
  }

  parseAthlete(dto: FicrAthleteDto): Partial<AthleteDocument> {
    return {
      firstName: dto.Nome,
      lastName: dto.Cognome,
      code: dto.Codice,
      birthYear: dto.Anno,
      gender: dto.Sex,
      nationality: dto.Naz,
      team: dto.Soc,
    };
  }

  parseResults(
    dto: FicrTempoDto[],
    athleteId: Types.ObjectId,
    raceId: Types.ObjectId,
  ): Partial<ResultWithId>[] {
    // Raggruppa per DescrGara usando reduce
    const eventsMap = dto.reduce((map, tempo) => {
      const key = tempo.DescrGara.trim();
      const arr = map.get(key) ?? [];
      arr.push(tempo);
      map.set(key, arr);
      return map;
    }, new Map<string, FicrTempoDto[]>());

    // Costruisci risultati usando map
    return Array.from(eventsMap.entries()).map(([, tempi]) => {
      const sortedTempi = tempi
        .filter((t) => t.Tempo && t.Stato === 2) // opzionale: solo tempi validi
        .sort((a, b) => a.Metri - b.Metri);

      const splits = sortedTempi.map((t) => ({
        distance: t.Metri,
        displayTime: t.Tempo.trim(),
        millis: this.timeToMillis(t.Tempo.trim()),
      }));

      const finalSplit = splits[splits.length - 1];

      return {
        athlete: athleteId,
        race: raceId,
        displayTime: finalSplit.displayTime,
        millis: finalSplit.millis,
        rank: sortedTempi[0]?.Pos,
        splits,
      };
    });
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

  private parsePoolLength(
    input: string | number | undefined,
  ): PoolLength | undefined {
    if (!input) return undefined;

    const normalized =
      typeof input === 'number'
        ? input
        : Number(String(input).match(/\d+/)?.[0]);

    const map: Record<number, PoolLength> = {
      25: PoolLength.L25,
      50: PoolLength.L50,
    };

    return map[normalized];
  }
}
