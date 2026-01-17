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

export class RaceSearchDto {
  search?: string;
  year?: number;
  limit?: number;
}
