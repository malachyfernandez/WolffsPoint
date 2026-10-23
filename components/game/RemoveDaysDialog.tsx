import React from 'react';
import { useList, useValue } from 'hooks/useData';
import Column from '../layout/Column';
import Row from '../layout/Row';
import AppButton from '../ui/buttons/AppButton';
import FontText from '../ui/text/FontText';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import DialogHeader from '../ui/dialog/DialogHeader';
import CloseButton from '../ui/dialog/CloseButton';
import {
  defaultGameSchedule,
  getDayRangeLabel,
  getGameScopedKey,
  normalizeGameSchedule,
  parseStoredDayDates,
  resolveGameTimeZone,
  resolveHourDaySequence,
} from 'utils/multiplayer';
import { serializeGameDayDate } from '../../utils/gameDayDuration';
import { GameSchedule } from 'types/multiplayer';

interface RemoveDaysDialogProps {
  gameId: string;
  /** Cut point: this day and every day after it are removed. Never index 0. */
  index: number;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onRemoved?: () => void;
}

/**
 * Confirmation for removing a day and everything after it. Days are only ever
 * dropped from the end, so picking a middle day removes that day plus all
 * later days. Index-keyed lists are trimmed to the cut point and
 * selectedDayIndex clamps back; content written for removed days stays stored
 * under its index and resurfaces if the days are added back.
 */
const RemoveDaysDialog = ({
  gameId,
  index,
  isOpen,
  onOpenChange,
  onRemoved,
}: RemoveDaysDialogProps) => {
  const [selectedDayIndex, setSelectedDayIndex] = useList<number>('selectedDayIndex', gameId, {
    privacy: 'PUBLIC',
  });
  const [dayDatesArray, setDayDatesArray] = useList<string[]>('dayDatesArray', gameId, {
    privacy: 'PUBLIC',
  });
  const [skipVotingDays, setSkipVotingDays] = useList<number[]>('skipVotingDays', gameId, {
    privacy: 'PUBLIC',
  });
  const [skipActionsDays, setSkipActionsDays] = useList<number[]>('skipActionsDays', gameId, {
    privacy: 'PUBLIC',
  });
  const [numberOfRealDaysPerInGameDay] = useList<number>('numberOfRealDaysPerInGameDay', gameId, {
    privacy: 'PUBLIC',
  });
  const [gameSchedule] = useValue<GameSchedule>(getGameScopedKey('gameSchedule', gameId), {
    defaultValue: defaultGameSchedule,
    privacy: 'PUBLIC',
  });
  const gameTimeZone = resolveGameTimeZone(normalizeGameSchedule(gameSchedule.value));

  const fixedDayDatesArray = parseStoredDayDates(dayDatesArray.value ?? []);
  const dayCount = fixedDayDatesArray.length;
  const isLast = index === dayCount - 1;
  const afterCount = dayCount - index - 1;
  const removedLabels =
    index >= 0 && index < dayCount
      ? fixedDayDatesArray
          .slice(index)
          .map((_, i) =>
            getDayRangeLabel(
              fixedDayDatesArray,
              index + i,
              numberOfRealDaysPerInGameDay.value,
              gameTimeZone
            )
          )
      : [];
  const label = removedLabels[0] ?? '';

  const removeDays = () => {
    if (index < 1 || index >= dayCount) return;
    setDayDatesArray(
      resolveHourDaySequence(fixedDayDatesArray.slice(0, index), gameTimeZone).map(
        serializeGameDayDate
      )
    );
    setSkipVotingDays((skipVotingDays.value ?? []).filter((i) => i < index));
    setSkipActionsDays((skipActionsDays.value ?? []).filter((i) => i < index));
    if (selectedDayIndex.value >= index) setSelectedDayIndex(index - 1);
    onOpenChange(false);
    onRemoved?.();
  };

  return (
    <ConvexDialog.Root isOpen={isOpen} onOpenChange={onOpenChange}>
      <ConvexDialog.Portal>
        <ConvexDialog.Overlay />
        <ConvexDialog.Content className="max-w-md" isSwipeable={false}>
          <CloseButton onPress={() => onOpenChange(false)} />
          <DialogHeader text={isLast ? 'REMOVE DAY' : 'REMOVE DAYS'} />
          <Column className="gap-4">
            <Column className="gap-4 px-5 pb-5">
              <FontText className="text-center">
                {isLast
                  ? `Remove ${label}?`
                  : `Remove ${label} and ${afterCount} following day${afterCount === 1 ? '' : 's'}?`}
              </FontText>
              {removedLabels.length > 1 && (
                <FontText className="text-center" variant="subtext" numberOfLines={2}>
                  {removedLabels.join(', ')}
                </FontText>
              )}
              <FontText className="text-center" variant="subtext">
                Their content stays saved and comes back if you add the days again.
              </FontText>
            </Column>
            <Row className="gap-3 px-5 pb-5">
              <AppButton
                variant="outline"
                className="h-12 flex-1"
                onPress={() => onOpenChange(false)}>
                <FontText weight="medium">Cancel</FontText>
              </AppButton>
              <AppButton variant="red" className="h-12 flex-1" onPress={removeDays}>
                <FontText weight="medium" color="red-700">
                  Remove
                </FontText>
              </AppButton>
            </Row>
          </Column>
        </ConvexDialog.Content>
      </ConvexDialog.Portal>
    </ConvexDialog.Root>
  );
};

export default RemoveDaysDialog;
