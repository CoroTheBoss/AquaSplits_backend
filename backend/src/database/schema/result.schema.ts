import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import {
  TimestampDocumentType,
  TimestampType,
} from '../../type/timestamp.type';
import { Split } from '../../type/spllit.type';

@Schema({ timestamps: true })
export class Result {
  @Prop({ type: Types.ObjectId, ref: 'Athlete', required: true, index: true })
  athlete: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Race', required: true, index: true })
  race: Types.ObjectId;

  @Prop({ required: true })
  displayTime: string; // e.g. "2'35.76"

  @Prop({ required: true, index: true })
  millis: number;

  @Prop({ index: true })
  rank?: number;

  @Prop()
  splits?: Split[];
}

export const ResultSchema = SchemaFactory.createForClass(Result);

export type ResultDocument = TimestampDocumentType<Result>;
export type ResultWithId = TimestampType<Result>;

// Compound indexes for common queries
ResultSchema.index(
  { athlete: 1, race: 1, 'event.distance': 1, 'event.stroke': 1 },
  { unique: true },
);
ResultSchema.index({ 'event.distance': 1, 'event.stroke': 1, millis: 1 });
ResultSchema.index({ race: 1, millis: 1 });
ResultSchema.index({ race: 1, rank: 1 });
