import { Types } from 'mongoose';
import { ResultWithId } from '../../database/schema/result.schema';
import { RelayWithId } from '../../database/schema/relay.schema';

export function transformObjectId(id: Types.ObjectId | string | undefined): string {
  if (!id) return '';
  if (typeof id === 'string') return id;
  return id.toString();
}

export function transformResult(result: ResultWithId): any {
  return {
    id: transformObjectId(result._id),
    athlete: transformObjectId(result.athlete),
    race: transformObjectId(result.race),
    relay: result.relay ? transformObjectId(result.relay) : undefined,
    leg: result.leg,
    category: result.category,
    rank: result.rank,
    finalTime: result.finalTime
      ? {
          millis:
            typeof result.finalTime === 'object' && 'millis' in result.finalTime
              ? result.finalTime.millis
              : typeof result.finalTime === 'number'
                ? result.finalTime
                : 0,
        }
      : undefined,
    splits: result.splits,
  };
}

export function transformRelay(relay: RelayWithId): any {
  return {
    id: transformObjectId(relay._id),
    competition: transformObjectId(relay.competition),
    race: transformObjectId(relay.race),
    category: relay.category,
    legs: relay.legs.map((leg) => ({
      athleteId: transformObjectId(leg.athlete),
      legNumber: leg.leg,
      millis: leg.millis,
    })),
    lane: relay.lane,
    heat: relay.heat,
    team: relay.team,
    displayTime: relay.displayTime,
    millis: relay.millis,
    rank: relay.rank,
    splits: relay.splits,
  };
}

export function transformRace(race: any): any {
  return {
    id: transformObjectId(race._id),
    stroke: typeof race.stroke === 'string' ? race.stroke : race.stroke,
    totalDistance: race.totalDistance,
    lapDistance: race.lapDistance,
    relay: race.relay,
    legs: race.legs,
    gender: race.gender,
    name: race.name,
    poolLength: race.poolLength,
  };
}

export function transformCompetition(competition: any): any {
  return {
    id: transformObjectId(competition._id),
    name: competition.name,
    date: competition.date instanceof Date
      ? competition.date.toISOString()
      : competition.date,
    location: competition.location,
    poolLength: competition.poolLength,
    ficrId: competition.ficrId,
    ficrTeam: competition.ficrTeam,
    nLanes: competition.nLanes,
    source: competition.source,
    sourceStatuses: competition.sourceStatuses
      ? competition.sourceStatuses.map((s: any) =>
          typeof s === 'string' ? s : JSON.stringify(s),
        )
      : undefined,
    races: competition.races
      ? competition.races.map((r: any) => transformObjectId(r))
      : undefined,
  };
}

export function transformAthlete(athlete: any): any {
  // Frontend uses 'code' as the identifier, not 'id'
  return {
    firstName: athlete.firstName,
    lastName: athlete.lastName,
    code: athlete.code,
    birthYear: athlete.birthYear,
    gender: athlete.gender,
    nationality: athlete.nationality,
    team: athlete.team,
  };
}
