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

/**
 * Hook that provides a function to fire tag trigger scripts when tags are
 * added or removed.
 *
 * A single trigger script per tag contains both OnTagAdded and OnTagRemoved
 * blocks. The `mode` parameter controls which blocks execute.
 *
 * Trigger scripts get these globals:
 * - placedTag: the tag name that was added/removed
 * - placedUser: the player object (from the players list)
 * - placedDay: the day index (or null for player columns)
 * - placedColumn: the column title
 *
 * Trigger scripts can use UpdateCell to modify other cells.
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
   * Fire trigger scripts for tags that were added or removed.
   * Called after a cell value has been updated (the cell change is already
   * applied to `updatedUsers`). This function runs trigger scripts and
   * applies their table updates on top.
   *
   * @param tagNames  The tags that were added or removed
   * @param context   Where the tag change happened
   * @param updatedUsers  The user table after the cell change
   * @param mode      'added' to run OnTagAdded blocks, 'removed' for OnTagRemoved
   */
  const fireTagTriggers = useCallback(
    (
      tagNames: string[],
      context: CellContext,
      updatedUsers: UserTableItem[],
      mode: 'added' | 'removed'
    ): UserTableItem[] => {
      if (tagNames.length === 0) return updatedUsers;

      const { playerIndex, dayIndex, column } = context;
      const player = updatedUsers[playerIndex];
      if (!player) return updatedUsers;

      let result = updatedUsers;

      for (const tagName of tagNames) {
        const triggerScript = tagTriggers[tagName];
        if (!triggerScript || !triggerScript.trim()) continue;

        // Build globals for the trigger script
        // The player object is the runtime-format player entry
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

        const globals = {
          ...createScriptGlobals({
            capability: 'operator',
            players: result as unknown as UserTableItem[],
            userTableTitle: titles,
          }),
          // Trigger-specific globals (override any standard ones with same name)
          placedTag: tagName,
          placedUser: playerEntry,
          placedDay: dayIndex,
          placedColumn: column,
        };

        // Build getCellValue for UpdateCell blocks
        const getCellValue = (
          playerIndex: number | null,
          dayIdx: number | null,
          col: string
        ): string => {
          const indices = playerIndex === null ? result.map((_, i) => i) : [playerIndex];
          if (indices.length === 0) return '';
          const idx = indices[0];
          if (idx < 0 || idx >= result.length) return '';
          const user = result[idx];
          const colLower = col.toLowerCase();
          if (dayIdx === null) {
            // Special: livingState is a field on PlayerData
            if (colLower === LIVING_STATE_COLUMN) {
              return user.playerData.livingState;
            }
            const colIdx = extraUserColumnTitles.findIndex((t) => t.toLowerCase() === colLower);
            if (colIdx === -1) return '';
            return user.playerData.extraColumns?.[colIdx] ?? '';
          } else {
            // Special built-in fields on DayData
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
      }

      return result;
    },
    [tagTriggers, titles]
  );

  return { fireTagTriggers, tagTriggers };
};
