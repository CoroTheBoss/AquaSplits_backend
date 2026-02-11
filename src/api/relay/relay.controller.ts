import { Controller, Get, Param } from '@nestjs/common';
import { RelayService } from './relay.service';

@Controller('relays')
export class RelayController {
  constructor(private readonly relayService: RelayService) {}

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.relayService.findOne(id);
  }
}
