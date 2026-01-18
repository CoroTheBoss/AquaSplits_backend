import { Distance, Stroke } from '../../database/schema/event.enum';

export type { ResultPopulatedWithId } from '../../database/schema/result.schema';

export type ResultSearchQuery = {
  athleteId?: string;
  raceId?: string;
  distance?: Distance;
  stroke?: Stroke;
  limit?: number;
};

