import { useCallback } from 'react';
import { useValue } from './useData';
import { getGameScopedKey } from '../utils/multiplayer';
import { UserTableItem, UserTableTitle } from '../types/playerTable';
import { runScriptWithUpdates } from '../utils/runScriptWithUpdates';
import { applyTableUpdates } from '../utils/applyTableUpdates';

/**
 * Tag trigger scripts keyed by tag name.
 * Stored as: { "Infected": "script text...", "Dead": "..." }
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
 * Hook that provides a function to fire tag trigger scripts when tags are added.
 *
 * The trigger script gets these globals:
 * - placedTag: the tag name that was added
 * - placedUser: the player object (from the players list)
 * - placedDay: the day index (or null for player columns)
 * - placedColumn: the column title
 *
 * The trigger script can use UpdateCell to modify other cells.
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
   * Fire trigger scripts for newly added tags.
   * Called after a cell value has been updated (the cell change is already
   * applied to `updatedUsers`). This function runs trigger scripts and
   * applies their table updates on top.
   */
  const fireTagTriggers = useCallback(
    (
      addedTagNames: string[],
      context: CellContext,
      updatedUsers: UserTableItem[]
    ): UserTableItem[] => {
      if (addedTagNames.length === 0) return updatedUsers;

      const { playerIndex, dayIndex, column } = context;
      const player = updatedUsers[playerIndex];
      if (!player) return updatedUsers;

      let result = updatedUsers;

      for (const tagName of addedTagNames) {
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
          players: result.map((p) => {
            const pe: Record<string, unknown> = {
              realName: p.realName,
              email: p.email,
              userId: p.userId,
              role: p.role,
              isAlive: p.playerData.livingState === 'alive',
              days: (p.days ?? []).map((day) => {
                const base: Record<string, unknown> = {
                  vote: day?.vote ?? '',
                  action: day?.action ?? '',
                };
                const dExtra = day?.extraColumns ?? [];
                for (let i = 0; i < extraDayColumnTitles.length; i++) {
                  base[extraDayColumnTitles[i]] = dExtra[i] ?? '';
                }
                return base;
              }),
            };
            const pExtra = p.playerData.extraColumns ?? [];
            for (let i = 0; i < extraUserColumnTitles.length; i++) {
              pe[extraUserColumnTitles[i]] = pExtra[i] ?? '';
            }
            return pe;
          }),
          roles: [],
          currentDay: dayIndex ?? 0,
          dayDates: [],
          schedule: {},
          profiles: [],
          // Trigger-specific globals
          placedTag: tagName,
          placedUser: playerEntry,
          placedDay: dayIndex,
          placedColumn: column,
        };

        const { updates, issues } = runScriptWithUpdates(
          triggerScript,
          {
            capability: 'operator',
            players: result as unknown as UserTableItem[],
            currentDay: dayIndex ?? 0,
            userTableTitle: titles,
          },
          result,
          titles
        );

        if (issues.length > 0) {
          console.warn(`Tag trigger "${tagName}" issues:`, issues);
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
