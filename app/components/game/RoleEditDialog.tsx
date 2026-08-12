import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import ConvexDialog from '../ui/dialog/ConvexDialog';
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
  onSetIsVisible: (index: number, value: boolean) => void;
}

const RoleEditDialog = ({
  isOpen,
  onOpenChange,
  roleIndex,
  role,
  onSetRoleName,
  onSetDoesRoleVote,
  onSetIsVisible,
}: RoleEditDialogProps) => {
  const [roleName, setRoleName] = useState(role.role || '');
  const [doesRoleVote, setDoesRoleVote] = useState(role.doesRoleVote);
  const [isVisible, setIsVisible] = useState(role.isVisible !== false);

  useEffect(() => {
    if (isOpen) {
      setRoleName(role.role || '');
      setDoesRoleVote(role.doesRoleVote);
      setIsVisible(role.isVisible !== false);
    }
  }, [isOpen, role]);

  const hasChange =
    roleName.trim() !== (role.role || '').trim() ||
    doesRoleVote !== role.doesRoleVote ||
    isVisible !== (role.isVisible !== false);

  const handleSave = () => {
    if (!roleName.trim()) return;
    onSetRoleName(roleIndex, roleName.trim());
    onSetDoesRoleVote(roleIndex, doesRoleVote);
    onSetIsVisible(roleIndex, isVisible);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setRoleName(role.role || '');
    setDoesRoleVote(role.doesRoleVote);
    setIsVisible(role.isVisible !== false);
    onOpenChange(false);
  };

  return (
    <ConvexDialog.Root isOpen={isOpen} onOpenChange={onOpenChange}>
      <ConvexDialog.Trigger asChild>
        <View />
      </ConvexDialog.Trigger>
      <ConvexDialog.Portal>
        <ConvexDialog.Overlay />
        <ConvexDialog.Content className="max-w-xl">
          <ConvexDialog.Close
            iconProps={{ color: 'rgb(246, 238, 219)' }}
            className="bg-text-inverted/10 hover:bg-text-inverted/15 absolute right-0 top-0 z-10 h-10 w-10 rounded-full"
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
                <FontText className={doesRoleVote ? '' : 'opacity-70'}>This role can vote</FontText>
              </Pressable>

              <Pressable
                onPress={() => setIsVisible(!isVisible)}
                className="flex-row items-center gap-3 pt-2">
                <CustomCheckbox
                  checked={isVisible}
                  onChange={() => setIsVisible(!isVisible)}
                  monochrome
                />
                <FontText className={isVisible ? '' : 'opacity-70'}>
                  {isVisible ? 'Visible in rulebook' : 'Hidden from rulebook'}
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
  );
};

export default RoleEditDialog;
