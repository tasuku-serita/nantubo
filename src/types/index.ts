export type TatamiStandard = '1.62' | '1.65' | '1.824';

export type PropertyStatus = 'none' | 'favorite' | 'considering' | 'visited' | 'rejected';

export type PropertyRecord = {
  id: string;
  name: string;
  rent: number;
  sqm: number;
  memo: string;
  perSqm: number;
  perTsubo: number;
  perTatami: number;
  tatamiStandard: string;
  savedAt: string;
  status?: PropertyStatus;
};

export type UsageCount = {
  saveCount: number;
  compareCount: number;
  hasReviewed: boolean;
};

export type AppState = {
  isPremium: boolean;
  tatamiStandard: TatamiStandard;
  history: PropertyRecord[];
  usageCount: UsageCount;
};
