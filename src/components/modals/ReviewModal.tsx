import styles from './Modal.module.css';

type Props = {
  onReview: () => void;
  onLater: () => void;
};

export function ReviewModal({ onReview, onLater }: Props) {
  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <h2 className={styles.title}>使い心地はいかがですか？</h2>
        <p className={styles.body}>
          役に立っていたら、ぜひレビューをお願いします。<br />
          開発の励みになります。
        </p>
        <div className={styles.btnRow}>
          <button className={styles.primaryBtn} onClick={onReview}>レビューする</button>
          <button className={styles.secondaryBtn} onClick={onLater}>あとで</button>
        </div>
      </div>
    </div>
  );
}
