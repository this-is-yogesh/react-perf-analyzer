/**
 * Weights used to penalize the score based on issue severity.
 */
const SEVERITY_WEIGHT = {
  high: 12,
  medium: 6,
  low: 3,
};

/**
 * Computes a composite performance health score (0 to 100) based on
 * both static anti-patterns and runtime render churn.
 *
 * @param {Object} params
 * @param {Array} [params.issues] - Static performance issues found
 * @param {Array} [params.staticIssues] - Alias for issues
 * @param {Array} [params.renderStats] - Runtime component render stats
 * @returns {{ score: number, band: 'good' | 'warn' | 'critical', deductions: Array }}
 */
export function computeScore({ issues, staticIssues, renderStats = [] } = {}) {
  let score = 100;
  const deductions = [];
  const list = staticIssues || issues || [];

  // 1. Deductions from static code inspections
  list.forEach((issue) => {
    const penalty = SEVERITY_WEIGHT[issue.severity] || 5;
    score -= penalty;
    deductions.push({
      label: `${issue.title}${issue.componentName ? ` in <${issue.componentName} />` : ''}`,
      points: penalty,
      severity: issue.severity,
    });
  });

  // 2. Deductions from runtime render behavior
  renderStats.forEach((stat) => {
    // Wasted renders: child re-rendered without prop or state changes
    if (stat.unnecessary > 0) {
      const penalty = Math.min(stat.unnecessary * 5, 20);
      score -= penalty;
      deductions.push({
        label: `<${stat.name} /> re-rendered ${stat.unnecessary} time${stat.unnecessary === 1 ? '' : 's'} without prop/state changes`,
        points: penalty,
        severity: stat.unnecessary >= 2 ? 'high' : 'medium',
      });
    }

    // Heavy render duration penalty
    if (stat.avgDuration > 8) {
      const penalty = Math.min(Math.round((stat.avgDuration - 8) * 2), 15);
      if (penalty > 0) {
        score -= penalty;
        deductions.push({
          label: `<${stat.name} /> slow average render duration (${stat.avgDuration.toFixed(1)}ms)`,
          points: penalty,
          severity: 'high',
        });
      }
    }
  });

  // Clamp the score between 0 and 100
  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    score,
    band: scoreBand(score),
    deductions,
  };
}

/**
 * Maps a numeric score (0-100) to a health category:
 * - 80..100: 'good' (Healthy - green)
 * - 50..79:  'warn' (Needs attention - amber)
 * - 0..49:   'critical' (At risk - red)
 */
export function scoreBand(score) {
  if (score >= 80) return 'good';
  if (score >= 50) return 'warn';
  return 'critical';
}
