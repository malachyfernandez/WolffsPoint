import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import FontTextInput from '../ui/forms/FontTextInput';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import DialogHeader from '../ui/dialog/DialogHeader';
import UnsavedChangesDialog from '../ui/dialog/UnsavedChangesDialog';
import Column from '../layout/Column';
import Row from '../layout/Row';
import FontText from '../ui/text/FontText';
import AppButton from '../ui/buttons/AppButton';
import DisableableButton from '../ui/buttons/DisableableButton';
import ActionPills from './ActionPills';
import ShadowScrollView from '../ui/ShadowScrollView';

interface ActionEditorDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialAction?: string;
  onSubmit: (action: string) => void;
  dialogSubtext?: string;
}

const ActionEditorDialog = ({
  isOpen,
  onOpenChange,
  title,
  initialAction = '',
  onSubmit,
  dialogSubtext,
}: ActionEditorDialogProps) => {
  const [draftAction, setDraftAction] = useState(initialAction);
  const [editingStartAction, setEditingStartAction] = useState(initialAction);
  const [isLeaveConfirmDialogOpen, setIsLeaveConfirmDialogOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDraftAction(initialAction);
      setEditingStartAction(initialAction);
    }
  }, [initialAction, isOpen]);

  const hasUnsavedChanges = draftAction.trim() !== (editingStartAction?.trim() || '');
  const canSubmit = true; // Allow empty actions

  const handleSubmit = () => {
    onSubmit(draftAction.trim());
    onOpenChange(false);
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setIsLeaveConfirmDialogOpen(true);
    } else {
      setDraftAction(initialAction);
      onOpenChange(false);
    }
  };

  const handleAttemptClose = () => {
    if (hasUnsavedChanges) {
      setIsLeaveConfirmDialogOpen(true);
    } else {
      onOpenChange(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && hasUnsavedChanges) {
      setIsLeaveConfirmDialogOpen(true);
    } else {
      onOpenChange(open);
    }
  };

  const handleConfirmLeave = () => {
    setIsLeaveConfirmDialogOpen(false);
    setDraftAction(initialAction);
    onOpenChange(false);
  };

  const handleCancelLeave = () => {
    setIsLeaveConfirmDialogOpen(false);
  };

  return (
    <>
      <ConvexDialog.Root isOpen={isOpen} onOpenChange={handleOpenChange}>
        <ConvexDialog.Trigger asChild>
          <View />
        </ConvexDialog.Trigger>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="max-w-lg p-1" isSwipeable={!hasUnsavedChanges}>
            <ConvexDialog.Close
              iconProps={{ color: 'rgb(246, 238, 219)' }}
              className="bg-text-inverted/10 hover:bg-text-inverted/15 absolute right-0 top-0 z-10 h-10 w-10 rounded-full"
              onPress={handleAttemptClose}
            />
            <DialogHeader text={title} subtext={dialogSubtext} />

            <Column className="gap-4 p-0 pt-4 sm:p-5">
              {/* Text Input for editing */}
              <Column className="gap-1">
                <FontText weight="medium" className="text-sm opacity-70">
                  Action Text
                </FontText>
                <FontTextInput
                  value={draftAction}
                  onChangeText={setDraftAction}
                  placeholder="e.g., Kill: Ty Pace • Weapon: Piano"
                  multiline
                  numberOfLines={3}
                  variant="styled"
                  className="p-2"
                  style={{ fontFamily: 'Poppins-Regular' }}
                />
                <FontText className="text-xs opacity-50">
                  Use • to separate multiple actions. Use : to separate label from value.
                </FontText>
              </Column>

              {/* Live Preview */}
              <Column className="flex-1 gap-1">
                <FontText weight="medium" className="text-sm opacity-70">
                  Preview
                </FontText>
                <View className="bg-background border-border min-h-[80px] flex-1 rounded-lg border-2 p-3">
                  <ShadowScrollView className="h-full">
                    <ActionPills actionText={draftAction} />
                  </ShadowScrollView>
                </View>
              </Column>

              {/* Action Buttons */}
              <Row className="justify-end gap-4 pt-2">
                <AppButton variant="outline" onPress={handleCancel} className="w-22 h-12 sm:w-32">
                  <FontText>Cancel</FontText>
                </AppButton>
                <DisableableButton
                  isEnabled={hasUnsavedChanges}
                  enabledText="Save"
                  disabledText="No changes"
                  onPress={handleSubmit}
                  enabledVariant="filled"
                />
              </Row>
            </Column>
          </ConvexDialog.Content>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>

      <UnsavedChangesDialog
        isOpen={isLeaveConfirmDialogOpen}
        onOpenChange={setIsLeaveConfirmDialogOpen}
        onStay={handleCancelLeave}
        onLeave={handleConfirmLeave}
      />
    </>
  );
};

export default ActionEditorDialog;
