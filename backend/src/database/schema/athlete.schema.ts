import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { TimestampDocumentType, TimestampType } from './mongoose-types';

@Schema({ timestamps: true })
export class Athlete {
  @Prop({ required: true, index: true, trim: true })
  firstName: string;

  @Prop({ required: true, index: true, trim: true })
  lastName: string;

  @Prop({ index: true })
  birthDate?: Date;

  @Prop({ index: true, enum: ['M', 'F'], uppercase: true })
  gender?: string;

  @Prop({ unique: true, sparse: true, index: true })
  ficrId?: string; // ID from FICR if available

  @Prop({ index: true, uppercase: true, trim: true })
  nationality?: string;
}

export const AthleteSchema = SchemaFactory.createForClass(Athlete);

export type AthleteDocument = TimestampDocumentType<Athlete>;
export type AthleteWithId = TimestampType<Athlete>;

// Compound indexes for common queries
AthleteSchema.index({ firstName: 1, lastName: 1 });
AthleteSchema.index({ gender: 1, nationality: 1 });
