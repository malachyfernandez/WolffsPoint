import React, { useEffect, useId, useRef } from 'react';
import { Platform, Pressable } from 'react-native';
import FontText from '../../text/FontText';
import { useTooltip } from 'hooks/useTooltip';

interface AppDropdownItemProps {
  className?: string;
  /** Keyboard-highlighted option: the one Enter will select while focus
   *  stays in the search field. */
  isActive?: boolean;
  isSelected: boolean;
  label: string;
  onSelect: () => void;
  selectedClassName?: string;
  disabledReason?: string;
}

const AppDropdownItem = ({
  className = '',
  isActive = false,
  isSelected,
  label,
  onSelect,
  selectedClassName = '',
  disabledReason,
}: AppDropdownItemProps) => {
  const buttonRef = useRef<any>(null);
  const { setHovered } = useTooltip(useId(), disabledReason);

  useEffect(() => {
    if (isActive && Platform.OS === 'web') {
      buttonRef.current?.scrollIntoView?.({ block: 'nearest' });
    }
  }, [isActive]);

  const stateClassName = disabledReason
    ? 'opacity-40'
    : isSelected
      ? `bg-accent-hover ${selectedClassName}`.trim()
      : isActive
        ? 'bg-border/20'
        : 'hover:bg-border/10 active:bg-border/10';

  if (Platform.OS === 'web') {
    return React.createElement(
      'button',
      {
        ref: buttonRef,
        type: 'button',
        role: 'option',
        'aria-selected': isSelected,
        'aria-disabled': !!disabledReason,
        onMouseEnter: () => setHovered(true),
        onMouseLeave: () => setHovered(false),
        onClick: (event: { preventDefault?: () => void; stopPropagation?: () => void }) => {
          event.preventDefault?.();
          event.stopPropagation?.();
          onSelect();
        },
        onMouseDown: (event: { preventDefault?: () => void; stopPropagation?: () => void }) => {
          event.preventDefault?.();
          event.stopPropagation?.();
        },
        style: {
          appearance: 'none',
          background: 'transparent',
          border: 'none',
          cursor: disabledReason ? 'not-allowed' : 'pointer',
          margin: 0,
          padding: 0,
          textAlign: 'left',
          width: '100%',
        },
      },
      React.createElement(
        'div',
        {
          className: `w-full rounded px-3 py-3 text-left ${stateClassName} ${className}`.trim(),
        },
        <FontText weight={isSelected ? 'medium' : 'regular'}>{label}</FontText>
      )
    );
  }

  return (
    <Pressable
      accessibilityState={{ disabled: !!disabledReason }}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      className={`w-full rounded px-3 py-3 ${stateClassName} ${className}`.trim()}
      onPress={onSelect}>
      <FontText weight={isSelected ? 'medium' : 'regular'}>{label}</FontText>
    </Pressable>
  );
};

export default AppDropdownItem;
