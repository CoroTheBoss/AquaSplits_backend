import { Injectable, NotFoundException } from '@nestjs/common';
import { RelayRepository } from '../../database/repository/relay.repository';
import { RelayWithId } from '../../database/schema/relay.schema';
import { transformRelay } from '../utils/transform.util';

@Injectable()
export class RelayService {
  constructor(private readonly relayRepository: RelayRepository) {}

  async findOne(id: string): Promise<any> {
    const relay = await this.relayRepository.findById(id);
    if (!relay) {
      throw new NotFoundException(`Relay with ID ${id} not found`);
    }
    return transformRelay(relay);
  }
}
