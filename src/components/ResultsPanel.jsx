import { ScoreGauge } from './ScoreGauge';
import { RenderSummaryTable } from './RenderSummaryTable';
import { IssuesList } from './IssuesList';
import { RenderCauses } from './RenderCauses';
import { Recommendations } from './Recommendations';
import { Section } from './Section';
import styles from './ResultsPanel.module.css';

function IdleState() {
  return (
    <div className={styles.placeholder}>
      <div className={styles.placeholderGlyph}>◎</div>
      <p className={styles.placeholderTitle}>Paste a component, hit Analyze</p>
      <p className={styles.placeholderText}>
        You'll get a performance score, a render summary, why each component re-rendered, and concrete
        fixes — without changing your code.
      </p>
    </div>
  );
}

function AnalyzingState() {
  return (
    <div className={styles.placeholder}>
      <div className={`${styles.placeholderGlyph} ${styles.spin}`}>◎</div>
      <p className={styles.placeholderTitle}>Analyzing…</p>
      <p className={styles.placeholderText}>Parsing the AST and mounting your components in a sandbox.</p>
    </div>
  );
}

function ErrorState({ error }) {
  return (
    <div className={styles.placeholder}>
      <div className={`${styles.placeholderGlyph} ${styles.errorGlyph}`}>!</div>
      <p className={styles.placeholderTitle}>{error.title}</p>
      <p className={styles.placeholderText}>{error.message}</p>
      {error.line ? <p className={styles.errorLoc}>Line {error.line}{error.column != null ? `, column ${error.column}` : ''}</p> : null}
      <p className={styles.placeholderHint}>Fix the highlighted issue in the editor and analyze again.</p>
    </div>
  );
}

export function ResultsPanel({ status, error, report }) {
  if (status === 'idle') return <IdleState />;
  if (status === 'analyzing') return <AnalyzingState />;
  if (status === 'error') return <ErrorState error={error} />;
  if (!report) return null;

  const { score, deductions, staticIssues, renderStats, recommendations } = report;

  return (
    <div className={styles.results}>
      <Section eyebrow="Performance score" title="How this code will perform">
        <div className={styles.scoreRow}>
          <ScoreGauge score={score} />
          <div className={styles.scoreIssues}>
            {deductions.length === 0 ? (
              <p className={styles.noIssues}>No point deductions — this looks solid.</p>
            ) : (
              <ul className={styles.deductionList}>
                {deductions.slice(0, 6).map((d, i) => (
                  <li key={i}>
                    <span className={styles.deductionPoints}>-{d.points}</span>
                    {d.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Section>

      <Section eyebrow="What rendered" title="Render summary">
        <RenderSummaryTable stats={renderStats} />
      </Section>

      <Section eyebrow="Static analysis" title={`Potential issues (${staticIssues.length})`}>
        <IssuesList issues={staticIssues} />
      </Section>

      <Section eyebrow="Why it rendered" title="Render causes">
        <RenderCauses stats={renderStats} />
      </Section>

      <Section eyebrow="How to fix it" title={`Recommendations (${recommendations.length})`}>
        <Recommendations recommendations={recommendations} />
      </Section>
    </div>
  );
}
