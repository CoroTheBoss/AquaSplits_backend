import { TimeParser } from '../src/utils/time-parser';

describe('TimeParser', () => {
  describe('toMillis', () => {
    describe('with minutes format', () => {
      it("should parse format with apostrophe separator (2'43.8)", () => {
        expect(TimeParser.toMillis("2'43.8")).toBe(163800);
      });

      it('should parse format with colon separator (2:43.80)', () => {
        expect(TimeParser.toMillis('2:43.80')).toBe(163800);
      });

      it('should parse format with minutes and seconds only (2:43)', () => {
        expect(TimeParser.toMillis('2:43')).toBe(163000);
      });

      it('should parse format with minutes, seconds, and milliseconds (2:43.123)', () => {
        expect(TimeParser.toMillis('2:43.123')).toBe(163123);
      });

      it('should handle single digit minutes (1:30.5)', () => {
        expect(TimeParser.toMillis('1:30.5')).toBe(90500);
      });

      it('should handle double digit minutes (10:15.25)', () => {
        expect(TimeParser.toMillis('10:15.25')).toBe(615250);
      });
    });

    describe('with seconds only format', () => {
      it('should parse seconds with tenths (43.8)', () => {
        expect(TimeParser.toMillis('43.8')).toBe(43800);
      });

      it('should parse seconds with hundredths (43.80)', () => {
        expect(TimeParser.toMillis('43.80')).toBe(43800);
      });

      it('should parse seconds only (43)', () => {
        expect(TimeParser.toMillis('43')).toBe(43000);
      });

      it('should parse seconds with milliseconds (43.123)', () => {
        expect(TimeParser.toMillis('43.123')).toBe(43123);
      });

      it('should handle single digit seconds (5.5)', () => {
        expect(TimeParser.toMillis('5.5')).toBe(5500);
      });

      it('should handle double digit seconds (99.99)', () => {
        expect(TimeParser.toMillis('99.99')).toBe(99990);
      });
    });

    describe('edge cases', () => {
      it('should return 0 for null input', () => {
        expect(TimeParser.toMillis(null)).toBe(0);
      });

      it('should return 0 for undefined input', () => {
        expect(TimeParser.toMillis(undefined)).toBe(0);
      });

      it('should return 0 for empty string', () => {
        expect(TimeParser.toMillis('')).toBe(0);
      });

      it('should return 0 for whitespace only', () => {
        expect(TimeParser.toMillis('   ')).toBe(0);
      });

      it('should handle invalid format gracefully', () => {
        expect(TimeParser.toMillis('invalid')).toBe(0);
      });

      it('should handle format with only colon', () => {
        expect(TimeParser.toMillis(':')).toBe(0);
      });

      it('should handle format with colon but no seconds', () => {
        expect(TimeParser.toMillis('2:')).toBe(0);
      });

      it('should handle zero time (0:00)', () => {
        expect(TimeParser.toMillis('0:00')).toBe(0);
      });

      it('should handle zero seconds (0.0)', () => {
        expect(TimeParser.toMillis('0.0')).toBe(0);
      });
    });

    describe('real-world swimming times', () => {
      it('should parse 50m freestyle world record (20.91)', () => {
        expect(TimeParser.toMillis('20.91')).toBe(20910);
      });

      it('should parse 100m freestyle world record (46.86)', () => {
        expect(TimeParser.toMillis('46.86')).toBe(46860);
      });

      it("should parse 200m freestyle world record (1'42.00)", () => {
        expect(TimeParser.toMillis("1'42.00")).toBe(102000);
      });

      it("should parse 400m freestyle world record (3'40.07)", () => {
        expect(TimeParser.toMillis("3'40.07")).toBe(220070);
      });

      it("should parse 1500m freestyle world record (14'31.02)", () => {
        expect(TimeParser.toMillis("14'31.02")).toBe(871020);
      });
    });
  });

  describe('toDisplayTime', () => {
    describe('with minutes', () => {
      it('should format time with minutes (163000)', () => {
        expect(TimeParser.toDisplayTime(163000)).toBe("2'43.000");
      });

      it('should format time with single digit minutes (90500)', () => {
        expect(TimeParser.toDisplayTime(90500)).toBe("1'30.500");
      });

      it('should format time with double digit minutes (615250)', () => {
        expect(TimeParser.toDisplayTime(615250)).toBe("10'15.250");
      });

      it('should format time with zero seconds in minutes (60000)', () => {
        expect(TimeParser.toDisplayTime(60000)).toBe("1'00.000");
      });

      it('should format time with milliseconds (163123)', () => {
        expect(TimeParser.toDisplayTime(163123)).toBe("2'43.123");
      });
    });

    describe('with seconds only', () => {
      it('should format time without minutes (43800)', () => {
        expect(TimeParser.toDisplayTime(43800)).toBe('43.800');
      });

      it('should format time with milliseconds (43123)', () => {
        expect(TimeParser.toDisplayTime(43123)).toBe('43.123');
      });

      it('should format single digit seconds (5500)', () => {
        expect(TimeParser.toDisplayTime(5500)).toBe('5.500');
      });

      it('should format double digit seconds (99990)', () => {
        expect(TimeParser.toDisplayTime(99990)).toBe("1'39.990");
      });

      it('should format time less than one second (500)', () => {
        expect(TimeParser.toDisplayTime(500)).toBe('0.500');
      });
    });

    describe('edge cases', () => {
      it('should return 0.0 for zero milliseconds', () => {
        expect(TimeParser.toDisplayTime(0)).toBe('0.0');
      });

      it('should return 0.0 for negative milliseconds', () => {
        expect(TimeParser.toDisplayTime(-100)).toBe('0.0');
      });

      it('should handle very large times (1 hour)', () => {
        expect(TimeParser.toDisplayTime(3600000)).toBe("60'00.000");
      });

      it('should handle milliseconds less than 1000', () => {
        expect(TimeParser.toDisplayTime(123)).toBe('0.123');
      });

      it('should pad seconds with zero when needed', () => {
        expect(TimeParser.toDisplayTime(120000)).toBe("2'00.000");
      });
    });

    describe('round-trip consistency', () => {
      it('should maintain consistency for seconds format', () => {
        const original = '43.8';
        const millis = TimeParser.toMillis(original);
        const display = TimeParser.toDisplayTime(millis);
        // Note: toDisplayTime uses milliseconds precision, so 43.8 becomes 43.800
        expect(display).toBe('43.800');
      });

      it('should maintain consistency for minutes format', () => {
        const original = "2'43.8";
        const millis = TimeParser.toMillis(original);
        const display = TimeParser.toDisplayTime(millis);
        expect(display).toBe("2'43.800");
      });
    });
  });
});
