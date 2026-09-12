import { useCallback, useRef, useState } from 'react';
import { CodeEditor } from './components/CodeEditor';

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
  /**entire code is a state variable */
  const [status, setStatus] = useState('idle'); // idle | analyzing | error | results
  const [error, setError] = useState(null);

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
            <button className={styles.analyzeBtn} onClick={() => { }} disabled={status === 'analyzing'}>
              {status === 'analyzing' ? 'Analyzing…' : 'Analyze'}
            </button>
          </div>
          <CodeEditor value={code} setCode={setCode} />
        </div>

      </main>


    </div>
  );
}

export default App;
