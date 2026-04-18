import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import FontText from '../text/FontText';
import { useUserListSet } from '../../../../hooks/useUserListSet';
import { useSharedListValue } from '../../../../hooks/useSharedListValue';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { getContextualDayRangeLabel, parseStoredDayDates } from '../../../../utils/multiplayer';

interface OperatorDayNavigationProps {
    gameId: string;
    ownerUserId?: string;
    selectedDayIndex?: number;
    onSelectedDayIndexChange?: (dayIndex: number) => void;
}

const OperatorDayNavigation = ({ gameId, ownerUserId, selectedDayIndex: controlledSelectedDayIndex, onSelectedDayIndexChange }: OperatorDayNavigationProps) => {
    
    const setSelectedDayIndex = useUserListSet<number>();
    const { value: selectedDayIndex } = useSharedListValue<number>({
        key: 'selectedDayIndex',
        itemId: gameId,
        defaultValue: 0,
        userIds: ownerUserId ? [ownerUserId] : undefined,
    });

    const { value: dayDateStrings } = useSharedListValue<string[]>({
        key: 'dayDatesArray',
        itemId: gameId,
        defaultValue: [],
        userIds: ownerUserId ? [ownerUserId] : undefined,
    });

    const { value: numberOfRealDaysPerInGameDay } = useSharedListValue<number>({
        key: 'numberOfRealDaysPerInGameDay',
        itemId: gameId,
        defaultValue: 2,
        userIds: ownerUserId ? [ownerUserId] : undefined,
    });

    const resolvedSelectedDayIndex = controlledSelectedDayIndex ?? selectedDayIndex;

    const dayDates = useMemo(() => parseStoredDayDates(dayDateStrings), [dayDateStrings]);
    const totalDays = dayDates.length;
    const selectedDayRangeLabel = useMemo(() => getContextualDayRangeLabel(dayDates, resolvedSelectedDayIndex, numberOfRealDaysPerInGameDay), [resolvedSelectedDayIndex, dayDates, numberOfRealDaysPerInGameDay]);
    const previousDayLabel = useMemo(() => resolvedSelectedDayIndex > 0 ? getContextualDayRangeLabel(dayDates, resolvedSelectedDayIndex - 1, numberOfRealDaysPerInGameDay) : '', [dayDates, numberOfRealDaysPerInGameDay, resolvedSelectedDayIndex]);
    const nextDayLabel = useMemo(() => resolvedSelectedDayIndex < totalDays - 1 ? getContextualDayRangeLabel(dayDates, resolvedSelectedDayIndex + 1, numberOfRealDaysPerInGameDay) : '', [resolvedSelectedDayIndex, totalDays, dayDates, numberOfRealDaysPerInGameDay]);
    const setResolvedSelectedDayIndex = (dayIndex: number) => {
        if (onSelectedDayIndexChange) {
            onSelectedDayIndexChange(dayIndex);
            return;
        }

        void setSelectedDayIndex({
            key: 'selectedDayIndex',
            itemId: gameId,
            value: dayIndex,
            privacy: 'PUBLIC',
        });
    };
    

    const handlePreviousDay = () => {
        if (resolvedSelectedDayIndex > 0) {
            setResolvedSelectedDayIndex(resolvedSelectedDayIndex - 1);
        }
    };

    const handleNextDay = () => {
        if (resolvedSelectedDayIndex < totalDays - 1) {
            setResolvedSelectedDayIndex(resolvedSelectedDayIndex + 1);
        }
    };

    return (
        <Column className='border-b border-border/15 pb-4'>
            <View>
                <Row className='items-start justify-between gap-4'>
                    <Pressable
                        onPress={handlePreviousDay}
                        disabled={resolvedSelectedDayIndex <= 0}
                        className={`w-20 items-center ${resolvedSelectedDayIndex <= 0 ? 'opacity-30' : ''}`}
                    >
                        <ChevronLeft size={28} color='rgb(46, 41, 37)' />
                        <FontText variant='subtext' className='text-center text-xs'>
                            {previousDayLabel || ' '}
                        </FontText>
                    </Pressable>

                    <Column className='flex-1 items-center pt-1' gap={1}>
                        <FontText weight='medium' className='text-center'>
                            {selectedDayRangeLabel || 'Select a day'}
                        </FontText>
                        <FontText variant='subtext' className='text-xs text-center'>
                            Day {resolvedSelectedDayIndex + 1}
                        </FontText>
                    </Column>

                    <Pressable
                        onPress={handleNextDay}
                        disabled={resolvedSelectedDayIndex >= totalDays - 1}
                        className={`w-20 items-center ${resolvedSelectedDayIndex >= totalDays - 1 ? 'opacity-30' : ''}`}
                    >
                        <ChevronRight size={28} color='rgb(46, 41, 37)' />
                        <FontText variant='subtext' className='text-center text-xs'>
                            {nextDayLabel || ' '}
                        </FontText>
                    </Pressable>
                </Row>
            </View>
        </Column>
    );
};

export default OperatorDayNavigation;
