/**
 * Performs a shallow equality comparison between two prop objects.
 * Returns true if both objects have the exact same keys and identical values.
 */
export function shallowEqual(a, b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => Object.is(a[key], b[key]));
}

/**
 * Creates a central tracking registry that records render events
 * and holds pending state/context flags across renders.
 */
export function createRegistry() {
  const events = [];
  const pendingState = new Set();
  const pendingContext = new Set();
  const prevContextValues = new Map();

  return {
    // Flag that a component's state was scheduled for update
    flagState(name) {
      pendingState.add(name);
    },
    consumeStateFlag(name) {
      const had = pendingState.has(name);
      pendingState.delete(name);
      return had;
    },

    // Flag that context value changed
    flagContext(name) {
      pendingContext.add(name);
    },
    consumeContextFlag(name) {
      const had = pendingContext.has(name);
      pendingContext.delete(name);
      return had;
    },

    prevContextValues,

    // Record an individual component render pass
    recordRender(name, info) {
      events.push({ name, ts: Date.now(), ...info });
    },

    // Get all recorded events
    getEvents() {
      return events;
    },
  };
}

/**
 * Builds the __track Higher-Order Component (HOC).
 * Wraps every target component to:
 * 1. Count renders and track instances via useRef.
 * 2. Measure render duration in milliseconds using performance.now().
 * 3. Classify why the component rendered (initial, state, props, context, or parent).
 *
 * @param {object} RealReact - The active React runtime
 * @param {object} registry - The tracking registry instance
 * @param {string[]} renderStack - Stack tracking current rendering component
 */
export function createTrackerFactory(RealReact, registry, renderStack) {
  return function __track(ComponentImpl, displayName) {
    function Tracked(props) {
      const instanceRef = RealReact.useRef(null);
      if (instanceRef.current === null) {
        instanceRef.current = { count: 0, prevProps: null };
      }
      const inst = instanceRef.current;
      inst.count += 1;
      const isInitial = inst.count === 1;

      // Start high-resolution timer
      const start = typeof performance !== 'undefined' ? performance.now() : Date.now();

      // Check if state changed or props changed
      const stateFlag = registry.consumeStateFlag(displayName);
      const propsChanged = isInitial ? false : !shallowEqual(inst.prevProps, props);
      inst.prevProps = props;

      // Push to renderStack so tracked hooks know which component called them
      renderStack.push(displayName);
      let result;
      try {
        result = ComponentImpl(props);
      } finally {
        renderStack.pop();
      }

      // Check if context changed
      const contextFlag = registry.consumeContextFlag(displayName);

      // Measure total execution time
      const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - start;

      // Classify the root cause(s) of this render
      const causes = [];
      if (isInitial) {
        causes.push('initial');
      } else {
        if (stateFlag) causes.push('state');
        if (propsChanged) causes.push('props');
        if (contextFlag) causes.push('context');
        // If neither state, props, nor context changed, it was triggered solely by parent rendering
        if (causes.length === 0) causes.push('parent');
      }

      // Record to registry
      registry.recordRender(displayName, {
        duration,
        causes,
        isInitial,
        renderIndex: inst.count,
      });

      return result;
    }

    Tracked.displayName = `Tracked(${displayName})`;
    return Tracked;
  };
}

/**
 * Intercepts useState to flag the calling component whenever setState is called.
 */
export function createTrackedUseState(RealReact, registry, renderStack) {
  return function useStateTracked(initial) {
    const owner = renderStack[renderStack.length - 1] || '(unknown)';
    const [state, setStateOrig] = RealReact.useState(initial);

    const setState = RealReact.useCallback(
      (update) => {
        registry.flagState(owner);
        setStateOrig(update);
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [owner]
    );

    return [state, setState];
  };
}

/**
 * Intercepts useContext to flag when context value changes.
 */
export function createTrackedUseContext(RealReact, registry, renderStack) {
  return function useContextTracked(Context) {
    const owner = renderStack[renderStack.length - 1] || '(unknown)';
    const value = RealReact.useContext(Context);
    const key = `${owner}|${Context.displayName || Context._contextKey || 'ctx'}`;

    if (registry.prevContextValues.has(key)) {
      const prev = registry.prevContextValues.get(key);
      if (!Object.is(prev, value)) {
        registry.flagContext(owner);
      }
    }
    registry.prevContextValues.set(key, value);

    return value;
  };
}

/**
 * Intercepts useReducer to flag when dispatch is called.
 */
export function createTrackedUseReducer(RealReact, registry, renderStack) {
  return function useReducerTracked(reducer, initialArg, init) {
    const owner = renderStack[renderStack.length - 1] || '(unknown)';
    const [state, dispatchOrig] = RealReact.useReducer(reducer, initialArg, init);

    const dispatch = RealReact.useCallback(
      (action) => {
        registry.flagState(owner);
        dispatchOrig(action);
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [owner]
    );

    return [state, dispatch];
  };
}
