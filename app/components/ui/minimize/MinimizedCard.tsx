import React, { useEffect, useRef } from 'react';
import { Pressable } from 'react-native';
import FontText from '../text/FontText';
import type { MinimizedEntry } from './MinimizeContext';

const TARGET_WIDTH = 200; // px — width of the minimized card
const MAX_HEIGHT = 160; // px — max height of the minimized card

interface MinimizedCardProps {
  entry: MinimizedEntry;
  onRestore: () => void;
  onRemove: () => void;
}

/**
 * Renders a scaled-down DOM snapshot of a minimized dialog.
 *
 * The `entry.domClone` is an HTMLElement captured at minimize time via
 * `cloneNode(true)`. We append it to a container div and apply a CSS
 * `transform: scale()` to shrink it to `TARGET_WIDTH`.
 *
 * The clone includes the guilded frame (tan bg + paper texture).
 * Header/buttons are stripped before the clone reaches this component.
 *
 * The card has:
 * - A click target (the entire card) to restore the dialog.
 * - An × button in the top-right corner to dismiss the minimized card.
 */
const MinimizedCard = ({ entry, onRestore, onRemove }: MinimizedCardProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scale = entry.originalWidth > 0 ? TARGET_WIDTH / entry.originalWidth : 0.3;
  const scaledHeight = entry.originalHeight * scale;

  useEffect(() => {
    const container = containerRef.current;
    if (container && entry.domClone) {
      container.innerHTML = '';
      container.appendChild(entry.domClone);
    }
  }, [entry.domClone]);

  return (
    <div
      style={{
        position: 'relative',
        width: TARGET_WIDTH,
        height: Math.min(scaledHeight, MAX_HEIGHT),
        flexShrink: 0,
      }}
      onClick={onRestore}
    >
      {/* Clipped content container */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          borderRadius: 8,
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          border: '1px solid rgba(0,0,0,0.2)',
          cursor: 'pointer',
        }}
      >
        {/* Scaled DOM clone (guilded frame with tan bg + texture) */}
        <div
          ref={containerRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: entry.originalWidth,
            height: entry.originalHeight,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Remove (×) button */}
      <Pressable
        onPress={(e) => {
          e?.stopPropagation?.();
          onRemove();
        }}
        style={{
          position: 'absolute',
          top: -10,
          right: -10,
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: 'rgba(139, 0, 0, 0.9)',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
        }}
      >
        <FontText color="white" weight="bold" className="text-2xl leading-none">
          ×
        </FontText>
      </Pressable>
    </div>
  );
};

export default MinimizedCard;
