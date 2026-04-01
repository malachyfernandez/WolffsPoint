import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Tabs } from 'heroui-native';
import Column from '../layout/Column';
import Row from '../layout/Row';
import PoppinsText from '../ui/text/PoppinsText';
import AppButton from '../ui/buttons/AppButton';
import NewspaperWritingView from './NewspaperWritingView';
import NewspaperViewingView from './NewspaperViewingView';
import NewspaperPageHeader from './newspaperPageOperator/NewspaperPageHeader';
import NewspaperViewingHeader from './NewspaperViewingHeader';
import { useUserList } from 'hooks/useUserList';
import ComprehensiveDaySelector from '../ui/daySelector/ComprehensiveDaySelector';

interface NewspaperPageOPERATORProps {
    currentUserId: string;
    gameId: string;
}

const NewspaperPageOPERATOR = ({ gameId }: NewspaperPageOPERATORProps) => {
    const [activeTab, setActiveTab] = useState('writing');

    // Get the current day key from shared state
    const [selectedDayIndex] = useUserList<number>({
        key: "selectedDayIndex",
        itemId: gameId,
        privacy: "PUBLIC",
        defaultValue: 0,
    });

    const [dayDatesArray] = useUserList<string[]>({
        key: "dayDatesArray",
        itemId: gameId,
        privacy: "PUBLIC",
        defaultValue: [],
    });

    // Convert stored MM/DD/YYYY strings back to real Date objects for UI use
    const fixedDayDatesArray = dayDatesArray.value.map(dateStr => {
        const [month, day, year] = dateStr.split('/').map(Number);
        return new Date(year, month - 1, day);
    });

    // Create a unique key for the newspaper based on the day index (not date)
    const getNewspaperKey = (dayIndex: number) => {
        return `day-${dayIndex}`;
    };

    const currentDayKey = getNewspaperKey(selectedDayIndex.value);

    const addColumn = () => {
        // This function will be handled by the NewspaperWritingView component
        // which has its own state management for columns
    };

    return (
        <Column gap={4}>
            {/* Day Selector Bar - Now using reusable component */}
            <View className='mt-2 -mb-4 w-full'>
                <ComprehensiveDaySelector gameId={gameId} />
            </View>

            {/* Header with BlurView and Tabs */}
            <View className='relative'>
                <BlurView 
                    intensity={20} 
                    tint='light'
                    className='absolute top-0 left-0 right-0 h-full'
                />
                <View className='relative'>
                    <Column className='p-4'>
                        <Tabs value={activeTab} onValueChange={setActiveTab} variant="secondary" className="flex-1">
                            <Tabs.List>
                                <Tabs.Indicator />
                                <Tabs.Trigger value="writing">
                                    {({ isSelected }) => (
                                        <Tabs.Label className={isSelected ? 'text-black font-medium' : 'text-gray-500'}>
                                            Writing
                                        </Tabs.Label>
                                    )}
                                </Tabs.Trigger>
                                <Tabs.Trigger value="viewing">
                                    {({ isSelected }) => (
                                        <Tabs.Label className={isSelected ? 'text-black font-medium' : 'text-gray-500'}>
                                            Viewing
                                        </Tabs.Label>
                                    )}
                                </Tabs.Trigger>
                            </Tabs.List>
                        </Tabs>
                    </Column>
                </View>
            </View>

            {/* Content Area */}
            <Column className='w-[950px]'>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
                    <Tabs.Content value="writing" className='flex-1'>
                        <Column gap={4}>
                            <NewspaperWritingView gameId={`${gameId}-${currentDayKey}`} />
                        </Column>
                    </Tabs.Content>

                    <Tabs.Content value="viewing" className='flex-1'>
                        <Column gap={4}>
                            <NewspaperViewingHeader />
                            <NewspaperViewingView gameId={`${gameId}-${currentDayKey}`} />
                        </Column>
                    </Tabs.Content>
                </Tabs>
            </Column>
        </Column>
    );
};

export default NewspaperPageOPERATOR;
