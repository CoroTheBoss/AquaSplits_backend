import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Result,
  ResultDocument,
  ResultPopulatedWithId,
  ResultWithId,
} from '../schema/result.schema';
import { Stroke } from '../../type/stroke.enum';
import { Distance } from '../../type/distance.enum';

@Injectable()
export class ResultRepository {
  constructor(
    @InjectModel(Result.name)
    private readonly resultModel: Model<ResultDocument>,
  ) {}

  async findById(id: string): Promise<ResultPopulatedWithId | null> {
    return this.resultModel
      .findById(id)
      .populate('athlete')
      .populate('race')
      .lean<ResultPopulatedWithId>()
      .exec();
  }

  async findByAthlete(
    athleteId: string | Types.ObjectId,
  ): Promise<ResultPopulatedWithId[]> {
    return this.resultModel
      .find({ athlete: athleteId })
      .populate('athlete')
      .populate('race')
      .sort({ 'race.date': -1 })
      .lean<ResultPopulatedWithId[]>()
      .exec();
  }

  async findByRace(
    raceId: string | Types.ObjectId,
  ): Promise<ResultPopulatedWithId[]> {
    return this.resultModel
      .find({ race: raceId })
      .populate('athlete')
      .populate('race')
      .sort({ millis: 1 })
      .lean<ResultPopulatedWithId[]>()
      .exec();
  }

  async findByAthleteAndRace(
    athleteId: string | Types.ObjectId,
    raceId: string | Types.ObjectId,
  ): Promise<ResultPopulatedWithId[]> {
    return this.resultModel
      .find({ athlete: athleteId, race: raceId })
      .populate('athlete')
      .populate('race')
      .lean<ResultPopulatedWithId[]>()
      .exec();
  }

  async findByEvent(
    distance: Distance,
    stroke: Stroke,
    limit = 100,
  ): Promise<ResultPopulatedWithId[]> {
    return this.resultModel
      .find({ 'event.distance': distance, 'event.stroke': stroke })
      .populate('athlete')
      .populate('race')
      .sort({ millis: 1 })
      .limit(limit)
      .lean<ResultPopulatedWithId[]>()
      .exec();
  }

  async findBestTimes(
    distance: Distance,
    stroke: Stroke,
    limit = 10,
    gender?: string,
  ): Promise<ResultPopulatedWithId[]> {
    const filter: any = { 'event.distance': distance, 'event.stroke': stroke };

    const query = this.resultModel
      .find(filter)
      .populate({
        path: 'athlete',
        match: gender ? { gender: gender.toUpperCase() } : undefined,
      })
      .populate('race')
      .sort({ millis: 1 })
      .limit(limit);

    const results = await query.lean<ResultPopulatedWithId[]>().exec();

    // Filter out results where the athlete is null (due to gender mismatch)
    if (gender) {
      return results.filter((r) => r.athlete !== null);
    }

    return results;
  }

  async upsertOne(data: Partial<Result>): Promise<ResultWithId> {
    const filter = {
      athlete: data.athlete,
      race: data.race,
      'event.distance': data.event?.distance,
      'event.stroke': data.event?.stroke,
    };

    return this.resultModel
      .findOneAndUpdate(filter, data, {
        upsert: true,
        new: true,
      })
      .lean<ResultWithId>()
      .exec();
  }

  async bulkUpsert(
    results: Partial<Result>[],
  ): Promise<ResultPopulatedWithId[]> {
    const operations = results.map((result) => ({
      updateOne: {
        filter: {
          athlete: result.athlete,
          race: result.race,
          'event.distance': result.event?.distance,
          'event.stroke': result.event?.stroke,
        },
        update: { $set: result },
        upsert: true,
      },
    }));

    await this.resultModel.bulkWrite(operations);

    // Return the upserted documents - build a query from all unique combinations
    const uniqueCombinations = new Set<string>();
    results.forEach((r) => {
      if (r.athlete && r.race && r.event?.distance && r.event?.stroke) {
        uniqueCombinations.add(
          `${r.athlete.toString()}_${r.race.toString()}_${r.event.distance}_${r.event.stroke}`,
        );
      }
    });

    // Fetch all results that match any of the combinations
    const orConditions = Array.from(uniqueCombinations).map((combo) => {
      const [athleteId, raceId, distance, stroke] = combo.split('_');
      return {
        athlete: new Types.ObjectId(athleteId),
        race: new Types.ObjectId(raceId),
        'event.distance': parseInt(distance, 10),
        'event.stroke': stroke,
      };
    });

    if (orConditions.length === 0) {
      return [];
    }

    return this.resultModel
      .find({ $or: orConditions })
      .populate('athlete')
      .populate('race')
      .lean<ResultPopulatedWithId[]>()
      .exec();
  }

  async count(): Promise<number> {
    return this.resultModel.countDocuments().exec();
  }

  async deleteByRace(raceId: string | Types.ObjectId): Promise<number> {
    const result = await this.resultModel.deleteMany({ race: raceId }).exec();
    return result.deletedCount || 0;
  }

  async findWithFilter(
    filter: any,
    limit = 100,
  ): Promise<ResultPopulatedWithId[]> {
    return this.resultModel
      .find(filter)
      .limit(limit)
      .populate('athlete')
      .populate('race')
      .sort({ 'race.date': -1 })
      .lean<ResultPopulatedWithId[]>()
      .exec();
  }
}
