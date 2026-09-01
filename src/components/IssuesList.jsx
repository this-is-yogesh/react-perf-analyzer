import styles from './IssuesList.module.css';

export function IssuesList({ issues }) {
  if (issues.length === 0) {
    return <p className={styles.empty}>No static issues detected — nice and clean.</p>;
  }
  return (
    <ul className={styles.list}>
      {issues.map((issue) => (
        <li key={issue.id} className={styles.item}>
          <span className={`${styles.sev} ${styles[issue.severity]}`}>{issue.severity}</span>
          <div className={styles.body}>
            <div className={styles.title}>
              {issue.title}
              {issue.line ? <span className={styles.line}>line {issue.line}</span> : null}
            </div>
            <p className={styles.desc}>{issue.description}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
