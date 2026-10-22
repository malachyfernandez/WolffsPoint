import { useCallback, useMemo, useRef } from 'react';
import { useList, useValue } from './useData';
import { useScriptFilesReader } from './useScriptFiles';
import { createClientId, getGameScopedKey } from '../utils/multiplayer';
import { UserTableItem, UserTableTitle } from '../types/playerTable';
import { interpretScript } from '../script/runtime/interpreter';
import { createScriptGlobals } from '../script/runtime/sources';
import { isMorningMessage } from '../utils/applyTableUpdates';
import {
  applyCellOps,
  applyMorningMessageOps,
  collectTagPlacements,
  deadPlacementsBetween,
  newPlacementsBetween,
  revertDeadTagPlacements,
  stableCellAddress,
  pruneUnsupportedTagPlacements,
} from '../utils/cellOps';
import { effectiveCellText, tagPlacementSrc, MANUAL_SRC, type TagRef } from '../utils/cellPieces';
import { TableUpdate } from '../script/registry';
import { trackManualTableChanges } from '../utils/fieldProvenance';
import {
  findTagFile,
  tagFileRemovedSource,
  tagFileTriggerSource,
  tagLookupFromIndex,
  type ScriptFilesIndex,
} from '../utils/scriptFiles';

/**
 * Tag trigger sources keyed by legacy tag name (the old `tagTriggers`
 * record). File-backed tags resolve through the `tags/` folder first.
 */
type TagTriggersData = Record<string, string>;

export interface CellContext {
  playerIndex: number;
  /** null for player-level columns, 0-based day index for day columns */
  dayIndex: number | null;
  /** Column title */
  column: string;
}

/** Everything trigger resolution/execution needs: file-first scripts,
 *  effective cell text, id-aware tag lookup. */
export interface TagTriggerEnv {
  strict?: boolean;
  index?: ScriptFilesIndex;
  legacyTriggers: TagTriggersData;
}

/** Resolve a tag's trigger script: `tags/` file first, legacy record second.
 *  For file tags, the body is the on-tag script - on 'removed' only explicit
 *  OnTagRemoved blocks run (the system reverts tracked ops). */
export const resolveTagTrigger = (
  ref: TagRef,
  env: TagTriggerEnv,
  mode: 'added' | 'removed' = 'added'
): string | null => {
  if (env.index) {
    const file = findTagFile(env.index, ref);
    if (file) {
      const body = mode === 'removed' ? tagFileRemovedSource(file) : tagFileTriggerSource(file);
      if (body.trim()) return body;
      // A tag file with any body is the ground truth for its tag - on
      // 'removed', "no OnTagRemoved blocks" means nothing runs (tracked ops
      // already reverted). A completely empty file is a name-only stub: fall
      // through to the legacy record.
      if (mode === 'removed' && tagFileTriggerSource(file).trim()) return null;
    }
  }
  const legacy = ref.name ? env.legacyTriggers[ref.name] : undefined;
  return legacy && legacy.trim() ? legacy : null;
};

/** Build a runtime player entry from a UserTableItem (same shape as createScriptGlobals). */
const buildPlayerEntry = (
  player: UserTableItem,
  titles: UserTableTitle,
  morningMessagesForPlayer?: string[]
): Record<string, unknown> => {
  const extraUserColumnTitles = titles.extraUserColumns ?? [];
  const extraDayColumnTitles = titles.extraDayColumns ?? [];
  const playerEntry: Record<string, unknown> = {
    realName: player.realName,
    email: player.email,
    userId: player.userId,
    role: player.role,
    isAlive: player.playerData.livingState === 'alive',
    days: (player.days ?? []).map((day, dayIndex) => {
      const base: Record<string, unknown> = {
        vote: day?.vote ?? '',
        action: day?.action ?? '',
        morningMessage: morningMessagesForPlayer?.[dayIndex] ?? '',
      };
      const extra = day?.extraColumns ?? [];
      for (let i = 0; i < extraDayColumnTitles.length; i++) {
        base[extraDayColumnTitles[i]] = extra[i] ?? '';
      }
      return base;
    }),
  };
  const extra = player.playerData.extraColumns ?? [];
  for (let i = 0; i < extraUserColumnTitles.length; i++) {
    playerEntry[extraUserColumnTitles[i]] = extra[i] ?? '';
  }
  return playerEntry;
};

/** Build a getCellValue function that reads *effective* cell text. */
const buildGetCellValue = (
  users: UserTableItem[],
  titles: UserTableTitle,
  env: TagTriggerEnv,
  morningMessagesList?: Record<string, string[]>
) => {
  const extraUserColumnTitles = titles.extraUserColumns ?? [];
  const extraDayColumnTitles = titles.extraDayColumns ?? [];
  const eff = (raw: string) => effectiveCellText(raw, env.index);
  return (playerIndex: number | null, dayIdx: number | null, col: string): string => {
    const indices = playerIndex === null ? users.map((_, i) => i) : [playerIndex];
    if (indices.length === 0) return '';
    const idx = indices[0];
    if (idx < 0 || idx >= users.length) return '';
    const user = users[idx];
    const colLower = col.toLowerCase();
    if (dayIdx === null) {
      if (colLower === 'livingstate') return user.playerData.livingState;
      const colIdx = extraUserColumnTitles.findIndex((t) => t.toLowerCase() === colLower);
      if (colIdx === -1) return '';
      return eff(user.playerData.extraColumns?.[colIdx] ?? '');
    } else {
      if (colLower === 'morningmessage') {
        if (!morningMessagesList) return '';
        return eff(morningMessagesList[user.email.toLowerCase()]?.[dayIdx] ?? '');
      }
      if (colLower === 'votemultiplier') {
        const day = user.days?.[dayIdx];
        return String(day?.voteMultiplier ?? 1);
      }
      if (colLower === 'vote') {
        const day = user.days?.[dayIdx];
        return Array.isArray(day?.vote) ? JSON.stringify(day.vote) : (day?.vote ?? '');
      }
      if (colLower === 'action') {
        const day = user.days?.[dayIdx];
        return typeof day?.action === 'string' ? day.action : '';
      }
      const colIdx = extraDayColumnTitles.findIndex((t) => t.toLowerCase() === colLower);
      if (colIdx === -1) return '';
      const day = user.days?.[dayIdx];
      return eff(day?.extraColumns?.[colIdx] ?? '');
    }
  };
};

/** Result of firing a trigger: updated users + updated morning messages. */
export interface TriggerResult {
  users: UserTableItem[];
  morningMessages?: Record<string, string[]>;
}

/**
 * Fire trigger scripts for a single tag placement on a single cell.
 * Writes are attributed to the placement's source key
 * (`tag:{ref}@{addr}`), so they revert automatically when the placement dies.
 */
export const fireSingleTagTrigger = (
  ref: TagRef,
  triggerScript: string,
  context: CellContext,
  users: UserTableItem[],
  titles: UserTableTitle,
  mode: 'added' | 'removed',
  env: TagTriggerEnv,
  morningMessagesList?: Record<string, string[]>
): TriggerResult => {
  const { playerIndex, dayIndex, column } = context;
  const player = users[playerIndex];
  if (!player) return { users, morningMessages: morningMessagesList };

  let result = users;
  let morningMessages = morningMessagesList;
  const playerEntry = buildPlayerEntry(
    player,
    titles,
    morningMessages?.[player.email.toLowerCase()]
  );

  const globals = {
    ...createScriptGlobals({
      capability: 'operator',
      players: result as unknown as UserTableItem[],
      userTableTitle: titles,
      morningMessagesList: morningMessages,
      filesIndex: env.index,
    }),
    placedTag: ref.name,
    placedUser: playerEntry,
    placedDay: dayIndex,
    placedColumn: column,
  };

  const getCellValue = buildGetCellValue(result, titles, env, morningMessages);
  const placementSource = tagPlacementSrc(
    ref,
    stableCellAddress(users, titles, context.playerIndex, context.dayIndex, context.column)
  );
  // Explicit removal handlers create independent events. Their new tags must
  // not be pruned as unsupported children of a placement that no longer exists.
  const contributionSource =
    mode === 'removed'
      ? `${placementSource.replace(/^tag:tracked:/, 'tag:removed:')}|${createClientId('event')}`
      : placementSource;
  const updates: TableUpdate[] = [];
  try {
    const triggerResult = interpretScript(triggerScript, {
      globals,
      tableUpdates: updates,
      getCellValue,
      triggerMode: mode,
      contributionSource,
      filesIndex: env.index,
    });
    if (triggerResult.issues.length > 0) {
      if (env.strict)
        throw new Error(
          `Tag "${ref.name}": ${triggerResult.issues.map((issue) => issue.message).join('; ')}`
        );
      console.warn(
        `Tag trigger "${ref.name}" issues:`,
        triggerResult.issues.map((i) => i.message)
      );
    }
  } catch (error) {
    if (env.strict) throw error;
    console.warn(
      `Tag trigger "${ref.name}" failed:`,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }

  if (updates.length > 0) {
    const morningUpdates = updates.filter((u) => isMorningMessage(u.column));
    const regularUpdates = updates.filter((u) => !isMorningMessage(u.column));
    const tagLookup = env.index ? tagLookupFromIndex(env.index) : undefined;
    if (regularUpdates.length > 0) {
      result = applyCellOps(result, regularUpdates, titles, { tagLookup, filesIndex: env.index });
    }
    if (morningMessages && morningUpdates.length > 0) {
      morningMessages = applyMorningMessageOps(morningMessages, morningUpdates, result, {
        tagLookup,
        filesIndex: env.index,
      });
    }
  }
  return { users: result, morningMessages };
};

/**
 * Reconcile tag placements after a table change: diff visible placements
 * before/after, fire on-added triggers for new ones, revert + fire
 * on-removed for dead ones. Trigger writes may themselves create or kill
 * placements, so iterate to a fixpoint (bounded).
 */
export const runTagTriggerFixpoint = (
  beforeUsers: UserTableItem[],
  afterUsers: UserTableItem[],
  titles: UserTableTitle,
  env: TagTriggerEnv,
  morningMessagesList?: Record<string, string[]>,
  initialPlacements?: ReturnType<typeof collectTagPlacements>
): TriggerResult => {
  let beforePlacements =
    initialPlacements ?? collectTagPlacements(beforeUsers, morningMessagesList, titles);
  let result = afterUsers;
  let mornings = morningMessagesList;

  const MAX_ITERATIONS = 100;
  let settled = false;
  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    const supported = pruneUnsupportedTagPlacements(result, mornings, titles);
    result = supported.users;
    mornings = supported.morningMessages;
    const afterPlacements = collectTagPlacements(result, mornings, titles);

    // New placements → run their on-added triggers (src = placement key)
    const added = newPlacementsBetween(beforePlacements, afterPlacements);
    // Dead placements → revert their contributions + run on-removed bodies
    const dead = deadPlacementsBetween(beforePlacements, afterPlacements);

    if (added.length === 0 && dead.length === 0) {
      settled = true;
      break;
    }

    // Revert dead placements first so removed triggers see a clean table.
    if (dead.length > 0) {
      const reverted = revertDeadTagPlacements(result, mornings, titles, dead);
      result = reverted.users;
      mornings = reverted.morningMessages;
      for (const key of dead) {
        const placement = beforePlacements.get(key);
        if (!placement) continue;
        const script = resolveTagTrigger(placement.ref, env, 'removed');
        if (script) {
          const playerIndex = placement.addr.playerId
            ? result.findIndex((user) => user.id === placement.addr.playerId)
            : placement.addr.playerIndex;
          if (playerIndex < 0 || !result[playerIndex]) continue;
          const dayIndex =
            placement.addr.dayIndex === null
              ? null
              : placement.addr.dayId
                ? result[playerIndex].days.findIndex((day) => day.id === placement.addr.dayId)
                : placement.addr.dayIndex;
          if (dayIndex === -1) continue;
          const r = fireSingleTagTrigger(
            placement.ref,
            script,
            {
              playerIndex,
              dayIndex,
              column: placement.addr.column,
            },
            result,
            titles,
            'removed',
            env,
            mornings
          );
          result = r.users;
          mornings = r.morningMessages;
        }
      }
    }

    // Fire on-added triggers for every newly visible placement.
    for (const { key, ref, addr } of added) {
      if (!collectTagPlacements(result, mornings, titles).has(key)) continue;
      const script = resolveTagTrigger(ref, env, 'added');
      if (!script) continue;
      const r = fireSingleTagTrigger(
        ref,
        script,
        { playerIndex: addr.playerIndex, dayIndex: addr.dayIndex, column: addr.column },
        result,
        titles,
        'added',
        env,
        mornings
      );
      result = r.users;
      mornings = r.morningMessages;
    }

    // Next iteration diffs against the state BEFORE this pass (so a tag
    // added by a trigger gets its own trigger fired next pass).
    beforePlacements = afterPlacements;
  }

  if (!settled && env.strict)
    throw new Error('Tag updates did not settle; certification was not saved.');
  return { users: result, morningMessages: mornings };
};

/**
 * Back-compat alias for the certify-time trigger pass.
 * @deprecated use runTagTriggerFixpoint
 */
export const fireTagTriggersForNetChanges = (
  beforeUsers: UserTableItem[],
  afterUsers: UserTableItem[],
  tagTriggers: Record<string, string>,
  titles: UserTableTitle,
  morningMessagesList?: Record<string, string[]>,
  env?: TagTriggerEnv
): TriggerResult =>
  runTagTriggerFixpoint(
    beforeUsers,
    afterUsers,
    titles,
    env ?? { legacyTriggers: tagTriggers },
    morningMessagesList
  );

/**
 * Hook for firing tag trigger scripts from UI tag edits (TagCellEditor).
 * For the certify-time pass, use `runTagTriggerFixpoint` directly.
 */
export const useTagTriggers = (
  gameId: string,
  users: UserTableItem[],
  titles: UserTableTitle,
  setUserTable: (users: UserTableItem[]) => void
) => {
  const [tagTriggersRecord] = useValue<TagTriggersData>(getGameScopedKey('tagTriggers', gameId), {
    defaultValue: {},
    privacy: 'PUBLIC',
  });
  const { index } = useScriptFilesReader(gameId);
  // Morning messages are separate storage - triggers may write them, so the
  // hook owns the record and commits changes itself (callers only take
  // users back). Ref keeps the newest committed value across a synchronous
  // multi-tag pass.
  const [morningMessagesListRecord, setMorningMessagesList] = useList<Record<string, string[]>>(
    'morningMessagesList',
    gameId,
    { privacy: 'PUBLIC', defaultValue: {} }
  );
  const morningsRef = useRef<Record<string, string[]> | undefined>(undefined);
  morningsRef.current =
    morningMessagesListRecord?.scheduledUpdate?.value ?? morningMessagesListRecord?.value;

  const tagTriggers = useMemo(() => tagTriggersRecord?.value ?? {}, [tagTriggersRecord?.value]);
  const env = useMemo<TagTriggerEnv>(
    () => ({ index, legacyTriggers: tagTriggers }),
    [index, tagTriggers]
  );
  const tagLookup = useMemo(() => (index ? tagLookupFromIndex(index) : undefined), [index]);

  /**
   * Fire trigger scripts for tag placements that changed on `context`'s
   * cell. `refs` are the added/removed tags; writes are attributed to each
   * placement key. For 'removed', the placement's contributions are also
   * reverted automatically.
   */
  const fireTagTriggers = useCallback(
    (
      tagRefs: (string | TagRef)[],
      context: CellContext,
      updatedUsers: UserTableItem[],
      mode: 'added' | 'removed'
    ): UserTableItem[] => {
      if (tagRefs.length === 0) return updatedUsers;

      const before = collectTagPlacements(updatedUsers, morningsRef.current, titles);
      const addr = stableCellAddress(
        updatedUsers,
        titles,
        context.playerIndex,
        context.dayIndex,
        context.column
      );
      for (const entry of tagRefs) {
        const ref: TagRef = typeof entry === 'string' ? { name: entry } : entry;
        const key = tagPlacementSrc(ref, addr);
        if (mode === 'added') before.delete(key);
        else before.set(key, { ref, addr });
      }
      const { users: result, morningMessages: mornings } = runTagTriggerFixpoint(
        updatedUsers,
        updatedUsers,
        titles,
        env,
        morningsRef.current,
        before
      );
      if (mornings !== morningsRef.current && mornings) {
        morningsRef.current = mornings;
        setMorningMessagesList(mornings, { cellWriteOrigin: 'tracked' });
      }
      return result;
    },
    [env, titles, setMorningMessagesList]
  );

  /**
   * Revert dead tag placements detected between two table versions
   * (without firing added triggers) - used by manual cell rewrites.
   */
  const revertDeadPlacements = useCallback(
    (beforeUsers: UserTableItem[], afterUsers: UserTableItem[]): UserTableItem[] => {
      const mornings = morningsRef.current;
      const before = collectTagPlacements(beforeUsers, mornings, titles);
      const dead = deadPlacementsBetween(
        before,
        collectTagPlacements(afterUsers, mornings, titles)
      );
      if (dead.length === 0) return afterUsers;
      const reverted = revertDeadTagPlacements(afterUsers, mornings, titles, dead);
      if (reverted.morningMessages !== mornings && reverted.morningMessages) {
        morningsRef.current = reverted.morningMessages;
        setMorningMessagesList(reverted.morningMessages, { cellWriteOrigin: 'tracked' });
      }
      return reverted.users;
    },
    [titles, setMorningMessagesList]
  );

  const planTableChanges = (
    before: UserTableItem[],
    after: UserTableItem[],
    nextTitles = titles
  ) => {
    const previousMornings = morningsRef.current;
    const result = runTagTriggerFixpoint(
      before,
      trackManualTableChanges(before, after),
      nextTitles,
      env,
      previousMornings,
      collectTagPlacements(before, previousMornings, titles)
    );
    const commitMornings = (
      value: Record<string, string[]> | undefined,
      cellWriteOrigin: 'tracked' | 'restore'
    ) => {
      if (value === morningsRef.current || !value) return;
      morningsRef.current = value;
      setMorningMessagesList(value, { cellWriteOrigin });
    };
    return {
      users: result.users,
      commit: () => commitMornings(result.morningMessages, 'tracked'),
      undo: () => commitMornings(previousMornings ?? {}, 'restore'),
    };
  };

  return { fireTagTriggers, tagTriggers, env, tagLookup, revertDeadPlacements, planTableChanges };
};

/** Manual-edit source used when UI tag adds write pieces. */
export { MANUAL_SRC };
