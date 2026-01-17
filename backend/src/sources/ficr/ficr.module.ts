import { Module } from '@nestjs/common';
import { FicrClient } from './ficr.client';
import { FicrParser } from './ficr.parser';
import { FicrService } from './ficr.service';

@Module({
  providers: [FicrClient, FicrParser, FicrService],
  exports: [FicrService],
})
export class FicrModule {}
