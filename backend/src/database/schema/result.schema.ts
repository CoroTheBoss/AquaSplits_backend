import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Result extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Athlete', required: true, index: true })
  athlete: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Race', required: true, index: true })
  race: Types.ObjectId;

  @Prop({ required: true, index: true, trim: true })
  event: string; // e.g. "100m Freestyle"

  @Prop({ required: true })
  time: string; // e.g. "00:58.45"

  @Prop({ required: true, index: true })
  millis: number;

  @Prop({
    type: [
      {
        distance: { type: Number, required: true },
        time: { type: String, required: true },
        millis: { type: Number, required: true },
      },
    ],
  })
  splits?: Array<{ distance: number; time: string; millis: number }>;

  @Prop({ index: true })
  rank?: number;
}

export const ResultSchema = SchemaFactory.createForClass(Result);

// Compound indexes for common queries
ResultSchema.index({ athlete: 1, race: 1, event: 1 }, { unique: true });
ResultSchema.index({ event: 1, millis: 1 });
ResultSchema.index({ race: 1, millis: 1 });
ResultSchema.index({ race: 1, rank: 1 });
