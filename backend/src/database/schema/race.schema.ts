import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import {
  TimestampDocumentType,
  TimestampType,
} from '../../type/timestamp.type';
import { RaceEvent, RaceEventSchema } from './race-event.schema';

@Schema({ timestamps: true })
export class Race {
  @Prop({ type: RaceEventSchema, required: true })
  event: RaceEvent;
}

export const RaceSchema = SchemaFactory.createForClass(Race);

export type RaceDocument = TimestampDocumentType<Race>;
export type RaceWithId = TimestampType<Race>;
