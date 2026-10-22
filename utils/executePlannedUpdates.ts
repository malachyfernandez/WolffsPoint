import { UserTableItem, UserTableTitle } from '../types/playerTable';
import { PlannedUpdate } from '../types/multiplayer';
import { evaluateFileCallInputs, interpretScript } from '../script/runtime/interpreter';
import { parseScript } from '../script/lang/parser';
import { printExpression } from '../script/lang/printer';
import type { CallExpression } from '../script/lang/ast';
import type { TableUpdate } from '../script/registry';
import { applyCellOps, applyMorningMessageOps, type CellOpsOptions } from './cellOps';
import {
  VOTE_MULTIPLIER_COLUMN,
  LIVING_STATE_COLUMN,
  VOTE_COLUMN,
  ACTION_COLUMN,
  MORNING_MESSAGE_COLUMN,
} from './applyTableUpdates';
import { effectiveCellText } from './cellPieces';
import type { ScriptFilesIndex } from './scriptFiles';
import { resolvePlannedUpdateTargets } from './certificationIdentity';

export interface PlannedOpsOptions extends CellOpsOptions {
  /** Provenance stamped on every op this run writes (e.g. `certify:d3:a:e`). */
  source?: string;
  /** Files index - lets `Add File({...})` resolve to a file piece and lets
   *  `cellContents` bindings include file-piece content. */
  filesIndex?: ScriptFilesIndex;
  /** Reject index-bound legacy plans instead of guessing their current targets. */
  requireStableTargets?: boolean;
  /** Needed by the separately stored morning-message half for ID resolution. */
  titles?: UserTableTitle;
  strict?: boolean;
}

/**
 * Execute a list of PlannedUpdates against the user table.
 *
 * Each PlannedUpdate is an operation (`op`): 'add'/'remove'/'replace' append
 * provenance markers to the target cell, 'each' (or absent, legacy) evaluates
 * the stored expression against the current cell and replaces the base.
 * `source` stamps provenance on everything written.
 */
export const executePlannedUpdates = (
  users: UserTableItem[],
  plannedUpdates: PlannedUpdate[],
  titles: UserTableTitle,
  options?: PlannedOpsOptions
): UserTableItem[] => {
  let result = [...users];
  const applyUpdate = (update: TableUpdate) => {
    result = applyCellOps(result, [update], titles, options);
  };

  const resolvedUpdates = plannedUpdates.flatMap((update) =>
    resolvePlannedUpdateTargets(update, users, titles, options?.requireStableTargets)
  );
  for (const update of resolvedUpdates) {
    const { playerIndex, dayIndex, column, columnType, updateExpression, itemName } = update;
    const op = update.op ?? 'each';

    const indices = playerIndex === null ? result.map((_, i) => i) : [playerIndex];

    for (const idx of indices) {
      if (idx < 0 || idx >= result.length) continue;

      const { cellValue, colIdx } = getCellInfo(
        result,
        idx,
        dayIndex,
        column,
        titles,
        options?.filesIndex
      );
      // Skip morning message updates (colIdx -6): handled separately by the
      // caller via executeMorningMessagePlannedUpdates
      if (colIdx === -1 || colIdx === -6) continue;

      // `Add File({ID = ..., PATH = ...})` → live-linked file piece
      if (op !== 'each') {
        const ref = fileRefFromExpression(updateExpression);
        if (ref) {
          applyUpdate({
            playerIndex: idx,
            dayIndex: columnType === 'day' ? dayIndex : null,
            column,
            value: ref.id ?? ref.path ?? '',
            valueKind: 'file',
            fileCall: resolvePlannedFileInputs(
              ref.expression,
              itemName,
              cellValue,
              options?.strict,
              options?.filesIndex
            ),
            mode: op === 'add' ? 'append' : op === 'remove' ? 'remove' : 'replace',
            source: options?.source,
            allowDuplicates: update.allowDuplicates,
            autoRemove: update.autoRemove,
          });
          continue;
        }
      }

      const newValue = evaluateUpdateExpression(
        updateExpression,
        itemName,
        cellValue,
        options?.strict
      );
      applyUpdate({
        playerIndex: idx,
        dayIndex: columnType === 'day' ? dayIndex : null,
        column,
        value: newValue,
        mode: op === 'add' ? 'append' : op === 'remove' ? 'remove' : 'replace',
        source: options?.source,
        allowDuplicates: update.allowDuplicates,
        autoRemove: update.autoRemove,
      });
    }
  }

  return result;
};

/** Parse `expr` and, if it is a `File({ID="..", PATH=".."})` call, return
 *  its reference. Used for `Add file` ops (they don't evaluate to a string). */
const fileRefFromExpression = (
  expression: string
): { id?: string; path?: string; expression: CallExpression } | null => {
  try {
    const script = parseScript(`Return ${expression};`);
    const stmt = script.statements[0];
    if (stmt?.kind !== 'ReturnStatement' || !stmt.value) return null;
    const expr = stmt.value;
    if (
      expr.kind !== 'CallExpression' ||
      expr.callee.kind !== 'IdentifierExpression' ||
      expr.callee.name.toLowerCase() !== 'file'
    ) {
      return null;
    }
    let id: string | undefined;
    let path: string | undefined;
    for (const arg of expr.arguments) {
      if (arg.kind !== 'NamedArgument' || arg.value.kind !== 'StringLiteral') continue;
      if (arg.name.toLowerCase() === 'id') id = arg.value.value;
      if (arg.name.toLowerCase() === 'path') path = arg.value.value;
    }
    if (id === undefined && path === undefined) return null;
    return { id, path, expression: expr };
  } catch {
    return null;
  }
};

const resolvePlannedFileInputs = (
  expression: CallExpression,
  itemName: string,
  cellValue: string,
  strict = false,
  filesIndex?: ScriptFilesIndex
): string => {
  const result = evaluateFileCallInputs(expression, {
    globals: { [itemName]: cellValue, cellContents: cellValue },
    fuel: 1000,
    maxDepth: 10,
    filesIndex,
  });
  if (strict && result.issues.length) {
    throw new Error(result.issues.map((issue) => issue.message).join('; '));
  }
  return printExpression(result.expression);
};

/** Get the current cell value and column metadata for a player/day/column.
 *  Cell values are the *effective* text (base + visible pieces, tags in
 *  `[/TAG: "x"/]` form) so expressions like `cellContents.contains(tag("X"))`
 *  see what the cell actually says.
 *  Special colIdx markers: -1 = not found, -2 = voteMultiplier, -3 = vote,
 *  -4 = action, -5 = livingState.
 */
const getCellInfo = (
  users: UserTableItem[],
  playerIndex: number,
  dayIndex: number | null,
  column: string,
  titles: UserTableTitle,
  filesIndex?: ScriptFilesIndex
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
      cellValue: effectiveCellText(user.playerData.extraColumns?.[colIdx] ?? '', filesIndex),
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
      cellValue: effectiveCellText(day?.extraColumns?.[colIdx] ?? '', filesIndex),
      colIdx,
      isDayColumn: true,
    };
  }
};

/** Evaluate a partially-evaluated update expression against the current cell value. */
const evaluateUpdateExpression = (
  expression: string,
  itemName: string,
  cellValue: string,
  strict = false
): string => {
  try {
    const result = interpretScript(`Return ${expression};`, {
      globals: {
        [itemName]: cellValue,
      },
      fuel: 1000,
      maxDepth: 10,
    });
    if (strict && result.issues.length) {
      throw new Error(result.issues.map((issue) => issue.message).join('; '));
    }
    // The interpreter returns the value of the last Return statement
    const value = result.value;
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return String(value);
    if (value === null || value === undefined) return '';
    return String(value);
  } catch (error) {
    if (strict) throw error;
    console.warn('Failed to evaluate planned update expression:', expression, error);
    return cellValue; // keep current value on error
  }
};

/**
 * Execute morning message planned updates against a morning messages list.
 * Morning messages are stored separately from the user table, keyed by
 * email → array indexed by day.
 */
export const executeMorningMessagePlannedUpdates = (
  morningMessagesList: Record<string, string[]>,
  plannedUpdates: PlannedUpdate[],
  users: UserTableItem[],
  options?: PlannedOpsOptions
): Record<string, string[]> => {
  let result = morningMessagesList;
  const applyUpdate = (update: TableUpdate) => {
    result = applyMorningMessageOps(result, [update], users, options);
  };

  const resolvedUpdates = plannedUpdates
    .filter((update) => update.column.toLowerCase() === MORNING_MESSAGE_COLUMN)
    .flatMap((update) => {
      if (update.targetIds && !options?.titles) {
        throw new Error('Morning-message identity resolution requires table titles');
      }
      return resolvePlannedUpdateTargets(
        update,
        users,
        options?.titles ?? { extraUserColumns: [], extraDayColumns: [] },
        options?.requireStableTargets
      );
    });
  for (const update of resolvedUpdates) {
    if (update.column.toLowerCase() !== MORNING_MESSAGE_COLUMN) continue;
    if (update.dayIndex === null) continue;
    const op = update.op ?? 'each';

    const indices = update.playerIndex === null ? users.map((_, i) => i) : [update.playerIndex];
    for (const idx of indices) {
      if (idx < 0 || idx >= users.length) continue;
      const user = users[idx];
      const email = user.email.toLowerCase();
      const cellValue = effectiveCellText(
        result[email]?.[update.dayIndex] ?? '',
        options?.filesIndex
      );

      if (op !== 'each') {
        const ref = fileRefFromExpression(update.updateExpression);
        if (ref) {
          applyUpdate({
            playerIndex: idx,
            dayIndex: update.dayIndex,
            column: update.column,
            value: ref.id ?? ref.path ?? '',
            valueKind: 'file',
            fileCall: resolvePlannedFileInputs(
              ref.expression,
              update.itemName,
              cellValue,
              options?.strict,
              options?.filesIndex
            ),
            mode: op === 'add' ? 'append' : op === 'remove' ? 'remove' : 'replace',
            source: options?.source,
            allowDuplicates: update.allowDuplicates,
            autoRemove: update.autoRemove,
          });
          continue;
        }
      }

      applyUpdate({
        playerIndex: idx,
        dayIndex: update.dayIndex,
        column: update.column,
        value: evaluateUpdateExpression(
          update.updateExpression,
          update.itemName,
          cellValue,
          options?.strict
        ),
        mode: op === 'add' ? 'append' : op === 'remove' ? 'remove' : 'replace',
        source: options?.source,
        allowDuplicates: update.allowDuplicates,
        autoRemove: update.autoRemove,
      });
    }
  }

  return result;
};
