import styles from './RenderSummaryTable.module.css';

/**
 * Renders a summary table displaying:
 * - Component name
 * - Total render count
 * - Wasted/unnecessary renders (triggered solely by parent with no prop/state changes)
 * - Average render duration (ms)
 * - Total render duration (ms)
 */
export function RenderSummaryTable({ stats = [] }) {
  if (!stats || stats.length === 0) {
    return <p className={styles.empty}>No components rendered during analysis.</p>;
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Component</th>
            <th>Renders</th>
            <th>Unnecessary</th>
            <th>Avg Duration</th>
            <th>Total Duration</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((stat) => (
            <tr key={stat.name}>
              <td className={styles.name}>&lt;{stat.name} /&gt;</td>
              <td>{stat.renders}</td>
              <td>
                {stat.unnecessary > 0 ? (
                  <span className={styles.unnecessaryBadge}>
                    ⚠️ {stat.unnecessary} wasted
                  </span>
                ) : (
                  <span className={styles.zeroWasted}>0</span>
                )}
              </td>
              <td>{stat.avgDuration.toFixed(2)}ms</td>
              <td>{stat.totalDuration.toFixed(2)}ms</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
