import { useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { ReactNode } from 'react';

// Shared cursor-following overlay: one DOM node appended to document.body,
// rendered through its own React root (same technique as useTooltip's shared
// tooltip). Callers hand it any ReactNode - a drag ghost, a hover preview, a
// pill - via showCursorFollower(id, node); the node moves on pointermove
// through direct style mutation so following the mouse never re-renders.
// Ownership model matches the tooltip: only the last requester can hide it.

let subscriberCount = 0;
let lastPosition = { x: 0, y: 0 };
let followerEl: HTMLDivElement | null = null;
let followerRoot: Root | null = null;
let followerOwner: string | null = null;
let followerVisible = false;

const moveFollower = (x: number, y: number) => {
  if (followerEl) {
    followerEl.style.left = `${x + 14}px`;
    followerEl.style.top = `${y + 14}px`;
  }
};

const handlePointerMove = (event: PointerEvent) => {
  lastPosition = { x: event.clientX, y: event.clientY };
  if (followerVisible) moveFollower(event.clientX, event.clientY);
};

/** Mounts the shared pointermove listener while the caller is on screen. */
export const useCursorFollower = () => {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (subscriberCount === 0) {
      document.addEventListener('pointermove', handlePointerMove);
    }
    subscriberCount += 1;
    return () => {
      subscriberCount -= 1;
      if (subscriberCount === 0) {
        document.removeEventListener('pointermove', handlePointerMove);
      }
    };
  }, []);
};

/** Show `content` glued to the cursor. Any ReactNode - the node is rendered
 *  in a detached React root, so it can't rely on app contexts; plain
 *  elements/inline styles are the safe bet. */
export const showCursorFollower = (id: string, content: ReactNode) => {
  if (typeof document === 'undefined') return;
  if (!followerEl) {
    followerEl = document.createElement('div');
    followerEl.style.cssText =
      'position:fixed;z-index:2147483647;pointer-events:none;display:flex;' +
      'opacity:0;transition:opacity 80ms;';
    document.body.appendChild(followerEl);
    followerRoot = createRoot(followerEl);
  }
  followerOwner = id;
  followerRoot?.render(content);
  moveFollower(lastPosition.x, lastPosition.y);
  followerEl.style.opacity = '1';
  followerVisible = true;
};

export const hideCursorFollower = (id: string) => {
  if (followerEl && followerOwner === id) {
    followerEl.style.opacity = '0';
    followerVisible = false;
  }
};
