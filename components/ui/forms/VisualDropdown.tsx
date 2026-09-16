import React, { useCallback, useRef, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';
import FontText from '../text/FontText';
import ConvexDialog from '../dialog/ConvexDialog';

export interface VisualDropdownOption {
  value: string;
  label: string;
  /** Custom visual preview rendered inside the option row. */
  preview: React.ReactNode;
}

interface VisualDropdownProps {
  options: VisualDropdownOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  /** Option value marked as the user's default — shows a "Default" badge
   *  in the top right of that option row. */
  defaultValue?: string;
  /** When provided, renders a "Set as default" row at the bottom of the
   *  dropdown which is called with the currently selected value. */
  onSetDefault?: (value: string) => void;
}

/**
 * A dialog-centered dropdown with visual previews for each option.
 * Designed for use inside modals (uses ConvexDialog, not the web portal).
 */
const VisualDropdown = ({
  options,
  value,
  onValueChange,
  placeholder = 'Select an option',
  label,
  defaultValue,
  onSetDefault,
}: VisualDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<any>(null);

  const selectedOption = options.find((option) => option.value === value);

  const handleValueChange = useCallback(
    (nextValue: string) => {
      onValueChange(nextValue);
      setIsOpen(false);
    },
    [onValueChange]
  );

  const renderOption = (option: VisualDropdownOption) => {
    const isSelected = option.value === value;
    const isDefault = option.value === defaultValue;
    const cornerControl = isDefault ? (
      <View style={{ pointerEvents: 'none' }} className="absolute right-3 top-2">
        <FontText variant="subtext" className="text-xs">
          Default
        </FontText>
      </View>
    ) : onSetDefault ? (
      <Pressable
        onPress={() => onSetDefault(option.value)}
        className={`border-border bg-background hover:bg-border/10 active:bg-border/10 absolute right-3 top-2 rounded-full border px-2.5 py-0.5 transition-all ${Platform.OS === 'web' ? 'opacity-0 group-hover:opacity-100' : ''}`.trim()}>
        <FontText weight="medium" className="text-xs">
          Set as default
        </FontText>
      </Pressable>
    ) : null;
    return (
      <View key={option.value} className="group relative w-full">
        {Platform.OS === 'web' ? (
          React.createElement(
            'button',
            {
              type: 'button',
              role: 'option',
              'aria-selected': isSelected,
              onClick: (event: { preventDefault?: () => void; stopPropagation?: () => void }) => {
                event.preventDefault?.();
                event.stopPropagation?.();
                handleValueChange(option.value);
              },
              onMouseDown: (event: {
                preventDefault?: () => void;
                stopPropagation?: () => void;
              }) => {
                event.preventDefault?.();
                event.stopPropagation?.();
              },
              style: {
                appearance: 'none',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                margin: 0,
                padding: 0,
                textAlign: 'left',
                width: '100%',
              },
            },
            React.createElement(
              'div',
              {
                className:
                  `w-full flex-row items-center gap-3 rounded-lg px-3 py-3 text-left ${isSelected ? 'bg-accent/15' : 'bg-background hover:bg-border/10'}`.trim(),
              },
              <View
                className={`h-5 w-5 items-center justify-center rounded-full border ${isSelected ? 'border-accent bg-accent' : 'border-border'}`}>
                {isSelected && <Check size={13} color="white" />}
              </View>,
              <View className="min-w-0 flex-1">{option.preview}</View>
            )
          )
        ) : (
          <Pressable
            className={`w-full flex-row items-center gap-3 rounded-lg px-3 py-3 ${isSelected ? 'bg-accent/15' : 'bg-background'}`}
            onPress={() => handleValueChange(option.value)}>
            <View
              className={`h-5 w-5 items-center justify-center rounded-full border ${isSelected ? 'border-accent bg-accent' : 'border-border'}`}>
              {isSelected && <Check size={13} color="white" />}
            </View>
            <View className="min-w-0 flex-1">{option.preview}</View>
          </Pressable>
        )}
        {cornerControl}
      </View>
    );
  };

  return (
    <>
      <View className="flex-col gap-1.5">
        {label && (
          <FontText weight="medium" className="text-sm opacity-70">
            {label}
          </FontText>
        )}
        <Pressable
          ref={triggerRef as any}
          onPress={() => setIsOpen(true)}
          className="border-subtle-border bg-background w-full flex-row items-center justify-between rounded-lg border px-3 py-3">
          <View className="min-w-0 flex-1">
            {selectedOption ? (
              <View className="flex-row items-center gap-2">
                <View className="min-w-0 flex-1">{selectedOption.preview}</View>
              </View>
            ) : (
              <FontText className="opacity-60">{placeholder}</FontText>
            )}
          </View>
          <ChevronDown size={18} color="rgb(46, 41, 37)" />
        </Pressable>
      </View>

      <ConvexDialog.Root isOpen={isOpen} onOpenChange={setIsOpen}>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content isSwipeable={false} className="max-w-sm">
            <View className="flex-col gap-1 pt-2">{options.map(renderOption)}</View>
          </ConvexDialog.Content>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>
    </>
  );
};

export default VisualDropdown;
