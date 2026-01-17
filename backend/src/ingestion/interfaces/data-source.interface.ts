import { Athlete } from '../../database/schema/athlete.schema';
import { Race } from '../../database/schema/race.schema';
import { Result } from '../../database/schema/result.schema';

export interface IDataSource {
  /**
   * Get the name/identifier of this data source
   */
  getName(): string;

  /**
   * Fetch races/schedule for a given year
   */
  fetchRaces(year: number): Promise<Partial<Race>[]>;

  /**
   * Fetch athletes for a given race
   */
  fetchAthletes(
    year: number,
    raceId: string | number,
    additionalParams?: Record<string, any>,
  ): Promise<Partial<Athlete>[]>;

  /**
   * Fetch results/splits for a specific athlete in a race
   */
  fetchResults(
    year: number,
    raceId: string | number,
    athleteId: string | number,
    additionalParams?: Record<string, any>,
  ): Promise<Partial<Result>[]>;
}
