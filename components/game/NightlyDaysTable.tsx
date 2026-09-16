import React, { useEffect, useState, useCallback } from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
import FontText from '../ui/text/FontText';
import { useList, useValue } from 'hooks/useData';
import Column from '../layout/Column';
import Row from '../layout/Row';
import NightlyDayUserRow from './NightlyDayUserRow';
import NightlyDayTitleRow from './NightlyDayTitleRow';
import { createUndoSnapshot, useUndoRedo } from 'hooks/useUndoRedo';
import { UserTableItem, UserTableTitle, UserTableColumnNightlyVisibility } from 'types/playerTable';
import {
  ColumnSizeOption,
  NightlyPageColumnSizes,
  defaultNightlyPageColumnSizes,
  getNightlyPageColumnSizesKey,
  getWidthForColumnSize,
} from './nightlyTableColumnSizing';
import {
  PlayerPageColumnSizes,
  defaultPlayerPageColumnSizes,
  getPlayerPageColumnSizesKey,
} from './playerTableColumnSizing';
import { VoteValue } from 'types/multiplayer';
import { getPlayerActionSummary } from 'utils/multiplayer';
import ActionEditorDialog from './ActionEditorDialog';
import VoteEditorDialog from './VoteEditorDialog';
import MarkdownEditorDialog from './MarkdownEditorDialog';
import TagCellEditor from './TagCellEditor';
import { useMultiSelect } from './multiSelect/MultiSelectContext';

interface NightlyDaysTableProps {
  gameId: string;
  dayNumber: number;
  isBeingEdited: boolean;
  setIsBeingEdited: (value: boolean) => void;
  className?: string;
  onLayout?: (event: any) => void;
  onWidthChange?: (width: number) => void;
  morningMessagesList: Record<string, string[]>;
  updateMorningMessage: (dayIndex: number, userIndex: number, value: string) => void;
  /** Bulk-update morning messages in one shot (avoids stale-state overwrite). */
  bulkUpdateMorningMessages: (dayIndex: number, userIndices: number[], value: string) => void;
  onColumnsReady?: (ready: boolean) => void;
}

const NightlyDaysTable = ({
  gameId,
  dayNumber,
  isBeingEdited,
  setIsBeingEdited,
  className,
  onLayout,
  onWidthChange,
  morningMessagesList,
  updateMorningMessage,
  bulkUpdateMorningMessages,
  onColumnsReady,
}: NightlyDaysTableProps) => {
  const { executeCommand } = useUndoRedo();
  const [editingRow, setEditingRow] = useState<'title' | number | null>(null);
  const tableRef = React.useRef<any>(null);
  const { selectionMode, selectedCells, cellType, exitSelectionMode, registerEditHandler } =
    useMultiSelect();

  // Bulk editor state
  const [isBulkVoteEditorOpen, setIsBulkVoteEditorOpen] = useState(false);
  const [bulkVoteInitial, setBulkVoteInitial] = useState<VoteValue>('');
  const [bulkVoteMultiplier, setBulkVoteMultiplier] = useState(1);
  const [isBulkActionEditorOpen, setIsBulkActionEditorOpen] = useState(false);
  const [bulkActionInitial, setBulkActionInitial] = useState('');
  const [isBulkMorningMessageOpen, setIsBulkMorningMessageOpen] = useState(false);
  const [bulkMorningMessage, setBulkMorningMessage] = useState('');
  const [isBulkTagEditorOpen, setIsBulkTagEditorOpen] = useState(false);
  const [bulkTagInitial, setBulkTagInitial] = useState('');

  const handleRowEditStart = (rowType: 'title' | number) => {
    setEditingRow(rowType);
    setIsBeingEdited(true);
  };

  const handleRowEditEnd = () => {
    setEditingRow(null);
    setIsBeingEdited(false);
  };

  const measureTableWidth = useCallback(() => {
    if (tableRef.current && onWidthChange) {
      // Use setTimeout to ensure layout is updated after state changes
      const timeoutId = setTimeout(() => {
        if (tableRef.current) {
          tableRef.current.measure((x: number, y: number, width: number, height: number) => {
            onWidthChange(width);
          });
        }
      }, 0);

      // Cleanup timeout if component unmounts
      return () => clearTimeout(timeoutId);
    }
  }, [onWidthChange]);

  // Subscribe to nightly page column sizes
  const [columnSizes, setColumnSizes] = useValue<NightlyPageColumnSizes>(
    getNightlyPageColumnSizesKey(gameId),
    { defaultValue: defaultNightlyPageColumnSizes, privacy: 'PUBLIC' }
  );

  // Subscribe to table titles and nightly visibility for extra day columns
  const [userTableTitle] = useList<UserTableTitle>('userTableTitle', gameId, { privacy: 'PUBLIC' });
  const [nightlyVisibility] = useList<UserTableColumnNightlyVisibility>(
    'userTableColumnNightlyVisibility',
    gameId,
    { privacy: 'PUBLIC' }
  );
  const [playerPageColumnSizes] = useValue<PlayerPageColumnSizes>(
    getPlayerPageColumnSizesKey(gameId),
    { defaultValue: defaultPlayerPageColumnSizes, privacy: 'PUBLIC' }
  );

  const titles = userTableTitle.scheduledUpdate?.value ??
    userTableTitle.value ?? { extraUserColumns: [], extraDayColumns: [] };
  const nightlyVis = nightlyVisibility.scheduledUpdate?.value ??
    nightlyVisibility.value ?? { extraUserColumns: [], extraDayColumns: [] };

  // Compute which extra day columns are visible in nightly
  const nightlyExtraDayColumns = titles.extraDayColumns
    .map((title, index) => ({ title, index, visible: nightlyVis.extraDayColumns[index] ?? false }))
    .filter((col) => col.visible);

  const extraDayColumnWidths = nightlyExtraDayColumns.map((col) =>
    getWidthForColumnSize(112, playerPageColumnSizes.value?.dayExtraColumns?.[col.index] ?? 'small')
  );

  // Track when column data is ready (only check isSyncing, not value presence)
  const areColumnsReady = !columnSizes?.state?.isSyncing;

  useEffect(() => {
    onColumnsReady?.(areColumnsReady);
  }, [areColumnsReady, onColumnsReady]);

  // Calculate column widths based on sizes
  const columnWidths = {
    vote: getWidthForColumnSize(112, columnSizes.value.vote),
    action: getWidthForColumnSize(112, columnSizes.value.action),
    morningMessage: getWidthForColumnSize(112, columnSizes.value.morningMessage),
  };

  // Wait for column widths to be ready before rendering to prevent flicker
  const areColumnWidthsReady =
    columnWidths.vote > 0 && columnWidths.action > 0 && columnWidths.morningMessage > 0;

  // Handle column size changes
  const setColumnSize = (
    columnKey: 'vote' | 'action' | 'morningMessage',
    size: ColumnSizeOption
  ) => {
    const currentSizes = columnSizes.value ?? defaultNightlyPageColumnSizes;
    setColumnSizes({
      ...currentSizes,
      [columnKey]: size,
    });
  };

  // Measure width when column sizes change
  useEffect(() => {
    const cleanup = measureTableWidth();
    return cleanup;
  }, [
    measureTableWidth,
    columnSizes.value.vote,
    columnSizes.value.action,
    columnSizes.value.morningMessage,
  ]);

  const [userTable, setUserTable] = useList<UserTableItem[]>('userTable', gameId, {
    privacy: 'PUBLIC',
  });

  const userTableValue = userTable.scheduledUpdate?.value ?? userTable.value;
  const users = userTableValue ?? [];

  const setVoteValue = (userIndex: number, newVoteValue: VoteValue, voteMultiplier: number) => {
    const updatedUsers = [...users];
    if (userIndex >= 0 && userIndex < updatedUsers.length) {
      const user = updatedUsers[userIndex];
      const days = [...user.days];

      // Ensure the day exists
      while (days.length <= dayNumber) {
        days.push({ vote: '', action: '', extraColumns: [] });
      }

      days[dayNumber] = {
        ...days[dayNumber],
        vote: newVoteValue,
        voteMultiplier,
      };

      updatedUsers[userIndex] = {
        ...user,
        days: days,
      };
      setUserTable(updatedUsers);
    }
  };

  const UNDOABLEsetVoteValue = (
    userIndex: number,
    newVoteValue: VoteValue,
    voteMultiplier: number
  ) => {
    const previousUserTable = createUndoSnapshot(userTableValue ?? []);
    if (userIndex < 0 || userIndex >= previousUserTable.length) return;

    const nextUserTable = createUndoSnapshot(previousUserTable);
    const user = nextUserTable[userIndex];
    const days = [...user.days];

    while (days.length <= dayNumber) {
      days.push({ vote: '', action: '', extraColumns: [] });
    }

    days[dayNumber] = {
      ...days[dayNumber],
      vote: newVoteValue,
      voteMultiplier,
    };

    nextUserTable[userIndex] = {
      ...user,
      days,
    };

    executeCommand({
      action: () => setUserTable(createUndoSnapshot(nextUserTable)),
      undoAction: () => setUserTable(createUndoSnapshot(previousUserTable)),
      description: 'Set Vote',
    });
  };

  const setActionValue = (userIndex: number, newActionValue: string) => {
    const updatedUsers = [...users];
    if (userIndex >= 0 && userIndex < updatedUsers.length) {
      const user = updatedUsers[userIndex];
      const days = [...user.days];

      // Ensure the day exists
      while (days.length <= dayNumber) {
        days.push({ vote: '', action: '', extraColumns: [] });
      }

      days[dayNumber] = {
        ...days[dayNumber],
        action: newActionValue,
      };

      updatedUsers[userIndex] = {
        ...user,
        days: days,
      };
      setUserTable(updatedUsers);
    }
  };

  const UNDOABLEsetActionValue = (userIndex: number, newActionValue: string) => {
    const previousUserTable = createUndoSnapshot(userTableValue ?? []);
    if (userIndex < 0 || userIndex >= previousUserTable.length) return;

    const nextUserTable = createUndoSnapshot(previousUserTable);
    const user = nextUserTable[userIndex];
    const days = [...user.days];

    while (days.length <= dayNumber) {
      days.push({ vote: '', action: '', extraColumns: [] });
    }

    days[dayNumber] = {
      ...days[dayNumber],
      action: newActionValue,
    };

    nextUserTable[userIndex] = {
      ...user,
      days,
    };

    executeCommand({
      action: () => setUserTable(createUndoSnapshot(nextUserTable)),
      undoAction: () => setUserTable(createUndoSnapshot(previousUserTable)),
      description: 'Set Action',
    });
  };

  const UNDOABLEupdateMorningMessage = (dayIndex: number, userIndex: number, value: string) => {
    const user = users[userIndex];
    if (!user) return;

    const previousMessagesList = createUndoSnapshot(morningMessagesList);
    const nextMessagesList = createUndoSnapshot(previousMessagesList);

    if (!nextMessagesList[user.email.toLowerCase()]) {
      nextMessagesList[user.email.toLowerCase()] = [];
    }

    const userMessages = [...nextMessagesList[user.email.toLowerCase()]];
    userMessages[dayIndex] = value;
    nextMessagesList[user.email.toLowerCase()] = userMessages;

    executeCommand({
      action: () => updateMorningMessage(dayIndex, userIndex, value),
      undoAction: () => {
        if (
          previousMessagesList[user.email.toLowerCase()] &&
          nextMessagesList[user.email.toLowerCase()]
        ) {
          updateMorningMessage(
            dayIndex,
            userIndex,
            previousMessagesList[user.email.toLowerCase()][dayIndex] || ''
          );
        }
      },
      description: 'Update Morning Message',
    });
  };

  // Compute column cell IDs for column selection
  const voteColumnCellIds = users.map((_, i) => `n-v-${i}`);
  const actionColumnCellIds = users.map((_, i) => `n-a-${i}`);
  const morningMessageColumnCellIds = users.map((_, i) => `n-m-${i}`);
  const extraColumnCellIds = nightlyExtraDayColumns.map((col) =>
    users.map((_, i) => `n-e-${i}-${col.index}`)
  );

  const handleBulkEdit = () => {
    // Only handle nightly-table cell types
    if (
      cellType !== 'nightlyVote' &&
      cellType !== 'nightlyAction' &&
      cellType !== 'morningMessage' &&
      cellType !== 'nightlyExtra'
    )
      return;

    const firstId = Array.from(selectedCells)[0];
    if (!firstId) return;

    const parts = firstId.split('-');
    const userIndex = parseInt(parts[2], 10);
    if (userIndex < 0 || userIndex >= users.length) return;
    const user = users[userIndex];
    const dayData = user.days[dayNumber] || { vote: '', action: '', extraColumns: [] };

    if (cellType === 'nightlyVote') {
      setBulkVoteInitial(dayData.vote || '');
      setBulkVoteMultiplier(dayData.voteMultiplier ?? 1);
      setIsBulkVoteEditorOpen(true);
    } else if (cellType === 'nightlyAction') {
      setBulkActionInitial(getPlayerActionSummary(dayData.action));
      setIsBulkActionEditorOpen(true);
    } else if (cellType === 'morningMessage') {
      const msg = morningMessagesList[user.email.toLowerCase()]?.[dayNumber] ?? '';
      setBulkMorningMessage(msg);
      setIsBulkMorningMessageOpen(true);
    } else if (cellType === 'nightlyExtra') {
      const colIdx = parseInt(parts[3], 10);
      setBulkTagInitial(dayData.extraColumns?.[colIdx] ?? '');
      setIsBulkTagEditorOpen(true);
    }
  };

  // Register this table's bulk-edit handler with the shared context
  React.useEffect(() => {
    return registerEditHandler(handleBulkEdit);
  }, [registerEditHandler, handleBulkEdit]);

  const handleBulkVoteUpdate = (vote: VoteValue, multiplier: number) => {
    const previousUserTable = createUndoSnapshot(userTableValue ?? []);
    const nextUserTable = createUndoSnapshot(previousUserTable);
    for (const cellId of selectedCells) {
      const parts = cellId.split('-');
      if (parts[0] !== 'n' || parts[1] !== 'v') continue;
      const userIndex = parseInt(parts[2], 10);
      if (userIndex < 0 || userIndex >= nextUserTable.length) continue;
      const user = nextUserTable[userIndex];
      const days = [...user.days];
      while (days.length <= dayNumber) {
        days.push({ vote: '', action: '', extraColumns: [] });
      }
      days[dayNumber] = { ...days[dayNumber], vote, voteMultiplier: multiplier };
      nextUserTable[userIndex] = { ...user, days };
    }
    executeCommand({
      action: () => setUserTable(createUndoSnapshot(nextUserTable)),
      undoAction: () => setUserTable(createUndoSnapshot(previousUserTable)),
      description: 'Bulk Update Votes',
    });
    setIsBulkVoteEditorOpen(false);
    exitSelectionMode();
  };

  const handleBulkActionUpdate = (action: string) => {
    const previousUserTable = createUndoSnapshot(userTableValue ?? []);
    const nextUserTable = createUndoSnapshot(previousUserTable);
    for (const cellId of selectedCells) {
      const parts = cellId.split('-');
      if (parts[0] !== 'n' || parts[1] !== 'a') continue;
      const userIndex = parseInt(parts[2], 10);
      if (userIndex < 0 || userIndex >= nextUserTable.length) continue;
      const user = nextUserTable[userIndex];
      const days = [...user.days];
      while (days.length <= dayNumber) {
        days.push({ vote: '', action: '', extraColumns: [] });
      }
      days[dayNumber] = { ...days[dayNumber], action };
      nextUserTable[userIndex] = { ...user, days };
    }
    executeCommand({
      action: () => setUserTable(createUndoSnapshot(nextUserTable)),
      undoAction: () => setUserTable(createUndoSnapshot(previousUserTable)),
      description: 'Bulk Update Actions',
    });
    setIsBulkActionEditorOpen(false);
    exitSelectionMode();
  };

  const handleBulkMorningMessageUpdate = ({ markdown }: { markdown: string }) => {
    const userIndices: number[] = [];
    for (const cellId of selectedCells) {
      const parts = cellId.split('-');
      if (parts[0] !== 'n' || parts[1] !== 'm') continue;
      const userIndex = parseInt(parts[2], 10);
      if (userIndex < 0 || userIndex >= users.length) continue;
      userIndices.push(userIndex);
    }
    if (userIndices.length === 0) return;

    const previousMessagesList = createUndoSnapshot(morningMessagesList);

    executeCommand({
      action: () => bulkUpdateMorningMessages(dayNumber, userIndices, markdown),
      undoAction: () => {
        userIndices.forEach((userIndex) => {
          const user = users[userIndex];
          const prevValue = previousMessagesList[user.email.toLowerCase()]?.[dayNumber] ?? '';
          updateMorningMessage(dayNumber, userIndex, prevValue);
        });
      },
      description: 'Bulk Update Morning Messages',
    });
    setIsBulkMorningMessageOpen(false);
    exitSelectionMode();
  };

  const handleBulkTagUpdate = (newValue: string) => {
    const previousUserTable = createUndoSnapshot(userTableValue ?? []);
    const nextUserTable = createUndoSnapshot(previousUserTable);
    for (const cellId of selectedCells) {
      const parts = cellId.split('-');
      if (parts[0] !== 'n' || parts[1] !== 'e') continue;
      const userIndex = parseInt(parts[2], 10);
      const colIdx = parseInt(parts[3], 10);
      if (userIndex < 0 || userIndex >= nextUserTable.length) continue;
      const user = nextUserTable[userIndex];
      const days = [...user.days];
      while (days.length <= dayNumber) {
        days.push({ vote: '', action: '', extraColumns: [] });
      }
      const extraColumns = [...(days[dayNumber].extraColumns || [])];
      while (extraColumns.length <= colIdx) {
        extraColumns.push('');
      }
      extraColumns[colIdx] = newValue;
      days[dayNumber] = { ...days[dayNumber], extraColumns };
      nextUserTable[userIndex] = { ...user, days };
    }
    executeCommand({
      action: () => setUserTable(createUndoSnapshot(nextUserTable)),
      undoAction: () => setUserTable(createUndoSnapshot(previousUserTable)),
      description: 'Bulk Update Cells',
    });
    setIsBulkTagEditorOpen(false);
    exitSelectionMode();
  };

  return (
    <Column onLayout={onLayout} ref={tableRef} className="gap-0">
      {!areColumnWidthsReady ? (
        <Row className="bg-text/5 h-12 w-min gap-0" />
      ) : (
        <Row className="gap-0">
          <Column className={`border-border w-min gap-0 rounded border-2 ${className || ''}`}>
            <NightlyDayTitleRow
              onEditStart={() => handleRowEditStart('title')}
              onEditEnd={handleRowEditEnd}
              isEditing={editingRow === 'title'}
              columnWidths={columnWidths}
              columnSizes={columnSizes.value}
              onSetColumnSize={setColumnSize}
              extraDayColumns={nightlyExtraDayColumns.map((c) => c.title)}
              extraDayColumnWidths={extraDayColumnWidths}
              selectionMode={selectionMode}
              columnCellIds={{
                vote: voteColumnCellIds,
                action: actionColumnCellIds,
                morningMessage: morningMessageColumnCellIds,
                extra: extraColumnCellIds,
              }}
            />
            {users.map((user, index) => (
              <Animated.View key={index} entering={FadeIn.duration(300).delay(index * 50)}>
                <NightlyDayUserRow
                  user={user}
                  index={index}
                  isLast={index === users.length - 1}
                  dayNumber={dayNumber}
                  setVoteValue={UNDOABLEsetVoteValue}
                  setActionValue={UNDOABLEsetActionValue}
                  updateMorningMessage={UNDOABLEupdateMorningMessage}
                  onEditStart={() => handleRowEditStart(index)}
                  onEditEnd={handleRowEditEnd}
                  isEditing={editingRow === index}
                  morningMessagesList={morningMessagesList}
                  columnWidths={columnWidths}
                  users={users}
                  gameId={gameId}
                  extraDayColumnIndices={nightlyExtraDayColumns.map((c) => c.index)}
                  extraDayColumnWidths={extraDayColumnWidths}
                  extraDayColumnTitles={nightlyExtraDayColumns.map((c) => c.title)}
                  selectionMode={selectionMode}
                />
              </Animated.View>
            ))}
          </Column>
        </Row>
      )}

      {/* Bulk editor dialogs */}
      <VoteEditorDialog
        isOpen={isBulkVoteEditorOpen}
        onOpenChange={setIsBulkVoteEditorOpen}
        title="Bulk Update Votes"
        initialVote={bulkVoteInitial}
        initialVoteMultiplier={bulkVoteMultiplier}
        onSubmit={(vote, multiplier) => handleBulkVoteUpdate(vote, multiplier)}
        dialogSubtext="Update all selected vote cells."
        users={users}
        submitLabel="Update All"
      />
      <ActionEditorDialog
        isOpen={isBulkActionEditorOpen}
        onOpenChange={setIsBulkActionEditorOpen}
        title="Bulk Update Actions"
        initialAction={bulkActionInitial}
        onSubmit={(action) => handleBulkActionUpdate(action)}
        dialogSubtext="Update all selected action cells."
        submitLabel="Update All"
      />
      <MarkdownEditorDialog
        isOpen={isBulkMorningMessageOpen}
        onOpenChange={setIsBulkMorningMessageOpen}
        title="Bulk Update Morning Messages"
        initialMarkdown={bulkMorningMessage}
        onSubmit={handleBulkMorningMessageUpdate}
        gameId={gameId}
        showScript
        showInputs
        hideInputs={false}
        centered={true}
        submitLabel="Update All"
      />
      <TagCellEditor
        isOpen={isBulkTagEditorOpen}
        onOpenChange={setIsBulkTagEditorOpen}
        gameId={gameId}
        value={bulkTagInitial}
        onChange={(newValue) => handleBulkTagUpdate(newValue)}
        submitLabel="Update All"
      />
    </Column>
  );
};

export default NightlyDaysTable;
