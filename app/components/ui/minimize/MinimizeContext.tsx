import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

/**
 * A minimized dialog entry. The `domClone` is a snapshot of the dialog's
 * DOM at minimize time, rendered scaled-down in the minimize row.
 */
export interface MinimizedEntry {
  id: string;
  title: string;
  domClone: HTMLElement;
  originalWidth: number;
  originalHeight: number;
  /** Called when the user clicks the minimized card to restore the dialog. */
  onRestore: () => void;
}

interface MinimizeContextValue {
  minimized: MinimizedEntry[];
  minimize: (entry: Omit<MinimizedEntry, 'id'>) => string;
  restore: (id: string) => void;
  removeMinimized: (id: string) => void;
  clearAll: () => void;
}

const MinimizeContext = createContext<MinimizeContextValue | null>(null);

export const MinimizeProvider = ({ children }: { children: React.ReactNode }) => {
  const [minimized, setMinimized] = useState<MinimizedEntry[]>([]);
  const idCounter = useRef(0);

  const minimize = useCallback((entry: Omit<MinimizedEntry, 'id'>) => {
    const id = `min-${idCounter.current++}`;
    setMinimized((prev) => [...prev, { ...entry, id }]);
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

  const clearAll = useCallback(() => {
    setMinimized([]);
  }, []);

  return (
    <MinimizeContext.Provider value={{ minimized, minimize, restore, removeMinimized, clearAll }}>
      {children}
    </MinimizeContext.Provider>
  );
};

export const useMinimize = () => {
  const ctx = useContext(MinimizeContext);
  if (!ctx) throw new Error('useMinimize must be used within MinimizeProvider');
  return ctx;
};
