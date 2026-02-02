import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Competition,
  CompetitionDocument,
  CompetitionWithId,
} from '../schema/competition.schema';
import { Source } from '../../type/source.enum';
import { IngestionStatus } from '../../type/ingestion-status.enum';

@Injectable()
export class CompetitionRepository {
  constructor(
    @InjectModel(Competition.name)
    private readonly raceModel: Model<CompetitionDocument>,
  ) {}

  async findById(id: string): Promise<CompetitionWithId | null> {
    return this.raceModel.findById(id).lean<CompetitionWithId>().exec();
  }

  async findByFicrId(
    ficrId: number | string,
  ): Promise<CompetitionWithId | null> {
    return this.raceModel
      .findOne({
        ficrId: typeof ficrId === 'string' ? parseInt(ficrId, 10) : ficrId,
      })
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
      throw new Error('ficrId or source is required for upsert');
    }
    const filter = data.ficrId
      ? { ficrId: data.ficrId }
      : { name: data.name, date: data.date, source: data.source };

    return this.raceModel
      .findOneAndUpdate(filter, data, {
        upsert: true,
        new: true,
      })
      .lean<CompetitionWithId>()
      .exec();
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

  async updateRaces(
    competitionId: string | Types.ObjectId,
    races: Types.ObjectId[],
  ): Promise<void> {
    const id =
      typeof competitionId === 'string'
        ? competitionId
        : competitionId.toString();

    await this.raceModel
      .findByIdAndUpdate(
        id,
        {
          $addToSet: { races: { $each: races } },
        },
        { new: true },
      )
      .exec();
  }

  async updateSourceStatus(
    competitionId: string | Types.ObjectId,
    source: Source,
    status: IngestionStatus,
  ): Promise<void> {
    const id =
      typeof competitionId === 'string'
        ? competitionId
        : competitionId.toString();

    const now = new Date();
    const updateData = {
      'sourceStatuses.$[elem].lastIngestedAt': now,
      'sourceStatuses.$[elem].lastStatus': status,
    };

    // First, try to update existing source status
    const updateResult = await this.raceModel
      .updateOne(
        { _id: id },
        { $set: updateData },
        {
          arrayFilters: [{ 'elem.source': source }],
        },
      )
      .exec();

    // If update didn't affect any document, the source doesn't exist - add it
    if (updateResult.modifiedCount === 0) {
      const competition = await this.findById(id);
      if (competition) {
        const hasSource = competition.sourceStatuses?.some(
          (s) => s.source === source,
        );
        if (!hasSource) {
          await this.raceModel.updateOne(
            { _id: id },
            {
              $push: {
                sourceStatuses: {
                  source,
                  lastIngestedAt: now,
                  lastStatus: status,
                },
              },
            },
          ).exec();
        }
      }
    }
  }
}
