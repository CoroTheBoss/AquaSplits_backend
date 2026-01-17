import { Types } from 'mongoose';

export class RaceDto {
  _id: string | Types.ObjectId;
  name: string;
  date: Date;
  location?: string;
  poolLength?: number;
  ficrRaceId?: string;
  source: string;
  year?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class CreateRaceDto {
  name: string;
  date: Date;
  location?: string;
  poolLength?: number;
  ficrRaceId?: string;
  source?: string;
  year?: number;
}

export class UpdateRaceDto {
  name?: string;
  date?: Date;
  location?: string;
  poolLength?: number;
  ficrRaceId?: string;
  source?: string;
  year?: number;
}

export class RaceSearchDto {
  search?: string;
  source?: string;
  year?: number;
  poolLength?: number;
  limit?: number;
  skip?: number;
}
