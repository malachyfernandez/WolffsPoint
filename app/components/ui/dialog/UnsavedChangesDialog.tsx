import React from 'react';
import { Pressable } from 'react-native';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import AppButton from '../buttons/AppButton';
import FontText from '../text/FontText';
import ConvexDialog from './ConvexDialog';
import DialogHeader from './DialogHeader';

interface UnsavedChangesDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** Save changes and close the editor. */
  onSave: () => void;
  /** Close the editor without saving. */
  onDiscard: () => void;
  title?: string;
  message?: string;
  saveLabel?: string;
  discardLabel?: string;
}

const UnsavedChangesDialog = ({
  isOpen,
  onOpenChange,
  onSave,
  onDiscard,
  title = 'Unsaved Changes',
  message = 'You have unsaved changes. Do you want to save them?',
  saveLabel = 'Save',
  discardLabel = "Don't Save",
}: UnsavedChangesDialogProps) => {
  return (
    <ConvexDialog.Root isOpen={isOpen} onOpenChange={onOpenChange}>
      <ConvexDialog.Portal>
        <ConvexDialog.Overlay />
        <ConvexDialog.Content className="max-w-md p-6" isSwipeable={false}>
          <Pressable
            onPress={() => onOpenChange(false)}
            className="absolute left-0 top-0 z-10 h-10 w-10 items-center justify-center rounded-full bg-text-inverted/10 hover:bg-text-inverted/15"
            accessibilityRole="button"
            accessibilityLabel="Stay">
            <FontText color="rgb(246, 238, 219)" weight="bold" className="text-xl">
              ×
            </FontText>
          </Pressable>
          <DialogHeader text={title} />
          <Column className="gap-4 pt-4">
            <FontText className="text-center">{message}</FontText>
            <Row className="gap-4 justify-center pt-4">
              <AppButton
                variant="outline"
                className="w-28"
                onPress={() => {
                  onOpenChange(false);
                  onDiscard();
                }}>
                <FontText weight="medium">{discardLabel}</FontText>
              </AppButton>
              <AppButton
                variant="filled"
                className="w-24"
                onPress={() => {
                  onOpenChange(false);
                  onSave();
                }}>
                <FontText weight="medium" color="white">
                  {saveLabel}
                </FontText>
              </AppButton>
            </Row>
          </Column>
        </ConvexDialog.Content>
      </ConvexDialog.Portal>
    </ConvexDialog.Root>
  );
};

export default UnsavedChangesDialog;
