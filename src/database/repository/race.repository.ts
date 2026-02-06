import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Race, RaceDocument, RaceWithId } from '../schema/race.schema';
import { PoolLength } from '../../type/pool-length.enum';

@Injectable()
export class RaceRepository {
  constructor(
    @InjectModel(Race.name)
    private readonly raceModel: Model<RaceDocument>,
  ) {}

  async findOrCreate(data: {
    stroke: string;
    totalDistance: number;
    lapDistance: number;
    relay: boolean;
    legs: number;
    gender: 'M' | 'F' | 'X';
    name: string;
    poolLength: PoolLength;
  }): Promise<RaceWithId> {
    const filter = {
      stroke: data.stroke,
      totalDistance: data.totalDistance,
      lapDistance: data.lapDistance,
      relay: data.relay,
      legs: data.legs,
      gender: data.gender,
      poolLength: data.poolLength,
    };

    const existing = await this.raceModel
      .findOne(filter)
      .lean<RaceWithId>()
      .exec();

    if (existing) {
      if (existing.name !== data.name) {
        await this.raceModel
          .updateOne({ _id: existing._id }, { $set: { name: data.name } })
          .exec();
        return { ...existing, name: data.name } as RaceWithId;
      }
      return existing;
    }

    const newRace = new this.raceModel({
      stroke: data.stroke,
      totalDistance: data.totalDistance,
      lapDistance: data.lapDistance,
      relay: data.relay,
      legs: data.legs,
      gender: data.gender,
      name: data.name,
      poolLength: data.poolLength,
    });
    const saved = await newRace.save();
    return saved.toObject() as RaceWithId;
  }

  async findById(id: string | Types.ObjectId): Promise<RaceWithId | null> {
    return this.raceModel.findById(id).lean<RaceWithId>().exec();
  }
}
