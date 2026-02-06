import { parsePoolLength } from '../src/utils/parse-pool-lenght';
import { PoolLength } from '../src/type/pool-length.enum';

describe('parsePoolLength', () => {
  describe('valid inputs', () => {
    it('should parse string "25" to PoolLength.L25', () => {
      expect(parsePoolLength('25')).toBe(PoolLength.L25);
    });

    it('should parse string "50" to PoolLength.L50', () => {
      expect(parsePoolLength('50')).toBe(PoolLength.L50);
    });

    it('should parse number 25 to PoolLength.L25', () => {
      expect(parsePoolLength(25)).toBe(PoolLength.L25);
    });

    it('should parse number 50 to PoolLength.L50', () => {
      expect(parsePoolLength(50)).toBe(PoolLength.L50);
    });

    it('should parse string with extra text "25m" to PoolLength.L25', () => {
      expect(parsePoolLength('25m')).toBe(PoolLength.L25);
    });

    it('should parse string with extra text "50m" to PoolLength.L50', () => {
      expect(parsePoolLength('50m')).toBe(PoolLength.L50);
    });

    it('should parse string with spaces " 25 " to PoolLength.L25', () => {
      expect(parsePoolLength(' 25 ')).toBe(PoolLength.L25);
    });

    it('should parse string with prefix "pool-25" to PoolLength.L25', () => {
      expect(parsePoolLength('pool-25')).toBe(PoolLength.L25);
    });

    it('should parse string with suffix "25-pool" to PoolLength.L25', () => {
      expect(parsePoolLength('25-pool')).toBe(PoolLength.L25);
    });
  });

  describe('invalid inputs', () => {
    it('should return undefined for null', () => {
      expect(parsePoolLength(null as any)).toBeUndefined();
    });

    it('should return undefined for undefined', () => {
      expect(parsePoolLength(undefined)).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(parsePoolLength('')).toBeUndefined();
    });

    it('should return undefined for string without numbers', () => {
      expect(parsePoolLength('invalid')).toBeUndefined();
    });

    it('should return undefined for unsupported pool length (33)', () => {
      expect(parsePoolLength('33')).toBeUndefined();
    });

    it('should return undefined for unsupported pool length (100)', () => {
      expect(parsePoolLength('100')).toBeUndefined();
    });

    it('should return undefined for number 33', () => {
      expect(parsePoolLength(33)).toBeUndefined();
    });

    it('should return undefined for number 100', () => {
      expect(parsePoolLength(100)).toBeUndefined();
    });

    it('should return undefined for zero', () => {
      expect(parsePoolLength(0)).toBeUndefined();
    });

    it('should return undefined for negative number', () => {
      expect(parsePoolLength(-25)).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should extract first number from string with multiple numbers', () => {
      expect(parsePoolLength('25 50')).toBe(PoolLength.L25);
    });

    it('should handle very long strings', () => {
      expect(parsePoolLength('25 meters long pool')).toBe(PoolLength.L25);
    });

    it('should handle decimal numbers by extracting integer part', () => {
      expect(parsePoolLength('25.5')).toBe(PoolLength.L25);
    });

    it('should handle string with leading zeros', () => {
      expect(parsePoolLength('025')).toBe(PoolLength.L25);
    });
  });
});
