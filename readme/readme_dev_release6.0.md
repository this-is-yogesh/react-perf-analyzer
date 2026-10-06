# Step 6: Missing `React.memo` & `useCallback` Detection

This document explains in detail and in simple, friendly words **what we built in this step**, **why it was built**, and **how it works under the hood**.

---

## 🎯 The Big Picture

In previous steps, our analyzer learned how to catch mistakes *inside* props (inline objects, callbacks) and *inside* render bodies (heavy array chains, loops), and gave our app a **0–100 score gauge**.

In **Step 6**, we completed the static analysis engine by teaching it to detect the two most famous optimization techniques in React:
1. **Missing `React.memo`**: Finding components that accept props but re-render unnecessarily every time their parent updates.
2. **Missing `useCallback`**: Finding local functions declared inside a component that are passed down to children without being memoized.

---

## ❓ Why Was This Done? (The Problem in Simple Words)

### 1. The Parent-Child Re-render Cascade
By default in React, **when a parent component re-renders, ALL of its child components re-render too**.

Look at our starter code:
```jsx
function Counter() {
  const [count, setCount] = useState(0);
  const items = [5, 3, 8, 1, 9, 2];

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>Count: {count}</button>
      <ExpensiveList items={items} />
    </div>
  );
}
```

Notice what happens every time you click the button:
1. `count` updates from `0` to `1`.
2. `Counter` re-renders.
3. React automatically re-renders `<ExpensiveList />`, **even though `items` never changed**!
4. Inside `ExpensiveList`, all the heavy sorting and mapping runs again for no reason.

### 2. The Fix: `React.memo`
Wrapping `ExpensiveList` in `React.memo` tells React:
> *"Hey React, before you redraw this list, check its props. If `items` is the exact same as last time, SKIP rendering this component completely!"*

```jsx
// ✅ Skips re-rendering if `items` hasn't changed!
const ExpensiveList = React.memo(function ExpensiveList({ items }) {
  ...
});
```

### 3. The Broken Link: Local Functions Without `useCallback`
Now imagine a developer wrote:
```jsx
function Counter() {
  const [count, setCount] = useState(0);
  // ⚠️ Brand new function created on every render!
  const handleReset = () => setCount(0);

  return <ResetButton onReset={handleReset} />;
}
```
Even if `ResetButton` is wrapped in `React.memo`, it will **still re-render** because `handleReset` gets a new memory address on every tick of `Counter`.

Wrapping `handleReset` in `useCallback` keeps the function reference stable across renders.

---

## 🛠️ What Was Built in This Step?

### 1. Missing `React.memo` Checker (`src/analysis/staticAnalyzer.js`)
We inspect all declared React components:
- If a component **accepts props** (`params.length > 0`):
- And is **NOT wrapped in `React.memo` or `memo`**:
- The analyzer flags a **Low Severity** issue:
  - **Title**: `<ExpensiveList /> isn't wrapped in React.memo`
  - **Why it matters**: It accepts props but will re-render whenever its parent renders, even if its props haven't changed.
  - **💡 Fix**: Wrap the component in `React.memo`.

*(Note: If a component takes NO props, like `function App()`, we do not flag it because memoizing a component with no props is unnecessary!)*

### 2. Missing `useCallback` Checker (`src/analysis/staticAnalyzer.js`)
We inspect local function variables inside components:
- If a function is declared inside a component (e.g. `const handleReset = () => ...`).
- And its name is passed into any JSX attribute (e.g. `<Button onClick={handleReset} />`).
- And it is not wrapped in `useCallback`:
- The analyzer flags a **Medium Severity** issue:
  - **Title**: `"handleReset" recreated on every render in <Counter />`
  - **Why it matters**: It is passed down as a prop, giving it a new reference on every render.
  - **💡 Fix**: Wrap `"handleReset"` in `useCallback`.

### 3. Three-Tier Visual Severity Styling (`ResultsPanel.module.css` & `ResultsPanel.jsx`)
We added distinct visual styling for all three severity tiers so developers can easily prioritize fixes:
- 🔴 **High Severity** (`cardHigh`, `badgeHigh`): Bold coral red border & badge (e.g. heavy array chains, loops).
- 🟡 **Medium Severity** (default): Warning amber border & badge (e.g. inline props, missing `useCallback`).
- 🟢 **Low Severity** (`cardLow`, `badgeLow`): Mint green border & badge (e.g. missing `React.memo`).

---

## 🔍 Starter Code Diagnostics Walkthrough

Now, our static analysis engine detects all **4 real-world performance bottlenecks** in the starter code:

| Severity | Location | Issue | Fix | Score Impact |
| :--- | :--- | :--- | :--- | :--- |
| 🔴 **HIGH** | `<ExpensiveList />` (Line 13) | Expensive array chain (`.slice.sort.map`) in render body | Wrap in `useMemo` | **-15 pts** |
| 🟡 **MEDIUM** | `<Counter />` (Line 29) | Inline callback passed to `"onClick"` | Wrap in `useCallback` | **-8 pts** |
| 🟡 **MEDIUM** | `<Counter />` (Line 30) | Inline object passed to `"style"` | Move outside or wrap in `useMemo` | **-8 pts** |
| 🟢 **LOW** | `<ExpensiveList />` (Line 11) | Not wrapped in `React.memo` | Wrap in `React.memo` | **-4 pts** |

### Overall Score:
```
100 (Base) - 15 - 8 - 8 - 4 = 65 / 100 
Health Band: 🟡 Needs Attention
```

---

## 💡 Summary of Changes

- **`src/analysis/staticAnalyzer.js`**: Added AST visitors for `missing-memo` and `missing-usecallback`.
- **`src/components/ResultsPanel.module.css`**: Added `.cardLow` and `.badgeLow` mint-green styles.
- **`src/components/ResultsPanel.jsx`**: Applied dynamic classes for high, medium, and low severity cards.
- **`readme/readme_dev_release6.0.md`**: Detailed plain-language documentation of Step 6.
