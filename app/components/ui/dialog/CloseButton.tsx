import React from 'react';
import { Pressable } from 'react-native';
import FontText from '../text/FontText';
import { useKeyboardShortcutHint } from '../../../../contexts/KeyboardShortcutHintContext';

interface CloseButtonProps {
    onPress: () => void;
    accessibilityLabel?: string;
}

export function CloseButton({ onPress, accessibilityLabel = 'Close' }: CloseButtonProps) {
    const { setHint } = useKeyboardShortcutHint();

    return (
        <Pressable
            onPress={onPress}
            onHoverIn={() => setHint(['esc'])}
            onHoverOut={() => setHint(null)}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            className='absolute right-0 top-0 z-10 h-10 w-10 bg-text-inverted/10 hover:bg-text-inverted/15 rounded-full items-center justify-center'
        >
            <FontText color='rgb(246, 238, 219)' weight='bold' className='text-xl'>
                ×
            </FontText>
        </Pressable>
    );
}

export default CloseButton;
