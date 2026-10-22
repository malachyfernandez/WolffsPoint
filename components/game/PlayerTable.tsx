import React, { useEffect, useRef, useState } from 'react';
import FontText from '../ui/text/FontText';
import { useList, useValue } from 'hooks/useData';
import { useProgressiveCount } from 'hooks/useProgressiveCount';
import { deepEqual } from 'utils/deepEqual';
import Column from '../layout/Column';
import AppButton from '../ui/buttons/AppButton';
import Row from '../layout/Row';
import UserRow from './UserRow';
import TitleRow from './TitleRow';
import { createUndoSnapshot, useUndoRedo } from 'hooks/useUndoRedo';
import { UserTableItem, UserTableTitle, UserTableColumnVisibility } from 'types/playerTable';
import { normalizePlayerPageState } from './playerTableNormalization';
import { useTagTriggers } from 'hooks/useTagTriggers';
import {
  PlayerPageColumnSizes,
  defaultPlayerPageColumnSizes,
  getPlayerPageColumnSizesKey,
  getWidthForColumnSize,
  ColumnSizeOption,
} from './playerTableColumnSizing';
import TagCellEditor from './TagCellEditor';
import { useMultiSelect } from './multiSelect/MultiSelectContext';
import ExtraColumnFilesEditor from './scriptFiles/ExtraColumnFilesEditor';
import { cellTagRefs, fileCellEditorText, reconcileFileCell } from '../../utils/cellPieces';
import { reconcileTagSelection } from '../../utils/tagEncoding';
import { createClientId } from '../../utils/multiplayer';
import { trackManualStringChange } from '../../utils/fieldProvenance';

interface PlayerTableProps {
  gameId: string;
  isBeingEdited: boolean;
  setIsBeingEdited: (value: boolean) => void;
  className?: string;
  dayDatesArray: Date[];
  onColumnsReady?: (ready: boolean) => void;
}

const PlayerTable = ({
  gameId,
  isBeingEdited,
  setIsBeingEdited,
  className,
  dayDatesArray,
  onColumnsReady,
}: PlayerTableProps) => {
  const { executeCommand } = useUndoRedo();
  const [editingRow, setEditingRow] = useState<'title' | number | null>(null);
  const { selectionMode, selectedCells, cellType, exitSelectionMode, registerEditHandler } =
    useMultiSelect();
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

  const [userTable, setUserTable] = useList<UserTableItem[]>('userTable', gameId);
  // User Row.tsx

  const userTableValue = userTable.scheduledUpdate?.value ?? userTable.value;
  const users = userTableValue ?? [];
  // Mount rows progressively: 24 rows × cells mount in one commit otherwise.
  const mountedRowCount = useProgressiveCount(users.length);
  // Ref that mirrors `users` but is also updated synchronously when we call
  // setUserTable, so that handleTagsAdded can see the tag change that was
  // just applied via onChange (before React re-renders).
  const usersRef = useRef(users);
  usersRef.current = users;

  const [userTableTitle, setUserTableTitle] = useList<UserTableTitle>('userTableTitle', gameId, {
    privacy: 'PUBLIC',
  });

  const [userTableColumnVisibility, setUserTableColumnVisibility] =
    useList<UserTableColumnVisibility>('userTableColumnVisibility', gameId, { privacy: 'PUBLIC' });

  const userTableTitleValue = userTableTitle.scheduledUpdate?.value ?? userTableTitle.value;
  const columnVisibilityValue =
    userTableColumnVisibility.scheduledUpdate?.value ?? userTableColumnVisibility.value;
  const titles = userTableTitleValue ?? { extraUserColumns: [], extraDayColumns: [] };
  const {
    tagLookup,
    env: tagEnv,
    planTableChanges,
  } = useTagTriggers(gameId, users, titles, (updated) => setUserTable(updated));

  const hasNormalizedOnceRef = useRef(false);
  const prevDayDatesLengthRef = useRef(dayDatesArray.length);

  // Track when column data is ready (only check isSyncing, not value presence)
  const areColumnsReady =
    !userTable?.state?.isSyncing &&
    !userTableTitle?.state?.isSyncing &&
    !userTableColumnVisibility?.state?.isSyncing;

  useEffect(() => {
    onColumnsReady?.(areColumnsReady);
  }, [areColumnsReady, onColumnsReady]);

  // Normalization effect - only runs when data first becomes ready or day count changes
  useEffect(() => {
    // Skip if any data is still syncing to avoid fighting during load
    if (
      userTable?.state?.isSyncing ||
      userTableTitle?.state?.isSyncing ||
      userTableColumnVisibility?.state?.isSyncing
    ) {
      hasNormalizedOnceRef.current = false;
      return;
    }

    const dayDatesLengthChanged = prevDayDatesLengthRef.current !== dayDatesArray.length;
    prevDayDatesLengthRef.current = dayDatesArray.length;

    if (hasNormalizedOnceRef.current && !dayDatesLengthChanged) {
      return;
    }

    const normalizedState = normalizePlayerPageState({
      titles: userTableTitleValue,
      visibility: columnVisibilityValue,
      users: userTableValue,
      targetDayCount: dayDatesArray.length,
    });

    const currentTitles = userTableTitleValue ?? { extraUserColumns: [], extraDayColumns: [] };
    const currentVisibility = columnVisibilityValue ?? {
      extraUserColumns: [],
      extraDayColumns: [],
    };
    const currentUsers = userTableValue ?? [];

    if (!deepEqual(currentTitles, normalizedState.titles)) {
      setUserTableTitle(normalizedState.titles);
    }

    if (!deepEqual(currentVisibility, normalizedState.visibility)) {
      setUserTableColumnVisibility(normalizedState.visibility);
    }

    if (!deepEqual(currentUsers, normalizedState.users)) {
      setUserTable(normalizedState.users);
    }

    hasNormalizedOnceRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    userTable?.state?.isSyncing,
    userTableTitle?.state?.isSyncing,
    userTableColumnVisibility?.state?.isSyncing,
    dayDatesArray.length,
  ]);

  const UNDOABLEsetLivingState = (userIndex: number, newLivingState: 'alive' | 'dead') => {
    const previousUserTable = createUndoSnapshot(userTableValue ?? []);
    if (userIndex < 0 || userIndex >= previousUserTable.length) return;

    const nextUserTable = createUndoSnapshot(previousUserTable);
    nextUserTable[userIndex] = {
      ...nextUserTable[userIndex],
      playerData: {
        ...nextUserTable[userIndex].playerData,
        livingState: newLivingState,
      },
    };

    executeCommand({
      action: () => setUserTable(createUndoSnapshot(nextUserTable)),
      undoAction: () => setUserTable(createUndoSnapshot(previousUserTable)),
      description: 'Change Living State',
    });
  };

  const UNDOABLEsetExtraColumnValue = (
    userIndex: number,
    extraColumnIndex: number,
    newExtraColumnValue: string
  ) => {
    const previousUserTable = createUndoSnapshot(usersRef.current);
    if (userIndex < 0 || userIndex >= previousUserTable.length) return;

    const nextUserTable = createUndoSnapshot(previousUserTable);
    const currentExtraColumns = nextUserTable[userIndex].playerData.extraColumns || [];
    const updatedExtraColumns = [...currentExtraColumns];
    updatedExtraColumns[extraColumnIndex] = trackManualStringChange(
      currentExtraColumns[extraColumnIndex] ?? '',
      newExtraColumnValue
    );

    nextUserTable[userIndex] = {
      ...nextUserTable[userIndex],
      playerData: {
        ...nextUserTable[userIndex].playerData,
        extraColumns: updatedExtraColumns,
      },
    };

    const changes = planTableChanges(previousUserTable, nextUserTable);
    usersRef.current = changes.users;
    executeCommand({
      action: () => {
        changes.commit();
        setUserTable(createUndoSnapshot(changes.users), { cellWriteOrigin: 'tracked' });
      },
      undoAction: () => {
        changes.undo();
        usersRef.current = previousUserTable;
        setUserTable(createUndoSnapshot(previousUserTable));
      },
      description: 'Set Column Value',
    });
  };

  const UNDOABLEdeleteUser = (index: number) => {
    const previous = createUndoSnapshot(usersRef.current);
    const changes = planTableChanges(
      previous,
      previous.filter((_, row) => row !== index)
    );
    executeCommand({
      action: () => {
        changes.commit();
        usersRef.current = changes.users;
        setUserTable(createUndoSnapshot(changes.users), { cellWriteOrigin: 'tracked' });
      },
      undoAction: () => {
        changes.undo();
        usersRef.current = previous;
        setUserTable(createUndoSnapshot(previous));
      },
      description: 'Delete player',
    });
  };

  const UNDOABLEsetColumnTitle = (columnIndex: number, newTitle: string) => {
    const previousTitles = createUndoSnapshot(
      userTableTitleValue ?? { extraUserColumns: [], extraDayColumns: [] }
    );
    const nextTitles = createUndoSnapshot(previousTitles);
    nextTitles.extraUserColumns[columnIndex] = newTitle;

    executeCommand({
      action: () => setUserTableTitle(createUndoSnapshot(nextTitles)),
      undoAction: () => setUserTableTitle(createUndoSnapshot(previousTitles)),
      description: 'Set Column Title',
    });
  };

  const UNDOABLEaddColumn = () => {
    const previousTitles = createUndoSnapshot(
      userTableTitleValue ?? { extraUserColumns: [], extraDayColumns: [] }
    );
    const previousUserTable = createUndoSnapshot(userTableValue ?? []);
    const previousVisibility = createUndoSnapshot(
      columnVisibilityValue ?? { extraUserColumns: [], extraDayColumns: [] }
    );

    const newTitle = `Column ${previousTitles.extraUserColumns.length + 1}`;
    const nextTitles = {
      ...previousTitles,
      extraUserColumns: [...previousTitles.extraUserColumns, newTitle],
      extraUserColumnIds: previousTitles.extraUserColumnIds
        ? [...previousTitles.extraUserColumnIds, createClientId('column')]
        : undefined,
    };

    const nextUserTable = previousUserTable.map((user) => ({
      ...user,
      playerData: {
        ...user.playerData,
        extraColumns: [...(user.playerData.extraColumns || []), ''],
      },
    }));

    const nextVisibility = {
      ...previousVisibility,
      extraUserColumns: [...previousVisibility.extraUserColumns, true],
    };

    executeCommand({
      action: () => {
        setUserTableTitle(createUndoSnapshot(nextTitles));
        setUserTable(createUndoSnapshot(nextUserTable));
        setUserTableColumnVisibility(createUndoSnapshot(nextVisibility));
      },
      undoAction: () => {
        setUserTableTitle(createUndoSnapshot(previousTitles));
        setUserTable(createUndoSnapshot(previousUserTable));
        setUserTableColumnVisibility(createUndoSnapshot(previousVisibility));
      },
      description: 'Add Column',
    });
  };

  const UNDOABLEsetColumnVisibility = (columnIndex: number, visibility: boolean) => {
    const previousVisibility = createUndoSnapshot(
      columnVisibilityValue ?? { extraUserColumns: [], extraDayColumns: [] }
    );
    const nextVisibility = {
      ...previousVisibility,
      extraUserColumns: previousVisibility.extraUserColumns.map((v, index) =>
        index === columnIndex ? visibility : v
      ),
    };

    executeCommand({
      action: () => setUserTableColumnVisibility(createUndoSnapshot(nextVisibility)),
      undoAction: () => setUserTableColumnVisibility(createUndoSnapshot(previousVisibility)),
      description: visibility ? 'Show Column' : 'Hide Column',
    });
  };

  // Subscribe to player page column sizes
  const [columnSizes, setColumnSizes] = useValue<PlayerPageColumnSizes>(
    getPlayerPageColumnSizesKey(gameId),
    { defaultValue: defaultPlayerPageColumnSizes, privacy: 'PUBLIC', autoCreate: false }
  );

  // Calculate extra user column widths based on sizes
  const currentTitles = userTableTitleValue ?? { extraUserColumns: [], extraDayColumns: [] };
  const extraUserColumnWidths = currentTitles.extraUserColumns.map((_: string, index: number) => {
    const size = columnSizes.value?.playerExtraColumns?.[index] ?? 'small';
    return getWidthForColumnSize(112, size);
  });

  const setExtraUserColumnSize = (columnIndex: number, size: ColumnSizeOption) => {
    const currentSizes = columnSizes.value ?? defaultPlayerPageColumnSizes;
    const nextExtraColumnSizes = [...currentSizes.playerExtraColumns];
    nextExtraColumnSizes[columnIndex] = size;
    setColumnSizes({
      ...currentSizes,
      playerExtraColumns: nextExtraColumnSizes,
    });
  };

  const UNDOABLEdeleteExtraUserColumn = (columnIndex: number) => {
    const previousTitles = createUndoSnapshot(
      userTableTitleValue ?? { extraUserColumns: [], extraDayColumns: [] }
    );
    const previousUserTable = createUndoSnapshot(userTableValue ?? []);
    const previousVisibility = createUndoSnapshot(
      columnVisibilityValue ?? { extraUserColumns: [], extraDayColumns: [] }
    );
    const previousColumnSizes = createUndoSnapshot(
      columnSizes.value ?? defaultPlayerPageColumnSizes
    );

    const nextTitles = {
      ...previousTitles,
      extraUserColumns: previousTitles.extraUserColumns.filter((_, i) => i !== columnIndex),
      extraUserColumnIds: previousTitles.extraUserColumnIds?.filter((_, i) => i !== columnIndex),
      extraUserColumnTypes: previousTitles.extraUserColumnTypes?.filter(
        (_, i) => i !== columnIndex
      ),
    };

    const nextUserTable = previousUserTable.map((user) => ({
      ...user,
      playerData: {
        ...user.playerData,
        extraColumns: (user.playerData.extraColumns || []).filter((_, i) => i !== columnIndex),
      },
    }));

    const nextVisibility = {
      ...previousVisibility,
      extraUserColumns: previousVisibility.extraUserColumns.filter((_, i) => i !== columnIndex),
    };

    const nextColumnSizes = {
      ...previousColumnSizes,
      playerExtraColumns: previousColumnSizes.playerExtraColumns.filter(
        (_, i) => i !== columnIndex
      ),
    };

    const changes = planTableChanges(previousUserTable, nextUserTable, nextTitles);
    executeCommand({
      action: () => {
        changes.commit();
        setUserTableTitle(createUndoSnapshot(nextTitles));
        setUserTable(createUndoSnapshot(changes.users), { cellWriteOrigin: 'tracked' });
        setUserTableColumnVisibility(createUndoSnapshot(nextVisibility));
        setColumnSizes(createUndoSnapshot(nextColumnSizes));
      },
      undoAction: () => {
        changes.undo();
        setUserTableTitle(createUndoSnapshot(previousTitles));
        setUserTable(createUndoSnapshot(previousUserTable));
        setUserTableColumnVisibility(createUndoSnapshot(previousVisibility));
        setColumnSizes(createUndoSnapshot(previousColumnSizes));
      },
      description: 'Delete Column',
    });
  };

  // Compute column cell IDs for column selection
  const extraColumnCellIds = (userTableTitleValue?.extraUserColumns ?? []).map((_, colIdx) =>
    users.map((_, i) => `p-e-${i}-${colIdx}`)
  );

  const handleBulkEdit = () => {
    // Only handle player-extra cell types
    if (cellType !== 'playerExtra' && cellType !== 'playerExtraFiles') return;

    const firstId = Array.from(selectedCells)[0];
    if (!firstId) return;

    // Parse cell ID: p-e-${userIndex}-${columnIndex}
    const parts = firstId.split('-');
    if (parts.length < 4) return;
    const userIndex = parseInt(parts[2], 10);
    const columnIndex = parseInt(parts[3], 10);
    if (userIndex < 0 || userIndex >= users.length) return;

    const user = users[userIndex];
    setBulkTagInitial(user.playerData.extraColumns?.[columnIndex] ?? '');
    setIsBulkTagEditorOpen(true);
  };

  // Register this table's bulk-edit handler with the shared context
  useEffect(() => {
    return registerEditHandler(handleBulkEdit);
  }, [registerEditHandler, handleBulkEdit]);

  // Apply the selection separately to each cell, preserving its own owners.
  const handleBulkTagUpdate = (newValue: string) => {
    const previousUserTable = createUndoSnapshot(usersRef.current);
    const nextUserTable = createUndoSnapshot(previousUserTable);

    for (const cellId of selectedCells) {
      const parts = cellId.split('-');
      if (parts.length < 4 || parts[0] !== 'p' || parts[1] !== 'e') continue;
      const userIndex = parseInt(parts[2], 10);
      const columnIndex = parseInt(parts[3], 10);
      if (userIndex < 0 || userIndex >= nextUserTable.length) continue;

      const user = nextUserTable[userIndex];
      const extraColumns = [...(user.playerData.extraColumns || [])];
      const raw = extraColumns[columnIndex] ?? '';
      extraColumns[columnIndex] =
        cellType === 'playerExtraFiles' && tagEnv.index
          ? reconcileFileCell(raw, fileCellEditorText(newValue, tagEnv.index), tagEnv.index)
          : reconcileTagSelection(raw, cellTagRefs(newValue), tagLookup);
      nextUserTable[userIndex] = {
        ...user,
        playerData: { ...user.playerData, extraColumns },
      };
    }

    const changes = planTableChanges(previousUserTable, nextUserTable);
    executeCommand({
      action: () => {
        usersRef.current = changes.users;
        setUserTable(createUndoSnapshot(changes.users), { cellWriteOrigin: 'tracked' });
        changes.commit();
      },
      undoAction: () => {
        usersRef.current = previousUserTable;
        setUserTable(createUndoSnapshot(previousUserTable));
        changes.undo();
      },
      description: 'Bulk Update Cells',
    });
    setIsBulkTagEditorOpen(false);
    exitSelectionMode();
  };

  return (
    <Column className="gap-0">
      <Row className="gap-0">
        <Column className={`border-border w-min gap-0 rounded border-2 ${className || ''}`}>
          <TitleRow
            userTableTitle={userTableTitleValue}
            userTableColumnVisibility={columnVisibilityValue}
            setColumnTitle={UNDOABLEsetColumnTitle}
            onSetColumnType={(index, type) => {
              const next = [...(titles.extraUserColumnTypes ?? [])];
              while (next.length < titles.extraUserColumns.length) next.push('tags');
              next[index] = type;
              setUserTableTitle({ ...titles, extraUserColumnTypes: next });
            }}
            setColumnVisibility={UNDOABLEsetColumnVisibility}
            onEditStart={() => handleRowEditStart('title')}
            onEditEnd={handleRowEditEnd}
            isEditing={editingRow === 'title'}
            extraUserColumnWidths={extraUserColumnWidths}
            extraUserColumnSizes={columnSizes.value?.playerExtraColumns}
            onSetExtraUserColumnSize={setExtraUserColumnSize}
            onDeleteExtraUserColumn={UNDOABLEdeleteExtraUserColumn}
            selectionMode={selectionMode}
            columnCellIds={extraColumnCellIds}
          />

          {users.slice(0, mountedRowCount).map((user, index) => (
            <UserRow
              key={index}
              user={user}
              index={index}
              isLast={index === users.length - 1}
              setLivingState={UNDOABLEsetLivingState}
              setExtraColumnValue={UNDOABLEsetExtraColumnValue}
              userTableColumnVisibility={columnVisibilityValue}
              onEditStart={() => handleRowEditStart(index)}
              onEditEnd={handleRowEditEnd}
              isEditing={editingRow === index}
              gameId={gameId}
              extraUserColumnWidths={extraUserColumnWidths}
              userColumnTitles={titles.extraUserColumns}
              columnTypes={titles.extraUserColumnTypes}
              onDeleteUser={UNDOABLEdeleteUser}
              selectionMode={selectionMode}
            />
          ))}
        </Column>
        {!selectionMode && (
          <Row className="bg-light -z-10 h-12 w-12 items-center justify-center gap-4">
            <AppButton variant="filled" className="h-8! w-8" onPress={UNDOABLEaddColumn}>
              <FontText weight="bold" color="white" className="mt-[-0.1rem] text-xl ">
                +
              </FontText>
            </AppButton>
          </Row>
        )}
      </Row>

      {cellType === 'playerExtraFiles' ? (
        <ExtraColumnFilesEditor
          isOpen={isBulkTagEditorOpen}
          onOpenChange={setIsBulkTagEditorOpen}
          gameId={gameId}
          value={bulkTagInitial}
          onChange={handleBulkTagUpdate}
          title="Bulk update files"
          historyKey={`bulkPlayerExtraFiles:${gameId}`}
        />
      ) : (
        <TagCellEditor
          isOpen={isBulkTagEditorOpen}
          onOpenChange={setIsBulkTagEditorOpen}
          gameId={gameId}
          value={bulkTagInitial}
          onChange={(newValue) => handleBulkTagUpdate(newValue)}
          submitLabel="Update All"
        />
      )}
    </Column>
  );
};

export default PlayerTable;
