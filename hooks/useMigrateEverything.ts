import { useCallback, useRef, useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useFindListItems, useList, useValue, useListSet } from './useData';
import { encodeUserValue } from './userValueSerialization';
import { getGameScopedKey } from '../utils/multiplayer';
import {
  CELL_MODULE_VERSION_KEY,
  DISPLAY_MODULE_VERSION,
  LEGACY_SYSTEMS_KEY,
} from '../utils/legacySystems';
import {
  migrateLegacyContent,
  rebaseCopiedCertificationSources,
  type MigrationStats,
} from '../utils/legacyMigration';
import type { RoleTableItem } from '../types/roleTable';
import type { UserTableItem, UserTableTitle } from '../types/playerTable';
import type { ScriptFilesDoc } from '../utils/scriptFiles';

/** Every game-scoped list item copied into the migration copy. */
const LIST_KEYS = [
  'userTable',
  'userTableTitle',
  'userTableColumnVisibility',
  'userTableColumnNightlyVisibility',
  'roleTable',
  'dayDatesArray',
  'numberOfRealDaysPerInGameDay',
  'selectedDayIndex',
  'skipActionsDays',
  'skipVotingDays',
  'voteMessageDefault',
  'newspaper',
  'morningMessagesList',
] as const;

/** Every game-scoped variable copied into the migration copy. */
const VAR_KEYS = [
  'gameSchedule',
  'ruleBook',
  'scriptFiles',
  'tagDefinitions',
  'tagTriggers',
  'nightlyPageColumnSizes',
  'playerPageColumnSizes',
] as const;

interface GameInfoValue {
  id: string;
  name: string;
  description?: string;
}

/**
 * "Migrate everything": clones the game into a new project
 * ("{name} (migration copy)") and runs the full legacy -> files migration
 * inside the copy. The original game is never touched; the copy lands with
 * legacy systems off so the result is visible immediately.
 */
export const useMigrateEverything = (gameId: string) => {
  const setList = useListSet<any>();
  const setVar = useMutation(api.user_vars.set);
  const [state, setState] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  const [stats, setStats] = useState<MigrationStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  const gameRows = useFindListItems<GameInfoValue>('games', { itemId: gameId, returnTop: 1 });

  const [userTable] = useList<UserTableItem[]>('userTable', gameId);
  const [userTableTitle] = useList<UserTableTitle>('userTableTitle', gameId);
  const [userTableColumnVisibility] = useList('userTableColumnVisibility', gameId);
  const [userTableColumnNightlyVisibility] = useList('userTableColumnNightlyVisibility', gameId);
  const [roleTable] = useList<RoleTableItem[]>('roleTable', gameId);
  const [dayDatesArray] = useList<string[]>('dayDatesArray', gameId);
  const [numberOfRealDaysPerInGameDay] = useList('numberOfRealDaysPerInGameDay', gameId);
  const [selectedDayIndex] = useList('selectedDayIndex', gameId);
  const [skipActionsDays] = useList('skipActionsDays', gameId);
  const [skipVotingDays] = useList('skipVotingDays', gameId);
  const [voteMessageDefault] = useList<string>('voteMessageDefault', gameId);
  const [newspaper] = useList('newspaper', gameId);
  const [morningMessagesList] = useList<Record<string, string[]>>('morningMessagesList', gameId);

  const [gameSchedule] = useValue(getGameScopedKey('gameSchedule', gameId));
  const [ruleBook] = useValue(getGameScopedKey('ruleBook', gameId));
  const [scriptFiles] = useValue<ScriptFilesDoc>(getGameScopedKey('scriptFiles', gameId));
  const [tagDefinitions] = useValue<any[]>(getGameScopedKey('tagDefinitions', gameId));
  const [tagTriggers] = useValue<Record<string, string>>(getGameScopedKey('tagTriggers', gameId));
  const [nightlyPageColumnSizes] = useValue(getGameScopedKey('nightlyPageColumnSizes', gameId));
  const [playerPageColumnSizes] = useValue(getGameScopedKey('playerPageColumnSizes', gameId));

  const records = [
    userTable,
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
    gameSchedule,
    ruleBook,
    scriptFiles,
    tagDefinitions,
    tagTriggers,
    nightlyPageColumnSizes,
    playerPageColumnSizes,
  ];
  const ready =
    !!gameRows?.length &&
    records.every(
      (record) =>
        record &&
        !record.state.isSyncing &&
        !record.scheduledUpdate &&
        record.state.lastOpStatus !== 'pending' &&
        record.state.lastOpStatus !== 'timed_out'
    );

  const migrate = useCallback(async (): Promise<string | null> => {
    if (busy.current || !ready) return null;
    busy.current = true;
    setError(null);
    setState('working');
    try {
      const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      const newGameId = `${gameId}-mig${suffix}`;
      const gameInfo = gameRows?.[0]?.value;

      // Build everything before creating the visible copy.
      const out = migrateLegacyContent({
        scriptFilesDoc: scriptFiles?.value,
        tagDefinitions: tagDefinitions?.value,
        tagTriggers: tagTriggers?.value,
        roleTable: roleTable?.value,
        voteMessageDefault: voteMessageDefault?.value,
        morningMessagesList: morningMessagesList?.value,
        userTable: userTable?.value,
        userTableTitle: userTableTitle?.value,
        ruleBook: ruleBook?.value,
      });
      if (out.stats.skipped.length)
        throw new Error(`Migration could not convert: ${out.stats.skipped.join(', ')}`);
      setStats(out.stats);

      const writes: Promise<unknown>[] = [];
      const lists: Record<string, any> = {
        userTable: rebaseCopiedCertificationSources(out.userTable, gameId, newGameId),
        userTableTitle: userTableTitle?.value,
        userTableColumnVisibility: userTableColumnVisibility?.value,
        userTableColumnNightlyVisibility: userTableColumnNightlyVisibility?.value,
        roleTable: out.roleTable,
        dayDatesArray: dayDatesArray?.value,
        numberOfRealDaysPerInGameDay: numberOfRealDaysPerInGameDay?.value,
        selectedDayIndex: selectedDayIndex?.value,
        skipActionsDays: skipActionsDays?.value,
        skipVotingDays: skipVotingDays?.value,
        voteMessageDefault: out.voteMessageDefault,
        newspaper: newspaper?.value,
        morningMessagesList: rebaseCopiedCertificationSources(
          out.morningMessagesList,
          gameId,
          newGameId
        ),
      };
      for (const key of LIST_KEYS) {
        const value = lists[key];
        if (value === undefined) continue;
        writes.push(
          setList({
            key,
            itemId: newGameId,
            value,
            privacy: 'PUBLIC',
            ...(['userTable', 'morningMessagesList'].includes(key)
              ? { cellWriteOrigin: 'restore' }
              : {}),
          })
        );
      }
      const vars: Record<string, any> = {
        gameSchedule: gameSchedule?.value,
        ruleBook: out.ruleBook,
        scriptFiles: out.scriptFilesDoc,
        tagDefinitions: out.tagDefinitions,
        tagTriggers: out.tagTriggers,
        nightlyPageColumnSizes: nightlyPageColumnSizes?.value,
        playerPageColumnSizes: playerPageColumnSizes?.value,
      };
      for (const base of VAR_KEYS) {
        const value = vars[base];
        if (value === undefined) continue;
        writes.push(
          setVar({
            key: getGameScopedKey(base, newGameId),
            value: encodeUserValue(value),
            privacy: 'PUBLIC',
          })
        );
      }
      await Promise.all(writes);
      // Completion is written last. A partial copy is never advertised as migrated.
      await setList({
        key: LEGACY_SYSTEMS_KEY,
        itemId: newGameId,
        value: false,
        privacy: 'PUBLIC',
      });
      await setList({
        key: CELL_MODULE_VERSION_KEY,
        itemId: newGameId,
        value: DISPLAY_MODULE_VERSION,
        privacy: 'PUBLIC',
      });
      await setList({
        key: 'games',
        itemId: newGameId,
        value: {
          id: newGameId,
          name: `${gameInfo?.name ?? gameId} (migration copy)`,
          description: gameInfo?.description ?? '',
        },
        privacy: 'PUBLIC',
      });
      setState('done');
      return newGameId;
    } catch (error) {
      console.error('useMigrateEverything failed', error);
      setError(error instanceof Error ? error.message : 'Unable to finish the upgrade');
      setState('error');
      return null;
    } finally {
      busy.current = false;
    }
  }, [
    gameId,
    ready,
    gameRows,
    userTable,
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
    gameSchedule,
    ruleBook,
    scriptFiles,
    tagDefinitions,
    tagTriggers,
    nightlyPageColumnSizes,
    playerPageColumnSizes,
    setList,
    setVar,
  ]);

  return { migrate, state, stats, ready, error };
};
