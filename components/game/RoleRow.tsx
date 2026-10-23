import React, { useState, useEffect, useRef } from 'react';
import { Platform, Pressable, View } from 'react-native';
import FontText from '../ui/text/FontText';
import Column from '../layout/Column';
import Row from '../layout/Row';
import AppButton from '../ui/buttons/AppButton';
import RoleEditDialog from './RoleEditDialog';
import { useTableRowPreview } from './TableRowPreview';
import MarkdownEditorDialog from './MarkdownEditorDialog';
import CellFilesEditorDialog from './scriptFiles/CellFilesEditorDialog';
import { FileSourcePreview } from './scriptFiles/CellPreviewChips';
import { useScriptFiles } from '../../hooks/useScriptFiles';
import VoteEnableDialog from './VoteEnableDialog';
import DeleteConfirmationDialog from './DeleteRoleConfirmationDialog';
import { RoleTableItem } from 'types/roleTable';
import { SelectableOverlay } from './multiSelect/SelectableOverlay';
import { CellHighlight, isCellHighlightMatch, useCellHighlightRequest } from './CellHighlight';

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
  selectionMode?: boolean;
  /** Shared files API: hoisted to the table so rows don't each build an index. */
  filesApi: ReturnType<typeof useScriptFiles>;
  displayModules?: boolean;
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
  selectionMode = false,
  filesApi,
  displayModules = false,
}: RoleRowProps) => {
  const highlightReq = useCellHighlightRequest();
  const [isRoleInfoDialogOpen, setIsRoleInfoDialogOpen] = useState(false);
  const [isRoleMessageDialogOpen, setIsRoleMessageDialogOpen] = useState(false);
  const [isVoteEnableDialogOpen, setIsVoteEnableDialogOpen] = useState(false);
  const [isVoteMessageDialogOpen, setIsVoteMessageDialogOpen] = useState(false);
  const [isAboutRoleDialogOpen, setIsAboutRoleDialogOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  // Mount-on-first-open: six dialogs per role row, the trees only exist
  // after first use. `|| isOpen` covers indirect opens (e.g. VoteEnable's
  // "continue to editor" path).
  const [mountedDialogs, setMountedDialogs] = useState<Record<string, true>>({});
  const mountDialog = (key: string) =>
    setMountedDialogs((prev) => (prev[key] ? prev : { ...prev, [key]: true }));

  // Registers this row's element + preview target with the shared floating
  // preview pill (web only; it resolves hovered rows by pointer position).
  const rowPreview = useTableRowPreview();
  const rowRef = useRef<View>(null);
  useEffect(() => {
    if (Platform.OS !== 'web' || !rowPreview || selectionMode) return;
    return rowPreview.registerRow(rowRef.current as unknown as HTMLElement | null, {
      kind: 'role',
      roleName: role.role,
    });
  }, [rowPreview, selectionMode, role.role]);

  const body = (
    <View ref={rowRef} className="relative">
      <Row className={`h-12 w-min gap-0 ${isEditing ? 'z-50' : ''}`}>
        <Column
          className={`border-subtle-border h-full w-32 items-center justify-center gap-4 border ${isLast ? 'rounded-bl-sm' : ''}`}
          style={{ position: 'relative' }}>
          <Pressable
            onPress={() => {
              mountDialog('roleInfo');
              setIsRoleInfoDialogOpen(true);
            }}
            className="hover:bg-text/10 h-full w-full items-center justify-center">
            <FontText
              weight="medium"
              className="w-28 overflow-hidden text-nowrap text-center">
              {role.role || <FontText className="opacity-50">Role name</FontText>}
            </FontText>
          </Pressable>
          <SelectableOverlay cellId={`r-name-${index}`} cellType="roleName" />
        </Column>
        <Column
          className={`border-subtle-border h-full w-64 items-center justify-center gap-4 border`}
          style={{ position: 'relative' }}>
          <Pressable
            onPress={() => {
              mountDialog('roleMessage');
              setIsRoleMessageDialogOpen(true);
            }}
            className="hover:bg-text/10 h-full w-full items-center justify-center">
            <FileSourcePreview
              source={role.roleMessage ?? ''}
              index={filesApi.index}
              centered
              maxWidth={240}
              fallback={
                role.roleMessage ? (
                  <FontText
                    weight="medium"
                    className="w-60 overflow-hidden text-nowrap text-center">
                    {filesApi.previewText(role.roleMessage) || 'Role message...'}
                  </FontText>
                ) : (
                  <FontText
                    weight="medium"
                    className="w-60 overflow-hidden text-nowrap text-center opacity-50">
                    No role message...
                  </FontText>
                )
              }
            />
          </Pressable>
          <SelectableOverlay cellId={`r-msg-${index}`} cellType="roleMessage" />
          <CellHighlight
            active={isCellHighlightMatch(highlightReq, {
              cellKind: 'roleMessage',
              targetKey: role.role,
            })}
          />
        </Column>
        <Column
          className={`border-subtle-border h-full w-64 items-center justify-center gap-4 border`}
          style={{ position: 'relative' }}>
          <Pressable
            onPress={() => {
              mountDialog('voteEnable');
              setIsVoteEnableDialogOpen(true);
            }}
            className="hover:bg-text/10 h-full w-full items-center justify-center">
            {role.doesRoleVote === false ? (
              <FontText
                weight="medium"
                className="w-60 overflow-hidden text-nowrap text-center opacity-50">
                <FontText className="text-center">Cannot vote</FontText>
              </FontText>
            ) : (
              <FileSourcePreview
                source={role.voteMessage ?? ''}
                index={filesApi.index}
                centered
                maxWidth={240}
                fallback={
                  role.voteMessage ? (
                    <FontText
                      weight="medium"
                      className="w-60 overflow-hidden text-nowrap text-center">
                      {filesApi.previewText(role.voteMessage) || 'Vote message...'}
                    </FontText>
                  ) : (
                    <FontText
                      weight="medium"
                      className="w-60 overflow-hidden text-nowrap text-center opacity-50">
                      Using default
                    </FontText>
                  )
                }
              />
            )}
          </Pressable>
          <SelectableOverlay cellId={`r-vote-${index}`} cellType="voteMessage" />
          <CellHighlight
            active={isCellHighlightMatch(highlightReq, {
              cellKind: 'voteMessage',
              targetKey: role.role,
            })}
          />
        </Column>
        <Column
          className={`border-subtle-border h-full w-64 items-center justify-center gap-4 border ${isLast ? 'rounded-br-sm' : ''}`}
          style={{ position: 'relative' }}>
          <Pressable
            onPress={() => {
              mountDialog('aboutRole');
              setIsAboutRoleDialogOpen(true);
            }}
            className="hover:bg-text/10 h-full w-full items-center justify-center">
            {displayModules ? (
              <FileSourcePreview
                source={role.aboutRole ?? ''}
                index={filesApi.index}
                centered
                maxWidth={240}
                fallback={
                  role.aboutRole ? (
                    <FontText
                      weight="medium"
                      className="w-60 overflow-hidden text-nowrap text-center">
                      {filesApi.previewText(role.aboutRole) || 'About role...'}
                    </FontText>
                  ) : (
                    <FontText
                      weight="medium"
                      className="w-60 overflow-hidden text-nowrap text-center opacity-50">
                      About role...
                    </FontText>
                  )
                }
              />
            ) : (
              <FontText
                weight="medium"
                className={`w-60 overflow-hidden text-nowrap text-center ${role.aboutRole ? '' : 'opacity-50'}`}>
                {role.aboutRole
                  ? `${role.aboutRole.slice(0, 30)}${role.aboutRole.length > 30 ? '...' : ''}`
                  : 'About role...'}
              </FontText>
            )}
          </Pressable>
          <SelectableOverlay cellId={`r-about-${index}`} cellType="aboutRole" />
          <CellHighlight
            active={isCellHighlightMatch(highlightReq, {
              cellKind: 'aboutRole',
              targetKey: role.role,
            })}
          />
        </Column>
        {!selectionMode && (
          <Column className={`h-12 w-0 items-center justify-center gap-4`}>
            <AppButton
              variant="filled"
              className="max-h-8 w-8"
              onPress={() => {
                mountDialog('delete');
                setIsDeleteConfirmOpen(true);
              }}>
              <FontText weight="bold" color="white" className="mt-[-0.1rem] text-xl">
                -
              </FontText>
            </AppButton>
          </Column>
        )}
      </Row>

      {(mountedDialogs.roleInfo || isRoleInfoDialogOpen) && (
        <RoleEditDialog
          isOpen={isRoleInfoDialogOpen}
          onOpenChange={setIsRoleInfoDialogOpen}
          roleIndex={index}
          role={role}
          onSetRoleName={setRoleName}
          onSetDoesRoleVote={setDoesRoleVote}
          onSetHiddenFromRulebook={setHiddenFromRulebook}
          displayModules={displayModules}
        />
      )}

      {(mountedDialogs.roleMessage || isRoleMessageDialogOpen) && (
        <CellFilesEditorDialog
          isOpen={isRoleMessageDialogOpen}
          onOpenChange={setIsRoleMessageDialogOpen}
          title={`${role.role || 'Role'} Role Message`}
          cellText={role.roleMessage ?? ''}
          onSubmitText={(text) => setRoleMessage(index, text)}
          filesApi={filesApi}
          pinnedFolder="roleMessage"
          nameBase={role.role || 'Role'}
          gameId={gameId}
          hideInputs={false}
          legacyEditorProps={{
            roleName: role.role,
            showPreviewAsPlayerOption: true,
            historyKey: `roleMessage:${gameId}:${index}`,
          }}
        />
      )}
      {(mountedDialogs.voteEnable || isVoteEnableDialogOpen) && (
        <VoteEnableDialog
          isOpen={isVoteEnableDialogOpen}
          onOpenChange={setIsVoteEnableDialogOpen}
          roleName={role.role || ''}
          doesRoleVote={role.doesRoleVote !== false}
          onSetDoesRoleVote={(value) => setDoesRoleVote(index, value)}
          onContinueToEditor={() => setIsVoteMessageDialogOpen(true)}
          hasCustomMessage={!!role.voteMessage}
          onResetMessage={() => setVoteMessage(index, '')}
        />
      )}
      {(mountedDialogs.voteMessage || isVoteMessageDialogOpen) && (
        <CellFilesEditorDialog
          isOpen={isVoteMessageDialogOpen}
          onOpenChange={setIsVoteMessageDialogOpen}
          title={`${role.role || 'Role'} Vote Message`}
          dialogSubtext="Saving creates an override for this role. Save an empty message to inherit the default."
          cellText={role.voteMessage ?? defaultVoteMessage}
          onSubmitText={(text) => setVoteMessage(index, text)}
          filesApi={filesApi}
          pinnedFolder="voteMessage"
          nameBase={role.role || 'Role'}
          gameId={gameId}
          hideInputs={false}
          allowVoteInput
          legacyEditorProps={{
            roleName: role.role,
            showPreviewAsPlayerOption: true,
            historyKey: `voteMessage:${gameId}:${index}`,
          }}
        />
      )}
      {(mountedDialogs.aboutRole || isAboutRoleDialogOpen) &&
        (displayModules ? (
          <CellFilesEditorDialog
            isOpen={isAboutRoleDialogOpen}
            onOpenChange={setIsAboutRoleDialogOpen}
            title={`About ${role.role || 'Role'}`}
            cellText={role.aboutRole ?? ''}
            onSubmitText={(text) => setAboutRole(index, text)}
            filesApi={filesApi}
            pinnedFolder="aboutRole"
            nameBase={role.role || 'Role'}
            gameId={gameId}
            hideInputs={false}
            forceFiles
            historyKey={`aboutRole:${gameId}:${index}`}
          />
        ) : (
          <MarkdownEditorDialog
            isOpen={isAboutRoleDialogOpen}
            onOpenChange={setIsAboutRoleDialogOpen}
            title={`About ${role.role || 'Role'}`}
            initialMarkdown={role.aboutRole}
            onSubmit={({ markdown }) => setAboutRole(index, markdown)}
            gameId={gameId}
            showScript
            centered={true}
            historyKey={`aboutRole:${gameId}:${index}`}
          />
        ))}

      {(mountedDialogs.delete || isDeleteConfirmOpen) && (
        <DeleteConfirmationDialog
          isOpen={isDeleteConfirmOpen}
          onOpenChange={setIsDeleteConfirmOpen}
          onConfirm={() => onDeleteRole(index)}
          itemType="Role"
          itemName={role.role || 'this role'}
          additionalMessage={
            displayModules
              ? "The role's About file stays in the aboutRole folder - remove or hide it in the rule book composition separately."
              : undefined
          }
        />
      )}
    </View>
  );
  return body;
};

export default RoleRow;
