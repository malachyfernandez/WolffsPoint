import { useEffect, useRef } from 'react';

interface KeyboardShortcutConfig {
  onSave?: () => void;
  onPrimaryAction?: () => void;
  /** Key that fires onPrimaryAction. 'enter' (default) or 'delete': the
   * latter accepts both Delete and Backspace and disables Enter, for
   * destructive confirmations. */
  primaryKey?: 'enter' | 'delete';
  onClose?: () => void;
  /** Arrow keys, e.g. for column-view navigation. Fired when no modifier
   * (except shift) is held and focus isn't in a text field; the default
   * is prevented so arrows don't scroll the dialog. */
  onArrowKey?: (dir: 'up' | 'down' | 'left' | 'right') => void;
  /** Raw keydown hook for app-level combos (Cmd+C/V/A, Cmd+Backspace, …).
   *  Runs first while this scope is top-most and focus isn't in a text
   *  field; return true to mark the key handled (prevents default). */
  onKey?: (e: KeyboardEvent) => boolean;
  enabled?: boolean;
}

// ── Module-level scope stack ────────────────────────────────────────────────
// Each active useKeyboardShortcuts call pushes a unique scope id onto this
// array when it mounts and removes it when it unmounts. Only the top-most
// scope (last element) actually handles key events, so when a confirmation
// dialog opens over an editor, only the confirmation dialog's shortcuts fire.
const activeScopes: string[] = [];

function pushScope(id: string) {
  activeScopes.push(id);
}

function removeScope(id: string) {
  const idx = activeScopes.lastIndexOf(id);
  if (idx !== -1) activeScopes.splice(idx, 1);
}

function isTopScope(id: string): boolean {
  return activeScopes.length > 0 && activeScopes[activeScopes.length - 1] === id;
}

const ARROW_DIRS: Record<string, 'up' | 'down' | 'left' | 'right'> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Registers keyboard shortcuts for use inside dialogs.
 * - Cmd/Ctrl+S → onSave
 * - Enter → onPrimaryAction (for small confirmation dialogs)
 * - Escape → onClose (runs whatever the close/cancel handler does)
 * - Arrow keys → onArrowKey (when provided)
 *
 * Only active when `enabled` is true (typically when the dialog is open).
 * When multiple dialogs are open simultaneously, only the top-most (most
 * recently mounted) dialog's shortcuts fire, preventing a confirmation
 * dialog from leaking key events to the editor underneath it.
 */
export function useKeyboardShortcuts({
  onSave,
  onPrimaryAction,
  primaryKey = 'enter',
  onClose,
  onArrowKey,
  onKey,
  enabled = true,
}: KeyboardShortcutConfig) {
  const onSaveRef = useRef(onSave);
  const onPrimaryActionRef = useRef(onPrimaryAction);
  const primaryKeyRef = useRef(primaryKey);
  const onCloseRef = useRef(onClose);
  const onArrowKeyRef = useRef(onArrowKey);
  const onKeyRef = useRef(onKey);
  const scopeIdRef = useRef<string>(Math.random().toString(36).slice(2));

  // Keep refs fresh without re-registering listeners
  onSaveRef.current = onSave;
  onPrimaryActionRef.current = onPrimaryAction;
  primaryKeyRef.current = primaryKey;
  onCloseRef.current = onClose;
  onArrowKeyRef.current = onArrowKey;
  onKeyRef.current = onKey;

  useEffect(() => {
    if (!enabled) return;

    const scopeId = scopeIdRef.current;
    pushScope(scopeId);

    // Keyboard shortcuts are web-only; React Native doesn't have window.addEventListener
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
      return () => removeScope(scopeId);
    }

    const handler = (e: KeyboardEvent) => {
      // Only the top-most scope should handle key events
      if (!isTopScope(scopeId)) return;

      // Generic combo hook (clipboard, select-all, …) - first, so callers'
      // combos win, but never while typing in a text field (native
      // copy/paste etc. must still work there).
      if (onKeyRef.current) {
        const target = e.target as HTMLElement;
        const tag = target?.tagName?.toLowerCase();
        if (tag !== 'textarea' && tag !== 'input' && !target?.isContentEditable) {
          if (onKeyRef.current(e)) {
            e.preventDefault();
            return;
          }
        }
      }

      // Cmd/Ctrl+S
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        onSaveRef.current?.();
        return;
      }

      // Arrow keys: only when this scope registered an arrow handler
      // and focus isn't in a text field
      const dir = ARROW_DIRS[e.key];
      if (dir && onArrowKeyRef.current && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement;
        const tag = target?.tagName?.toLowerCase();
        if (tag === 'textarea' || tag === 'input' || target?.isContentEditable) {
          return;
        }
        e.preventDefault();
        onArrowKeyRef.current(dir);
        return;
      }

      // Enter (without modifier keys): skipped when primaryKey is 'delete'
      // or there's no handler - a scope without one shouldn't swallow it.
      if (
        e.key === 'Enter' &&
        primaryKeyRef.current === 'enter' &&
        onPrimaryActionRef.current &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.shiftKey &&
        !e.altKey
      ) {
        // Don't intercept if focus is in a textarea or contenteditable
        const target = e.target as HTMLElement;
        const tag = target?.tagName?.toLowerCase();
        if (tag === 'textarea' || tag === 'input' || target?.isContentEditable) {
          return;
        }
        // Don't intercept if focus is on a button; it already
        // activates itself on Enter
        if (target?.closest?.('button, [role="button"]')) {
          return;
        }
        e.preventDefault();
        onPrimaryActionRef.current?.();
        return;
      }

      // Delete/Backspace: destructive primary action (primaryKey 'delete')
      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        primaryKeyRef.current === 'delete' &&
        onPrimaryActionRef.current &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.shiftKey &&
        !e.altKey
      ) {
        const target = e.target as HTMLElement;
        const tag = target?.tagName?.toLowerCase();
        if (tag === 'textarea' || tag === 'input' || target?.isContentEditable) {
          return;
        }
        e.preventDefault();
        onPrimaryActionRef.current?.();
        return;
      }

      // Escape
      if (e.key === 'Escape') {
        // First Escape leaves a focused text field; the next one closes
        const target = e.target as HTMLElement;
        const tag = target?.tagName?.toLowerCase();
        if (tag === 'textarea' || tag === 'input' || target?.isContentEditable) {
          e.preventDefault();
          target.blur();
          return;
        }
        e.preventDefault();
        onCloseRef.current?.();
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      removeScope(scopeId);
    };
  }, [enabled]);
}
