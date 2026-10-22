import React from 'react';
import Column from '../../layout/Column';
import FontText from '../text/FontText';
import type { ViewStyle } from 'react-native';

interface DialogHeaderProps {
  text: string;
  subtext?: string;
  className?: string;
  textClassName?: string;
  style?: ViewStyle;
}

const DialogHeader = ({ text, subtext, className, textClassName, style }: DialogHeaderProps) => {
  return (
    <Column
      className={`bg-text gap-0 px-5 pb-4 ${subtext ? 'pt-6' : 'pt-8'} min-h-17 border-accent/50 -mx-5 -mt-5 border-b ${className || ''}`.trim()}
      style={style}>
      <FontText weight="medium" color="white" className={textClassName}>
        {text}
      </FontText>
      {subtext && (
        <FontText variant="subtext" weight="medium" color="white">
          {subtext}
        </FontText>
      )}
    </Column>
  );
};

export default DialogHeader;
