import { useCallback, useRef, useState } from 'react';
import { CodeEditor } from './components/CodeEditor';
import { ResultsPanel } from './components/ResultsPanel';
import { Sandbox } from './sandbox/Sandbox';
import { parseCode, findComponents } from './analysis/babel';
import { analyzeAST } from './analysis/staticAnalyzer';
import { computeScore } from './analysis/scoring';
import { instrumentCode } from './analysis/transform';
import { aggregateRenderEvents } from './analysis/aggregate';

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
  const [results, setResults] = useState(null);
  const [runId, setRunId] = useState(0);
  const [instrumented, setInstrumented] = useState(null);
  const pendingAnalysis = useRef(null);

  const handleAnalyze = useCallback(() => {
    if (!code.trim()) {
      setError(new Error('Please enter some React code to analyze.'));
      setStatus('error');
      return;
    }

    setStatus('analyzing');
    setError(null);
    setResults(null);

    // Parse the code using Babel into an AST, find components, detect anti-patterns & instrument
    try {
      const ast = parseCode(code);
      const components = findComponents(ast);
      const issues = analyzeAST(ast);
      const scoreData = computeScore({ issues });
      const instrumentedResult = instrumentCode(code);

      if (instrumentedResult.error) {
        throw new Error(instrumentedResult.error.message);
      }

      pendingAnalysis.current = {
        statementCount: ast.program?.body?.length ?? 0,
        components,
        issues,
        score: scoreData.score,
        band: scoreData.band,
        deductions: scoreData.deductions,
        instrumented: {
          rootExpr: instrumentedResult.rootExpr,
          componentNames: instrumentedResult.componentNames,
        },
      };

      setInstrumented(instrumentedResult);
      setRunId((id) => id + 1);
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }, [code]);

  const handleSettled = useCallback((events) => {
    const renderStats = aggregateRenderEvents(events);
    const base = pendingAnalysis.current || {};
    setResults({
      ...base,
      timestamp: Date.now(),
      events,
      renderStats,
    });
    setStatus('results');
  }, []);

  const handleRuntimeError = useCallback((err) => {
    setStatus('error');
    setError(err instanceof Error ? err : new Error(String(err)));
  }, []);

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
            <button
              className={styles.analyzeBtn}
              onClick={handleAnalyze}
              disabled={status === 'analyzing'}
            >
              {status === 'analyzing' ? 'Analyzing…' : 'Analyze'}
            </button>
          </div>
          <CodeEditor value={code} setCode={setCode} />
        </div>

        <div className={styles.resultsCol}>
          <ResultsPanel status={status} error={error} results={results} />
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
