import React, { useCallback, useEffect, useRef, useState } from 'react';
import FontText from '../ui/text/FontText';
import { useList, useValue } from 'hooks/useData';
import { deepEqual } from 'utils/deepEqual';
import Column from '../layout/Column';
import AppButton from '../ui/buttons/AppButton';
import Row from '../layout/Row';
import UserRow from './UserRow';
import TitleRow from './TitleRow';
import { createUndoSnapshot, useUndoRedo } from 'hooks/useUndoRedo';
import {
  UserTableItem,
  UserTableTitle,
  UserTableColumnVisibility,
  UserTableColumnNightlyVisibility,
} from 'types/playerTable';
import { normalizePlayerPageState } from './playerTableNormalization';
import { useTagTriggers, type CellContext } from '../../../hooks/useTagTriggers';
import {
  PlayerPageColumnSizes,
  defaultPlayerPageColumnSizes,
  getPlayerPageColumnSizesKey,
  getWidthForColumnSize,
  ColumnSizeOption,
} from './playerTableColumnSizing';

interface PlayerTableProps {
  gameId: string;
  doSync: boolean;
  setDoSync: (value: boolean) => void;
  isBeingEdited: boolean;
  setIsBeingEdited: (value: boolean) => void;
  className?: string;
  dayDatesArray: Date[];
  onColumnsReady?: (ready: boolean) => void;
}

const PlayerTable = ({
  gameId,
  doSync,
  setDoSync,
  isBeingEdited,
  setIsBeingEdited,
  className,
  dayDatesArray,
  onColumnsReady,
}: PlayerTableProps) => {
  const { executeCommand } = useUndoRedo();
  const [editingRow, setEditingRow] = useState<'title' | number | null>(null);

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

  const users = userTable?.value ?? [];
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

  const titles = userTableTitle?.value ?? { extraUserColumns: [], extraDayColumns: [] };
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
      userTableColumnVisibility?.state?.isSyncing ||
      nightlyVisibility?.state?.isSyncing
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
      titles: userTableTitle?.value,
      visibility: userTableColumnVisibility?.value,
      users: userTable?.value,
      targetDayCount: dayDatesArray.length,
    });

    const currentTitles = userTableTitle?.value ?? { extraUserColumns: [], extraDayColumns: [] };
    const currentVisibility = userTableColumnVisibility?.value ?? {
      extraUserColumns: [],
      extraDayColumns: [],
    };
    const currentUsers = userTable?.value ?? [];

    // Normalize nightly visibility to match column counts, defaulting to false
    const currentNightly = nightlyVisibility?.value ?? {
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

    if (!deepEqual(currentTitles, normalizedState.titles)) {
      setUserTableTitle(normalizedState.titles);
    }

    if (!deepEqual(currentVisibility, normalizedState.visibility)) {
      setUserTableColumnVisibility(normalizedState.visibility);
    }

    if (!deepEqual(currentUsers, normalizedState.users)) {
      setUserTable(normalizedState.users);
    }

    if (!deepEqual(currentNightly, normalizedNightly)) {
      setNightlyVisibility(normalizedNightly);
    }

    hasNormalizedOnceRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    userTable?.state?.isSyncing,
    userTableTitle?.state?.isSyncing,
    userTableColumnVisibility?.state?.isSyncing,
    nightlyVisibility?.state?.isSyncing,
    dayDatesArray.length,
  ]);

  const syncAllColumnsToTitles = useCallback(() => {
    const normalizedState = normalizePlayerPageState({
      titles: userTableTitle?.value,
      visibility: userTableColumnVisibility?.value,
      users: userTable?.value,
      targetDayCount: dayDatesArray.length,
    });

    setUserTableColumnVisibility(normalizedState.visibility);
    setUserTable(normalizedState.users);

    return {
      updatedVisibility: normalizedState.visibility,
      updatedUsers: normalizedState.users,
    };
  }, [
    dayDatesArray.length,
    setUserTable,
    setUserTableColumnVisibility,
    userTable?.value,
    userTableColumnVisibility?.value,
    userTableTitle?.value,
  ]);

  useEffect(() => {
    if (!doSync) return;

    syncAllColumnsToTitles();
    setDoSync(false);
  }, [doSync, setDoSync, syncAllColumnsToTitles]);

  const UNDOABLEsetLivingState = (userIndex: number, newLivingState: 'alive' | 'dead') => {
    const previousUserTable = createUndoSnapshot(userTable?.value ?? []);
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
    updatedExtraColumns[extraColumnIndex] = newExtraColumnValue;

    nextUserTable[userIndex] = {
      ...nextUserTable[userIndex],
      playerData: {
        ...nextUserTable[userIndex].playerData,
        extraColumns: updatedExtraColumns,
      },
    };

    // Update ref synchronously so handleTagsAdded sees the tag change
    usersRef.current = nextUserTable;
    executeCommand({
      action: () => setUserTable(createUndoSnapshot(nextUserTable)),
      undoAction: () => {
        usersRef.current = previousUserTable;
        setUserTable(createUndoSnapshot(previousUserTable));
      },
      description: 'Set Column Value',
    });
  };

  const UNDOABLEsetColumnTitle = (columnIndex: number, newTitle: string) => {
    const previousTitles = createUndoSnapshot(
      userTableTitle?.value ?? { extraUserColumns: [], extraDayColumns: [] }
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
      userTableTitle?.value ?? { extraUserColumns: [], extraDayColumns: [] }
    );
    const previousUserTable = createUndoSnapshot(userTable?.value ?? []);
    const previousVisibility = createUndoSnapshot(
      userTableColumnVisibility?.value ?? { extraUserColumns: [], extraDayColumns: [] }
    );

    const newTitle = `Column ${previousTitles.extraUserColumns.length + 1}`;
    const nextTitles = {
      ...previousTitles,
      extraUserColumns: [...previousTitles.extraUserColumns, newTitle],
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
      userTableColumnVisibility?.value ?? { extraUserColumns: [], extraDayColumns: [] }
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

  const toggleNightlyVisibility = (columnIndex: number) => {
    const current = nightlyVisibility?.value ?? { extraUserColumns: [], extraDayColumns: [] };
    const colCount = currentTitles.extraUserColumns.length;
    // Normalize to full length, defaulting to false (not shown in nightly)
    const normalized = Array.from(
      { length: colCount },
      (_, i) => current.extraUserColumns[i] ?? false
    );
    const currentValue = normalized[columnIndex] ?? false;
    const next = {
      ...current,
      extraUserColumns: normalized.map((v, index) => (index === columnIndex ? !currentValue : v)),
    };
    setNightlyVisibility(next);
  };

  // Subscribe to player page column sizes
  const [columnSizes, setColumnSizes] = useValue<PlayerPageColumnSizes>(
    getPlayerPageColumnSizesKey(gameId),
    { defaultValue: defaultPlayerPageColumnSizes, privacy: 'PUBLIC' }
  );

  // Calculate extra user column widths based on sizes
  const currentTitles = userTableTitle?.value ?? { extraUserColumns: [], extraDayColumns: [] };
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
      userTableTitle?.value ?? { extraUserColumns: [], extraDayColumns: [] }
    );
    const previousUserTable = createUndoSnapshot(userTable?.value ?? []);
    const previousVisibility = createUndoSnapshot(
      userTableColumnVisibility?.value ?? { extraUserColumns: [], extraDayColumns: [] }
    );
    const previousColumnSizes = createUndoSnapshot(
      columnSizes.value ?? defaultPlayerPageColumnSizes
    );
    const previousNightlyVisibility = createUndoSnapshot(
      nightlyVisibility?.value ?? { extraUserColumns: [], extraDayColumns: [] }
    );

    const nextTitles = {
      ...previousTitles,
      extraUserColumns: previousTitles.extraUserColumns.filter((_, i) => i !== columnIndex),
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

    const nextNightlyVisibility = {
      ...previousNightlyVisibility,
      extraUserColumns: previousNightlyVisibility.extraUserColumns.filter(
        (_, i) => i !== columnIndex
      ),
    };

    executeCommand({
      action: () => {
        setUserTableTitle(createUndoSnapshot(nextTitles));
        setUserTable(createUndoSnapshot(nextUserTable));
        setUserTableColumnVisibility(createUndoSnapshot(nextVisibility));
        setColumnSizes(createUndoSnapshot(nextColumnSizes));
        setNightlyVisibility(createUndoSnapshot(nextNightlyVisibility));
      },
      undoAction: () => {
        setUserTableTitle(createUndoSnapshot(previousTitles));
        setUserTable(createUndoSnapshot(previousUserTable));
        setUserTableColumnVisibility(createUndoSnapshot(previousVisibility));
        setColumnSizes(createUndoSnapshot(previousColumnSizes));
        setNightlyVisibility(createUndoSnapshot(previousNightlyVisibility));
      },
      description: 'Delete Column',
    });
  };

  return (
    <Column className="gap-0">
      <Row className="gap-0">
        <Column className={`border-border w-min gap-0 rounded border-2 ${className || ''}`}>
          <TitleRow
            userTableTitle={userTableTitle?.value}
            userTableColumnVisibility={userTableColumnVisibility?.value}
            setColumnTitle={UNDOABLEsetColumnTitle}
            setColumnVisibility={UNDOABLEsetColumnVisibility}
            onEditStart={() => handleRowEditStart('title')}
            onEditEnd={handleRowEditEnd}
            isEditing={editingRow === 'title'}
            extraUserColumnWidths={extraUserColumnWidths}
            extraUserColumnSizes={columnSizes.value?.playerExtraColumns}
            onSetExtraUserColumnSize={setExtraUserColumnSize}
            onDeleteExtraUserColumn={UNDOABLEdeleteExtraUserColumn}
            nightlyVisibility={nightlyVisibility?.value?.extraUserColumns}
            onToggleNightlyVisibility={toggleNightlyVisibility}
          />

          {users.map((user, index) => (
            <UserRow
              key={index}
              user={user}
              index={index}
              isLast={index === users.length - 1}
              setLivingState={UNDOABLEsetLivingState}
              setExtraColumnValue={UNDOABLEsetExtraColumnValue}
              userTableColumnVisibility={userTableColumnVisibility?.value}
              onEditStart={() => handleRowEditStart(index)}
              onEditEnd={handleRowEditEnd}
              isEditing={editingRow === index}
              gameId={gameId}
              extraUserColumnWidths={extraUserColumnWidths}
              userColumnTitles={titles.extraUserColumns}
              onTagsAdded={handleTagsAdded}
              onTagsRemoved={handleTagsRemoved}
            />
          ))}
        </Column>
        <Row className="bg-light -z-10 h-12 w-12 items-center justify-center gap-4">
          <AppButton variant="filled" className="h-8! w-8" onPress={UNDOABLEaddColumn}>
            <FontText weight="bold" color="white" className="mt-[-0.1rem] text-xl ">
              +
            </FontText>
          </AppButton>
        </Row>
      </Row>
    </Column>
  );
};

export default PlayerTable;
