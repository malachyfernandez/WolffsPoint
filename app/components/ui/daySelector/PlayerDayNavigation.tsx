import React, { useMemo, useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import PoppinsText from '../text/PoppinsText';
import { useUserList } from 'hooks/useUserList';
import { useUserVariableGet } from 'hooks/useUserVariableGet';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { getContextualDayRangeLabel, parseStoredDayDates, getLatestReleasedDayIndex, getGameScopedKey, defaultGameSchedule, normalizeGameSchedule } from '../../../../utils/multiplayer';

interface PlayerDayNavigationProps {
    gameId: string;
    selectedDayIndex: number;
    onSelectDay: (index: number) => void;
}

const PlayerDayNavigation = ({ gameId, selectedDayIndex, onSelectDay }: PlayerDayNavigationProps) => {
    
    const [dayDateStringsState] = useUserList<string[]>({
        key: "dayDatesArray",
        itemId: gameId,
        privacy: "PUBLIC", 
        defaultValue: [],
    });

    const [numberOfRealDaysState] = useUserList<number>({
        key: "numberOfRealDaysPerInGameDay",
        itemId: gameId,
        privacy: "PUBLIC",
        defaultValue: 2,
    });

    const scheduleRecords = useUserVariableGet({
        key: getGameScopedKey('gameSchedule', gameId),
        returnTop: 1,
    });

    const dayDates = useMemo(() => parseStoredDayDates(dayDateStringsState.value), [dayDateStringsState.value]);
    const schedule = normalizeGameSchedule(scheduleRecords?.[0]?.value ?? defaultGameSchedule);
    const latestReleasedDayIndex = useMemo(() => getLatestReleasedDayIndex(dayDates, schedule.wakeUpTime), [dayDates, schedule.wakeUpTime]);
    
    const maxAvailableDay = latestReleasedDayIndex;
    const selectedDayRangeLabel = useMemo(() => getContextualDayRangeLabel(dayDates, selectedDayIndex, numberOfRealDaysState.value), [selectedDayIndex, dayDates, numberOfRealDaysState.value]);
    const previousDayLabel = useMemo(() => selectedDayIndex > 0 ? getContextualDayRangeLabel(dayDates, selectedDayIndex - 1, numberOfRealDaysState.value) : '', [dayDates, numberOfRealDaysState.value, selectedDayIndex]);
    const nextDayLabel = useMemo(() => selectedDayIndex < maxAvailableDay ? getContextualDayRangeLabel(dayDates, selectedDayIndex + 1, numberOfRealDaysState.value) : '', [selectedDayIndex, maxAvailableDay, dayDates, numberOfRealDaysState.value]);

    const handlePreviousDay = () => {
        if (selectedDayIndex > 0) {
            onSelectDay(selectedDayIndex - 1);
        }
    };

    const handleNextDay = () => {
        if (selectedDayIndex < maxAvailableDay) {
            onSelectDay(selectedDayIndex + 1);
        }
    };

    useEffect(() => {
        onSelectDay(Math.min(selectedDayIndex, maxAvailableDay));
    }, [maxAvailableDay]);

    return (
        <Column className='border-b border-border/15 pb-4'>
            <View>
                <Row className='items-start justify-between gap-4'>
                    <Pressable
                        onPress={handlePreviousDay}
                        disabled={selectedDayIndex <= 0}
                        className={`w-20 items-center ${selectedDayIndex <= 0 ? 'opacity-30' : ''}`}
                    >
                        <ChevronLeft size={28} color='rgb(46, 41, 37)' />
                        <PoppinsText varient='subtext' className='text-center text-xs'>
                            {previousDayLabel || ' '}
                        </PoppinsText>
                    </Pressable>

                    <Column className='flex-1 items-center pt-1' gap={1}>
                        <PoppinsText weight='medium' className='text-center'>
                            {selectedDayRangeLabel || 'Select a day'}
                        </PoppinsText>
                        <PoppinsText varient='subtext' className='text-xs text-center'>
                            Day {selectedDayIndex + 1}
                        </PoppinsText>
                    </Column>

                    <Pressable
                        onPress={handleNextDay}
                        disabled={selectedDayIndex >= maxAvailableDay}
                        className={`w-20 items-center ${selectedDayIndex >= maxAvailableDay ? 'opacity-30' : ''}`}
                    >
                        <ChevronRight size={28} color='rgb(46, 41, 37)' />
                        <PoppinsText varient='subtext' className='text-center text-xs'>
                            {nextDayLabel || ' '}
                        </PoppinsText>
                    </Pressable>
                </Row>
            </View>
        </Column>
    );
};

export default PlayerDayNavigation;
