import { useEffect, useRef, useState } from 'react';
import * as RealReact from 'react';
import { SandboxErrorBoundary } from './ErrorBoundary';
import {
  createRegistry,
  createTrackerFactory,
  createTrackedUseState,
  createTrackedUseContext,
  createTrackedUseReducer,
} from '../analysis/registry';

const SETTLE_MS = 350;

function buildRoot(instrumented) {
  const registry = createRegistry();
  const renderStack = [];
  const __track = createTrackerFactory(RealReact, registry, renderStack);
  const TrackedReact = {
    ...RealReact,
    useState: createTrackedUseState(RealReact, registry, renderStack),
    useContext: createTrackedUseContext(RealReact, registry, renderStack),
    useReducer: createTrackedUseReducer(RealReact, registry, renderStack),
  };

  // eslint-disable-next-line no-new-func
  const factory = new Function(
    'React',
    '__track',
    `"use strict";\n${instrumented.source}\nreturn (typeof ${instrumented.rootExpr} !== "undefined" ? ${instrumented.rootExpr} : null);`
  );
  const RootComponent = factory(TrackedReact, __track);
  if (typeof RootComponent !== 'function') {
    throw new Error(`Could not resolve a renderable component named "${instrumented.rootExpr}".`);
  }
  return { RootComponent, registry };
}

/**
 * Mounts the instrumented root component off-screen (inside the host React tree,
 * so it shares the real reconciler) long enough to collect render events, then
 * reports them back and unmounts.
 */
export function Sandbox({ runId, instrumented, onSettled, onRuntimeError }) {
  const [built, setBuilt] = useState(null);
  const [buildError, setBuildError] = useState(null);
  const registryRef = useRef(null);
  const reportedRef = useRef(false);

  useEffect(() => {
    reportedRef.current = false;
    setBuildError(null);
    setBuilt(null);
    try {
      const result = buildRoot(instrumented);
      registryRef.current = result.registry;
      setBuilt(result);
    } catch (err) {
      onRuntimeError(err);
      setBuildError(err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  useEffect(() => {
    if (!built) return undefined;
    const timer = setTimeout(() => {
      if (reportedRef.current) return;
      reportedRef.current = true;
      onSettled(registryRef.current.getEvents());
    }, SETTLE_MS);
    return () => clearTimeout(timer);
  }, [built, onSettled]);

  const handleError = (err) => {
    if (reportedRef.current) return;
    reportedRef.current = true;
    onRuntimeError(err);
  };

  if (buildError) return null;
  if (!built) return null;

  const { RootComponent } = built;
  return (
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
  );
}
