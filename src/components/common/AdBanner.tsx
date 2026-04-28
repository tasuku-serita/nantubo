import styles from './AdBanner.module.css';

export function AdBanner({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className={styles.adBanner}>
      {/* 将来ここにAdMob / Google AdSenseのコードを挿入 */}
      <span className={styles.adLabel}>広告</span>
    </div>
  );
}
