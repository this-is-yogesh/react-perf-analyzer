# Step 4: Detecting Heavy Computations & Loops in Render (useMemo Checker)

This document explains in simple, friendly words **what we built in this step**, **why it was built**, and **how it works under the hood**.

---

## 🎯 The Big Picture

In **Step 3**, our analyzer learned to spot problems in the props you pass down (like `onClick={() => ...}` or `style={{ padding: 8 }}`).

In **Step 4**, we taught our analyzer to look **inside the component's body** and detect **heavy mathematical work or loops** (like `.slice().sort().map()` or `for` loops) that run on every single render.

Now, our tool flags when you should be using **`useMemo`** to cache expensive work!

---

## ❓ Why Was This Done? (The Problem in Simple Words)

### 1. How React Components Work
Whenever a state variable changes (for example, clicking a "Count: +1" button):
- React re-runs the whole component function from line 1 to the end.
- Every variable declared inside that function is re-calculated from scratch.

### 2. The Trap of Heavy Calculations in Render
Look at this code from our starter snippet:

```jsx
function ExpensiveList({ items }) {
  // ⚠️ Runs on EVERY single render!
  const sorted = items.slice().sort((a, b) => a - b).map((n) => n * 2);

  return (
    <ul>{sorted.map(n => <li key={n}>{n}</li>)}</ul>
  );
}
```

Notice what happens here:
1. When you click the counter button in the parent component, `ExpensiveList` re-renders.
2. Even though the `items` list did not change at all, JavaScript still executes:
   - `.slice()` (copies the whole array)
   - `.sort()` (sorts every number)
   - `.map()` (multiplies every number by 2)
3. If this list has 5,000 or 10,000 items, doing this on every keystroke or click causes **laggy scrolling, delayed clicks, and high CPU usage**.

### 3. The Solution: `useMemo`
React provides a built-in hook called `useMemo`. It works like a **smart notepad**:
```jsx
// ✅ Only re-calculates when `items` changes!
const sorted = useMemo(() => {
  return items.slice().sort((a, b) => a - b).map((n) => n * 2);
}, [items]);
```
With `useMemo`, React calculates the result once and remembers it. If the component re-renders for any other reason, React simply re-uses the cached answer from its notepad!

---

## 🛠️ What Was Built in This Step?

We added two powerful checks to our static analyzer and updated the UI:

### 1. Chained Array Operations Detector (`src/analysis/staticAnalyzer.js`)
We inspect the code's Abstract Syntax Tree (AST) for heavy array methods:
- `.filter()`
- `.map()`
- `.sort()`
- `.reduce()`
- `.slice()`

If a component chains 2 or more of these together (or runs `.sort()` directly in render):
- It flags the issue with **HIGH severity** (coral red).
- It counts how many methods were chained (e.g. `3 array operations: .slice().sort().map()`).
- It attributes the problem to the exact component (e.g. `<ExpensiveList />` on line 3).
- It provides a clear fix recommendation: *"Wrap this calculation in useMemo so it only re-runs when its input dependencies change."*

### 2. Render Loop Detector (`ForStatement`, `WhileStatement`)
If someone writes a traditional `for` or `while` loop directly inside the component body:
- It flags it with **HIGH severity**.
- It warns that looping directly in render will block the browser UI on every update.
- It advises moving the loop into `useMemo` or a helper function.

### 3. Smart Hook Immunity (`isInsideHookCallback`)
Our analyzer is smart: if you **already wrapped** your calculation inside `useMemo` or `useEffect`, the analyzer sees that and will **not** flag an issue. It only complains when expensive code is left unprotected in the render body.

### 4. High-Severity UI Highlighting (`ResultsPanel.jsx` & CSS)
We enhanced the Results Panel so developers can quickly prioritize:
- **Medium Severity issues** (like inline callbacks) display in warning amber.
- **High Severity issues** (like expensive chained calculations or loops) display with a bold coral-red border and a `HIGH` badge.

---

## 🔍 Real Example in Action

When you analyze our starter snippet today, the tool now detects all **3 real-world performance problems**:

1. **🔴 HIGH SEVERITY (Line 13 in `<ExpensiveList />`)**:
   - **Title**: `Expensive computation in <ExpensiveList />`
   - **What happened**: A chain of 3 array operations (`.slice().sort().map()`) executes directly in render.
   - **💡 Fix**: Wrap in `useMemo`.

2. **🟡 MEDIUM SEVERITY (Line 29 in `<Counter />`)**:
   - **Title**: `Inline function passed to "onClick"`
   - **What happened**: Arrow function recreated on every render.
   - **💡 Fix**: Wrap in `useCallback`.

3. **🟡 MEDIUM SEVERITY (Line 30 in `<Counter />`)**:
   - **Title**: `Inline object passed to "style"`
   - **What happened**: Object literal `{ padding: 8 }` recreated on every render.
   - **💡 Fix**: Wrap in `useMemo` or hoist outside.

---

## 💡 Summary
With Step 4 complete, our static analysis engine can now detect both:
1. **Outer prop mistakes** (inline functions, objects, arrays).
2. **Inner calculation mistakes** (expensive array chains, unmemoized loops).
