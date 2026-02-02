import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import {
  TimestampDocumentType,
  TimestampType,
} from '../../type/timestamp.type';
import mongoose, { Types } from 'mongoose';

@Schema({ timestamps: true })
export class Relay {
  @Prop({
    type: Types.ObjectId,
    ref: 'Competition',
    required: true,
    index: true,
  })
  competition: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Race', required: true, index: true })
  race: Types.ObjectId; // Reference to relay race type (e.g., 4x50m Freestyle)

  @Prop({ required: true, trim: true, index: true })
  category: string; // FICR Categoria (e.g. age/gender group)

  @Prop({
    required: true,
    validate: {
      validator: (v: any[]) => v.length === 4,
      message: 'Relay must have exactly 4 legs',
    },
  })
  legs: RelayLeg[]; // Array of 4 athletes with their leg info

  @Prop({ required: true, index: true })
  lane: number; // Corsia (lane number)

  @Prop({ required: true, index: true })
  heat: number; // Batteria (heat number)

  @Prop()
  team?: string; // Squadra (team name)

  @Prop({ required: true })
  displayTime: string; // Final relay time (e.g., "1'29.5")

  @Prop({ required: true, index: true })
  millis: number; // Final relay time in milliseconds

  @Prop()
  rank?: number; // Final position (Pos)

  @Prop({ type: mongoose.Schema.Types.Mixed })
  splits?: Array<{
    distance: number; // Metri
    displayTime: string; // Tempo
    millis: number;
    leg?: number; // Which leg this split belongs to
  }>;
}

export type RelayLeg = {
  athlete: Types.ObjectId;
  leg: number;
  displayTime?: string;
  millis?: number;
};

export const RelaySchema = SchemaFactory.createForClass(Relay);

export type RelayDocument = TimestampDocumentType<Relay>;
export type RelayWithId = TimestampType<Relay>;

// Compound unique index: one relay per competition, race, lane, heat, and category
RelaySchema.index(
  { competition: 1, race: 1, lane: 1, heat: 1, category: 1 },
  { unique: true },
);
// Index for querying relays by competition
RelaySchema.index({ competition: 1, race: 1 });
RelaySchema.index({ competition: 1, millis: 1 });
RelaySchema.index({ race: 1, millis: 1 });
