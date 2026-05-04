import styles from './AdBanner.module.css';

// バナー広告プレースホルダー。
// 方針：起動直後・入力中は出さない。isPremium=true なら完全非表示。
// インタースティシャル広告は useInterstitialAd hook で制御（保存/コピー後に3回に1回）。
export function AdBanner({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className={styles.adBanner}>
      {/* TODO: AdMob バナー広告をここに挿入 */}
      <span className={styles.adLabel}>広告</span>
    </div>
  );
}
