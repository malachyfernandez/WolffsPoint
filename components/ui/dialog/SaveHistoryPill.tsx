import React, { useId } from 'react';
import { useTooltip } from 'hooks/useTooltip';
import { Pressable, View } from 'react-native';
import { History } from 'lucide-react-native';
import FontText from '../text/FontText';
import { useToast } from 'contexts/ToastContext';
import { useKeyboardShortcutHint } from 'contexts/KeyboardShortcutHintContext';
import { useMinimize } from '../minimize/MinimizeContext';

interface SaveHistoryPillProps {
  hasUnsavedChanges: boolean;
  isInvalid?: boolean;
  invalidMessage?: string;
  onSave: () => void;
  onOpenHistory: () => void;
  hasMinimizeButton?: boolean;
  /** When false the history half is hidden and Save fills the pill — for
   *  editors with save but no history backing (avoids a dead button). */
  hasHistoryButton?: boolean;
}

/**
 * A two-button pill for the top-right of editor dialogs.
 * Left 3/4 = "Save" (saves without closing). Right 1/4 = history icon.
 * Together they form a single pill shape.
 *
 * - When there are no unsaved changes, the save half renders with a dashed outline
 *   and pressing it shows a "Nothing to save" toast.
 * - When isInvalid is true, pressing save shows the invalidMessage toast.
 * - The history half is always clickable.
 */
export function SaveHistoryPill({
  hasUnsavedChanges,
  isInvalid = false,
  invalidMessage,
  onSave,
  onOpenHistory,
  hasMinimizeButton = false,
  hasHistoryButton = true,
}: SaveHistoryPillProps) {
  const { showToast } = useToast();
  const { setHint } = useKeyboardShortcutHint();
  const { isAvailable: isMinimizeAvailable } = useMinimize();
  const { setHovered: setSaveHovered } = useTooltip(useId(), 'Save');
  const { setHovered: setHistoryHovered } = useTooltip(useId(), 'Save history');

  const handleSavePress = () => {
    if (isInvalid) {
      showToast(invalidMessage ?? 'Invalid input');
      return;
    }
    if (!hasUnsavedChanges) {
      showToast('Nothing to save');
      return;
    }
    onSave();
  };

  const saveBgClass = hasUnsavedChanges
    ? 'bg-text-inverted/10 hover:bg-text-inverted/15'
    : 'bg-transparent border border-dashed border-text-inverted/30';
  const positionClass = hasMinimizeButton && isMinimizeAvailable ? 'right-22' : 'right-11';

  return (
    <View
      className={`save-history-pill-bg minimize-hide absolute ${positionClass} top-0 z-10 p-0 pl-4`}>
      <View className="h-10 flex-row items-stretch">
        {/* Save half: fixed width, symmetric padding */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save"
          onPress={() => {
            setSaveHovered(false);
            handleSavePress();
          }}
          onHoverIn={() => {
            setSaveHovered(true);
            setHint(['cmd', 's']);
          }}
          onHoverOut={() => {
            setSaveHovered(false);
            setHint(null);
          }}
          className={`${saveBgClass} h-full w-16 items-center justify-center rounded-l-full ${hasHistoryButton ? 'rounded-r-none' : 'rounded-r-full'} pl-3 pr-2`}>
          <FontText color="rgb(246, 238, 219)" weight="medium" className="text-sm">
            Save
          </FontText>
        </Pressable>

        {/* History half: fixed width, symmetric padding */}
        {hasHistoryButton && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save history"
            onPress={() => {
              setHistoryHovered(false);
              onOpenHistory();
            }}
            onHoverIn={() => setHistoryHovered(true)}
            onHoverOut={() => {
              setHistoryHovered(false);
              setHint(null);
            }}
            className="bg-text-inverted/10 hover:bg-text-inverted/15 h-full w-10 items-center justify-center rounded-l-none rounded-r-full pl-2 pr-3">
            <History size={16} color="rgb(246, 238, 219)" />
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default SaveHistoryPill;
