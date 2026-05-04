export const formatYen = (n: number): string =>
  Math.round(n).toLocaleString('ja-JP') + '円';

export const formatUnit = (n: number, unit: string): string =>
  `約 ${n.toFixed(1)} ${unit}`;

export const safeDiv = (a: number, b: number): number =>
  b === 0 || isNaN(b) || !isFinite(b) ? 0 : a / b;

/**
 * 数値入力の共通パーサ
 * カンマ・全角カンマ・空白・全角ドットを正規化してから数値変換する
 */
export function parseNumericInput(raw: string, max = 99_999_999): number {
  const normalized = raw
    .replace(/[,，\s]/g, '')   // 半角/全角カンマ・空白を除去
    .replace(/．/g, '.')        // 全角ドットを半角に
    .trim();
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, max);
}
