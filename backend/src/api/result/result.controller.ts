import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ResultService } from './result.service';
import { ResultSearchDto } from '../dto/result.dto';
import { Distance, Stroke } from '../../database/schema/event.enum';

@Controller('results')
export class ResultController {
  constructor(private readonly resultService: ResultService) {}

  @Get()
  async findAll(@Query() query: ResultSearchDto) {
    return this.resultService.findAll(query);
  }

  @Get('best-times/:distance/:stroke')
  async findBestTimes(
    @Param('distance', ParseIntPipe) distance: Distance,
    @Param('stroke') stroke: Stroke,
    @Query('limit') limit?: string,
    @Query('gender') gender?: string,
  ) {
    return this.resultService.findBestTimes(
      distance,
      stroke,
      limit ? parseInt(limit, 10) : 10,
      gender,
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.resultService.findOne(id);
  }
}
