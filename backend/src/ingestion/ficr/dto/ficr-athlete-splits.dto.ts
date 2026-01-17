import { FicrAthleteBaseDto } from './ficr-athlete-base.dto';
import { FicrTempoDto } from './fict-tempo.dto';

export type FicrAthleteSplitsDto = {
  atleta: FicrAthleteBaseDto;
  tempi: FicrTempoDto[];
};
