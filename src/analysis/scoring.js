const SEVERITY_WEIGHT = { low: 2, medium: 4, high: 8 };

/**
 * renderStats: array of { name, renders, unnecessary, avgDuration }
 */
export function computeScore({ staticIssues, renderStats }) {
  let score = 100;
  const deductions = [];

  staticIssues.forEach((issue) => {
    const weight = SEVERITY_WEIGHT[issue.severity] || 3;
    score -= weight;
    deductions.push({ label: issue.title, points: weight });
  });

  renderStats.forEach((stat) => {
    if (stat.unnecessary > 0) {
      const points = Math.min(stat.unnecessary * 3, 15);
      score -= points;
      deductions.push({
        label: `${stat.name} re-rendered ${stat.unnecessary} time${stat.unnecessary === 1 ? '' : 's'} without a prop, state, or context change`,
        points,
      });
    }
    if (stat.avgDuration > 4) {
      const points = Math.min(Math.round((stat.avgDuration - 4) * 2), 12);
      if (points > 0) {
        score -= points;
        deductions.push({
          label: `${stat.name} averages ${stat.avgDuration.toFixed(1)}ms per render`,
          points,
        });
      }
    }
  });

  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, deductions };
}

export function scoreBand(score) {
  if (score >= 80) return 'good';
  if (score >= 50) return 'warn';
  return 'critical';
}
