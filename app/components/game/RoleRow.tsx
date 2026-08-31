import React, { useState } from 'react';
import { Pressable } from 'react-native';
import FontText from '../ui/text/FontText';
import Column from '../layout/Column';
import Row from '../layout/Row';
import AppButton from '../ui/buttons/AppButton';
import RoleEditDialog from './RoleEditDialog';
import MarkdownEditorDialog from './MarkdownEditorDialog';
import VoteEnableDialog from './VoteEnableDialog';
import DeleteConfirmationDialog from './DeleteRoleConfirmationDialog';
import { RoleTableItem } from 'types/roleTable';

interface RoleRowProps {
  gameId: string;
  role: RoleTableItem;
  index: number;
  isLast: boolean;
  setRoleName: (roleIndex: number, newRoleName: string) => void;
  setDoesRoleVote: (roleIndex: number, newDoesRoleVote: boolean) => void;
  setHiddenFromRulebook: (roleIndex: number, value: boolean) => void;
  setRoleMessage: (roleIndex: number, newRoleMessage: string) => void;
  setVoteMessage: (roleIndex: number, newVoteMessage: string) => void;
  defaultVoteMessage: string;
  setAboutRole: (roleIndex: number, newAboutRole: string) => void;
  onDeleteRole: (roleIndex: number) => void;
  onEditStart?: () => void;
  onEditEnd?: () => void;
  isEditing?: boolean;
  showInputs?: boolean;
}

const RoleRow = ({
  gameId,
  role,
  index,
  isLast,
  setRoleName,
  setDoesRoleVote,
  setHiddenFromRulebook,
  setRoleMessage,
  setVoteMessage,
  defaultVoteMessage,
  setAboutRole,
  onDeleteRole,
  onEditStart,
  onEditEnd,
  isEditing,
  showInputs = false,
}: RoleRowProps) => {
  const [isRoleInfoDialogOpen, setIsRoleInfoDialogOpen] = useState(false);
  const [isRoleMessageDialogOpen, setIsRoleMessageDialogOpen] = useState(false);
  const [isVoteEnableDialogOpen, setIsVoteEnableDialogOpen] = useState(false);
  const [isVoteMessageDialogOpen, setIsVoteMessageDialogOpen] = useState(false);
  const [isAboutRoleDialogOpen, setIsAboutRoleDialogOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  return (
    <>
      <Row className={`h-12 w-min gap-0 ${isEditing ? 'z-50' : ''}`}>
        <Column
          className={`border-subtle-border h-full w-32 items-center justify-center gap-4 border ${isLast ? 'rounded-bl-lg' : ''}`}>
          <Pressable
            onPress={() => setIsRoleInfoDialogOpen(true)}
            className="h-full w-full items-center justify-center">
            <FontText
              weight="medium"
              className="w-28 overflow-hidden text-nowrap text-center"
              style={{
                textDecorationLine: 'underline',
                textDecorationStyle: 'dotted',
              }}>
              {role.role || <FontText className="opacity-50">Role name</FontText>}
            </FontText>
          </Pressable>
        </Column>
        <Column
          className={`border-subtle-border h-full w-64 items-center justify-center gap-4 border`}>
          <Pressable
            onPress={() => setIsRoleMessageDialogOpen(true)}
            className="h-full w-60 items-center justify-center">
            <FontText
              weight="medium"
              className="w-60 overflow-hidden text-nowrap text-center"
              style={{
                textDecorationLine: 'underline',
                textDecorationStyle: 'dotted',
              }}>
              {role.roleMessage ? (
                <FontText className="text-center">
                  {role.roleMessage.slice(0, 30)}
                  {role.roleMessage.length > 30 ? '...' : ''}
                </FontText>
              ) : (
                <FontText className="opacity-50">Role message...</FontText>
              )}
            </FontText>
          </Pressable>
        </Column>
        <Column className="border-subtle-border h-full w-64 items-center justify-center gap-4 border">
          <Pressable
            onPress={() => setIsVoteEnableDialogOpen(true)}
            className="h-full w-60 items-center justify-center">
            <FontText
              weight="medium"
              className="w-60 overflow-hidden text-nowrap text-center"
              style={{ textDecorationLine: 'underline', textDecorationStyle: 'dotted' }}>
              {role.doesRoleVote === false ? (
                <FontText className="text-center opacity-50">Cannot vote</FontText>
              ) : role.voteMessage ? (
                <FontText className="text-center">
                  {role.voteMessage.slice(0, 30)}
                  {role.voteMessage.length > 30 ? '...' : ''}
                </FontText>
              ) : (
                <FontText className="text-center opacity-50">Using default</FontText>
              )}
            </FontText>
          </Pressable>
        </Column>
        <Column
          className={`border-subtle-border h-full w-64 items-center justify-center gap-4 border ${isLast ? 'rounded-br-lg' : ''}`}>
          <Pressable
            onPress={() => setIsAboutRoleDialogOpen(true)}
            className="h-full w-full items-center justify-center">
            <FontText
              weight="medium"
              className="w-60 overflow-hidden text-nowrap text-center"
              style={{
                textDecorationLine: 'underline',
                textDecorationStyle: 'dotted',
              }}>
              {role.aboutRole ? (
                <FontText className="text-center">
                  {role.aboutRole.slice(0, 30)}
                  {role.aboutRole.length > 30 ? '...' : ''}
                </FontText>
              ) : (
                <FontText className="opacity-50">About role...</FontText>
              )}
            </FontText>
          </Pressable>
        </Column>
        <Column className={`h-12 w-0 items-center justify-center gap-4`}>
          <AppButton
            variant="filled"
            className="max-h-8 w-8"
            onPress={() => setIsDeleteConfirmOpen(true)}>
            <FontText weight="bold" color="white" className="mt-[-0.1rem] text-xl">
              -
            </FontText>
          </AppButton>
        </Column>
      </Row>

      <RoleEditDialog
        isOpen={isRoleInfoDialogOpen}
        onOpenChange={setIsRoleInfoDialogOpen}
        roleIndex={index}
        role={role}
        onSetRoleName={setRoleName}
        onSetDoesRoleVote={setDoesRoleVote}
        onSetHiddenFromRulebook={setHiddenFromRulebook}
      />

      <MarkdownEditorDialog
        isOpen={isRoleMessageDialogOpen}
        onOpenChange={setIsRoleMessageDialogOpen}
        title={`${role.role || 'Role'} Role Message`}
        submitLabel="Save Message"
        initialMarkdown={role.roleMessage}
        onSubmit={({ markdown }) => setRoleMessage(index, markdown)}
        gameId={gameId}
        showInputs={showInputs}
        showScript
        hideInputs={false}
        roleName={role.role}
        showPreviewAsPlayerOption
      />
      <VoteEnableDialog
        isOpen={isVoteEnableDialogOpen}
        onOpenChange={setIsVoteEnableDialogOpen}
        roleName={role.role || ''}
        doesRoleVote={role.doesRoleVote !== false}
        onSetDoesRoleVote={(value) => setDoesRoleVote(index, value)}
        onContinueToEditor={() => setIsVoteMessageDialogOpen(true)}
      />
      <MarkdownEditorDialog
        isOpen={isVoteMessageDialogOpen}
        onOpenChange={setIsVoteMessageDialogOpen}
        title={`${role.role || 'Role'} Vote Message`}
        submitLabel="Save Override"
        initialMarkdown={role.voteMessage ?? defaultVoteMessage}
        onSubmit={({ markdown }) => setVoteMessage(index, markdown)}
        dialogSubtext="Saving creates an override for this role. Save an empty message to inherit the default."
        gameId={gameId}
        showInputs={showInputs}
        showScript
        hideInputs={false}
        allowVoteInput
        roleName={role.role}
        showPreviewAsPlayerOption
      />
      <MarkdownEditorDialog
        isOpen={isAboutRoleDialogOpen}
        onOpenChange={setIsAboutRoleDialogOpen}
        title={`About ${role.role || 'Role'}`}
        submitLabel="Save About"
        initialMarkdown={role.aboutRole}
        onSubmit={({ markdown }) => setAboutRole(index, markdown)}
        gameId={gameId}
        showScript
        centered={true}
      />

      <DeleteConfirmationDialog
        isOpen={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        onConfirm={() => onDeleteRole(index)}
        itemType="Role"
        itemName={role.role || 'this role'}
      />
    </>
  );
};

export default RoleRow;
