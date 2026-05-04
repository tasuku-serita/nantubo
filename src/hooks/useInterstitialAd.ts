import { useRef } from 'react';

type AdActionType = 'save' | 'copy';

// 保存完了後・コピー完了後に呼ぶ。3回に1回だけ広告を表示する。
// isPremium=true のとき完全スキップ。
// 実AdMob実装時は showAd() 内の console.log を StoreReview/Admob SDK 呼び出しに置き換える。
export function useInterstitialAd(isPremium: boolean) {
  const counters = useRef<Record<AdActionType, number>>({ save: 0, copy: 0 });

  const showInterstitialAdIfNeeded = (actionType: AdActionType) => {
    if (isPremium) return;

    counters.current[actionType] += 1;
    if (counters.current[actionType] % 3 !== 0) return;

    // TODO: replace with actual AdMob interstitial call
    // e.g. await AdMob.showInterstitial();
    console.log(`[Ad] Interstitial triggered after ${actionType} (count: ${counters.current[actionType]})`);
  };

  return { showInterstitialAdIfNeeded };
}
