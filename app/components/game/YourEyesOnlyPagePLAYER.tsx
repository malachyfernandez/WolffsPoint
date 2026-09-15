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
import { addDays, buildScheduledDate, getContextualDayRangeLabel, getCurrentPlayableDayIndex, getDayEndDate, getGameScopedKey, isNightWindowOpen, normalizeGameSchedule, parseStoredDayDates, defaultGameSchedule, formatTimeLabel, formatContextualDateLabel, isDayReleasedAtTime } from '../../../utils/multiplayer';
import { ChevronLeft, ChevronRight, Eye, Moon, Sun } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import LayoutStateAnimatedView, { fromRight } from '../ui/LayoutStateAnimatedView';
import YourEyesOnlyDayContentPLAYER from './YourEyesOnlyDayContentPLAYER';

interface YourEyesOnlyPagePLAYERProps {
    gameId: string;
    currentEmail: string;
    matchingPlayer: UserTableItem;
    currentProfile: PlayerProfile;
}

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

    const dayDates = useMemo(() => parseStoredDayDates(dayDateStrings), [dayDateStrings]);
    const currentDayIndex = useMemo(() => getCurrentPlayableDayIndex(dayDates), [dayDates]);
    const [selectedDayIndex, setSelectedDayIndex] = useState(() => getCurrentPlayableDayIndex(parseStoredDayDates(dayDateStrings)));
    const schedule = normalizeGameSchedule(scheduleRecord.value ?? defaultGameSchedule);
    const currentDayStartDate = dayDates[currentDayIndex];
    const deadlineDayIndex = currentDayIndex > 0 && currentDayStartDate && !isDayReleasedAtTime(currentDayStartDate, schedule.wakeUpTime, now)
        ? currentDayIndex - 1
        : currentDayIndex;
    const deadlineDayEndDate = getDayEndDate(dayDates, deadlineDayIndex, numberOfRealDaysPerInGameDay);
    const voteDeadlineBaseDate = new Date(deadlineDayEndDate.getTime() - (schedule.voteDayOffset ?? 0) * 24 * 60 * 60 * 1000);
    const actionDeadlineBaseDate = new Date(deadlineDayEndDate.getTime() - (schedule.actionDayOffset ?? 0) * 24 * 60 * 60 * 1000);
    const voteDeadlineTime = schedule.voteDeadlineTime ?? defaultGameSchedule.voteDeadlineTime ?? '22:00';
    const actionDeadlineTime = schedule.actionDeadlineTime ?? defaultGameSchedule.actionDeadlineTime ?? '22:00';
    const voteDeadline = buildScheduledDate(voteDeadlineBaseDate, voteDeadlineTime);
    const actionDeadline = buildScheduledDate(actionDeadlineBaseDate, actionDeadlineTime);
    const laterDeadline = voteDeadline.getTime() >= actionDeadline.getTime() ? voteDeadline : actionDeadline;
    const sameDayWakeUp = buildScheduledDate(laterDeadline, schedule.wakeUpTime);
    const nextWakeUp = sameDayWakeUp.getTime() > laterDeadline.getTime()
        ? sameDayWakeUp
        : buildScheduledDate(addDays(laterDeadline, 1), schedule.wakeUpTime);
    const isVoteLocked = deadlineDayIndex < currentDayIndex || !isNightWindowOpen(voteDeadlineBaseDate, voteDeadlineTime, now);
    const isActionLocked = deadlineDayIndex < currentDayIndex || !isNightWindowOpen(actionDeadlineBaseDate, actionDeadlineTime, now);
    const isSleepWindow = dayDates.length > 0 && isVoteLocked && isActionLocked && now.getTime() < nextWakeUp.getTime();
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
    const hasInitializedSelectedDayRef = useRef(false);

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
        }, 1000); // Update every second

        return () => {
            clearInterval(intervalId);
        };
    }, []);

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

    if (isSleepWindow) {
        return (
            <Column className='gap-7 flex-1 min-h-190 pb-8 items-center justify-center'>
                <PlaceholderCard>
                    <Column className='gap-3 items-center'>
                        <Moon size={48} color='rgb(46, 41, 37)' />
                        <FontText weight='bold' className='text-xl text-center'>
                            Go to sleep, man.
                        </FontText>
                        <FontText variant='subtext' className='text-center'>
                            Your vote and action are locked. Come back in the morning.
                        </FontText>
                    </Column>
                </PlaceholderCard>
            </Column>
        );
    }

    return (
        <Column className='gap-7 flex-1 min-h-190 pb-8'>
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

                    <View>
                        <LayoutStateAnimatedView.Container stateVar={String(selectedDayIndex)}>
                            <LayoutStateAnimatedView.OptionContainer page={selectedDayIndex} pushInAnimation={fromRight}>
                                <LayoutStateAnimatedView.Option stateValue={String(selectedDayIndex)}>
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
                                </LayoutStateAnimatedView.Option>
                            </LayoutStateAnimatedView.OptionContainer>
                        </LayoutStateAnimatedView.Container>
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
                                We don&apos;t want anyone peeking!
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

export default YourEyesOnlyPagePLAYER;
