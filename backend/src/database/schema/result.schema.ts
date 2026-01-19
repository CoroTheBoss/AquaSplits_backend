import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Stroke } from '../../type/stroke.enum';
import { TimestampDocumentType, TimestampType } from '../../type/timestamp.type';
import { AthleteWithId } from './athlete.schema';
import { RaceWithId } from './race.schema';
import { Distance } from '../../type/distance.enum';

const DISTANCE_ENUM_VALUES = Object.values(Distance).filter(
  (v): v is Distance => typeof v === 'number',
);

@Schema({ _id: false })
export class RaceEvent {
  @Prop({
    type: Number,
    enum: DISTANCE_ENUM_VALUES,
    required: true,
  })
  distance: Distance;

  @Prop({
    type: String,
    enum: Object.values(Stroke),
    required: true,
  })
  stroke: Stroke;
}

export const RaceEventSchema = SchemaFactory.createForClass(RaceEvent);

@Schema({ timestamps: true })
export class Result {
  @Prop({ type: Types.ObjectId, ref: 'Athlete', required: true, index: true })
  athlete: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Race', required: true, index: true })
  race: Types.ObjectId;

  @Prop({ type: RaceEventSchema, required: true })
  event: RaceEvent;

  @Prop({ required: true })
  time: string; // e.g. "00:58.45"

  @Prop({ required: true, index: true })
  millis: number;

  @Prop({ index: true })
  rank?: number;
}

export const ResultSchema = SchemaFactory.createForClass(Result);

export type ResultDocument = TimestampDocumentType<Result>;
export type ResultWithId = TimestampType<Result>;
export type ResultPopulatedWithId = Omit<ResultWithId, 'athlete' | 'race'> & {
  athlete: AthleteWithId | null;
  race: RaceWithId;
};

// Compound indexes for common queries
ResultSchema.index(
  { athlete: 1, race: 1, 'event.distance': 1, 'event.stroke': 1 },
  { unique: true },
);
ResultSchema.index({ 'event.distance': 1, 'event.stroke': 1, millis: 1 });
ResultSchema.index({ race: 1, millis: 1 });
ResultSchema.index({ race: 1, rank: 1 });
