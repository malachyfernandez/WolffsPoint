import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  DeviceTier,
  MemoryPolicy,
  MemoryPressure,
  detectDeviceTier,
  maxPressure,
  policyFor,
  readHeapPressure,
} from '../utils/memoryTier';

/**
 * Adaptive memory management.
 *
 * `MemoryPressureProvider` computes the device tier once, then watches runtime
 * pressure (heap ratio where supported — Chrome; Safari/Firefox stay at the
 * tier's baseline policy since they expose no memory signal).
 *
 * Two protection mechanisms keep culling safe:
 * - `MemoryScope` — labels a subtree (usually a tab pane) so minimized dialogs
 *   can record which scope owns their host component.
 * - Pin registry — MinimizeProvider registers a pin per dirty minimized
 *   dialog; the tab LRU refuses to evict a scope that owns pinned minimized
 *   dialogs (their `onRestore` lives in that subtree — evicting it would
 *   strand the card and lose the draft).
 */

interface MemoryContextValue {
  tier: DeviceTier;
  pressure: MemoryPressure;
  policy: MemoryPolicy;
  /** scopeIds that currently own pinned (dirty) minimized dialogs. */
  pinnedScopes: ReadonlySet<string>;
  setPin: (id: string, scopeId: string | null, pinned: boolean) => void;
  removePin: (id: string) => void;
}

const MemoryPressureContext = createContext<MemoryContextValue | null>(null);

const MemoryScopeContext = createContext<string | null>(null);

/** Label a subtree so descendants' pins can be attributed back to it. */
export const MemoryScope = ({ id, children }: { id: string; children: React.ReactNode }) => (
  <MemoryScopeContext.Provider value={id}>{children}</MemoryScopeContext.Provider>
);

export const useMemoryScope = () => useContext(MemoryScopeContext);

const TIER_BASELINE: Record<DeviceTier, MemoryPressure> = {
  high: 'none',
  medium: 'none',
  // Low-tier (old iOS etc.): always run elevated culling — Jetsam gives no warning.
  low: 'elevated',
};

const HEAP_POLL_MS = 5000;

export const MemoryPressureProvider = ({ children }: { children: React.ReactNode }) => {
  const tier = useMemo(detectDeviceTier, []);
  const [runtimePressure, setRuntimePressure] = useState<MemoryPressure>('none');
  // Separate signal from runtimePressure: on iOS, Jetsam kills *backgrounded*
  // tabs to reclaim RAM. Shrinking our resident footprint while hidden is the
  // difference between surviving and the "a problem occurred" reload. It
  // lifts instantly on return — no de-escalation delay.
  const [backgrounded, setBackgrounded] = useState(false);
  const pinsRef = useRef(new Map<string, { scopeId: string | null; pinned: boolean }>());
  const [pinnedScopes, setPinnedScopes] = useState<ReadonlySet<string>>(new Set());

  const rebuildScopes = useCallback(() => {
    const scopes = new Set<string>();
    pinsRef.current.forEach((p) => {
      if (p.pinned && p.scopeId) scopes.add(p.scopeId);
    });
    setPinnedScopes(scopes);
  }, []);

  const setPin = useCallback(
    (id: string, scopeId: string | null, pinned: boolean) => {
      const prev = pinsRef.current.get(id);
      if (prev && prev.scopeId === scopeId && prev.pinned === pinned) return;
      pinsRef.current.set(id, { scopeId, pinned });
      rebuildScopes();
    },
    [rebuildScopes]
  );

  const removePin = useCallback(
    (id: string) => {
      if (!pinsRef.current.delete(id)) return;
      rebuildScopes();
    },
    [rebuildScopes]
  );

  // Poll JS heap where the engine exposes it. Escalation is one-way ratchet
  // within a window — dropping back requires sustained relief (heap ratio is
  // noisy while GC runs).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let reliefStreak = 0;
    const id = setInterval(() => {
      const reading = readHeapPressure();
      if (!reading) {
        clearInterval(id);
        return;
      }
      setRuntimePressure((prev) => {
        if (reading.pressure === 'none' || reading.pressure === 'elevated') {
          reliefStreak += 1;
          // ~15s of sustained relief de-escalates one step
          if (reliefStreak >= 3 && prev !== 'none') {
            reliefStreak = 0;
            const order: MemoryPressure[] = ['none', 'elevated', 'high', 'critical'];
            return order[order.indexOf(prev) - 1];
          }
          return prev;
        }
        reliefStreak = 0;
        return maxPressure(prev, reading.pressure);
      });
    }, HEAP_POLL_MS);
    return () => clearInterval(id);
  }, []);

  // Escalate while the page is hidden/frozen. `visibilitychange` covers tab
  // switches and app-switcher; `pagehide` fires when iOS backgrounds Safari;
  // `freeze` is Chromium's pre-freeze signal. All reduce to the same state.
  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    const onVis = () => setBackgrounded(document.visibilityState === 'hidden');
    const onHide = () => setBackgrounded(true);
    const onShow = () => setBackgrounded(false);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', onHide);
    window.addEventListener('pageshow', onShow);
    document.addEventListener('freeze', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener('pageshow', onShow);
      document.removeEventListener('freeze', onHide);
    };
  }, []);

  const pressure = maxPressure(
    maxPressure(TIER_BASELINE[tier], runtimePressure),
    backgrounded ? 'high' : 'none'
  );
  const policy = useMemo(() => policyFor(tier, pressure), [tier, pressure]);

  const value = useMemo(
    () => ({ tier, pressure, policy, pinnedScopes, setPin, removePin }),
    [tier, pressure, policy, pinnedScopes, setPin, removePin]
  );

  return <MemoryPressureContext.Provider value={value}>{children}</MemoryPressureContext.Provider>;
};

const FALLBACK: MemoryContextValue = {
  tier: 'high',
  pressure: 'none',
  policy: policyFor('high', 'none'),
  pinnedScopes: new Set(),
  setPin: () => {},
  removePin: () => {},
};

export const useMemoryPolicy = () => useContext(MemoryPressureContext) ?? FALLBACK;
