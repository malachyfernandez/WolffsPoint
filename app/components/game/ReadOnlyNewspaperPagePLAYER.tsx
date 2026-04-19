import React, { useEffect, useMemo, useRef, useState } from 'react';
import Column from '../layout/Column';
import Row from '../layout/Row';
import FontText from '../ui/text/FontText';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';
import { useSharedListValue } from '../../../hooks/useSharedListValue';
import { useUserVariableGet } from '../../../hooks/useUserVariableGet';
import { PlayerProfile, GameSchedule } from '../../../types/multiplayer';
import { RoleTableItem } from '../../../types/roleTable';
import { UserTableItem } from '../../../types/playerTable';
import { getContextualDayRangeLabel, getCurrentPlayableDayIndex, getGameScopedKey, normalizeGameSchedule, parseStoredDayDates, defaultGameSchedule, formatTimeLabel, formatContextualDateLabel, isDayReleasedAtTime } from '../../../utils/multiplayer';
import { ChevronLeft, ChevronRight, Newspaper } from 'lucide-react-native';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import YourEyesOnlyDayContentPLAYER from './YourEyesOnlyDayContentPLAYER';
import NewspaperDayView from './NewspaperDayView';
import PlaceholderCard from '../ui/PlaceholderCard';
import LoadingContainer from '../ui/loading/LoadingContainer';
import { useNewspaperDayOwner } from './useNewspaperDayOwner';

interface YourEyesOnlyPagePLAYERProps {
    gameId: string;
    currentEmail: string;
    matchingPlayer: UserTableItem;
    currentProfile: PlayerProfile;
}

type AnimationDirection = 'left' | 'right';

// Configurable tile size for the paper background texture (in pixels)
const TILE_SIZE = 600;

const YourEyesOnlyPagePLAYER = ({ gameId, currentEmail, matchingPlayer, currentProfile }: YourEyesOnlyPagePLAYERProps) => {
    const { value: dayDateStrings } = useSharedListValue<string[]>({ key: 'dayDatesArray', itemId: gameId, defaultValue: [] });
    const { value: numberOfRealDaysPerInGameDay } = useSharedListValue<number>({ key: 'numberOfRealDaysPerInGameDay', itemId: gameId, defaultValue: 2 });
    const roleTable = useSharedListValue<RoleTableItem[]>({ key: 'roleTable', itemId: gameId, defaultValue: [] });
    const scheduleRecords = useUserVariableGet({ key: getGameScopedKey('gameSchedule', gameId), returnTop: 1 });
    const [now, setNow] = useState(() => new Date());
    const { width } = useWindowDimensions();

    const dayDates = useMemo(() => parseStoredDayDates(dayDateStrings), [dayDateStrings]);
    const currentDayIndex = useMemo(() => getCurrentPlayableDayIndex(dayDates), [dayDates]);
    const [selectedDayIndex, setSelectedDayIndex] = useState(() => getCurrentPlayableDayIndex(parseStoredDayDates(dayDateStrings)));
    const [leavingDayIndex, setLeavingDayIndex] = useState<number | null>(null);
    const selectedDayOwner = useNewspaperDayOwner({
        gameId,
        dayIndex: selectedDayIndex,
    });
    const leavingDayOwner = useNewspaperDayOwner({
        gameId,
        dayIndex: leavingDayIndex ?? 0,
        disabled: leavingDayIndex === null,
    });
    const schedule = normalizeGameSchedule(scheduleRecords?.[0]?.value ?? defaultGameSchedule);
    // Content is released if:
    // 1. It's a previous day (selectedDayIndex < currentDayIndex) - always released
    // 2. It's the current/future day - only blocked on the START DATE until wake-up time
    const selectedDayStartDate = dayDates[selectedDayIndex];
    const isPreviousDay = selectedDayIndex < currentDayIndex;
    const isStartOfSelectedDay = selectedDayStartDate ? new Date(now).setHours(0,0,0,0) === new Date(selectedDayStartDate).setHours(0,0,0,0) : false;
    const hasNewspaperReleased = useMemo(() => {
        if (isPreviousDay) return true; // Previous days are always released
        if (!selectedDayStartDate) return false;
        // For current/future days, only apply wake-up time on the start date itself
        if (!isStartOfSelectedDay) return true; // Not the start date, so released
        // It's the start date - check if wake-up time has passed
        return isDayReleasedAtTime(selectedDayStartDate, schedule.wakeUpTime, now);
    }, [isPreviousDay, selectedDayStartDate, isStartOfSelectedDay, schedule.wakeUpTime, now]);
    const hasLeavingDayReleased = useMemo(() => {
        const leavingDayStartDateLocal = leavingDayIndex != null ? dayDates[leavingDayIndex] : null;
        if (leavingDayIndex == null || !leavingDayStartDateLocal) return true;
        const isLeavingDayPreviousLocal = leavingDayIndex < currentDayIndex;
        if (isLeavingDayPreviousLocal) return true; // Previous days are always released
        const isStartOfLeavingDayLocal = new Date(now).setHours(0,0,0,0) === new Date(leavingDayStartDateLocal).setHours(0,0,0,0);
        // For current/future days, only apply wake-up time on the start date itself
        if (!isStartOfLeavingDayLocal) return true; // Not the start date, so released
        // It's the start date - check if wake-up time has passed
        return isDayReleasedAtTime(leavingDayStartDateLocal, schedule.wakeUpTime, now);
    }, [leavingDayIndex, dayDates, currentDayIndex, schedule.wakeUpTime, now]);
    const releaseDateLabel = useMemo(() => selectedDayStartDate ? formatContextualDateLabel(selectedDayStartDate, undefined, now, 'lower') : '', [selectedDayStartDate, now]);
    const selectedDayRangeLabel = useMemo(() => getContextualDayRangeLabel(dayDates, selectedDayIndex, numberOfRealDaysPerInGameDay), [selectedDayIndex, dayDates, numberOfRealDaysPerInGameDay]);
    const previousDayLabel = useMemo(() => selectedDayIndex > 0 ? getContextualDayRangeLabel(dayDates, selectedDayIndex - 1, numberOfRealDaysPerInGameDay) : '', [dayDates, numberOfRealDaysPerInGameDay, selectedDayIndex]);
    const nextDayLabel = useMemo(() => selectedDayIndex < currentDayIndex ? getContextualDayRangeLabel(dayDates, selectedDayIndex + 1, numberOfRealDaysPerInGameDay) : '', [currentDayIndex, dayDates, numberOfRealDaysPerInGameDay, selectedDayIndex]);
    const roleData = roleTable.value.find((roleItem) => roleItem.role === matchingPlayer.role);
    const slideDistance = useMemo(() => Math.min(Math.max(width * 0.12, 24), 72), [width]);
    const transitionDuration = 240;
    const previousDayIndexRef = useRef<number | null>(null);
    const leavingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hasInitializedSelectedDayRef = useRef(false);

    const enteringOpacity = useSharedValue(1);
    const enteringTranslateX = useSharedValue(0);
    const leavingOpacity = useSharedValue(1);
    const leavingTranslateX = useSharedValue(0);

    useEffect(() => {
        if (!hasInitializedSelectedDayRef.current && dayDates.length > 0) {
            hasInitializedSelectedDayRef.current = true;
            setSelectedDayIndex(currentDayIndex);
            // Set previousDayIndexRef so animation effect doesn't trigger on initial load
            previousDayIndexRef.current = currentDayIndex;
            return;
        }

        setSelectedDayIndex((currentValue) => Math.min(currentValue, currentDayIndex));
    }, [currentDayIndex, dayDates.length]);

    useEffect(() => {
        const intervalId = setInterval(() => {
            setNow(new Date());
        }, 60000); // Update every minute

        return () => {
            if (leavingTimeoutRef.current) {
                clearTimeout(leavingTimeoutRef.current);
            }
            clearInterval(intervalId);
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

    const isOwnershipLoading = selectedDayOwner.isLoading || (leavingDayIndex !== null && leavingDayOwner.isLoading);

    return (
        <LoadingContainer
            dependencies={[scheduleRecords]}
            loadingText='Loading newspaper'
            className='flex-1 min-h-[760px] pb-8'
        >
            {isOwnershipLoading ? (
                <Column className='flex-1 items-center justify-center'>
                    <FontText variant='subtext'>Loading newspaper…</FontText>
                </Column>
            ) : (
                <Column className='flex-1' gap={7}>


                <Column className='border-y border-border/15 py-5' gap={5}>
                    <Row className='items-start justify-between gap-4'>
                        <Pressable
                            onPress={() => {
                                if (selectedDayIndex > 0) {
                                    setSelectedDayIndex(selectedDayIndex - 1);
                                }
                            }}
                            disabled={selectedDayIndex <= 0}
                            className={`w-20 items-center ${selectedDayIndex <= 0 ? 'opacity-30' : ''}`}
                        >
                            <ChevronLeft size={28} color='rgb(46, 41, 37)' />
                            <FontText variant='subtext' className='text-center text-xs'>
                                {previousDayLabel || ' '}
                            </FontText>
                        </Pressable>

                        <Column className='flex-1 items-center pt-1' gap={1}>
                            <FontText weight='medium' className='text-center'>
                                {selectedDayRangeLabel || 'Current game day'}
                            </FontText>
                            <FontText variant='subtext' className='text-xs text-center'>
                                Day {selectedDayIndex + 1}
                            </FontText>
                        </Column>

                        <Pressable
                            onPress={() => {
                                if (selectedDayIndex < currentDayIndex) {
                                    setSelectedDayIndex(selectedDayIndex + 1);
                                }
                            }}
                            disabled={selectedDayIndex >= currentDayIndex}
                            className={`w-20 items-center ${selectedDayIndex >= currentDayIndex ? 'opacity-30' : ''}`}
                        >
                            <ChevronRight size={28} color='rgb(46, 41, 37)' />
                            <FontText variant='subtext' className='text-center text-xs'>
                                {nextDayLabel || ' '}
                            </FontText>
                        </Pressable>
                    </Row>

                    <View className='py-4 rounded-2xl' style={[styles.animatedContentContainer, {
                        // @ts-ignore: web-only CSS
                        backgroundImage: "url('https://d9tic9wqq4.ufs.sh/f/e3bq9j1bOXyi6QFuqBSV3IcVxmF4QjUoPvCOdS2HLawpi0Ey')",
                        backgroundRepeat: 'repeat',
                        backgroundSize: `${TILE_SIZE}px ${TILE_SIZE}px`,
                    }]}>
                        {leavingDayIndex != null ? (
                            <Animated.View
                                key={`leaving-${leavingDayIndex}`}
                                pointerEvents='none'
                                style={[styles.animatedContentOverlay, leavingStyle]}
                            >
                                {hasLeavingDayReleased ? (
                                    <NewspaperDayView gameId={gameId} dayIndex={leavingDayIndex} ownerUserId={leavingDayOwner.ownerUserId} isLeaving />
                                ) : (
                                    <PlaceholderCard>
                                        <Column className='items-center' gap={3}>
                                            <Newspaper size={48} color='rgb(46, 41, 37)' />
                                            <FontText weight='bold' className='text-xl text-center'>
                                                Not yet released
                                            </FontText>
                                            <FontText variant='subtext' className='text-center'>
                                                The newspaper will be available at {formatTimeLabel(schedule.wakeUpTime)}.
                                            </FontText>
                                        </Column>
                                    </PlaceholderCard>
                                )}
                            </Animated.View>
                        ) : null}

                        <Animated.View key={`selected-${selectedDayIndex}`} style={enteringStyle}>
                            {hasNewspaperReleased ? (
                                <NewspaperDayView gameId={gameId} dayIndex={selectedDayIndex} ownerUserId={selectedDayOwner.ownerUserId} />
                            ) : (
                                <PlaceholderCard>
                                    <Column className='items-center' gap={3}>
                                        <Newspaper size={48} color='rgb(46, 41, 37)' />
                                        <FontText weight='bold' className='text-xl text-center'>
                                            Not yet released
                                        </FontText>
                                        <FontText variant='subtext' className='text-center'>
                                            The newspaper will be available {releaseDateLabel || 'soon'} at {formatTimeLabel(schedule.wakeUpTime)}.
                                        </FontText>
                                    </Column>
                                </PlaceholderCard>
                            )}
                        </Animated.View>
                    </View>
                </Column>
            </Column>
            )}
        </LoadingContainer>
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

export default YourEyesOnlyPagePLAYER;
