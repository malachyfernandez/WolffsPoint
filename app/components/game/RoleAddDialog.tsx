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

interface RoleAddDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAddRole: (role: RoleTableItem) => void;
}

const RoleAddDialog = ({ isOpen, onOpenChange, onAddRole }: RoleAddDialogProps) => {
  const [roleName, setRoleName] = useState('');
  const [doesRoleVote, setDoesRoleVote] = useState(true);
  const [hiddenFromRulebook, setHiddenFromRulebook] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRoleName('');
      setDoesRoleVote(true);
      setHiddenFromRulebook(false);
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (!roleName.trim()) return;
    onAddRole({
      role: roleName.trim(),
      doesRoleVote,
      roleMessage: 'Unset role message',
      aboutRole: '## NEW ROLE - No description set',
      isVisible: true,
      hiddenFromRulebook,
    });
    onOpenChange(false);
  };

  const handleCancel = () => {
    setRoleName('');
    setDoesRoleVote(true);
    setHiddenFromRulebook(false);
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
          <DialogHeader text="Add Role" subtext="Enter the role details" />
          <Column className="gap-4 p-0 sm:p-5">
            <Column className="gap-2">
              <FontText weight="medium">Role Name</FontText>
              <FontTextInput
                placeholder="Enter role name..."
                variant="styled"
                className="w-full p-2"
                value={roleName}
                onChangeText={setRoleName}
                autoFocus
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
                {roleName.trim() ? (
                  <AppButton className="h-10 w-48" variant="black" onPress={handleSubmit}>
                    <FontText color="white" weight="medium">
                      Add Role
                    </FontText>
                  </AppButton>
                ) : (
                  <StatusButton
                    className="h-10 w-48"
                    buttonText="Add Role"
                    buttonAltText="Enter a name"
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

export default RoleAddDialog;
