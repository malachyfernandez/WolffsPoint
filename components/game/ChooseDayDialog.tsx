import React, { useEffect, useState } from 'react';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import Column from '../layout/Column';
import Row from '../layout/Row';
import AppButton from '../ui/buttons/AppButton';
import FontText from '../ui/text/FontText';
import FontNumberInput from '../ui/forms/FontNumberInput';
import RelativeTimeInput from '../ui/forms/RelativeTimeInput';
import DialogHeader from '../ui/dialog/DialogHeader';
import { View, useWindowDimensions } from 'react-native';
import { useList, useValue } from 'hooks/useData';
import CloseButton from '../ui/dialog/CloseButton';
import UnsavedChangesDialog from '../ui/dialog/UnsavedChangesDialog';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import {
  defaultGameSchedule,
  getGameScopedKey,
  isHourGameSchedule,
  normalizeGameSchedule,
} from '../../utils/multiplayer';
import {
  DEFAULT_HOUR_GAME_DAY_MINUTES,
  durationValue,
  inferGameDayUnit,
  MAX_GAME_DAY_MINUTES,
  type GameDayUnit,
} from '../../utils/gameDayDuration';
import type { GameSchedule } from '../../types/multiplayer';
import ShadowScrollView from '../ui/ShadowScrollView';

interface ChooseDayDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  gameId: string;
  onSubmitDaysValue: (daysPerGameDay: number, unit?: GameDayUnit) => void;
  title?: string;
  subtext?: string;
}

const ChooseDayDialog = ({
  isOpen,
  onOpenChange,
  gameId,
  onSubmitDaysValue,
  title = 'Game Settings',
  subtext = 'How long should each game day last?',
}: ChooseDayDialogProps) => {
  const { height } = useWindowDimensions();
  const [duration, setDuration] = useList<number>('numberOfRealDaysPerInGameDay', gameId);
  const [scheduleRecord] = useValue<GameSchedule>(getGameScopedKey('gameSchedule', gameId), {
    privacy: 'PUBLIC',
    defaultValue: defaultGameSchedule,
  });
  const schedule = normalizeGameSchedule(scheduleRecord.value);
  const isHourGame = isHourGameSchedule(schedule);
  const isTimedGame =
    !isHourGame &&
    (scheduleRecord.value?.dayDurationUnit ?? inferGameDayUnit(duration.value)) !== 'days';
  const usesRelativeInput = isHourGame || isTimedGame;
  const [value, setValue] = useState('2');
  const [hourMinutes, setHourMinutes] = useState(1440);
  const [initial, setInitial] = useState({ value: '2' });
  const [initialHourMinutes, setInitialHourMinutes] = useState(1440);
  const [confirmLeave, setConfirmLeave] = useState(false);
  useEffect(() => {
    if (!isOpen) return;
    const nextValue = String(durationValue(duration.value, 'days'));
    const nextHourMinutes =
      Number.isFinite(duration.value) && duration.value > 0
        ? Math.max(1, Math.round(duration.value * 1440))
        : DEFAULT_HOUR_GAME_DAY_MINUTES;
    setValue(nextValue);
    setInitial({ value: nextValue });
    setHourMinutes(nextHourMinutes);
    setInitialHourMinutes(nextHourMinutes);
    setConfirmLeave(false);
  }, [isOpen, duration.value]);
  const dirty =
    value.trim() !== initial.value || (usesRelativeInput && hourMinutes !== initialHourMinutes);
  const valid = usesRelativeInput
    ? hourMinutes >= 1 && hourMinutes <= MAX_GAME_DAY_MINUTES
    : /^\d+$/.test(value) && Number(value) >= 1 && Number(value) * 1440 <= MAX_GAME_DAY_MINUTES;
  const handleSubmit = () => {
    if (!valid) return;
    const days = usesRelativeInput ? hourMinutes / 1440 : Number(value);
    setDuration(days);
    onSubmitDaysValue(days);
    setConfirmLeave(false);
    onOpenChange(false);
  };
  const handleCancel = () => {
    if (dirty) setConfirmLeave(true);
    else onOpenChange(false);
  };
  useKeyboardShortcuts({
    onClose: handleCancel,
    onPrimaryAction: handleSubmit,
    enabled: isOpen && !confirmLeave,
  });

  return (
    <>
      <ConvexDialog.Root
        isOpen={isOpen}
        onOpenChange={(open: boolean) => (open ? onOpenChange(true) : handleCancel())}>
        <ConvexDialog.Trigger asChild>
          <View>{/* This will be replaced by the actual pressable in DaysTable */}</View>
        </ConvexDialog.Trigger>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />

          <ConvexDialog.Content isSwipeable={false}>
            <CloseButton onPress={handleCancel} />
            <DialogHeader text={title} subtext={subtext} />
            <Column className="gap-4">
              <ShadowScrollView style={{ maxHeight: height * 0.72 }}>
                <Column className="gap-4 px-5 pb-5">
                  <Column className="gap-2">
                    <FontText weight="medium">Game day length</FontText>
                    {usesRelativeInput ? (
                      <RelativeTimeInput
                        valueMinutes={hourMinutes}
                        minMinutes={1}
                        onChangeMinutes={setHourMinutes}
                      />
                    ) : (
                      <Row className="items-center gap-2">
                        <FontNumberInput
                          accessibilityLabel="Game day length in days"
                          value={value}
                          onChangeText={(text) => setValue(text)}
                          minValue={1}
                          maxValue={Math.floor(MAX_GAME_DAY_MINUTES / 1440)}
                          inline
                          useDefaultStyling
                          hideHelperText
                          className="border-border/15 bg-text/5 min-w-16"
                        />
                        <FontText weight="medium" className="opacity-60">
                          days
                        </FontText>
                      </Row>
                    )}
                    <FontText variant="subtext" className="text-sm">
                      {isHourGame
                        ? 'The first day starts now. Each new day begins this long after the one before it.'
                        : isTimedGame
                          ? 'Submissions close and morning messages unlock at the end of each round.'
                          : 'Use the usual calendar schedule.'}
                    </FontText>
                  </Column>

                  <Column className="gap-2">
                    <AppButton
                      className="w-34 h-10"
                      variant="filled"
                      disabled={!valid}
                      onPress={handleSubmit}>
                      <FontText color="white" weight="medium">
                        Save
                      </FontText>
                    </AppButton>
                    <AppButton className="w-34 h-10" variant="outline" onPress={handleCancel}>
                      <FontText color="black" weight="medium">
                        Cancel
                      </FontText>
                    </AppButton>
                  </Column>
                </Column>
              </ShadowScrollView>
            </Column>
          </ConvexDialog.Content>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>
      <UnsavedChangesDialog
        isOpen={confirmLeave}
        onOpenChange={setConfirmLeave}
        onSave={handleSubmit}
        onDiscard={() => {
          setConfirmLeave(false);
          onOpenChange(false);
        }}
      />
    </>
  );
};

export default ChooseDayDialog;
