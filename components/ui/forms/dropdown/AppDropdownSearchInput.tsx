import React from 'react';
import { Platform, TextInput } from 'react-native';

interface AppDropdownSearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  onSubmit?: () => void;
  className?: string;
}

/**
 * Shared search field rendered at the top of dropdown menus. On web it is
 * wrapped in a div that stops mouse events from bubbling up to the menu
 * container — the menu calls preventDefault on mousedown (so clicks don't
 * steal focus/dismiss), which would otherwise keep this input unfocusable.
 */
const AppDropdownSearchInput = ({
  value,
  onChangeText,
  placeholder = 'Search…',
  autoFocus = true,
  onSubmit,
  className = '',
}: AppDropdownSearchInputProps) => {
  const input = (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#0004"
      className={`bg-text/10 w-full rounded-lg px-3 py-2 text-sm ${className}`.trim()}
      style={Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : undefined}
      autoCapitalize="none"
      autoCorrect={false}
      autoFocus={autoFocus}
      onSubmitEditing={onSubmit}
      returnKeyType="search"
    />
  );

  if (Platform.OS !== 'web') {
    return input;
  }

  return React.createElement(
    'div',
    {
      className: 'w-full pb-1',
      onMouseDown: (event: { stopPropagation?: () => void }) => {
        event.stopPropagation?.();
      },
      onClick: (event: { stopPropagation?: () => void }) => {
        event.stopPropagation?.();
      },
    },
    input
  );
};

export default AppDropdownSearchInput;
