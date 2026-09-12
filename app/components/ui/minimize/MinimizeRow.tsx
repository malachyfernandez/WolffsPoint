import React from 'react';
import { createPortal } from 'react-dom';
import { Pressable } from 'react-native';
import FontText from '../text/FontText';
import { useMinimize } from './MinimizeContext';
import MinimizedCard from './MinimizedCard';

/**
 * Floating row at the bottom-left of the screen that holds minimized dialogs.
 *
 * - Invisible container (no bg, no text) that holds minimized cards in a row.
 * - A "Clear All" button appears at the top-left of the row when there are
 *   minimized cards.
 *
 * Rendered via a portal to document.body so that ancestor CSS transforms
 * (e.g. from reanimated Animated.View) don't break `position: fixed`.
 *
 * Render this once at the app level, inside the MinimizeProvider.
 */
const MinimizeRow = () => {
  const { minimized, restore, removeMinimized, clearAll } = useMinimize();

  if (minimized.length === 0) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'row',
        gap: 8,
        padding: 12,
        alignItems: 'flex-end',
        pointerEvents: 'none',
      }}
    >
      {/* Cards container — pointerEvents auto on the cards themselves */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: 20,
          alignItems: 'flex-end',
          pointerEvents: 'auto',
        }}
      >
        {minimized.map((entry) => (
          <MinimizedCard
            key={entry.id}
            entry={entry}
            onRestore={() => restore(entry.id)}
            onRemove={() => removeMinimized(entry.id)}
          />
        ))}
      </div>

      {/* Clear All button — positioned above the cards, top-left */}
      <Pressable
        onPress={clearAll}
        style={{
          position: 'absolute',
          top: -20,
          left: 0,
          pointerEvents: 'auto',
        }}
        className="flex-row items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1"
      >
        <FontText weight="medium" className="text-xs">
          Clear All
        </FontText>
      </Pressable>
    </div>,
    document.body
  );
};

export default MinimizeRow;
