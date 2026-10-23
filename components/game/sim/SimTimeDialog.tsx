import React from 'react';
import ConvexDialog from '../../ui/dialog/ConvexDialog';
import DialogHeader from '../../ui/dialog/DialogHeader';
import CloseButton from '../../ui/dialog/CloseButton';
import FontText from '../../ui/text/FontText';
import FontTimeInput from '../../ui/forms/FontTimeInput';
import Column from '../../layout/Column';
import { useNow } from 'hooks/useNow';
import { setSimNowTime } from 'utils/simUtils';
import { nowMs } from 'utils/simNow';

interface SimTimeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSetSimNow: (ms: number | undefined) => void;
}

/** Clock picker for the simulated time-of-day. Applies live (keeps the
 *  current simulated date), so there's no draft state or save step. */
const SimTimeDialog = ({ isOpen, onOpenChange, onSetSimNow }: SimTimeDialogProps) => {
  const simNow = useNow(1000);

  /** "HH:MM" 24h draft for FontTimeInput, seeded from the sim clock. */
  const timeValue = `${`${simNow.getHours()}`.padStart(2, '0')}:${`${simNow.getMinutes()}`.padStart(2, '0')}`;

  return (
    <ConvexDialog.Root isOpen={isOpen} onOpenChange={onOpenChange}>
      <ConvexDialog.Portal>
        <ConvexDialog.Overlay />
        <ConvexDialog.Content className="max-w-sm">
          <CloseButton onPress={() => onOpenChange(false)} />
          <DialogHeader
            text="SIMULATED TIME"
            subtext="What the game thinks the time is"
          />
          <Column className="gap-4">
            <FontTimeInput
              value={timeValue}
              isInDialog
              onChangeText={(canonical) => {
                const [h, m] = canonical.split(':').map(Number);
                onSetSimNow(setSimNowTime(nowMs(), h, m));
              }}
            />
            <FontText variant="subtext" className="text-xs">
              Keeps the simulated date. The clock keeps running from whatever you set.
            </FontText>
          </Column>
        </ConvexDialog.Content>
      </ConvexDialog.Portal>
    </ConvexDialog.Root>
  );
};

export default SimTimeDialog;
