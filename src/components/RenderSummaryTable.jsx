import styles from './RenderSummaryTable.module.css';

export function RenderSummaryTable({ stats }) {
  if (stats.length === 0) {
    return <p className={styles.empty}>No components rendered during analysis.</p>;
  }
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Component</th>
          <th>Renders</th>
          <th>Avg duration</th>
          <th>Total duration</th>
        </tr>
      </thead>
      <tbody>
        {stats.map((stat) => (
          <tr key={stat.name}>
            <td className={styles.name}>{stat.name}</td>
            <td>{stat.renders}</td>
            <td>{stat.avgDuration.toFixed(2)}ms</td>
            <td>{stat.totalDuration.toFixed(2)}ms</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
