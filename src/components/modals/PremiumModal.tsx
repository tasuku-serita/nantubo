import styles from './Modal.module.css';

type Props = {
  onUpgrade: () => void;
  onClose: () => void;
};

export function PremiumModal({ onUpgrade, onClose }: Props) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.card} onClick={e => e.stopPropagation()}>
        <h2 className={styles.title}>プレミアム版（買い切り480円）</h2>
        <ul className={styles.featureList}>
          <li>✓ 広告なし</li>
          <li>✓ 比較：3件以上</li>
          <li>✓ 履歴：無制限</li>
          <li>✓ 物件ステータス管理（🌟💭✅❌）</li>
        </ul>
        <button className={styles.primaryBtn} onClick={onUpgrade}>
          アップグレードする
        </button>
        <button className={styles.cancelBtn} onClick={onClose}>キャンセル</button>
      </div>
    </div>
  );
}
