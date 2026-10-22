import React from 'react';

export interface DragPointerInfo {
  x: number;
  y: number;
  pointerType: string;
}

interface DragAreaProps {
  children: React.ReactNode;
  /** Fires on primary-button pointerdown. Web-only; native no-ops. */
  onPointerDown?: (info: DragPointerInfo) => void;
  /** When set, this region is a drag-drop target for that folder path
   *  (rendered as `data-file-drop`; '' = root). Ignored on native. */
  dropFolder?: string;
  /** Fires when the pointer enters/leaves this region. Web-only;
   *  native no-ops (no hover on touch). */
  onHoverChange?: (hovered: boolean) => void;
}

/** Native fallback: no pointer drags on touch, so this renders children
 *  untouched. The web variant (DragArea.web.tsx) does the real work. */
const DragArea = ({ children }: DragAreaProps) => <>{children}</>;

export default DragArea;
