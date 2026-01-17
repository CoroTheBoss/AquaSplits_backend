import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Result } from '../schema/result.schema';

@Injectable()
export class ResultRepository {
  constructor(
    @InjectModel(Result.name) private readonly resultModel: Model<Result>,
  ) {}

  async findById(id: string): Promise<Result | null> {
    return this.resultModel.findById(id).populate('athlete').populate('race').exec();
  }

  async findByAthlete(athleteId: string | Types.ObjectId): Promise<Result[]> {
    return this.resultModel
      .find({ athlete: athleteId })
      .populate('athlete')
      .populate('race')
      .sort({ 'race.date': -1 })
      .exec();
  }

  async findByRace(raceId: string | Types.ObjectId): Promise<Result[]> {
    return this.resultModel
      .find({ race: raceId })
      .populate('athlete')
      .populate('race')
      .sort({ millis: 1 })
      .exec();
  }

  async findByAthleteAndRace(
    athleteId: string | Types.ObjectId,
    raceId: string | Types.ObjectId,
  ): Promise<Result[]> {
    return this.resultModel
      .find({ athlete: athleteId, race: raceId })
      .populate('athlete')
      .populate('race')
      .exec();
  }

  async findByEvent(event: string, limit = 100): Promise<Result[]> {
    return this.resultModel
      .find({ event: new RegExp(event, 'i') })
      .populate('athlete')
      .populate('race')
      .sort({ millis: 1 })
      .limit(limit)
      .exec();
  }

  async findBestTimes(
    event: string,
    limit = 10,
    gender?: string,
  ): Promise<Result[]> {
    const filter: any = { event: new RegExp(event, 'i') };
    
    let query = this.resultModel
      .find(filter)
      .populate({
        path: 'athlete',
        match: gender ? { gender: gender.toUpperCase() } : undefined,
      })
      .populate('race')
      .sort({ millis: 1 })
      .limit(limit);
    
    const results = await query.exec();
    
    // Filter out results where athlete is null (due to gender mismatch)
    if (gender) {
      return results.filter((r) => r.athlete !== null) as Result[];
    }
    
    return results;
  }

  async upsertOne(data: Partial<Result>): Promise<Result> {
    const filter = {
      athlete: data.athlete,
      race: data.race,
      event: data.event,
    };
    
    return this.resultModel.findOneAndUpdate(filter, data, {
      upsert: true,
      new: true,
    });
  }

  async bulkUpsert(results: Partial<Result>[]): Promise<Result[]> {
    const operations = results.map((result) => ({
      updateOne: {
        filter: {
          athlete: result.athlete,
          race: result.race,
          event: result.event,
        },
        update: { $set: result },
        upsert: true,
      },
    }));

    await this.resultModel.bulkWrite(operations);
    
    // Return the upserted documents - build query from all unique combinations
    const uniqueCombinations = new Set<string>();
    results.forEach((r) => {
      if (r.athlete && r.race && r.event) {
        uniqueCombinations.add(
          `${r.athlete.toString()}_${r.race.toString()}_${r.event}`,
        );
      }
    });

    // Fetch all results that match any of the combinations
    const orConditions = Array.from(uniqueCombinations).map((combo) => {
      const [athleteId, raceId, event] = combo.split('_');
      return {
        athlete: new Types.ObjectId(athleteId),
        race: new Types.ObjectId(raceId),
        event: event,
      };
    });

    if (orConditions.length === 0) {
      return [];
    }

    return this.resultModel
      .find({ $or: orConditions })
      .populate('athlete')
      .populate('race')
      .exec();
  }

  async count(): Promise<number> {
    return this.resultModel.countDocuments().exec();
  }

  async deleteByRace(raceId: string | Types.ObjectId): Promise<number> {
    const result = await this.resultModel.deleteMany({ race: raceId }).exec();
    return result.deletedCount || 0;
  }

  async findWithFilter(filter: any, limit = 100): Promise<Result[]> {
    return this.resultModel
      .find(filter)
      .limit(limit)
      .populate('athlete')
      .populate('race')
      .sort({ 'race.date': -1 })
      .exec();
  }
}
