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
import { RoleTableItem } from 'types/roleTable';
import { useKeyboardShortcuts } from 'hooks/useKeyboardShortcuts';
import { useKeyboardShortcutHint } from 'contexts/KeyboardShortcutHintContext';
import CloseButton from '../ui/dialog/CloseButton';
import { useScriptFiles } from 'hooks/useScriptFiles';
import { useCellModuleStatus } from 'utils/legacySystems';
import { createMarkdownFileSource, fileInputDefaults, makeFileStatement } from 'utils/scriptFiles';
import { printStatement } from 'script/lang/printer';

interface RoleAddDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAddRole: (role: RoleTableItem) => void;
  gameId: string;
}

const RoleAddDialog = ({ isOpen, onOpenChange, onAddRole, gameId }: RoleAddDialogProps) => {
  const { setHint } = useKeyboardShortcutHint();
  const filesApi = useScriptFiles(gameId);
  const { displayModules } = useCellModuleStatus(gameId);

  const [roleName, setRoleName] = useState('');
  const [doesRoleVote, setDoesRoleVote] = useState(true);
  const [hiddenFromRulebook, setHiddenFromRulebook] = useState(false);
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRoleName('');
      setDoesRoleVote(true);
      setHiddenFromRulebook(false);
      setIsLeaveConfirmOpen(false);
    }
  }, [isOpen]);

  const hasUnsavedChanges =
    roleName.trim().length > 0 || doesRoleVote !== true || hiddenFromRulebook !== false;

  const handleSubmit = () => {
    if (!roleName.trim()) return;
    const cleanName = roleName.trim();
    let aboutRole = '## NEW ROLE - No description set';
    if (displayModules) {
      const file = filesApi.createFile(
        'aboutRole',
        filesApi.suggestName(cleanName, 'aboutRole'),
        'markdown'
      );
      if (!file) return;
      filesApi.updateFileSource(
        file.id,
        createMarkdownFileSource('## NEW ROLE - No description set')
      );
      aboutRole = printStatement(makeFileStatement(file, fileInputDefaults(file)));
    }
    onAddRole({
      role: cleanName,
      doesRoleVote,
      roleMessage: '',
      aboutRole,
      isVisible: true,
      hiddenFromRulebook,
    });
    onOpenChange(false);
  };

  const resetDraft = () => {
    setRoleName('');
    setDoesRoleVote(true);
    setHiddenFromRulebook(false);
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setIsLeaveConfirmOpen(true);
      return;
    }
    resetDraft();
    onOpenChange(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && hasUnsavedChanges) {
      setIsLeaveConfirmOpen(true);
      return;
    }
    onOpenChange(open);
  };

  const handleConfirmLeave = () => {
    setIsLeaveConfirmOpen(false);
    resetDraft();
    onOpenChange(false);
  };

  useKeyboardShortcuts({
    onPrimaryAction: handleSubmit,
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
          <ConvexDialog.Content className="max-w-xl" isSwipeable={false}>
            <CloseButton onPress={handleCancel} />
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
                selectTextOnFocus
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

              {!displayModules && (
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
              )}
            </Column>

            <Column className="w-full items-center justify-center gap-4">
              <Row className="gap-4">
                {roleName.trim() ? (
                  <AppButton
                    className="h-10 w-32 sm:w-48"
                    variant="black"
                    onPress={handleSubmit}
                    onHoverIn={() => setHint(['enter'])}
                    onHoverOut={() => setHint(null)}>
                    <FontText color="white" weight="medium">
                      Add Role
                    </FontText>
                  </AppButton>
                ) : (
                  <StatusButton
                    className="h-10 w-32 sm:w-48"
                    buttonText="Add Role"
                    buttonAltText="Enter a name"
                  />
                )}
                <AppButton
                  className="h-10 w-32 sm:w-48"
                  variant="outline"
                  onPress={handleCancel}
                  onHoverIn={() => setHint(['esc'])}
                  onHoverOut={() => setHint(null)}>
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
        isOpen={isLeaveConfirmOpen}
        onOpenChange={setIsLeaveConfirmOpen}
        onSave={handleSubmit}
        onDiscard={handleConfirmLeave}
      />
    </>
  );
};

export default RoleAddDialog;
