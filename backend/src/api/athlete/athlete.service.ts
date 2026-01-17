import { Injectable, NotFoundException } from '@nestjs/common';
import { AthleteRepository } from '../../database/repository/athlete.repository';
import { AthleteDto, AthleteSearchDto } from '../dto/athlete.dto';

@Injectable()
export class AthleteService {
  constructor(private readonly athleteRepository: AthleteRepository) {}

  async findAll(searchDto: AthleteSearchDto): Promise<AthleteDto[]> {
    const { search, gender, nationality, limit = 50 } = searchDto;

    if (search) {
      return this.athleteRepository.search(search, limit);
    }

    const filter: any = {};
    if (gender) filter.gender = gender.toUpperCase();
    if (nationality) filter.nationality = nationality.toUpperCase();

    return this.athleteRepository.findWithFilter(filter, limit);
  }

  async findOne(id: string): Promise<AthleteDto> {
    const athlete = await this.athleteRepository.findById(id);
    if (!athlete) {
      throw new NotFoundException(`Athlete with ID ${id} not found`);
    }
    return athlete as any;
  }

  async findByFicrId(ficrId: string): Promise<AthleteDto | null> {
    return this.athleteRepository.findByFicrId(ficrId) as any;
  }

  async getStats() {
    const total = await this.athleteRepository.count();
    return { total };
  }
}
