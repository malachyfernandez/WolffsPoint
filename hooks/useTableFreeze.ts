import { useList } from './useData';
import { useScheduledBatch } from './useScheduledUpdates';
import {
  UserTableColumnNightlyVisibility,
  UserTableColumnVisibility,
  UserTableItem,
  UserTableTitle,
} from '../types/playerTable';
import { DEFAULT_VOTE_MESSAGE, RoleTableItem } from '../types/roleTable';

const emptyTitles = { extraUserColumns: [], extraDayColumns: [] };

export const getPlayerDataBatchId = (gameId: string) => `game:${gameId}:player-data`;
export const getRolesBatchId = (gameId: string) => `game:${gameId}:roles`;

export const usePlayerDataFreeze = (gameId: string) => {
  const batchId = getPlayerDataBatchId(gameId);
  const batch = useScheduledBatch(batchId);
  const [userTable, setUserTable] = useList<UserTableItem[]>('userTable', gameId);
  const [userTableTitle, setUserTableTitle] = useList<UserTableTitle>('userTableTitle', gameId);
  const [columnVisibility, setColumnVisibility] = useList<UserTableColumnVisibility>(
    'userTableColumnVisibility',
    gameId
  );
  const [nightlyVisibility, setNightlyVisibility] = useList<UserTableColumnNightlyVisibility>(
    'userTableColumnNightlyVisibility',
    gameId
  );
  const [morningMessages, setMorningMessages] = useList<Record<string, string[]>>(
    'morningMessagesList',
    gameId
  );
  const isLoading =
    batch.isLoading ||
    userTable.state.isSyncing ||
    userTable.state.lastOpStatus === 'pending' ||
    userTableTitle.state.isSyncing ||
    userTableTitle.state.lastOpStatus === 'pending' ||
    columnVisibility.state.isSyncing ||
    columnVisibility.state.lastOpStatus === 'pending' ||
    nightlyVisibility.state.isSyncing ||
    nightlyVisibility.state.lastOpStatus === 'pending' ||
    morningMessages.state.isSyncing ||
    morningMessages.state.lastOpStatus === 'pending';

  const freeze = async () => {
    if (isLoading) throw new Error('Table data is still loading');
    await setUserTable(userTable.confirmedValue ?? userTable.value ?? [], { stage: true, batchId });
    await setUserTableTitle(userTableTitle.confirmedValue ?? userTableTitle.value ?? emptyTitles, {
      stage: true,
      batchId,
    });
    await setColumnVisibility(
      columnVisibility.confirmedValue ?? columnVisibility.value ?? emptyTitles,
      { stage: true, batchId }
    );
    await setNightlyVisibility(
      nightlyVisibility.confirmedValue ?? nightlyVisibility.value ?? emptyTitles,
      { stage: true, batchId }
    );
    await setMorningMessages(morningMessages.confirmedValue ?? morningMessages.value ?? {}, {
      stage: true,
      batchId,
    });
  };

  return { ...batch, isLoading, freeze };
};

export const useRolesFreeze = (gameId: string) => {
  const batchId = getRolesBatchId(gameId);
  const batch = useScheduledBatch(batchId);
  const [roleTable, setRoleTable] = useList<RoleTableItem[]>('roleTable', gameId);
  const [defaultVoteMessage, setDefaultVoteMessage] = useList<string>('voteMessageDefault', gameId);
  const isLoading =
    batch.isLoading ||
    roleTable.state.isSyncing ||
    roleTable.state.lastOpStatus === 'pending' ||
    defaultVoteMessage.state.isSyncing ||
    defaultVoteMessage.state.lastOpStatus === 'pending';

  const freeze = async () => {
    if (isLoading) throw new Error('Table data is still loading');
    await setRoleTable(roleTable.confirmedValue ?? roleTable.value ?? [], { stage: true, batchId });
    await setDefaultVoteMessage(
      defaultVoteMessage.confirmedValue ?? defaultVoteMessage.value ?? DEFAULT_VOTE_MESSAGE,
      { stage: true, batchId }
    );
  };

  return { ...batch, isLoading, freeze };
};
