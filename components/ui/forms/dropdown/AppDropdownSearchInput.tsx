import React, { useEffect, useRef } from 'react';
import { Platform, TextInput } from 'react-native';

interface AppDropdownSearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  onSubmit?: () => void;
  /** Called with 'ArrowUp' | 'ArrowDown' when those keys are pressed while the
   *  field is focused (web only) so the parent can move a highlighted option
   *  without focus leaving the input. */
  onKeyDown?: (key: string) => void;
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
  onKeyDown,
  className = '',
}: AppDropdownSearchInputProps) => {
  const inputRef = useRef<TextInput>(null);

  // Dialogs and portals often move focus to their container while mounting,
  // so refocus a few times after mount instead of relying on autoFocus alone.
  useEffect(() => {
    if (!autoFocus) {
      return;
    }

    inputRef.current?.focus();
    const retry = setTimeout(() => inputRef.current?.focus(), 80);
    const retryLate = setTimeout(() => inputRef.current?.focus(), 240);
    return () => {
      clearTimeout(retry);
      clearTimeout(retryLate);
    };
  }, [autoFocus]);

  const input = (
    <TextInput
      ref={inputRef}
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
      onKeyDown: (event: { key?: string; preventDefault?: () => void }) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault?.();
          onKeyDown?.(event.key);
        }
      },
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
