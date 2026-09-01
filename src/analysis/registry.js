export function shallowEqual(a, b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => Object.is(a[key], b[key]));
}

export function createRegistry() {
  const events = [];
  const pendingState = new Set();
  const pendingContext = new Set();
  const prevContextValues = new Map();

  return {
    flagState(name) {
      pendingState.add(name);
    },
    consumeStateFlag(name) {
      const had = pendingState.has(name);
      pendingState.delete(name);
      return had;
    },
    flagContext(name) {
      pendingContext.add(name);
    },
    consumeContextFlag(name) {
      const had = pendingContext.has(name);
      pendingContext.delete(name);
      return had;
    },
    prevContextValues,
    recordRender(name, info) {
      events.push({ name, ts: Date.now(), ...info });
    },
    getEvents() {
      return events;
    },
  };
}

/** Builds the __track HOC. `RealReact` must be the actual React runtime (host app's React),
 *  since Tracked itself is a genuine component React will call. */
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
      const start = typeof performance !== 'undefined' ? performance.now() : Date.now();

      const stateFlag = registry.consumeStateFlag(displayName);
      const propsChanged = isInitial ? false : !shallowEqual(inst.prevProps, props);
      inst.prevProps = props;

      renderStack.push(displayName);
      let result;
      try {
        result = ComponentImpl(props);
      } finally {
        renderStack.pop();
      }

      const contextFlag = registry.consumeContextFlag(displayName);
      const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - start;

      const causes = [];
      if (isInitial) {
        causes.push('initial');
      } else {
        if (stateFlag) causes.push('state');
        if (propsChanged) causes.push('props');
        if (contextFlag) causes.push('context');
        if (causes.length === 0) causes.push('parent');
      }

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

export function createTrackedUseContext(RealReact, registry, renderStack) {
  return function useContextTracked(Context) {
    const owner = renderStack[renderStack.length - 1] || '(unknown)';
    const value = RealReact.useContext(Context);
    const key = owner + '|' + (Context.displayName || Context._contextKey || 'ctx');
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
