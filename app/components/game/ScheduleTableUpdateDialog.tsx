import React, { useEffect, useMemo, useState } from 'react';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import Column from '../layout/Column';
import Row from '../layout/Row';
import AppButton from '../ui/buttons/AppButton';
import FontText from '../ui/text/FontText';
import DialogHeader from '../ui/dialog/DialogHeader';
import CloseButton from '../ui/dialog/CloseButton';
import FontDateInput from '../ui/forms/FontDateInput';
import FontTimeInput from '../ui/forms/FontTimeInput';
import UnsavedChangesDialog from '../ui/dialog/UnsavedChangesDialog';

interface ScheduleTableUpdateDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  scheduledTime?: number;
  isBusy?: boolean;
  onSchedule: (scheduledTime: number) => Promise<void> | void;
}

const formatDateInput = (date: Date) =>
  `${`${date.getMonth() + 1}`.padStart(2, '0')}/${`${date.getDate()}`.padStart(2, '0')}/${date.getFullYear()}`;

const formatTimeInput = (date: Date) =>
  `${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}`;

const getInitialDate = (scheduledTime?: number) => {
  const date = scheduledTime ? new Date(scheduledTime) : new Date(Date.now() + 60 * 60 * 1000);
  date.setSeconds(0, 0);
  return date;
};

const ScheduleTableUpdateDialog = ({
  isOpen,
  onOpenChange,
  scheduledTime,
  isBusy = false,
  onSchedule,
}: ScheduleTableUpdateDialogProps) => {
  const [date, setDate] = useState('');
  const [canonicalDate, setCanonicalDate] = useState<string | null>(null);
  const [time, setTime] = useState('08:00');
  const [initialDate, setInitialDate] = useState('');
  const [initialTime, setInitialTime] = useState('08:00');
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const initial = getInitialDate(scheduledTime);
    const nextDate = formatDateInput(initial);
    const nextTime = formatTimeInput(initial);
    setDate(nextDate);
    setCanonicalDate(nextDate);
    setTime(nextTime);
    setInitialDate(nextDate);
    setInitialTime(nextTime);
    setIsLeaveConfirmOpen(false);
    setIsSubmitting(false);
  }, [isOpen, scheduledTime]);

  const timestamp = useMemo(() => {
    if (!canonicalDate) return null;
    const [month, day, year] = canonicalDate.split('/').map(Number);
    const [hours, minutes] = time.split(':').map(Number);
    const value = new Date(year, month - 1, day, hours, minutes, 0, 0).getTime();
    return Number.isFinite(value) ? value : null;
  }, [canonicalDate, time]);

  const hasUnsavedChanges = date !== initialDate || time !== initialTime;
  const isValid = timestamp !== null && timestamp > Date.now();
  const timezone = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' })
        .formatToParts(new Date())
        .find((part) => part.type === 'timeZoneName')?.value,
    []
  );

  const handleAttemptClose = () => {
    if (hasUnsavedChanges) {
      setIsLeaveConfirmOpen(true);
      return;
    }
    onOpenChange(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && hasUnsavedChanges) {
      setIsLeaveConfirmOpen(true);
      return;
    }
    onOpenChange(open);
  };

  const handleSchedule = async () => {
    if (!isValid || timestamp === null || isSubmitting || isBusy) return;
    setIsSubmitting(true);
    try {
      await onSchedule(timestamp);
      onOpenChange(false);
    } catch {
      return;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <ConvexDialog.Root isOpen={isOpen} onOpenChange={handleOpenChange}>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="max-w-xl" isSwipeable={false}>
            <CloseButton onPress={handleAttemptClose} />
            <DialogHeader
              text={scheduledTime ? 'Change Update Time' : 'Schedule Table Update'}
              subtext={`Choose when the frozen table should become visible${timezone ? ` (${timezone})` : ''}.`}
            />
            <Column className="gap-5 p-0 sm:p-5">
              <Column className="gap-2">
                <FontText weight="medium">Date</FontText>
                <FontDateInput
                  value={date}
                  earliestDate={new Date()}
                  className="border-subtle-border w-full border p-3"
                  onChangeText={(displayValue, _isValid, nextCanonicalDate) => {
                    setDate(displayValue);
                    setCanonicalDate(nextCanonicalDate);
                  }}
                />
              </Column>
              <Column className="gap-2">
                <FontText weight="medium">Time</FontText>
                <FontTimeInput value={time} onChangeText={setTime} isInDialog />
              </Column>
              {!isValid && canonicalDate && (
                <FontText variant="subtext" className="text-red-500">
                  Choose a time in the future.
                </FontText>
              )}
              <Row className="flex-wrap justify-end gap-4">
                <AppButton variant="outline" className="w-32" onPress={handleAttemptClose}>
                  <FontText weight="medium">Cancel</FontText>
                </AppButton>
                <AppButton
                  variant="filled"
                  className="w-40"
                  disabled={!isValid || isSubmitting || isBusy}
                  onPress={handleSchedule}>
                  <FontText weight="medium" color="white">
                    {isSubmitting || isBusy
                      ? 'Scheduling…'
                      : scheduledTime
                        ? 'Change Time'
                        : 'Schedule'}
                  </FontText>
                </AppButton>
              </Row>
            </Column>
          </ConvexDialog.Content>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>
      <UnsavedChangesDialog
        isOpen={isLeaveConfirmOpen}
        onOpenChange={setIsLeaveConfirmOpen}
        onSave={handleSchedule}
        onDiscard={() => {
          setIsLeaveConfirmOpen(false);
          onOpenChange(false);
        }}
      />
    </>
  );
};

export default ScheduleTableUpdateDialog;
