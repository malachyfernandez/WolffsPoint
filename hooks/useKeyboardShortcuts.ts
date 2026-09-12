import { useEffect, useRef } from 'react';

interface KeyboardShortcutConfig {
    onSave?: () => void;
    onPrimaryAction?: () => void;
    onClose?: () => void;
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
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Registers keyboard shortcuts for use inside dialogs.
 * - Cmd/Ctrl+S → onSave
 * - Enter → onPrimaryAction (for small confirmation dialogs)
 * - Escape → onClose (runs whatever the close/cancel handler does)
 *
 * Only active when `enabled` is true (typically when the dialog is open).
 * When multiple dialogs are open simultaneously, only the top-most (most
 * recently mounted) dialog's shortcuts fire, preventing a confirmation
 * dialog from leaking key events to the editor underneath it.
 */
export function useKeyboardShortcuts({
    onSave,
    onPrimaryAction,
    onClose,
    enabled = true,
}: KeyboardShortcutConfig) {
    const onSaveRef = useRef(onSave);
    const onPrimaryActionRef = useRef(onPrimaryAction);
    const onCloseRef = useRef(onClose);
    const scopeIdRef = useRef<string>(Math.random().toString(36).slice(2));

    // Keep refs fresh without re-registering listeners
    onSaveRef.current = onSave;
    onPrimaryActionRef.current = onPrimaryAction;
    onCloseRef.current = onClose;

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

            // Cmd/Ctrl+S
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                onSaveRef.current?.();
                return;
            }

            // Enter (without modifier keys)
            if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
                // Don't intercept if focus is in a textarea or contenteditable
                const target = e.target as HTMLElement;
                const tag = target?.tagName?.toLowerCase();
                if (tag === 'textarea' || tag === 'input' || target?.isContentEditable) {
                    return;
                }
                onPrimaryActionRef.current?.();
                return;
            }

            // Escape
            if (e.key === 'Escape') {
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
