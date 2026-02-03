import { Injectable } from '@nestjs/common';
import { FicrCompetitionDto } from './dto/ficr-competition.dto';
import { FicrTempoDto } from './dto/fict-tempo.dto';
import { Stroke } from '../../type/stroke.enum';
import { Types } from 'mongoose';
import { Distance } from '../../type/distance.enum';
import { Source } from '../../type/source.enum';
import { CompetitionDocument } from '../../database/schema/competition.schema';
import { FicrAthleteDto } from './dto/ficr-athlete.dto';
import { AthleteDocument } from '../../database/schema/athlete.schema';
import { ResultWithId } from '../../database/schema/result.schema';
import { TimeParser } from '../../utils/time-parser';

@Injectable()
export class FicrParser {
  parseCompetition(dto: FicrCompetitionDto): Partial<CompetitionDocument> {
    const [day, month, year] = dto.Data.split('/').map(Number);
    const raceDate = new Date(year, month - 1, day);

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
      const sortedTempi = tempi.sort((a, b) => a.Metri - b.Metri);

      const splits = sortedTempi.map((t) => ({
        distance: t.Metri,
        displayTime: t.Tempo.trim(),
        millis: TimeParser.toMillis(t.Tempo.trim()),
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

  parseEvent(eventStr: string): {
    stroke: Stroke;
    totalDistance: Distance;
    lapDistance: Distance;
    relay: boolean;
    legs: number;
    name: string;
  } | null {
    if (!eventStr) return null;

    const normalized = eventStr.toLowerCase().trim();
    const isRelay = normalized.includes('4x') || normalized.includes('4 x');
    let totalDistance: Distance | null = null;
    let lapDistance: Distance | null = null;
    let stroke: Stroke | null = null;

    // For relays, extract distance per leg (e.g., "4x50m" -> 50)
    const relayMatch = normalized.match(/4\s*x\s*(\d+)\s*m/);
    if (relayMatch) {
      const perLeg = parseInt(relayMatch[1], 10);
      if (Object.values(Distance).includes(perLeg as Distance)) {
        lapDistance = perLeg as Distance;
        totalDistance = (perLeg * 4) as Distance; // 4x50=200, 4x100=400, 4x200=800
      }
    } else {
      // For individual events: totalDistance === lapDistance
      const distanceMatch = normalized.match(/(\d+)\s*m/);
      if (distanceMatch) {
        const dist = parseInt(distanceMatch[1], 10);
        if (Object.values(Distance).includes(dist as Distance)) {
          totalDistance = lapDistance = dist as Distance;
        }
      }
    }

    if (isRelay) {
      stroke = Stroke.FREESTYLE; // Placeholder for relays
      const relayType =
        normalized.includes('medley') ||
        normalized.includes('misti') ||
        normalized.includes('mi')
          ? 'medley'
          : 'freestyle';
      if (lapDistance && totalDistance) {
        const strokeName = relayType === 'medley' ? 'Medley' : 'Freestyle';
        return {
          stroke,
          totalDistance,
          lapDistance,
          relay: true,
          legs: 4,
          name: `4x${lapDistance}m ${strokeName}`,
        };
      }
    } else {
      // Individual events
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

      if (totalDistance && lapDistance && stroke) {
        return {
          stroke,
          totalDistance,
          lapDistance,
          relay: false,
          legs: 1,
          name: `${totalDistance}m ${this.getStrokeDisplayName(stroke)}`,
        };
      }
    }

    return null;
  }

  private getStrokeDisplayName(stroke: Stroke): string {
    const strokeNames: Record<Stroke, string> = {
      [Stroke.FREESTYLE]: 'Freestyle',
      [Stroke.BACKSTROKE]: 'Backstroke',
      [Stroke.BREASTSTROKE]: 'Breaststroke',
      [Stroke.BUTTERFLY]: 'Butterfly',
      [Stroke.INDIVIDUAL_MEDLEY]: 'Individual Medley',
    };
    return strokeNames[stroke] || stroke;
  }
}
