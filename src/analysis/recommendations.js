export function buildRecommendations({ staticIssues, renderStats }) {
  const recs = staticIssues.map((issue) => ({
    id: issue.id,
    severity: issue.severity,
    problem: issue.title,
    fix: issue.fix,
    explanation: issue.description,
    componentName: issue.componentName,
  }));

  renderStats.forEach((stat) => {
    if (stat.unnecessary >= 2) {
      recs.push({
        id: `runtime-unnecessary-${stat.name}`,
        severity: stat.unnecessary >= 4 ? 'high' : 'medium',
        problem: `${stat.name} rendered ${stat.renders} times, ${stat.unnecessary} without a prop/state/context change`,
        fix: `Wrap ${stat.name} in React.memo, and audit its parent for unstable props causing extra passes.`,
        explanation:
          'Renders classified as "Parent rendered" mean this component re-executed even though nothing it reads changed.',
        componentName: stat.name,
      });
    }
    if (stat.avgDuration > 8) {
      recs.push({
        id: `runtime-slow-${stat.name}`,
        severity: 'high',
        problem: `${stat.name} takes ${stat.avgDuration.toFixed(1)}ms on average per render`,
        fix: 'Profile the render body for expensive work and move it into useMemo, or split the component so less re-renders on each update.',
        explanation: 'Render function execution time above a few milliseconds can cause visible jank on frequent updates.',
        componentName: stat.name,
      });
    }
  });

  const order = { high: 0, medium: 1, low: 2 };
  recs.sort((a, b) => (order[a.severity] ?? 3) - (order[b.severity] ?? 3));
  return recs;
}
