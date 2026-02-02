import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import {
  TimestampDocumentType,
  TimestampType,
} from '../../type/timestamp.type';
import { Source } from '../../type/source.enum';
import { PoolLength } from '../../type/pool-length.enum';
import mongoose, { Types } from 'mongoose';
import { SourceStatus } from '../../type/source-status.type';

@Schema({ timestamps: true })
export class Competition {
  @Prop({ required: true, index: true, trim: true })
  name: string;

  @Prop({ required: true, index: true })
  date: Date;

  @Prop({ index: true, trim: true })
  location?: string;

  @Prop({ index: true, enum: [25, 50] })
  poolLength?: PoolLength; // e.g. 25, 50

  @Prop({ unique: true, sparse: true, index: true })
  ficrId?: number;

  @Prop()
  ficrTeam?: number;

  @Prop()
  nLanes?: number;

  @Prop()
  source: Source; // e.g. 'ficr'

  @Prop()
  sourceStatuses?: SourceStatus[];

  @Prop({ type: [mongoose.Types.ObjectId], ref: 'Race', default: [] })
  races?: Types.ObjectId[];
}

export const CompetitionSchema = SchemaFactory.createForClass(Competition);

export type CompetitionDocument = TimestampDocumentType<Competition>;
export type CompetitionWithId = TimestampType<Competition>;

// Compound indexes for common queries
CompetitionSchema.index({ source: 1, date: -1 });
CompetitionSchema.index({ date: 1 });
CompetitionSchema.index(
  { name: 1, date: 1, source: 1 },
  { unique: true, sparse: true },
);
