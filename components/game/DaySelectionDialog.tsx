import React, { useState, useEffect, useMemo } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import Column from '../layout/Column';
import Row from '../layout/Row';
import AppButton from '../ui/buttons/AppButton';
import FontText from '../ui/text/FontText';
import DialogHeader from '../ui/dialog/DialogHeader';
import SmartDateInput from '../ui/forms/SmartDateInput';
import StatusButton from '../ui/StatusButton';
import CustomCheckbox from '../ui/CustomCheckbox';
import { useKeyboardShortcuts } from 'hooks/useKeyboardShortcuts';
import { useKeyboardShortcutHint } from 'contexts/KeyboardShortcutHintContext';
import CloseButton from '../ui/dialog/CloseButton';
import { nowDate } from 'utils/simNow';
import FontTimeInput from '../ui/forms/FontTimeInput';
import RelativeTimeInput from '../ui/forms/RelativeTimeInput';
import ShadowScrollView from '../ui/ShadowScrollView';
import UnsavedChangesDialog from '../ui/dialog/UnsavedChangesDialog';
import RemoveDaysDialog from './RemoveDaysDialog';
import {
  isTimedGameDay,
  isHourGameDay,
  isInstantGameDay,
  hourGameDay,
  hourGameDayInheritsDate,
  timedGameDayMinutes,
  timedGameDay,
  timedGameDayEnd,
} from '../../utils/gameDayDuration';
import {
  getDeviceTimeZone,
  getZonedDayToken,
  getZonedParts,
  zonedWallTimeToInstantMs,
} from '../../utils/timezone';
import {
  buildScheduledDate,
  defaultGameSchedule,
  formatInstantTimeLabel,
  getDayRangeLabel,
  getGameScopedKey,
  normalizeGameSchedule,
  parseStoredDayDates,
} from '../../utils/multiplayer';
import { GameSchedule } from 'types/multiplayer';
import { useList, useValue } from 'hooks/useData';

interface DaySelectionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  index: number;
  dayDate: Date;
  buttonLabel?: string;
  onPress: () => void;
  previousDate: Date;
  followingDate?: Date;
  replaceDayDate: (index: number, replacementDate: Date) => void;
  showCurrentDayIndicator?: boolean;
  skipVoting?: boolean;
  skipActions?: boolean;
  onSkipVotingChange?: (skip: boolean) => void;
  onSkipActionsChange?: (skip: boolean) => void;
  timeZone?: string;
  /** When set, the dialog offers "remove this day and everything after". */
  gameId?: string;
}

const DaySelectionDialog = ({
  isOpen,
  onOpenChange,
  index,
  dayDate,
  buttonLabel,
  onPress,
  previousDate,
  followingDate,
  replaceDayDate,
  showCurrentDayIndicator = false,
  skipVoting = false,
  skipActions = false,
  onSkipVotingChange,
  onSkipActionsChange,
  timeZone = getDeviceTimeZone(),
  gameId,
}: DaySelectionDialogProps) => {
  const { setHint } = useKeyboardShortcutHint();
  const { height } = useWindowDimensions();
  const timed = isTimedGameDay(dayDate);
  const isHour = isHourGameDay(dayDate);
  const initialMinutes = timedGameDayMinutes(dayDate) ?? 5;
  const parts = getZonedParts(dayDate.getTime(), timeZone);
  const dayTimestamp = dayDate.getTime();
  const originalTime = useMemo(() => {
    const clock = getZonedParts(
      isInstantGameDay(dayDate) || !isOpen ? dayTimestamp : nowDate().getTime(),
      timeZone
    );
    return `${String(clock.hour).padStart(2, '0')}:${String(clock.minute).padStart(2, '0')}`;
  }, [dayDate, dayTimestamp, timeZone, isOpen]);
  const [inheritDate, setInheritDate] = useState(index > 0 && hourGameDayInheritsDate(dayDate));
  const [time, setTime] = useState(originalTime);
  const [draftMinutes, setDraftMinutes] = useState(initialMinutes);
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState(false);
  // Follower labels for the remove button's secondary line ("and 10am and 11am").
  const [removeDayDates] = useList<string[]>('dayDatesArray', gameId ?? '', {
    privacy: 'PUBLIC',
    enabled: !!gameId,
  });
  const [removeDayLength] = useList<number>('numberOfRealDaysPerInGameDay', gameId ?? '', {
    privacy: 'PUBLIC',
    enabled: !!gameId,
  });
  const [scheduleValue] = useValue<GameSchedule>(getGameScopedKey('gameSchedule', gameId ?? ''), {
    defaultValue: defaultGameSchedule,
    privacy: 'PUBLIC',
    enabled: !!gameId,
  });
  const followingLabels = useMemo(() => {
    if (!gameId) return [];
    const dates = parseStoredDayDates(removeDayDates.value ?? []);
    return dates
      .slice(index + 1)
      .map((_, i) => getDayRangeLabel(dates, index + 1 + i, removeDayLength.value, timeZone));
  }, [gameId, removeDayDates.value, removeDayLength.value, index, timeZone]);

  const schedule = normalizeGameSchedule(scheduleValue.value);
  // A stray timed day inside a calendar/hour game just edits its date; the
  // timed-round editor only shows when the game itself runs timed rounds.
  const timedGame =
    schedule.dayDurationUnit === 'hours' ||
    schedule.dayDurationUnit === 'minutes' ||
    (removeDayLength.value ?? 2) < 1;
  const editingTimed = !isHour && timed && timedGame;

  const [isDateValid, setIsDateValid] = useState(true);

  const formatDateWithConditionalYear = (date: Date): string => {
    if (isInstantGameDay(date)) date = getZonedDayToken(date.getTime(), timeZone);
    const currentYear = isInstantGameDay(dayDate)
      ? getZonedParts(nowDate().getTime(), timeZone).year
      : nowDate().getFullYear();
    const dayYear = date.getFullYear();
    const dateFormat: Intl.DateTimeFormatOptions =
      dayYear === currentYear
        ? { month: '2-digit', day: '2-digit' }
        : { month: '2-digit', day: '2-digit', year: 'numeric' };
    return date.toLocaleDateString('en-US', dateFormat);
  };

  const originalDate = formatDateWithConditionalYear(dayDate);
  const [date, setDate] = useState(originalDate);
  const [draftSkipVoting, setDraftSkipVoting] = useState(skipVoting);
  const [draftSkipActions, setDraftSkipActions] = useState(skipActions);

  // Reset drafts to current prop values whenever the dialog opens
  useEffect(() => {
    if (isOpen) {
      setDate(originalDate);
      setIsDateValid(true);
      setDraftSkipVoting(skipVoting);
      setDraftSkipActions(skipActions);
      setTime(originalTime);
      setDraftMinutes(initialMinutes);
      setLeaveConfirm(false);
      setInheritDate(index > 0 && hourGameDayInheritsDate(dayDate));
    }
  }, [isOpen, index, originalDate, skipVoting, skipActions, initialMinutes, originalTime, dayDate]);

  const hasDateChanged = date !== originalDate;
  const hasSkipVotingChanged = draftSkipVoting !== skipVoting;
  const hasSkipActionsChanged = draftSkipActions !== skipActions;
  const hasAnyChange =
    hasDateChanged ||
    hasSkipVotingChanged ||
    hasSkipActionsChanged ||
    (isHour &&
      (time !== originalTime || (index > 0 && inheritDate !== hourGameDayInheritsDate(dayDate)))) ||
    (editingTimed && (time !== originalTime || draftMinutes !== initialMinutes));

  const normalizeDateInput = (value: string): Date => {
    const trimmed = value.trim();
    if (!trimmed) return nowDate(); // fallback to today

    const segments = trimmed.split('/');
    const hasYear = segments.length === 3 && segments[2]?.length === 4;

    let month, day, year;

    if (hasYear) {
      // MM/DD/YYYY format
      month = parseInt(segments[0], 10);
      day = parseInt(segments[1], 10);
      year = parseInt(segments[2], 10);
    } else if (segments.length >= 2) {
      // MM/DD format - infer year from dayDate
      month = parseInt(segments[0], 10);
      day = parseInt(segments[1], 10);
      year = isInstantGameDay(dayDate) ? parts.year : dayDate.getFullYear();
    } else {
      return nowDate(); // fallback to today
    }

    // Create Date object using reliable constructor
    return new Date(year, month - 1, day);
  };

  const previousDatePlusOne = index === 0 ? undefined : new Date(previousDate);
  if (previousDatePlusOne) {
    if (editingTimed || isHour) {
      const token = isInstantGameDay(previousDate)
        ? getZonedDayToken(previousDate.getTime(), timeZone)
        : previousDate;
      previousDatePlusOne.setTime(token.getTime());
    } else previousDatePlusOne.setDate(previousDate.getDate() + 1);
  }

  const followingDateMinusOne = followingDate ? new Date(followingDate) : undefined;
  if (followingDateMinusOne) {
    if ((editingTimed || isHour) && isInstantGameDay(followingDate)) {
      followingDateMinusOne.setTime(getZonedDayToken(followingDate!.getTime(), timeZone).getTime());
    } else if (!editingTimed && !isHour)
      followingDateMinusOne.setDate(followingDateMinusOne.getDate() - 1);
  }

  const calendarDate = normalizeDateInput(date);
  const [hour, minute] = time.split(':').map(Number);
  const canParseTimed =
    Number.isFinite(calendarDate.getTime()) && Number.isFinite(hour) && Number.isFinite(minute);
  const replacement = isHour
    ? hourGameDay(
        new Date(
          canParseTimed
            ? zonedWallTimeToInstantMs(
                {
                  year: calendarDate.getFullYear(),
                  month: calendarDate.getMonth() + 1,
                  day: calendarDate.getDate(),
                  hour,
                  minute,
                },
                timeZone
              )
            : NaN
        ),
        inheritDate && index > 0
      )
    : editingTimed
      ? timed && !hasDateChanged && time === originalTime
        ? timedGameDay(dayDate, draftMinutes)
        : timedGameDay(
            new Date(
              canParseTimed
                ? zonedWallTimeToInstantMs(
                    {
                      year: calendarDate.getFullYear(),
                      month: calendarDate.getMonth() + 1,
                      day: calendarDate.getDate(),
                      hour,
                      minute,
                    },
                    timeZone
                  )
                : NaN
            ),
            draftMinutes
          )
      : calendarDate;
  const previousEnd = isTimedGameDay(previousDate)
    ? timedGameDayEnd(previousDate)
    : buildScheduledDate(previousDate, '00:00', timeZone);
  const previousStart = isInstantGameDay(previousDate)
    ? previousDate
    : buildScheduledDate(previousDate, '00:00', timeZone);
  const followingStart =
    followingDate &&
    (isInstantGameDay(followingDate)
      ? followingDate
      : buildScheduledDate(followingDate, '00:00', timeZone));
  // An inheriting follower rolls forward on write, so an explicit edit only
  // has to clear a follower that has its own date. Within the dialog the
  // displayed date+time must still be strictly ordered, no silent moving.
  const followingInherits = isHourGameDay(followingDate) && hourGameDayInheritsDate(followingDate);
  const previousBound =
    index === 0 ? null : Math.max(previousStart.getTime(), previousEnd.getTime());
  const replacementMs = replacement.getTime();
  const hourTooEarly = isHour && previousBound !== null && replacementMs <= previousBound;
  const hourTooLate =
    isHour &&
    followingStart !== undefined &&
    !followingInherits &&
    replacementMs >= followingStart.getTime();
  const hourSequenceValid = !isHour || (!hourTooEarly && !hourTooLate);
  const sequenceValid = isHour
    ? hourSequenceValid
    : !editingTimed ||
      ((index === 0 || replacementMs >= previousEnd.getTime()) &&
        (!followingStart || timedGameDayEnd(replacement).getTime() <= followingStart.getTime()));
  const boundLabel = (instant: Date) => {
    const parts = getZonedParts(instant.getTime(), timeZone);
    return `${parts.month}/${parts.day} ${formatInstantTimeLabel(instant, timeZone)}`;
  };
  const previousBoundLabel = previousBound !== null ? boundLabel(new Date(previousBound)) : null;
  const followingBoundLabel = followingStart ? boundLabel(followingStart) : null;
  // "8:00 AM and 12:00 PM on 10/22" when both bounds share a date. The date
  // only needs saying once.
  const betweenBoundsLabel =
    previousBound !== null && followingStart
      ? (() => {
          const prev = getZonedParts(previousBound, timeZone);
          const next = getZonedParts(followingStart.getTime(), timeZone);
          const sameDay =
            prev.year === next.year && prev.month === next.month && prev.day === next.day;
          return sameDay
            ? `Between ${formatInstantTimeLabel(new Date(previousBound), timeZone)} and ${formatInstantTimeLabel(followingStart, timeZone)} on ${prev.month}/${prev.day}`
            : `Between ${previousBoundLabel} and ${followingBoundLabel}`;
        })()
      : null;
  const handleDateChange = (value: string) => {
    setDate(value);
    if (index > 0 && inheritDate) setInheritDate(false);
  };
  const valid =
    isDateValid &&
    (!editingTimed || (Number.isFinite(draftMinutes) && draftMinutes >= 1)) &&
    sequenceValid &&
    Number.isFinite(replacement.getTime());
  const attemptClose = () => (hasAnyChange ? setLeaveConfirm(true) : onOpenChange(false));

  const submitForum = () => {
    if (valid) {
      replaceDayDate(index, replacement);
      if (hasSkipVotingChanged) onSkipVotingChange?.(draftSkipVoting);
      if (hasSkipActionsChanged) onSkipActionsChange?.(draftSkipActions);
      setLeaveConfirm(false);
      onOpenChange(false);
    }
  };

  useKeyboardShortcuts({
    onPrimaryAction: submitForum,
    onClose: attemptClose,
    enabled: isOpen && !leaveConfirm && !removeConfirm,
  });

  return (
    <>
      <ConvexDialog.Root
        isOpen={isOpen}
        onOpenChange={(open: boolean) => (open ? onOpenChange(true) : attemptClose())}>
        <ConvexDialog.Trigger asChild>
          <AppButton
            key={index}
            variant={'black'}
            className="max-h-6 min-w-28 max-w-64 px-2"
            onPress={onPress}>
            <Row className="items-center gap-2">
              {showCurrentDayIndicator && <View className="h-1.5 w-1.5 rounded-full bg-red-500" />}
              <FontText className="text-white" numberOfLines={1}>
                {buttonLabel || `${dayDate.getMonth() + 1}/${dayDate.getDate()}`}
              </FontText>
            </Row>
          </AppButton>
        </ConvexDialog.Trigger>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />

          <ConvexDialog.Content className="max-w-xl" isSwipeable={false}>
            <CloseButton onPress={attemptClose} />
            <Column className="gap-4">
              <DialogHeader
                text="DAY OPTIONS"
                subtext={
                  isHour
                    ? (betweenBoundsLabel ??
                      (previousBoundLabel
                        ? `After ${previousBoundLabel}`
                        : followingBoundLabel
                          ? `Before ${followingBoundLabel}`
                          : undefined))
                    : previousDatePlusOne && followingDateMinusOne
                      ? `Between ${previousDatePlusOne.getMonth() + 1}/${previousDatePlusOne.getDate()} and ${followingDateMinusOne.getMonth() + 1}/${followingDateMinusOne.getDate()}`
                      : previousDatePlusOne
                        ? `After ${previousDatePlusOne.getMonth() + 1}/${previousDatePlusOne.getDate()}`
                        : followingDateMinusOne
                          ? `Before ${followingDateMinusOne.getMonth() + 1}/${followingDateMinusOne.getDate()}`
                          : undefined
                }
              />
              <ShadowScrollView style={{ maxHeight: height * 0.72 }}>
                <Column className="gap-4 px-3 pb-3 pt-2 sm:px-5 sm:pb-5">
                  {!isHour && (
                    <Column className="gap-2">
                      <SmartDateInput
                        placeholder="MM/DD/YYYY"
                        className="border-subtle-border w-full border p-2"
                        value={date}
                        onChangeText={handleDateChange}
                        onIsValid={setIsDateValid}
                        earliestDate={previousDatePlusOne}
                        latestDate={followingDateMinusOne}
                      />
                    </Column>
                  )}
                  {isHour && (
                    <Column className="gap-3">
                      <FontText weight="medium">Starts at</FontText>
                      <FontTimeInput value={time} onChangeText={setTime} isInDialog />
                      <Column className={`gap-1 ${index > 0 && inheritDate ? 'opacity-60' : ''}`}>
                        <FontText variant="subtext" className="text-sm">
                          {index > 0 && inheritDate
                            ? 'Same date as the previous day. Type to change.'
                            : 'Date'}
                        </FontText>
                        <SmartDateInput
                          placeholder="MM/DD/YYYY"
                          className="border-subtle-border w-full border p-2"
                          value={date}
                          onChangeText={handleDateChange}
                          onIsValid={setIsDateValid}
                          earliestDate={previousDatePlusOne}
                          latestDate={followingDateMinusOne}
                        />
                      </Column>
                      {hourTooEarly || hourTooLate ? (
                        <FontText color="red-700" className="text-sm">
                          {hourTooEarly
                            ? `This day must start after ${previousBoundLabel}${
                                hourTooLate ? ` and before ${followingBoundLabel}` : ''
                              }.`
                            : `This day must start before ${followingBoundLabel}.`}
                        </FontText>
                      ) : null}
                    </Column>
                  )}
                  {editingTimed && (
                    <Column className="gap-3">
                      <FontText weight="medium">Starts at</FontText>
                      <FontTimeInput value={time} onChangeText={setTime} isInDialog />
                      <FontText weight="medium">Round length</FontText>
                      <RelativeTimeInput
                        valueMinutes={draftMinutes}
                        minMinutes={1}
                        onChangeMinutes={setDraftMinutes}
                      />
                      {!sequenceValid && (
                        <FontText color="red-700" className="text-sm">
                          Keep this round after the previous one and finish before the next one
                          starts.
                        </FontText>
                      )}
                    </Column>
                  )}

                  {onSkipVotingChange && (
                    <Pressable
                      onPress={() => setDraftSkipVoting(!draftSkipVoting)}
                      className="flex-row items-center gap-3">
                      <CustomCheckbox
                        checked={draftSkipVoting}
                        onChange={() => setDraftSkipVoting(!draftSkipVoting)}
                        monochrome
                      />
                      <FontText className={draftSkipVoting ? '' : 'opacity-70'}>
                        Skip voting for this day
                      </FontText>
                    </Pressable>
                  )}

                  {onSkipActionsChange && (
                    <Pressable
                      onPress={() => setDraftSkipActions(!draftSkipActions)}
                      className="flex-row items-center gap-3">
                      <CustomCheckbox
                        checked={draftSkipActions}
                        onChange={() => setDraftSkipActions(!draftSkipActions)}
                        monochrome
                      />
                      <FontText className={draftSkipActions ? '' : 'opacity-70'}>
                        Skip actions for this day
                      </FontText>
                    </Pressable>
                  )}

                  <Row className="flex-wrap items-end justify-between gap-2">
                    {gameId && index > 0 ? (
                      <AppButton
                        variant="red"
                        className="px-4 py-2"
                        onPress={() => setRemoveConfirm(true)}>
                        <Column className="items-center gap-0.5">
                          <FontText weight="medium" color="red-700">
                            Remove Day
                          </FontText>
                          {followingLabels.length > 0 && (
                            <FontText
                              variant="subtext"
                              color="red-700"
                              className="text-xs"
                              numberOfLines={1}>
                              {followingLabels.length > 2
                                ? `and ${followingLabels[0]} thru ${followingLabels[followingLabels.length - 1]}`
                                : `and ${followingLabels.join(' and ')}`}
                            </FontText>
                          )}
                        </Column>
                      </AppButton>
                    ) : (
                      <View />
                    )}
                    {valid ? (
                      hasAnyChange ? (
                        <AppButton
                          className="h-10 w-40"
                          variant="black"
                          onPress={submitForum}
                          onHoverIn={() => setHint(['enter'])}
                          onHoverOut={() => setHint(null)}>
                          <FontText color="white" weight="medium">
                            Save
                          </FontText>
                        </AppButton>
                      ) : (
                        <StatusButton
                          buttonText="Save"
                          buttonAltText="No changes"
                          className="w-40"
                        />
                      )
                    ) : (
                      <StatusButton
                        buttonText="Save"
                        buttonAltText="Invalid Date"
                        className="w-40"
                      />
                    )}
                  </Row>
                </Column>
              </ShadowScrollView>
            </Column>
          </ConvexDialog.Content>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>
      <UnsavedChangesDialog
        isOpen={leaveConfirm}
        onOpenChange={setLeaveConfirm}
        onSave={submitForum}
        onDiscard={() => {
          setLeaveConfirm(false);
          onOpenChange(false);
        }}
      />
      {gameId && (
        <RemoveDaysDialog
          gameId={gameId}
          index={index}
          isOpen={removeConfirm}
          onOpenChange={setRemoveConfirm}
          onRemoved={() => onOpenChange(false)}
        />
      )}
    </>
  );
};

export default DaySelectionDialog;
