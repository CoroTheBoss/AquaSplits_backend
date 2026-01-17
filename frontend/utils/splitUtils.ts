/**
 * Calculate internal splits from cumulative splits
 * Example: [15, 30, 45, 60] -> [15, 15, 15, 15]
 */
export function calculateInternalSplits(cumulativeSplits: string[]): string[] {
  if (cumulativeSplits.length === 0) return [];

  const internalSplits: string[] = [];
  let previousSeconds = 0;

  for (const cumulative of cumulativeSplits) {
    const currentSeconds = timeToSeconds(cumulative);
    const internalSeconds = currentSeconds - previousSeconds;
    internalSplits.push(secondsToTime(internalSeconds));
    previousSeconds = currentSeconds;
  }

  return internalSplits;
}

/**
 * Convert time string to seconds
 */
function timeToSeconds(timeStr: string): number {
  const parts = timeStr.split(':');
  if (parts.length === 2) {
    const [mins, secs] = parts;
    const [sec, cent] = secs.split('.');
    return parseInt(mins, 10) * 60 + parseInt(sec, 10) + parseInt(cent || '0', 10) / 100;
  }
  // If no colon, assume it's just seconds
  return parseFloat(timeStr) || 0;
}

/**
 * Convert seconds to time string (M:SS.mm)
 */
function secondsToTime(seconds: number): string {
  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  const centiseconds = Math.round((seconds - totalSeconds) * 100);

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
}

