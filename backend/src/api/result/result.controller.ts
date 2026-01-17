import { Controller, Get, Param, Query } from '@nestjs/common';
import { ResultService } from './result.service';
import { ResultSearchDto } from '../dto/result.dto';

@Controller('results')
export class ResultController {
  constructor(private readonly resultService: ResultService) {}

  @Get()
  async findAll(@Query() query: ResultSearchDto) {
    return this.resultService.findAll(query);
  }

  @Get('stats')
  async getStats() {
    return this.resultService.getStats();
  }

  @Get('best-times/:event')
  async findBestTimes(
    @Param('event') event: string,
    @Query('limit') limit?: string,
    @Query('gender') gender?: string,
  ) {
    return this.resultService.findBestTimes(
      event,
      limit ? parseInt(limit, 10) : 10,
      gender,
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.resultService.findOne(id);
  }
}
