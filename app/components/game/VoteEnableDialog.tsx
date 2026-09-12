import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import UnsavedChangesDialog from '../ui/dialog/UnsavedChangesDialog';
import Column from '../layout/Column';
import Row from '../layout/Row';
import AppButton from '../ui/buttons/AppButton';
import FontText from '../ui/text/FontText';
import DialogHeader from '../ui/dialog/DialogHeader';
import CustomCheckbox from '../ui/CustomCheckbox';
import { useKeyboardShortcuts } from '../../../hooks/useKeyboardShortcuts';
import { useKeyboardShortcutHint } from '../../../contexts/KeyboardShortcutHintContext';
import CloseButton from '../ui/dialog/CloseButton';

interface VoteEnableDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  roleName: string;
  doesRoleVote: boolean;
  onSetDoesRoleVote: (value: boolean) => void;
  onContinueToEditor: () => void;
}

const VoteEnableDialog = ({
  isOpen,
  onOpenChange,
  roleName,
  doesRoleVote,
  onSetDoesRoleVote,
  onContinueToEditor,
}: VoteEnableDialogProps) => {
  const { setHint } = useKeyboardShortcutHint();

  const [canVote, setCanVote] = useState(doesRoleVote);
  const [isLeaveConfirmDialogOpen, setIsLeaveConfirmDialogOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCanVote(doesRoleVote);
      setIsLeaveConfirmDialogOpen(false);
    }
  }, [isOpen, doesRoleVote]);

  const hasChange = canVote !== doesRoleVote;

  const handleAttemptClose = () => {
    if (hasChange) {
      setIsLeaveConfirmDialogOpen(true);
    } else {
      onOpenChange(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && hasChange) {
      setIsLeaveConfirmDialogOpen(true);
    } else {
      onOpenChange(open);
    }
  };

  const handleConfirmLeave = () => {
    setIsLeaveConfirmDialogOpen(false);
    setCanVote(doesRoleVote);
    onOpenChange(false);
  };

  const handleSaveFromConfirm = () => {
    setIsLeaveConfirmDialogOpen(false);
    onSetDoesRoleVote(canVote);
    onOpenChange(false);
  };

  const handleCancel = () => {
    if (hasChange) {
      setIsLeaveConfirmDialogOpen(true);
    } else {
      onOpenChange(false);
    }
  };

  const handlePrimary = () => {
    onSetDoesRoleVote(canVote);
    if (canVote) {
      onOpenChange(false);
      onContinueToEditor();
    } else {
      onOpenChange(false);
    }
  };

  useKeyboardShortcuts({
    onPrimaryAction: handlePrimary,
    onClose: handleCancel,
    enabled: isOpen,
  });

  return (
    <>
      <ConvexDialog.Root isOpen={isOpen} onOpenChange={handleOpenChange}>
        <ConvexDialog.Trigger asChild>
          <View />
        </ConvexDialog.Trigger>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="max-w-md" isSwipeable={!hasChange}>
            <CloseButton onPress={handleAttemptClose} />
            <DialogHeader text="Vote Settings" subtext={`${roleName || 'Role'} voting`} />
            <Column className="gap-4 p-0 sm:p-5">
              <FontText variant="subtext">
                Roles that can vote will see a vote input on their &quot;your eyes only&quot; page.
                Disable voting for roles that do not submit a vote.
              </FontText>

              <Pressable
                onPress={() => setCanVote(!canVote)}
                className="flex-row items-center gap-3 pt-2">
                <CustomCheckbox
                  checked={canVote}
                  onChange={() => setCanVote(!canVote)}
                  selectedStateAppearance="positive"
                />
                <FontText className={canVote ? '' : 'opacity-70'}>This role can vote</FontText>
              </Pressable>

              <Column className="w-full items-center justify-center gap-4 pt-2">
                <Row className="gap-4">
                  <AppButton className="h-10 w-48" variant="black" onPress={handlePrimary} onHoverIn={() => setHint(['enter'])} onHoverOut={() => setHint(null)}>
                    <FontText color="white" weight="medium">
                      {canVote ? 'Edit Vote Message' : 'Save'}
                    </FontText>
                  </AppButton>
                  <AppButton className="h-10 w-48" variant="outline" onPress={handleCancel} onHoverIn={() => setHint(['esc'])} onHoverOut={() => setHint(null)}>
                    <FontText color="black" weight="medium">
                      Cancel
                    </FontText>
                  </AppButton>
                </Row>
              </Column>
            </Column>
          </ConvexDialog.Content>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>

      <UnsavedChangesDialog
        isOpen={isLeaveConfirmDialogOpen}
        onOpenChange={setIsLeaveConfirmDialogOpen}
        onSave={handleSaveFromConfirm}
        onDiscard={handleConfirmLeave}
      />
    </>
  );
};

export default VoteEnableDialog;
