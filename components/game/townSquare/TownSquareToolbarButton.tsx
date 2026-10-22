import React, { ReactNode, useId, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTooltip } from 'hooks/useTooltip';
import Row from '../../layout/Row';

interface TownSquareToolbarButtonProps {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  isActive?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  onPress?: () => void;
  label?: string;
}

const TownSquareToolbarButton = ({
  children,
  className = '',
  disabled = false,
  isActive = false,
  isFirst = false,
  isLast = false,
  onPress,
  label,
}: TownSquareToolbarButtonProps) => {
  const [isPressed, setIsPressed] = useState(false);
  const { setHovered } = useTooltip(useId(), label);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      className={[
        'border-border hover:bg-text/5 h-12 min-w-12 items-center justify-center border-y-2 px-4',
        isFirst ? 'rounded-l-2xl border-l-2' : 'border-l-0',
        isLast ? 'rounded-r-2xl border-r-2' : 'border-r-0',
        isActive ? 'bg-accent/10' : '',
        isPressed ? 'brightness-75' : '',
        disabled ? 'opacity-50' : '',
        className,
      ].join(' ')}
      disabled={disabled}
      onPress={
        disabled
          ? undefined
          : () => {
              setHovered(false);
              onPress?.();
            }
      }
      onPressIn={() => !disabled && setIsPressed(true)}
      onPressOut={() => !disabled && setIsPressed(false)}>
      <Row className="h-full w-full items-center justify-center gap-4" pointerEvents="none">
        {children}
      </Row>
    </Pressable>
  );
};

interface TownSquareToolbarButtonGroupProps {
  children: ReactNode;
  className?: string;
}

export const TownSquareToolbarButtonGroup = ({
  children,
  className = '',
}: TownSquareToolbarButtonGroupProps) => {
  return <View className={`flex-row items-center ${className}`}>{children}</View>;
};

export default TownSquareToolbarButton;
