import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Column from '../layout/Column';
import PoppinsText from '../ui/text/PoppinsText';
import NewspaperViewingView from './NewspaperViewingView';
import NewspaperViewingHeader from './NewspaperViewingHeader';
import PlayerDayNavigation from '../ui/daySelector/PlayerDayNavigation';
import { useUserList } from '../../../hooks/useUserList';
import { useUserVariableGet } from '../../../hooks/useUserVariableGet';
import { defaultGameSchedule, formatTimeLabel, getContextualDayRangeLabel, getCurrentPlayableDayIndex, getGameScopedKey, isDayContentReleased, normalizeGameSchedule, parseStoredDayDates } from '../../../utils/multiplayer';

interface ReadOnlyNewspaperPagePLAYERProps {
    gameId: string;
}

type AnimationDirection = 'left' | 'right';

const ReadOnlyNewspaperPagePLAYER = ({ gameId }: ReadOnlyNewspaperPagePLAYERProps) => {
    const { width } = useWindowDimensions();

    // Get day dates and schedule info
    const [dayDateStringsState] = useUserList<string[]>({
        key: 'dayDatesArray',
        itemId: gameId,
        privacy: "PUBLIC",
        defaultValue: [],
    });

    const [numberOfRealDaysState] = useUserList<number>({
        key: 'numberOfRealDaysPerInGameDay',
        itemId: gameId,
        privacy: "PUBLIC",
        defaultValue: 2,
    });

    const scheduleRecords = useUserVariableGet({
        key: getGameScopedKey('gameSchedule', gameId),
        returnTop: 1,
    });

    const dayDates = useMemo(() => parseStoredDayDates(dayDateStringsState.value), [dayDateStringsState.value]);
    const currentDayIndex = useMemo(() => getCurrentPlayableDayIndex(dayDates), [dayDates]);
    const [selectedDayIndex, setSelectedDayIndex] = useState(currentDayIndex);

    useEffect(() => {
        setSelectedDayIndex((currentValue) => Math.min(currentValue, currentDayIndex));
    }, [currentDayIndex]);

    // Create a unique key for the newspaper based on the day index (not date)
    const getNewspaperKey = (dayIndex: number) => {
        return `day-${dayIndex}`;
    };

    const currentDayKey = getNewspaperKey(selectedDayIndex);

    // Animation state
    const slideDistance = useMemo(() => Math.min(Math.max(width * 0.12, 24), 72), [width]);
    const transitionDuration = 240;
    const [leavingDayIndex, setLeavingDayIndex] = useState<number | null>(null);
    const previousDayIndexRef = useRef<number | null>(null);
    const leavingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hasInitializedSelectedDayRef = useRef(false);

    const enteringOpacity = useSharedValue(1);
    const enteringTranslateX = useSharedValue(0);
    const leavingOpacity = useSharedValue(1);
    const leavingTranslateX = useSharedValue(0);

    useEffect(() => {
        if (!hasInitializedSelectedDayRef.current && selectedDayIndex !== undefined) {
            hasInitializedSelectedDayRef.current = true;
            return;
        }
    }, [selectedDayIndex]);

    useEffect(() => {
        return () => {
            if (leavingTimeoutRef.current) {
                clearTimeout(leavingTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const previousDayIndex = previousDayIndexRef.current;

        if (previousDayIndex == null) {
            previousDayIndexRef.current = selectedDayIndex;
            enteringOpacity.value = 1;
            enteringTranslateX.value = 0;
            leavingOpacity.value = 0;
            leavingTranslateX.value = 0;
            return;
        }

        if (previousDayIndex === selectedDayIndex) {
            return;
        }

        if (leavingTimeoutRef.current) {
            clearTimeout(leavingTimeoutRef.current);
        }

        const direction: AnimationDirection = selectedDayIndex > previousDayIndex ? 'left' : 'right';
        const enteringStartX = direction === 'left' ? slideDistance : -slideDistance;
        const leavingEndX = direction === 'left' ? -slideDistance : slideDistance;

        setLeavingDayIndex(previousDayIndex);

        enteringOpacity.value = 0;
        enteringTranslateX.value = enteringStartX;
        leavingOpacity.value = 1;
        leavingTranslateX.value = 0;

        enteringOpacity.value = withTiming(1, { duration: transitionDuration });
        enteringTranslateX.value = withTiming(0, { duration: transitionDuration });
        leavingOpacity.value = withTiming(0, { duration: transitionDuration });
        leavingTranslateX.value = withTiming(leavingEndX, { duration: transitionDuration });

        leavingTimeoutRef.current = setTimeout(() => {
            setLeavingDayIndex(null);
        }, transitionDuration);

        previousDayIndexRef.current = selectedDayIndex;
    }, [enteringOpacity, enteringTranslateX, leavingOpacity, leavingTranslateX, selectedDayIndex, slideDistance]);

    const enteringStyle = useAnimatedStyle(() => {
        return {
            opacity: enteringOpacity.value,
            transform: [{ translateX: enteringTranslateX.value }],
        };
    });

    const leavingStyle = useAnimatedStyle(() => {
        return {
            opacity: leavingOpacity.value,
            transform: [{ translateX: leavingTranslateX.value }],
        };
    });

    // Content availability logic
    const schedule = normalizeGameSchedule(scheduleRecords?.[0]?.value ?? defaultGameSchedule);
    const selectedDayRangeLabel = getContextualDayRangeLabel(dayDates, selectedDayIndex, numberOfRealDaysState.value);
    const isLocked = dayDates[selectedDayIndex] ? !isDayContentReleased(dayDates, selectedDayIndex, schedule.wakeUpTime) : false;

    return (
        <Column gap={4}>
            {dayDates.length === 0 ? (
                <Column className='rounded-xl border border-subtle-border bg-white p-4'>
                    <PoppinsText varient='subtext'>The operator has not added any game days yet.</PoppinsText>
                </Column>
            ) : (
                <>
                    {/* Day Navigation Bar - Player view */}
                    <View className='mt-2 -mb-2 w-full'>
                        <PlayerDayNavigation 
                            gameId={gameId} 
                            selectedDayIndex={selectedDayIndex}
                            onSelectDay={setSelectedDayIndex}
                        />
                    </View>

                    {/* Header with BlurView */}
                    <View className='relative'>
                        {/* <BlurView
                            intensity={20}
                            tint='light'
                            className='absolute top-0 left-0 right-0 h-full'
                        /> */}
                        <View className='relative'>
                            <Column className='p-4'>
                                <PoppinsText weight='medium' className='text-center'>
                                    {selectedDayRangeLabel || `Day ${selectedDayIndex + 1}`}
                                </PoppinsText>
                            </Column>
                        </View>
                    </View>

                    {/* Content Area */}
                    <Column className='max-w-[950px] w-full'>
                        {isLocked ? (
                            <Column className='rounded-xl border border-subtle-border bg-white p-4'>
                                <PoppinsText weight='medium'>{selectedDayRangeLabel || 'This paper'} is not out yet.</PoppinsText>
                                <PoppinsText varient='subtext'>It releases at {formatTimeLabel(schedule.wakeUpTime)}.</PoppinsText>
                            </Column>
                        ) : (
                            <View style={styles.animatedContentContainer}>
                                {leavingDayIndex != null ? (
                                    <Animated.View
                                        key={`leaving-${leavingDayIndex}`}
                                        pointerEvents='none'
                                        style={[styles.animatedContentOverlay, leavingStyle]}
                                    >
                                        <Column gap={4}>
                                            <NewspaperViewingHeader />
                                            <NewspaperViewingView gameId={`${gameId}-${getNewspaperKey(leavingDayIndex)}`} />
                                        </Column>
                                    </Animated.View>
                                ) : null}

                                <Animated.View key={`selected-${selectedDayIndex}`} style={enteringStyle}>
                                    <Column gap={4}>
                                        <NewspaperViewingHeader />
                                        <NewspaperViewingView gameId={`${gameId}-${currentDayKey}`} />
                                    </Column>
                                </Animated.View>
                            </View>
                        )}
                    </Column>
                </>
            )}
        </Column>
    );
};

const styles = StyleSheet.create({
    animatedContentContainer: {
        overflow: 'hidden',
        position: 'relative',
    },
    animatedContentOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
});

export default ReadOnlyNewspaperPagePLAYER;