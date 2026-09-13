import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Column from '../layout/Column';
import Row from '../layout/Row';
import FontText from '../ui/text/FontText';
import { useGameOperatorUserId } from '../../../hooks/useGameOperatorUserId';
import { useSharedListValue } from '../../../hooks/useSharedListValue';
import { useSharedVariableValue } from '../../../hooks/useSharedVariableValue';
import { PlayerProfile, GameSchedule } from '../../../types/multiplayer';
import { UserTableItem } from '../../../types/playerTable';
import { getContextualDayRangeLabel, getCurrentPlayableDayIndex, getGameScopedKey, normalizeGameSchedule, parseStoredDayDates, defaultGameSchedule, formatTimeLabel, formatContextualDateLabel, isDayReleasedAtTime } from '../../../utils/multiplayer';
import { ChevronLeft, ChevronRight, Newspaper } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import LayoutStateAnimatedView, { fromRight } from '../ui/LayoutStateAnimatedView';
import NewspaperDayView from './NewspaperDayView';
import PlaceholderCard from '../ui/PlaceholderCard';
import LoadingContainer from '../ui/loading/LoadingContainer';
import { useNewspaperDayOwner } from './useNewspaperDayOwner';
import LoadingText from '../ui/loading/LoadingText';

interface YourEyesOnlyPagePLAYERProps {
    gameId: string;
    currentEmail: string;
    matchingPlayer: UserTableItem;
    currentProfile: PlayerProfile;
}

const YourEyesOnlyPagePLAYER = ({ gameId, currentEmail, matchingPlayer, currentProfile }: YourEyesOnlyPagePLAYERProps) => {
    const { operatorUserId } = useGameOperatorUserId(gameId);
    const operatorUserIds = operatorUserId ? [operatorUserId] : undefined;
    const { value: dayDateStrings } = useSharedListValue<string[]>({ key: 'dayDatesArray', itemId: gameId, defaultValue: [], userIds: operatorUserIds });
    const { value: numberOfRealDaysPerInGameDay } = useSharedListValue<number>({ key: 'numberOfRealDaysPerInGameDay', itemId: gameId, defaultValue: 2, userIds: operatorUserIds });
    const scheduleRecord = useSharedVariableValue<GameSchedule>({ key: getGameScopedKey('gameSchedule', gameId), defaultValue: defaultGameSchedule, userIds: operatorUserIds });
    const [now, setNow] = useState(() => new Date());

    const dayDates = useMemo(() => parseStoredDayDates(dayDateStrings), [dayDateStrings]);
    const currentDayIndex = useMemo(() => getCurrentPlayableDayIndex(dayDates), [dayDates]);
    const [selectedDayIndex, setSelectedDayIndex] = useState(() => getCurrentPlayableDayIndex(parseStoredDayDates(dayDateStrings)));
    const selectedDayOwner = useNewspaperDayOwner({
        gameId,
        dayIndex: selectedDayIndex,
    });
    const [readyDayKey, setReadyDayKey] = useState<string | null>(null);
    const selectedDayKey = `${selectedDayIndex}:${selectedDayOwner.ownerUserId}`;
    const handleSelectedDayReady = useCallback(() => {
        setReadyDayKey(selectedDayKey);
    }, [selectedDayKey]);
    const schedule = normalizeGameSchedule(scheduleRecord.value ?? defaultGameSchedule);
    // Content is released if:
    // 1. It's a previous day (selectedDayIndex < currentDayIndex) - always released
    // 2. It's the current/future day - only blocked on the START DATE until wake-up time
    const selectedDayStartDate = dayDates[selectedDayIndex];
    const isPreviousDay = selectedDayIndex < currentDayIndex;
    const isStartOfSelectedDay = selectedDayStartDate ? new Date(now).setHours(0, 0, 0, 0) === new Date(selectedDayStartDate).setHours(0, 0, 0, 0) : false;
    const hasNewspaperReleased = useMemo(() => {
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
        }, 60000); // Update every minute

        return () => {
            clearInterval(intervalId);
        };
    }, []);

    return (
        <LoadingContainer
            dependencies={[scheduleRecord.record]}
            loadingText='Loading newspaper'
            className='flex-1 min-h-190 pb-8'
        >
            <Column className='gap-7 flex-1'>


                    <Column className='gap-5 border-y border-border/15 py-5'>
                        <Row className='gap-4 items-start justify-between'>
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
                                disabled={selectedDayIndex >= currentDayIndex}
                                className={`w-20 items-center ${selectedDayIndex >= currentDayIndex ? 'opacity-30' : ''}`}
                            >
                                <ChevronRight size={28} color='rgb(46, 41, 37)' />
                                <FontText variant='subtext' className='text-center text-xs'>
                                    {nextDayLabel || ' '}
                                </FontText>
                            </Pressable>
                        </Row>

                        {/* <View className='py-4 rounded-2xl' style={[styles.animatedContentContainer, {
                        // @ts-ignore: web-only CSS
                        backgroundImage: "url('https://d9tic9wqq4.ufs.sh/f/e3bq9j1bOXyi6QFuqBSV3IcVxmF4QjUoPvCOdS2HLawpi0Ey')",
                        backgroundRepeat: 'repeat',
                        backgroundSize: `${TILE_SIZE}px ${TILE_SIZE}px`,
                    }]}> */}
                        <View className='px-1'>
                            <LayoutStateAnimatedView.Container stateVar={String(selectedDayIndex)} highPerformance>
                                <LayoutStateAnimatedView.OptionContainer page={selectedDayIndex} pushInAnimation={fromRight}>
                                    <LayoutStateAnimatedView.Option
                                        stateValue={String(selectedDayIndex)}
                                        isReady={!selectedDayOwner.isLoading && (!hasNewspaperReleased || readyDayKey === selectedDayKey)}
                                    >
                                        {selectedDayOwner.isLoading ? (
                                            <Column className='min-h-190 items-center justify-center'>
                                                <LoadingText text='Loading newspaper' />
                                            </Column>
                                        ) : hasNewspaperReleased ? (
                                            <NewspaperDayView
                                                gameId={gameId}
                                                dayIndex={selectedDayIndex}
                                                ownerUserId={selectedDayOwner.ownerUserId}
                                                onReady={handleSelectedDayReady}
                                            />
                                        ) : (
                                            <PlaceholderCard>
                                                <Column className='gap-3 items-center'>
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
                                    </LayoutStateAnimatedView.Option>
                                </LayoutStateAnimatedView.OptionContainer>
                            </LayoutStateAnimatedView.Container>
                        </View>
                    </Column>
            </Column>
        </LoadingContainer>
    );
};

export default YourEyesOnlyPagePLAYER;
