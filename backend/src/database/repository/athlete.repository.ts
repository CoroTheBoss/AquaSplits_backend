import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Athlete } from '../schema/athlete.schema';

@Injectable()
export class AthleteRepository {
  constructor(
    @InjectModel(Athlete.name) private readonly athleteModel: Model<Athlete>,
  ) {}

  async findById(id: string): Promise<Athlete | null> {
    return this.athleteModel.findById(id).exec();
  }

  async findByFicrId(ficrId: string): Promise<Athlete | null> {
    return this.athleteModel.findOne({ ficrId }).exec();
  }

  async findMany(ids: string[]): Promise<Athlete[]> {
    return this.athleteModel.find({ _id: { $in: ids } }).exec();
  }

  async search(query: string, limit = 50): Promise<Athlete[]> {
    const filter = {
      $or: [
        { firstName: new RegExp(query, 'i') },
        { lastName: new RegExp(query, 'i') },
        { $expr: { $regexMatch: { input: { $concat: ['$firstName', ' ', '$lastName'] }, regex: query, options: 'i' } } },
      ],
    };
    return this.athleteModel.find(filter).limit(limit).exec();
  }

  async upsertOne(data: Partial<Athlete>): Promise<Athlete> {
    if (!data.ficrId) {
      throw new Error('ficrId is required for upsert');
    }
    return this.athleteModel.findOneAndUpdate(
      { ficrId: data.ficrId },
      data,
      { upsert: true, new: true },
    );
  }

  async bulkUpsert(athletes: Partial<Athlete>[]): Promise<Athlete[]> {
    const operations = athletes.map((athlete) => ({
      updateOne: {
        filter: { ficrId: athlete.ficrId },
        update: { $set: athlete },
        upsert: true,
      },
    }));

    await this.athleteModel.bulkWrite(operations);
    
    // Return the upserted documents
    const ficrIds = athletes.map((a) => a.ficrId).filter(Boolean) as string[];
    return this.athleteModel.find({ ficrId: { $in: ficrIds } }).exec();
  }

  async count(): Promise<number> {
    return this.athleteModel.countDocuments().exec();
  }

  async findWithFilter(filter: any, limit = 50): Promise<Athlete[]> {
    return this.athleteModel.find(filter).limit(limit).exec();
  }
}
