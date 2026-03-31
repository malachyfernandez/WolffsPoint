import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Popover } from 'heroui-native';
import { ChevronDown } from 'lucide-react-native';
import Column from '../../layout/Column';
import { WebDropdownPortal } from '../../../../contexts/WebDropdownProvider';
import AppDropdownEmptyState from './dropdown/AppDropdownEmptyState';
import AppDropdownItem from './dropdown/AppDropdownItem';
import AppDropdownMenu from './dropdown/AppDropdownMenu';
import AppDropdownTrigger from './dropdown/AppDropdownTrigger';
import PoppinsText from '../text/PoppinsText';

export interface AppDropdownOption {
    value: string;
    label: string;
}

interface AppDropdownProps {
    options: AppDropdownOption[];
    value?: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    emptyText?: string;
    triggerClassName?: string;
    contentClassName?: string;
    itemClassName?: string;
    selectedItemClassName?: string;
    emptyStateClassName?: string;
    centered?: boolean;
}

interface WebDropdownMenuPosition {
    bottom?: number;
    left: number;
    maxHeight: number;
    top?: number;
    width: number;
}

const WEB_DROPDOWN_OFFSET = 8;
const WEB_DROPDOWN_VIEWPORT_PADDING = 12;

const AppDropdown = ({
    options,
    value,
    onValueChange,
    placeholder = 'Select an option',
    emptyText = 'No options available',
    triggerClassName = '',
    contentClassName = '',
    itemClassName = '',
    selectedItemClassName = '',
    emptyStateClassName = '',
    centered = false,
}: AppDropdownProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedValue, setSelectedValue] = useState(value ?? '');
    const [webMenuPosition, setWebMenuPosition] = useState<WebDropdownMenuPosition | null>(null);
    const menuId = useId();
    const triggerRef = useRef<any>(null);

    useEffect(() => {
        setSelectedValue(value ?? '');
    }, [value]);

    const selectedOption = options.find((option) => option.value === selectedValue);

    const closeDropdown = useCallback(() => {
        setIsOpen(false);
        setWebMenuPosition(null);
    }, []);

    const updateWebMenuPosition = useCallback(() => {
        if (Platform.OS !== 'web' || typeof window === 'undefined') {
            return;
        }

        const triggerElement = triggerRef.current;
        const triggerRect = triggerElement?.getBoundingClientRect?.();

        if (!triggerRect) {
            return;
        }

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const menuWidth = Math.max(triggerRect.width, 160);
        const spaceBelow = viewportHeight - triggerRect.bottom - WEB_DROPDOWN_VIEWPORT_PADDING;
        const spaceAbove = triggerRect.top - WEB_DROPDOWN_VIEWPORT_PADDING;
        const shouldOpenAbove = spaceBelow < 220 && spaceAbove > spaceBelow;
        const constrainedLeft = Math.min(
            Math.max(WEB_DROPDOWN_VIEWPORT_PADDING, triggerRect.left),
            Math.max(WEB_DROPDOWN_VIEWPORT_PADDING, viewportWidth - menuWidth - WEB_DROPDOWN_VIEWPORT_PADDING)
        );
        const maxHeight = Math.max(
            120,
            (shouldOpenAbove ? spaceAbove : spaceBelow) - WEB_DROPDOWN_OFFSET
        );

        const nextPosition = shouldOpenAbove
            ? {
                bottom: viewportHeight - triggerRect.top + WEB_DROPDOWN_OFFSET,
                left: constrainedLeft,
                maxHeight,
                width: menuWidth,
            }
            : {
                left: constrainedLeft,
                maxHeight,
                top: triggerRect.bottom + WEB_DROPDOWN_OFFSET,
                width: menuWidth,
            };

        setWebMenuPosition(nextPosition);
    }, []);

    const handleValueChange = useCallback((nextValue: string) => {
        setSelectedValue(nextValue);
        onValueChange(nextValue);
        closeDropdown();
    }, [closeDropdown, onValueChange]);

    const handleTriggerPress = useCallback(() => {
        setIsOpen((currentValue) => {
            const nextValue = !currentValue;

            if (Platform.OS === 'web' && nextValue) {
                requestAnimationFrame(() => {
                    updateWebMenuPosition();
                });
            }

            return nextValue;
        });
    }, [updateWebMenuPosition]);

    useEffect(() => {
        if (Platform.OS !== 'web' || !isOpen) {
            return;
        }

        const handleScrollOrResize = () => {
            updateWebMenuPosition();
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                closeDropdown();
            }
        };

        updateWebMenuPosition();

        window.addEventListener('resize', handleScrollOrResize);
        window.addEventListener('scroll', handleScrollOrResize, true);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('resize', handleScrollOrResize);
            window.removeEventListener('scroll', handleScrollOrResize, true);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [closeDropdown, isOpen, updateWebMenuPosition]);

    const dropdownList = options.length ? (
        <Column gap={1} className='w-full'>
            {options.map((option) => (
                <AppDropdownItem
                    key={option.value}
                    className={itemClassName}
                    isSelected={option.value === selectedValue}
                    label={option.label}
                    onSelect={() => handleValueChange(option.value)}
                    selectedClassName={selectedItemClassName}
                />
            ))}
        </Column>
    ) : (
        <AppDropdownEmptyState className={emptyStateClassName} text={emptyText} />
    );

    const centeredWebOverlay = isOpen ? (
        <>
            {React.createElement('div', {
                'aria-hidden': true,
                onClick: (event: { preventDefault?: () => void; stopPropagation?: () => void }) => {
                    event.preventDefault?.();
                    event.stopPropagation?.();
                    closeDropdown();
                },
                onMouseDown: (event: { preventDefault?: () => void; stopPropagation?: () => void }) => {
                    event.preventDefault?.();
                    event.stopPropagation?.();
                },
                style: {
                    inset: 0,
                    pointerEvents: 'auto',
                    position: 'fixed',
                    zIndex: 99999,
                    animation: 'fadeIn 0.2s ease-out',
                },
            })}

            <div
                style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'auto',
                    zIndex: 100000,
                    animation: 'slideUp 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                }}
            >
                <AppDropdownMenu
                    id={menuId}
                    className={contentClassName}
                    onClick={(event) => {
                        event.preventDefault?.();
                        event.stopPropagation?.();
                    }}
                    onMouseDown={(event) => {
                        event.preventDefault?.();
                        event.stopPropagation?.();
                    }}
                    style={{
                        boxShadow: '0 100px 1000px -100px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.1), 0 0 80px rgba(0, 0, 0, 0.3)',
                        filter: 'drop-shadow(0 0 1000px rgba(0, 0, 0, 0.4))',
                        maxHeight: '60vh',
                        overflowY: 'auto',
                        minWidth: '100px',
                        width: '400px',
                        maxWidth: '80vw',
                    }}
                >
                    {dropdownList}
                </AppDropdownMenu>
            </div>
        </>
    ) : null;

    if (Platform.OS === 'web') {
        if (centered) {
            return (
                <>
                    <AppDropdownTrigger
                        ref={triggerRef}
                        className={triggerClassName}
                        isOpen={isOpen}
                        isPlaceholder={!selectedOption}
                        label={selectedOption?.label ?? placeholder}
                        onPress={handleTriggerPress}
                    />

                    {centeredWebOverlay}
                </>
            );
        }

        // Original web implementation (exact)
        return (
            <>
                <AppDropdownTrigger
                    ref={triggerRef}
                    className={triggerClassName}
                    isOpen={isOpen}
                    isPlaceholder={!selectedOption}
                    label={selectedOption?.label ?? placeholder}
                    onPress={handleTriggerPress}
                />

                {isOpen && webMenuPosition ? (
                    <WebDropdownPortal>
                        <>
                            {React.createElement('div', {
                                'aria-hidden': true,
                                onClick: (event: { preventDefault?: () => void; stopPropagation?: () => void }) => {
                                    event.preventDefault?.();
                                    event.stopPropagation?.();
                                    closeDropdown();
                                },
                                onMouseDown: (event: { preventDefault?: () => void; stopPropagation?: () => void }) => {
                                    event.preventDefault?.();
                                    event.stopPropagation?.();
                                },
                                style: {
                                    inset: 0,
                                    pointerEvents: 'auto',
                                    position: 'fixed',
                                },
                            })}

                            <AppDropdownMenu
                                id={menuId}
                                className={contentClassName}
                                onClick={(event) => {
                                    event.preventDefault?.();
                                    event.stopPropagation?.();
                                }}
                                onMouseDown={(event) => {
                                    event.preventDefault?.();
                                    event.stopPropagation?.();
                                }}
                                style={{
                                    ...(webMenuPosition.bottom !== undefined
                                        ? { bottom: webMenuPosition.bottom }
                                        : { top: webMenuPosition.top }),
                                    left: webMenuPosition.left,
                                    maxHeight: webMenuPosition.maxHeight,
                                    overflowY: 'auto',
                                    pointerEvents: 'auto',
                                    position: 'fixed',
                                    width: webMenuPosition.width,
                                }}
                            >
                                {dropdownList}
                            </AppDropdownMenu>
                        </>
                    </WebDropdownPortal>
                ) : null}
            </>
        );
    }

    return (
        <Popover isOpen={isOpen} onOpenChange={setIsOpen}>
            <Popover.Trigger className={`w-full flex-row items-center justify-between rounded border border-subtle-border bg-background px-3 py-3 ${triggerClassName}`.trim()}>
                <PoppinsText weight='medium' className={!selectedOption ? 'opacity-60' : ''}>
                    {selectedOption?.label ?? placeholder}
                </PoppinsText>
                <ChevronDown size={18} color='rgb(46, 41, 37)' />
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Overlay
                    className='bg-black/10'
                    isAnimatedStyleActive={true}
                />
                <Popover.Content
                    presentation='popover'
                    width='trigger'
                    placement='bottom'
                    offset={8}
                    animation={undefined}
                    className={`rounded border border-subtle-border bg-background p-1 ${contentClassName}`}
                    style={undefined}
                >
                    {dropdownList}
                </Popover.Content>
            </Popover.Portal>
        </Popover>
    );
};

export default AppDropdown;
