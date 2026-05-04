export type AnalyticsEvent =
  | 'store_open'
  | 'first_value'
  | 'compare_used'
  | 'save_attempt'
  | 'save_limit_hit'
  | 'paywall_view'
  | 'paywall_purchase_click'
  | 'purchase_success'
  | 'purchase_restore'
  | 'review_prompt_shown'
  | 'review_clicked'
  | 'line_share'
  | 'copy_success'
  | 'copy_failed';

/**
 * イベント追跡関数。現在は console.log のみ。
 * TODO: Firebase Analytics / Mixpanel / Amplitude などに差し替える
 * 例 (Firebase): import { logEvent } from 'firebase/analytics';
 *                logEvent(analyticsInstance, event, params);
 */
export function track(event: AnalyticsEvent, params?: Record<string, unknown>): void {
  if (params !== undefined) {
    console.log(`[Analytics] ${event}`, params);
  } else {
    console.log(`[Analytics] ${event}`);
  }
}
