import { Injectable, NotFoundException } from '@nestjs/common';
import { CompetitionRepository } from '../../database/repository/competition.repository';
import { CompetitionWithId } from '../../database/schema/competition.schema';
import { CompetitionSearchQuery } from './competition.types';
import { RaceRepository } from '../../database/repository/race.repository';
import { Types } from 'mongoose';
import {
  transformCompetition,
  transformRace,
} from '../utils/transform.util';

@Injectable()
export class CompetitionService {
  constructor(
    private readonly competitionRepository: CompetitionRepository,
    private readonly raceRepository: RaceRepository,
  ) {}

  async findAll(
    searchDto: CompetitionSearchQuery,
  ): Promise<any[]> {
    const { search } = searchDto;
    const year = searchDto.year != null ? Number(searchDto.year) : undefined;
    const limit = Number(searchDto.limit ?? 50) || 50;

    let competitions: CompetitionWithId[];
    if (search) {
      competitions = await this.competitionRepository.search(search, limit);
    } else if (typeof year === 'number' && !Number.isNaN(year)) {
      competitions = await this.competitionRepository.findByYear(year);
    } else {
      competitions = await this.competitionRepository.findWithFilter({}, limit);
    }

    return competitions.map(transformCompetition);
  }

  async findOne(id: string): Promise<any> {
    const competition = await this.competitionRepository.findById(id);
    if (!competition) {
      throw new NotFoundException(`Competition with ID ${id} not found`);
    }
    return transformCompetition(competition);
  }

  async findByFicrId(ficrRaceId: string): Promise<CompetitionWithId | null> {
    return this.competitionRepository.findByFicrId(ficrRaceId);
  }

  async findRaces(competitionId: string) {
    const competition = await this.competitionRepository.findById(competitionId);
    if (!competition) {
      throw new NotFoundException(
        `Competition with ID ${competitionId} not found`,
      );
    }

    if (!competition.races || competition.races.length === 0) {
      return [];
    }

    const races = await Promise.all(
      competition.races.map((raceId: Types.ObjectId | string) => {
        if (raceId instanceof Types.ObjectId) {
          return this.raceRepository.findById(raceId);
        }
        return this.raceRepository.findById(String(raceId));
      }),
    );

    return races
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .map(transformRace);
  }
}
