import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Race extends Document {
  @Prop({ required: true, index: true, trim: true })
  name: string;

  @Prop({ required: true, index: true })
  date: Date;

  @Prop({ index: true, trim: true })
  location?: string;

  @Prop({ index: true, enum: [25, 50] })
  poolLength?: number; // e.g. 25, 50

  @Prop({ unique: true, sparse: true, index: true })
  ficrRaceId?: string;

  @Prop({ required: true, index: true, default: 'ficr' })
  source: string; // e.g. 'ficr'

  @Prop()
  year?: number; // Denormalized for easier querying
}

export const RaceSchema = SchemaFactory.createForClass(Race);

// Compound indexes for common queries
RaceSchema.index({ source: 1, date: -1 });
RaceSchema.index({ year: 1, date: 1 });
RaceSchema.index({ name: 1, date: 1, source: 1 }, { unique: true, sparse: true });
