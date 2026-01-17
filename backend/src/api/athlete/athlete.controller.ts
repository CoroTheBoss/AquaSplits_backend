import { Controller, Get, Param, Query } from '@nestjs/common';
import { AthleteService } from './athlete.service';
import { AthleteSearchDto } from '../dto/athlete.dto';

@Controller('athletes')
export class AthleteController {
  constructor(private readonly athleteService: AthleteService) {}

  @Get()
  async findAll(@Query() query: AthleteSearchDto) {
    return this.athleteService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.athleteService.findOne(id);
  }

  @Get('ficr/:ficrId')
  async findByFicrId(@Param('ficrId') ficrId: string) {
    return this.athleteService.findByFicrId(ficrId);
  }
}
