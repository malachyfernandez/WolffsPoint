import React from 'react';
import { Pressable } from 'react-native';
import FontText from '../../ui/text/FontText';

interface CloseButtonProps {
    onPress: () => void;
}

export function CloseButton({ onPress }: CloseButtonProps) {
    return (
        <Pressable
            onPress={onPress}
            className='absolute right-4 top-4 z-10 h-10 w-10 bg-text-inverted/10 hover:bg-text-inverted/15   rounded-full items-center justify-center'
        >
            <FontText color='rgb(246, 238, 219)' weight='bold' className='text-xl'>
                ×
            </FontText>
        </Pressable>
    );
}
