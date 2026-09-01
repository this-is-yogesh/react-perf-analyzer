import styles from './Recommendations.module.css';

export function Recommendations({ recommendations }) {
  if (recommendations.length === 0) {
    return <p className={styles.empty}>Nothing to optimize — this code looks performance-friendly.</p>;
  }
  return (
    <div className={styles.list}>
      {recommendations.map((rec) => (
        <div key={rec.id} className={styles.card}>
          <div className={styles.row}>
            <span className={styles.label}>Problem</span>
            <p className={styles.text}>{rec.problem}</p>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Suggested fix</span>
            <p className={`${styles.text} ${styles.fix}`}>{rec.fix}</p>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Why</span>
            <p className={styles.text}>{rec.explanation}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
