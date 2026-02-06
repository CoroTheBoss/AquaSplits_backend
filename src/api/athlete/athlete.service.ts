import { Injectable, NotFoundException } from '@nestjs/common';
import { AthleteRepository } from '../../database/repository/athlete.repository';
import { AthleteWithId } from '../../database/schema/athlete.schema';
import { AthleteSearchQuery } from './athlete.types';

@Injectable()
export class AthleteService {
  constructor(private readonly athleteRepository: AthleteRepository) {}

  async findAll(searchDto: AthleteSearchQuery): Promise<AthleteWithId[]> {
    const { search } = searchDto;
    const limit = Number(searchDto.limit ?? 50) || 50;
    if (search) {
      return this.athleteRepository.search(search, limit);
    }
    return this.athleteRepository.findWithFilter({}, limit);
  }

  async findOne(id: string): Promise<AthleteWithId> {
    const athlete = await this.athleteRepository.findById(id);
    if (!athlete) {
      throw new NotFoundException(`Athlete with ID ${id} not found`);
    }
    return athlete;
  }

  async findByFicrId(ficrId: string): Promise<AthleteWithId | null> {
    return this.athleteRepository.findByFicrId(ficrId);
  }
}
