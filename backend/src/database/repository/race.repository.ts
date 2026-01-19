import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Race, RaceDocument } from '../schema/race.schema';

@Injectable()
export class RaceRepository {
  constructor(
    @InjectModel(Race.name)
    private readonly resultModel: Model<RaceDocument>,
  ) {}
}
