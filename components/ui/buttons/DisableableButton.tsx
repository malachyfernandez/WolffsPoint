import React from 'react';
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
  onHoverIn?: () => void;
  onHoverOut?: () => void;
  /** Keyboard shortcut keys to display as a hint when hovering */
  keyboardHint?: string[];
}

const DisableableButton = ({
  isEnabled,
  enabledText,
  disabledText,
  onPress,
  className = '',
  enabledVariant = 'filled',
  onHoverIn,
  onHoverOut,
  keyboardHint,
}: DisableableButtonProps) => {
  const widthClass = className.match(/(?:^|\s)(min-w-\S+)/)?.[1] ?? 'w-32';
  return isEnabled ? (
    <AppButton 
      className={`h-12 ${widthClass} ${className}`} 
      variant={enabledVariant} 
      onPress={onPress}
      onHoverIn={onHoverIn}
      onHoverOut={onHoverOut}
      keyboardHint={keyboardHint}
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
