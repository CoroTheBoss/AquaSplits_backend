import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import {
  TimestampDocumentType,
  TimestampType,
} from '../../type/timestamp.type';

@Schema({ timestamps: true })
export class Athlete {
  @Prop({ required: true, index: true })
  firstName: string;

  @Prop({ required: true, index: true })
  lastName: string;

  @Prop({ required: true, index: true })
  code: string;

  @Prop({ index: true })
  birthYear?: number;

  @Prop({ index: true, enum: ['M', 'F'], uppercase: true })
  gender?: string;

  @Prop({ index: true, uppercase: true })
  nationality?: string;

  @Prop({ index: true })
  team: string;
}

export const AthleteSchema = SchemaFactory.createForClass(Athlete);

export type AthleteDocument = TimestampDocumentType<Athlete>;
export type AthleteWithId = TimestampType<Athlete>;

// Compound indexes for common queries
AthleteSchema.index({ firstName: 1, lastName: 1 });
AthleteSchema.index({ gender: 1, nationality: 1 });
