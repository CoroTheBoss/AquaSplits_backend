import { Controller, Post, Param, BadRequestException } from '@nestjs/common';
import { IngestionService } from './ingestion.service';

@Controller('ingestion')
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  // ======================= FICR ======================= //

  @Post('ficr/:year')
  async ingestFicr(@Param('year') year: string) {
    return await this.ingestionService.ingestFicr(+year);
  }

  @Post('ficr/:year/:teamCode/:competitionId')
  async ingestFicrCompetition(
    @Param('year') year: string,
    @Param('teamCode') teamCode: string,
    @Param('competitionId') competitionId: string,
  ) {
    try {
      return await this.ingestionService.ingestFicrCompetition(
        +year,
        +teamCode,
        +competitionId,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('not found in FICR')) {
        throw new BadRequestException(errorMessage);
      }
      throw error;
    }
  }

  @Post('ficr')
  async ingestAllFicr() {
    return await this.ingestionService.ingestAllFicr();
  }

  @Post('ficr/test/:year/:teamCode/:competitionId')
  async testFicrPdfParser(
    @Param('year') year: string,
    @Param('teamCode') teamCode: string,
    @Param('competitionId') competitionId: string,
  ) {
    return await this.ingestionService.testFicrPdfParser(
      +year,
      +teamCode,
      +competitionId,
    );
  }

  @Post('feature')
  feature() {
    console.log('feature_v3');
  }
}
