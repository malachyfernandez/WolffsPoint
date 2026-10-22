import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import FontText from '../ui/text/FontText';
import { ReactElement } from 'react';
import { useCSSVariable } from 'uniwind';

interface MiddleNavTabProps {
  text: string;
  children: React.ReactNode;
  isLast?: boolean;
  isInvisible?: boolean;
  isHighlighted?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}

const MiddleNavTab = ({
  text,
  children,
  isLast = false,
  isInvisible = false,
  isHighlighted = false,
  disabled = false,
  onPress,
}: MiddleNavTabProps): React.ReactElement => {
  const accentColor = useCSSVariable('--color-accent');
  const textColor = useCSSVariable('--color-text');

  const clonedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child as ReactElement<any>, {
        color: isHighlighted ? textColor : accentColor,
      });
    }
    return child;
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      className={`//HERE flex-3 border-accent rounded-t-4xl box-border h-12 flex-col items-center justify-center gap-0 rounded-b-[1px] border-x-2 border-t-2 ${isHighlighted ? 'bg-accent' : disabled ? 'bg-none' : 'hover:bg-accent/20 bg-none'} ${isInvisible ? 'opacity-0' : disabled ? 'cursor-not-allowed opacity-40' : 'opacity-100'} min-w-0`}>
      {clonedChildren}
      {isHighlighted ? (
        <FontText className="shrink-0 text-xs" color="text" weight="medium">
          {text}
        </FontText>
      ) : (
        <FontText className="shrink-0 text-xs" color="accent" weight="medium">
          {text}
        </FontText>
      )}
    </TouchableOpacity>
  );
};

export default MiddleNavTab;
