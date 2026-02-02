import { Module } from '@nestjs/common';
import { FicrClient } from './ficr.client';
import { FicrParser } from './ficr.parser';
import { FicrService } from './ficr.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [FicrClient, FicrParser, FicrService],
  exports: [FicrService],
})
export class FicrModule {}
