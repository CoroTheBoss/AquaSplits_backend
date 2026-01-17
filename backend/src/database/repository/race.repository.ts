import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Race } from '../schema/race.schema';

@Injectable()
export class RaceRepository {
  constructor(
    @InjectModel(Race.name) private readonly raceModel: Model<Race>,
  ) {}

  async findById(id: string): Promise<Race | null> {
    return this.raceModel.findById(id).exec();
  }

  async findByFicrId(ficrRaceId: string): Promise<Race | null> {
    return this.raceModel.findOne({ ficrRaceId }).exec();
  }

  async findBySource(source: string): Promise<Race[]> {
    return this.raceModel.find({ source }).exec();
  }

  async findByYear(year: number): Promise<Race[]> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year + 1, 0, 1);
    return this.raceModel
      .find({
        date: {
          $gte: startDate,
          $lt: endDate,
        },
      })
      .sort({ date: 1 })
      .exec();
  }

  async search(query: string, limit = 50): Promise<Race[]> {
    const filter = {
      $or: [
        { name: new RegExp(query, 'i') },
        { location: new RegExp(query, 'i') },
      ],
    };
    return this.raceModel.find(filter).limit(limit).sort({ date: -1 }).exec();
  }

  async upsertOne(data: Partial<Race>): Promise<Race> {
    if (!data.ficrRaceId && !data.source) {
      throw new Error('ficrRaceId or source is required for upsert');
    }
    const filter = data.ficrRaceId
      ? { ficrRaceId: data.ficrRaceId }
      : { name: data.name, date: data.date, source: data.source };
    
    return this.raceModel.findOneAndUpdate(filter, data, {
      upsert: true,
      new: true,
    });
  }

  async bulkUpsert(races: Partial<Race>[]): Promise<Race[]> {
    const operations = races.map((race) => {
      const filter = race.ficrRaceId
        ? { ficrRaceId: race.ficrRaceId }
        : { name: race.name, date: race.date, source: race.source };
      
      return {
        updateOne: {
          filter,
          update: { $set: race },
          upsert: true,
        },
      };
    });

    await this.raceModel.bulkWrite(operations);
    
    // Return the upserted documents
    const ficrIds = races
      .map((r) => r.ficrRaceId)
      .filter(Boolean) as string[];
    
    if (ficrIds.length > 0) {
      return this.raceModel.find({ ficrRaceId: { $in: ficrIds } }).exec();
    }
    
    // Fallback: return by name/date/source if no ficrIds
    return Promise.all(
      races.map((race) =>
        this.raceModel.findOne({
          name: race.name,
          date: race.date,
          source: race.source,
        }),
      ),
    ).then((results) => results.filter(Boolean) as Race[]);
  }

  async count(): Promise<number> {
    return this.raceModel.countDocuments().exec();
  }

  async findWithFilter(filter: any, limit = 50): Promise<Race[]> {
    return this.raceModel.find(filter).limit(limit).sort({ date: -1 }).exec();
  }
}
