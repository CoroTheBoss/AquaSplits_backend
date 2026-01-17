import { Controller, Post, Param, Body, Get } from '@nestjs/common';
import { IngestionService } from './ingestion.service';

@Controller('ingestion')
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Get('sources')
  async getAvailableSources() {
    return {
      sources: this.ingestionService.getAvailableSources(),
    };
  }

  @Post('races/:source/:year')
  async ingestRaces(
    @Param('source') source: string,
    @Param('year') year: string,
  ) {
    return this.ingestionService.ingestRaces(source, +year);
  }

  @Post('athletes/:source/:year/:raceId')
  async ingestAthletes(
    @Param('source') source: string,
    @Param('year') year: string,
    @Param('raceId') raceId: string,
    @Body() body: { teamCode?: number; [key: string]: any },
  ) {
    return this.ingestionService.ingestAthletes(
      source,
      +year,
      raceId,
      body,
    );
  }

  @Post('results/:source/:year/:raceId/:athleteId')
  async ingestResults(
    @Param('source') source: string,
    @Param('year') year: string,
    @Param('raceId') raceId: string,
    @Param('athleteId') athleteId: string,
    @Body() body: { teamCode?: number; [key: string]: any },
  ) {
    return this.ingestionService.ingestResults(
      source,
      +year,
      raceId,
      athleteId,
      body,
    );
  }

  @Post('complete-race/:source/:year/:raceId')
  async ingestCompleteRace(
    @Param('source') source: string,
    @Param('year') year: string,
    @Param('raceId') raceId: string,
    @Body() body: { teamCode: number },
  ) {
    if (!body.teamCode) {
      throw new Error('teamCode is required');
    }
    return this.ingestionService.ingestCompleteRace(
      source,
      +year,
      raceId,
      body.teamCode,
    );
  }

  // Legacy endpoints for backward compatibility
  @Post('ficr/schedule/:year')
  async ingestFicrSchedule(@Param('year') year: string) {
    return this.ingestionService.ingestRaces('ficr', +year);
  }

  @Post('ficr/athletes/:year/:teamCode/:raceId')
  async ingestFicrAthletes(
    @Param('year') year: string,
    @Param('teamCode') teamCode: string,
    @Param('raceId') raceId: string,
  ) {
    return this.ingestionService.ingestAthletes('ficr', +year, raceId, {
      teamCode: +teamCode,
    });
  }
}
