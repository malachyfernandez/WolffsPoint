import React from 'react';
import { Pressable } from 'react-native';
import PoppinsText from '../../ui/text/PoppinsText';

interface CloseButtonProps {
    onPress: () => void;
}

export function CloseButton({ onPress }: CloseButtonProps) {
    return (
        <Pressable
            onPress={onPress}
            className='absolute right-4 top-4 z-10 h-10 w-10 bg-accent-hover rounded-full items-center justify-center'
        >
            <PoppinsText color='rgb(246, 238, 219)' weight='bold' className='text-xl'>
                ×
            </PoppinsText>
        </Pressable>
    );
}
