import React from 'react';
import { View } from 'react-native';
import AppButton from './AppButton';
import FontText from '../text/FontText';
import StatusButton from '../StatusButton';

interface DisableableButtonProps {
    isEnabled: boolean;
    enabledText: string;
    disabledText: string;
    onPress: () => void;
    className?: string;
    enabledVariant?: 'filled' | 'grey' | 'outline' | 'outline-alt' | 'accent';
}

const DisableableButton = ({
    isEnabled,
    enabledText,
    disabledText,
    onPress,
    className = '',
    enabledVariant = 'filled',
}: DisableableButtonProps) => {
    const widthClass = className.match(/(?:^|\s)(min-w-\S+)/)?.[1] ?? 'w-32';
    return isEnabled ? (
        <AppButton 
            className={`h-12 ${widthClass} ${className}`} 
            variant={enabledVariant} 
            onPress={onPress}
        >
            <FontText color={enabledVariant === 'outline' || enabledVariant === 'outline-alt' ? 'black' : 'white'} weight='medium'>
                {enabledText}
            </FontText>
        </AppButton>
    ) : (
        <StatusButton 
            buttonText={enabledText}
            buttonAltText={disabledText}
            className={`h-12 ${widthClass} ${className}`}
        />
    );
};

export default DisableableButton;
