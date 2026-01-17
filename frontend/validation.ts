import { Stroke, PoolLength, Distance } from './types';

// Valid distance options for each stroke
const VALID_DISTANCES: Record<Stroke, Distance[]> = {
  freestyle: [50, 100, 200, 400, 800, 1500],
  backstroke: [50, 100, 200],
  breaststroke: [50, 100, 200],
  butterfly: [50, 100, 200],
  'individual medley': [100, 200, 400], // 100 IM is only valid in 25m pools
};

// Special rules: 100 IM is only valid in 25m pools (not 50m)
// Also, 800 and 1500 are only freestyle

export function getValidDistances(stroke: Stroke, poolLength: PoolLength): Distance[] {
  let distances = VALID_DISTANCES[stroke];
  
  // 100 IM is only valid in 25m pools, not in 50m pools
  if (stroke === 'individual medley' && poolLength === 50) {
    distances = distances.filter(d => d !== 100);
  }
  
  // 800 and 1500 are only for freestyle (already in the array)
  if (stroke !== 'freestyle') {
    distances = distances.filter(d => d !== 800 && d !== 1500);
  }
  
  return distances;
}

export function isValidCombination(
  stroke: Stroke,
  poolLength: PoolLength,
  distance: Distance
): boolean {
  const validDistances = getValidDistances(stroke, poolLength);
  return validDistances.includes(distance);
}

export function validateTime(time: string): boolean {
  // Accept formats: MM:SS.mm, SS.mm, or just numbers
  // Examples: "1:23.45", "23.45", "123.45"
  const timeRegex = /^(\d{1,2}:)?\d{1,2}\.\d{2}$|^\d+\.\d{2}$|^\d+:\d{2}\.\d{2}$/;
  return timeRegex.test(time) || /^\d+$/.test(time);
}

export function formatTime(time: string): string {
  // Normalize time format to M:SS.mm or MM:SS.mm
  if (!time) return '';
  
  // Remove any non-digit characters except : and .
  const cleaned = time.replace(/[^\d:.]/g, '');
  
  // If it's just numbers, try to parse it
  if (/^\d+$/.test(cleaned)) {
    const num = parseInt(cleaned, 10);
    if (num < 60) {
      return `0:${num.toString().padStart(2, '0')}.00`;
    }
    const minutes = Math.floor(num / 60);
    const seconds = num % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}.00`;
  }
  
  // If it has a colon, format it properly
  if (cleaned.includes(':')) {
    const parts = cleaned.split(':');
    if (parts.length === 2) {
      let [mins, secs] = parts;
      mins = mins || '0';
      // If secs doesn't have decimals, add .00
      if (!secs.includes('.')) {
        secs = secs.padStart(2, '0') + '.00';
      } else {
        const [sec, cent] = secs.split('.');
        secs = sec.padStart(2, '0') + '.' + (cent || '00').padEnd(2, '0').substring(0, 2);
      }
      return `${parseInt(mins, 10)}:${secs}`;
    }
  }
  
  // If it's just seconds with decimals
  if (cleaned.includes('.')) {
    const parts = cleaned.split('.');
    if (parts.length === 2) {
      const [secs, cents] = parts;
      const seconds = parseInt(secs || '0', 10);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}.${(cents || '00').padEnd(2, '0').substring(0, 2)}`;
    }
  }
  
  return cleaned;
}

