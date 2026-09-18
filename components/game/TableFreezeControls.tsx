import React, { useRef, useState } from 'react';
import { View } from 'react-native';
import { Clock, LockKeyhole, RotateCcw, Send } from 'lucide-react-native';
import Row from '../layout/Row';
import Column from '../layout/Column';
import AppButton from '../ui/buttons/AppButton';
import FontText from '../ui/text/FontText';
import ScheduleTableUpdateDialog from './ScheduleTableUpdateDialog';
import UnsavedChangesDialog from '../ui/dialog/UnsavedChangesDialog';
import { useToast } from 'contexts/ToastContext';

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
  /** Stretches the lone "Freeze Table" button to fill the row — used when the
      controls have wrapped onto their own line below the add button. */
  fullWidth?: boolean;
}

/**
 * Row width (in px) below which the add button and the freeze controls stop
 * sharing a line and stack instead — each spanning the full row width.
 * Raise it to stack sooner, lower it to stack later.
 */
export const CONTROLS_STACKED_BREAKPOINT = 400;

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

const TableFreezeControls = ({ controller, fullWidth = false }: TableFreezeControlsProps) => {
  const { showToast } = useToast();
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [buttonRowWidth, setButtonRowWidth] = useState(0);
  const [cancelNaturalWidth, setCancelNaturalWidth] = useState(0);
  const [pairNaturalWidth, setPairNaturalWidth] = useState(0);
  const workingRef = useRef(false);

  // Natural width of [Cancel + pair] on one line: the 12 covers the gap-3
  // between them (the divider and its gaps are inside the pair's measured
  // width). Compared against the row's actual width to know when the pair
  // has wrapped under Cancel — drives the divider's visibility only.
  const buttonsNaturalWidth =
    cancelNaturalWidth > 0 && pairNaturalWidth > 0 ? cancelNaturalWidth + pairNaturalWidth + 12 : 0;
  const isButtonsWrapped =
    buttonRowWidth > 0 && buttonsNaturalWidth > 0 && buttonRowWidth < buttonsNaturalWidth - 4;

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
    // mt-1.5 nudges the button down — the gold add button's frame sits ~4px
    // lower inside its hover padding, so this lines the two up plus a smidge.
    return (
      <Column className="mt-1.5 w-full max-w-full items-end">
        <View className={fullWidth ? 'w-full' : ''}>
          <AppButton
            variant="outline"
            className={`min-w-40 px-4 ${fullWidth ? 'w-full' : ''}`.trim()}
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
        </View>
      </Column>
    );
  }

  const cancelUpdateButton = (
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
  );

  const scheduleUpdateButton = (
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
  );

  const updateNowButton = (
    <AppButton
      variant="filled"
      className="min-w-36"
      disabled={isWorking}
      onPress={() => {
        void runAction(controller.publishNow, 'Table updated and unfrozen.').catch(() => undefined);
      }}>
      <Row className="items-center gap-2">
        <Send size={17} color="white" />
        <FontText weight="medium" color="white">
          {isWorking ? 'Updating…' : 'Update Now'}
        </FontText>
      </Row>
    </AppButton>
  );

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
        {fullWidth ? (
          /* Stacked mode: every button gets its own full-width row. */
          <Column className="w-full items-stretch gap-3">
            {cancelUpdateButton}
            {scheduleUpdateButton}
            {updateNowButton}
          </Column>
        ) : (
          <Row
            className="w-full max-w-full flex-wrap items-center justify-end gap-3"
            onLayout={(event: any) => setButtonRowWidth(event.nativeEvent.layout.width)}>
            <View
              className="shrink-0"
              onLayout={(event: any) => setCancelNaturalWidth(event.nativeEvent.layout.width)}>
              {cancelUpdateButton}
            </View>
            {/* Schedule + Update stay together as one unbreakable unit, so the
                wrap boundary lands between Cancel and this pair — Cancel wraps
                onto its own line above the other two. The divider lives inside
                the pair so it wraps down with them: it always holds the same
                space (keeping the natural-width math stable) and just fades out
                when wrapped. */}
            <Row
              className="shrink-0 items-center gap-3"
              onLayout={(event: any) => setPairNaturalWidth(event.nativeEvent.layout.width)}>
              <View className={`h-5 w-px ${isButtonsWrapped ? 'opacity-0' : 'bg-text/20'}`} />
              {scheduleUpdateButton}
              {updateNowButton}
            </Row>
          </Row>
        )}
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
