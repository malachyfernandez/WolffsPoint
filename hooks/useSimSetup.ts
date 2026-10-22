import { useCallback } from 'react';
import { useList, useValue, useListSet, useFindListItems } from './useData';
import { useUserListRemove } from './useUserListRemove';
import { getGameScopedKey } from '../utils/multiplayer';
import { simGameIdFor } from '../contexts/SimContext';
import {
  SIM_SNAPSHOT_LIST_KEYS,
  SIM_SNAPSHOT_VAR_BASE_KEYS,
  simListKeyFor,
  simVariableKeyFor,
  simSharedItem,
  personaRecordKey,
  personaItemIdFor,
  personaIdForEmail,
  buildPersonaSeed,
} from '../utils/simUtils';
import type { UserTableItem } from '../types/playerTable';

/**
 * Operator-side sim management. Lives outside SimProvider: reads are the live
 * game's real records and writes go to literal sim-prefixed coordinates that
 * match what the useData redirect resolves inside a SimProvider.
 */
export const useSimSetup = (gameId: string) => {
  const setList = useListSet<any>();
  const removeListItem = useUserListRemove();
  const simGameId = simGameIdFor(gameId);

  // --- Live-game reads used for the start snapshot / cast import ---
  const [userTable] = useList<UserTableItem[]>('userTable', gameId);
  const [userTableTitle] = useList('userTableTitle', gameId);
  const [userTableColumnVisibility] = useList('userTableColumnVisibility', gameId);
  const [userTableColumnNightlyVisibility] = useList('userTableColumnNightlyVisibility', gameId);
  const [roleTable] = useList('roleTable', gameId);
  const [dayDatesArray] = useList<string[]>('dayDatesArray', gameId);
  const [numberOfRealDaysPerInGameDay] = useList('numberOfRealDaysPerInGameDay', gameId);
  const [selectedDayIndex] = useList('selectedDayIndex', gameId);
  const [skipActionsDays] = useList('skipActionsDays', gameId);
  const [skipVotingDays] = useList('skipVotingDays', gameId);
  const [voteMessageDefault] = useList('voteMessageDefault', gameId);
  const [newspaper] = useList('newspaper', gameId);
  const [morningMessagesList] = useList('morningMessagesList', gameId);
  const [useLegacySystemsFlag] = useList('useLegacySystems', gameId);
  const [cellModuleVersion] = useList('cellModuleVersion', gameId);

  const [gameSchedule] = useValue(getGameScopedKey('gameSchedule', gameId));
  const [ruleBook] = useValue(getGameScopedKey('ruleBook', gameId));
  const [scriptFiles] = useValue(getGameScopedKey('scriptFiles', gameId));
  const [tagDefinitions] = useValue(getGameScopedKey('tagDefinitions', gameId));
  const [tagTriggers] = useValue(getGameScopedKey('tagTriggers', gameId));
  const [nightlyPageColumnSizes] = useValue(getGameScopedKey('nightlyPageColumnSizes', gameId));
  const [playerPageColumnSizes] = useValue(getGameScopedKey('playerPageColumnSizes', gameId));

  // --- Sim-space reads (literal coordinates, same as the redirect) ---
  const [simUserTable, setSimUserTable] = useList<UserTableItem[]>(
    simListKeyFor(gameId, 'userTable'),
    simGameId
  );
  const simUserTableTitle = useList(simListKeyFor(gameId, 'userTableTitle'), simGameId)[0];

  // Persona items already written - used to skip re-seeding players whose
  // records exist, so persona edits (bio, name) aren't clobbered.
  const personaUserDataItems = useFindListItems(personaRecordKey(gameId, 'userData'), {
    returnTop: 500,
  });
  const personaProfileItems = useFindListItems(
    personaRecordKey(gameId, getGameScopedKey('playerProfile', simGameId)),
    { returnTop: 500 }
  );

  const writeValueAt = useCallback(
    (item: { key: string; itemId: string; value: any }) =>
      setList({ key: item.key, itemId: item.itemId, value: item.value, privacy: 'PUBLIC' }),
    [setList]
  );

  /**
   * Writes the userData + playerProfile items every roster row needs so each
   * sim player is addressable as a persona (view-as, phonebook, own records)
   * without having to be viewed first. Skips personas that already have
   * records so their edits aren't clobbered.
   */
  const seedMissingPersonas = useCallback(
    (rows: Pick<UserTableItem, 'realName' | 'email'>[]) => {
      const userDataIds = new Set((personaUserDataItems ?? []).map((r) => r.itemId));
      const profileIds = new Set((personaProfileItems ?? []).map((r) => r.itemId));
      for (const row of rows) {
        if (!row.email?.trim()) continue;
        const itemId = personaItemIdFor(personaIdForEmail(row.email));
        if (userDataIds.has(itemId) && profileIds.has(itemId)) continue;
        const seed = buildPersonaSeed(gameId, row);
        if (!userDataIds.has(itemId)) void writeValueAt(seed.userDataItem);
        if (!profileIds.has(itemId)) void writeValueAt(seed.profileItem);
      }
    },
    [gameId, personaUserDataItems, personaProfileItems, writeValueAt]
  );

  /**
   * Snapshot the live game's config records into the sim namespace. Runs on
   * "Start simulation" and "Re-sync from live". Awaited by callers so the sim
   * view only mounts after its config exists.
   */
  const snapshotConfig = useCallback(async () => {
    const writes: Promise<unknown>[] = [];
    const listValues: Record<string, any> = {
      // Sims start with an empty roster - the operator populates it via the
      // manage dialog (add rows, one-of-each-role, or reset from live cast).
      userTable: [],
      userTableTitle: userTableTitle?.value,
      userTableColumnVisibility: userTableColumnVisibility?.value,
      userTableColumnNightlyVisibility: userTableColumnNightlyVisibility?.value,
      roleTable: roleTable?.value,
      dayDatesArray: dayDatesArray?.value,
      numberOfRealDaysPerInGameDay: numberOfRealDaysPerInGameDay?.value,
      selectedDayIndex: selectedDayIndex?.value,
      skipActionsDays: skipActionsDays?.value,
      skipVotingDays: skipVotingDays?.value,
      voteMessageDefault: voteMessageDefault?.value,
      newspaper: newspaper?.value,
      morningMessagesList: morningMessagesList?.value,
      useLegacySystems: useLegacySystemsFlag?.value,
      cellModuleVersion: cellModuleVersion?.value,
    };
    for (const key of SIM_SNAPSHOT_LIST_KEYS) {
      const value = listValues[key];
      if (value === undefined || value === null) continue;
      writes.push(
        setList({ key: simListKeyFor(gameId, key), itemId: simGameId, value, privacy: 'PUBLIC' })
      );
    }

    const varValues: Record<string, any> = {
      gameSchedule: gameSchedule?.value,
      ruleBook: ruleBook?.value,
      scriptFiles: scriptFiles?.value,
      tagDefinitions: tagDefinitions?.value,
      tagTriggers: tagTriggers?.value,
      nightlyPageColumnSizes: nightlyPageColumnSizes?.value,
      playerPageColumnSizes: playerPageColumnSizes?.value,
    };
    for (const base of SIM_SNAPSHOT_VAR_BASE_KEYS) {
      const value = varValues[base];
      if (value === undefined || value === null) continue;
      // Variables resolve to 'sim:shared' list items inside the sim.
      writes.push(
        setList({
          key: simVariableKeyFor(gameId, base),
          itemId: simSharedItem,
          value,
          privacy: 'PUBLIC',
        })
      );
    }
    await Promise.all(writes);
  }, [
    setList,
    gameId,
    simGameId,
    userTableTitle,
    userTableColumnVisibility,
    userTableColumnNightlyVisibility,
    roleTable,
    dayDatesArray,
    numberOfRealDaysPerInGameDay,
    selectedDayIndex,
    skipActionsDays,
    skipVotingDays,
    voteMessageDefault,
    newspaper,
    morningMessagesList,
    useLegacySystemsFlag,
    cellModuleVersion,
    gameSchedule,
    ruleBook,
    scriptFiles,
    tagDefinitions,
    tagTriggers,
    nightlyPageColumnSizes,
    playerPageColumnSizes,
  ]);

  /**
   * Writes the two persona records a roster player needs (userData + claimed
   * playerProfile) so the player UI mounts as them. Idempotent upsert.
   */
  const seedPersona = useCallback(
    async (player: Pick<UserTableItem, 'realName' | 'email'>) => {
      const seed = buildPersonaSeed(gameId, player);
      // Await both writes: the persona view mounts right after and its gate
      // would auto-create empty records if they landed later.
      await Promise.all([writeValueAt(seed.userDataItem), writeValueAt(seed.profileItem)]);
    },
    [gameId, writeValueAt]
  );

  /** Copies the live roster into the sim userTable (replaces existing rows). */
  const importRealCast = useCallback(() => {
    const rows = userTable?.value ?? [];
    setSimUserTable(rows);
    seedMissingPersonas(rows);
    return rows;
  }, [userTable, setSimUserTable, seedMissingPersonas]);

  /** Adds one faux player row to the sim roster. */
  const addSimPlayer = useCallback(
    (player: UserTableItem) => {
      const rows = simUserTable?.value ?? [];
      setSimUserTable([...rows, player]);
      seedMissingPersonas([player]);
    },
    [simUserTable, setSimUserTable, seedMissingPersonas]
  );

  const updateSimPlayers = useCallback(
    (players: UserTableItem[]) => {
      setSimUserTable(players);
      seedMissingPersonas(players);
    },
    [setSimUserTable, seedMissingPersonas]
  );

  /** Removes every sim record we can enumerate (roster + shared config). */
  const wipeSimData = useCallback(() => {
    for (const key of SIM_SNAPSHOT_LIST_KEYS) {
      removeListItem({ key: simListKeyFor(gameId, key), itemId: simGameId });
    }
    for (const base of SIM_SNAPSHOT_VAR_BASE_KEYS) {
      removeListItem({ key: simVariableKeyFor(gameId, base), itemId: simSharedItem });
    }
  }, [removeListItem, gameId, simGameId]);

  return {
    snapshotConfig,
    seedPersona,
    importRealCast,
    addSimPlayer,
    updateSimPlayers,
    wipeSimData,
    simRoster: simUserTable?.value ?? [],
    simRosterRecord: simUserTable,
    simUserTableTitle: simUserTableTitle?.value,
    liveUserTable: userTable?.value ?? [],
  };
};
