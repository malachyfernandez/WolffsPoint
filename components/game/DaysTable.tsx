import React, { useCallback, useEffect, useState, useRef } from 'react';
import FontText from '../ui/text/FontText';
import { useList, useValue } from 'hooks/useData';
import { deepEqual } from 'utils/deepEqual';
import Column from '../layout/Column';
import AppButton from '../ui/buttons/AppButton';
import Row from '../layout/Row';
import DayUserRow from './DayUserRow';
import DayTitleRow from './DayTitleRow';
import { createUndoSnapshot, useUndoRedo } from 'hooks/useUndoRedo';
import {
  UserTableItem,
  UserTableTitle,
  UserTableColumnVisibility,
  UserTableColumnNightlyVisibility,
} from 'types/playerTable';
import {
  ColumnSizeOption,
  PlayerPageColumnSizes,
  defaultPlayerPageColumnSizes,
  getPlayerPageColumnSizesKey,
  getWidthForColumnSize,
} from './playerTableColumnSizing';
import { getTargetDayCount, normalizePlayerPageState } from './playerTableNormalization';
import { useTagTriggers, type CellContext } from 'hooks/useTagTriggers';
import { VoteValue } from 'types/multiplayer';
import { getPlayerActionSummary } from 'utils/multiplayer';
import ActionEditorDialog from './ActionEditorDialog';
import VoteEditorDialog from './VoteEditorDialog';
import TagCellEditor from './TagCellEditor';
import { useMultiSelect } from './multiSelect/MultiSelectContext';

interface DaysTableProps {
  gameId: string;
  dayNumber: number;
  dayCount: number;
  isBeingEdited: boolean;
  setIsBeingEdited: (value: boolean) => void;
  className?: string;
  onLayout?: (event: any) => void;
  onWidthChange?: (width: number) => void;
  onColumnsReady?: (ready: boolean) => void;
}

/** Parse a days-table cell ID into its components. */
const parseDaysCellId = (
  cellId: string
): {
  type: string;
  userIndex: number;
  columnIndex?: number;
} => {
  if (cellId.startsWith('d-v-'))
    return { type: 'daysVote', userIndex: parseInt(cellId.slice(4), 10) };
  if (cellId.startsWith('d-a-'))
    return { type: 'daysAction', userIndex: parseInt(cellId.slice(4), 10) };
  if (cellId.startsWith('d-e-')) {
    const rest = cellId.slice(4);
    const parts = rest.split('-');
    return {
      type: 'daysExtra',
      userIndex: parseInt(parts[0], 10),
      columnIndex: parseInt(parts[1], 10),
    };
  }
  return { type: '', userIndex: -1 };
};

const DaysTable = ({
  gameId,
  dayNumber,
  dayCount,
  isBeingEdited,
  setIsBeingEdited,
  className,
  onLayout,
  onWidthChange,
  onColumnsReady,
}: DaysTableProps) => {
  const { executeCommand } = useUndoRedo();
  const [editingRow, setEditingRow] = useState<'title' | number | null>(null);
  const tableRef = useRef<any>(null);
  const { selectionMode, selectedCells, cellType, exitSelectionMode, registerEditHandler } =
    useMultiSelect();

  // Bulk editor state
  const [isBulkVoteEditorOpen, setIsBulkVoteEditorOpen] = useState(false);
  const [bulkVoteInitial, setBulkVoteInitial] = useState<VoteValue>('');
  const [bulkVoteMultiplier, setBulkVoteMultiplier] = useState(1);
  const [isBulkActionEditorOpen, setIsBulkActionEditorOpen] = useState(false);
  const [bulkActionInitial, setBulkActionInitial] = useState('');
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

  const [userTable, setUserTable] = useList<UserTableItem[]>('userTable', gameId);

  const userTableValue = userTable.scheduledUpdate?.value ?? userTable.value;
  const users = userTableValue ?? [];
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

  const [nightlyVisibility, setNightlyVisibility] = useList<UserTableColumnNightlyVisibility>(
    'userTableColumnNightlyVisibility',
    gameId,
    { privacy: 'PUBLIC' }
  );

  const userTableTitleValue = userTableTitle.scheduledUpdate?.value ?? userTableTitle.value;
  const columnVisibilityValue =
    userTableColumnVisibility.scheduledUpdate?.value ?? userTableColumnVisibility.value;
  const nightlyVisibilityValue =
    nightlyVisibility.scheduledUpdate?.value ?? nightlyVisibility.value;
  const titles = userTableTitleValue ?? { extraUserColumns: [], extraDayColumns: [] };
  const { fireTagTriggers } = useTagTriggers(gameId, users, titles, (updated) =>
    setUserTable(updated)
  );

  const handleTagsAdded = (tagNames: string[], context: CellContext) => {
    const projectedUsers = usersRef.current;
    const updated = fireTagTriggers(tagNames, context, projectedUsers, 'added');
    if (updated !== projectedUsers) {
      usersRef.current = updated;
      setUserTable(updated);
    }
  };

  const handleTagsRemoved = (tagNames: string[], context: CellContext) => {
    const projectedUsers = usersRef.current;
    const updated = fireTagTriggers(tagNames, context, projectedUsers, 'removed');
    if (updated !== projectedUsers) {
      usersRef.current = updated;
      setUserTable(updated);
    }
  };

  const [columnSizes, setColumnSizes] = useValue<PlayerPageColumnSizes>(
    getPlayerPageColumnSizesKey(gameId),
    { defaultValue: defaultPlayerPageColumnSizes, privacy: 'PUBLIC' }
  );

  const hasNormalizedOnceRef = useRef(false);
  const prevDayCountRef = useRef(dayCount);
  const prevDayNumberRef = useRef(dayNumber);

  const targetDayCount = getTargetDayCount(userTableValue, Math.max(dayCount, dayNumber + 1));

  const getNormalizedState = useCallback(
    (overrides?: {
      titles?: UserTableTitle;
      visibility?: UserTableColumnVisibility;
      users?: UserTableItem[];
      columnSizes?: PlayerPageColumnSizes;
    }) => {
      return normalizePlayerPageState({
        titles: overrides?.titles ?? userTableTitleValue,
        visibility: overrides?.visibility ?? columnVisibilityValue,
        users: overrides?.users ?? userTableValue,
        targetDayCount,
        columnSizes: overrides?.columnSizes ?? columnSizes.value,
      });
    },
    [columnSizes.value, targetDayCount, userTableValue, columnVisibilityValue, userTableTitleValue]
  );

  // Track when column data is ready (only check isSyncing, not value presence)
  const areColumnsReady =
    !userTable?.state?.isSyncing &&
    !userTableTitle?.state?.isSyncing &&
    !userTableColumnVisibility?.state?.isSyncing &&
    !columnSizes?.state?.isSyncing;

  useEffect(() => {
    onColumnsReady?.(areColumnsReady);
  }, [areColumnsReady, onColumnsReady]);

  // Normalization effect - only runs when data first becomes ready or day props change
  useEffect(() => {
    // Skip if any data is still syncing to avoid fighting during load
    if (
      userTable?.state?.isSyncing ||
      userTableTitle?.state?.isSyncing ||
      userTableColumnVisibility?.state?.isSyncing ||
      columnSizes?.state?.isSyncing ||
      nightlyVisibility?.state?.isSyncing
    ) {
      hasNormalizedOnceRef.current = false;
      return;
    }

    const dayCountChanged = prevDayCountRef.current !== dayCount;
    const dayNumberChanged = prevDayNumberRef.current !== dayNumber;
    prevDayCountRef.current = dayCount;
    prevDayNumberRef.current = dayNumber;

    if (hasNormalizedOnceRef.current && !dayCountChanged && !dayNumberChanged) {
      return;
    }

    const normalizedState = getNormalizedState();
    const currentTitles = userTableTitleValue ?? { extraUserColumns: [], extraDayColumns: [] };
    const currentVisibility = columnVisibilityValue ?? {
      extraUserColumns: [],
      extraDayColumns: [],
    };
    const currentUsers = userTableValue ?? [];
    const currentColumnSizes = columnSizes.value ?? defaultPlayerPageColumnSizes;

    // Normalize nightly visibility to match column counts, defaulting to false
    const currentNightly = nightlyVisibilityValue ?? {
      extraUserColumns: [],
      extraDayColumns: [],
    };
    const normalizedNightly = {
      extraUserColumns: Array.from(
        { length: normalizedState.titles.extraUserColumns.length },
        (_, i) => currentNightly.extraUserColumns[i] ?? false
      ),
      extraDayColumns: Array.from(
        { length: normalizedState.titles.extraDayColumns.length },
        (_, i) => currentNightly.extraDayColumns[i] ?? false
      ),
    };

    let hasChanges = false;

    if (!deepEqual(currentVisibility, normalizedState.visibility)) {
      setUserTableColumnVisibility(normalizedState.visibility);
      hasChanges = true;
    }

    if (!deepEqual(currentUsers, normalizedState.users)) {
      setUserTable(normalizedState.users);
      hasChanges = true;
    }

    if (!deepEqual(currentColumnSizes, normalizedState.columnSizes)) {
      setColumnSizes(normalizedState.columnSizes);
      hasChanges = true;
    }

    if (!deepEqual(currentTitles, normalizedState.titles)) {
      setUserTableTitle(normalizedState.titles);
      hasChanges = true;
    }

    if (!deepEqual(currentNightly, normalizedNightly)) {
      setNightlyVisibility(normalizedNightly);
      hasChanges = true;
    }

    hasNormalizedOnceRef.current = true;

    // Only measure width if columns actually changed
    if (hasChanges) {
      measureTableWidth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    userTable?.state?.isSyncing,
    userTableTitle?.state?.isSyncing,
    userTableColumnVisibility?.state?.isSyncing,
    columnSizes?.state?.isSyncing,
    nightlyVisibility?.state?.isSyncing,
    dayCount,
    dayNumber,
  ]);

  // Measure width when columns change
  useEffect(() => {
    const cleanup = measureTableWidth();
    return cleanup;
  }, [
    measureTableWidth,
    userTableTitleValue?.extraDayColumns?.length,
    columnVisibilityValue?.extraDayColumns,
    columnSizes.value.dayBaseColumns.action,
    columnSizes.value.dayBaseColumns.vote,
    columnSizes.value.dayExtraColumns,
  ]);
  const UNDOABLEsetVoteValue = (
    userIndex: number,
    newVoteValue: VoteValue,
    voteMultiplier: number
  ) => {
    const previousUserTable = createUndoSnapshot(userTableValue ?? []);
    if (userIndex < 0 || userIndex >= previousUserTable.length) return;

    const nextUserTable = createUndoSnapshot(
      getNormalizedState({ users: previousUserTable }).users
    );
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

  const UNDOABLEsetActionValue = (userIndex: number, newActionValue: string) => {
    const previousUserTable = createUndoSnapshot(userTableValue ?? []);
    if (userIndex < 0 || userIndex >= previousUserTable.length) return;

    const nextUserTable = createUndoSnapshot(
      getNormalizedState({ users: previousUserTable }).users
    );
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

  const UNDOABLEsetExtraDayColumnValue = (
    userIndex: number,
    extraColumnIndex: number,
    newExtraColumnValue: string
  ) => {
    const previousUserTable = createUndoSnapshot(usersRef.current);
    if (userIndex < 0 || userIndex >= previousUserTable.length) return;

    const nextUserTable = createUndoSnapshot(
      getNormalizedState({ users: previousUserTable }).users
    );
    const user = nextUserTable[userIndex];
    const days = [...user.days];

    while (days.length <= dayNumber) {
      days.push({ vote: '', action: '', extraColumns: [] });
    }

    const day = days[dayNumber];
    const updatedExtraColumns = [...(day.extraColumns || [])];
    updatedExtraColumns[extraColumnIndex] = newExtraColumnValue;

    days[dayNumber] = {
      ...day,
      extraColumns: updatedExtraColumns,
    };

    nextUserTable[userIndex] = {
      ...user,
      days,
    };

    // Update ref synchronously so handleTagsAdded sees the tag change
    usersRef.current = nextUserTable;
    executeCommand({
      action: () => setUserTable(createUndoSnapshot(nextUserTable)),
      undoAction: () => {
        usersRef.current = previousUserTable;
        setUserTable(createUndoSnapshot(previousUserTable));
      },
      description: 'Set Day Column Value',
    });
  };

  const UNDOABLEsetDayColumnTitle = (columnIndex: number, newTitle: string) => {
    const previousTitles = createUndoSnapshot(
      userTableTitleValue ?? { extraUserColumns: [], extraDayColumns: [] }
    );
    const nextTitles = createUndoSnapshot(getNormalizedState({ titles: previousTitles }).titles);
    nextTitles.extraDayColumns[columnIndex] = newTitle;

    executeCommand({
      action: () => setUserTableTitle(createUndoSnapshot(nextTitles)),
      undoAction: () => setUserTableTitle(createUndoSnapshot(previousTitles)),
      description: 'Set Day Column Title',
    });
  };

  const setDayBaseColumnSize = (columnKey: 'vote' | 'action', size: ColumnSizeOption) => {
    const currentSizes = columnSizes.value ?? defaultPlayerPageColumnSizes;
    setColumnSizes({
      ...currentSizes,
      dayBaseColumns: {
        ...currentSizes.dayBaseColumns,
        [columnKey]: size,
      },
    });
  };

  const setDayExtraColumnSize = (columnIndex: number, size: ColumnSizeOption) => {
    const currentSizes = columnSizes.value ?? defaultPlayerPageColumnSizes;
    const nextExtraColumnSizes = [...currentSizes.dayExtraColumns];
    nextExtraColumnSizes[columnIndex] = size;

    setColumnSizes({
      ...currentSizes,
      dayExtraColumns: nextExtraColumnSizes,
    });
  };

  const UNDOABLEaddDayColumn = () => {
    const previousTitles = createUndoSnapshot(
      userTableTitleValue ?? { extraUserColumns: [], extraDayColumns: [] }
    );
    const previousUserTable = createUndoSnapshot(userTableValue ?? []);
    const previousVisibility = createUndoSnapshot(
      columnVisibilityValue ?? { extraUserColumns: [], extraDayColumns: [] }
    );
    const previousSizes = createUndoSnapshot(columnSizes.value ?? defaultPlayerPageColumnSizes);

    const newTitle = `Column ${previousTitles.extraDayColumns.length + 1}`;
    const nextTitles = {
      ...previousTitles,
      extraDayColumns: [...previousTitles.extraDayColumns, newTitle],
    };

    const nextVisibilityInput = {
      ...previousVisibility,
      extraDayColumns: [...previousVisibility.extraDayColumns, true],
    };

    const nextSizesInput = {
      ...previousSizes,
      dayExtraColumns: [...previousSizes.dayExtraColumns, 'small' as ColumnSizeOption],
    };

    const normalizedNextState = getNormalizedState({
      titles: nextTitles,
      visibility: nextVisibilityInput,
      users: previousUserTable,
      columnSizes: nextSizesInput,
    });

    executeCommand({
      action: () => {
        setUserTableTitle(createUndoSnapshot(normalizedNextState.titles));
        setUserTable(createUndoSnapshot(normalizedNextState.users));
        setUserTableColumnVisibility(createUndoSnapshot(normalizedNextState.visibility));
        setColumnSizes(createUndoSnapshot(normalizedNextState.columnSizes));
      },
      undoAction: () => {
        setUserTableTitle(createUndoSnapshot(previousTitles));
        setUserTable(createUndoSnapshot(previousUserTable));
        setUserTableColumnVisibility(createUndoSnapshot(previousVisibility));
        setColumnSizes(createUndoSnapshot(previousSizes));
      },
      description: 'Add Day Column',
    });
  };

  const toggleNightlyVisibility = (columnIndex: number) => {
    const current = nightlyVisibilityValue ?? { extraUserColumns: [], extraDayColumns: [] };
    const colCount = titles.extraDayColumns.length;
    // Normalize to full length, defaulting to false (not shown in nightly)
    const normalized = Array.from(
      { length: colCount },
      (_, i) => current.extraDayColumns[i] ?? false
    );
    const currentValue = normalized[columnIndex] ?? false;
    const next = {
      ...current,
      extraDayColumns: normalized.map((v, index) => (index === columnIndex ? !currentValue : v)),
    };
    setNightlyVisibility(next);
  };

  const UNDOABLEdeleteDayColumn = (columnIndex: number) => {
    const previousTitles = createUndoSnapshot(
      userTableTitleValue ?? { extraUserColumns: [], extraDayColumns: [] }
    );
    const previousUserTable = createUndoSnapshot(userTableValue ?? []);
    const previousVisibility = createUndoSnapshot(
      columnVisibilityValue ?? { extraUserColumns: [], extraDayColumns: [] }
    );
    const previousSizes = createUndoSnapshot(columnSizes.value ?? defaultPlayerPageColumnSizes);
    const previousNightlyVisibility = createUndoSnapshot(
      nightlyVisibilityValue ?? { extraUserColumns: [], extraDayColumns: [] }
    );

    const nextTitles = {
      ...previousTitles,
      extraDayColumns: previousTitles.extraDayColumns.filter((_, index) => index !== columnIndex),
    };

    const nextVisibilityInput = {
      ...previousVisibility,
      extraDayColumns: previousVisibility.extraDayColumns.filter(
        (_, index) => index !== columnIndex
      ),
    };

    const nextSizesInput = {
      ...previousSizes,
      dayExtraColumns: previousSizes.dayExtraColumns.filter((_, index) => index !== columnIndex),
    };

    const nextNightlyVisibility = {
      ...previousNightlyVisibility,
      extraDayColumns: previousNightlyVisibility.extraDayColumns.filter(
        (_, index) => index !== columnIndex
      ),
    };

    const normalizedNextState = getNormalizedState({
      titles: nextTitles,
      visibility: nextVisibilityInput,
      users: previousUserTable,
      columnSizes: nextSizesInput,
    });

    executeCommand({
      action: () => {
        setUserTableTitle(createUndoSnapshot(normalizedNextState.titles));
        setUserTable(createUndoSnapshot(normalizedNextState.users));
        setUserTableColumnVisibility(createUndoSnapshot(normalizedNextState.visibility));
        setColumnSizes(createUndoSnapshot(normalizedNextState.columnSizes));
        setNightlyVisibility(createUndoSnapshot(nextNightlyVisibility));
      },
      undoAction: () => {
        setUserTableTitle(createUndoSnapshot(previousTitles));
        setUserTable(createUndoSnapshot(previousUserTable));
        setUserTableColumnVisibility(createUndoSnapshot(previousVisibility));
        setColumnSizes(createUndoSnapshot(previousSizes));
        setNightlyVisibility(createUndoSnapshot(previousNightlyVisibility));
      },
      description: 'Delete Day Column',
    });
  };

  const dayBaseColumnWidths = {
    vote: getWidthForColumnSize(112, columnSizes.value.dayBaseColumns.vote),
    action: getWidthForColumnSize(112, columnSizes.value.dayBaseColumns.action),
  };

  const extraDayColumnWidths = (userTableTitleValue?.extraDayColumns ?? []).map((_, index) => {
    return getWidthForColumnSize(112, columnSizes.value.dayExtraColumns[index]);
  });

  // Compute column cell IDs for column selection
  const voteColumnCellIds = users.map((_, i) => `d-v-${i}`);
  const actionColumnCellIds = users.map((_, i) => `d-a-${i}`);
  const extraColumnCellIds = (userTableTitleValue?.extraDayColumns ?? []).map((_, colIdx) =>
    users.map((_, i) => `d-e-${i}-${colIdx}`)
  );

  // Open the appropriate bulk editor based on the selected cell type
  const handleBulkEdit = () => {
    // Only handle days-table cell types
    if (cellType !== 'daysVote' && cellType !== 'daysAction' && cellType !== 'daysExtra') return;

    const firstId = Array.from(selectedCells)[0];
    if (!firstId) return;

    const parsed = parseDaysCellId(firstId);
    if (parsed.userIndex < 0 || parsed.userIndex >= users.length) return;

    const user = users[parsed.userIndex];
    const dayData = user.days[dayNumber] || { vote: '', action: '', extraColumns: [] };

    if (cellType === 'daysVote') {
      setBulkVoteInitial(dayData.vote || '');
      setBulkVoteMultiplier(dayData.voteMultiplier ?? 1);
      setIsBulkVoteEditorOpen(true);
    } else if (cellType === 'daysAction') {
      setBulkActionInitial(getPlayerActionSummary(dayData.action));
      setIsBulkActionEditorOpen(true);
    } else if (cellType === 'daysExtra') {
      setBulkTagInitial(dayData.extraColumns?.[parsed.columnIndex ?? 0] ?? '');
      setIsBulkTagEditorOpen(true);
    }
  };

  // Register this table's bulk-edit handler with the shared context
  useEffect(() => {
    return registerEditHandler(handleBulkEdit);
  }, [registerEditHandler, handleBulkEdit]);

  // Apply vote + multiplier to all selected vote cells in a single undoable command
  const handleBulkVoteUpdate = (vote: VoteValue, multiplier: number) => {
    const previousUserTable = createUndoSnapshot(userTableValue ?? []);
    const nextUserTable = createUndoSnapshot(
      getNormalizedState({ users: previousUserTable }).users
    );

    for (const cellId of selectedCells) {
      const parsed = parseDaysCellId(cellId);
      if (parsed.type !== 'daysVote') continue;
      const userIndex = parsed.userIndex;
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

  // Apply action to all selected action cells in a single undoable command
  const handleBulkActionUpdate = (action: string) => {
    const previousUserTable = createUndoSnapshot(userTableValue ?? []);
    const nextUserTable = createUndoSnapshot(
      getNormalizedState({ users: previousUserTable }).users
    );

    for (const cellId of selectedCells) {
      const parsed = parseDaysCellId(cellId);
      if (parsed.type !== 'daysAction') continue;
      const userIndex = parsed.userIndex;
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

  // Apply tag/text value to all selected extra cells in a single undoable command.
  // NOTE: Tag triggers are intentionally suppressed during bulk updates to avoid
  // cascading trigger side effects across many cells at once.
  const handleBulkTagUpdate = (newValue: string) => {
    const previousUserTable = createUndoSnapshot(usersRef.current);
    const nextUserTable = createUndoSnapshot(
      getNormalizedState({ users: previousUserTable }).users
    );

    for (const cellId of selectedCells) {
      const parsed = parseDaysCellId(cellId);
      if (parsed.type !== 'daysExtra' || parsed.columnIndex === undefined) continue;
      const userIndex = parsed.userIndex;
      if (userIndex < 0 || userIndex >= nextUserTable.length) continue;

      const user = nextUserTable[userIndex];
      const days = [...user.days];
      while (days.length <= dayNumber) {
        days.push({ vote: '', action: '', extraColumns: [] });
      }
      const extraColumns = [...(days[dayNumber].extraColumns || [])];
      extraColumns[parsed.columnIndex] = newValue;
      days[dayNumber] = { ...days[dayNumber], extraColumns };
      nextUserTable[userIndex] = { ...user, days };
    }

    usersRef.current = nextUserTable;
    executeCommand({
      action: () => setUserTable(createUndoSnapshot(nextUserTable)),
      undoAction: () => {
        usersRef.current = previousUserTable;
        setUserTable(createUndoSnapshot(previousUserTable));
      },
      description: 'Bulk Update Cells',
    });
    setIsBulkTagEditorOpen(false);
    exitSelectionMode();
  };

  return (
    <Column onLayout={onLayout} ref={tableRef} className="gap-0">
      <Row className="gap-0">
        <Column className={`border-border w-min gap-0 rounded border-2 ${className || ''}`}>
          <DayTitleRow
            userTableTitle={userTableTitleValue}
            userTableColumnVisibility={columnVisibilityValue}
            setColumnTitle={UNDOABLEsetDayColumnTitle}
            onEditStart={() => handleRowEditStart('title')}
            onEditEnd={handleRowEditEnd}
            isEditing={editingRow === 'title'}
            dayBaseColumnWidths={dayBaseColumnWidths}
            extraDayColumnWidths={extraDayColumnWidths}
            dayBaseColumnSizes={columnSizes.value.dayBaseColumns}
            extraDayColumnSizes={columnSizes.value.dayExtraColumns}
            onSetDayBaseColumnSize={setDayBaseColumnSize}
            onSetExtraDayColumnSize={setDayExtraColumnSize}
            onDeleteExtraDayColumn={UNDOABLEdeleteDayColumn}
            nightlyVisibility={nightlyVisibilityValue?.extraDayColumns}
            onToggleNightlyVisibility={toggleNightlyVisibility}
            selectionMode={selectionMode}
            columnCellIds={{
              vote: voteColumnCellIds,
              action: actionColumnCellIds,
              extra: extraColumnCellIds,
            }}
          />

          {users.map((user, index) => (
            <DayUserRow
              key={index}
              user={user}
              index={index}
              isLast={index === users.length - 1}
              dayNumber={dayNumber}
              gameId={gameId}
              setVoteValue={UNDOABLEsetVoteValue}
              setActionValue={UNDOABLEsetActionValue}
              setExtraColumnValue={UNDOABLEsetExtraDayColumnValue}
              userTableColumnVisibility={columnVisibilityValue}
              onEditStart={() => handleRowEditStart(index)}
              onEditEnd={handleRowEditEnd}
              isEditing={editingRow === index}
              dayBaseColumnWidths={dayBaseColumnWidths}
              extraDayColumnWidths={extraDayColumnWidths}
              users={users}
              dayColumnTitles={titles.extraDayColumns}
              onTagsAdded={handleTagsAdded}
              onTagsRemoved={handleTagsRemoved}
              selectionMode={selectionMode}
            />
          ))}
        </Column>
        {!selectionMode && (
          <Row className="bg-light -z-10 h-12 w-12 items-center justify-center gap-4">
            <AppButton variant="filled" className="h-8! w-8" onPress={UNDOABLEaddDayColumn}>
              <FontText weight="bold" color="white" className="mt-[-0.1rem] text-xl">
                +
              </FontText>
            </AppButton>
          </Row>
        )}
      </Row>

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

export default DaysTable;
