import { Module } from '@nestjs/common';
import { FicrClient } from './ficr.client';
import { FicrMapper } from './ficr.mapper';
import { FicrDataSourceService } from './ficr-data-source.service';

@Module({
  providers: [FicrClient, FicrMapper, FicrDataSourceService],
  exports: [FicrClient, FicrMapper, FicrDataSourceService],
})
export class FicrModule {}
