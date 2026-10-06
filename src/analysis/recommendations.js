/**
 * Synthesizes static AST anti-patterns and runtime render metrics into
 * prioritized, actionable optimization recommendations.
 *
 * @param {Object} params
 * @param {Array} [params.staticIssues] - Static issues detected by AST analysis
 * @param {Array} [params.renderStats] - Runtime render stats from the sandbox
 * @returns {Array} Sorted recommendations with high-impact fixes first
 */
export function buildRecommendations({ staticIssues = [], renderStats = [] } = {}) {
  const recs = [];

  // 1. Recommendations from static anti-patterns
  staticIssues.forEach((issue) => {
    recs.push({
      id: issue.id || `static-${issue.title}-${issue.line}`,
      severity: issue.severity || 'medium',
      problem: issue.title,
      fix: issue.fix,
      explanation: issue.description,
      componentName: issue.componentName,
    });
  });

  // 2. Recommendations from runtime render behavior
  renderStats.forEach((stat) => {
    if (stat.unnecessary > 0) {
      recs.push({
        id: `runtime-wasted-${stat.name}`,
        severity: stat.unnecessary >= 2 ? 'high' : 'medium',
        problem: `<${stat.name} /> re-rendered ${stat.renders} times, including ${stat.unnecessary} wasted pass${stat.unnecessary === 1 ? '' : 'es'} without prop/state changes`,
        fix: `Wrap ${stat.name} in React.memo(...) and ensure parent doesn't pass new inline object/callback references.`,
        explanation:
          'When a parent re-renders, React re-renders all children by default. Wrapping pure children in React.memo skips re-rendering when props remain shallowly equal.',
        componentName: stat.name,
      });
    }

    if (stat.avgDuration > 8) {
      recs.push({
        id: `runtime-slow-${stat.name}`,
        severity: 'high',
        problem: `<${stat.name} /> takes an average of ${stat.avgDuration.toFixed(1)}ms per render`,
        fix: `Extract heavy data transformations (sorting, filtering, map chains) into useMemo(() => ..., [deps]) or split into smaller components.`,
        explanation:
          'JavaScript execution blocking the main thread for over 5-8ms can cause frame drops and noticeable UI sluggishness.',
        componentName: stat.name,
      });
    }
  });

  // Sort: High priority first, then medium, then low
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recs.sort((a, b) => (priorityOrder[a.severity] ?? 3) - (priorityOrder[b.severity] ?? 3));

  return recs;
}
