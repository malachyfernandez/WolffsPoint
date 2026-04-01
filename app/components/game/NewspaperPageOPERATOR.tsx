import React, { useState } from 'react';
import { View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Tabs } from 'heroui-native';
import Column from '../layout/Column';
import PoppinsText from '../ui/text/PoppinsText';
import NewspaperWritingView from './NewspaperWritingView';
import NewspaperViewingView from './NewspaperViewingView';
import NewspaperViewingHeader from './NewspaperViewingHeader';
import { useUserList } from 'hooks/useUserList';
import { useUserVariable } from 'hooks/useUserVariable';
import ComprehensiveDaySelector from '../ui/daySelector/ComprehensiveDaySelector';
import PoppinsTextInput from '../ui/forms/PoppinsTextInput';
import { defaultGameSchedule, getGameScopedKey } from '../../../utils/multiplayer';
import { GameSchedule } from '../../../types/multiplayer';

interface NewspaperPageOPERATORProps {
    currentUserId: string;
    gameId: string;
}

const NewspaperPageOPERATOR = ({ gameId }: NewspaperPageOPERATORProps) => {
    const [activeTab, setActiveTab] = useState('writing');
    const [gameSchedule, setGameSchedule] = useUserVariable<GameSchedule>({
        key: getGameScopedKey('gameSchedule', gameId),
        defaultValue: defaultGameSchedule,
        privacy: 'PUBLIC',
    });

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

    // Create a unique key for the newspaper based on the day index (not date)
    const getNewspaperKey = (dayIndex: number) => {
        return `day-${dayIndex}`;
    };

    const currentDayKey = getNewspaperKey(selectedDayIndex.value);

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
            <Column className='max-w-[950px] w-full'>
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

                <Column className='mt-6 rounded-xl border border-subtle-border bg-white p-4' gap={2}>
                    <PoppinsText weight='medium'>Newspaper release time</PoppinsText>
                    <PoppinsText varient='subtext'>Players can read the current day once this time is reached.</PoppinsText>
                    <PoppinsTextInput
                        className='w-40 border border-subtle-border p-3'
                        value={gameSchedule.value.newspaperReleaseTime}
                        onChangeText={(value) => setGameSchedule({
                            ...gameSchedule.value,
                            newspaperReleaseTime: value,
                        })}
                        placeholder='08:00'
                    />
                </Column>
            </Column>
        </Column>
    );
};

export default NewspaperPageOPERATOR;
