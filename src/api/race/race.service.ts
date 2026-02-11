import { Injectable, NotFoundException } from '@nestjs/common';
import { RaceRepository } from '../../database/repository/race.repository';
import { RaceWithId } from '../../database/schema/race.schema';
import { ResultRepository } from '../../database/repository/result.repository';
import { RelayRepository } from '../../database/repository/relay.repository';
import {
  transformRace,
  transformResult,
  transformRelay,
} from '../utils/transform.util';

@Injectable()
export class RaceService {
  constructor(
    private readonly raceRepository: RaceRepository,
    private readonly resultRepository: ResultRepository,
    private readonly relayRepository: RelayRepository,
  ) {}

  async findOne(id: string): Promise<any> {
    const race = await this.raceRepository.findById(id);
    if (!race) {
      throw new NotFoundException(`Race with ID ${id} not found`);
    }
    return transformRace(race);
  }

  async findResults(raceId: string) {
    const results = await this.resultRepository.findByRace(raceId);
    return results.map(transformResult);
  }

  async findRelays(raceId: string) {
    const relays = await this.relayRepository.findByRace(raceId);
    return relays.map(transformRelay);
  }
}
