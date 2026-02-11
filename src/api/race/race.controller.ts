import { Controller, Get, Param } from '@nestjs/common';
import { RaceService } from './race.service';

@Controller('races')
export class RaceController {
  constructor(private readonly raceService: RaceService) {}

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.raceService.findOne(id);
  }

  @Get(':id/results')
  async findResults(@Param('id') id: string) {
    return this.raceService.findResults(id);
  }

  @Get(':id/relays')
  async findRelays(@Param('id') id: string) {
    return this.raceService.findRelays(id);
  }
}
