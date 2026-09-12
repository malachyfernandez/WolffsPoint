import React, { useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import FontText from '../ui/text/FontText';
import { useList } from 'hooks/useData';
import Column from '../layout/Column';
import Row from '../layout/Row';
import RoleRow from './RoleRow';
import MarkdownEditorDialog from './MarkdownEditorDialog';
import RoleEditDialog from './RoleEditDialog';
import { createUndoSnapshot, useUndoRedo } from 'hooks/useUndoRedo';
import { DEFAULT_VOTE_MESSAGE, RoleTableItem } from 'types/roleTable';
import { useMultiSelect } from './multiSelect/MultiSelectContext';
import { SelectableColumnOverlay } from './multiSelect/SelectableOverlay';

interface RoleTableProps {
  gameId: string;
  doSync: boolean;
  setDoSync: (value: boolean) => void;
  isBeingEdited: boolean;
  setIsBeingEdited: (value: boolean) => void;
  className?: string;
  showInputs?: boolean;
}

const RoleTable = ({
  gameId,
  doSync,
  setDoSync,
  isBeingEdited,
  setIsBeingEdited,
  className,
  showInputs = false,
}: RoleTableProps) => {
  const { executeCommand } = useUndoRedo();
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [isDefaultVoteMessageOpen, setIsDefaultVoteMessageOpen] = useState(false);
  const { selectionMode, selectedCells, cellType, exitSelectionMode, registerEditHandler } =
    useMultiSelect();

  // Bulk editor state
  const [isBulkRoleEditOpen, setIsBulkRoleEditOpen] = useState(false);
  const [bulkRoleName, setBulkRoleName] = useState('');
  const [isBulkRoleMessageOpen, setIsBulkRoleMessageOpen] = useState(false);
  const [bulkRoleMessage, setBulkRoleMessage] = useState('');
  const [isBulkVoteMessageOpen, setIsBulkVoteMessageOpen] = useState(false);
  const [bulkVoteMessage, setBulkVoteMessage] = useState('');
  const [isBulkAboutRoleOpen, setIsBulkAboutRoleOpen] = useState(false);
  const [bulkAboutRole, setBulkAboutRole] = useState('');

  const handleRowEditStart = (rowIndex: number) => {
    setEditingRow(rowIndex);
    setIsBeingEdited(true);
  };

  const handleRowEditEnd = () => {
    setEditingRow(null);
    setIsBeingEdited(false);
  };

  const [roleTable, setRoleTable] = useList<RoleTableItem[]>('roleTable', gameId, {
    privacy: 'PUBLIC',
  });
  const [defaultVoteMessage, setDefaultVoteMessage] = useList<string>(
    'voteMessageDefault',
    gameId,
    {
      privacy: 'PUBLIC',
      defaultValue: DEFAULT_VOTE_MESSAGE,
    }
  );

  const roles = roleTable?.value ?? [];
  const visibleRoles = roles.filter((role) => role.isVisible !== false);

  useEffect(() => {
    if (!doSync) return;
    setDoSync(false);
  }, [doSync]);

  const UNDOABLEsetRoleName = (roleIndex: number, newRoleName: string) => {
    const previousRoleTable = createUndoSnapshot(roleTable?.value ?? []);
    if (roleIndex < 0 || roleIndex >= previousRoleTable.length) return;

    const nextRoleTable = createUndoSnapshot(previousRoleTable);
    nextRoleTable[roleIndex] = {
      ...nextRoleTable[roleIndex],
      role: newRoleName,
    };

    executeCommand({
      action: () => setRoleTable(createUndoSnapshot(nextRoleTable)),
      undoAction: () => setRoleTable(createUndoSnapshot(previousRoleTable)),
      description: 'Set Role Name',
    });
  };

  const UNDOABLEsetDoesRoleVote = (roleIndex: number, newDoesRoleVote: boolean) => {
    const previousRoleTable = createUndoSnapshot(roleTable?.value ?? []);
    if (roleIndex < 0 || roleIndex >= previousRoleTable.length) return;

    const nextRoleTable = createUndoSnapshot(previousRoleTable);
    nextRoleTable[roleIndex] = {
      ...nextRoleTable[roleIndex],
      doesRoleVote: newDoesRoleVote,
    };

    executeCommand({
      action: () => setRoleTable(createUndoSnapshot(nextRoleTable)),
      undoAction: () => setRoleTable(createUndoSnapshot(previousRoleTable)),
      description: 'Set Role Vote',
    });
  };

  const UNDOABLEsetHiddenFromRulebook = (roleIndex: number, value: boolean) => {
    const previousRoleTable = createUndoSnapshot(roleTable?.value ?? []);
    if (roleIndex < 0 || roleIndex >= previousRoleTable.length) return;

    const nextRoleTable = createUndoSnapshot(previousRoleTable);
    nextRoleTable[roleIndex] = {
      ...nextRoleTable[roleIndex],
      hiddenFromRulebook: value,
    };

    executeCommand({
      action: () => setRoleTable(createUndoSnapshot(nextRoleTable)),
      undoAction: () => setRoleTable(createUndoSnapshot(previousRoleTable)),
      description: 'Set Role Rulebook Visibility',
    });
  };

  const UNDOABLEsetRoleMessage = (roleIndex: number, newRoleMessage: string) => {
    const previousRoleTable = createUndoSnapshot(roleTable?.value ?? []);
    if (roleIndex < 0 || roleIndex >= previousRoleTable.length) return;

    const nextRoleTable = createUndoSnapshot(previousRoleTable);
    nextRoleTable[roleIndex] = {
      ...nextRoleTable[roleIndex],
      roleMessage: newRoleMessage,
    };

    executeCommand({
      action: () => setRoleTable(createUndoSnapshot(nextRoleTable)),
      undoAction: () => setRoleTable(createUndoSnapshot(previousRoleTable)),
      description: 'Set Role Message',
    });
  };

  const UNDOABLEsetVoteMessage = (roleIndex: number, newVoteMessage: string) => {
    const previousRoleTable = createUndoSnapshot(roleTable?.value ?? []);
    if (roleIndex < 0 || roleIndex >= previousRoleTable.length) return;

    const nextRoleTable = createUndoSnapshot(previousRoleTable);
    nextRoleTable[roleIndex] = {
      ...nextRoleTable[roleIndex],
      voteMessage: newVoteMessage.trim() ? newVoteMessage : undefined,
    };

    executeCommand({
      action: () => setRoleTable(createUndoSnapshot(nextRoleTable)),
      undoAction: () => setRoleTable(createUndoSnapshot(previousRoleTable)),
      description: 'Set Vote Message',
    });
  };

  const UNDOABLEsetAboutRole = (roleIndex: number, newAboutRole: string) => {
    const previousRoleTable = createUndoSnapshot(roleTable?.value ?? []);
    if (roleIndex < 0 || roleIndex >= previousRoleTable.length) return;

    const nextRoleTable = createUndoSnapshot(previousRoleTable);
    nextRoleTable[roleIndex] = {
      ...nextRoleTable[roleIndex],
      aboutRole: newAboutRole,
    };

    executeCommand({
      action: () => setRoleTable(createUndoSnapshot(nextRoleTable)),
      undoAction: () => setRoleTable(createUndoSnapshot(previousRoleTable)),
      description: 'Set About Role',
    });
  };

  const UNDOABLEdeleteRole = (roleIndex: number) => {
    const previousRoleTable = createUndoSnapshot(roleTable?.value ?? []);
    if (roleIndex < 0 || roleIndex >= previousRoleTable.length) return;

    const nextRoleTable = createUndoSnapshot(previousRoleTable);
    nextRoleTable[roleIndex] = {
      ...nextRoleTable[roleIndex],
      isVisible: false,
    };

    executeCommand({
      action: () => setRoleTable(createUndoSnapshot(nextRoleTable)),
      undoAction: () => setRoleTable(createUndoSnapshot(previousRoleTable)),
      description: 'Delete Role',
    });
  };

  // Compute column cell IDs for column selection (using actual indices)
  const roleNameColumnIds = visibleRoles.map((role) => `r-name-${roles.indexOf(role)}`);
  const roleMsgColumnIds = visibleRoles.map((role) => `r-msg-${roles.indexOf(role)}`);
  const voteMsgColumnIds = visibleRoles.map((role) => `r-vote-${roles.indexOf(role)}`);
  const aboutRoleColumnIds = visibleRoles.map((role) => `r-about-${roles.indexOf(role)}`);

  const handleBulkEdit = () => {
    // Only handle role-table cell types
    if (
      cellType !== 'roleName' &&
      cellType !== 'roleMessage' &&
      cellType !== 'voteMessage' &&
      cellType !== 'aboutRole'
    )
      return;

    const firstId = Array.from(selectedCells)[0];
    if (!firstId) return;

    const parts = firstId.split('-');
    const roleIndex = parseInt(parts[2], 10);
    if (roleIndex < 0 || roleIndex >= roles.length) return;
    const role = roles[roleIndex];

    if (cellType === 'roleName') {
      setBulkRoleName(role.role || '');
      setIsBulkRoleEditOpen(true);
    } else if (cellType === 'roleMessage') {
      setBulkRoleMessage(role.roleMessage ?? '');
      setIsBulkRoleMessageOpen(true);
    } else if (cellType === 'voteMessage') {
      setBulkVoteMessage(role.voteMessage ?? defaultVoteMessage?.value ?? DEFAULT_VOTE_MESSAGE);
      setIsBulkVoteMessageOpen(true);
    } else if (cellType === 'aboutRole') {
      setBulkAboutRole(role.aboutRole ?? '');
      setIsBulkAboutRoleOpen(true);
    }
  };

  // Register this table's bulk-edit handler with the shared context
  useEffect(() => {
    return registerEditHandler(handleBulkEdit);
  }, [registerEditHandler, handleBulkEdit]);

  const handleBulkRoleNameUpdate = (name: string) => {
    const previousRoleTable = createUndoSnapshot(roleTable?.value ?? []);
    const nextRoleTable = createUndoSnapshot(previousRoleTable);
    for (const cellId of selectedCells) {
      const parts = cellId.split('-');
      if (parts[0] !== 'r' || parts[1] !== 'name') continue;
      const roleIndex = parseInt(parts[2], 10);
      if (roleIndex < 0 || roleIndex >= nextRoleTable.length) continue;
      nextRoleTable[roleIndex] = { ...nextRoleTable[roleIndex], role: name };
    }
    executeCommand({
      action: () => setRoleTable(createUndoSnapshot(nextRoleTable)),
      undoAction: () => setRoleTable(createUndoSnapshot(previousRoleTable)),
      description: 'Bulk Update Role Names',
    });
    setIsBulkRoleEditOpen(false);
    exitSelectionMode();
  };

  const handleBulkRoleMessageUpdate = ({ markdown }: { markdown: string }) => {
    const previousRoleTable = createUndoSnapshot(roleTable?.value ?? []);
    const nextRoleTable = createUndoSnapshot(previousRoleTable);
    for (const cellId of selectedCells) {
      const parts = cellId.split('-');
      if (parts[0] !== 'r' || parts[1] !== 'msg') continue;
      const roleIndex = parseInt(parts[2], 10);
      if (roleIndex < 0 || roleIndex >= nextRoleTable.length) continue;
      nextRoleTable[roleIndex] = { ...nextRoleTable[roleIndex], roleMessage: markdown };
    }
    executeCommand({
      action: () => setRoleTable(createUndoSnapshot(nextRoleTable)),
      undoAction: () => setRoleTable(createUndoSnapshot(previousRoleTable)),
      description: 'Bulk Update Role Messages',
    });
    setIsBulkRoleMessageOpen(false);
    exitSelectionMode();
  };

  const handleBulkVoteMessageUpdate = ({ markdown }: { markdown: string }) => {
    const previousRoleTable = createUndoSnapshot(roleTable?.value ?? []);
    const nextRoleTable = createUndoSnapshot(previousRoleTable);
    for (const cellId of selectedCells) {
      const parts = cellId.split('-');
      if (parts[0] !== 'r' || parts[1] !== 'vote') continue;
      const roleIndex = parseInt(parts[2], 10);
      if (roleIndex < 0 || roleIndex >= nextRoleTable.length) continue;
      nextRoleTable[roleIndex] = {
        ...nextRoleTable[roleIndex],
        voteMessage: markdown.trim() ? markdown : undefined,
      };
    }
    executeCommand({
      action: () => setRoleTable(createUndoSnapshot(nextRoleTable)),
      undoAction: () => setRoleTable(createUndoSnapshot(previousRoleTable)),
      description: 'Bulk Update Vote Messages',
    });
    setIsBulkVoteMessageOpen(false);
    exitSelectionMode();
  };

  const handleBulkAboutRoleUpdate = ({ markdown }: { markdown: string }) => {
    const previousRoleTable = createUndoSnapshot(roleTable?.value ?? []);
    const nextRoleTable = createUndoSnapshot(previousRoleTable);
    for (const cellId of selectedCells) {
      const parts = cellId.split('-');
      if (parts[0] !== 'r' || parts[1] !== 'about') continue;
      const roleIndex = parseInt(parts[2], 10);
      if (roleIndex < 0 || roleIndex >= nextRoleTable.length) continue;
      nextRoleTable[roleIndex] = { ...nextRoleTable[roleIndex], aboutRole: markdown };
    }
    executeCommand({
      action: () => setRoleTable(createUndoSnapshot(nextRoleTable)),
      undoAction: () => setRoleTable(createUndoSnapshot(previousRoleTable)),
      description: 'Bulk Update About Role',
    });
    setIsBulkAboutRoleOpen(false);
    exitSelectionMode();
  };

  return (
    <>
      <Column className="gap-0">
        <Row className="gap-0">
          <Column className={`border-border w-min gap-0 rounded border-2 ${className || ''}`}>
            {/* Title Row */}
            <Row className={`bg-background border-border h-12 w-min gap-0 rounded-t-lg border-b-2`}>
              <Column className="h-full w-32 items-center justify-center gap-4" style={{ position: 'relative' }}>
                <FontText weight="medium" className="text-center">
                  Role
                </FontText>
                <SelectableColumnOverlay columnCellIds={roleNameColumnIds} cellType="roleName" />
              </Column>
              <Column className="h-full w-64 items-center justify-center gap-4" style={{ position: 'relative' }}>
                <FontText weight="medium" className="text-center">
                  Role Message
                </FontText>
                <SelectableColumnOverlay columnCellIds={roleMsgColumnIds} cellType="roleMessage" />
              </Column>
              <Column className="h-full w-64 items-center justify-center gap-4" style={{ position: 'relative' }}>
                {!selectionMode && (
                  <Pressable
                    onPress={() => setIsDefaultVoteMessageOpen(true)}
                    className="h-full w-full items-center justify-center">
                    <FontText
                      weight="medium"
                      className="text-center"
                      style={{ textDecorationLine: 'underline', textDecorationStyle: 'dotted' }}>
                      Vote Message
                    </FontText>
                  </Pressable>
                )}
                {selectionMode && (
                  <FontText weight="medium" className="text-center">
                    Vote Message
                  </FontText>
                )}
                <SelectableColumnOverlay columnCellIds={voteMsgColumnIds} cellType="voteMessage" />
              </Column>
              <Column className="h-full w-64 items-center justify-center gap-4" style={{ position: 'relative' }}>
                <FontText weight="medium" className="text-center">
                  About Role
                </FontText>
                <SelectableColumnOverlay columnCellIds={aboutRoleColumnIds} cellType="aboutRole" />
              </Column>
            </Row>

            {visibleRoles.map((role, index) => {
              // Find the actual index in the full roles array
              const actualIndex = roles.findIndex((r) => r === role);
              return (
                <RoleRow
                  key={actualIndex}
                  gameId={gameId}
                  role={role}
                  index={actualIndex}
                  isLast={index === visibleRoles.length - 1}
                  setRoleName={UNDOABLEsetRoleName}
                  setDoesRoleVote={UNDOABLEsetDoesRoleVote}
                  setHiddenFromRulebook={UNDOABLEsetHiddenFromRulebook}
                  setRoleMessage={UNDOABLEsetRoleMessage}
                  setVoteMessage={UNDOABLEsetVoteMessage}
                  defaultVoteMessage={defaultVoteMessage?.value ?? DEFAULT_VOTE_MESSAGE}
                  setAboutRole={UNDOABLEsetAboutRole}
                  onDeleteRole={UNDOABLEdeleteRole}
                  onEditStart={() => handleRowEditStart(actualIndex)}
                  onEditEnd={handleRowEditEnd}
                  isEditing={editingRow === actualIndex}
                  showInputs={showInputs}
                  selectionMode={selectionMode}
                />
              );
            })}
          </Column>
        </Row>
      </Column>
      <MarkdownEditorDialog
        isOpen={isDefaultVoteMessageOpen}
        onOpenChange={setIsDefaultVoteMessageOpen}
        title="Default Vote Message"
        initialMarkdown={defaultVoteMessage?.value ?? DEFAULT_VOTE_MESSAGE}
        onSubmit={({ markdown }) => setDefaultVoteMessage(markdown)}
        gameId={gameId}
        showInputs={showInputs}
        showScript
        hideInputs={false}
        allowVoteInput
        historyKey={`defaultVoteMessage:${gameId}`}
      />

      {/* Bulk editor dialogs */}
      <RoleEditDialog
        isOpen={isBulkRoleEditOpen}
        onOpenChange={setIsBulkRoleEditOpen}
        roleIndex={-1}
        role={{ role: bulkRoleName, doesRoleVote: true, hiddenFromRulebook: false } as RoleTableItem}
        onSetRoleName={(_, name) => handleBulkRoleNameUpdate(name)}
        onSetDoesRoleVote={() => {}}
        onSetHiddenFromRulebook={() => {}}
        submitLabel="Update All"
      />
      <MarkdownEditorDialog
        isOpen={isBulkRoleMessageOpen}
        onOpenChange={setIsBulkRoleMessageOpen}
        title="Bulk Update Role Messages"
        initialMarkdown={bulkRoleMessage}
        onSubmit={handleBulkRoleMessageUpdate}
        gameId={gameId}
        showInputs={showInputs}
        showScript
        hideInputs={false}
        submitLabel="Update All"
      />
      <MarkdownEditorDialog
        isOpen={isBulkVoteMessageOpen}
        onOpenChange={setIsBulkVoteMessageOpen}
        title="Bulk Update Vote Messages"
        initialMarkdown={bulkVoteMessage}
        onSubmit={handleBulkVoteMessageUpdate}
        gameId={gameId}
        showInputs={showInputs}
        showScript
        hideInputs={false}
        allowVoteInput
        submitLabel="Update All"
      />
      <MarkdownEditorDialog
        isOpen={isBulkAboutRoleOpen}
        onOpenChange={setIsBulkAboutRoleOpen}
        title="Bulk Update About Role"
        initialMarkdown={bulkAboutRole}
        onSubmit={handleBulkAboutRoleUpdate}
        gameId={gameId}
        showScript
        centered={true}
        submitLabel="Update All"
      />
    </>
  );
};

export default RoleTable;
