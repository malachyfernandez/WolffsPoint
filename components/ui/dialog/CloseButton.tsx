import React, { useId } from 'react';
import { Pressable } from 'react-native';
import FontText from '../text/FontText';
import { useKeyboardShortcutHint } from 'contexts/KeyboardShortcutHintContext';
import { useTooltip } from 'hooks/useTooltip';

interface CloseButtonProps {
  onPress: () => void;
  accessibilityLabel?: string;
}

export function CloseButton({ onPress, accessibilityLabel = 'Close' }: CloseButtonProps) {
  const { setHint } = useKeyboardShortcutHint();
  const { setHovered } = useTooltip(useId(), accessibilityLabel);

  return (
    <Pressable
      onPress={() => {
        setHovered(false);
        onPress();
      }}
      onHoverIn={() => {
        setHovered(true);
        setHint(['esc']);
      }}
      onHoverOut={() => {
        setHovered(false);
        setHint(null);
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className="minimize-hide bg-text-inverted/10 hover:bg-text-inverted/15 absolute right-0 top-0 z-10 h-10 w-10 items-center justify-center rounded-full">
      <FontText color="rgb(246, 238, 219)" weight="bold" className="text-xl">
        ×
      </FontText>
    </Pressable>
  );
}

export default CloseButton;
