/**
 * レビュー誘導タイミング管理
 *
 * - 保存3回以上 or 比較2回以上で初回表示
 * - 「あとで」は 7日間スヌーズ（永久抑制しない）
 * - 「レビューする」は永久抑制
 * - ios/android では false を返し、ネイティブ側で OS レビューダイアログを呼ぶ
 *
 * 【実機への移行手順】
 * React Native (Expo) の場合：
 *   import * as StoreReview from 'expo-store-review';
 *   if (await StoreReview.hasAction()) {
 *     await StoreReview.requestReview(); // Apple 純正ダイアログが表示される
 *   }
 * この hook が true を返したタイミングで上記を呼ぶ（platform='web' のみ）。
 * ReviewModal は Web プレビュー用のフォールバックとして残す。
 */
import type { AppState } from '../types';

const SNOOZE_DAYS = 7;
const SNOOZE_KEY  = 'review_snooze_until';
const DONE_KEY    = 'review_done';

export function useReviewPrompt(
  usageCount: AppState['usageCount'],
  platform: 'ios' | 'android' | 'web' = 'web',
): boolean {
  if (platform === 'ios' || platform === 'android') {
    // TODO: ネイティブ側で expo-store-review を呼ぶ（silent call）
    // ReviewModal は表示しない
    return false;
  }

  if (localStorage.getItem(DONE_KEY) === 'true') return false;

  const snoozeUntil = localStorage.getItem(SNOOZE_KEY);
  if (snoozeUntil && Date.now() < Number(snoozeUntil)) return false;

  return usageCount.saveCount >= 3 || usageCount.compareCount >= 2;
}

export function dismissReviewPermanently(): void {
  localStorage.setItem(DONE_KEY, 'true');
}

export function snoozeReview(): void {
  const until = Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000;
  localStorage.setItem(SNOOZE_KEY, String(until));
}
