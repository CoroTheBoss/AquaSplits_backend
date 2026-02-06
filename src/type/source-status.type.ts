import { Source } from './source.enum';
import { IngestionStatus } from './ingestion-status.enum';

export type SourceStatus = {
  source: Source;
  lastIngestedAt?: Date;
  lastStatus?: IngestionStatus;
};
