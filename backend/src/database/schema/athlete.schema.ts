import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Athlete extends Document {
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

// Compound indexes for common queries
AthleteSchema.index({ firstName: 1, lastName: 1 });
AthleteSchema.index({ gender: 1, nationality: 1 });
