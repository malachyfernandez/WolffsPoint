import { useRef, useCallback } from 'react';
import { View } from 'react-native';
import { useMinimize } from './MinimizeContext';
import { useMemoryScope } from '../../../contexts/MemoryPressureContext';

interface UseMinimizeTargetOptions {
  /** Title shown in the minimized card's title bar. */
  title: string;
  /** Called to close the dialog (typically `() => onOpenChange(false)`). */
  onClose: () => void;
  /** Called to reopen the dialog (typically `() => onOpenChange(true)`). */
  onRestore: () => void;
  /**
   * Evaluated at minimize time: true while the dialog holds unsaved user
   * state. Pinned entries protect their host scope from memory eviction —
   * evicting it would strand `onRestore` and lose the draft.
   */
  pinned?: () => boolean;
}

/**
 * Hook that provides a `targetRef` to attach to a `View` wrapping the dialog
 * content, and a `performMinimize` function that captures a DOM snapshot,
 * stores it in the MinimizeContext, and closes the dialog.
 *
 * The clone is taken from the `.guilded-frame-root` ancestor (which includes
 * the tan background + paper texture). Elements marked with the `minimize-hide`
 * class (header, close button, save pill, action buttons) are stripped from
 * the clone so the minimized preview shows only the middle content.
 *
 * If no MinimizeProvider is present in the tree, `performMinimize` is a no-op
 * so dialogs still work outside the operator context.
 */
export function useMinimizeTarget({ title, onClose, onRestore, pinned }: UseMinimizeTargetOptions) {
  const { isAvailable, minimize } = useMinimize();
  const scopeId = useMemoryScope();
  const targetRef = useRef<View>(null);
  const pinnedRef = useRef(pinned);
  pinnedRef.current = pinned;

  const performMinimize = useCallback(() => {
    if (!isAvailable) return;

    const el = targetRef.current as unknown as HTMLElement | null;

    if (el) {
      // Find the guilded frame ancestor (includes tan bg + paper texture)
      const frame = (el.closest('.guilded-frame-root') as HTMLElement) || el;

      // Copy input/textarea values into the DOM before cloning,
      // since cloneNode doesn't copy form property values.
      const inputs = frame.querySelectorAll('input, textarea');
      const clone = frame.cloneNode(true) as HTMLElement;
      const cloneInputs = clone.querySelectorAll('input, textarea');
      inputs.forEach((input, i) => {
        const cloneInput = cloneInputs[i];
        if (!cloneInput) return;
        if (input.tagName === 'TEXTAREA') {
          cloneInput.textContent = (input as HTMLTextAreaElement).value;
        } else {
          cloneInput.setAttribute('value', (input as HTMLInputElement).value);
        }
      });

      // Strip elements marked with .minimize-hide (header, buttons, etc.)
      clone.querySelectorAll('.minimize-hide').forEach((node) => node.remove());

      const rect = frame.getBoundingClientRect();
      minimize({
        title,
        domClone: clone,
        originalWidth: rect.width,
        originalHeight: rect.height,
        onRestore,
        pinned: pinnedRef.current?.() ?? false,
        scopeId,
      });
    }

    onClose();
  }, [isAvailable, minimize, title, onClose, onRestore, scopeId]);

  return { targetRef, performMinimize };
}
