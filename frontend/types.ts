export type Stroke = 'freestyle' | 'backstroke' | 'breaststroke' | 'butterfly' | 'individual medley';
export type PoolLength = 25 | 50;
export type Distance = 50 | 100 | 200 | 400 | 800 | 1500;

export type ThemeMode = 'light' | 'dark' | 'system';

export interface Race {
  id: string;
  stroke: Stroke;
  poolLength: PoolLength;
  distance: Distance;
  time: string; // Format: MM:SS.mm or SS.mm
  splits?: string[]; // Optional array of cumulative split times
  splitInterval?: 25 | 50; // Split interval used for this race
  date: string; // ISO date string
}

export interface RaceFormData {
  stroke: Stroke | '';
  poolLength: PoolLength | '';
  distance: Distance | '';
  time: string;
  splits: string[];
  splitInterval: 25 | 50;
  date: string;
}

