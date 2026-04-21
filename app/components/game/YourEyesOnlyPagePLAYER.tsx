import React, { useEffect, useMemo, useRef, useState } from 'react';
import Column from '../layout/Column';
import Row from '../layout/Row';
import FontText from '../ui/text/FontText';
import AppButton from '../ui/buttons/AppButton';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';
import { useGameOperatorUserId } from '../../../hooks/useGameOperatorUserId';
import PlaceholderCard from '../ui/PlaceholderCard';
import { useSharedListValue } from '../../../hooks/useSharedListValue';
import { useSharedVariableValue } from '../../../hooks/useSharedVariableValue';
import { PlayerProfile } from '../../../types/multiplayer';
import { RoleTableItem } from '../../../types/roleTable';
import { UserTableItem } from '../../../types/playerTable';
import { getContextualDayRangeLabel, getCurrentPlayableDayIndex, getGameScopedKey, normalizeGameSchedule, parseStoredDayDates, defaultGameSchedule, formatTimeLabel, formatContextualDateLabel, isDayReleasedAtTime } from '../../../utils/multiplayer';
import { ChevronLeft, ChevronRight, Eye, Sun } from 'lucide-react-native';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import YourEyesOnlyDayContentPLAYER from './YourEyesOnlyDayContentPLAYER';

interface YourEyesOnlyPagePLAYERProps {
    gameId: string;
    currentEmail: string;
    matchingPlayer: UserTableItem;
    currentProfile: PlayerProfile;
}

type AnimationDirection = 'left' | 'right';

const YourEyesOnlyPagePLAYER = ({ gameId, currentEmail, matchingPlayer, currentProfile }: YourEyesOnlyPagePLAYERProps) => {
    const [hasConfirmedAlone, setHasConfirmedAlone] = useState(false);
    const overlayOpacity = useSharedValue(1);
    const overlayTranslateY = useSharedValue(0);
    const contentOpacity = useSharedValue(0);
    const contentTranslateY = useSharedValue(20);
    const { operatorUserId } = useGameOperatorUserId(gameId);
    const operatorUserIds = operatorUserId ? [operatorUserId] : undefined;
    const { value: dayDateStrings } = useSharedListValue<string[]>({ key: 'dayDatesArray', itemId: gameId, defaultValue: [], userIds: operatorUserIds });
    const { value: numberOfRealDaysPerInGameDay } = useSharedListValue<number>({ key: 'numberOfRealDaysPerInGameDay', itemId: gameId, defaultValue: 2, userIds: operatorUserIds });
    const roleTable = useSharedListValue<RoleTableItem[]>({ key: 'roleTable', itemId: gameId, defaultValue: [], userIds: operatorUserIds });
    const scheduleRecord = useSharedVariableValue({ key: getGameScopedKey('gameSchedule', gameId), defaultValue: defaultGameSchedule, userIds: operatorUserIds });
    const [now, setNow] = useState(() => new Date());
    const { width } = useWindowDimensions();

    const dayDates = useMemo(() => parseStoredDayDates(dayDateStrings), [dayDateStrings]);
    const currentDayIndex = useMemo(() => getCurrentPlayableDayIndex(dayDates), [dayDates]);
    const [selectedDayIndex, setSelectedDayIndex] = useState(() => getCurrentPlayableDayIndex(parseStoredDayDates(dayDateStrings)));
    const schedule = normalizeGameSchedule(scheduleRecord.value ?? defaultGameSchedule);
    // Content is released if:
    // 1. It's a previous day (selectedDayIndex < currentDayIndex) - always released
    // 2. It's the current/future day - only blocked on the START DATE until wake-up time
    const selectedDayStartDate = dayDates[selectedDayIndex];
    const isPreviousDay = selectedDayIndex < currentDayIndex;
    const isStartOfSelectedDay = selectedDayStartDate ? new Date(now).setHours(0,0,0,0) === new Date(selectedDayStartDate).setHours(0,0,0,0) : false;
    const hasWokenUp = useMemo(() => {
        if (isPreviousDay) return true; // Previous days are always released
        if (!selectedDayStartDate) return false;
        // For current/future days, only apply wake-up time on the start date itself
        if (!isStartOfSelectedDay) return true; // Not the start date, so released
        // It's the start date - check if wake-up time has passed
        return isDayReleasedAtTime(selectedDayStartDate, schedule.wakeUpTime, now);
    }, [isPreviousDay, selectedDayStartDate, isStartOfSelectedDay, schedule.wakeUpTime, now]);
    const releaseDateLabel = useMemo(() => selectedDayStartDate ? formatContextualDateLabel(selectedDayStartDate, undefined, now, 'lower') : '', [selectedDayStartDate, now]);
    const selectedDayRangeLabel = useMemo(() => getContextualDayRangeLabel(dayDates, selectedDayIndex, numberOfRealDaysPerInGameDay), [selectedDayIndex, dayDates, numberOfRealDaysPerInGameDay]);
    const previousDayLabel = useMemo(() => selectedDayIndex > 0 ? getContextualDayRangeLabel(dayDates, selectedDayIndex - 1, numberOfRealDaysPerInGameDay) : '', [dayDates, numberOfRealDaysPerInGameDay, selectedDayIndex]);
    const nextDayLabel = useMemo(() => selectedDayIndex < currentDayIndex ? getContextualDayRangeLabel(dayDates, selectedDayIndex + 1, numberOfRealDaysPerInGameDay) : '', [currentDayIndex, dayDates, numberOfRealDaysPerInGameDay, selectedDayIndex]);
    const roleData = roleTable.value.find((roleItem) => roleItem.role === matchingPlayer.role);
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
        if (!hasInitializedSelectedDayRef.current && dayDates.length > 0) {
            hasInitializedSelectedDayRef.current = true;
            setSelectedDayIndex(currentDayIndex);
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

    const overlayAnimatedStyle = useAnimatedStyle(() => ({
        opacity: overlayOpacity.value,
        transform: [{ translateY: overlayTranslateY.value }],
    }));

    const contentAnimatedStyle = useAnimatedStyle(() => ({
        opacity: contentOpacity.value,
        transform: [{ translateY: contentTranslateY.value }],
    }));

    const handleConfirmAlone = () => {
        // Animate overlay up and out
        overlayOpacity.value = withTiming(0, { duration: 300 });
        overlayTranslateY.value = withTiming(-30, { duration: 300 });
        // Animate content in from below
        contentOpacity.value = withTiming(1, { duration: 300 });
        contentTranslateY.value = withTiming(0, { duration: 300 });
        setHasConfirmedAlone(true);
    };

    return (
        <Column className='gap-7 flex-1 min-h-[760px] pb-8'>
            <Animated.View style={contentAnimatedStyle} className='gap-4'>
                {roleData?.aboutRole?.trim().length ? (
                    <MarkdownRenderer
                        markdown={roleData.aboutRole}
                        textAlign='center'
                        viewHeightImages={30}
                    />
                ) : (
                    <Column className='gap-4 items-center py-6'>
                        <FontText variant='subtext'>The operator has not written this role&apos;s about section yet.</FontText>
                    </Column>
                )}
            </Animated.View>

            <Animated.View style={contentAnimatedStyle} className='border-y border-border/15 py-5'>
                <Column className='gap-5'>
                    <Row className='gap-4 items-start justify-between'>
                        <Pressable
                            onPress={() => {
                                if (selectedDayIndex > 0) {
                                    setSelectedDayIndex(selectedDayIndex - 1);
                                }
                            }}
                            disabled={selectedDayIndex <= 0 || !hasConfirmedAlone}
                            className={`w-20 items-center ${selectedDayIndex <= 0 ? 'opacity-30' : ''}`}
                        >
                            <ChevronLeft size={28} color='rgb(46, 41, 37)' />
                            <FontText variant='subtext' className='text-center text-xs'>
                                {previousDayLabel || ' '}
                            </FontText>
                        </Pressable>

                        <Column className='gap-1 flex-1 items-center pt-1'>
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
                            disabled={selectedDayIndex >= currentDayIndex || !hasConfirmedAlone}
                            className={`w-20 items-center ${selectedDayIndex >= currentDayIndex ? 'opacity-30' : ''}`}
                        >
                            <ChevronRight size={28} color='rgb(46, 41, 37)' />
                            <FontText variant='subtext' className='text-center text-xs'>
                                {nextDayLabel || ' '}
                            </FontText>
                        </Pressable>
                    </Row>

                    <View style={styles.animatedContentContainer}>
                        {leavingDayIndex != null ? (
                            <Animated.View
                                key={`leaving-${leavingDayIndex}`}
                                pointerEvents='none'
                                style={[styles.animatedContentOverlay, leavingStyle]}
                            >
                                <YourEyesOnlyDayContentPLAYER
                                    gameId={gameId}
                                    currentEmail={currentEmail}
                                    currentUserId={currentProfile.userId}
                                    dayIndex={leavingDayIndex}
                                />
                            </Animated.View>
                        ) : null}

                        <Animated.View key={`selected-${selectedDayIndex}`} style={enteringStyle}>
                            {hasWokenUp ? (
                                <YourEyesOnlyDayContentPLAYER
                                    gameId={gameId}
                                    currentEmail={currentEmail}
                                    currentUserId={currentProfile.userId}
                                    dayIndex={selectedDayIndex}
                                />
                            ) : (
                                <PlaceholderCard>
                                    <Column className='gap-3 items-center'>
                                        <Sun size={48} color='rgb(46, 41, 37)' />
                                        <FontText weight='bold' className='text-xl text-center'>
                                            Not yet released
                                        </FontText>
                                        <FontText variant='subtext' className='text-center'>
                                            Day content will be available {releaseDateLabel || 'soon'} at {formatTimeLabel(schedule.wakeUpTime)}.
                                        </FontText>
                                    </Column>
                                </PlaceholderCard>
                            )}
                        </Animated.View>
                    </View>
                </Column>
            </Animated.View>

            {!hasConfirmedAlone && (
                <Animated.View
                    style={[StyleSheet.absoluteFillObject, overlayAnimatedStyle]}
                    className='z-50 items-center pt-10'
                    pointerEvents={overlayOpacity.value < 0.5 ? 'none' : 'auto'}
                >
                    <PlaceholderCard>
                        <Column className='gap-3 items-center'>
                            <Eye size={48} color='rgb(46, 41, 37)' />
                            <FontText weight='bold' className='text-xl text-center'>
                                Are you alone?
                            </FontText>
                            <FontText variant='subtext' className='text-center'>
                                We don&apos;t want anyone peaking!
                            </FontText>
                        </Column>
                        <Row className='gap-4 justify-center'>
                            <AppButton variant='accent' className='w-44' onPress={handleConfirmAlone}>
                                <FontText weight='medium' color='white'>I am alone</FontText>
                            </AppButton>
                        </Row>
                    </PlaceholderCard>
                </Animated.View>
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

export default YourEyesOnlyPagePLAYER;
