import { useEffect, useState, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useIsTouchInput } from './useIsTouchInput';

// Global mouse position tracker: listens on document so it works regardless of
// which element is under the cursor.
let globalMouseSubscriberCount = 0;
let lastMousePosition = { x: 0, y: 0 };

const handleGlobalMouseMove = (event: MouseEvent) => {
  lastMousePosition = { x: event.clientX, y: event.clientY };
  if (sharedTooltip?.style.opacity === '1') {
    moveTooltip(event.clientX, event.clientY);
  }
};

const useGlobalMouse = () => {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (globalMouseSubscriberCount === 0) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('pointerdown', dismissTooltip);
    }
    globalMouseSubscriberCount += 1;
    return () => {
      globalMouseSubscriberCount -= 1;
      if (globalMouseSubscriberCount === 0) {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('pointerdown', dismissTooltip);
      }
    };
  }, []);
};

// Shared tooltip element: one DOM node appended to document.body, reused.
// Uses an ownership model: only the component that last requested the tooltip
// can release it. This prevents parent/child hover conflicts.
let sharedTooltip: HTMLDivElement | null = null;
let sharedTooltipRoot: Root | null = null;
let tooltipOwner: string | null = null; // tracks which id currently owns the tooltip

const dismissTooltip = () => {
  if (sharedTooltip) sharedTooltip.style.opacity = '0';
};

const showTooltip = (id: string, content: ReactNode) => {
  if (typeof document === 'undefined') return;
  if (!sharedTooltip) {
    sharedTooltip = document.createElement('div');
    sharedTooltip.setAttribute('aria-hidden', 'true');
    sharedTooltip.style.cssText =
      'position:fixed;z-index:99999;pointer-events:none;white-space:nowrap;display:flex;' +
      'align-items:center;gap:6px;border-radius:9999px;background:rgba(0,0,0,0.5);' +
      'color:#fff;padding:4px 10px;font-size:12px;line-height:16px;font-family:inherit;' +
      'opacity:0;transition:opacity 80ms;max-width:calc(100vw - 16px);white-space:normal;';
    document.body.appendChild(sharedTooltip);
    sharedTooltipRoot = createRoot(sharedTooltip);
  }
  tooltipOwner = id;
  sharedTooltipRoot?.render(content);
  moveTooltip(lastMousePosition.x, lastMousePosition.y);
  sharedTooltip.style.opacity = '1';
  requestAnimationFrame(() => {
    if (tooltipOwner === id) moveTooltip(lastMousePosition.x, lastMousePosition.y);
  });
};

const hideTooltip = (id: string) => {
  if (sharedTooltip && tooltipOwner === id) sharedTooltip.style.opacity = '0';
};

function moveTooltip(x: number, y: number) {
  if (sharedTooltip) {
    sharedTooltip.style.left = `${Math.max(8, Math.min(x + 14, window.innerWidth - sharedTooltip.offsetWidth - 8))}px`;
    sharedTooltip.style.top = `${Math.max(8, Math.min(y + 14, window.innerHeight - sharedTooltip.offsetHeight - 8))}px`;
  }
}

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
  // Tooltips are a mouse affordance, on touch input (always on native, and
  // on web once a touch pointer is observed) hover events still fire, so
  // gate the tooltip itself rather than every call site.
  const isTouch = useIsTouchInput();
  useGlobalMouse();
  useEffect(() => {
    if (hovered && content && !isTouch) {
      showTooltip(id, content);
    } else {
      hideTooltip(id);
    }
  }, [hovered, id, content, isTouch]);
  useEffect(() => () => hideTooltip(id), [id]);
  return { hovered, setHovered };
};
