import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  IngestionOperation,
  IngestionOperationDocument,
  IngestionOperationWithId,
} from '../schema/ingestion-operation.schema';
import { Source } from '../../type/source.enum';
import { IngestionStatus } from '../../type/ingestion-status.enum';
import { IngestionStep } from '../../type/ingestion-step.enum';

@Injectable()
export class IngestionOperationRepository {
  constructor(
    @InjectModel(IngestionOperation.name)
    private readonly operationModel: Model<IngestionOperationDocument>,
  ) {}

  async create(data: {
    competition: Types.ObjectId;
    source: Source;
    status: IngestionStatus;
    step?: IngestionStep;
    startedAt: Date;
  }): Promise<IngestionOperationWithId> {
    const operation = new this.operationModel(data);
    return operation
      .save()
      .then((doc) => doc.toObject() as IngestionOperationWithId);
  }

  async findById(id: string): Promise<IngestionOperationWithId | null> {
    return this.operationModel
      .findById(id)
      .lean<IngestionOperationWithId>()
      .exec();
  }

  async updateStatus(
    id: string | Types.ObjectId,
    status: IngestionStatus,
    step?: IngestionStep,
    error?: string,
    finishedAt?: Date,
  ): Promise<IngestionOperationWithId | null> {
    const update: any = { status };
    if (step !== undefined) update.step = step;
    if (error !== undefined) update.error = error;
    if (finishedAt !== undefined) update.finishedAt = finishedAt;

    return this.operationModel
      .findByIdAndUpdate(id, update, { new: true })
      .lean<IngestionOperationWithId>()
      .exec();
  }
}
