# React Performance Analyzer — Development Roadmap

## Architecture & Implementation Progress

- [x] **Step 1: Workbench Layout & Results Shell**
  - Completed split-screen workbench layout with Monaco editor on the left and `ResultsPanel` on the right.
  - Implemented UI states:
    - **Idle**: Features overview & prompt to analyze.
    - **Analyzing**: Loading indicator with status description.
    - **Error**: Error banner for empty input or syntax failures.
    - **Results**: Scaffolding placeholder for diagnostics output.
  - Wired up `handleAnalyze` pipeline in `App.jsx`.

- [ ] **Step 2: Static Analysis Engine (Babel AST)**
  - Integrate `@babel/standalone` to parse user code into an AST.
  - Implement static checks in `src/analysis/staticAnalyzer.js`:
    - Inline functions / arrow callbacks in JSX props (`onClick={() => ...}`).
    - Inline object / array literals in JSX props (`style={{ ... }}`, `items={[...]}`).
    - Expensive operations / chained array transformations in render bodies (`.filter().map().sort()`).
    - Component props stability and memoization opportunities.

- [ ] **Step 3: Issues List Component (`IssuesList`)**
  - Render detected static issues with severity badges (`high`, `medium`, `low`).
  - Display offending line numbers, component names, and actionable resolution hints.

- [ ] **Step 4: Runtime Sandbox & AST Instrumentation**
  - Transform component AST to wrap components with render tracking hooks / HOCs.
  - Safely mount the tree inside a hidden `Sandbox` component with `ErrorBoundary`.
  - Capture real-time render metrics: render counts, execution time, and render causes (`initial`, `parent`, `props`, `state`, `context`).

- [ ] **Step 5: Metric Aggregation, Scoring & Recommendations**
  - Compute overall performance score gauge (0–100).
  - Categorize render causes and highlight wasted re-renders.
  - Generate prioritized optimization advice.

- [ ] **Step 6: UI Polish & Preset Snippets**
  - Add preset code snippets (e.g., "Heavy List", "Context Thrashing", "Unstable Props").
  - Fine-tune animations, transitions, and responsive layout.
