import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Athlete,
  AthleteDocument,
  AthleteWithId,
} from '../schema/athlete.schema';

@Injectable()
export class AthleteRepository {
  constructor(
    @InjectModel(Athlete.name)
    private readonly athleteModel: Model<AthleteDocument>,
  ) {}

  async findById(id: string): Promise<AthleteWithId | null> {
    return this.athleteModel.findById(id).lean<AthleteWithId>().exec();
  }

  async findByFicrId(ficrId: string): Promise<AthleteWithId | null> {
    return this.athleteModel.findOne({ ficrId }).lean<AthleteWithId>().exec();
  }

  async search(query: string, limit = 50): Promise<AthleteWithId[]> {
    const filter = {
      $or: [
        { firstName: new RegExp(query, 'i') },
        { lastName: new RegExp(query, 'i') },
        {
          $expr: {
            $regexMatch: {
              input: { $concat: ['$firstName', ' ', '$lastName'] },
              regex: query,
              options: 'i',
            },
          },
        },
      ],
    };
    return this.athleteModel
      .find(filter)
      .limit(limit)
      .lean<AthleteWithId[]>()
      .exec();
  }

  async count(): Promise<number> {
    return this.athleteModel.countDocuments().exec();
  }

  async findWithFilter(filter: any, limit = 50): Promise<AthleteWithId[]> {
    return this.athleteModel
      .find(filter)
      .limit(limit)
      .lean<AthleteWithId[]>()
      .exec();
  }

  async upsertOne(data: Partial<Athlete>): Promise<AthleteWithId> {
    if (!data.code) {
      throw new Error('code is required for upsert');
    }
    const filter = { code: data.code };

    return this.athleteModel
      .findOneAndUpdate(filter, data, {
        upsert: true,
        new: true,
      })
      .lean<AthleteWithId>()
      .exec();
  }
}
