import { Injectable, NotFoundException } from '@nestjs/common';
import { RaceRepository } from '../../database/repository/race.repository';
import { RaceDto, RaceSearchDto } from '../dto/race.dto';

@Injectable()
export class RaceService {
  constructor(private readonly raceRepository: RaceRepository) {}

  async findAll(searchDto: RaceSearchDto): Promise<RaceDto[]> {
    const { search, year, limit = 50 } = searchDto;

    if (search) {
      return this.raceRepository.search(search, limit);
    }

    if (year) {
      return this.raceRepository.findByYear(year);
    }

    return this.raceRepository.findWithFilter({}, limit);
  }

  async findOne(id: string): Promise<RaceDto> {
    const race = await this.raceRepository.findById(id);
    if (!race) {
      throw new NotFoundException(`Race with ID ${id} not found`);
    }
    return race as any;
  }

  async findByFicrId(ficrRaceId: string): Promise<RaceDto | null> {
    return this.raceRepository.findByFicrId(ficrRaceId) as any;
  }
}
