import { Module } from '@nestjs/common';
import { IngestionService } from './ingestion.service';
import { IngestionController } from './ingestion.controller';
import { FicrModule } from '../sources/ficr/ficr.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [FicrModule, DatabaseModule],
  providers: [IngestionService],
  controllers: [IngestionController],
})
export class IngestionModule {}
