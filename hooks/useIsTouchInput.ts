import { useEffect, useState } from 'react';
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
export const useIsTouchInput = () => {
  const [isTouch, setIsTouch] = useState(() => {
    if (Platform.OS !== 'web') return true;
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
  });

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const handlePointer = (event: PointerEvent) => {
      if (event.pointerType === 'touch') setIsTouch(true);
      else if (event.pointerType === 'mouse' || event.pointerType === 'pen') setIsTouch(false);
    };
    window.addEventListener('pointerdown', handlePointer);
    window.addEventListener('pointermove', handlePointer);
    return () => {
      window.removeEventListener('pointerdown', handlePointer);
      window.removeEventListener('pointermove', handlePointer);
    };
  }, []);

  return isTouch;
};
