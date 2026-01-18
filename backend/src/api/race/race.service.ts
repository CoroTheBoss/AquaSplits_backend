import { Injectable, NotFoundException } from '@nestjs/common';
import { RaceRepository } from '../../database/repository/race.repository';
import { RaceWithId } from '../../database/schema/race.schema';
import { RaceSearchQuery } from './race.types';

@Injectable()
export class RaceService {
  constructor(private readonly raceRepository: RaceRepository) {}

  async findAll(searchDto: RaceSearchQuery): Promise<RaceWithId[]> {
    const { search } = searchDto;
    const year = searchDto.year != null ? Number(searchDto.year) : undefined;
    const limit = Number(searchDto.limit ?? 50) || 50;

    if (search) {
      return this.raceRepository.search(search, limit);
    }

    if (typeof year === 'number' && !Number.isNaN(year)) {
      return this.raceRepository.findByYear(year);
    }

    return this.raceRepository.findWithFilter({}, limit);
  }

  async findOne(id: string): Promise<RaceWithId> {
    const race = await this.raceRepository.findById(id);
    if (!race) {
      throw new NotFoundException(`Race with ID ${id} not found`);
    }
    return race;
  }

  async findByFicrId(ficrRaceId: string): Promise<RaceWithId | null> {
    return this.raceRepository.findByFicrId(ficrRaceId);
  }
}
