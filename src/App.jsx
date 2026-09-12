import { useCallback, useState } from 'react';
import { CodeEditor } from './components/CodeEditor';
import { ResultsPanel } from './components/ResultsPanel';


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
  const [status, setStatus] = useState('error'); // idle | analyzing | error | results
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);

  const handleAnalyze = useCallback(() => {
    if (!code.trim()) {
      setError(new Error('Please enter some React code to analyze.'));
      setStatus('error');
      return;
    }

    setStatus('analyzing');
    setError(null);

    // Initial placeholder transition before static analysis engine is attached
    setTimeout(() => {
      try {
        setResults({ timestamp: Date.now() });
        setStatus('results');
      } catch (err) {
        setError(err);
        setStatus('error');
      }
    }, 2000);
  }, [code]);

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
    </div>
  );
}

export default App;
