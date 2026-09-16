import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import AppButton from '../../ui/buttons/AppButton';
import ConvexDialog from '../../ui/dialog/ConvexDialog';
import DialogHeader from '../../ui/dialog/DialogHeader';
import UnsavedChangesDialog from '../../ui/dialog/UnsavedChangesDialog';
import FontTextInput from '../../ui/forms/FontTextInput';
import FontText from '../../ui/text/FontText';
import { CloseButton } from './CloseButton';

interface MarkdownVariableDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (name: string) => void;
}

const MarkdownVariableDialog = ({
  isOpen,
  onOpenChange,
  onInsert,
}: MarkdownVariableDialogProps) => {
  const [name, setName] = useState('');
  const [initialName, setInitialName] = useState('');
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName('');
    setInitialName('');
    setIsLeaveConfirmOpen(false);
  }, [isOpen]);

  const hasUnsavedChanges = name.trim() !== initialName.trim();
  const canSubmit = name.trim().length > 0;
  const handleAttemptClose = () => {
    if (hasUnsavedChanges) setIsLeaveConfirmOpen(true);
    else onOpenChange(false);
  };
  const handleOpenChange = (open: boolean) => {
    if (!open && hasUnsavedChanges) setIsLeaveConfirmOpen(true);
    else onOpenChange(open);
  };
  const handleSubmit = () => {
    if (!canSubmit) return;
    onInsert(name.trim());
    onOpenChange(false);
  };

  return (
    <>
      <ConvexDialog.Root isOpen={isOpen} onOpenChange={handleOpenChange}>
        <ConvexDialog.Trigger asChild>
          <View />
        </ConvexDialog.Trigger>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="max-w-md p-1" isSwipeable={false}>
            <CloseButton onPress={handleAttemptClose} />
            <DialogHeader text="Insert variable" />
            <Column className="gap-4 p-5">
              <Column className="gap-1">
                <FontText weight="medium">Variable name</FontText>
                <FontTextInput
                  autoFocus
                  className="border-subtle-border w-full rounded-xl border px-4 py-3"
                  placeholder="Number Of Players"
                  value={name}
                  onChangeText={setName}
                  onSubmitEditing={handleSubmit}
                />
              </Column>
              <Row className="justify-end gap-4">
                <AppButton variant="outline" className="w-28" onPress={handleAttemptClose}>
                  <FontText weight="medium">Cancel</FontText>
                </AppButton>
                <AppButton
                  variant="filled"
                  className="w-36"
                  disabled={!canSubmit}
                  onPress={handleSubmit}>
                  <FontText weight="medium" color="white">
                    Insert variable
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
        onSave={handleSubmit}
        onDiscard={() => {
          setIsLeaveConfirmOpen(false);
          onOpenChange(false);
        }}
      />
    </>
  );
};

export default MarkdownVariableDialog;
