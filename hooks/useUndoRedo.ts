import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { useToast } from '../contexts/ToastContext';

export interface UndoCommand {
  action: () => void;
  undoAction: () => void;
  description: string;
}

type UndoRedoToastHandler = (type: 'Undo' | 'Redo', description: string) => void;

let undoStackStore: UndoCommand[] = [];
let redoStackStore: UndoCommand[] = [];
let toastHandler: UndoRedoToastHandler | null = null;
let isKeydownListenerAttached = false;
const storeListeners = new Set<() => void>();

// --- External store primitives for useSyncExternalStore ---

const subscribe = (callback: () => void): (() => void) => {
  storeListeners.add(callback);
  return () => {
    storeListeners.delete(callback);
  };
};

// Cache snapshots to avoid infinite re-renders (useSyncExternalStore
// requires stable snapshot values when the store hasn't changed).
let cachedUndoSnapshot = false;
let cachedRedoSnapshot = false;

const getUndoSnapshot = (): boolean => {
  const next = undoStackStore.length > 0;
  if (next !== cachedUndoSnapshot) {
    cachedUndoSnapshot = next;
  }
  return cachedUndoSnapshot;
};

const getRedoSnapshot = (): boolean => {
  const next = redoStackStore.length > 0;
  if (next !== cachedRedoSnapshot) {
    cachedRedoSnapshot = next;
  }
  return cachedRedoSnapshot;
};

const getServerSnapshot = (): boolean => false;

// --- Store mutation helpers ---

const notifyStoreListeners = () => {
  storeListeners.forEach((listener) => listener());
};

const syncStacks = (nextUndo: UndoCommand[], nextRedo: UndoCommand[]) => {
  undoStackStore = nextUndo;
  redoStackStore = nextRedo;
  notifyStoreListeners();
};

const executeGlobalCommand = (command: UndoCommand) => {
  command.action();
  syncStacks([...undoStackStore, command], []);
};

const undoGlobalCommand = () => {
  if (undoStackStore.length === 0) return;

  const command = undoStackStore[undoStackStore.length - 1];
  command.undoAction();

  syncStacks(undoStackStore.slice(0, -1), [...redoStackStore, command]);
  toastHandler?.('Undo', command.description);
};

const redoGlobalCommand = () => {
  if (redoStackStore.length === 0) return;

  const command = redoStackStore[redoStackStore.length - 1];
  command.action();

  syncStacks([...undoStackStore, command], redoStackStore.slice(0, -1));
  toastHandler?.('Redo', command.description);
};

const ensureKeydownListener = () => {
  if (isKeydownListenerAttached || typeof window === 'undefined') {
    return;
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;

    const target = e.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
    ) {
      return;
    }

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();

      if (e.shiftKey) {
        redoGlobalCommand();
      } else {
        undoGlobalCommand();
      }
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  isKeydownListenerAttached = true;
};

// --- Snapshot helper ---

export const useCreateUndoSnapshot = () => {
  const createUndoSnapshot = useCallback(<T>(value: T): T => {
    if (value === undefined || value === null) {
      return value;
    }

    if (typeof structuredClone === 'function') {
      return structuredClone(value);
    }

    return JSON.parse(JSON.stringify(value)) as T;
  }, []);

  return createUndoSnapshot;
};

// Backward compatibility export
export const createUndoSnapshot = <T>(value: T): T => {
  if (value === undefined || value === null) {
    return value;
  }

  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
};

// --- Main hook ---

export const useUndoRedo = () => {
  const { showToast } = useToast();
  const toastHandlerRef = useRef<UndoRedoToastHandler | null>(null);

  // useSyncExternalStore properly subscribes to the module-level store,
  // ensuring canUndo/canRedo are always consistent with the store state
  // and avoiding tearing/staleness issues with concurrent rendering.
  const canUndo = useSyncExternalStore(subscribe, getUndoSnapshot, getServerSnapshot);
  const canRedo = useSyncExternalStore(subscribe, getRedoSnapshot, getServerSnapshot);

  useEffect(() => {
    toastHandlerRef.current = (type, description) => {
      showToast(`${type}: ${description}`);
    };

    toastHandler = toastHandlerRef.current;

    return () => {
      if (toastHandler === toastHandlerRef.current) {
        toastHandler = null;
      }
    };
  }, [showToast]);

  useEffect(() => {
    ensureKeydownListener();
  }, []);

  const executeCommand = useCallback((command: UndoCommand) => {
    executeGlobalCommand(command);
  }, []);

  const undo = useCallback(() => {
    undoGlobalCommand();
  }, []);

  const redo = useCallback(() => {
    redoGlobalCommand();
  }, []);

  return {
    executeCommand,
    undo,
    redo,
    canUndo,
    canRedo,
  };
};
