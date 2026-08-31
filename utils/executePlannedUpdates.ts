import { UserTableItem, UserTableTitle } from '../types/playerTable';
import { PlannedUpdate } from '../types/multiplayer';
import { interpretScript } from '../app/script/runtime/interpreter';
import {
  VOTE_MULTIPLIER_COLUMN,
  LIVING_STATE_COLUMN,
  VOTE_COLUMN,
  ACTION_COLUMN,
  MORNING_MESSAGE_COLUMN,
} from './applyTableUpdates';

/**
 * Execute a list of PlannedUpdates against the user table.
 *
 * Each PlannedUpdate contains a partially-evaluated expression string (e.g.
 * `cellContents.append(tag("Infected"))`) where all variables have been
 * resolved to their values at input time. At certify time, we:
 *  1. Get the current cell value
 *  2. Parse the expression and evaluate it with the cell variable bound
 *  3. Apply the result to the cell
 *
 * This approach avoids conflicts when multiple players write to the same cell:
 * append/remove operations from different players are applied sequentially
 * rather than overwriting each other.
 */
export const executePlannedUpdates = (
  users: UserTableItem[],
  plannedUpdates: PlannedUpdate[],
  titles: UserTableTitle
): UserTableItem[] => {
  let result = [...users];

  for (const update of plannedUpdates) {
    const { playerIndex, dayIndex, column, columnType, updateExpression, itemName } = update;

    // Determine which players to update
    const indices = playerIndex === null ? result.map((_, i) => i) : [playerIndex];

    for (const idx of indices) {
      if (idx < 0 || idx >= result.length) continue;

      const user = result[idx];

      // Get the current cell value
      const { cellValue, colIdx, isDayColumn } = getCellInfo(result, idx, dayIndex, column, titles);
      // Skip morning message updates (colIdx -6) — they're handled separately
      // by the caller via applyMorningMessageUpdates
      if (colIdx === -1 || colIdx === -6) continue;

      // Parse and evaluate the update expression
      const newValue = evaluateUpdateExpression(updateExpression, itemName, cellValue);

      // Apply the new value to the cell
      result = applyCellValue(result, idx, dayIndex, colIdx, isDayColumn, newValue, column, titles);
    }
  }

  return result;
};

/** Get the current cell value and column metadata for a player/day/column.
 *  Special colIdx markers: -1 = not found, -2 = voteMultiplier, -3 = vote,
 *  -4 = action, -5 = livingState.
 */
const getCellInfo = (
  users: UserTableItem[],
  playerIndex: number,
  dayIndex: number | null,
  column: string,
  titles: UserTableTitle
): { cellValue: string; colIdx: number; isDayColumn: boolean } => {
  const user = users[playerIndex];
  const colLower = column.toLowerCase();

  if (dayIndex === null) {
    // Special: livingState is a field on PlayerData
    if (colLower === LIVING_STATE_COLUMN) {
      return {
        cellValue: user.playerData.livingState,
        colIdx: -5,
        isDayColumn: false,
      };
    }
    // Player-level extra column
    const extraUserColumnTitles = titles.extraUserColumns ?? [];
    const colIdx = extraUserColumnTitles.findIndex((t) => t.toLowerCase() === colLower);
    if (colIdx === -1) return { cellValue: '', colIdx: -1, isDayColumn: false };
    return {
      cellValue: user.playerData.extraColumns?.[colIdx] ?? '',
      colIdx,
      isDayColumn: false,
    };
  } else {
    // Special: morningMessage is stored separately (not in the user table)
    if (colLower === MORNING_MESSAGE_COLUMN) {
      return { cellValue: '', colIdx: -6, isDayColumn: true };
    }
    // Special built-in fields on DayData
    if (colLower === VOTE_MULTIPLIER_COLUMN) {
      const day = user.days?.[dayIndex];
      return { cellValue: String(day?.voteMultiplier ?? 1), colIdx: -2, isDayColumn: true };
    }
    if (colLower === VOTE_COLUMN) {
      const day = user.days?.[dayIndex];
      return {
        cellValue: Array.isArray(day?.vote) ? JSON.stringify(day.vote) : (day?.vote ?? ''),
        colIdx: -3,
        isDayColumn: true,
      };
    }
    if (colLower === ACTION_COLUMN) {
      const day = user.days?.[dayIndex];
      return {
        cellValue: typeof day?.action === 'string' ? day.action : '',
        colIdx: -4,
        isDayColumn: true,
      };
    }
    // Day-level extra column
    const extraDayColumnTitles = titles.extraDayColumns ?? [];
    const colIdx = extraDayColumnTitles.findIndex((t) => t.toLowerCase() === colLower);
    if (colIdx === -1) return { cellValue: '', colIdx: -1, isDayColumn: true };
    const day = user.days?.[dayIndex];
    return {
      cellValue: day?.extraColumns?.[colIdx] ?? '',
      colIdx,
      isDayColumn: true,
    };
  }
};

/** Evaluate a partially-evaluated update expression against the current cell value. */
const evaluateUpdateExpression = (
  expression: string,
  itemName: string,
  cellValue: string
): string => {
  try {
    const result = interpretScript(`Return ${expression};`, {
      globals: {
        [itemName]: cellValue,
      },
      fuel: 1000,
      maxDepth: 10,
    });
    // The interpreter returns the value of the last Return statement
    const value = result.value;
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return String(value);
    if (value === null || value === undefined) return '';
    return String(value);
  } catch (error) {
    console.warn('Failed to evaluate planned update expression:', expression, error);
    return cellValue; // keep current value on error
  }
};

/** Apply a new cell value to the user table. */
const applyCellValue = (
  users: UserTableItem[],
  playerIndex: number,
  dayIndex: number | null,
  colIdx: number,
  isDayColumn: boolean,
  newValue: string,
  column: string,
  titles: UserTableTitle
): UserTableItem[] => {
  const result = [...users];
  const user = result[playerIndex];

  if (!isDayColumn) {
    if (colIdx === -5) {
      // livingState — 'alive' or 'dead'
      const lower = newValue.toLowerCase();
      const livingState = lower === 'alive' || lower === 'dead' ? lower : 'dead';
      result[playerIndex] = {
        ...user,
        playerData: {
          ...user.playerData,
          livingState: livingState as 'alive' | 'dead',
        },
      };
    } else {
      // Player-level extra column
      const extraColumns = [...(user.playerData.extraColumns ?? [])];
      while (extraColumns.length < (titles.extraUserColumns ?? []).length) {
        extraColumns.push('');
      }
      extraColumns[colIdx] = newValue;
      result[playerIndex] = {
        ...user,
        playerData: {
          ...user.playerData,
          extraColumns,
        },
      };
    }
  } else {
    // Day-level column
    const days = [...(user.days ?? [])];
    while (days.length <= (dayIndex ?? 0)) {
      days.push({ vote: '', action: '', extraColumns: [] });
    }
    const day = { ...days[dayIndex!] };

    if (colIdx === -2) {
      // voteMultiplier — parse as number
      const parsed = parseFloat(newValue);
      day.voteMultiplier = isNaN(parsed) ? 1 : parsed;
    } else if (colIdx === -3) {
      // vote — string field
      day.vote = newValue;
    } else if (colIdx === -4) {
      // action — string field
      day.action = newValue;
    } else {
      const extraColumns = [...(day.extraColumns ?? [])];
      while (extraColumns.length < (titles.extraDayColumns ?? []).length) {
        extraColumns.push('');
      }
      extraColumns[colIdx] = newValue;
      day.extraColumns = extraColumns;
    }

    days[dayIndex!] = day;
    result[playerIndex] = {
      ...user,
      days,
    };
  }

  return result;
};

/**
 * Execute morning message planned updates against a morning messages list.
 * Morning messages are stored separately from the user table, keyed by
 * email → array indexed by day. This function evaluates the planned update
 * expressions and applies them.
 *
 * @param morningMessagesList  Current morning messages
 * @param plannedUpdates  All planned updates (only morningMessage ones are applied)
 * @param users  The user table (for resolving playerIndex → email)
 * @returns Updated morning messages list
 */
export const executeMorningMessagePlannedUpdates = (
  morningMessagesList: Record<string, string[]>,
  plannedUpdates: PlannedUpdate[],
  users: UserTableItem[]
): Record<string, string[]> => {
  let result = { ...morningMessagesList };

  for (const update of plannedUpdates) {
    if (update.column.toLowerCase() !== MORNING_MESSAGE_COLUMN) continue;
    if (update.dayIndex === null) continue;

    const indices = update.playerIndex === null ? users.map((_, i) => i) : [update.playerIndex];
    for (const idx of indices) {
      if (idx < 0 || idx >= users.length) continue;
      const user = users[idx];
      const email = user.email.toLowerCase();
      const messages = [...(result[email] ?? [])];
      while (messages.length <= update.dayIndex) messages.push('');
      const cellValue = messages[update.dayIndex] ?? '';
      const newValue = evaluateUpdateExpression(
        update.updateExpression,
        update.itemName,
        cellValue
      );
      messages[update.dayIndex] = newValue;
      result[email] = messages;
    }
  }

  return result;
};
