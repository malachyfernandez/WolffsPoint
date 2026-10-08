import { useEffect, useRef, useState } from 'react';
import { useMemoryPolicy } from '../contexts/MemoryPressureContext';

/**
 * A `mountedTabs` manager: keeps visited tabs mounted for instant warm
 * revisits, but bounds the set under memory pressure by evicting the
 * least-recently-active hidden panes.
 *
 * Safety rules:
 * - The active tab is never evicted.
 * - A pane whose scopeId owns a pinned minimized dialog (unsaved edits) is
 *   never evicted — its `onRestore` closure lives in that subtree.
 * - Evictions are deferred by `policy.tabEvictDelayMs` after a tab hides, so
 *   rapid A→B→A switching stays warm even on the tightest policy.
 * - An evicted tab re-mounts on next visit — identical to the existing
 *   lazy-mount first-visit path.
 */
export function useBoundedMountedTabs<T extends string>(
  activeTab: T,
  scopeIdForTab: (tab: T) => string,
  onEvict?: (tab: T) => void
): ReadonlySet<T> {
  const { policy, pinnedScopes } = useMemoryPolicy();

  // Order = least-recently-active → most-recently-active.
  const [order, setOrder] = useState<T[]>([activeTab]);
  const orderRef = useRef(order);
  orderRef.current = order;
  const evictTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onEvictRef = useRef(onEvict);
  onEvictRef.current = onEvict;

  useEffect(() => {
    // Move the active tab to most-recently-active so the LRU reflects real use.
    setOrder((prev) => {
      const idx = prev.indexOf(activeTab);
      if (idx === -1) return [...prev, activeTab];
      if (idx === prev.length - 1) return prev;
      return [...prev.slice(0, idx), ...prev.slice(idx + 1), activeTab];
    });
  }, [activeTab]);

  useEffect(() => {
    const evict = () => {
      const prev = orderRef.current;
      const hidden = prev.filter((t) => t !== activeTab);
      const excess = hidden.length - policy.maxHiddenTabs;
      if (excess <= 0) return;

      const evictable = hidden.filter((t) => !pinnedScopes.has(scopeIdForTab(t)));
      const dropped = evictable.slice(0, Math.min(excess, evictable.length));
      if (dropped.length === 0) return;

      // Notify before the unmount — a dead scope's stale minimized cards
      // (non-pinned only) go with it.
      dropped.forEach((t) => onEvictRef.current?.(t));
      const drop = new Set(dropped);
      setOrder((curr) => curr.filter((t) => !drop.has(t)));
    };

    // Debounce: wait tabEvictDelayMs of quiescence before culling, so a quick
    // tab bounce doesn't pay a re-mount.
    if (evictTimerRef.current) clearTimeout(evictTimerRef.current);
    evictTimerRef.current = setTimeout(evict, policy.tabEvictDelayMs);
    return () => {
      if (evictTimerRef.current) clearTimeout(evictTimerRef.current);
    };
  }, [order, activeTab, policy.maxHiddenTabs, policy.tabEvictDelayMs, pinnedScopes, scopeIdForTab]);

  // The active tab is always considered mounted — the order-state effect that
  // records it lands one render after the press, and we don't want a frame of
  // empty pane in between.
  return new Set([...order, activeTab]);
}
