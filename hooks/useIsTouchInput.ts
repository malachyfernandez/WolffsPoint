import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

/**
 * Tracks the user's current input modality.
 *
 * `true` while the most recently observed pointer input was touch, `false`
 * for mouse/pen. Seeded from the `(pointer: coarse)` media query so touch
 * devices start in touch mode before any input is observed. Always `true`
 * on native.
 *
 * Listens to real pointer events rather than only the media query so hybrid
 * devices (touchscreen laptops) flip back to mouse mode as soon as a mouse
 * is actually used.
 */
let isTouch: boolean | undefined;
const listeners = new Set<() => void>();
const getSnapshot = () => {
  if (Platform.OS !== 'web') return true;
  if (typeof window === 'undefined') return false;
  return isTouch ?? window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
};
const handlePointer = (event: PointerEvent) => {
  if (!['touch', 'mouse', 'pen'].includes(event.pointerType)) return;
  const next = event.pointerType === 'touch';
  if (next === getSnapshot()) return;
  isTouch = next;
  listeners.forEach((listener) => listener());
};
const subscribe = (listener: () => void) => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return () => {};
  if (listeners.size === 0) {
    window.addEventListener('pointerdown', handlePointer);
    window.addEventListener('pointermove', handlePointer);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener('pointerdown', handlePointer);
      window.removeEventListener('pointermove', handlePointer);
    }
  };
};

export const useIsTouchInput = () =>
  useSyncExternalStore(subscribe, getSnapshot, () => Platform.OS !== 'web');
