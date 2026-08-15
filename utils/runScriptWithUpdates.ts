import { interpretScript } from '../app/script/runtime/interpreter';
import { createScriptGlobals, type ScriptSourceData } from '../app/script/runtime/sources';
import { TableUpdate } from '../app/script/registry';
import { UserTableItem, UserTableTitle } from '../types/playerTable';

/**
 * Run a script with table update support.
 * Returns the table updates collected during execution.
 *
 * The script gets access to the standard globals (players, roles, etc.)
 * plus a `getCellValue` function that lets UpdateCell blocks read current
 * cell values (used in replace mode to store the previous value).
 */
export const runScriptWithUpdates = (
  scriptText: string,
  source: ScriptSourceData,
  users: UserTableItem[],
  titles: UserTableTitle
): { updates: TableUpdate[]; issues: string[] } => {
  if (!scriptText.trim()) return { updates: [], issues: [] };

  const globals = createScriptGlobals(source);

  // Build a getCellValue function that reads from the current user table
  const getCellValue = (
    playerIndex: number | null,
    dayIndex: number | null,
    column: string
  ): string => {
    const indices = playerIndex === null ? users.map((_, i) => i) : [playerIndex];
    if (indices.length === 0) return '';
    const idx = indices[0];
    if (idx < 0 || idx >= users.length) return '';

    const user = users[idx];

    if (dayIndex === null) {
      const extraUserColumnTitles = titles.extraUserColumns ?? [];
      const colIdx = extraUserColumnTitles.findIndex(
        (t) => t.toLowerCase() === column.toLowerCase()
      );
      if (colIdx === -1) return '';
      return user.playerData.extraColumns?.[colIdx] ?? '';
    } else {
      const extraDayColumnTitles = titles.extraDayColumns ?? [];
      const colIdx = extraDayColumnTitles.findIndex(
        (t) => t.toLowerCase() === column.toLowerCase()
      );
      if (colIdx === -1) return '';
      const day = user.days?.[dayIndex];
      return day?.extraColumns?.[colIdx] ?? '';
    }
  };

  const updates: TableUpdate[] = [];

  try {
    const result = interpretScript(scriptText, {
      globals,
      tableUpdates: updates,
      getCellValue,
    });
    return {
      updates,
      issues: result.issues.map((i) => i.message),
    };
  } catch (error) {
    return {
      updates,
      issues: [error instanceof Error ? error.message : 'Script execution failed'],
    };
  }
};
