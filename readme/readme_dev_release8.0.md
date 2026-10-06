# Step 8: Runtime Tracking Registry & Render Cause Classifier

This document explains in detail and in simple, friendly words **what we built in this step**, **why it was built**, and **how it works under the hood**.

---

## 🎯 The Big Picture

In **Step 7**, we used Babel to automatically wrap every component in a tracker function:
```jsx
const Counter = __track(function Counter() { ... }, "Counter");
```
However, in Step 7, `__track` was just a function name waiting for its implementation.

In **Step 8**, we built the **actual brain and engine** behind `__track`:
1. **The Tracking Registry (`src/analysis/registry.js`)**:
   - Acts as a high-precision stopwatch (`performance.now()`) to measure how many milliseconds each render takes.
   - Acts as a detective that investigates and labels **WHY** each render happened (Initial mount, State change, Props change, Context change, or Parent re-render).
2. **The Event Aggregator (`src/analysis/aggregate.js`)**:
   - Groups raw render passes into clean component summaries: total renders, average render duration, and count of unnecessary renders.

---

## ❓ Why Was This Done? (The Problem We Are Solving)

### 1. Why Component Renders Are Mystery Black Boxes
When a React component runs slow or flickers, developers usually ask two questions:
1. *“How slow is this component taking to render?”*
2. *“Why did it render right now?”*

React itself does not expose why a component rendered. If `<ExpensiveList />` renders 5 times in a row, was it because:
- Its `items` prop changed?
- An internal `useState` updated?
- Or did its parent just update, dragging it along for a pointless redraw?

### 2. The 5 Root Causes of Every React Render
Every single render in React can be classified into one of 5 causes:
- ⚪ **Initial Mount**: The very first time the component appears on the page.
- 🟣 **State Change**: Triggered because `useState` or `useReducer` was called.
- 🔵 **Props Change**: The component received new or changed props from its parent.
- 🟢 **Context Change**: A value provided by `useContext` changed.
- 🟡 **Parent Rendered** *(The Wasted Render!)*: Neither state, props, nor context changed, but because the parent component updated, React forced the child component to re-render anyway!

By building this tracker, our tool can now pinpoint wasted renders with 100% mathematical certainty.

---

## 🛠️ What Was Built in This Step?

### 1. Shallow Props Equality (`shallowEqual` in `src/analysis/registry.js`)
Compares the component's previous props with its new props:
- If all keys and values are identical: props did **not** change.
- If a key changed or an inline object/function was passed with a new reference: props **did** change!

### 2. The `__track` Higher-Order Component (`createTrackerFactory`)
When a component wrapped with `__track` is executed:
1. **Counts renders**: Tracks its render index using a persistent `useRef` instance.
2. **Starts the timer**: Captures `performance.now()` before the component body executes.
3. **Inspects state and props**: Checks if state flags or prop differences triggered this pass.
4. **Executes the real component**: Runs the user's component code inside a `try / finally` block.
5. **Measures duration**: Computes `executionTime = performance.now() - startTime`.
6. **Classifies the cause**:
   - Render 1 ➔ `'initial'`
   - If state changed ➔ `'state'`
   - If props changed ➔ `'props'`
   - If context changed ➔ `'context'`
   - If none of the above ➔ **`'parent'`** (flagged as an unnecessary re-render!)
7. **Logs to Registry**: Stores the event in the central registry.

### 3. Tracked Hooks (`useState`, `useContext`, `useReducer`)
We created wrappers for standard React hooks:
- `createTrackedUseState`: Whenever a component calls `setState(...)`, the registry flags that this specific component scheduled a state update.
- `createTrackedUseContext`: Whenever a consumed context value changes, flags a context update.
- `createTrackedUseReducer`: Flags state updates triggered via `dispatch(...)`.

### 4. The Render Aggregator (`src/analysis/aggregate.js`)
Raw render logs can have dozens of individual timestamps. `aggregateRenderEvents(events)` groups them by component name and calculates:
- `renders`: Total render count (e.g. `2`).
- `unnecessary`: Renders where `causes.includes('parent')` (e.g. `1`).
- `avgDuration`: Average milliseconds per render (e.g. `4.2ms`).
- `totalDuration`: Total time spent rendering (e.g. `8.4ms`).

---

## 🔍 Simulated Example

Imagine `<ExpensiveList />` renders twice during an analysis run:
1. **Render 1**: Initial mount (`causes: ['initial']`, took `8.1ms`).
2. **Render 2**: Parent `<Counter />` clicked (`causes: ['parent']`, took `7.9ms`).

`aggregateRenderEvents` immediately produces:
```json
{
  "name": "ExpensiveList",
  "renders": 2,
  "unnecessary": 1,
  "avgDuration": 8.0,
  "totalDuration": 16.0
}
```
It immediately flags that **1 out of 2 renders was completely unnecessary** and took **8 milliseconds**!

---

## 💡 Summary of Changes

| File | Role |
| :--- | :--- |
| `src/analysis/registry.js` | **New file**: `shallowEqual`, `createRegistry`, `createTrackerFactory` (`__track`), and tracked hooks (`useState`, `useContext`, `useReducer`). |
| `src/analysis/aggregate.js` | **New file**: `aggregateRenderEvents` summarizing raw events into component render counts, durations, and unnecessary passes. |
| `readme/readme_dev_release8.0.md` | Detailed plain-language documentation of Step 8. |

---

## 🗺️ What Comes Next in `dev.release_9.0`?
Now that we have the **AST Transform** (Step 7) and the **Tracking Registry** (Step 8), the next step is **mounting the code live**:
- Building **`src/sandbox/Sandbox.jsx`** and **`src/sandbox/ErrorBoundary.jsx`**.
- Mounting the instrumented root off-screen for ~350ms inside the real React reconciler.
- Collecting the live render events and passing them back to our UI!
