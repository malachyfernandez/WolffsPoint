import React, { useRef, useState } from 'react';
import { View } from 'react-native';
import { Clock, LockKeyhole, RotateCcw, Send } from 'lucide-react-native';
import Row from '../layout/Row';
import Column from '../layout/Column';
import AppButton from '../ui/buttons/AppButton';
import FontText from '../ui/text/FontText';
import ScheduleTableUpdateDialog from './ScheduleTableUpdateDialog';
import UnsavedChangesDialog from '../ui/dialog/UnsavedChangesDialog';
import { useToast } from '../../../contexts/ToastContext';

interface TableFreezeController {
  isLoading: boolean;
  isActive: boolean;
  isScheduled: boolean;
  scheduledTime: number | null;
  freeze: () => Promise<void>;
  schedule: (scheduledTime: number) => Promise<void>;
  publishNow: () => Promise<void>;
  cancel: () => Promise<void>;
}

interface TableFreezeControlsProps {
  controller: TableFreezeController;
}

const formatScheduledTime = (scheduledTime: number) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year:
      new Date(scheduledTime).getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(scheduledTime));

const TableFreezeControls = ({ controller }: TableFreezeControlsProps) => {
  const { showToast } = useToast();
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [isButtonsWrapped, setIsButtonsWrapped] = useState(false);
  const workingRef = useRef(false);

  const runAction = async (action: () => Promise<void>, successMessage: string) => {
    if (workingRef.current) throw new Error('A table update is already in progress');
    workingRef.current = true;
    setIsWorking(true);
    try {
      await action();
      showToast(successMessage);
    } catch (error) {
      console.error('Table freeze action failed', error);
      showToast('That table update could not be completed.');
      throw error;
    } finally {
      workingRef.current = false;
      setIsWorking(false);
    }
  };

  if (!controller.isActive) {
    return (
      <Column className="w-full max-w-full items-end">
        <AppButton
          variant="outline"
          className="min-w-40 px-4"
          disabled={isWorking || controller.isLoading}
          onPress={() => {
            void runAction(controller.freeze, 'Table frozen. Changes are now private.').catch(
              () => undefined
            );
          }}>
          <Row className="items-center gap-2">
            <LockKeyhole size={18} color="black" />
            <FontText weight="medium">{isWorking ? 'Freezing…' : 'Freeze Table'}</FontText>
          </Row>
        </AppButton>
      </Column>
    );
  }

  return (
    <>
      <Column className="w-full max-w-full items-end gap-2">
        <Row className="border-border/20 bg-text/5 items-center gap-2 rounded-full border px-3 py-1.5">
          <LockKeyhole size={14} color="black" />
          <FontText variant="subtext">
            {controller.scheduledTime
              ? `Frozen · Updates ${formatScheduledTime(controller.scheduledTime)}`
              : 'Frozen · Changes are private'}
          </FontText>
        </Row>
        <Row
          className="w-full max-w-full flex-wrap items-center justify-end gap-3"
          onLayout={(event: any) => {
            setIsButtonsWrapped(event.nativeEvent.layout.height > 56);
          }}>
          <AppButton
            variant="outline"
            className="min-w-36 px-3"
            disabled={isWorking}
            onPress={() => setIsDiscardOpen(true)}>
            <Row className="items-center gap-2">
              <RotateCcw size={17} color="black" />
              <FontText weight="medium">Cancel Update</FontText>
            </Row>
          </AppButton>
          {!isButtonsWrapped && <View className="h-5 w-px bg-text/20" />}
          <AppButton
            variant="outline"
            className="min-w-40 px-3"
            disabled={isWorking}
            onPress={() => setIsScheduleOpen(true)}>
            <Row className="items-center gap-2">
              <Clock size={17} color="black" />
              <FontText weight="medium">
                {controller.isScheduled ? 'Change Time' : 'Schedule Update'}
              </FontText>
            </Row>
          </AppButton>
          <AppButton
            variant="filled"
            className="min-w-36"
            disabled={isWorking}
            onPress={() => {
              void runAction(controller.publishNow, 'Table updated and unfrozen.').catch(
                () => undefined
              );
            }}>
            <Row className="items-center gap-2">
              <Send size={17} color="white" />
              <FontText weight="medium" color="white">
                {isWorking ? 'Updating…' : 'Update Now'}
              </FontText>
            </Row>
          </AppButton>
        </Row>
      </Column>
      <ScheduleTableUpdateDialog
        isOpen={isScheduleOpen}
        onOpenChange={setIsScheduleOpen}
        scheduledTime={controller.scheduledTime ?? undefined}
        isBusy={isWorking}
        onSchedule={(scheduledTime) =>
          runAction(
            () => controller.schedule(scheduledTime),
            `Table update scheduled for ${formatScheduledTime(scheduledTime)}.`
          )
        }
      />
      <UnsavedChangesDialog
        isOpen={isDiscardOpen}
        onOpenChange={setIsDiscardOpen}
        title="Cancel Table Update?"
        message="This will discard every frozen change and return the table to its published version."
        saveLabel="Keep Editing"
        discardLabel="Discard"
        onSave={() => setIsDiscardOpen(false)}
        onDiscard={() => {
          void runAction(controller.cancel, 'Frozen changes discarded.').catch(() => undefined);
        }}
      />
    </>
  );
};

export default TableFreezeControls;
