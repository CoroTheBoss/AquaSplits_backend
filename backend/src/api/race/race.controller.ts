import { Controller, Get, Param, Query } from '@nestjs/common';
import { RaceService } from './race.service';
import { RaceSearchDto } from '../dto/race.dto';

@Controller('races')
export class RaceController {
  constructor(private readonly raceService: RaceService) {}

  @Get()
  async findAll(@Query() query: RaceSearchDto) {
    return this.raceService.findAll(query);
  }

  @Get('stats')
  async getStats() {
    return this.raceService.getStats();
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
