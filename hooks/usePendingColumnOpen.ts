import { useCallback, useRef, useState } from 'react';

export interface PendingColumnOpen {
  dayIndex: number;
  sectionIndex: number;
  columnIndex: number;
}

/**
 * Holds a "please open this newspaper column" request at the newspaper page
 * level, which survives day switches (each day's writing view unmounts on
 * navigation, so a minimized dialog's onRestore can't target the cell
 * directly — its component no longer exists).
 *
 * A minimized column editor's onRestore calls `requestColumnOpen`, which
 * records the target column and invokes `onNavigateToDay` to switch to the
 * correct day + writing tab. When that day's cells mount, the matching cell
 * consumes the pending request via `consumePendingColumnOpen` and opens its
 * own dialog.
 *
 * `onNavigateToDay` is stored in a ref so `requestColumnOpen` stays referentially
 * stable — minimized entries may outlive the components that created them.
 */
export function usePendingColumnOpen(onNavigateToDay: (dayIndex: number) => void) {
  const [pendingColumnOpen, setPendingColumnOpen] = useState<PendingColumnOpen | null>(null);
  const onNavigateToDayRef = useRef(onNavigateToDay);
  onNavigateToDayRef.current = onNavigateToDay;

  const requestColumnOpen = useCallback(
    (dayIndex: number, sectionIndex: number, columnIndex: number) => {
      setPendingColumnOpen({ dayIndex, sectionIndex, columnIndex });
      onNavigateToDayRef.current(dayIndex);
    },
    [],
  );

  const consumePendingColumnOpen = useCallback(() => {
    setPendingColumnOpen(null);
  }, []);

  return { pendingColumnOpen, requestColumnOpen, consumePendingColumnOpen };
}
