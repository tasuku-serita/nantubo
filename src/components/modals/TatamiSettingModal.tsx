import type { TatamiStandard } from '../../types';
import styles from './Modal.module.css';

const OPTIONS: { value: TatamiStandard; label: string }[] = [
  { value: '1.62', label: '1.62㎡（江戸間・関東）' },
  { value: '1.65', label: '1.65㎡（中京間）' },
  { value: '1.824', label: '1.824㎡（京間・関西）' },
];

type Props = {
  current: TatamiStandard;
  onSelect: (v: TatamiStandard) => void;
  onClose: () => void;
};

export function TatamiSettingModal({ current, onSelect, onClose }: Props) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.card} onClick={e => e.stopPropagation()}>
        <h2 className={styles.title}>畳の基準を選択</h2>
        <div className={styles.options}>
          {OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`${styles.option} ${current === opt.value ? styles.optionActive : ''}`}
              onClick={() => { onSelect(opt.value); onClose(); }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button className={styles.cancelBtn} onClick={onClose}>キャンセル</button>
      </div>
    </div>
  );
}
