/**
 * Aggregates raw component render events recorded by the tracking registry.
 *
 * Groups events by component name and calculates:
 * - renders: total number of times the component rendered
 * - unnecessary: renders where neither state, props, nor context changed (parent triggered)
 * - avgDuration: average render duration in milliseconds
 * - totalDuration: total milliseconds spent rendering this component
 * - events: sorted chronological render timeline
 *
 * @param {Array} events - Raw events from registry.getEvents()
 * @returns {Array} Component render statistics sorted by render count descending
 */
export function aggregateRenderEvents(events = []) {
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
    // An unnecessary render is any non-initial render caused purely by parent render
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

  // Sort components with highest render counts first
  stats.sort((a, b) => b.renders - a.renders);

  return stats;
}
