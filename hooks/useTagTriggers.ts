import { useCallback } from 'react';
import { useValue } from './useData';
import { getGameScopedKey } from '../utils/multiplayer';
import { UserTableItem, UserTableTitle } from '../types/playerTable';
import { interpretScript } from '../app/script/runtime/interpreter';
import { createScriptGlobals } from '../app/script/runtime/sources';
import {
  applyTableUpdates,
  VOTE_MULTIPLIER_COLUMN,
  LIVING_STATE_COLUMN,
  VOTE_COLUMN,
  ACTION_COLUMN,
} from '../utils/applyTableUpdates';
import { TableUpdate } from '../app/script/registry';
import { parseCell } from '../utils/tagEncoding';

/**
 * Tag trigger scripts keyed by tag name.
 * Stored as: { "Infected": "script text...", "Dead": "..." }
 *
 * Each script can contain OnTagAdded and OnTagRemoved blocks. The interpreter
 * uses triggerMode to decide which blocks to execute.
 */
type TagTriggersData = Record<string, string>;

export interface CellContext {
  playerIndex: number;
  /** null for player-level columns, 0-based day index for day columns */
  dayIndex: number | null;
  /** Column title */
  column: string;
}

/** Build a runtime player entry from a UserTableItem (same shape as createScriptGlobals). */
const buildPlayerEntry = (
  player: UserTableItem,
  titles: UserTableTitle
): Record<string, unknown> => {
  const extraUserColumnTitles = titles.extraUserColumns ?? [];
  const extraDayColumnTitles = titles.extraDayColumns ?? [];
  const playerEntry: Record<string, unknown> = {
    realName: player.realName,
    email: player.email,
    userId: player.userId,
    role: player.role,
    isAlive: player.playerData.livingState === 'alive',
    days: (player.days ?? []).map((day) => {
      const base: Record<string, unknown> = {
        vote: day?.vote ?? '',
        action: day?.action ?? '',
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

/** Build a getCellValue function that reads from the current user table. */
const buildGetCellValue = (users: UserTableItem[], titles: UserTableTitle) => {
  const extraUserColumnTitles = titles.extraUserColumns ?? [];
  const extraDayColumnTitles = titles.extraDayColumns ?? [];
  return (playerIndex: number | null, dayIdx: number | null, col: string): string => {
    const indices = playerIndex === null ? users.map((_, i) => i) : [playerIndex];
    if (indices.length === 0) return '';
    const idx = indices[0];
    if (idx < 0 || idx >= users.length) return '';
    const user = users[idx];
    const colLower = col.toLowerCase();
    if (dayIdx === null) {
      if (colLower === LIVING_STATE_COLUMN) return user.playerData.livingState;
      const colIdx = extraUserColumnTitles.findIndex((t) => t.toLowerCase() === colLower);
      if (colIdx === -1) return '';
      return user.playerData.extraColumns?.[colIdx] ?? '';
    } else {
      if (colLower === VOTE_MULTIPLIER_COLUMN) {
        const day = user.days?.[dayIdx];
        return String(day?.voteMultiplier ?? 1);
      }
      if (colLower === VOTE_COLUMN) {
        const day = user.days?.[dayIdx];
        return day?.vote ?? '';
      }
      if (colLower === ACTION_COLUMN) {
        const day = user.days?.[dayIdx];
        return typeof day?.action === 'string' ? day.action : '';
      }
      const colIdx = extraDayColumnTitles.findIndex((t) => t.toLowerCase() === colLower);
      if (colIdx === -1) return '';
      const day = user.days?.[dayIdx];
      return day?.extraColumns?.[colIdx] ?? '';
    }
  };
};

/**
 * Fire trigger scripts for a single tag on a single cell.
 * Runs the trigger script and applies any UpdateCell side effects.
 *
 * @returns The updated user table (may be the same array if no updates).
 */
export const fireSingleTagTrigger = (
  tagName: string,
  triggerScript: string,
  context: CellContext,
  users: UserTableItem[],
  titles: UserTableTitle,
  mode: 'added' | 'removed'
): UserTableItem[] => {
  const { playerIndex, dayIndex, column } = context;
  const player = users[playerIndex];
  if (!player) return users;

  let result = users;
  const playerEntry = buildPlayerEntry(player, titles);

  const globals = {
    ...createScriptGlobals({
      capability: 'operator',
      players: result as unknown as UserTableItem[],
      userTableTitle: titles,
    }),
    placedTag: tagName,
    placedUser: playerEntry,
    placedDay: dayIndex,
    placedColumn: column,
  };

  const getCellValue = buildGetCellValue(result, titles);
  const updates: TableUpdate[] = [];
  try {
    const triggerResult = interpretScript(triggerScript, {
      globals,
      tableUpdates: updates,
      getCellValue,
      triggerMode: mode,
    });
    if (triggerResult.issues.length > 0) {
      console.warn(
        `Tag trigger "${tagName}" issues:`,
        triggerResult.issues.map((i) => i.message)
      );
    }
  } catch (error) {
    console.warn(
      `Tag trigger "${tagName}" failed:`,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }

  if (updates.length > 0) {
    result = applyTableUpdates(result, updates, titles);
  }
  return result;
};

/**
 * Detect net tag changes between two versions of the user table and fire
 * the appropriate tag triggers for each change.
 *
 * This is used at certify time: after planned updates (which may append/remove
 * tags via `cellContents.append(tag("Detected"))`) have been applied, we compare
 * the before/after tables to find which tags were added or removed on which
 * cells, then fire the corresponding OnTagAdded/OnTagRemoved triggers.
 *
 * Triggers are fired iteratively: if a trigger's UpdateCell adds another tag,
 * that tag's trigger will also fire, until no more changes are detected.
 *
 * @param beforeUsers  The user table before the updates were applied
 * @param afterUsers   The user table after the updates were applied
 * @param tagTriggers  Map of tag name → trigger script text
 * @param titles       Table column titles
 * @returns The user table after all triggers have fired
 */
export const fireTagTriggersForNetChanges = (
  beforeUsers: UserTableItem[],
  afterUsers: UserTableItem[],
  tagTriggers: Record<string, string>,
  titles: UserTableTitle
): UserTableItem[] => {
  if (Object.keys(tagTriggers).length === 0) return afterUsers;

  const extraUserColumnTitles = titles.extraUserColumns ?? [];
  const extraDayColumnTitles = titles.extraDayColumns ?? [];

  /** Extract all tag names from a cell value. */
  const getTagNames = (raw: string): Set<string> => {
    const parsed = parseCell(raw);
    return new Set(parsed.tags.map((t) => t.name));
  };

  /** Get the raw cell value at a given position. */
  const getCellValue = (
    users: UserTableItem[],
    playerIndex: number,
    dayIndex: number | null,
    column: string
  ): string => {
    const user = users[playerIndex];
    if (!user) return '';
    const colLower = column.toLowerCase();
    if (dayIndex === null) {
      const colIdx = extraUserColumnTitles.findIndex((t) => t.toLowerCase() === colLower);
      if (colIdx === -1) return '';
      return user.playerData.extraColumns?.[colIdx] ?? '';
    } else {
      const colIdx = extraDayColumnTitles.findIndex((t) => t.toLowerCase() === colLower);
      if (colIdx === -1) return '';
      const day = user.days?.[dayIndex];
      return day?.extraColumns?.[colIdx] ?? '';
    }
  };

  // Collect all net tag changes: { added: [...], removed: [...] } per cell
  interface TagChange {
    tagName: string;
    mode: 'added' | 'removed';
    context: CellContext;
  }

  const changes: TagChange[] = [];

  for (let playerIndex = 0; playerIndex < afterUsers.length; playerIndex++) {
    const beforePlayer = beforeUsers[playerIndex];
    const afterPlayer = afterUsers[playerIndex];
    if (!afterPlayer) continue;

    // Check player-level extra columns
    for (const col of extraUserColumnTitles) {
      const beforeVal = beforePlayer ? getCellValue(beforeUsers, playerIndex, null, col) : '';
      const afterVal = getCellValue(afterUsers, playerIndex, null, col);
      if (beforeVal === afterVal) continue;
      const beforeTags = getTagNames(beforeVal);
      const afterTags = getTagNames(afterVal);
      for (const tag of afterTags) {
        if (!beforeTags.has(tag)) {
          changes.push({
            tagName: tag,
            mode: 'added',
            context: { playerIndex, dayIndex: null, column: col },
          });
        }
      }
      for (const tag of beforeTags) {
        if (!afterTags.has(tag)) {
          changes.push({
            tagName: tag,
            mode: 'removed',
            context: { playerIndex, dayIndex: null, column: col },
          });
        }
      }
    }

    // Check day-level extra columns
    const maxDay = Math.max(beforePlayer?.days?.length ?? 0, afterPlayer.days?.length ?? 0);
    for (let dayIndex = 0; dayIndex < maxDay; dayIndex++) {
      for (const col of extraDayColumnTitles) {
        const beforeVal = beforePlayer ? getCellValue(beforeUsers, playerIndex, dayIndex, col) : '';
        const afterVal = getCellValue(afterUsers, playerIndex, dayIndex, col);
        if (beforeVal === afterVal) continue;
        const beforeTags = getTagNames(beforeVal);
        const afterTags = getTagNames(afterVal);
        for (const tag of afterTags) {
          if (!beforeTags.has(tag)) {
            changes.push({
              tagName: tag,
              mode: 'added',
              context: { playerIndex, dayIndex, column: col },
            });
          }
        }
        for (const tag of beforeTags) {
          if (!afterTags.has(tag)) {
            changes.push({
              tagName: tag,
              mode: 'removed',
              context: { playerIndex, dayIndex, column: col },
            });
          }
        }
      }
    }
  }

  if (changes.length === 0) return afterUsers;

  // Fire triggers iteratively. Each trigger may produce more tag changes
  // (via UpdateCell), which we detect and fire in the next iteration.
  // We cap iterations to prevent infinite loops.
  const MAX_ITERATIONS = 10;
  let result = afterUsers;

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    if (changes.length === 0) break;

    const pendingChanges = [...changes];
    changes.length = 0; // clear for next iteration

    for (const change of pendingChanges) {
      const triggerScript = tagTriggers[change.tagName];
      if (!triggerScript || !triggerScript.trim()) continue;

      const before = result;
      result = fireSingleTagTrigger(
        change.tagName,
        triggerScript,
        change.context,
        result,
        titles,
        change.mode
      );

      // Detect any NEW tag changes caused by this trigger's UpdateCell
      if (result !== before) {
        for (let playerIndex = 0; playerIndex < result.length; playerIndex++) {
          const beforePlayer = before[playerIndex];
          const afterPlayer = result[playerIndex];
          if (!afterPlayer) continue;

          for (const col of extraUserColumnTitles) {
            const beforeVal = beforePlayer ? getCellValue(before, playerIndex, null, col) : '';
            const afterVal = getCellValue(result, playerIndex, null, col);
            if (beforeVal === afterVal) continue;
            const beforeTags = getTagNames(beforeVal);
            const afterTags = getTagNames(afterVal);
            for (const tag of afterTags) {
              if (!beforeTags.has(tag)) {
                changes.push({
                  tagName: tag,
                  mode: 'added',
                  context: { playerIndex, dayIndex: null, column: col },
                });
              }
            }
            for (const tag of beforeTags) {
              if (!afterTags.has(tag)) {
                changes.push({
                  tagName: tag,
                  mode: 'removed',
                  context: { playerIndex, dayIndex: null, column: col },
                });
              }
            }
          }

          const maxDay = Math.max(beforePlayer?.days?.length ?? 0, afterPlayer.days?.length ?? 0);
          for (let dayIndex = 0; dayIndex < maxDay; dayIndex++) {
            for (const col of extraDayColumnTitles) {
              const beforeVal = beforePlayer
                ? getCellValue(before, playerIndex, dayIndex, col)
                : '';
              const afterVal = getCellValue(result, playerIndex, dayIndex, col);
              if (beforeVal === afterVal) continue;
              const beforeTags = getTagNames(beforeVal);
              const afterTags = getTagNames(afterVal);
              for (const tag of afterTags) {
                if (!beforeTags.has(tag)) {
                  changes.push({
                    tagName: tag,
                    mode: 'added',
                    context: { playerIndex, dayIndex, column: col },
                  });
                }
              }
              for (const tag of beforeTags) {
                if (!afterTags.has(tag)) {
                  changes.push({
                    tagName: tag,
                    mode: 'removed',
                    context: { playerIndex, dayIndex, column: col },
                  });
                }
              }
            }
          }
        }
      }
    }
  }

  return result;
};

/**
 * Hook that provides a function to fire tag trigger scripts when tags are
 * added or removed from the UI (TagCellEditor).
 *
 * For certify-time tag trigger firing, use `fireTagTriggersForNetChanges`
 * directly (it doesn't need the hook).
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

  const tagTriggers = tagTriggersRecord?.value ?? {};

  /**
   * Fire trigger scripts for tags that were added or removed from the UI.
   * Called after a cell value has been updated (the cell change is already
   * applied to `updatedUsers`). This function runs trigger scripts and
   * applies their table updates on top.
   */
  const fireTagTriggers = useCallback(
    (
      tagNames: string[],
      context: CellContext,
      updatedUsers: UserTableItem[],
      mode: 'added' | 'removed'
    ): UserTableItem[] => {
      if (tagNames.length === 0) return updatedUsers;

      let result = updatedUsers;
      for (const tagName of tagNames) {
        const triggerScript = tagTriggers[tagName];
        if (!triggerScript || !triggerScript.trim()) continue;
        result = fireSingleTagTrigger(tagName, triggerScript, context, result, titles, mode);
      }
      return result;
    },
    [tagTriggers, titles]
  );

  return { fireTagTriggers, tagTriggers };
};
