import { Controller, Get, Param, Query } from '@nestjs/common';
import { RaceService } from './race.service';
import type { RaceSearchQuery } from './race.types';

@Controller('races')
export class RaceController {
  constructor(private readonly raceService: RaceService) {}

  @Get()
  async findAll(@Query() query: RaceSearchQuery) {
    return this.raceService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.raceService.findOne(id);
  }

  @Get('ficr/:ficrRaceId')
  async findByFicrId(@Param('ficrRaceId') ficrRaceId: string) {
    return this.raceService.findByFicrId(ficrRaceId);
  }
}
