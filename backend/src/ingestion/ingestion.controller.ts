import { Controller, Get, Param } from '@nestjs/common';
import { IngestionService } from './ingestion.service';
import { FicrRaceDto } from './ficr/dto/ficr-race.dto';
import { FicrAthleteBaseDto } from './ficr/dto/ficr-athlete-base.dto';
import { FicrAthleteSplitsDto } from './ficr/dto/ficr-athlete-splits.dto';

@Controller('ingestion')
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Get('schedule/:year')
  async getSchedule(@Param('year') year: string): Promise<FicrRaceDto[]> {
    return this.ingestionService.getSchedule(+year);
  }

  @Get('athletes/:race/:teamCode/:year')
  getAthletesList(
    @Param('raceId') raceId: string,
    @Param('teamCode') teamCode: string,
    @Param('year') year: string,
  ): Promise<FicrAthleteBaseDto[]> {
    return this.ingestionService.getAthletesList(+year, +teamCode, +raceId);
  }

  @Get('athlete/:race/:teamCode/:year/:athleteNumber')
  getAthleteRaceTimes(
    @Param('raceId') raceId: string,
    @Param('teamCode') teamCode: string,
    @Param('year') year: string,
    @Param('athleteNumber') athleteNumber: string,
  ): Promise<FicrAthleteSplitsDto> {
    return this.ingestionService.getAthleteRaceTimes(
      +year,
      +teamCode,
      +raceId,
      +athleteNumber,
    );
  }
}
