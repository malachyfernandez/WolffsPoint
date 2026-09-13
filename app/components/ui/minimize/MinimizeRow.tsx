import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Pressable } from 'react-native';
import Animated, { FadeInDown, FadeOutDown, LinearTransition } from 'react-native-reanimated';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import FontText from '../text/FontText';
import ConfirmDialog from '../dialog/ConfirmDialog';
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  if (minimized.length === 0) return null;

  return (
    <>
      {createPortal(
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            zIndex: 9999,
            display: 'flex',
            width: 'fit-content',
            maxWidth: '100vw',
            flexDirection: 'column',
            padding: 12,
            boxSizing: 'border-box',
            alignItems: 'flex-start',
            pointerEvents: 'none',
          }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: 8,
              alignItems: 'center',
              marginBottom: isCollapsed ? 0 : 4,
              pointerEvents: 'auto',
              transition: 'margin-bottom 180ms cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}>
            <Pressable
              onPress={() => setIsCollapsed((current) => !current)}
              accessibilityRole="button"
              accessibilityLabel={isCollapsed ? 'Show minimized dialogs' : 'Hide minimized dialogs'}
              className="border-border bg-background flex-row items-center gap-1 rounded-lg border px-2.5 py-1 shadow-md">
              {isCollapsed ? (
                <ChevronUp size={14} color="rgb(46, 41, 37)" />
              ) : (
                <ChevronDown size={14} color="rgb(46, 41, 37)" />
              )}
              <FontText weight="medium" className="text-xs">
                {isCollapsed ? 'Show' : 'Hide'}
              </FontText>
            </Pressable>

            {!isCollapsed && (
              <Animated.View
                entering={FadeInDown.duration(140)}
                exiting={FadeOutDown.duration(120)}>
                <Pressable
                  onPress={() => setIsClearConfirmOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Clear all minimized dialogs"
                  style={{ boxShadow: '0 5px 12px rgba(0, 0, 0, 0.28)' }}
                  className="border-border bg-background flex-row items-center gap-1 rounded-lg border px-2.5 py-1">
                  <FontText weight="medium" className="text-xs">
                    Clear All
                  </FontText>
                </Pressable>
              </Animated.View>
            )}
          </div>

          <div
            style={{
              width: 'fit-content',
              maxWidth: '100%',
              maxHeight: isCollapsed ? 0 : 220,
              opacity: isCollapsed ? 0 : 1,
              transform: isCollapsed ? 'translateY(18px)' : 'translateY(0)',
              overflow: isCollapsed ? 'hidden' : 'visible',
              pointerEvents: isCollapsed ? 'none' : 'auto',
              transition:
                'max-height 180ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 130ms ease-out, transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}>
            <div
              style={{
                width: 'fit-content',
                maxWidth: '100%',
                overflowX: 'auto',
                overflowY: 'hidden',
                padding: '24px 12px 24px',
                boxSizing: 'border-box',
                scrollbarGutter: 'stable',
              }}>
              <div
                style={{
                  display: 'flex',
                  width: 'max-content',
                  flexDirection: 'row',
                  gap: 20,
                  alignItems: 'flex-end',
                }}>
                {minimized.map((entry) => (
                  <Animated.View
                    key={entry.id}
                    entering={FadeInDown.springify().damping(17).stiffness(260)}
                    exiting={FadeOutDown.duration(140)}
                    layout={LinearTransition.springify().damping(18).stiffness(240)}
                    style={{ flexShrink: 0 }}>
                    <MinimizedCard
                      entry={entry}
                      onRestore={() => restore(entry.id)}
                      onRemove={() => removeMinimized(entry.id)}
                    />
                  </Animated.View>
                ))}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      <ConfirmDialog
        isOpen={isClearConfirmOpen}
        onOpenChange={setIsClearConfirmOpen}
        onConfirm={clearAll}
        title="Clear all minimized dialogs?"
        message="Are you sure you want to clear all minimized dialogs?"
        confirmLabel="Clear All"
        danger
      />
    </>
  );
};

export default MinimizeRow;
