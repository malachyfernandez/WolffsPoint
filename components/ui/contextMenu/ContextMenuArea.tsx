import React from 'react';

export interface ContextMenuPosition {
  x: number;
  y: number;
}

interface ContextMenuAreaProps {
  children: React.ReactNode;
  /** Called with viewport coords on right-click. Web-only; native no-ops. */
  onContextMenu?: (pos: ContextMenuPosition) => void;
}

/** Native fallback: right-click doesn't exist on touch, so this renders
 *  children untouched. The web variant (ContextMenuArea.web.tsx) does the
 *  real work. */
const ContextMenuArea = ({ children }: ContextMenuAreaProps) => <>{children}</>;

export default ContextMenuArea;
