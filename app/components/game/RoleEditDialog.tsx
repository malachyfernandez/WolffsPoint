import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import UnsavedChangesDialog from '../ui/dialog/UnsavedChangesDialog';
import { MinimizeButton, useMinimizeTarget } from '../ui/minimize';
import Column from '../layout/Column';
import Row from '../layout/Row';
import AppButton from '../ui/buttons/AppButton';
import FontText from '../ui/text/FontText';
import FontTextInput from '../ui/forms/FontTextInput';
import DialogHeader from '../ui/dialog/DialogHeader';
import CustomCheckbox from '../ui/CustomCheckbox';
import StatusButton from '../ui/StatusButton';
import { RoleTableItem } from '../../../types/roleTable';
import { useKeyboardShortcuts } from '../../../hooks/useKeyboardShortcuts';
import { useKeyboardShortcutHint } from '../../../contexts/KeyboardShortcutHintContext';
import CloseButton from '../ui/dialog/CloseButton';

interface RoleEditDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  roleIndex: number;
  role: RoleTableItem;
  onSetRoleName: (index: number, name: string) => void;
  onSetDoesRoleVote: (index: number, value: boolean) => void;
  onSetHiddenFromRulebook: (index: number, value: boolean) => void;
  /** Label for the submit button. Defaults to "Save". */
  submitLabel?: string;
}

const RoleEditDialog = ({
  isOpen,
  onOpenChange,
  roleIndex,
  role,
  onSetRoleName,
  onSetDoesRoleVote,
  onSetHiddenFromRulebook,
  submitLabel = 'Save',
}: RoleEditDialogProps) => {
  const [roleName, setRoleName] = useState(role.role || '');
  const [doesRoleVote, setDoesRoleVote] = useState(role.doesRoleVote);
  const [hiddenFromRulebook, setHiddenFromRulebook] = useState(role.hiddenFromRulebook === true);
  const [isLeaveConfirmDialogOpen, setIsLeaveConfirmDialogOpen] = useState(false);

  const { setHint } = useKeyboardShortcutHint();

  const { targetRef, performMinimize } = useMinimizeTarget({
    title: 'Edit Role',
    onClose: () => onOpenChange(false),
    onRestore: () => onOpenChange(true),
  });

  useEffect(() => {
    if (isOpen) {
      setRoleName(role.role || '');
      setDoesRoleVote(role.doesRoleVote);
      setHiddenFromRulebook(role.hiddenFromRulebook === true);
    }
  }, [isOpen, role]);

  const hasChange =
    roleName.trim() !== (role.role || '').trim() ||
    doesRoleVote !== role.doesRoleVote ||
    hiddenFromRulebook !== (role.hiddenFromRulebook === true);

  const handleSave = () => {
    if (!roleName.trim()) return;
    onSetRoleName(roleIndex, roleName.trim());
    onSetDoesRoleVote(roleIndex, doesRoleVote);
    onSetHiddenFromRulebook(roleIndex, hiddenFromRulebook);
    onOpenChange(false);
  };

  // Save without closing — used by minimize button
  const handleSaveWithoutClose = () => {
    if (!roleName.trim()) return;
    onSetRoleName(roleIndex, roleName.trim());
    onSetDoesRoleVote(roleIndex, doesRoleVote);
    onSetHiddenFromRulebook(roleIndex, hiddenFromRulebook);
  };

  const handleCancel = () => {
    if (hasChange) {
      setIsLeaveConfirmDialogOpen(true);
    } else {
      setRoleName(role.role || '');
      setDoesRoleVote(role.doesRoleVote);
      setHiddenFromRulebook(role.hiddenFromRulebook === true);
      onOpenChange(false);
    }
  };

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
    setRoleName(role.role || '');
    setDoesRoleVote(role.doesRoleVote);
    setHiddenFromRulebook(role.hiddenFromRulebook === true);
    onOpenChange(false);
  };

  useKeyboardShortcuts({
    onPrimaryAction: handleSave,
    onClose: handleAttemptClose,
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
          <ConvexDialog.Content className="max-w-xl" isSwipeable={!hasChange}>
            <View ref={targetRef} className="flex-1 min-h-0">
            <CloseButton onPress={handleAttemptClose} />
            <MinimizeButton
              hasUnsavedChanges={hasChange}
              onSave={handleSaveWithoutClose}
              onMinimize={performMinimize}
            />
            <DialogHeader text="Edit Role" subtext="Set the role details" />
            <Column className="gap-4 p-0 sm:p-5">
              <Column className="gap-2">
                <FontText weight="medium">Role Name</FontText>
                <FontTextInput
                  placeholder="Enter role name..."
                  variant="styled"
                  className="w-full p-2"
                  value={roleName}
                  onChangeText={setRoleName}
                />

                <Pressable
                  onPress={() => setDoesRoleVote(!doesRoleVote)}
                  className="flex-row items-center gap-3 pt-2">
                  <CustomCheckbox
                    checked={doesRoleVote}
                    onChange={() => setDoesRoleVote(!doesRoleVote)}
                    selectedStateAppearance="positive"
                  />
                  <FontText className={doesRoleVote ? '' : 'opacity-70'}>
                    This role can vote
                  </FontText>
                </Pressable>

                <Pressable
                  onPress={() => setHiddenFromRulebook(!hiddenFromRulebook)}
                  className="flex-row items-center gap-3 pt-2">
                  <CustomCheckbox
                    checked={!hiddenFromRulebook}
                    onChange={() => setHiddenFromRulebook(!hiddenFromRulebook)}
                    monochrome
                  />
                  <FontText className={hiddenFromRulebook ? 'opacity-70' : ''}>
                    {hiddenFromRulebook ? 'Hidden from rulebook' : 'Visible in rulebook'}
                  </FontText>
                </Pressable>
              </Column>

              <Column className="w-full items-center justify-center gap-4">
                <Row className="minimize-hide gap-4">
                  {hasChange && roleName.trim() ? (
                    <AppButton className="h-10 w-48" variant="black" onPress={handleSave} onHoverIn={() => setHint(['enter'])} onHoverOut={() => setHint(null)}>
                      <FontText color="white" weight="medium">
                        {submitLabel}
                      </FontText>
                    </AppButton>
                  ) : (
                    <StatusButton
                      className="h-10 w-48"
                      buttonText={submitLabel}
                      buttonAltText="No changes"
                    />
                  )}
                  <AppButton className="h-10 w-48" variant="outline" onPress={handleCancel} onHoverIn={() => setHint(['esc'])} onHoverOut={() => setHint(null)}>
                    <FontText color="black" weight="medium">
                      Cancel
                    </FontText>
                  </AppButton>
                </Row>
              </Column>
            </Column>
            </View>
          </ConvexDialog.Content>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>

      <UnsavedChangesDialog
        isOpen={isLeaveConfirmDialogOpen}
        onOpenChange={setIsLeaveConfirmDialogOpen}
        onSave={handleSave}
        onDiscard={handleConfirmLeave}
      />
    </>
  );
};

export default RoleEditDialog;
