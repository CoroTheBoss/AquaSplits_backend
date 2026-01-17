import { IngestionService } from './ingestion.service';
import { Module } from '@nestjs/common';
import { FicrClient } from './ficr/ficr.client';
import { IngestionController } from './ingestion.controller';

@Module({
  providers: [IngestionService, FicrClient],
  controllers: [IngestionController],
  exports: [],
})
export class IngestionModule {}
