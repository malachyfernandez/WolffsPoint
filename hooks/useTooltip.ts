import { useEffect, useState, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';

// Global mouse position tracker — listens on document so it works regardless of
// which element is under the cursor.
const useGlobalMouse = () => {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    if (typeof document === 'undefined') return;
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
let sharedTooltipRoot: Root | null = null;
let tooltipOwner: string | null = null; // tracks which id currently owns the tooltip

const showTooltip = (id: string, content: ReactNode) => {
  if (typeof document === 'undefined') return;
  if (!sharedTooltip) {
    sharedTooltip = document.createElement('div');
    sharedTooltip.style.cssText =
      'position:fixed;z-index:99999;pointer-events:none;white-space:nowrap;display:flex;' +
      'align-items:center;gap:6px;border-radius:9999px;background:rgba(0,0,0,0.5);' +
      'color:#fff;padding:4px 10px;font-size:12px;line-height:16px;font-family:inherit;' +
      'opacity:0;transition:opacity 80ms;';
    document.body.appendChild(sharedTooltip);
    sharedTooltipRoot = createRoot(sharedTooltip);
  }
  tooltipOwner = id;
  sharedTooltipRoot?.render(content);
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
 * Pass a unique id and the content to show. Returns hovered state + setter.
 *
 * Usage:
 *   const { hovered, setHovered } = useTooltip(id, content);
 *   <Pressable onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)} />
 */
export const useTooltip = (id: string, content: ReactNode | undefined) => {
  const [hovered, setHovered] = useState(false);
  const mousePos = useGlobalMouse();
  useEffect(() => {
    if (hovered && content) {
      showTooltip(id, content);
    } else {
      hideTooltip(id);
    }
  }, [hovered, id, content]);
  useEffect(() => {
    if (hovered) moveTooltip(mousePos.x, mousePos.y);
  }, [hovered, mousePos]);
  useEffect(() => () => hideTooltip(id), [id]);
  return { hovered, setHovered };
};
