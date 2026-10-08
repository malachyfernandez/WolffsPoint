/**
 * sim/perf/uiState.ts
 *
 * Tiny pub/sub store so the tour runner and the SimBar can coordinate:
 * modal-lab visibility, which lab dialog is open, tour progress.
 */

import { useSyncExternalStore } from 'react';

type Listener = () => void;

const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l());

let state = {
  labOpen: false,
  openModalId: null as string | null,
  tourRunning: false,
  tourProgress: '',
  lastReport: null as string | null,
};

export const simUi = {
  get: () => state,
  set(patch: Partial<typeof state>) {
    // new object identity — useSyncExternalStore compares by reference
    state = { ...state, ...patch };
    emit();
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  /** Force-close whichever lab dialog is open (unmount path). */
  closeModal() {
    if (state.openModalId) {
      // must go through set() — useSyncExternalStore compares snapshot identity
      this.set({ openModalId: null });
    }
  },
};

export function useSimUi() {
  return useSyncExternalStore(simUi.subscribe, simUi.get, simUi.get);
}
