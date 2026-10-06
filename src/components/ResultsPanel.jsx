import { ScoreGauge } from './ScoreGauge';
import { RenderSummaryTable } from './RenderSummaryTable';
import { RenderCauses } from './RenderCauses';
import styles from './ResultsPanel.module.css';

export function ResultsPanel({ status, error, results }) {
  if (status === 'analyzing') {
    return (
      <div className={styles.resultsWrap}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <div className={styles.loadingTitle}>Analyzing Component Tree…</div>
          <div className={styles.loadingSubtitle}>
            Running static AST inspections and preparing sandbox…
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error' && error) {
    return (
      <div className={styles.resultsWrap}>
        <div className={styles.errorCard}>
          <div className={styles.errorHeader}>
            <span>⚠️</span>
            <span>Analysis Error</span>
          </div>
          <pre className={styles.errorMessage}>{error.message || String(error)}</pre>
        </div>
      </div>
    );
  }

  if (status === 'results' && results) {
    return (
      <div className={styles.resultsWrap}>
        <div className={styles.resultsPlaceholder}>
          <div className={styles.successHeader}>
            <div className={styles.successTitle}>
              <span>⚡</span>
              <span>Diagnostics Complete</span>
            </div>
            <span className={styles.successBadge}>Babel Parser Connected</span>
          </div>

          {/* Performance Health Score Gauge */}
          {results.score !== undefined && (
            <div className={styles.scoreCard}>
              <div className={styles.scoreCardHeader}>
                <span className={styles.scoreCardTitle}>Performance Health Score</span>
                <span className={styles.scoreDeductionCount}>
                  {results.deductions?.length ?? 0} penalty deduction{results.deductions?.length === 1 ? '' : 's'}
                </span>
              </div>
              <ScoreGauge score={results.score} />
            </div>
          )}

          {/* Runtime Sandbox Execution Card */}
          {results.instrumented && (
            <div className={styles.sandboxReadyCard}>
              <div className={styles.sandboxReadyHeader}>
                <span className={styles.sandboxReadyTitle}>
                  <span>🧪</span>
                  <span>Runtime Sandbox Active</span>
                </span>
                <span className={styles.sandboxRootBadge}>
                  Root: &lt;{results.instrumented.rootExpr} /&gt;
                </span>
              </div>
              <div className={styles.sandboxReadyDesc}>
                {results.renderStats ? (
                  <>
                    Mounted in off-screen sandbox with 350ms settle window. Captured{' '}
                    <strong>{results.events?.length ?? 0} render event{results.events?.length === 1 ? '' : 's'}</strong> across{' '}
                    <strong>{results.renderStats.length} component{results.renderStats.length === 1 ? '' : 's'}</strong>.
                  </>
                ) : (
                  <>
                    Instrumented {results.instrumented.componentNames.length} components with runtime <code>__track</code> wrapper.
                  </>
                )}
              </div>
            </div>
          )}

          {/* Render Summary Table */}
          {results.renderStats && (
            <div className={styles.renderSection}>
              <div className={styles.renderSectionHeader}>
                <div className={styles.renderSectionTitle}>
                  <span>📊</span>
                  <span>Render Activity Summary</span>
                </div>
                <span className={styles.renderCountBadge}>
                  {results.renderStats.length} {results.renderStats.length === 1 ? 'component' : 'components'}
                </span>
              </div>
              <RenderSummaryTable stats={results.renderStats} />
            </div>
          )}

          {/* Render Causes & Timeline */}
          {results.renderStats && (
            <div className={styles.renderSection}>
              <div className={styles.renderSectionHeader}>
                <div className={styles.renderSectionTitle}>
                  <span>⏱️</span>
                  <span>Render Causes & Timeline</span>
                </div>
              </div>
              <RenderCauses stats={results.renderStats} />
            </div>
          )}

          <div className={styles.placeholderNote}>
            Source code was successfully parsed into a Babel Abstract Syntax Tree (AST).
            Found {results.statementCount ?? 0} top-level statement{results.statementCount === 1 ? '' : 's'}.
          </div>

          <div className={styles.componentSection}>
            <div className={styles.componentSectionTitle}>
              Detected React Components ({results.components?.length ?? 0})
            </div>
            {results.components && results.components.length > 0 ? (
              <div className={styles.componentList}>
                {results.components.map((comp) => (
                  <div key={comp.name} className={styles.componentItem}>
                    <span className={styles.componentName}>&lt;{comp.name} /&gt;</span>
                    {comp.line && (
                      <span className={styles.componentLine}>Line {comp.line}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.placeholderNote}>
                No React components found. Component names must start with a capital letter (PascalCase).
              </div>
            )}
          </div>

          {/* Static Performance Anti-Patterns */}
          <div className={styles.issuesSection}>
            <div className={styles.issuesSectionHeader}>
              <div className={styles.issuesSectionTitle}>
                Static Anti-Patterns Detected
              </div>
              <span className={styles.issuesCountBadge}>
                {results.issues?.length ?? 0} {results.issues?.length === 1 ? 'issue' : 'issues'}
              </span>
            </div>

            {results.issues && results.issues.length > 0 ? (
              <div className={styles.issuesList}>
                {results.issues.map((issue) => (
                  <div
                    key={issue.id}
                    className={`${styles.issueCard} ${
                      issue.severity === 'high'
                        ? styles.cardHigh
                        : issue.severity === 'low'
                        ? styles.cardLow
                        : ''
                    }`}
                  >
                    <div className={styles.issueHeader}>
                      <span className={styles.issueTitle}>{issue.title}</span>
                      <span
                        className={`${styles.issueBadge} ${
                          issue.severity === 'high'
                            ? styles.badgeHigh
                            : issue.severity === 'low'
                            ? styles.badgeLow
                            : ''
                        }`}
                      >
                        {issue.severity}
                      </span>
                    </div>
                    <div className={styles.issueDesc}>{issue.description}</div>
                    <div className={styles.issueFix}>
                      <span>💡</span>
                      <span>{issue.fix}</span>
                    </div>
                    <div className={styles.issueMeta}>
                      {issue.componentName && <span>in &lt;{issue.componentName} /&gt;</span>}
                      {issue.line && <span>Line {issue.line}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.noIssuesCard}>
                <span>✓</span>
                <span>No static performance anti-patterns detected. Clean code!</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default: 'idle'
  return (
    <div className={styles.resultsWrap}>
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>⚡</div>
        <div className={styles.emptyTitle}>Ready to Analyze</div>
        <div className={styles.emptyDesc}>
          Paste your component code on the left and click <strong>Analyze</strong> to inspect performance metrics.
        </div>

        <div className={styles.featureList}>
          <div className={styles.featureItem}>
            <span className={styles.featureDot} />
            <span>Static AST Anti-Pattern Detection</span>
          </div>
          <div className={styles.featureItem}>
            <span className={styles.featureDot} />
            <span>Runtime Re-render Frequency & Duration</span>
          </div>
          <div className={styles.featureItem}>
            <span className={styles.featureDot} />
            <span>Root-Cause Attribution (Props, State, Parent)</span>
          </div>
          <div className={styles.featureItem}>
            <span className={styles.featureDot} />
            <span>Prioritized Optimization Recommendations</span>
          </div>
        </div>
      </div>
    </div>
  );
}
