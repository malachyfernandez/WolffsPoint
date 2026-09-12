import React, { useState, useCallback } from 'react';
import { Pressable } from 'react-native';
import FontText from '../text/FontText';
import MustSaveDialog from './MustSaveDialog';

interface MinimizeButtonProps {
  /** Whether the dialog currently has unsaved changes. */
  hasUnsavedChanges: boolean;
  /** Save the current changes (without closing the dialog). */
  onSave: () => void;
  /** Perform the minimize action. Only called when changes are saved. */
  onMinimize: () => void;
}

/**
 * A circular "−" minimize button for dialogs, styled like CloseButton.
 * Positioned absolutely in the top-right, to the left of the save pill.
 *
 * - If there are unsaved changes, shows a MustSaveDialog confirmation first.
 * - Once saved (or if no changes), calls `onMinimize`.
 * - Marked with `minimize-hide` class so it's stripped from the minimized clone.
 *
 * Place this right after CloseButton inside the dialog content.
 */
const MinimizeButton = ({
  hasUnsavedChanges,
  onSave,
  onMinimize,
}: MinimizeButtonProps) => {
  const [mustSaveOpen, setMustSaveOpen] = useState(false);

  const handlePress = useCallback(() => {
    if (hasUnsavedChanges) {
      setMustSaveOpen(true);
    } else {
      onMinimize();
    }
  }, [hasUnsavedChanges, onMinimize]);

  const handleSaveAndMinimize = useCallback(() => {
    onSave();
    onMinimize();
  }, [onSave, onMinimize]);

  return (
    <>
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel="Minimize"
        className="minimize-hide absolute right-11 top-0 z-10 h-10 w-10 items-center justify-center rounded-full bg-text-inverted/10 hover:bg-text-inverted/15"
      >
        <FontText color="rgb(246, 238, 219)" weight="bold" className="text-xl leading-none">
          −
        </FontText>
      </Pressable>

      <MustSaveDialog
        isOpen={mustSaveOpen}
        onOpenChange={setMustSaveOpen}
        onSave={handleSaveAndMinimize}
      />
    </>
  );
};

export default MinimizeButton;
