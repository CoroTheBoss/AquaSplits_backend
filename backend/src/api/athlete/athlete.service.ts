import { Injectable, NotFoundException } from '@nestjs/common';
import { AthleteRepository } from '../../database/repository/athlete.repository';
import { AthleteDto, AthleteSearchDto } from '../dto/athlete.dto';

@Injectable()
export class AthleteService {
  constructor(private readonly athleteRepository: AthleteRepository) {}

  async findAll(searchDto: AthleteSearchDto): Promise<AthleteDto[]> {
    const { search, limit = 50 } = searchDto;
    if (search) {
      return this.athleteRepository.search(search, limit);
    }
    return this.athleteRepository.findWithFilter({}, limit);
  }

  async findOne(id: string): Promise<AthleteDto> {
    const athlete = await this.athleteRepository.findById(id);
    if (!athlete) {
      throw new NotFoundException(`Athlete with ID ${id} not found`);
    }
    return athlete;
  }

  async findByFicrId(ficrId: string): Promise<AthleteDto | null> {
    return this.athleteRepository.findByFicrId(ficrId);
  }
}
