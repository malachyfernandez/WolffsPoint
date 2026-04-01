import React from 'react';
import { View } from 'react-native';
import AppButton from './AppButton';
import PoppinsText from '../text/PoppinsText';
import StatusButton from '../StatusButton';

interface DisableableButtonProps {
    isEnabled: boolean;
    enabledText: string;
    disabledText: string;
    onPress: () => void;
    className?: string;
    enabledVariant?: 'black' | 'green' | 'grey' | 'outline' | 'outline-alt';
}

const DisableableButton = ({
    isEnabled,
    enabledText,
    disabledText,
    onPress,
    className = '',
    enabledVariant = 'black',
}: DisableableButtonProps) => {
    return isEnabled ? (
        <AppButton 
            className={`w-32 h-10 ${className}`} 
            variant={enabledVariant} 
            onPress={onPress}
        >
            <PoppinsText color={enabledVariant === 'outline' ? 'black' : 'white'} weight='medium'>
                {enabledText}
            </PoppinsText>
        </AppButton>
    ) : (
        <StatusButton 
            buttonText={enabledText}
            buttonAltText={disabledText}
            className={`w-32 h-10 ${className}`}
        />
    );
};

export default DisableableButton;
