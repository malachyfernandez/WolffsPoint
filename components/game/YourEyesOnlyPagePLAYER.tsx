import React, { useEffect, useMemo, useRef, useState } from 'react';
import Column from '../layout/Column';
import Row from '../layout/Row';
import FontText from '../ui/text/FontText';
import AppButton from '../ui/buttons/AppButton';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';
import { useGameOperatorUserId } from 'hooks/useGameOperatorUserId';
import PlaceholderCard from '../ui/PlaceholderCard';
import { useSharedListValue } from 'hooks/useSharedListValue';
import { useSharedVariableValue } from 'hooks/useSharedVariableValue';
import { useValue } from 'hooks/useData';
import { useToast } from 'contexts/ToastContext';
import { PlayerProfile } from 'types/multiplayer';
import { RoleTableItem } from 'types/roleTable';
import { UserTableItem } from 'types/playerTable';
import {
  addDays,
  buildScheduledDate,
  getContextualDayRangeLabel,
  getCurrentPlayableDayIndex,
  getDayEndDate,
  getGameScopedKey,
  isNightWindowOpen,
  normalizeGameSchedule,
  parseStoredDayDates,
  defaultGameSchedule,
  formatTimeLabel,
  formatContextualDateLabel,
  isDayReleasedAtTime,
} from 'utils/multiplayer';
import { ChevronLeft, ChevronRight, Eye, Moon, Sun } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import LayoutStateAnimatedView, { fromRight } from '../ui/LayoutStateAnimatedView';
import YourEyesOnlyDayContentPLAYER from './YourEyesOnlyDayContentPLAYER';
import LoadingContainer from '../ui/loading/LoadingContainer';

// TODO: temporarily disabled — the sleep screen pops up early for some players.
// Flip back to true to re-enable.
const SHOW_SLEEP_SCREEN = false;

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
  const [now, setNow] = useState(() => new Date());

  const dayDates = useMemo(() => parseStoredDayDates(dayDateStrings), [dayDateStrings]);
  const currentDayIndex = useMemo(() => getCurrentPlayableDayIndex(dayDates), [dayDates]);
  const [selectedDayIndex, setSelectedDayIndex] = useState(() =>
    getCurrentPlayableDayIndex(parseStoredDayDates(dayDateStrings))
  );
  const schedule = normalizeGameSchedule(scheduleRecord.value ?? defaultGameSchedule);
  const currentDayStartDate = dayDates[currentDayIndex];
  const deadlineDayIndex =
    currentDayIndex > 0 &&
    currentDayStartDate &&
    !isDayReleasedAtTime(currentDayStartDate, schedule.wakeUpTime, now)
      ? currentDayIndex - 1
      : currentDayIndex;
  const deadlineDayEndDate = getDayEndDate(
    dayDates,
    deadlineDayIndex,
    numberOfRealDaysPerInGameDay
  );
  const voteDeadlineBaseDate = new Date(
    deadlineDayEndDate.getTime() - (schedule.voteDayOffset ?? 0) * 24 * 60 * 60 * 1000
  );
  const actionDeadlineBaseDate = new Date(
    deadlineDayEndDate.getTime() - (schedule.actionDayOffset ?? 0) * 24 * 60 * 60 * 1000
  );
  const voteDeadlineTime =
    schedule.voteDeadlineTime ?? defaultGameSchedule.voteDeadlineTime ?? '22:00';
  const actionDeadlineTime =
    schedule.actionDeadlineTime ?? defaultGameSchedule.actionDeadlineTime ?? '22:00';
  const voteDeadline = buildScheduledDate(voteDeadlineBaseDate, voteDeadlineTime);
  const actionDeadline = buildScheduledDate(actionDeadlineBaseDate, actionDeadlineTime);
  const laterDeadline =
    voteDeadline.getTime() >= actionDeadline.getTime() ? voteDeadline : actionDeadline;
  const sameDayWakeUp = buildScheduledDate(laterDeadline, schedule.wakeUpTime);
  const nextWakeUp =
    sameDayWakeUp.getTime() > laterDeadline.getTime()
      ? sameDayWakeUp
      : buildScheduledDate(addDays(laterDeadline, 1), schedule.wakeUpTime);
  const isVoteLocked =
    deadlineDayIndex < currentDayIndex ||
    !isNightWindowOpen(voteDeadlineBaseDate, voteDeadlineTime, now);
  const isActionLocked =
    deadlineDayIndex < currentDayIndex ||
    !isNightWindowOpen(actionDeadlineBaseDate, actionDeadlineTime, now);
  const isSleepWindow =
    dayDates.length > 0 && isVoteLocked && isActionLocked && now.getTime() < nextWakeUp.getTime();
  const isPastMidnight =
    new Date(now).setHours(0, 0, 0, 0) > new Date(laterDeadline).setHours(0, 0, 0, 0);
  // Content is released if:
  // 1. It's a previous day (selectedDayIndex < currentDayIndex) - always released
  // 2. It's the current/future day - only blocked on the START DATE until wake-up time
  const selectedDayStartDate = dayDates[selectedDayIndex];
  const isPreviousDay = selectedDayIndex < currentDayIndex;
  const isStartOfSelectedDay = selectedDayStartDate
    ? new Date(now).setHours(0, 0, 0, 0) === new Date(selectedDayStartDate).setHours(0, 0, 0, 0)
    : false;
  const hasWokenUp = useMemo(() => {
    if (isPreviousDay) return true; // Previous days are always released
    if (!selectedDayStartDate) return false;
    // For current/future days, only apply wake-up time on the start date itself
    if (!isStartOfSelectedDay) return true; // Not the start date, so released
    // It's the start date - check if wake-up time has passed
    return isDayReleasedAtTime(selectedDayStartDate, schedule.wakeUpTime, now);
  }, [isPreviousDay, selectedDayStartDate, isStartOfSelectedDay, schedule.wakeUpTime, now]);
  const releaseDateLabel = useMemo(
    () =>
      selectedDayStartDate
        ? formatContextualDateLabel(selectedDayStartDate, undefined, now, 'lower')
        : '',
    [selectedDayStartDate, now]
  );
  const selectedDayRangeLabel = useMemo(
    () => getContextualDayRangeLabel(dayDates, selectedDayIndex, numberOfRealDaysPerInGameDay),
    [selectedDayIndex, dayDates, numberOfRealDaysPerInGameDay]
  );
  const previousDayLabel = useMemo(
    () =>
      selectedDayIndex > 0
        ? getContextualDayRangeLabel(dayDates, selectedDayIndex - 1, numberOfRealDaysPerInGameDay)
        : '',
    [dayDates, numberOfRealDaysPerInGameDay, selectedDayIndex]
  );
  const nextDayLabel = useMemo(
    () =>
      selectedDayIndex < currentDayIndex
        ? getContextualDayRangeLabel(dayDates, selectedDayIndex + 1, numberOfRealDaysPerInGameDay)
        : '',
    [currentDayIndex, dayDates, numberOfRealDaysPerInGameDay, selectedDayIndex]
  );

  // TEMP debug: dump every value feeding isSleepWindow into the player's
  // 'sleepWindowDebugLog' user variable when the window wrongly triggers.
  // Normal players stay 'noSleepWindow'. Remove with SHOW_SLEEP_SCREEN.
  const [sleepDebugRecord, setSleepWindowDebugLog] = useValue<
    string | Record<string, unknown>
  >('sleepWindowDebugLog');
  const sleepDebugSnapshotRef = useRef<Record<string, unknown>>({});
  const sleepDebugWrittenRef = useRef<'log' | 'noSleepWindow' | null>(null);
  const { showToast } = useToast();
  sleepDebugSnapshotRef.current = {
    capturedAtISO: now.toISOString(),
    timezoneOffsetMinutes: now.getTimezoneOffset(),
    gameId,
    currentEmail,
    playerUserId: currentProfile.userId,
    matchingPlayer,
    currentProfile,
    operatorUserId,
    dayDateStrings,
    dayDatesISO: dayDates.map((d) => d.toISOString()),
    numberOfRealDaysPerInGameDay,
    schedule,
    currentDayIndex,
    currentDayStartDateISO: currentDayStartDate?.toISOString() ?? null,
    deadlineDayIndex,
    deadlineDayEndDateISO: deadlineDayEndDate.toISOString(),
    voteDeadlineTime,
    actionDeadlineTime,
    voteDayOffset: schedule.voteDayOffset,
    actionDayOffset: schedule.actionDayOffset,
    wakeUpTime: schedule.wakeUpTime,
    voteDeadlineISO: voteDeadline.toISOString(),
    actionDeadlineISO: actionDeadline.toISOString(),
    laterDeadlineISO: laterDeadline.toISOString(),
    sameDayWakeUpISO: sameDayWakeUp.toISOString(),
    nextWakeUpISO: nextWakeUp.toISOString(),
    isVoteLocked,
    isActionLocked,
    isSleepWindow,
    isPastMidnight,
    selectedDayIndex,
    hasWokenUp,
    isPreviousDay,
    isStartOfSelectedDay,
    selectedDayStartDateISO: selectedDayStartDate?.toISOString() ?? null,
  };

  useEffect(() => {
    if (sleepDebugRecord.state.isSyncing) return;
    if (isSleepWindow) {
      if (sleepDebugWrittenRef.current !== 'log') {
        sleepDebugWrittenRef.current = 'log';
        setSleepWindowDebugLog({
          status: 'SLEEP_WINDOW',
          ...sleepDebugSnapshotRef.current,
        });
        showToast('log sent');
      }
      return;
    }
    // Once a log is written keep it so the bad player stays findable in Convex.
    if (sleepDebugWrittenRef.current === null) {
      sleepDebugWrittenRef.current = 'noSleepWindow';
      setSleepWindowDebugLog('noSleepWindow');
    }
  }, [isSleepWindow, sleepDebugRecord.state.isSyncing, setSleepWindowDebugLog, showToast]);

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

  return (
    <LoadingContainer
      dependencies={[
        dayDateStringsRecord,
        !isNumberOfRealDaysLoading,
        roleTable.record,
        scheduleRecord.record,
        !isOperatorLoading,
      ]}
      loadingText="Loading..."
      className="min-h-190 flex-1">
      {SHOW_SLEEP_SCREEN && isSleepWindow ? (
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
                markdown={roleData.aboutRole}
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

          <Animated.View style={contentAnimatedStyle} className="border-border/15 border-y py-5">
            <Column className="gap-5">
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
                  <FontText variant="subtext" className="text-center text-xs">
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
                              {formatTimeLabel(schedule.wakeUpTime)}.
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
              style={[
                StyleSheet.absoluteFillObject,
                overlayAnimatedStyle,
                { pointerEvents: overlayOpacity.value < 0.5 ? 'none' : 'auto' },
              ]}
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
