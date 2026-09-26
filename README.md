# React Performance Analyzer

A small MVP dev tool: paste arbitrary React code into an editor, click **Analyze**,
and get a performance report — without changing your code.

## What it does

1. Parses your pasted code with Babel and runs **static AST analysis** to flag:
   - Inline callback / object / array props
   - Expensive loops or chained array ops (`.map().filter().sort()...`) inside render
   - Missing `React.memo` / `useCallback` / `useMemo` opportunities
2. Instruments your components (via an AST transform) and mounts them in a hidden
   sandbox inside the page, using the real React runtime, to **track renders**:
   - Render count and render duration per component
   - Why each render happened: initial render, parent rendered, props changed,
     state changed, or context changed
3. Turns all of that into a **performance score (0–100)**, a render summary table,
   a render-cause breakdown per component, and prioritized recommendations.

## Running it

```bash
npm install
npm run dev
```

Then open the printed local URL, paste a component (or use the starter snippet
already in the editor), and click **Analyze**.

## How it works (short version)

- `src/analysis/staticAnalyzer.js` — AST-based static checks
- `src/analysis/transform.js` — wraps detected components with a `__track(...)` HOC
- `src/analysis/registry.js` — the tracking HOC + wrapped `useState`/`useContext`/`useReducer`
  used to classify *why* a component re-rendered
- `src/sandbox/Sandbox.jsx` — mounts the instrumented tree off-screen inside the
  host React tree (so it shares the real reconciler) and reports render events back
- `src/analysis/scoring.js`, `src/analysis/recommendations.js` — turn issues + render
  stats into the score and recommendation cards

## Known scope limits (by design — this isn't React DevTools)

- Render-cause attribution for state/context changes is done at the *component name*
  level, not per fiber instance. If you render multiple instances of the same
  component type, they share that classification.
- No automatic interaction simulation — the tool observes the initial mount plus any
  render churn that happens on its own within ~350ms (e.g. an effect that calls
  `setState`). It doesn't click your buttons for you.
- No JSX-in-a-loop across nested components, class components, or non-React-import
  external libraries are supported — the sandbox only provides `React`.
