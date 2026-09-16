import React, { useState } from 'react';
import { Pressable } from 'react-native';
import FontText from '../text/FontText';
import ConvexDialog from '../dialog/ConvexDialog';
import DialogHeader from '../dialog/DialogHeader';
import CloseButton from '../dialog/CloseButton';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import AppButton from '../buttons/AppButton';
import { useKeyboardShortcuts } from 'hooks/useKeyboardShortcuts';

interface MustSaveDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** Save changes, then proceed with minimize. */
  onSave: () => void;
  title?: string;
  message?: string;
}

/**
 * Confirmation dialog shown when the user tries to minimize a dialog
 * that has unsaved changes. The user must save before minimizing.
 */
const MustSaveDialog = ({
  isOpen,
  onOpenChange,
  onSave,
  title = 'Save Required',
  message = 'Changes must be saved before minimizing. Save now?',
}: MustSaveDialogProps) => {
  useKeyboardShortcuts({
    onPrimaryAction: () => {
      onOpenChange(false);
      onSave();
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
          <Column className="gap-4 pt-4">
            <FontText className="text-center">{message}</FontText>
            <Row className="gap-4 justify-center pt-4">
              <AppButton
                variant="outline"
                className="w-28"
                onPress={() => onOpenChange(false)}
                keyboardHint={['esc']}>
                <FontText weight="medium">Cancel</FontText>
              </AppButton>
              <AppButton
                variant="filled"
                className="w-28"
                onPress={() => {
                  onOpenChange(false);
                  onSave();
                }}
                keyboardHint={['enter']}>
                <FontText weight="medium" color="white">
                  Save
                </FontText>
              </AppButton>
            </Row>
          </Column>
        </ConvexDialog.Content>
      </ConvexDialog.Portal>
    </ConvexDialog.Root>
  );
};

export default MustSaveDialog;
