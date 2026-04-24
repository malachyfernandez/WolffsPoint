import React from 'react';
import { Tabs } from 'heroui-native';

interface TabSelectorProps {
    value: string;
    onValueChange: (tab: string) => void;
}

export function TabSelector({ value, onValueChange }: TabSelectorProps) {
    return (
        <Tabs value={value} onValueChange={onValueChange} variant='secondary' className=''>
            <Tabs.List>
                <Tabs.Indicator />
                <Tabs.Trigger value='editing'>
                    {({ isSelected }) => (
                        <Tabs.Label className={isSelected ? 'text-black font-medium' : 'text-gray-500'}>
                            Editing
                        </Tabs.Label>
                    )}
                </Tabs.Trigger>
                <Tabs.Trigger value='preview'>
                    {({ isSelected }) => (
                        <Tabs.Label className={isSelected ? 'text-black font-medium' : 'text-gray-500'}>
                            Preview
                        </Tabs.Label>
                    )}
                </Tabs.Trigger>
            </Tabs.List>
        </Tabs>
    );
}
export default TabSelector;
