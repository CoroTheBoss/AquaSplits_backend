import { Time } from './time.type';

export type Split = {
  distance: number; // (50, 100, ...)
  current: Time; // cumulative time at this split
  partial: Time; // time between this split and the previous one (split N - split N-1)
  leg?: number; // If the split refers to a relay, then this is the leg number (1, 2, 3 or 4)
};
