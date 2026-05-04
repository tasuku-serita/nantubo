import { useEffect } from 'react';
import { track } from '../../lib/analytics';
import styles from './Modal.module.css';

export type PremiumModalVariant = 'default' | 'saveLimit' | 'compareLimit' | 'statusLock';

type ModalContent = {
  title: string;
  body?: string;
  features?: string[];
  btnLabel: string;
};

const CONTENT: Record<PremiumModalVariant, ModalContent> = {
  default: {
    title: '部屋探しを本格的に比較するなら',
    features: [
      '✓ 広告なしでサクサク使える',
      '✓ 候補物件を3件以上比較',
      '✓ 保存リストを無制限に使える',
      '✓ 気になる・内見予定・申込候補を整理',
      '✓ 比較メモをコピーして共有',
    ],
    btnLabel: 'プレミアム版にする（買い切り200円）',
  },
  saveLimit: {
    title: '候補物件が増えてきました',
    body: '無料版では10件まで候補を保存できます。\n本格的に部屋探しを進めるなら、保存リストを無制限に使えます。',
    btnLabel: '保存リストを無制限にする（買い切り200円）',
  },
  compareLimit: {
    title: '3件以上を比べるならプレミアム版',
    body: '家賃・広さ・㎡単価をまとめて比較できます。\n内見前の候補整理に便利です。',
    btnLabel: 'プレミアム版にする（買い切り200円）',
  },
  statusLock: {
    title: '候補を整理するならプレミアム版',
    body: '第一候補・検討中・内見済み・見送りで、気になる物件を整理できます。\n内見前や申し込み前の比較に便利です。',
    btnLabel: '候補整理を使う（買い切り200円）',
  },
};

type Props = {
  onUpgrade: () => void;
  onClose: () => void;
  variant?: PremiumModalVariant;
};

export function PremiumModal({ onUpgrade, onClose, variant = 'default' }: Props) {
  const c = CONTENT[variant];

  useEffect(() => {
    track('paywall_view', { variant });
  }, []);
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.card} onClick={e => e.stopPropagation()}>
        <h2 className={styles.title}>{c.title}</h2>
        {c.body && (
          <p className={styles.body} style={{ whiteSpace: 'pre-line' }}>{c.body}</p>
        )}
        {c.features && (
          <ul className={styles.featureList}>
            {c.features.map(f => <li key={f}>{f}</li>)}
          </ul>
        )}
        <button className={styles.primaryBtn} onClick={() => { track('paywall_purchase_click'); onUpgrade(); }}>
          {c.btnLabel}
        </button>
        <button className={styles.cancelBtn} onClick={onClose}>キャンセル</button>
      </div>
    </div>
  );
}
