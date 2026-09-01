export function aggregateRenderEvents(events) {
  const byName = new Map();
  events.forEach((evt) => {
    if (!byName.has(evt.name)) {
      byName.set(evt.name, []);
    }
    byName.get(evt.name).push(evt);
  });

  const stats = [];
  byName.forEach((list, name) => {
    const renders = list.length;
    const unnecessary = list.filter((e) => !e.isInitial && e.causes.includes('parent')).length;
    const totalDuration = list.reduce((sum, e) => sum + e.duration, 0);
    const avgDuration = renders ? totalDuration / renders : 0;
    stats.push({
      name,
      renders,
      unnecessary,
      avgDuration,
      totalDuration,
      events: list.sort((a, b) => a.renderIndex - b.renderIndex),
    });
  });

  stats.sort((a, b) => b.renders - a.renders);
  return stats;
}
