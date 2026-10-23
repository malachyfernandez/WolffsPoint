import React from 'react';
import { View } from 'react-native';
import AppButton from '../ui/buttons/AppButton';
import FontText from '../ui/text/FontText';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import DialogHeader from '../ui/dialog/DialogHeader';
import Column from '../layout/Column';
import { useKeyboardShortcuts } from 'hooks/useKeyboardShortcuts';
import CloseButton from '../ui/dialog/CloseButton';

interface DeleteGameConfirmationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

const DeleteGameConfirmationDialog = ({
  isOpen,
  onOpenChange,
  onConfirm,
}: DeleteGameConfirmationDialogProps) => {
  // Del/Backspace = confirm delete, Esc = cancel
  useKeyboardShortcuts({
    onPrimaryAction: onConfirm,
    primaryKey: 'delete',
    onClose: () => onOpenChange(false),
    enabled: isOpen,
  });

  return (
    <ConvexDialog.Root isOpen={isOpen} onOpenChange={onOpenChange}>
      <ConvexDialog.Portal>
        <ConvexDialog.Overlay />
        <ConvexDialog.Content>
          <CloseButton onPress={() => onOpenChange(false)} />
          <DialogHeader text="Delete Game" subtext="This action cannot be undone" />
          <Column className="gap-4">

            <Column className="gap-4 px-5 pb-5">
              <FontText className="text-center">Delete this game and all of its data?</FontText>

              <View className="mt-4 flex-row gap-3">
                <AppButton
                  variant="outline"
                  className="h-12 flex-1"
                  onPress={() => onOpenChange(false)}
                  keyboardHint={['esc']}>
                  <FontText weight="medium">Cancel</FontText>
                </AppButton>
                <AppButton
                  variant="red"
                  className="h-12 flex-1"
                  onPress={onConfirm}
                  keyboardHint={['del']}>
                  <FontText weight="medium" color="red-700">
                    Delete Game
                  </FontText>
                </AppButton>
              </View>
            </Column>
          </Column>
        </ConvexDialog.Content>
      </ConvexDialog.Portal>
    </ConvexDialog.Root>
  );
};

export default DeleteGameConfirmationDialog;
