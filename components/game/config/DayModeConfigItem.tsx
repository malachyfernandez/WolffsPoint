import React, { useState } from 'react';
import { useList, useValue } from 'hooks/useData';
import { GameSchedule } from 'types/multiplayer';
import {
  buildScheduledDate,
  defaultGameSchedule,
  getGameScopedKey,
  getWakeUpTime,
  isHourGameSchedule,
  migrateDayDatesToHourMode,
  normalizeGameSchedule,
  parseStoredDayDates,
  resolveGameTimeZone,
} from 'utils/multiplayer';
import {
  DEFAULT_HOUR_GAME_DAY_MINUTES,
  isInstantGameDay,
  serializeGameDayDate,
} from 'utils/gameDayDuration';
import { nowDate } from 'utils/simNow';
import ConfigSectionRow from '../../ui/forms/ConfigSectionRow';
import ConvexDialog from '../../ui/dialog/ConvexDialog';
import DialogHeader from '../../ui/dialog/DialogHeader';
import CloseButton from '../../ui/dialog/CloseButton';
import AppButton from '../../ui/buttons/AppButton';
import FontText from '../../ui/text/FontText';
import SmartDateInput from '../../ui/forms/SmartDateInput';
import FontTimeInput from '../../ui/forms/FontTimeInput';
import Column from '../../layout/Column';
import Row from '../../layout/Row';

interface DayModeConfigItemProps {
  gameId: string;
}

interface ModeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  confirmLabel: string;
  confirmDisabled?: boolean;
  children: React.ReactNode;
}

const ModeDialog = ({
  isOpen,
  onOpenChange,
  onConfirm,
  title,
  confirmLabel,
  confirmDisabled,
  children,
}: ModeDialogProps) => (
  <ConvexDialog.Root isOpen={isOpen} onOpenChange={onOpenChange}>
    <ConvexDialog.Portal>
      <ConvexDialog.Overlay />
      <ConvexDialog.Content className="max-w-md" isSwipeable={false}>
        <CloseButton onPress={() => onOpenChange(false)} />
        <Column className="gap-4">
          <DialogHeader text={title} subtext="This is a big change" />
          <Column className="gap-4 px-5 pb-5 pt-2">{children}</Column>
          <Row className="gap-3 px-5 pb-5">
            <AppButton
              variant="outline"
              className="h-12 flex-1"
              onPress={() => onOpenChange(false)}>
              <FontText weight="medium">Cancel</FontText>
            </AppButton>
            <AppButton
              variant="red"
              className="h-12 flex-1"
              disabled={confirmDisabled}
              onPress={onConfirm}>
              <FontText weight="medium" color="red-700">
                {confirmLabel}
              </FontText>
            </AppButton>
          </Row>
        </Column>
      </ConvexDialog.Content>
    </ConvexDialog.Portal>
  </ConvexDialog.Root>
);

/**
 * Calendar vs hour game. Converting to an hour game re-times every existing
 * day in place; converting back is destructive: days are wiped and the game
 * starts over, so both directions go through an explicit confirmation.
 */
const formatDateInput = (date: Date) =>
  `${`${date.getMonth() + 1}`.padStart(2, '0')}/${`${date.getDate()}`.padStart(2, '0')}/${date.getFullYear()}`;

const formatTimeInput = (date: Date) =>
  `${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}`;

const parseDateString = (dateStr: string): Date => {
  const parts = dateStr.split('/').map(Number);
  if (parts.length === 2) {
    return new Date(nowDate().getFullYear(), parts[0] - 1, parts[1]);
  }
  if (parts.length === 3) {
    return new Date(parts[2], parts[0] - 1, parts[1]);
  }
  return nowDate();
};

const DayModeConfigItem = ({ gameId }: DayModeConfigItemProps) => {
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [isRevertOpen, setIsRevertOpen] = useState(false);
  const [firstDayDate, setFirstDayDate] = useState('');
  const [firstDayTime, setFirstDayTime] = useState('05:00');
  const [isStartDateValid, setIsStartDateValid] = useState(true);

  const [gameSchedule, setGameSchedule] = useValue<GameSchedule>(
    getGameScopedKey('gameSchedule', gameId),
    {
      defaultValue: defaultGameSchedule,
      privacy: 'PUBLIC',
    }
  );
  const [dayDates, setDayDates] = useList<string[]>('dayDatesArray', gameId, {
    privacy: 'PUBLIC',
  });
  const [, setSelectedDayIndex] = useList<number>('selectedDayIndex', gameId, {
    privacy: 'PUBLIC',
  });
  const [, setSkipActionsDays] = useList<number[]>('skipActionsDays', gameId, {
    privacy: 'PUBLIC',
  });
  const [, setSkipVotingDays] = useList<number[]>('skipVotingDays', gameId, {
    privacy: 'PUBLIC',
  });
  const [dayLength, setDayLength] = useList<number>('numberOfRealDaysPerInGameDay', gameId, {
    privacy: 'PUBLIC',
  });

  const schedule = normalizeGameSchedule(gameSchedule.value);
  const isHour = isHourGameSchedule(schedule);
  const dayCount = (dayDates.value ?? []).length;

  const openConvertDialog = () => {
    // Prefill from the current day 1: a timed/instant start keeps its clock
    // time; a calendar token takes the schedule's wake-up time.
    const firstDay = parseStoredDayDates(dayDates.value ?? [])[0];
    const hasFirstDay = firstDay && Number.isFinite(firstDay.getTime());
    setFirstDayDate(formatDateInput(hasFirstDay ? firstDay : nowDate()));
    setFirstDayTime(
      hasFirstDay && isInstantGameDay(firstDay)
        ? formatTimeInput(firstDay)
        : getWakeUpTime(schedule)
    );
    setIsStartDateValid(true);
    setIsConvertOpen(true);
  };

  const handleConvertToHour = () => {
    const firstDayStart = buildScheduledDate(
      parseDateString(firstDayDate),
      firstDayTime,
      resolveGameTimeZone(schedule)
    );
    const migrated = migrateDayDatesToHourMode(dayDates.value ?? [], schedule, firstDayStart);
    setDayDates(migrated);
    // Keep a sub-day length from a timed-round game; otherwise hour days
    // default to the standard two-hour length.
    if (!(dayLength.value > 0 && dayLength.value < 1)) {
      setDayLength(DEFAULT_HOUR_GAME_DAY_MINUTES / 1440);
    }
    setGameSchedule({
      ...schedule,
      dayMode: 'hour',
      actionDeadlineLeadMinutes: schedule.actionDeadlineLeadMinutes ?? 0,
      voteDeadlineLeadMinutes: schedule.voteDeadlineLeadMinutes ?? 0,
      wakeUpOffsetMinutes: schedule.wakeUpOffsetMinutes ?? 0,
    });
    setIsConvertOpen(false);
  };

  const handleRevertToCalendar = () => {
    // Days are wiped entirely; index-keyed lists and the hour-mode fields
    // must go too, or the fresh calendar game inherits stale state. The day
    // length is reset to the calendar default, otherwise a leftover sub-day
    // value would make new days come out as timed rounds.
    setDayDates([serializeGameDayDate(nowDate())]);
    setSelectedDayIndex(0);
    setSkipActionsDays([]);
    setSkipVotingDays([]);
    setDayLength(2);
    setGameSchedule({
      ...schedule,
      dayMode: 'calendar',
      dayDurationUnit: 'days',
      actionDeadlineLeadMinutes: undefined,
      voteDeadlineLeadMinutes: undefined,
      wakeUpOffsetMinutes: undefined,
    });
    setIsRevertOpen(false);
  };

  return (
    <>
      <ConfigSectionRow
        title="Day mode"
        subtext={
          isHour
            ? 'Hour Game: each day starts at a set time and runs until the next day begins.'
            : 'Calendar game: each day spans real calendar days with clock deadlines.'
        }
        showDivider={true}>
        {isHour ? (
          <AppButton
            variant="outline"
            className="min-w-70 max-w-[320px]"
            onPress={() => setIsRevertOpen(true)}>
            <FontText weight="medium">Switch back to calendar…</FontText>
          </AppButton>
        ) : (
          <AppButton
            variant="outline"
            className="min-w-70 max-w-[320px]"
            onPress={openConvertDialog}>
            <FontText weight="medium">Convert to Hour Game…</FontText>
          </AppButton>
        )}
      </ConfigSectionRow>

      <ModeDialog
        isOpen={isConvertOpen}
        onOpenChange={setIsConvertOpen}
        onConfirm={handleConvertToHour}
        title="Convert to Hour Game"
        confirmLabel="Convert"
        confirmDisabled={!isStartDateValid}>
        <FontText className="text-center" variant="subtext">
          {dayCount > 0
            ? `Your ${dayCount} existing day${dayCount === 1 ? '' : 's'} keep their order, moved to start from day 1 below.`
            : 'Pick when the game begins.'}
        </FontText>
        <Column className="gap-2">
          <FontText>Day 1 starts on</FontText>
          <SmartDateInput
            placeholder="MM/DD/YYYY"
            className="border-subtle-border w-full border p-2"
            value={firstDayDate}
            onChangeText={setFirstDayDate}
            onIsValid={setIsStartDateValid}
          />
        </Column>
        <Column className="gap-2">
          <FontText>Day 1 start time</FontText>
          <FontTimeInput
            value={firstDayTime}
            onChangeText={setFirstDayTime}
            isInDialog
            className="w-full"
          />
        </Column>
        <FontText className="text-center" variant="subtext">
          Switching back to a calendar game later wipes all days.
        </FontText>
      </ModeDialog>

      <ModeDialog
        isOpen={isRevertOpen}
        onOpenChange={setIsRevertOpen}
        onConfirm={handleRevertToCalendar}
        title="Switch back to calendar"
        confirmLabel="Wipe days & switch">
        <FontText className="text-center">
          All {dayCount} day{dayCount === 1 ? '' : 's'} are wiped and the game restarts with one new
          day. This cannot be undone.
        </FontText>
      </ModeDialog>
    </>
  );
};

export default DayModeConfigItem;
