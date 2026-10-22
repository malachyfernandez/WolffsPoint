import React from 'react';
import type { ContextMenuPosition } from './ContextMenuArea';

interface ContextMenuAreaProps {
  children: React.ReactNode;
  /** Called with viewport coords on right-click. */
  onContextMenu?: (pos: ContextMenuPosition) => void;
}

/** Right-click target for web: a `display: contents` div (no layout box of
 *  its own) that intercepts `contextmenu`, suppresses the browser menu, and
 *  reports pointer coords. stopPropagation keeps nested targets (a file row
 *  inside a folder column) from falling through to the parent's menu. */
const ContextMenuArea = ({ children, onContextMenu }: ContextMenuAreaProps) => {
  if (!onContextMenu) return <>{children}</>;
  return (
    <div
      style={{ display: 'contents' }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu({ x: e.clientX, y: e.clientY });
      }}>
      {children}
    </div>
  );
};

export default ContextMenuArea;
