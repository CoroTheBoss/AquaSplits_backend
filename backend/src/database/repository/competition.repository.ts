import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Competition,
  CompetitionDocument,
  CompetitionWithId,
} from '../schema/competition.schema';

@Injectable()
export class CompetitionRepository {
  constructor(
    @InjectModel(Competition.name)
    private readonly raceModel: Model<CompetitionDocument>,
  ) {}

  async findById(id: string): Promise<CompetitionWithId | null> {
    return this.raceModel.findById(id).lean<CompetitionWithId>().exec();
  }

  async findByFicrId(ficrRaceId: string): Promise<CompetitionWithId | null> {
    return this.raceModel
      .findOne({ ficrRaceId })
      .lean<CompetitionWithId>()
      .exec();
  }

  async findByYear(year: number): Promise<CompetitionWithId[]> {
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
      .lean<CompetitionWithId[]>()
      .exec();
  }

  async search(query: string, limit = 50): Promise<CompetitionWithId[]> {
    const filter = {
      $or: [
        { name: new RegExp(query, 'i') },
        { location: new RegExp(query, 'i') },
      ],
    };
    return this.raceModel
      .find(filter)
      .limit(limit)
      .sort({ date: -1 })
      .lean<CompetitionWithId[]>()
      .exec();
  }

  async upsertOne(data: Partial<Competition>): Promise<CompetitionWithId> {
    if (!data.ficrId && !data.source) {
      throw new Error('ficrRaceId or source is required for upsert');
    }
    const filter = data.ficrId
      ? { ficrRaceId: data.ficrId }
      : { name: data.name, date: data.date, source: data.source };

    return this.raceModel
      .findOneAndUpdate(filter, data, {
        upsert: true,
        new: true,
      })
      .lean<CompetitionWithId>()
      .exec();
  }

  async bulkUpsert(
    races: Partial<Competition>[],
  ): Promise<CompetitionWithId[]> {
    const operations = races.map((race) => {
      const filter = race.ficrId
        ? { ficrRaceId: race.ficrId }
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
    const ficrIds = races.map((r) => r.ficrId).filter(Boolean);

    if (ficrIds.length > 0) {
      return this.raceModel
        .find({ ficrRaceId: { $in: ficrIds } })
        .lean<CompetitionWithId[]>()
        .exec();
    }

    // Fallback: return by name/date/source if no ficrIds
    return Promise.all(
      races.map((race) =>
        this.raceModel
          .findOne({
            name: race.name,
            date: race.date,
            source: race.source,
          })
          .lean<CompetitionWithId>()
          .exec(),
      ),
    ).then((results) => results.filter(Boolean) as CompetitionWithId[]);
  }

  async count(): Promise<number> {
    return this.raceModel.countDocuments().exec();
  }

  async findWithFilter(filter: any, limit = 50): Promise<CompetitionWithId[]> {
    return this.raceModel
      .find(filter)
      .limit(limit)
      .sort({ date: -1 })
      .lean<CompetitionWithId[]>()
      .exec();
  }
}
