export class TimeParser {
  /**
   * Parse a swimming race time string into milliseconds.
   *
   * Supported formats:
   * - "2'43.8" (minutes ' seconds . tenths)
   * - "2:43.80" (minutes: seconds . hundredths)
   * - "43.8" (seconds . tenths)
   * - "43.80" (seconds . hundredths)
   * - "43" (seconds)
   *
   * Invalid or empty inputs return 0.
   */
  static toMillis(timeStr?: string | null): number {
    if (!timeStr) return 0;

    const clean = timeStr.trim();
    if (clean === '') return 0;

    // Normalize minutes separator: FICR uses '
    const normalized = clean.replace(/'/g, ':');

    if (normalized.includes(':')) {
      return this.parseWithMinutes(normalized);
    }

    return this.parseSecondsOnly(normalized);
  }

  private static parseWithMinutes(value: string): number {
    const [minPart, secPart] = value.split(':');
    if (!secPart) return 0;

    const minutes = this.safeInt(minPart);
    const { seconds, millis } = this.parseSecondsAndMillis(secPart);

    return minutes * 60_000 + seconds * 1_000 + millis;
  }

  private static parseSecondsOnly(value: string): number {
    const { seconds, millis } = this.parseSecondsAndMillis(value);
    return seconds * 1_000 + millis;
  }

  private static parseSecondsAndMillis(value: string): {
    seconds: number;
    millis: number;
  } {
    const [secPart, fracPart] = value.split('.');
    const seconds = this.safeInt(secPart);

    let millis = 0;
    if (fracPart) {
      // tenths -> x100, hundredths -> x10, millis passthrough
      if (fracPart.length === 1) {
        millis = this.safeInt(fracPart) * 100;
      } else if (fracPart.length === 2) {
        millis = this.safeInt(fracPart) * 10;
      } else {
        millis = this.safeInt(fracPart.slice(0, 3));
      }
    }

    return { seconds, millis };
  }

  private static safeInt(value?: string): number {
    const n = parseInt(value ?? '', 10);
    return Number.isFinite(n) ? n : 0;
  }

  /**
   * Converts milliseconds into a display time string for swimming results.
   * Examples: 12345 → "12.34", 163000 → "2'43.00"
   * @param millis - Time in milliseconds.
   * @returns Formatted time string.
   */
  static toDisplayTime(millis: number): string {
    if (millis <= 0) return '0.0';

    const minutes = Math.floor(millis / 60000);
    const remainingMillis = millis - minutes * 60000;
    const seconds = Math.floor(remainingMillis / 1000);
    const millisPart = remainingMillis - seconds * 1000;

    if (minutes > 0) {
      // mm'ss.mmm
      return `${minutes}'${seconds.toString().padStart(2, '0')}.${millisPart
        .toString()
        .padStart(3, '0')}`;
    }

    // ss.mmm
    return `${seconds}.${millisPart.toString().padStart(3, '0')}`;
  }
}
