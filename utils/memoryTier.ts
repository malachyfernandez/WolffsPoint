import { Platform } from 'react-native';

/**
 * Device memory tiering + runtime memory pressure for adaptive resource culling.
 *
 * Why this exists: iOS Safari has no memory API (Apple blocks `deviceMemory`
 * for anti-fingerprinting) and its process manager (Jetsam) kills a tab's
 * WebContent process outright around ~200–400MB on older devices — the user
 * sees "A problem repeatedly occurred" and loses everything. We can't see
 * remaining RAM, so we infer device tier from the signals Safari *does* expose
 * and scale how much resident UI (mounted tab panes, dialog DOM snapshots)
 * we allow before we start evicting.
 *
 * Signals used:
 * - `navigator.deviceMemory` — Chrome/Android only, bucketed GB (0.25..8+)
 * - `navigator.hardwareConcurrency` — universal; old iPhones (6s–8, SE1/2)
 *   report ≤4 logical cores, modern iPhones report 6+
 * - `performance.memory.usedJSHeapSize` — Chrome only; polled for runtime
 *   escalation toward the heap limit
 * - `document.wasDiscarded` — if the OS already discarded this tab once,
 *   permanently downgrade the tier (learned constraint)
 * - `navigator.userAgent` — iOS version + form factor hints
 */

export type DeviceTier = 'high' | 'medium' | 'low';
export type MemoryPressure = 'none' | 'elevated' | 'high' | 'critical';

export interface MemoryPolicy {
  /** Max hidden (non-active) tab panes kept mounted before LRU eviction. */
  maxHiddenTabs: number;
  /** Grace period after a tab goes hidden before it's eligible for eviction,
   *  so rapid back-and-forth stays warm. */
  tabEvictDelayMs: number;
  /** Keep cloned DOM snapshots for minimized dialog previews. */
  keepMinimizedSnapshots: boolean;
  /** Poll performance.memory for runtime escalation (Chrome only). */
  runtimeEscalation: boolean;
}

const POLICIES: Record<DeviceTier, Record<MemoryPressure, MemoryPolicy>> = {
  high: {
    none:     { maxHiddenTabs: Infinity, tabEvictDelayMs: 3000, keepMinimizedSnapshots: true,  runtimeEscalation: true },
    elevated: { maxHiddenTabs: Infinity, tabEvictDelayMs: 2000, keepMinimizedSnapshots: true,  runtimeEscalation: true },
    high:     { maxHiddenTabs: 4,        tabEvictDelayMs: 1500, keepMinimizedSnapshots: true,  runtimeEscalation: true },
    critical: { maxHiddenTabs: 1,        tabEvictDelayMs: 1000, keepMinimizedSnapshots: false, runtimeEscalation: true },
  },
  medium: {
    none:     { maxHiddenTabs: 5, tabEvictDelayMs: 2500, keepMinimizedSnapshots: true,  runtimeEscalation: true },
    elevated: { maxHiddenTabs: 3, tabEvictDelayMs: 2000, keepMinimizedSnapshots: true,  runtimeEscalation: true },
    high:     { maxHiddenTabs: 2, tabEvictDelayMs: 1500, keepMinimizedSnapshots: false, runtimeEscalation: true },
    critical: { maxHiddenTabs: 1, tabEvictDelayMs: 800,  keepMinimizedSnapshots: false, runtimeEscalation: true },
  },
  low: {
    // Old iOS: keep it lean always — the tab dies hard when it crosses the
    // Jetsam ceiling, so err on culling early.
    none:     { maxHiddenTabs: 2, tabEvictDelayMs: 2000, keepMinimizedSnapshots: true,  runtimeEscalation: false },
    elevated: { maxHiddenTabs: 1, tabEvictDelayMs: 1500, keepMinimizedSnapshots: false, runtimeEscalation: false },
    high:     { maxHiddenTabs: 1, tabEvictDelayMs: 1000, keepMinimizedSnapshots: false, runtimeEscalation: false },
    critical: { maxHiddenTabs: 0, tabEvictDelayMs: 500,  keepMinimizedSnapshots: false, runtimeEscalation: false },
  },
};

export const policyFor = (tier: DeviceTier, pressure: MemoryPressure): MemoryPolicy =>
  POLICIES[tier][pressure];

/** Heuristic iOS version extraction, e.g. "OS 17_5" → 17. */
const iosMajorVersion = (ua: string): number | null => {
  const m = ua.match(/OS (\d+)[_\d]* like Mac OS X/i) ?? ua.match(/CPU (?:iPhone )?OS (\d+)[_\d]*/i);
  return m ? parseInt(m[1], 10) : null;
};

const isIOSUA = (ua: string) =>
  /iP(hone|ad|od)/.test(ua) || (ua.includes('Mac') && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1);

/**
 * Compute the device tier once from static signals. Order of precedence:
 * 1. `document.wasDiscarded` — the OS already killed us once: floor at 'low'.
 * 2. `navigator.deviceMemory` (Chromium): ≤2 low, ≤4 medium, else high.
 * 3. iOS Safari: no memory API → infer from hardwareConcurrency and OS version.
 *    ≤4 cores (iPhone 6s/7/8/SE-era, ≤3GB RAM) → low. iOS <15 → low.
 *    ≤6 cores → medium. More → high.
 * 4. Non-iOS without deviceMemory: cores ≤4 → medium, else high.
 */
export function detectDeviceTier(): DeviceTier {
  if (typeof navigator === 'undefined' || Platform.OS !== 'web') {
    // Native builds have real memory warnings available via the OS; treat as
    // medium — the pressure escalation path can still apply on web only.
    return 'medium';
  }

  const ua = navigator.userAgent ?? '';
  const cores = navigator.hardwareConcurrency ?? 4;
  const deviceMemory = (navigator as any).deviceMemory as number | undefined;
  const discarded = typeof document !== 'undefined' && (document as any).wasDiscarded === true;

  let tier: DeviceTier;

  if (isIOSUA(ua)) {
    const iosVer = iosMajorVersion(ua);
    if (cores <= 4 || (iosVer !== null && iosVer < 15)) {
      tier = 'low';
    } else if (cores <= 6 || (iosVer !== null && iosVer < 17)) {
      tier = 'medium';
    } else {
      tier = 'high';
    }
  } else if (deviceMemory !== undefined) {
    if (deviceMemory <= 2) tier = 'low';
    else if (deviceMemory <= 4) tier = 'medium';
    else tier = 'high';
  } else {
    tier = cores <= 4 ? 'medium' : 'high';
  }

  if (discarded && tier !== 'low') {
    // The OS discarded this tab before — learn from it.
    tier = tier === 'high' ? 'medium' : 'low';
  }
  return tier;
}

/**
 * Runtime pressure read on engines that expose JS heap stats (Chrome/Edge).
 * Returns null when unsupported (Safari/Firefox) — callers should fall back
 * to tier-only policy.
 */
export function readHeapPressure(): { ratio: number; pressure: MemoryPressure } | null {
  if (typeof performance === 'undefined') return null;
  const mem = (performance as any).memory;
  if (!mem || !mem.jsHeapSizeLimit) return null;
  const ratio = mem.usedJSHeapSize / mem.jsHeapSizeLimit;
  if (ratio > 0.9) return { ratio, pressure: 'critical' };
  if (ratio > 0.75) return { ratio, pressure: 'high' };
  if (ratio > 0.6) return { ratio, pressure: 'elevated' };
  return { ratio, pressure: 'none' };
}

const PRESSURE_RANK: Record<MemoryPressure, number> = { none: 0, elevated: 1, high: 2, critical: 3 };

export const maxPressure = (a: MemoryPressure, b: MemoryPressure): MemoryPressure =>
  PRESSURE_RANK[b] > PRESSURE_RANK[a] ? b : a;
