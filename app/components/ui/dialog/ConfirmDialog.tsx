import React from 'react';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import AppButton from '../buttons/AppButton';
import FontText from '../text/FontText';
import ConvexDialog from './ConvexDialog';
import DialogHeader from './DialogHeader';
import CloseButton from './CloseButton';
import { useKeyboardShortcuts } from '../../../../hooks/useKeyboardShortcuts';

interface ConfirmDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** Proceed with the action. */
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** When true, the confirm button uses the danger (red) style. */
  danger?: boolean;
}

/** Generic confirmation dialog with an X (cancel) button in the top-left,
 * a secondary outline button, and a primary filled confirm button.
 * The X and the outline button both cancel — they call `onOpenChange(false)`.
 */
const ConfirmDialog = ({
  isOpen,
  onOpenChange,
  onConfirm,
  title = 'Confirm',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
}: ConfirmDialogProps) => {

  // Enter = primary action (confirm), Esc = cancel
  useKeyboardShortcuts({
    onPrimaryAction: () => {
      onOpenChange(false);
      onConfirm();
    },
    onClose: () => onOpenChange(false),
    enabled: isOpen,
  });

  return (
    <ConvexDialog.Root isOpen={isOpen} onOpenChange={onOpenChange}>
      <ConvexDialog.Portal>
        <ConvexDialog.Overlay />
        <ConvexDialog.Content className="max-w-md p-6" isSwipeable={false}>
          <CloseButton onPress={() => onOpenChange(false)} accessibilityLabel="Cancel" />
          <DialogHeader text={title} />
          {message && (
            <Column className="gap-4 pt-4">
              <FontText className="text-center">{message}</FontText>
            </Column>
          )}
          <Row className="gap-4 justify-center pt-4">
            <AppButton
              variant="outline"
              className="w-24"
              onPress={() => onOpenChange(false)}>
              <FontText weight="medium">{cancelLabel}</FontText>
            </AppButton>
            <AppButton
              variant="filled"
              className={`w-24 ${danger ? 'bg-red-500' : ''}`}
              onPress={() => {
                onOpenChange(false);
                onConfirm();
              }}>
              <FontText weight="medium" color="white">
                {confirmLabel}
              </FontText>
            </AppButton>
          </Row>
        </ConvexDialog.Content>
      </ConvexDialog.Portal>
    </ConvexDialog.Root>
  );
};

export default ConfirmDialog;
