import { Injectable, NotFoundException } from '@nestjs/common';
import { AthleteRepository } from '../../database/repository/athlete.repository';
import { AthleteWithId } from '../../database/schema/athlete.schema';
import { AthleteSearchQuery } from './athlete.types';
import { ResultRepository } from '../../database/repository/result.repository';
import { CompetitionRepository } from '../../database/repository/competition.repository';
import { Types } from 'mongoose';
import {
  transformAthlete,
  transformCompetition,
  transformResult,
} from '../utils/transform.util';

@Injectable()
export class AthleteService {
  constructor(
    private readonly athleteRepository: AthleteRepository,
    private readonly resultRepository: ResultRepository,
    private readonly competitionRepository: CompetitionRepository,
  ) {}

  async findAll(searchDto: AthleteSearchQuery): Promise<any[]> {
    const { search } = searchDto;
    const limit = Number(searchDto.limit ?? 50) || 50;
    let athletes: AthleteWithId[];
    if (search) {
      athletes = await this.athleteRepository.search(search, limit);
    } else {
      athletes = await this.athleteRepository.findWithFilter({}, limit);
    }
    return athletes.map(transformAthlete);
  }

  async findOne(id: string): Promise<any> {
    // Try to find by _id first, then by code
    let athlete = await this.athleteRepository.findById(id);
    if (!athlete) {
      // Try finding by code
      const athletes = await this.athleteRepository.findWithFilter(
        { code: id },
        1,
      );
      athlete = athletes.length > 0 ? athletes[0] : null;
    }
    if (!athlete) {
      throw new NotFoundException(`Athlete with ID or code ${id} not found`);
    }
    return transformAthlete(athlete);
  }

  async findByFicrId(ficrId: string): Promise<AthleteWithId | null> {
    return this.athleteRepository.findByFicrId(ficrId);
  }

  async findCompetitions(athleteIdOrCode: string) {
    // First, find the athlete by id or code
    let athlete = await this.athleteRepository.findById(athleteIdOrCode);
    if (!athlete) {
      const athletes = await this.athleteRepository.findWithFilter(
        { code: athleteIdOrCode },
        1,
      );
      athlete = athletes.length > 0 ? athletes[0] : null;
    }
    if (!athlete) {
      throw new NotFoundException(
        `Athlete with ID or code ${athleteIdOrCode} not found`,
      );
    }

    const athleteId = athlete._id.toString();
    const results = await this.resultRepository.findByAthlete(athleteId);
    const raceIds = results
      .map((r) => r.race)
      .filter((r): r is Types.ObjectId => r instanceof Types.ObjectId);

    // Find competitions that have these races
    const competitions = await this.competitionRepository.findWithFilter(
      {
        races: { $in: raceIds },
      },
      100,
    );

    return competitions.map(transformCompetition);
  }

  async findResults(athleteIdOrCode: string) {
    // First, find the athlete by id or code
    let athlete = await this.athleteRepository.findById(athleteIdOrCode);
    if (!athlete) {
      const athletes = await this.athleteRepository.findWithFilter(
        { code: athleteIdOrCode },
        1,
      );
      athlete = athletes.length > 0 ? athletes[0] : null;
    }
    if (!athlete) {
      throw new NotFoundException(
        `Athlete with ID or code ${athleteIdOrCode} not found`,
      );
    }

    const athleteId = athlete._id.toString();
    const results = await this.resultRepository.findByAthlete(athleteId);
    return results.map(transformResult);
  }
}
