import React, { useEffect, useState } from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
import FontText from '../ui/text/FontText';
import { useList, useValue } from 'hooks/useData';
import Column from '../layout/Column';
import AppButton from '../ui/buttons/AppButton';
import Row from '../layout/Row';
import NightlyUserRow from './NightlyUserRow';
import NightlyTitleRow from './NightlyTitleRow';
import { createUndoSnapshot, useUndoRedo } from 'hooks/useUndoRedo';
import { UserTableItem, UserTableTitle, UserTableColumnNightlyVisibility } from 'types/playerTable';
import {
  ColumnSizeOption,
  PlayerPageColumnSizes,
  defaultPlayerPageColumnSizes,
  getPlayerPageColumnSizesKey,
  getWidthForColumnSize,
} from './playerTableColumnSizing';

interface NightlyPlayerTableProps {
  gameId: string;
  doSync: boolean;
  setDoSync: (value: boolean) => void;
  isBeingEdited: boolean;
  setIsBeingEdited: (value: boolean) => void;
  className?: string;
  dayDatesArray: Date[];
  updatePlayerLivingState: (userIndex: number, livingState: 'alive' | 'dead') => void;
  onColumnsReady?: (ready: boolean) => void;
}

const NightlyPlayerTable = ({
  gameId,
  doSync,
  setDoSync,
  isBeingEdited,
  setIsBeingEdited,
  className,
  dayDatesArray,
  updatePlayerLivingState,
  onColumnsReady,
}: NightlyPlayerTableProps) => {
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

  const [userTable, setUserTable] = useList<UserTableItem[]>('userTable', gameId, {
    privacy: 'PUBLIC',
  });

  const users = userTable?.value ?? [];

  const [selectedDayIndex, setSelectedDayIndex] = useList<number>('selectedDayIndex', gameId, {
    privacy: 'PUBLIC',
    defaultValue: 0,
  });

  const [userTableTitle] = useList<UserTableTitle>('userTableTitle', gameId, { privacy: 'PUBLIC' });
  const [nightlyVisibility] = useList<UserTableColumnNightlyVisibility>(
    'userTableColumnNightlyVisibility',
    gameId,
    { privacy: 'PUBLIC' }
  );
  const [columnSizes] = useValue<PlayerPageColumnSizes>(getPlayerPageColumnSizesKey(gameId), {
    defaultValue: defaultPlayerPageColumnSizes,
    privacy: 'PUBLIC',
  });

  const titles = userTableTitle?.value ?? { extraUserColumns: [], extraDayColumns: [] };
  const nightlyVis = nightlyVisibility?.value ?? { extraUserColumns: [], extraDayColumns: [] };

  // Compute which extra user columns are visible in nightly
  const nightlyExtraUserColumns = titles.extraUserColumns
    .map((title, index) => ({ title, index, visible: nightlyVis.extraUserColumns[index] ?? false }))
    .filter((col) => col.visible);

  const extraUserColumnWidths = nightlyExtraUserColumns.map((col) =>
    getWidthForColumnSize(112, columnSizes.value?.playerExtraColumns?.[col.index] ?? 'small')
  );

  // Track when column data is ready (only check isSyncing)
  const areColumnsReady = !userTable?.state?.isSyncing && !selectedDayIndex?.state?.isSyncing;

  useEffect(() => {
    onColumnsReady?.(areColumnsReady);
  }, [areColumnsReady, onColumnsReady]);

  useEffect(() => {
    if (!doSync) return;
    setDoSync(false);
  }, [doSync]);

  const UNDOABLEupdatePlayerLivingState = (userIndex: number, livingState: 'alive' | 'dead') => {
    const previousUserTable = createUndoSnapshot(userTable?.value ?? []);
    if (userIndex < 0 || userIndex >= previousUserTable.length) return;

    const nextUserTable = createUndoSnapshot(previousUserTable);
    nextUserTable[userIndex] = {
      ...nextUserTable[userIndex],
      playerData: {
        ...nextUserTable[userIndex].playerData,
        livingState: livingState,
      },
    };

    executeCommand({
      action: () => updatePlayerLivingState(userIndex, livingState),
      undoAction: () =>
        updatePlayerLivingState(userIndex, previousUserTable[userIndex].playerData.livingState),
      description: 'Change Living State',
    });
  };

  return (
    <Column className="gap-0">
      <Row className="gap-0">
        <Column className={`border-border w-min gap-0 rounded border-2 ${className || ''}`}>
          <NightlyTitleRow
            onEditStart={() => handleRowEditStart('title')}
            onEditEnd={handleRowEditEnd}
            isEditing={editingRow === 'title'}
            extraUserColumns={nightlyExtraUserColumns.map((c) => c.title)}
            extraUserColumnWidths={extraUserColumnWidths}
          />

          {users.map((user, index) => (
            <Animated.View key={index} entering={FadeIn.duration(300).delay(index * 50)}>
              <NightlyUserRow
                user={user}
                index={index}
                isLast={index === users.length - 1}
                updatePlayerLivingState={UNDOABLEupdatePlayerLivingState}
                onEditStart={() => handleRowEditStart(index)}
                onEditEnd={handleRowEditEnd}
                isEditing={editingRow === index}
                gameId={gameId}
                extraUserColumnIndices={nightlyExtraUserColumns.map((c) => c.index)}
                extraUserColumnWidths={extraUserColumnWidths}
                extraUserColumnTitles={nightlyExtraUserColumns.map((c) => c.title)}
              />
            </Animated.View>
          ))}
        </Column>
      </Row>
    </Column>
  );
};

export default NightlyPlayerTable;
