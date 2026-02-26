import { Module } from '@nestjs/common';
import { FicrClient } from './ficr.client';
import { FicrParser } from './ficr.parser';
import { FicrPdfParser } from './ficr.pdf.parser';
import { FicrService } from './ficr.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [FicrClient, FicrParser, FicrPdfParser, FicrService],
  exports: [FicrService],
})
export class FicrModule {}
