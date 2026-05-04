import type { TatamiStandard } from '../types';

export const TSUBO_PER_SQM = 1 / 3.305785;
export const SQM_PER_TSUBO = 3.305785;

export const TATAMI_SQM: Record<TatamiStandard, number> = {
  '1.62': 1.62,
  '1.65': 1.65,
  '1.824': 1.824,
};

export function sqmToTsubo(sqm: number): number {
  return sqm * TSUBO_PER_SQM;
}
export function sqmToTatami(sqm: number, std: TatamiStandard): number {
  return sqm / TATAMI_SQM[std];
}
export function tsuboToSqm(tsubo: number): number {
  return tsubo * SQM_PER_TSUBO;
}
export function tatamiToSqm(tatami: number, std: TatamiStandard): number {
  return tatami * TATAMI_SQM[std];
}
export function rentPerSqm(rent: number, sqm: number): number {
  return rent / sqm;
}
export function rentPerTsubo(rent: number, sqm: number): number {
  return rent / sqmToTsubo(sqm);
}
export function rentPerTatami(rent: number, sqm: number, std: TatamiStandard): number {
  return rent / sqmToTatami(sqm, std);
}

export const FREE_HISTORY_LIMIT = 10;
export const FREE_COMPARE_LIMIT = 2;
