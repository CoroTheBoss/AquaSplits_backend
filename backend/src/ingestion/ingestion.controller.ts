import { Controller, Post, Param, Body } from '@nestjs/common';
import { IngestionService } from './ingestion.service';

@Controller('ingestion')
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  // ======================= FICR ======================= //

  @Post('ficr/:year')
  async ingestFicr(@Param('year') year: string) {
    return await this.ingestionService.ingestFicr(+year);
  }

  @Post('ficr')
  async ingestAllFicr() {
    return await this.ingestionService.ingestAllFicr();
  }
}
