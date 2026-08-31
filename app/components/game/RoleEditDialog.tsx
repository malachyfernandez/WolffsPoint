import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import UnsavedChangesDialog from '../ui/dialog/UnsavedChangesDialog';
import Column from '../layout/Column';
import Row from '../layout/Row';
import AppButton from '../ui/buttons/AppButton';
import FontText from '../ui/text/FontText';
import FontTextInput from '../ui/forms/FontTextInput';
import DialogHeader from '../ui/dialog/DialogHeader';
import CustomCheckbox from '../ui/CustomCheckbox';
import StatusButton from '../ui/StatusButton';
import { RoleTableItem } from '../../../types/roleTable';

interface RoleEditDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  roleIndex: number;
  role: RoleTableItem;
  onSetRoleName: (index: number, name: string) => void;
  onSetDoesRoleVote: (index: number, value: boolean) => void;
  onSetHiddenFromRulebook: (index: number, value: boolean) => void;
}

const RoleEditDialog = ({
  isOpen,
  onOpenChange,
  roleIndex,
  role,
  onSetRoleName,
  onSetDoesRoleVote,
  onSetHiddenFromRulebook,
}: RoleEditDialogProps) => {
  const [roleName, setRoleName] = useState(role.role || '');
  const [doesRoleVote, setDoesRoleVote] = useState(role.doesRoleVote);
  const [hiddenFromRulebook, setHiddenFromRulebook] = useState(role.hiddenFromRulebook === true);
  const [isLeaveConfirmDialogOpen, setIsLeaveConfirmDialogOpen] = useState(false);

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

  return (
    <>
      <ConvexDialog.Root isOpen={isOpen} onOpenChange={handleOpenChange}>
        <ConvexDialog.Trigger asChild>
          <View />
        </ConvexDialog.Trigger>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="max-w-xl" isSwipeable={!hasChange}>
            <ConvexDialog.Close
              iconProps={{ color: 'rgb(246, 238, 219)' }}
              className="bg-text-inverted/10 hover:bg-text-inverted/15 absolute right-0 top-0 z-10 h-10 w-10 rounded-full"
              onPress={handleAttemptClose}
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
                <Row className="gap-4">
                  {hasChange && roleName.trim() ? (
                    <AppButton className="h-10 w-48" variant="black" onPress={handleSave}>
                      <FontText color="white" weight="medium">
                        Save
                      </FontText>
                    </AppButton>
                  ) : (
                    <StatusButton
                      className="h-10 w-48"
                      buttonText="Save"
                      buttonAltText="No changes"
                    />
                  )}
                  <AppButton className="h-10 w-48" variant="outline" onPress={handleCancel}>
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
        onSave={handleSave}
        onDiscard={handleConfirmLeave}
      />
    </>
  );
};

export default RoleEditDialog;
