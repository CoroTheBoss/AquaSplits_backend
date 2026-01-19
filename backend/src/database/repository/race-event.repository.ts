import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RaceEvent, RaceEventDocument } from '../schema/race-event.schema';

@Injectable()
export class RacEventRepository {
  constructor(
    @InjectModel(RaceEvent.name)
    private readonly raceEventModel: Model<RaceEventDocument>,
  ) {}

  async count(): Promise<number> {
    return this.raceEventModel.countDocuments().exec();
  }

  async deleteByRace(raceId: string | Types.ObjectId): Promise<number> {
    const result = await this.raceEventModel
      .deleteMany({ race: raceId })
      .exec();
    return result.deletedCount || 0;
  }
}
