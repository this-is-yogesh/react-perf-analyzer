# Step 7: Babel Code Transform & AST Instrumentation

This document explains in detail and in simple, friendly words **what we built in this step**, **why it was built**, and **how it works under the hood**.

---

## 🎯 The Big Picture

In steps 1 through 6, we built a complete **Static Analysis Engine**:
- It reads the code as text.
- It finds components and anti-patterns.
- It grades the code with a **0–100 score gauge**.

However, static analysis has a major limitation: **it only reads code, it cannot see what happens when the code actually runs!**
- It doesn't know how many times `<ExpensiveList />` renders in real life.
- It doesn't know if a render took 1 millisecond or 50 milliseconds.
- It doesn't know whether a render was caused by state, props, or parent updates.

In **Step 7**, we crossed the bridge from **Static Analysis** into **Runtime Tracking**:
We built an **AST Code Instrumenter** (`src/analysis/transform.js`) that automatically rewrites the user's React code behind the scenes, wrapping every component in a tracker function (`__track`) so it can report its own renders when mounted in our upcoming sandbox!

---

## ❓ Why Was This Done? (The Problem We Are Solving)

### 1. How Do You Track Renders Without Modifying the User's Code?
In tools like React DevTools, a browser extension injects hooks into the React Fiber reconciler. But in a zero-install web app where the developer just pastes code into an editor, we cannot rely on browser extensions.

Instead, we use a technique called **AST Code Instrumentation**:
Before running the user's code, we use Babel to automatically wrap every component with a tracker:

```jsx
// 📄 What the user wrote:
function Counter() {
  return <button>Click</button>;
}

// 🪄 What our instrumenter converts it into behind the scenes:
const Counter = __track(function Counter() {
  return <button>Click</button>;
}, "Counter");
```

Whenever `<Counter />` runs, `__track` measures how long it takes and why it rendered, without the user ever having to add manual logging or tracking code!

### 2. Preparing the Code to Run Safely
Pasted code in an editor is written as an ES module:
```jsx
import { useState } from 'react';
...
export default function App() { ... }
```
Browsers cannot execute arbitrary `import` / `export` strings inside a regular sandbox function scope.
Our transform automatically:
1. Strips all `import` statements (our sandbox will inject `React` and all hooks directly).
2. Unwraps `export` statements so the functions exist in a clean local scope.
3. Removes stray `ReactDOM.render` or `createRoot` calls so the user's code doesn't try to attach to a non-existent DOM element.

---

## 🛠️ What Was Built in This Step?

### 1. The Instrumentation Engine (`src/analysis/transform.js`)
We created `instrumentCode(code)` which performs a 6-step transformation:
1. **Parses the code** into a Babel AST (`parseCode`).
2. **Strips imports & unwraps exports**:
   - `import ...` is removed.
   - `export default function App()` becomes `function App()` and notes that `App` is the root component.
3. **Strips manual mounting**: Any stray `createRoot(...).render(...)` calls are safely eliminated.
4. **Wraps every component in `__track(...)`**:
   - Function declarations: `function MyComp() {}` ➔ `const MyComp = __track(function MyComp() {}, "MyComp")`.
   - Arrow functions: `const MyComp = () => ...` ➔ `const MyComp = __track(() => ..., "MyComp")`.
   - Preserves `React.memo` wrappers: `memo(__track(..., "MyComp"))`.
5. **Resolves the root component to mount**:
   - Checks: default export name > `'App'` > last declared component.
6. **Compiles JSX into `React.createElement`**:
   - Compiles the JSX using Babel's classic runtime so all JSX tags reference our controlled `React` runtime object.
   - Prepends a prelude providing all React hooks (`useState`, `useEffect`, `useMemo`, `useCallback`, etc.).

### 2. Integrated into the Workbench (`src/App.jsx`)
- When the user clicks **Analyze**, `instrumentCode(code)` runs alongside static analysis.
- If the code cannot be instrumented (or no component exists), a clean error is surfaced.
- Passes the instrumented root expression and component list into the results state.

### 3. Runtime Sandbox Readiness UI (`src/components/ResultsPanel.jsx` & CSS)
- Added a new **🧪 Runtime Sandbox Prepared** card in the Results Panel:
  - Displays the detected root component badge (e.g. `Root: <App />`).
  - Confirms the count of components instrumented with the `__track` wrapper.
  - Confirms readiness for off-screen sandbox mounting in `dev.release_8.0` / `9.0`.

---

## 🔍 Real Example with Our Starter Code

When our starter snippet is analyzed:

```jsx
import { useState } from 'react';

function ExpensiveList({ items }) { ... }
function Counter() { ... }
export default function App() { return <Counter />; }
```

The instrumenter produces:
1. **Root Component Identified**: `<App />` (from `export default function App`).
2. **Components Wrapped**: 3 components (`ExpensiveList`, `Counter`, `App`).
3. **Transformed Code Preview**:
   ```javascript
   const { useState, useEffect, ... } = React;
   
   const ExpensiveList = __track(function ExpensiveList({ items }) {
     ...
   }, "ExpensiveList");
   
   const Counter = __track(function Counter() {
     ...
   }, "Counter");
   
   const App = __track(function App() {
     return React.createElement(Counter, null);
   }, "App");
   ```

---

## 💡 Summary of Changes

- **`src/analysis/babel.js`**: Added Babel AST types (`t`), code generator (`generateCode`), and JSX return detector (`returnsJSX`).
- **`src/analysis/transform.js`**: New module containing `instrumentCode(code)` for AST rewriting.
- **`src/App.jsx`**: Wired `instrumentCode` into the Analyze button pipeline.
- **`src/components/ResultsPanel.jsx` & CSS**: Added the **Runtime Sandbox Prepared** readiness card.
- **`readme/readme_dev_release7.0.md`**: Detailed plain-language documentation of Step 7.

---

## 🗺️ What Comes Next in `dev.release_8.0`?
Now that the code is instrumented with `__track(...)`, the next step is building **`src/analysis/registry.js`**:
- The tracking factory that implements `__track`.
- Measuring exact render durations using `performance.now()`.
- Classifying *why* each render happened (Initial mount, State change, Props change, or Parent re-rendered).
