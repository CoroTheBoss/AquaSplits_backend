import { Injectable, NotFoundException } from '@nestjs/common';
import { ResultRepository } from '../../database/repository/result.repository';
import { ResultDto, ResultSearchDto } from '../dto/result.dto';
import { Distance, Stroke } from '../../database/schema/event.enum';

@Injectable()
export class ResultService {
  constructor(private readonly resultRepository: ResultRepository) {}

  async findAll(searchDto: ResultSearchDto): Promise<ResultDto[]> {
    const { athleteId, raceId, distance, stroke, limit = 100 } = searchDto;

    if (athleteId && raceId) {
      return this.resultRepository.findByAthleteAndRace(athleteId, raceId);
    }

    if (athleteId) {
      return this.resultRepository.findByAthlete(athleteId);
    }

    if (raceId) {
      return this.resultRepository.findByRace(raceId);
    }

    if (distance && stroke) {
      return this.resultRepository.findByEvent(distance, stroke, limit);
    }

    return this.resultRepository.findWithFilter({}, limit) as any;
  }

  async findOne(id: string): Promise<ResultDto> {
    const result = await this.resultRepository.findById(id);
    if (!result) {
      throw new NotFoundException(`Result with ID ${id} not found`);
    }
    return result as any;
  }

  async findBestTimes(distance: Distance, stroke: Stroke, limit = 10, gender?: string) {
    return this.resultRepository.findBestTimes(distance, stroke, limit, gender);
  }
}
