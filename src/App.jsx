import { useCallback, useRef, useState } from 'react';
import { CodeEditor } from './components/CodeEditor';
import { ResultsPanel } from './components/ResultsPanel';
import { Sandbox } from './sandbox/Sandbox';
import { analyzeStatic } from './analysis/staticAnalyzer';
import { instrumentCode } from './analysis/transform';
import { aggregateRenderEvents } from './analysis/aggregate';
import { computeScore } from './analysis/scoring';
import { buildRecommendations } from './analysis/recommendations';
import styles from './App.module.css';

const STARTER_CODE = 
`import { useState } from 'react';

function ExpensiveList({ items }) {
  // chained array ops recomputed on every render
  const sorted = items.slice().sort((a, b) => a - b).map((n) => n * 2);
  return (
    <ul>
      {sorted.map((n) => (
        <li key={n}>{n}</li>
      ))}
    </ul>
  );
}

function Counter() {
  const [count, setCount] = useState(0);
  const items = [5, 3, 8, 1, 9, 2];

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>Count: {count}</button>
      <ExpensiveList items={items} style={{ padding: 8 }} />
    </div>
  );
}

export default function App() {
  return <Counter />;
}
`;

export function App() {
  const [code, setCode] = useState(STARTER_CODE);
  const [status, setStatus] = useState('idle'); // idle | analyzing | error | results
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);
  const [runId, setRunId] = useState(0);
  const [instrumented, setInstrumented] = useState(null);
  const pendingStaticIssues = useRef([]);

  const handleAnalyze = useCallback(() => {
    setReport(null);
    setError(null);

    const staticResult = analyzeStatic(code);
    if (staticResult.error) {
      setStatus('error');
      setError({
        title: 'Syntax error',
        message: staticResult.error.message,
        line: staticResult.error.line,
        column: staticResult.error.column,
      });
      return;
    }

    const instrumentResult = instrumentCode(code);
    if (instrumentResult.error) {
      setStatus('error');
      setError({
        title: 'Could not analyze this code',
        message: instrumentResult.error.message,
        line: instrumentResult.error.line,
        column: instrumentResult.error.column,
      });
      return;
    }

    pendingStaticIssues.current = staticResult.issues;
    setInstrumented(instrumentResult);
    setStatus('analyzing');
    setRunId((id) => id + 1);
  }, [code]);

  const handleSettled = useCallback((events) => {
    const renderStats = aggregateRenderEvents(events);
    const staticIssues = pendingStaticIssues.current;
    const { score, deductions } = computeScore({ staticIssues, renderStats });
    const recommendations = buildRecommendations({ staticIssues, renderStats });
    setReport({ score, deductions, staticIssues, renderStats, recommendations });
    setStatus('results');
  }, []);

  const handleRuntimeError = useCallback((err) => {
    setStatus('error');
    setError({
      title: 'Runtime error while rendering',
      message: err && err.message ? err.message : String(err),
      line: null,
      column: null,
    });
  }, []);

  const errorMarker =
    status === 'error' && error && error.line ? { line: error.line, column: error.column, message: error.message } : null;

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandGlyph}>◎</span>
          <div>
            <div className={styles.brandTitle}>React Performance Analyzer</div>
            <div className={styles.brandTag}>Paste a component. See what happens and why it happens.</div>
          </div>
        </div>
      </header>

      <main className={styles.workbench}>
        <div className={styles.editorCol}>
          <div className={styles.editorToolbar}>
            <span className={styles.editorLabel}>Input</span>
            <button className={styles.analyzeBtn} onClick={handleAnalyze} disabled={status === 'analyzing'}>
              {status === 'analyzing' ? 'Analyzing…' : 'Analyze'}
            </button>
          </div>
          <CodeEditor value={code} onChange={setCode} errorMarker={errorMarker} />
        </div>

        <div className={styles.resultsCol}>
          <ResultsPanel status={status} error={error} report={report} />
        </div>
      </main>

      {status === 'analyzing' && instrumented ? (
        <Sandbox
          runId={runId}
          instrumented={instrumented}
          onSettled={handleSettled}
          onRuntimeError={handleRuntimeError}
        />
      ) : null}
    </div>
  );
}

export default App;
