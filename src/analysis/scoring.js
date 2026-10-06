/**
 * Weights used to penalize the score based on issue severity.
 * Higher severity issues deduct more points.
 */
const SEVERITY_WEIGHT = {
  high: 15,
  medium: 8,
  low: 4,
};

/**
 * Computes a performance health score (0 to 100) based on detected issues.
 *
 * @param {Object} params
 * @param {Array} params.issues - Array of static performance issues found
 * @returns {{ score: number, band: 'good' | 'warn' | 'critical', deductions: Array }}
 */
export function computeScore({ issues = [] } = {}) {
  let score = 100;
  const deductions = [];

  issues.forEach((issue) => {
    const penalty = SEVERITY_WEIGHT[issue.severity] || 5;
    score -= penalty;
    deductions.push({
      label: issue.title,
      points: penalty,
      severity: issue.severity,
    });
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
