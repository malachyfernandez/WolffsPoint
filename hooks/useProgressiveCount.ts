import { useEffect, useState } from 'react';

/**
 * Progressive list mounting. Returns how many of `total` items should render
 * right now; grows by `batch` every animation frame until it reaches `total`.
 *
 * Mounting ~24 table rows (each with cells, overlays, effects) in one commit
 * is what turned game-open into a single 2.4s frozen frame on iOS Safari.
 * Splitting the mount across frames keeps the UI responsive; visually the
 * table fills in over a few frames — reads as a quick load-in.
 */
export function useProgressiveCount(total: number, batch = 8): number {
  const [count, setCount] = useState(() => Math.min(total, batch));

  useEffect(() => {
    if (count >= total) return;
    const id = requestAnimationFrame(() => {
      setCount((c) => Math.min(total, c + batch));
    });
    return () => cancelAnimationFrame(id);
  }, [count, total, batch]);

  return Math.min(count, total);
}
