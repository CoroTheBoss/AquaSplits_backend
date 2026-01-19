import { Controller, Post, Param, Body } from '@nestjs/common';
import { IngestionService } from './ingestion.service';

@Controller('ingestion')
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post('races/:year')
  async ingestRaces(@Param('year') year: string) {
    return this.ingestionService.ingestRaces(+year);
  }

  @Post('athletes/:year/:raceId')
  async ingestAthletes(
    @Param('year') year: string,
    @Param('raceId') raceId: string,
    @Body() body: { teamCode: number },
  ) {
    return this.ingestionService.ingestAthletes(+year, raceId, body.teamCode);
  }

  @Post('results/:year/:raceId/:athleteId')
  async ingestResults(
    @Param('year') year: string,
    @Param('raceId') raceId: string,
    @Param('athleteId') athleteId: string,
    @Body() body: { teamCode: number },
  ) {
    return this.ingestionService.ingestResults(
      +year,
      raceId,
      athleteId,
      body.teamCode,
    );
  }

  @Post('complete-race/:year/:raceId')
  async ingestCompleteRace(
    @Param('year') year: string,
    @Param('raceId') raceId: string,
    @Body() body: { teamCode: number },
  ) {
    return this.ingestionService.ingestCompleteRace(
      +year,
      raceId,
      body.teamCode,
    );
  }
}
