import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  TimestampDocumentType,
  TimestampType,
} from '../../type/timestamp.type';
import { Stroke } from '../../type/stroke.enum';
import { Distance } from '../../type/distance.enum';
import { PoolLength } from '../../type/pool-length.enum';

@Schema({ timestamps: true })
export class Race {
  @Prop({
    type: String,
    enum: Stroke,
    required: true,
    index: true,
  })
  stroke: Stroke;

  @Prop({
    type: Number,
    enum: Distance,
    required: true,
    index: true,
  })
  totalDistance: Distance; // e.g. 200 for 4x50, 50 for 50m individual

  @Prop({
    type: Number,
    enum: Distance,
    required: true,
    index: true,
  })
  lapDistance: Distance; // e.g. 50 for 4x50 or 50m individual; same as totalDistance for non-relays

  @Prop({ required: true, default: false, index: true })
  relay: boolean;

  @Prop({ required: true, default: 1, index: true })
  legs: number; // 4 for relays, 1 for individual

  @Prop({ enum: ['M', 'F', 'X'], required: true, index: true })
  gender: 'M' | 'F' | 'X';

  @Prop({ required: true, trim: true, index: true })
  name: string;

  @Prop({ type: Number, enum: PoolLength, required: true, index: true })
  poolLength: PoolLength;
}

export const RaceSchema = SchemaFactory.createForClass(Race);

export type RaceDocument = TimestampDocumentType<Race>;
export type RaceWithId = TimestampType<Race>;

// Compound unique index: one race per stroke+totalDistance+lapDistance+relay+legs+gender+poolLength
RaceSchema.index(
  {
    stroke: 1,
    totalDistance: 1,
    lapDistance: 1,
    relay: 1,
    legs: 1,
    gender: 1,
    poolLength: 1,
  },
  { unique: true },
);
