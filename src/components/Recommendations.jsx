import styles from './Recommendations.module.css';

/**
 * Displays prioritized optimization recommendations synthesized from both
 * static AST anti-patterns and runtime render metrics.
 */
export function Recommendations({ recommendations = [] }) {
  if (!recommendations || recommendations.length === 0) {
    return (
      <div className={styles.emptyCard}>
        <span>✓</span>
        <span>Nothing to optimize — your components look clean and performant!</span>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {recommendations.map((rec) => (
        <div
          key={rec.id}
          className={`${styles.card} ${
            rec.severity === 'high'
              ? styles.cardHigh
              : rec.severity === 'low'
              ? styles.cardLow
              : styles.cardMedium
          }`}
        >
          <div className={styles.cardHeader}>
            <div className={styles.headerTitle}>
              {rec.componentName && (
                <span className={styles.componentBadge}>&lt;{rec.componentName} /&gt;</span>
              )}
              <span className={styles.problemText}>{rec.problem}</span>
            </div>
            <span
              className={`${styles.severityBadge} ${
                rec.severity === 'high'
                  ? styles.badgeHigh
                  : rec.severity === 'low'
                  ? styles.badgeLow
                  : styles.badgeMedium
              }`}
            >
              {rec.severity} priority
            </span>
          </div>

          <div className={styles.fixBox}>
            <div className={styles.fixHeader}>
              <span>💡</span>
              <span className={styles.fixLabel}>Recommended Fix</span>
            </div>
            <div className={styles.fixContent}>{rec.fix}</div>
          </div>

          {rec.explanation && (
            <div className={styles.explanation}>
              <span className={styles.explanationLabel}>Why this matters:</span> {rec.explanation}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
