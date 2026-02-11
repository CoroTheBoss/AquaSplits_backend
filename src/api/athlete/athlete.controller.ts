import { Controller, Get, Param, Query } from '@nestjs/common';
import { AthleteService } from './athlete.service';
import type { AthleteSearchQuery } from './athlete.types';

@Controller('athletes')
export class AthleteController {
  constructor(private readonly athleteService: AthleteService) {}

  @Get()
  async findAll(@Query() query: AthleteSearchQuery) {
    return this.athleteService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.athleteService.findOne(id);
  }

  @Get(':id/competitions')
  async findCompetitions(@Param('id') id: string) {
    return this.athleteService.findCompetitions(id);
  }

  @Get(':id/results')
  async findResults(@Param('id') id: string) {
    return this.athleteService.findResults(id);
  }

  @Get('ficr/:ficrId')
  async findByFicrId(@Param('ficrId') ficrId: string) {
    return this.athleteService.findByFicrId(ficrId);
  }
}
