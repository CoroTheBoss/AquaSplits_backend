import { Injectable, Logger } from '@nestjs/common';
import { FicrService } from '../sources/ficr/ficr.service';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);
  constructor(private readonly ficrService: FicrService) {}

  async ingestFicr(year: number) {
    await this.ficrService.ingestFicrByYear(year);
  }

  async ingestAllFicr() {
    for (let year = 2019; year <= 2022; year++) {
      await this.ingestFicr(year);
    }
  }
}
