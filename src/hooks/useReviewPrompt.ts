import type { AppState } from '../types';

export function useReviewPrompt(usageCount: AppState['usageCount']): boolean {
  return (
    !usageCount.hasReviewed &&
    (usageCount.saveCount >= 3 || usageCount.compareCount >= 2)
  );
}
