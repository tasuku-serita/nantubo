export const formatYen = (n: number): string =>
  Math.round(n).toLocaleString('ja-JP') + '円';

export const formatUnit = (n: number, unit: string): string =>
  `約 ${n.toFixed(1)} ${unit}`;

export const safeDiv = (a: number, b: number): number =>
  b === 0 || isNaN(b) || !isFinite(b) ? 0 : a / b;
