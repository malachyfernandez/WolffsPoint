import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import PoppinsText from '../text/PoppinsText';
import { useUserList } from 'hooks/useUserList';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { getContextualDayRangeLabel, parseStoredDayDates } from '../../../../utils/multiplayer';

interface OperatorDayNavigationProps {
    gameId: string;
}


const OperatorDayNavigation = ({ gameId }: OperatorDayNavigationProps) => {
    
    // Get the current day key from shared state
    const [selectedDayIndex, setSelectedDayIndex] = useUserList<number>({
        key: "selectedDayIndex",
        itemId: gameId,
        privacy: "PUBLIC",
        defaultValue: 0,
    });

    const [dayDateStrings] = useUserList<string[]>({
        key: "dayDatesArray",
        itemId: gameId,
        privacy: "PUBLIC",
        defaultValue: [],
    });

    const [numberOfRealDaysPerInGameDay] = useUserList<number>({
        key: "numberOfRealDaysPerInGameDay",
        itemId: gameId,
        privacy: "PUBLIC",
        defaultValue: 2,
    });

    const dayDates = useMemo(() => parseStoredDayDates(dayDateStrings.value), [dayDateStrings.value]);
    const totalDays = dayDates.length;
    const selectedDayRangeLabel = useMemo(() => getContextualDayRangeLabel(dayDates, selectedDayIndex.value, numberOfRealDaysPerInGameDay.value), [selectedDayIndex.value, dayDates, numberOfRealDaysPerInGameDay.value]);
    const previousDayLabel = useMemo(() => selectedDayIndex.value > 0 ? getContextualDayRangeLabel(dayDates, selectedDayIndex.value - 1, numberOfRealDaysPerInGameDay.value) : '', [dayDates, numberOfRealDaysPerInGameDay.value, selectedDayIndex.value]);
    const nextDayLabel = useMemo(() => selectedDayIndex.value < totalDays - 1 ? getContextualDayRangeLabel(dayDates, selectedDayIndex.value + 1, numberOfRealDaysPerInGameDay.value) : '', [selectedDayIndex.value, totalDays, dayDates, numberOfRealDaysPerInGameDay.value]);
    

    const handlePreviousDay = () => {
        if (selectedDayIndex.value > 0) {
            setSelectedDayIndex(selectedDayIndex.value - 1);
        }
    };

    const handleNextDay = () => {
        if (selectedDayIndex.value < totalDays - 1) {
            setSelectedDayIndex(selectedDayIndex.value + 1);
        }
    };

    return (
        <Column className='border-b border-border/15 pb-4'>
            <View>
                <Row className='items-start justify-between gap-4'>
                    <Pressable
                        onPress={handlePreviousDay}
                        disabled={selectedDayIndex.value <= 0}
                        className={`w-20 items-center ${selectedDayIndex.value <= 0 ? 'opacity-30' : ''}`}
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
                            Day {selectedDayIndex.value + 1}
                        </PoppinsText>
                    </Column>

                    <Pressable
                        onPress={handleNextDay}
                        disabled={selectedDayIndex.value >= totalDays - 1}
                        className={`w-20 items-center ${selectedDayIndex.value >= totalDays - 1 ? 'opacity-30' : ''}`}
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

export default OperatorDayNavigation;
