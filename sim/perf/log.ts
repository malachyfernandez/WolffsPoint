/**
 * sim/perf/log.ts
 *
 * PerfLog — the audit's measurement core. Collects:
 *  - long tasks (PerformanceObserver 'longtask')
 *  - event latencies (PerformanceObserver 'event', when available)
 *  - React Profiler commits (fed by <SimProfiler> boundaries)
 *  - DOM mutation bursts (MutationObserver, active during windows)
 *  - mock backend query/mutation timings + subscription counts
 *  - frame timing during measurement windows (rAF loop)
 */

export type StepKind =
  | 'navigate'
  | 'tab'
  | 'modal-open'
  | 'modal-close'
  | 'scroll'
  | 'action'
  | 'boot'
  | 'note';

export interface FrameStats {
  count: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
  /** frames slower than 50ms */
  slowFrames: number;
  /** estimated fps over window */
  fps: number;
}

export interface ProfilerAggregate {
  boundaryId: string;
  commits: number;
  totalActualMs: number;
  maxActualMs: number;
  totalBaseMs: number;
}

export interface StepResult {
  id: string;
  label: string;
  kind: StepKind;
  startedAt: number;
  durationMs: number;
  firstPaintMs: number | null;
  settleMs: number;
  frames: FrameStats | null;
  longTasks: { count: number; totalMs: number; worstMs: number };
  profilers: ProfilerAggregate[];
  mutations: { name: string; ms: number }[];
  queriesRun: number;
  activeConvexQueries: number;
  activeDataSubs: number;
  heapMb: number | null;
  /** number of MutationObserver records seen during the window — nonzero
   *  long after an action means something keeps mutating the DOM (pollers,
   *  style writers, clocks) */
  domMutations: number;
  notes?: string;
  error?: string;
  children?: StepResult[];
}

interface CommitEntry {
  id: string;
  phase: string;
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
}

interface TimedEntry {
  at: number;
  ms: number;
  name: string;
}

function percentile(sorted: number[], p: number) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

class PerfLogImpl {
  commits: CommitEntry[] = [];
  longTasks: { at: number; ms: number }[] = [];
  eventLatencies: { at: number; ms: number; name: string }[] = [];
  mutations: TimedEntry[] = [];
  querySubscribes: { at: number; name: string }[] = [];
  steps: StepResult[] = [];
  installed = false;
  enabled = true;

  install() {
    if (this.installed || typeof window === 'undefined') return;
    this.installed = true;
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          this.longTasks.push({ at: e.startTime, ms: e.duration });
        }
      }).observe({ entryTypes: ['longtask'] });
    } catch {}
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as any[]) {
          if (e.duration >= 40) {
            this.eventLatencies.push({ at: e.startTime, ms: e.duration, name: e.name });
          }
        }
      }).observe({ type: 'event', durationThreshold: 40 } as any);
    } catch {}
  }

  reset() {
    this.commits = [];
    this.longTasks = [];
    this.eventLatencies = [];
    this.mutations = [];
    this.querySubscribes = [];
    this.steps = [];
  }

  logCommit(id: string, phase: string, actualDuration: number, baseDuration: number, startTime: number, commitTime: number) {
    if (!this.enabled) return;
    this.commits.push({ id, phase, actualDuration, baseDuration, startTime, commitTime });
    if (this.commits.length > 20000) this.commits.splice(0, 5000);
  }

  logMutation(name: string, ms: number) {
    this.mutations.push({ name, ms, at: performance.now() });
  }

  logQuerySubscribe(name: string, at: number) {
    if (!this.enabled) return;
    this.querySubscribes.push({ name, at });
    if (this.querySubscribes.length > 20000) this.querySubscribes.splice(0, 5000);
  }

  note(label: string, notes?: string, error?: string) {
    this.steps.push({
      id: `note-${this.steps.length}`,
      label,
      kind: 'note',
      startedAt: performance.now(),
      durationMs: 0,
      firstPaintMs: null,
      settleMs: 0,
      frames: null,
      longTasks: { count: 0, totalMs: 0, worstMs: 0 },
      profilers: [],
      mutations: [],
      queriesRun: 0,
      activeConvexQueries: 0,
      activeDataSubs: 0,
      heapMb: null,
      domMutations: 0,
      notes,
      error,
    });
  }
}

export const perfLog = new PerfLogImpl();

// ---------------------------------------------------------------------------
// Measurement window
// ---------------------------------------------------------------------------

export interface MeasureWindow {
  end(): Promise<StepResult>;
  setNotes(n: string): void;
  fail(e: unknown): StepResult;
}

interface WindowOpts {
  kind: StepKind;
  /** ms of DOM quiet required to consider the action settled */
  quietMs?: number;
  /** hard cap on waiting for settle */
  timeoutMs?: number;
  /** extra time to keep measuring after settle (animation tail) */
  tailMs?: number;
  /** if true, don't wait for settle — caller controls end() */
  manual?: boolean;
}

export function beginWindow(label: string, opts: WindowOpts): MeasureWindow {
  perfLog.install();
  const t0 = performance.now();
  const quietMs = opts.quietMs ?? 250;
  const timeoutMs = opts.timeoutMs ?? 8000;
  const tailMs = opts.tailMs ?? 0;

  const commitOffset = perfLog.commits.length;
  const longTaskOffset = perfLog.longTasks.length;
  const mutationOffset = perfLog.mutations.length;
  const queryOffset = perfLog.querySubscribes.length;

  const frameDeltas: number[] = [];
  let lastFrame = t0;
  let rafRunning = true;
  let lastMutationAt = t0;
  let firstMutationAt: number | null = null;
  let mutationsSeen = 0;
  let notes: string | undefined;

  const raf = (t: number) => {
    if (!rafRunning) return;
    frameDeltas.push(t - lastFrame);
    lastFrame = t;
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);

  let observer: MutationObserver | null = null;
  if (typeof MutationObserver !== 'undefined') {
    observer = new MutationObserver((records) => {
      mutationsSeen += records.length;
      lastMutationAt = performance.now();
      if (firstMutationAt === null) firstMutationAt = lastMutationAt;
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });
  }

  const finish = (): StepResult => {
    rafRunning = false;
    observer?.disconnect();
    const end = performance.now();

    const commits = perfLog.commits.slice(commitOffset);
    const longTasks = perfLog.longTasks.slice(longTaskOffset).filter((t) => t.at >= t0 - 5);
    const mutations = perfLog.mutations.slice(mutationOffset);
    const queries = perfLog.querySubscribes.slice(queryOffset);

    const sortedFrames = [...frameDeltas].sort((a, b) => a - b);
    const frames: FrameStats = {
      count: frameDeltas.length,
      avgMs: frameDeltas.length ? frameDeltas.reduce((a, b) => a + b, 0) / frameDeltas.length : 0,
      p50Ms: percentile(sortedFrames, 50),
      p95Ms: percentile(sortedFrames, 95),
      maxMs: sortedFrames.length ? sortedFrames[sortedFrames.length - 1] : 0,
      slowFrames: frameDeltas.filter((f) => f > 50).length,
      fps: frameDeltas.length ? Math.min(120, 1000 / (frameDeltas.reduce((a, b) => a + b, 0) / frameDeltas.length || 16.7)) : 0,
    };

    const profilerMap = new Map<string, ProfilerAggregate>();
    for (const c of commits) {
      const agg = profilerMap.get(c.id) ?? {
        boundaryId: c.id,
        commits: 0,
        totalActualMs: 0,
        maxActualMs: 0,
        totalBaseMs: 0,
      };
      agg.commits++;
      agg.totalActualMs += c.actualDuration;
      agg.maxActualMs = Math.max(agg.maxActualMs, c.actualDuration);
      agg.totalBaseMs += c.baseDuration;
      profilerMap.set(c.id, agg);
    }

    let activeDataSubs = 0;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { globalDataStore } = require('../../contexts/DataProvider');
      activeDataSubs = globalDataStore.getActiveSubs().length;
    } catch {}

    const heapMb =
      (performance as any).memory?.usedJSHeapSize != null
        ? Math.round((performance as any).memory.usedJSHeapSize / 1048576)
        : null;

    const settleMs = Math.max(0, lastMutationAt - t0) + quietMs;

    const result: StepResult = {
      id: `step-${perfLog.steps.length}`,
      label,
      kind: opts.kind,
      startedAt: t0,
      durationMs: end - t0,
      firstPaintMs: firstMutationAt !== null ? firstMutationAt - t0 : null,
      settleMs: lastMutationAt === t0 ? 0 : lastMutationAt - t0,
      frames,
      longTasks: {
        count: longTasks.length,
        totalMs: longTasks.reduce((a, b) => a + b.ms, 0),
        worstMs: longTasks.reduce((a, b) => Math.max(a, b.ms), 0),
      },
      profilers: Array.from(profilerMap.values()).sort(
        (a, b) => b.totalActualMs - a.totalActualMs
      ),
      mutations: mutations.map((m) => ({ name: m.name, ms: m.ms })),
      queriesRun: queries.length,
      activeConvexQueries: 0, // filled by caller via mockDb if needed
      activeDataSubs,
      heapMb,
      domMutations: mutationsSeen,
      notes,
    };
    perfLog.steps.push(result);
    return result;
  };

  let settled = false;
  let failResult: StepResult | null = null;

  const settlePromise = opts.manual
    ? Promise.resolve()
    : new Promise<void>((resolve) => {
        const check = () => {
          if (settled) return resolve();
          const now = performance.now();
          const quietFor = now - lastMutationAt;
          if (now - t0 > 300 && quietFor >= quietMs) {
            settled = true;
            if (tailMs > 0) setTimeout(() => resolve(), tailMs);
            else resolve();
            return;
          }
          if (now - t0 >= timeoutMs) {
            settled = true;
            notes = (notes ? notes + ' ' : '') + `(settle timeout ${timeoutMs}ms)`;
            resolve();
            return;
          }
          requestAnimationFrame(check);
        };
        requestAnimationFrame(check);
      });

  return {
    async end() {
      if (failResult) return failResult;
      await settlePromise;
      return finish();
    },
    setNotes(n: string) {
      notes = n;
    },
    fail(e: unknown) {
      rafRunning = false;
      observer?.disconnect();
      failResult = {
        id: `step-${perfLog.steps.length}`,
        label,
        kind: opts.kind,
        startedAt: t0,
        durationMs: performance.now() - t0,
        firstPaintMs: null,
        settleMs: 0,
        frames: null,
        longTasks: { count: 0, totalMs: 0, worstMs: 0 },
        profilers: [],
        mutations: [],
        queriesRun: 0,
        activeConvexQueries: 0,
        activeDataSubs: 0,
        heapMb: null,
        domMutations: mutationsSeen,
        error: e instanceof Error ? e.message : String(e),
      };
      perfLog.steps.push(failResult);
      return failResult;
    },
  };
}
