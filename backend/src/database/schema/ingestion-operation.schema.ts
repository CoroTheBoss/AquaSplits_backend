import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import {
  TimestampDocumentType,
  TimestampType,
} from '../../type/timestamp.type';
import { Types } from 'mongoose';
import { Source } from '../../type/source.enum';
import { IngestionStatus } from '../../type/ingestion-status.enum';
import { IngestionStep } from '../../type/ingestion-step.enum';

@Schema({ timestamps: true })
export class IngestionOperation {
  @Prop({ required: true, ref: 'Competition', index: true })
  competition: Types.ObjectId;

  @Prop({ required: true, enum: Source, index: true })
  source: Source;

  @Prop({ enum: IngestionStatus, required: true, index: true })
  status: IngestionStatus;

  @Prop({ enum: IngestionStep, index: true })
  step?: IngestionStep; // Last step reached

  @Prop()
  error?: string; // Error message if failed

  @Prop({ required: true })
  startedAt: Date;

  @Prop()
  finishedAt?: Date;
}

export const IngestionOperationSchema =
  SchemaFactory.createForClass(IngestionOperation);

export type IngestionOperationDocument =
  TimestampDocumentType<IngestionOperation>;
export type IngestionOperationWithId = TimestampType<IngestionOperation>;

// Indexes for efficient queries
IngestionOperationSchema.index({ competition: 1, source: 1, status: 1 });
IngestionOperationSchema.index({ source: 1, status: 1, startedAt: -1 });
IngestionOperationSchema.index({ status: 1, startedAt: -1 }); // For finding failed operations to retry
