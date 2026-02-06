import { Controller, Get, Param, Query } from '@nestjs/common';
import { CompetitionService } from './competition.service';
import type { CompetitionSearchQuery } from './competition.types';

@Controller('competitions')
export class CompetitionController {
  constructor(private readonly competitionService: CompetitionService) {}

  @Get()
  async findAll(@Query() query: CompetitionSearchQuery) {
    return this.competitionService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.competitionService.findOne(id);
  }

  @Get('ficr/:ficrRaceId')
  async findByFicrId(@Param('ficrRaceId') ficrRaceId: string) {
    return this.competitionService.findByFicrId(ficrRaceId);
  }
}
