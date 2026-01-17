import { Types } from 'mongoose';

export class AthleteDto {
  _id: string | Types.ObjectId;
  firstName: string;
  lastName: string;
  birthDate?: Date;
  gender?: string;
  ficrId?: string;
  nationality?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class AthleteSearchDto {
  search?: string;
  limit?: number;
}
