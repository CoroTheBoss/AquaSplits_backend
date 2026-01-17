import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Distance, Stroke } from './event.enum';

@Schema({ timestamps: true })
export class Result extends Document {
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

// Compound indexes for common queries
ResultSchema.index({ athlete: 1, race: 1, 'event.distance': 1, 'event.stroke': 1 }, { unique: true });
ResultSchema.index({ 'event.distance': 1, 'event.stroke': 1, millis: 1 });
ResultSchema.index({ race: 1, millis: 1 });
ResultSchema.index({ race: 1, rank: 1 });
