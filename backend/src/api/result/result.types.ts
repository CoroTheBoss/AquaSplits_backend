import { Stroke } from '../../type/stroke.enum';
import { Distance } from '../../type/distance.enum';

export type ResultSearchQuery = {
  athleteId?: string;
  raceId?: string;
  distance?: Distance;
  stroke?: Stroke;
  limit?: number;
};
