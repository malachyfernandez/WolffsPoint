import React from 'react';
import Column from '../../layout/Column';
import FontText from '../text/FontText';
import type { ViewStyle } from 'react-native';

interface DialogHeaderProps {
  text: string;
  subtext?: string;
  className?: string;
  /** Extra classes on the title text (e.g. a smaller size). */
  textClassName?: string;
  style?: ViewStyle;
}

const DialogHeader = ({ text, subtext, className, textClassName, style }: DialogHeaderProps) => {
  return (
    <Column
      className={`minimize-hide bg-text border-accent/50 -mx-5 -mt-5 mb-0 items-start gap-0 rounded-t-sm border-b pb-4 pl-5 pr-44 pt-4 ${className || ''}`}
      style={style}>
      <FontText weight="medium" color="white" className={`shrink ${textClassName ?? ''}`.trim()}>
        {text}
      </FontText>
      {subtext && (
        <FontText variant="subtext" weight="medium" color="white" className="shrink">
          {subtext}
        </FontText>
      )}
    </Column>
  );
};

export default DialogHeader;
