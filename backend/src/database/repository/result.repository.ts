import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Result, ResultDocument } from '../schema/result.schema';

@Injectable()
export class ResultRepository {
  constructor(
    @InjectModel(Result.name)
    private readonly resultModel: Model<ResultDocument>,
  ) {}

  async count(): Promise<number> {
    return this.resultModel.countDocuments().exec();
  }

  async deleteByRace(raceId: string | Types.ObjectId): Promise<number> {
    const result = await this.resultModel.deleteMany({ race: raceId }).exec();
    return result.deletedCount || 0;
  }
}
