import { FicrTempoDto } from './fict-tempo.dto';

type FicrAthleteBaseInfoDto = {
  Nome: string;
  Cognome: string;
};

export type FicrAthleteDto = FicrAthleteBaseInfoDto & {
  Codice: string;
  Naz: string;
  Sex: string;
  Anno: number;
  Soc: string;
};

export type FicrAthleteEntryListDto = FicrAthleteBaseInfoDto & {
  Categoria: string;
  Numero: number;
};

export type FicrAthleteSplitsDto = {
  atleta: FicrAthleteDto;
  tempi: FicrTempoDto[];
};
