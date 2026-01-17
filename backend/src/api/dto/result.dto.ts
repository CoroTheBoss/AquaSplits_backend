import { Types } from 'mongoose';
import { Distance, Stroke, Event } from '../../database/schema/event.enum';
import { AthleteDto } from './athlete.dto';
import { RaceDto } from './race.dto';

export class ResultDto {
  _id: string | Types.ObjectId;
  athlete: AthleteDto | string | Types.ObjectId;
  race: RaceDto | string | Types.ObjectId;
  event: Event;
  time: string;
  millis: number;
  rank?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class ResultSearchDto {
  athleteId?: string;
  raceId?: string;
  distance?: Distance;
  stroke?: Stroke;
  limit?: number;
}
