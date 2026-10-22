import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Column from '../layout/Column';
import Row from '../layout/Row';
import FontText from '../ui/text/FontText';
import { useGameOperatorUserId } from 'hooks/useGameOperatorUserId';
import { useNow } from 'hooks/useNow';
import { useSharedListValue } from 'hooks/useSharedListValue';
import { useSharedVariableValue } from 'hooks/useSharedVariableValue';
import { PlayerProfile, GameSchedule } from 'types/multiplayer';
import { UserTableItem } from 'types/playerTable';
import {
  formatInstantTimeLabel,
  getContextualDayRangeLabel,
  getCurrentPlayableDayIndex,
  getDayWakeUpInstant,
  getGameScopedKey,
  isHourGameSchedule,
  normalizeGameSchedule,
  parseStoredDayDates,
  resolveGameTimeZone,
  defaultGameSchedule,
  formatTimeLabel,
  formatContextualDateLabel,
  getGameDayTime24,
} from 'utils/multiplayer';
import { isInstantGameDay } from '../../utils/gameDayDuration';
import { getDateTokenDayValue, getZonedDayValue } from 'utils/timezone';
import { ChevronLeft, ChevronRight, Newspaper } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import LayoutStateAnimatedView, { fromRight } from '../ui/LayoutStateAnimatedView';
import NewspaperDayView from './NewspaperDayView';
import PlaceholderCard from '../ui/PlaceholderCard';
import PrintRule from '../ui/PrintRule';
import LoadingContainer from '../ui/loading/LoadingContainer';
import { useNewspaperDayOwner } from './useNewspaperDayOwner';
import LoadingText from '../ui/loading/LoadingText';
import { nowDate } from 'utils/simNow';

interface YourEyesOnlyPagePLAYERProps {
  gameId: string;
  currentEmail: string;
  matchingPlayer: UserTableItem;
  currentProfile: PlayerProfile;
}

const YourEyesOnlyPagePLAYER = ({
  gameId,
  currentEmail,
  matchingPlayer,
  currentProfile,
}: YourEyesOnlyPagePLAYERProps) => {
  const { operatorUserId } = useGameOperatorUserId(gameId);
  const operatorUserIds = operatorUserId ? [operatorUserId] : [];
  const { value: dayDateStrings } = useSharedListValue<string[]>({
    key: 'dayDatesArray',
    itemId: gameId,
    defaultValue: [],
    userIds: operatorUserIds,
  });
  const { value: numberOfRealDaysPerInGameDay } = useSharedListValue<number>({
    key: 'numberOfRealDaysPerInGameDay',
    itemId: gameId,
    defaultValue: 2,
    userIds: operatorUserIds,
  });
  const scheduleRecord = useSharedVariableValue<GameSchedule>({
    key: getGameScopedKey('gameSchedule', gameId),
    defaultValue: defaultGameSchedule,
    userIds: operatorUserIds,
  });
  const now = useNow(60000);

  const schedule = normalizeGameSchedule(scheduleRecord.value ?? defaultGameSchedule);
  const gameTimeZone = resolveGameTimeZone(schedule);
  const dayDates = useMemo(() => parseStoredDayDates(dayDateStrings), [dayDateStrings]);
  const currentDayIndex = useMemo(
    () => getCurrentPlayableDayIndex(dayDates, now, gameTimeZone),
    [dayDates, gameTimeZone, now]
  );
  const [selectedDayIndex, setSelectedDayIndex] = useState(() =>
    getCurrentPlayableDayIndex(parseStoredDayDates(dayDateStrings), nowDate(), gameTimeZone)
  );
  const selectedDayOwner = useNewspaperDayOwner({
    gameId,
    dayIndex: selectedDayIndex,
  });
  const [readyDayKey, setReadyDayKey] = useState<string | null>(null);
  const selectedDayKey = `${selectedDayIndex}:${selectedDayOwner.ownerUserId}`;
  const handleSelectedDayReady = useCallback(() => {
    setReadyDayKey(selectedDayKey);
  }, [selectedDayKey]);
  // Content is released if:
  // 1. It's a previous day (selectedDayIndex < currentDayIndex) - always released
  // 2. It's the current/future day - only blocked on the START DATE until wake-up time
  const selectedDayStartDate = dayDates[selectedDayIndex];
  const isPreviousDay = selectedDayIndex < currentDayIndex;
  const isStartOfSelectedDay = selectedDayStartDate
    ? getZonedDayValue(now.getTime(), gameTimeZone) === getDateTokenDayValue(selectedDayStartDate)
    : false;
  const isHourGame = isHourGameSchedule(schedule);
  const hasNewspaperReleased = useMemo(() => {
    if (isPreviousDay) return true; // Previous days are always released
    if (!selectedDayStartDate) return false;
    if (isInstantGameDay(selectedDayStartDate) || isHourGame) {
      return (
        now.getTime() >= getDayWakeUpInstant(selectedDayStartDate, schedule, gameTimeZone).getTime()
      );
    }
    // For current/future days, only apply wake-up time on the start date itself
    if (!isStartOfSelectedDay) return true; // Not the start date, so released
    // It's the start date - check if wake-up time has passed
    return (
      now.getTime() >= getDayWakeUpInstant(selectedDayStartDate, schedule, gameTimeZone).getTime()
    );
  }, [
    isPreviousDay,
    selectedDayStartDate,
    isStartOfSelectedDay,
    schedule,
    isHourGame,
    now,
    gameTimeZone,
  ]);
  const releaseTimeLabel =
    selectedDayStartDate && (isHourGame || isInstantGameDay(selectedDayStartDate))
      ? formatInstantTimeLabel(
          getDayWakeUpInstant(selectedDayStartDate, schedule, gameTimeZone),
          gameTimeZone
        )
      : selectedDayStartDate
        ? formatTimeLabel(getGameDayTime24(selectedDayStartDate, schedule.wakeUpTime, gameTimeZone))
        : '';
  const releaseDateLabel = useMemo(
    () =>
      selectedDayStartDate
        ? formatContextualDateLabel(selectedDayStartDate, undefined, now, 'lower', gameTimeZone)
        : '',
    [selectedDayStartDate, now, gameTimeZone]
  );
  const selectedDayRangeLabel = useMemo(
    () =>
      getContextualDayRangeLabel(
        dayDates,
        selectedDayIndex,
        numberOfRealDaysPerInGameDay,
        now,
        gameTimeZone
      ),
    [selectedDayIndex, dayDates, numberOfRealDaysPerInGameDay, now, gameTimeZone]
  );
  const previousDayLabel = useMemo(
    () =>
      selectedDayIndex > 0
        ? getContextualDayRangeLabel(
            dayDates,
            selectedDayIndex - 1,
            numberOfRealDaysPerInGameDay,
            now,
            gameTimeZone
          )
        : '',
    [dayDates, numberOfRealDaysPerInGameDay, selectedDayIndex, now, gameTimeZone]
  );
  const nextDayLabel = useMemo(
    () =>
      selectedDayIndex < currentDayIndex
        ? getContextualDayRangeLabel(
            dayDates,
            selectedDayIndex + 1,
            numberOfRealDaysPerInGameDay,
            now,
            gameTimeZone
          )
        : '',
    [currentDayIndex, dayDates, numberOfRealDaysPerInGameDay, selectedDayIndex, now, gameTimeZone]
  );
  const hasInitializedSelectedDayRef = useRef(false);

  useEffect(() => {
    if (!hasInitializedSelectedDayRef.current && dayDates.length > 0) {
      hasInitializedSelectedDayRef.current = true;
      setSelectedDayIndex(currentDayIndex);
      return;
    }

    setSelectedDayIndex((currentValue) => Math.min(currentValue, currentDayIndex));
  }, [currentDayIndex, dayDates.length]);

  return (
    <LoadingContainer
      dependencies={[scheduleRecord.record]}
      loadingText="Loading newspaper"
      className="min-h-190 flex-1 pb-8"
      keepMounted={false}>
      <Column className="flex-1 gap-7">
        <Column className="gap-4 py-2">
          <PrintRule />
          <Row className="items-start justify-between gap-4">
            <Pressable
              onPress={() => {
                if (selectedDayIndex > 0) {
                  setSelectedDayIndex(selectedDayIndex - 1);
                }
              }}
              disabled={selectedDayIndex <= 0}
              className={`w-20 items-center ${selectedDayIndex <= 0 ? 'opacity-30' : ''}`}>
              <ChevronLeft size={28} color="rgb(46, 41, 37)" />
              <FontText variant="subtext" className="text-center text-xs">
                {previousDayLabel || ' '}
              </FontText>
            </Pressable>

            <Column className="flex-1 items-center gap-1 pt-1">
              <FontText weight="medium" className="text-center">
                {selectedDayRangeLabel || 'Current game day'}
              </FontText>
              <FontText variant="subtext" className="text-center text-xs uppercase tracking-widest">
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
              className={`w-20 items-center ${selectedDayIndex >= currentDayIndex ? 'opacity-30' : ''}`}>
              <ChevronRight size={28} color="rgb(46, 41, 37)" />
              <FontText variant="subtext" className="text-center text-xs">
                {nextDayLabel || ' '}
              </FontText>
            </Pressable>
          </Row>
          <PrintRule flip />

          {/* <View className='py-4 rounded-2xl' style={[styles.animatedContentContainer, {
                        // @ts-ignore: web-only CSS
                        backgroundImage: "url('https://d9tic9wqq4.ufs.sh/f/e3bq9j1bOXyi6QFuqBSV3IcVxmF4QjUoPvCOdS2HLawpi0Ey')",
                        backgroundRepeat: 'repeat',
                        backgroundSize: `${TILE_SIZE}px ${TILE_SIZE}px`,
                    }]}> */}
          <View className="px-1">
            <LayoutStateAnimatedView.Container stateVar={String(selectedDayIndex)} highPerformance>
              <LayoutStateAnimatedView.OptionContainer
                page={selectedDayIndex}
                pushInAnimation={fromRight}>
                <LayoutStateAnimatedView.Option
                  stateValue={String(selectedDayIndex)}
                  isReady={
                    !selectedDayOwner.isLoading &&
                    (!hasNewspaperReleased || readyDayKey === selectedDayKey)
                  }>
                  {selectedDayOwner.isLoading ? (
                    <Column className="items-center justify-center py-24">
                      <LoadingText text="Loading newspaper" />
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
                      <Column className="items-center gap-3">
                        <Newspaper size={48} color="rgb(46, 41, 37)" />
                        <FontText weight="bold" className="text-center text-xl">
                          Not yet released
                        </FontText>
                        <FontText variant="subtext" className="text-center">
                          The newspaper will be available {releaseDateLabel || 'soon'} at{' '}
                          {releaseTimeLabel}.
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
