import React from 'react';
import type { DragPointerInfo } from './DragArea';

interface DragAreaProps {
  children: React.ReactNode;
  /** Fires on primary-button pointerdown with viewport coords. */
  onPointerDown?: (info: DragPointerInfo) => void;
  /** When set, this region is a drag-drop target for that folder path
   *  (rendered as `data-file-drop`; '' = root). */
  dropFolder?: string;
  /** Pointer enter/leave over the region (implemented via mouseover/out
   *  since `display: contents` boxes can't receive mouseenter). */
  onHoverChange?: (hovered: boolean) => void;
}

/** Drag/drop annotation for web: a `display: contents` div (no layout box of
 *  its own) that reports primary-button pointerdowns and/or marks itself as a
 *  drop target via `data-file-drop`, which drop hit-testing resolves with
 *  `elementFromPoint(...).closest('[data-file-drop]')`. userSelect:none on
 *  draggable rows keeps a drag from selecting page text. */
const DragArea = ({ children, onPointerDown, dropFolder, onHoverChange }: DragAreaProps) => {
  if (!onPointerDown && dropFolder === undefined && !onHoverChange) return <>{children}</>;
  return (
    <div
      style={{ display: 'contents', userSelect: onPointerDown ? 'none' : undefined }}
      data-file-drop={dropFolder}
      onMouseOver={onHoverChange ? () => onHoverChange(true) : undefined}
      onMouseOut={
        onHoverChange
          ? (e) => {
              if (!(e.currentTarget as Element).contains(e.relatedTarget as Node)) {
                onHoverChange(false);
              }
            }
          : undefined
      }
      onPointerDown={
        onPointerDown
          ? (e) => {
              if (e.button !== 0) return;
              onPointerDown({ x: e.clientX, y: e.clientY, pointerType: e.pointerType });
            }
          : undefined
      }>
      {children}
    </div>
  );
};

export default DragArea;
