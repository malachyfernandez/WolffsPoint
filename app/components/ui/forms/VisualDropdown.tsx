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
        return (
            <View key={option.value} className="w-full">
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
                            onMouseDown: (event: { preventDefault?: () => void; stopPropagation?: () => void }) => {
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
                                className: `w-full flex-row items-center gap-3 rounded-lg px-3 py-3 text-left ${isSelected ? 'bg-accent/15' : 'bg-background hover:bg-border/10'}`.trim(),
                            },
                            <View className={`h-5 w-5 items-center justify-center rounded-full border ${isSelected ? 'border-accent bg-accent' : 'border-border'}`}>
                                {isSelected && <Check size={13} color="white" />}
                            </View>,
                            <View className="min-w-0 flex-1">
                                {option.preview}
                            </View>
                        )
                    )
                ) : (
                    <Pressable
                        className={`w-full flex-row items-center gap-3 rounded-lg px-3 py-3 ${isSelected ? 'bg-accent/15' : 'bg-background'}`}
                        onPress={() => handleValueChange(option.value)}>
                        <View className={`h-5 w-5 items-center justify-center rounded-full border ${isSelected ? 'border-accent bg-accent' : 'border-border'}`}>
                            {isSelected && <Check size={13} color="white" />}
                        </View>
                        <View className="min-w-0 flex-1">
                            {option.preview}
                        </View>
                    </Pressable>
                )}
            </View>
        );
    };

    return (
        <>
            {label && (
                <FontText weight="medium" className="text-sm opacity-70 mb-1.5">
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
                            <View className="min-w-0 flex-1">
                                {selectedOption.preview}
                            </View>
                        </View>
                    ) : (
                        <FontText className="opacity-60">{placeholder}</FontText>
                    )}
                </View>
                <ChevronDown size={18} color="rgb(46, 41, 37)" />
            </Pressable>

            <ConvexDialog.Root isOpen={isOpen} onOpenChange={setIsOpen}>
                <ConvexDialog.Portal>
                    <ConvexDialog.Overlay />
                    <ConvexDialog.Content isSwipeable={false} className="max-w-sm">
                        <Pressable
                            onPress={() => setIsOpen(false)}
                            className="bg-text-inverted/10 hover:bg-text-inverted/15 absolute right-0 top-0 z-10 h-10 w-10 items-center justify-center rounded-full">
                            <View>
                                <FontText weight="bold" color="white" className="text-lg">✕</FontText>
                            </View>
                        </Pressable>
                        <View className="flex-col gap-1 pt-2">
                            {options.map(renderOption)}
                        </View>
                    </ConvexDialog.Content>
                </ConvexDialog.Portal>
            </ConvexDialog.Root>
        </>
    );
};

export default VisualDropdown;
