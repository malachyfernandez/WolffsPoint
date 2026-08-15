import { useEffect, useState } from 'react';

// Global mouse position tracker — listens on document so it works regardless of
// which element is under the cursor.
const useGlobalMouse = () => {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handler = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    document.addEventListener('mousemove', handler);
    return () => document.removeEventListener('mousemove', handler);
  }, []);
  return pos;
};

// Shared tooltip element — one DOM node appended to document.body, reused.
// Uses an ownership model: only the component that last requested the tooltip
// can release it. This prevents parent/child hover conflicts.
let sharedTooltip: HTMLDivElement | null = null;
let tooltipOwner: string | null = null; // tracks which id currently owns the tooltip

const showTooltip = (id: string, message: string) => {
  if (typeof document === 'undefined') return;
  if (!sharedTooltip) {
    sharedTooltip = document.createElement('div');
    sharedTooltip.style.cssText =
      'position:fixed;z-index:99999;pointer-events:none;white-space:nowrap;' +
      'border-radius:9999px;background:rgba(0,0,0,0.5);color:#fff;padding:4px 10px;' +
      'font-size:12px;line-height:16px;font-family:inherit;opacity:0;transition:opacity 80ms;';
    document.body.appendChild(sharedTooltip);
  }
  tooltipOwner = id;
  sharedTooltip.textContent = message;
  sharedTooltip.style.opacity = '1';
};

const hideTooltip = (id: string) => {
  if (sharedTooltip && tooltipOwner === id) sharedTooltip.style.opacity = '0';
};

const moveTooltip = (x: number, y: number) => {
  if (sharedTooltip) {
    sharedTooltip.style.left = `${x + 14}px`;
    sharedTooltip.style.top = `${y + 14}px`;
  }
};

/**
 * Hook for any element that wants a hover-following tooltip.
 * Pass a unique id and the message to show. Returns hovered state + setter.
 *
 * Usage:
 *   const { hovered, setHovered } = useTooltip(id, message);
 *   <Pressable onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)} />
 */
export const useTooltip = (id: string, message: string | undefined) => {
  const [hovered, setHovered] = useState(false);
  const mousePos = useGlobalMouse();
  useEffect(() => {
    if (hovered && message) {
      showTooltip(id, message);
      moveTooltip(mousePos.x, mousePos.y);
    } else {
      hideTooltip(id);
    }
  }, [hovered, id, message, mousePos]);
  useEffect(() => () => hideTooltip(id), [id]);
  return { hovered, setHovered };
};
