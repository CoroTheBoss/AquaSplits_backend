import { PoolLength } from '../type/pool-length.enum';

export function parsePoolLength(
  input: string | number | undefined,
): PoolLength | undefined {
  if (!input) return undefined;

  const normalized =
    typeof input === 'number' ? input : Number(String(input).match(/\d+/)?.[0]);

  const map: Record<number, PoolLength> = {
    25: PoolLength.L25,
    50: PoolLength.L50,
  };

  return map[normalized];
}
