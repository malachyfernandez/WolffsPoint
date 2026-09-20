import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';
import FontText from '../text/FontText';
import ConvexDialog from '../dialog/ConvexDialog';
import AppDropdownSearchInput from './dropdown/AppDropdownSearchInput';

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
  /** Shows a search field at the top of the dialog that narrows options as
   *  you type. Enabled by default; pass false to hide it. */
  searchable?: boolean;
  searchPlaceholder?: string;
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
  searchable = true,
  searchPlaceholder = 'Search…',
}: VisualDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const triggerRef = useRef<any>(null);

  const selectedOption = options.find((option) => option.value === value);

  const normalizedSearch = searchText.trim().toLowerCase();
  const visibleOptions = useMemo(() => {
    if (!normalizedSearch) {
      return options;
    }
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(normalizedSearch) ||
        option.value.toLowerCase().includes(normalizedSearch)
    );
  }, [normalizedSearch, options]);

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSearchText('');
      setActiveIndex(0);
    }
  }, []);

  const handleSearchChange = useCallback((text: string) => {
    setSearchText(text);
    setActiveIndex(0);
  }, []);

  const handleSearchKeyDown = useCallback(
    (key: string) => {
      if (visibleOptions.length === 0) {
        return;
      }
      setActiveIndex((currentValue) => {
        if (key === 'ArrowDown') {
          return Math.min(currentValue + 1, visibleOptions.length - 1);
        }
        if (key === 'ArrowUp') {
          return Math.max(currentValue - 1, 0);
        }
        return currentValue;
      });
    },
    [visibleOptions.length]
  );

  const handleValueChange = useCallback(
    (nextValue: string) => {
      onValueChange(nextValue);
      setIsOpen(false);
    },
    [onValueChange]
  );

  const renderOption = (option: VisualDropdownOption, index: number) => {
    const isSelected = option.value === value;
    const isActive = index === activeIndex;
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
              ref: isActive
                ? (element: { scrollIntoView?: (options: { block: string }) => void } | null) =>
                    element?.scrollIntoView?.({ block: 'nearest' })
                : undefined,
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
                  `w-full flex-row items-center gap-3 rounded-lg px-3 py-3 text-left ${isSelected ? 'bg-accent/15' : isActive ? 'bg-border/20' : 'bg-background hover:bg-border/10'}`.trim(),
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
            className={`w-full flex-row items-center gap-3 rounded-lg px-3 py-3 ${isSelected ? 'bg-accent/15' : isActive ? 'bg-border/20' : 'bg-background'}`}
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

      <ConvexDialog.Root isOpen={isOpen} onOpenChange={handleOpenChange}>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content isSwipeable={false} className="max-w-sm">
            {searchable && options.length > 0 && (
              <AppDropdownSearchInput
                value={searchText}
                onChangeText={handleSearchChange}
                placeholder={searchPlaceholder}
                onSubmit={() => {
                  const option = visibleOptions[activeIndex];
                  if (option) {
                    handleValueChange(option.value);
                  }
                }}
                onKeyDown={handleSearchKeyDown}
              />
            )}
            <View className="flex-col gap-1 pt-2">
              {visibleOptions.map((option, index) => renderOption(option, index))}
              {normalizedSearch.length > 0 && visibleOptions.length === 0 && (
                <FontText variant="subtext" className="py-4 text-center">
                  No matching options
                </FontText>
              )}
            </View>
          </ConvexDialog.Content>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>
    </>
  );
};

export default VisualDropdown;
