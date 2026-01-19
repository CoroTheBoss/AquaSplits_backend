import { Injectable, NotFoundException } from '@nestjs/common';
import { ResultRepository } from '../../database/repository/result.repository';
import { Stroke } from '../../type/stroke.enum';
import { ResultPopulatedWithId, ResultSearchQuery } from './result.types';
import { Distance } from '../../type/distance.enum';

@Injectable()
export class ResultService {
  constructor(private readonly resultRepository: ResultRepository) {}

  async findAll(searchDto: ResultSearchQuery): Promise<ResultPopulatedWithId[]> {
    const { athleteId, raceId, distance, stroke } = searchDto;
    const limit = Number(searchDto.limit ?? 100) || 100;

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

    return this.resultRepository.findWithFilter({}, limit);
  }

  async findOne(id: string): Promise<ResultPopulatedWithId> {
    const result = await this.resultRepository.findById(id);
    if (!result) {
      throw new NotFoundException(`Result with ID ${id} not found`);
    }
    return result;
  }

  async findBestTimes(
    distance: Distance,
    stroke: Stroke,
    limit = 10,
    gender?: string,
  ): Promise<ResultPopulatedWithId[]> {
    return this.resultRepository.findBestTimes(distance, stroke, limit, gender);
  }
}
