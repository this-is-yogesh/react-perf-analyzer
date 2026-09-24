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
              <span>AST Parsed Successfully</span>
            </div>
            <span className={styles.successBadge}>Babel Parser Connected</span>
          </div>
          <div className={styles.placeholderNote}>
            Source code was successfully parsed into a Babel Abstract Syntax Tree (AST).
            Found {results.statementCount ?? 0} top-level statement{results.statementCount === 1 ? '' : 's'}.
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
