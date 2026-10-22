import React, { useEffect, useMemo, useRef, useState } from 'react';
import Column from '../layout/Column';
import Row from '../layout/Row';
import FontText from '../ui/text/FontText';
import AppButton from '../ui/buttons/AppButton';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';
import { useGameOperatorUserId } from 'hooks/useGameOperatorUserId';
import { useNow } from 'hooks/useNow';
import PlaceholderCard from '../ui/PlaceholderCard';
import { useSharedListValue } from 'hooks/useSharedListValue';
import { useSharedVariableValue } from 'hooks/useSharedVariableValue';
import { useScriptFilesReader } from 'hooks/useScriptFiles';
import { PlayerProfile } from 'types/multiplayer';
import { RoleTableItem } from 'types/roleTable';
import { UserTableItem } from 'types/playerTable';
import {
  buildScheduledDateOnInstantDay,
  formatInstantTimeLabel,
  getContextualDayRangeLabel,
  getCurrentPlayableDayIndex,
  getDayDeadlineInstant,
  getDayEndDate,
  getDayReleaseDate,
  getDayWakeUpInstant,
  getGameDayTime24,
  getGameScopedKey,
  isDayDeadlineOpen,
  isHourGameSchedule,
  normalizeGameSchedule,
  parseStoredDayDates,
  resolveGameTimeZone,
  defaultGameSchedule,
  formatTimeLabel,
  formatContextualDateLabel,
} from 'utils/multiplayer';

import { getDateTokenDayValue, getZonedDayValue } from 'utils/timezone';
import { isInstantGameDay, isTimedGameDay } from '../../utils/gameDayDuration';
import { ChevronLeft, ChevronRight, Eye, Moon, Sun } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import LayoutStateAnimatedView, { fromRight } from '../ui/LayoutStateAnimatedView';
import YourEyesOnlyDayContentPLAYER from './YourEyesOnlyDayContentPLAYER';
import LoadingContainer from '../ui/loading/LoadingContainer';
import PrintRule from '../ui/PrintRule';
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
  const [hasConfirmedAlone, setHasConfirmedAlone] = useState(false);
  const overlayOpacity = useSharedValue(1);
  const overlayTranslateY = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(20);
  const { operatorUserId, isLoading: isOperatorLoading } = useGameOperatorUserId(gameId);
  const operatorUserIds = operatorUserId ? [operatorUserId] : undefined;
  const scriptFiles = useScriptFilesReader(gameId, operatorUserIds);
  const { value: dayDateStrings, record: dayDateStringsRecord } = useSharedListValue<string[]>({
    key: 'dayDatesArray',
    itemId: gameId,
    defaultValue: [],
    userIds: operatorUserIds,
  });
  const { value: numberOfRealDaysPerInGameDay, isLoading: isNumberOfRealDaysLoading } =
    useSharedListValue<number>({
      key: 'numberOfRealDaysPerInGameDay',
      itemId: gameId,
      defaultValue: 2,
      userIds: operatorUserIds,
    });
  const roleTable = useSharedListValue<RoleTableItem[]>({
    key: 'roleTable',
    itemId: gameId,
    defaultValue: [],
    userIds: operatorUserIds,
  });
  const scheduleRecord = useSharedVariableValue({
    key: getGameScopedKey('gameSchedule', gameId),
    defaultValue: defaultGameSchedule,
    userIds: operatorUserIds,
  });
  const now = useNow(1000);

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
  const isHourGame = isHourGameSchedule(schedule);
  const currentDayStartDate = dayDates[currentDayIndex];
  const deadlineDayIndex =
    currentDayIndex > 0 &&
    currentDayStartDate &&
    now.getTime() < getDayWakeUpInstant(currentDayStartDate, schedule, gameTimeZone).getTime()
      ? currentDayIndex - 1
      : currentDayIndex;
  const deadlineDayEndDate = getDayEndDate(
    dayDates,
    deadlineDayIndex,
    numberOfRealDaysPerInGameDay
  );
  const voteDeadline = getDayDeadlineInstant(deadlineDayEndDate, schedule, 'vote', gameTimeZone);
  const actionDeadline = getDayDeadlineInstant(
    deadlineDayEndDate,
    schedule,
    'action',
    gameTimeZone
  );
  const laterDeadline =
    voteDeadline.getTime() >= actionDeadline.getTime() ? voteDeadline : actionDeadline;
  const sameDayWakeUp = buildScheduledDateOnInstantDay(
    laterDeadline,
    schedule.wakeUpTime,
    gameTimeZone
  );
  const nextWakeUp = isHourGame
    ? (getDayReleaseDate(
        dayDates,
        deadlineDayIndex,
        schedule.wakeUpTime,
        gameTimeZone,
        schedule,
        numberOfRealDaysPerInGameDay
      ) ?? deadlineDayEndDate)
    : isTimedGameDay(deadlineDayEndDate)
      ? laterDeadline
      : sameDayWakeUp.getTime() > laterDeadline.getTime()
        ? sameDayWakeUp
        : buildScheduledDateOnInstantDay(laterDeadline, schedule.wakeUpTime, gameTimeZone, 1);
  const isVoteLocked =
    deadlineDayIndex < currentDayIndex ||
    !isDayDeadlineOpen(deadlineDayEndDate, schedule, 'vote', now, gameTimeZone);
  const isActionLocked =
    deadlineDayIndex < currentDayIndex ||
    !isDayDeadlineOpen(deadlineDayEndDate, schedule, 'action', now, gameTimeZone);
  const isSleepWindow =
    dayDates.length > 0 && isVoteLocked && isActionLocked && now.getTime() < nextWakeUp.getTime();
  const isPastMidnight =
    getZonedDayValue(now.getTime(), gameTimeZone) >
    getZonedDayValue(laterDeadline.getTime(), gameTimeZone);
  // Content is released if:
  // 1. It's a previous day (selectedDayIndex < currentDayIndex) - always released
  // 2. It's the current/future day - only blocked on the START DATE until wake-up time
  const selectedDayStartDate = dayDates[selectedDayIndex];
  const isPreviousDay = selectedDayIndex < currentDayIndex;
  const isStartOfSelectedDay = selectedDayStartDate
    ? getZonedDayValue(now.getTime(), gameTimeZone) === getDateTokenDayValue(selectedDayStartDate)
    : false;
  const hasWokenUp = useMemo(() => {
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
    <LoadingContainer
      dependencies={[
        dayDateStringsRecord,
        !isNumberOfRealDaysLoading,
        roleTable.record,
        scheduleRecord.record,
        !isOperatorLoading,
        !scriptFiles.isLoading,
      ]}
      loadingText="Loading..."
      className="min-h-190 flex-1">
      {isSleepWindow ? (
        <Column className="min-h-190 flex-1 items-center gap-7 pb-8 pt-10">
          <PlaceholderCard>
            <Column className="items-center gap-3">
              <Moon size={48} color="rgb(46, 41, 37)" />
              <FontText weight="bold" className="text-center text-xl">
                {isPastMidnight ? 'Go back to sleep, man.' : 'Go to sleep, man.'}
              </FontText>
              <FontText variant="subtext" className="text-center">
                Your vote and action are locked. Come back in the morning.
              </FontText>
            </Column>
          </PlaceholderCard>
        </Column>
      ) : (
        <Column className="min-h-190 flex-1 gap-7 pb-8">
          <Animated.View style={contentAnimatedStyle} className="gap-4">
            {roleData?.aboutRole?.trim().length ? (
              <MarkdownRenderer
                markdown={scriptFiles.resolve(roleData.aboutRole)}
                textAlign="center"
                viewHeightImages={30}
              />
            ) : (
              <Column className="items-center gap-4 py-6">
                <FontText variant="subtext">
                  The operator has not written this role&apos;s about section yet.
                </FontText>
              </Column>
            )}
          </Animated.View>

          <Animated.View style={contentAnimatedStyle} className="py-2">
            <Column className="gap-4">
              <PrintRule />
              <Row className="items-start justify-between gap-4">
                <Pressable
                  onPress={() => {
                    if (selectedDayIndex > 0) {
                      setSelectedDayIndex(selectedDayIndex - 1);
                    }
                  }}
                  disabled={selectedDayIndex <= 0 || !hasConfirmedAlone}
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
                  <FontText
                    variant="subtext"
                    className="text-center text-xs uppercase tracking-widest">
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
                  className={`w-20 items-center ${selectedDayIndex >= currentDayIndex ? 'opacity-30' : ''}`}>
                  <ChevronRight size={28} color="rgb(46, 41, 37)" />
                  <FontText variant="subtext" className="text-center text-xs">
                    {nextDayLabel || ' '}
                  </FontText>
                </Pressable>
              </Row>
              <PrintRule flip />

              <View>
                <LayoutStateAnimatedView.Container stateVar={String(selectedDayIndex)}>
                  <LayoutStateAnimatedView.OptionContainer
                    page={selectedDayIndex}
                    pushInAnimation={fromRight}>
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
                          <Column className="items-center gap-3">
                            <Sun size={48} color="rgb(46, 41, 37)" />
                            <FontText weight="bold" className="text-center text-xl">
                              Not yet released
                            </FontText>
                            <FontText variant="subtext" className="text-center">
                              Day content will be available {releaseDateLabel || 'soon'} at{' '}
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
          </Animated.View>

          {!hasConfirmedAlone && (
            <Animated.View
              style={[StyleSheet.absoluteFillObject, overlayAnimatedStyle]}
              pointerEvents="auto"
              className="z-50 items-center pt-10">
              <PlaceholderCard>
                <Column className="items-center gap-3">
                  <Eye size={48} color="rgb(46, 41, 37)" />
                  <FontText weight="bold" className="text-center text-xl">
                    Are you alone?
                  </FontText>
                  <FontText variant="subtext" className="text-center">
                    We don&apos;t want anyone peeking!
                  </FontText>
                </Column>
                <Row className="justify-center gap-4">
                  <AppButton variant="accent" className="w-44" onPress={handleConfirmAlone}>
                    <FontText weight="medium" color="white">
                      I am alone
                    </FontText>
                  </AppButton>
                </Row>
              </PlaceholderCard>
            </Animated.View>
          )}
        </Column>
      )}
    </LoadingContainer>
  );
};

export default YourEyesOnlyPagePLAYER;
