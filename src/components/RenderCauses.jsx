import styles from './RenderCauses.module.css';

const CAUSE_LABEL = {
  initial: 'Initial render',
  parent: 'Parent rendered',
  props: 'Props changed',
  state: 'State changed',
  context: 'Context changed',
};

const CAUSE_ORDER = ['initial', 'state', 'props', 'context', 'parent'];

function primaryCause(causes) {
  for (const c of CAUSE_ORDER) {
    if (causes.includes(c)) return c;
  }
  return 'parent';
}

function PulseStrip({ events }) {
  const maxDuration = Math.max(1, ...events.map((e) => e.duration));
  return (
    <div className={styles.pulse} role="img" aria-label={`${events.length} render events`}>
      {events.map((evt, i) => {
        const cause = primaryCause(evt.causes);
        const heightPct = Math.max(22, Math.min(100, (evt.duration / maxDuration) * 100));
        return (
          <span
            key={i}
            className={styles.tick}
            style={{ height: `${heightPct}%`, background: `var(--cause-${cause})` }}
            title={`Render #${evt.renderIndex} · ${CAUSE_LABEL[cause]} · ${evt.duration.toFixed(2)}ms`}
          />
        );
      })}
    </div>
  );
}

export function RenderCauses({ stats }) {
  if (stats.length === 0) {
    return <p className={styles.empty}>No render activity was captured for this component tree.</p>;
  }

  return (
    <div className={styles.list}>
      {stats.map((stat) => {
        const causesSeen = new Set();
        stat.events.forEach((e) => e.causes.forEach((c) => causesSeen.add(c)));
        return (
          <div key={stat.name} className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.name}>{stat.name}</span>
              <span className={styles.meta}>
                Rendered: {stat.renders} time{stat.renders === 1 ? '' : 's'} · {stat.avgDuration.toFixed(2)}ms avg
              </span>
            </div>
            <PulseStrip events={stat.events} />
            <div className={styles.reasons}>
              {CAUSE_ORDER.filter((c) => causesSeen.has(c)).map((c) => (
                <span key={c} className={styles.reason}>
                  <span className={styles.dot} style={{ background: `var(--cause-${c})` }} />
                  {CAUSE_LABEL[c]}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
