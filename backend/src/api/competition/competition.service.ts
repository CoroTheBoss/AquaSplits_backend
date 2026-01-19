import { Injectable, NotFoundException } from '@nestjs/common';
import { CompetitionRepository } from '../../database/repository/competition.repository';
import { CompetitionWithId } from '../../database/schema/competition.schema';
import { CompetitionSearchQuery } from './competition.types';

@Injectable()
export class CompetitionService {
  constructor(private readonly competitionRepository: CompetitionRepository) {}

  async findAll(searchDto: CompetitionSearchQuery): Promise<CompetitionWithId[]> {
    const { search } = searchDto;
    const year = searchDto.year != null ? Number(searchDto.year) : undefined;
    const limit = Number(searchDto.limit ?? 50) || 50;

    if (search) {
      return this.competitionRepository.search(search, limit);
    }

    if (typeof year === 'number' && !Number.isNaN(year)) {
      return this.competitionRepository.findByYear(year);
    }

    return this.competitionRepository.findWithFilter({}, limit);
  }

  async findOne(id: string): Promise<CompetitionWithId> {
    const competition = await this.competitionRepository.findById(id);
    if (!competition) {
      throw new NotFoundException(`Race with ID ${id} not found`);
    }
    return competition;
  }

  async findByFicrId(ficrRaceId: string): Promise<CompetitionWithId | null> {
    return this.competitionRepository.findByFicrId(ficrRaceId);
  }
}
