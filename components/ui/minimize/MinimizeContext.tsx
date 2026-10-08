import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useMemoryPolicy } from '../../../contexts/MemoryPressureContext';

/**
 * A minimized dialog entry. The `domClone` is a snapshot of the dialog's
 * DOM at minimize time, rendered scaled-down in the minimize row.
 *
 * `scopeId` records which MemoryScope (typically a tab pane) hosts the
 * dialog component — evicting that pane would strand `onRestore`, so the
 * memory LRU consults it. `pinned` marks entries holding unsaved user state:
 * they protect their scope from eviction and are never culled themselves.
 */
export interface MinimizedEntry {
  id: string;
  title: string;
  domClone: HTMLElement | null;
  originalWidth: number;
  originalHeight: number;
  /** Called when the user clicks the minimized card to restore the dialog. */
  onRestore: () => void;
  /** True while the dialog holds unsaved user state — protects its host scope
   *  from memory eviction and prevents the entry itself being dropped. */
  pinned?: boolean;
  /** MemoryScope id of the subtree mounting the dialog component. */
  scopeId?: string | null;
}

export interface MinimizeContextValue {
  isAvailable: boolean;
  minimized: MinimizedEntry[];
  minimize: (entry: Omit<MinimizedEntry, 'id'>) => string;
  restore: (id: string) => void;
  removeMinimized: (id: string) => void;
  /** Drop unpinned entries owned by an evicted scope — their `onRestore`
   *  closure died with the subtree, so leaving the card would be a dead UI. */
  removeByScope: (scopeId: string) => void;
  clearAll: () => void;
}

const MinimizeContext = createContext<MinimizeContextValue | null>(null);

export const MinimizeContextBridge = ({
  value,
  children,
}: {
  value: MinimizeContextValue;
  children: React.ReactNode;
}) => <MinimizeContext.Provider value={value}>{children}</MinimizeContext.Provider>;

export const MinimizeProvider = ({ children }: { children: React.ReactNode }) => {
  const [minimized, setMinimized] = useState<MinimizedEntry[]>([]);
  const idCounter = useRef(0);
  const { policy, setPin, removePin } = useMemoryPolicy();

  // Reflect pinned entries into the memory pin registry — the tab LRU refuses
  // to evict a scope that owns a dirty minimized dialog. Entries keep their
  // pin until restored/removed.
  const pinsRegisteredRef = useRef(new Set<string>());
  useEffect(() => {
    const active = new Set<string>();
    minimized.forEach((e) => {
      active.add(e.id);
      setPin(e.id, e.scopeId ?? null, e.pinned === true);
    });
    pinsRegisteredRef.current.forEach((id) => {
      if (!active.has(id)) removePin(id);
    });
    pinsRegisteredRef.current = active;
  }, [minimized, setPin, removePin]);

  const keepSnapshotsRef = useRef(policy.keepMinimizedSnapshots);
  keepSnapshotsRef.current = policy.keepMinimizedSnapshots;

  const minimize = useCallback((entry: Omit<MinimizedEntry, 'id'>) => {
    const id = `min-${idCounter.current++}`;
    // Skip the DOM snapshot entirely when policy disallows it — no point
    // cloning a subtree we're going to drop.
    const stored = keepSnapshotsRef.current ? entry : { ...entry, domClone: null };
    setMinimized((prev) => [...prev, { ...stored, id }]);
    return id;
  }, []);

  const restore = useCallback((id: string) => {
    setMinimized((prev) => {
      const entry = prev.find((e) => e.id === id);
      if (entry) {
        try {
          entry.onRestore();
        } catch {
          // Stale callback (page may have unmounted) — silently remove
        }
      }
      return prev.filter((e) => e.id !== id);
    });
  }, []);

  const removeMinimized = useCallback((id: string) => {
    setMinimized((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const removeByScope = useCallback((scopeId: string) => {
    setMinimized((prev) => prev.filter((e) => e.pinned || e.scopeId !== scopeId));
  }, []);

  const clearAll = useCallback(() => {
    setMinimized([]);
  }, []);

  // Under memory pressure, release detached DOM snapshots — the minimized card
  // falls back to a title-only placeholder but stays restorable.
  useEffect(() => {
    if (policy.keepMinimizedSnapshots) return;
    setMinimized((prev) => {
      if (!prev.some((e) => e.domClone)) return prev;
      return prev.map((e) => (e.domClone ? { ...e, domClone: null } : e));
    });
  }, [policy.keepMinimizedSnapshots]);

  return (
    <MinimizeContext.Provider
      value={{
        isAvailable: true,
        minimized,
        minimize,
        restore,
        removeMinimized,
        removeByScope,
        clearAll,
      }}>
      {children}
    </MinimizeContext.Provider>
  );
};

export const useMinimize = () => {
  const ctx = useContext(MinimizeContext);
  // Gracefully degrade when no provider is present — dialogs still work,
  // just without minimize functionality.
  if (!ctx) {
    return {
      isAvailable: false,
      minimized: [],
      minimize: () => '',
      restore: () => {},
      removeMinimized: () => {},
      removeByScope: () => {},
      clearAll: () => {},
    } as MinimizeContextValue;
  }
  return ctx;
};
