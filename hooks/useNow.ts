import { useEffect, useState } from 'react';
import { useBodyReportEnabled } from '../contexts/BodyReadinessContext';

/**
 * Shared clock. Replaces per-component `setInterval(() => setNow(new Date()))`
 * timers — every caller had its own interval, and they kept re-rendering
 * their subtrees forever, including inside hidden-but-mounted tab panes.
 *
 * - One real interval per cadence, shared across all subscribers.
 * - Subscribers inside a hidden `BodyReportScope` (inactive tab) unsubscribe
 *   entirely — zero ticking while the pane can't be seen.
 * - All ticking stops while the document itself is hidden (backgrounded tab),
 *   then fires once on return so displayed times snap to the real clock.
 */

type Callback = () => void;

interface TickGroup {
  callbacks: Set<Callback>;
  timer: ReturnType<typeof setInterval> | null;
}

const groups = new Map<number, TickGroup>();
let visibilityBound = false;
let docHidden = false;

const startGroupTimer = (ms: number, g: TickGroup) => {
  if (g.timer) return;
  g.timer = setInterval(() => {
    g.callbacks.forEach((cb) => cb());
  }, ms);
};

const stopAllTimers = () => {
  groups.forEach((g) => {
    if (g.timer) {
      clearInterval(g.timer);
      g.timer = null;
    }
  });
};

const resumeAll = () => {
  groups.forEach((g, ms) => {
    g.callbacks.forEach((cb) => cb()); // snap to real time immediately
    startGroupTimer(ms, g);
  });
};

const bindVisibility = () => {
  if (visibilityBound || typeof document === 'undefined') return;
  visibilityBound = true;
  docHidden = document.visibilityState === 'hidden';
  document.addEventListener('visibilitychange', () => {
    docHidden = document.visibilityState === 'hidden';
    if (docHidden) stopAllTimers();
    else resumeAll();
  });
};

const subscribe = (ms: number, cb: Callback): (() => void) => {
  bindVisibility();
  let g = groups.get(ms);
  if (!g) {
    g = { callbacks: new Set(), timer: null };
    groups.set(ms, g);
  }
  g.callbacks.add(cb);
  if (!docHidden) startGroupTimer(ms, g);
  return () => {
    const group = groups.get(ms);
    if (!group) return;
    group.callbacks.delete(cb);
    if (group.callbacks.size === 0) {
      if (group.timer) clearInterval(group.timer);
      groups.delete(ms);
    }
  };
};

/**
 * Returns a `Date` that re-renders every `intervalMs` (default 1s).
 * Passive while this component's pane or the document is hidden.
 */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  const enabled = useBodyReportEnabled();

  useEffect(() => {
    if (!enabled) return;
    const update = () => setNow(new Date());
    const unsub = subscribe(intervalMs, update);
    // Catch up once on (re)subscription — a hidden pane's `now` is stale.
    update();
    return unsub;
  }, [intervalMs, enabled]);

  return now;
}
