import { scoreBand } from '../analysis/scoring';
import styles from './ScoreGauge.module.css';

const SIZE = 168;
const STROKE = 10;
const R = (SIZE - STROKE) / 2;
const CENTER = SIZE / 2;
const START_ANGLE = -220;
const SWEEP = 260;

function polar(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx, cy, r, startAngle, endAngle) {
  const start = polar(cx, cy, r, startAngle);
  const end = polar(cx, cy, r, endAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

const BAND_LABEL = { good: 'Healthy', warn: 'Needs attention', critical: 'At risk' };

export function ScoreGauge({ score }) {
  const band = scoreBand(score);
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const ticks = Array.from({ length: 11 }, (_, i) => START_ANGLE + (SWEEP * i) / 10);

  return (
    <div className={styles.wrap}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <path
          d={arcPath(CENTER, CENTER, R, START_ANGLE, START_ANGLE + SWEEP)}
          fill="none"
          stroke="var(--border)"
          strokeWidth={STROKE}
          strokeLinecap="round"
        />
        <path
          d={arcPath(CENTER, CENTER, R, START_ANGLE, START_ANGLE + SWEEP * pct)}
          fill="none"
          stroke={`var(--score-${band})`}
          strokeWidth={STROKE}
          strokeLinecap="round"
          className={styles.progress}
        />
        {ticks.map((angle, i) => {
          const outer = polar(CENTER, CENTER, R + STROKE / 2 + 3, angle);
          const inner = polar(CENTER, CENTER, R + STROKE / 2 - 1, angle);
          return (
            <line
              key={i}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke="var(--text-faint)"
              strokeWidth={1}
            />
          );
        })}
        <text x={CENTER} y={CENTER - 4} textAnchor="middle" className={styles.scoreText}>
          {score}
        </text>
        <text x={CENTER} y={CENTER + 18} textAnchor="middle" className={styles.scoreMax}>
          / 100
        </text>
      </svg>
      <div className={`${styles.band} ${styles[band]}`}>{BAND_LABEL[band]}</div>
    </div>
  );
}
