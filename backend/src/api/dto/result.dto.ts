import { AthleteDto } from './athlete.dto';
import { RaceDto } from './race.dto';

export class SplitDto {
  distance: number;
  time: string;
  millis: number;
}

import { Types } from 'mongoose';

export class ResultDto {
  _id: string | Types.ObjectId;
  athlete: AthleteDto | string | Types.ObjectId;
  race: RaceDto | string | Types.ObjectId;
  event: string;
  time: string;
  millis: number;
  splits?: SplitDto[];
  rank?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class CreateResultDto {
  athlete: string;
  race: string;
  event: string;
  time: string;
  millis: number;
  splits?: SplitDto[];
  rank?: number;
}

export class UpdateResultDto {
  event?: string;
  time?: string;
  millis?: number;
  splits?: SplitDto[];
  rank?: number;
}

export class ResultSearchDto {
  athleteId?: string;
  raceId?: string;
  event?: string;
  limit?: number;
  skip?: number;
}
