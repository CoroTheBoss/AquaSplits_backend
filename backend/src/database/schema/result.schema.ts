import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Distance, Stroke } from './event.enum';
import { TimestampDocumentType, TimestampType } from './mongoose-types';
import { AthleteWithId } from './athlete.schema';
import { RaceWithId } from './race.schema';

@Schema({ timestamps: true })
export class Result {
  @Prop({ type: Types.ObjectId, ref: 'Athlete', required: true, index: true })
  athlete: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Race', required: true, index: true })
  race: Types.ObjectId;

  @Prop({
    type: {
      distance: { type: Number, enum: Object.values(Distance), required: true },
      stroke: { type: String, enum: Object.values(Stroke), required: true },
    },
    required: true,
    _id: false,
  })
  event: {
    distance: Distance;
    stroke: Stroke;
  };

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
ResultSchema.index({ athlete: 1, race: 1, 'event.distance': 1, 'event.stroke': 1 }, { unique: true });
ResultSchema.index({ 'event.distance': 1, 'event.stroke': 1, millis: 1 });
ResultSchema.index({ race: 1, millis: 1 });
ResultSchema.index({ race: 1, rank: 1 });
