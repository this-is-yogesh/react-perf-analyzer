# Step 9: Off-Screen Sandbox Runner & Error Boundary

This document explains in detail and in simple, friendly words **what was built in this step**, **why it was built**, and **how it works under the hood**.

---

## 🎯 The Big Picture

In the previous two steps:
- **Step 7 (`transform.js`)**: We used Babel to transform the pasted React code and wrap every component with a tracking wrapper named `__track`.
- **Step 8 (`registry.js` & `aggregate.js`)**: We built the measurement sensors—measuring execution speed with `performance.now()` and classifying the 5 root causes of every render (Initial, State, Props, Context, Parent).

However, code sitting on a screen is just text. React components only come alive when React actually **mounts and renders them**!

In **Step 9**, we built the **Off-Screen Sandbox Runner & Error Boundary**:
1. **The Sandbox (`src/sandbox/Sandbox.jsx`)**: An invisible mini-stage inside the browser where the user's React component tree is mounted, executed, and timed for a brief **350-millisecond settle window**.
2. **The Error Boundary (`src/sandbox/ErrorBoundary.jsx`)**: A protective safety shield that catches any runtime errors or bugs in the pasted code so the main analyzer app never crashes.
3. **App Integration (`src/App.jsx`)**: When the user clicks **Analyze**, the app mounts the sandbox, collects the live render events, aggregates the statistics, and presents the results.

---

## ❓ Why Was This Done? (The Problems We Solved)

### 1. Static Analysis Isn't Enough: We Must Run the Code
You cannot accurately measure how many milliseconds a component takes to render just by reading the code. You have to actually **execute it in the real React reconciler**.
- By mounting the code inside our React app, we let React execute the real hooks (`useState`, `useEffect`, etc.).
- Our custom `__track` wrapper records every single render pass, duration, and reason in real time.

### 2. Protecting the Main App with an Error Boundary
What if a user pastes broken React code?
For example:
```jsx
function BrokenComponent() {
  const items = null;
  return <div>{items.map(i => <span key={i}>{i}</span>)}</div>; // Throws TypeError!
}
```
In standard React, an uncaught runtime error during render crashes the entire website and leaves the user staring at a completely blank white screen.

**The Solution**: We wrapped the sandbox inside `<SandboxErrorBoundary>`. If the user's component crashes:
- The error boundary catches the exception instantly.
- It prevents the crash from bubbling up to the analyzer UI.
- It displays a clean, helpful error message to the user: *"Runtime error while rendering: Cannot read properties of null (reading 'map')"*.

### 3. Why the 350ms Settle Window?
When a React component mounts, it usually triggers a flurry of initial activity:
1. The first render pass runs.
2. `useEffect` hooks run right after mounting.
3. If an effect triggers a state update, a second render pass happens immediately.

If we stopped the sandbox after 1 millisecond, we would miss that initial reactive churn!
By giving the sandbox a **350-millisecond settle window (`SETTLE_MS = 350`)**:
- React finishes mounting.
- Initial microtasks and immediate effects complete.
- We capture the true initial render profile before quietly gathering the recorded events and unmounting.

---

## 🛠️ What Was Built in This Step?

### 1. `SandboxErrorBoundary` (`src/sandbox/ErrorBoundary.jsx`)
A specialized React class component:
- Implements `getDerivedStateFromError(error)` to prevent React from unmounting the whole app.
- Implements `componentDidCatch(error)` to notify the parent via `this.props.onError(error)`.
- Renders `null` if an error occurs, cleanly isolating the failure.

```jsx
export class SandboxErrorBoundary extends Component {
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error) {
    if (this.props.onError) {
      this.props.onError(error);
    }
  }
  render() {
    if (this.state.error) return null;
    return this.props.children;
  }
}
```

### 2. Isolated Root Component Builder (`buildRoot` in `src/sandbox/Sandbox.jsx`)
Takes the instrumented code from Step 7 and creates a fresh running environment:
1. Instantiates a clean `createRegistry()` to store render events.
2. Creates the `__track` factory linked to the active React instance and registry.
3. Prepares `TrackedReact`—injecting tracked versions of `useState`, `useContext`, and `useReducer`.
4. Uses `new Function('React', '__track', ...)` to evaluate the instrumented source string and return the root component (e.g., `<Counter />` or `<App />`).

### 3. Invisible Off-Screen Mounting
The component tree is rendered into the DOM, but completely invisible to both sighted users and screen readers:
```jsx
<div
  aria-hidden="true"
  style={{
    position: 'absolute',
    width: 1,
    height: 1,
    overflow: 'hidden',
    opacity: 0,
    pointerEvents: 'none',
  }}
>
  <SandboxErrorBoundary key={runId} onError={handleError}>
    <RootComponent />
  </SandboxErrorBoundary>
</div>
```
- **Why in the DOM?** Because React hooks and DOM refs need a real browser environment.
- **Why invisible?** It has 0 opacity, 1px size, and `pointerEvents: 'none'` so it doesn't interrupt or cover any user interface.

### 4. Seamless Workflow in `src/App.jsx`
When the user clicks the **Analyze** button:
1. **Static Analysis & Instrumentation**: Babel parses the code and generates the instrumented version.
2. **Launch Sandbox**: Sets `status = 'analyzing'` and mounts `<Sandbox runId={runId} instrumented={instrumented} ... />`.
3. **Capture Events**: After 350ms, the sandbox calls `onSettled(events)`.
4. **Aggregate & Present**: `aggregateRenderEvents(events)` groups the events, saves the `renderStats`, unmounts the sandbox, and switches `status = 'results'`.

---

## 🔬 What Happens When You Click "Analyze" (Step-by-Step)

```text
[User clicks "Analyze"]
       │
       ▼
1. AST Inspection (Step 3-6)
   - Checks syntax & detects static anti-patterns.
       │
       ▼
2. Code Instrumentation (Step 7)
   - Strips imports/exports, wraps components in __track.
       │
       ▼
3. Launch Sandbox (Step 9)
   - Builds RootComponent with TrackedReact & __track.
   - Mounts <RootComponent /> inside <SandboxErrorBoundary> off-screen.
       │
       ▼
4. Realtime Measurement (Step 8)
   - Components mount and render.
   - __track measures execution duration (ms) and detects render causes.
   - Waits 350ms for initial lifecycle effects to settle.
       │
       ▼
5. Settlement & Aggregation
   - onSettled(events) sends captured passes to aggregateRenderEvents.
   - Results panel displays complete diagnostics & active sandbox summary!
```

---

## 💡 Summary of Changes

| File | Role |
| :--- | :--- |
| `src/sandbox/ErrorBoundary.jsx` | **New file**: Safety boundary catching sandboxed runtime exceptions to keep the host app stable. |
| `src/sandbox/Sandbox.jsx` | **New file**: Off-screen runner executing the instrumented code for 350ms and gathering render metrics. |
| `src/App.jsx` | Connected `Sandbox`, `runId`, `handleSettled`, and `handleRuntimeError`. |
| `src/components/ResultsPanel.jsx` | Updated to display the active sandbox execution badge and total events captured. |
| `readme/readme_dev_release9.0.md` | Detailed plain-language documentation of Step 9. |

---

## 🗺️ What Comes Next in `dev.release_10.0`?

Now that our off-screen sandbox runs live and records real render passes:
- In **Step 10**, we will build the **Render Summary Table & Render Causes UI** in `ResultsPanel.jsx`:
  - A clean table listing each component with its **Render Count**, **Average Render Duration (ms)**, and **Unnecessary Renders**.
  - Visual color-coded pill tags showing exactly why each render occurred (⚪ Initial Mount, 🔵 Props Change, 🟣 State Update, 🟡 Parent Re-render).
