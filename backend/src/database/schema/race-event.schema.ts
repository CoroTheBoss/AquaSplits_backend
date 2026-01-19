import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  TimestampDocumentType,
  TimestampType,
} from '../../type/timestamp.type';
import { Stroke } from '../../type/stroke.enum';
import { Distance } from '../../type/distance.enum';

@Schema({ _id: false })
export class RaceEvent {
  @Prop({
    type: Number,
    enum: Distance,
    required: true,
  })
  distance: Distance;

  @Prop({
    type: String,
    enum: Stroke,
    required: true,
  })
  stroke: Stroke;
}

export const RaceEventSchema = SchemaFactory.createForClass(RaceEvent);

export type RaceEventDocument = TimestampDocumentType<RaceEvent>;
export type RaceEventWithId = TimestampType<RaceEvent>;
