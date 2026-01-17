export enum Distance {
  D50 = 50,
  D100 = 100,
  D200 = 200,
  D400 = 400,
  D800 = 800,
  D1500 = 1500,
}

export enum Stroke {
  FREESTYLE = 'freestyle',
  BACKSTROKE = 'backstroke',
  BREASTSTROKE = 'breaststroke',
  BUTTERFLY = 'butterfly',
  INDIVIDUAL_MEDLEY = 'individual_medley',
}

export interface Event {
  distance: Distance;
  stroke: Stroke;
}
