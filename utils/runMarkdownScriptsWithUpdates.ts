import { interpretScript } from '../app/script/runtime/interpreter';
import { createScriptGlobals, type ScriptSourceData } from '../app/script/runtime/sources';
import { TableUpdate } from '../app/script/registry';
import { UserTableItem, UserTableTitle } from '../types/playerTable';
import { MarkdownInputState, PlannedUpdate } from '../types/multiplayer';
import {
  VOTE_MULTIPLIER_COLUMN,
  VOTE_COLUMN,
  ACTION_COLUMN,
  MORNING_MESSAGE_COLUMN,
} from './applyTableUpdates';

/**
 * Extract /*script ... script*\/ blocks from markdown text.
 * Mirrors the parsing logic in MarkdownRenderer.tsx parseMarkdown().
 */
const extractScriptBlocks = (markdown: string): string[] => {
  if (!markdown) return [];
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();

    if (line.toLowerCase().startsWith('/*script')) {
      const scriptLines: string[] = [];
      let scriptLine = lines[index].trimEnd();
      scriptLine = scriptLine.slice(scriptLine.toLowerCase().indexOf('/*script') + 8);
      while (!scriptLine.toLowerCase().includes('script*/') && index + 1 < lines.length) {
        if (scriptLine.length > 0) {
          scriptLines.push(scriptLine);
        }
        index += 1;
        scriptLine = lines[index].trimEnd();
      }
      const closingIndex = scriptLine.toLowerCase().indexOf('script*/');
      const finalLine = closingIndex >= 0 ? scriptLine.slice(0, closingIndex) : scriptLine;
      if (finalLine.length > 0) {
        scriptLines.push(finalLine);
      }
      blocks.push(scriptLines.join('\n').trim());
    }

    index += 1;
  }

  return blocks.filter((s) => s.length > 0);
};

/**
 * Decode input state from the stored format (strings that may be JSON).
 * Mirrors decodeInputState in ScriptRuntime.tsx.
 */
const decodeInputState = (state: MarkdownInputState = {}): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(state).map(([key, value]) => {
      if (value?.startsWith('[') || value?.startsWith('{')) {
        try {
          return [key, JSON.parse(value)];
        } catch {
          return [key, value];
        }
      }
      return [key, value];
    })
  );

/**
 * Build a getCellValue function that reads from the current user table.
 */
const buildGetCellValue = (
  users: UserTableItem[],
  titles: UserTableTitle,
  morningMessagesList?: Record<string, string[]>
) => {
  return (playerIndex: number | null, dayIndex: number | null, column: string): string => {
    const indices = playerIndex === null ? users.map((_, i) => i) : [playerIndex];
    if (indices.length === 0) return '';
    const idx = indices[0];
    if (idx < 0 || idx >= users.length) return '';

    const user = users[idx];
    const colLower = column.toLowerCase();

    if (dayIndex === null) {
      const extraUserColumnTitles = titles.extraUserColumns ?? [];
      const colIdx = extraUserColumnTitles.findIndex((t) => t.toLowerCase() === colLower);
      if (colIdx === -1) return '';
      return user.playerData.extraColumns?.[colIdx] ?? '';
    } else {
      if (colLower === MORNING_MESSAGE_COLUMN) {
        if (!morningMessagesList) return '';
        return morningMessagesList[user.email.toLowerCase()]?.[dayIndex] ?? '';
      }
      if (colLower === VOTE_MULTIPLIER_COLUMN) {
        const day = user.days?.[dayIndex];
        return String(day?.voteMultiplier ?? 1);
      }
      if (colLower === VOTE_COLUMN) {
        const day = user.days?.[dayIndex];
        return day?.vote ?? '';
      }
      if (colLower === ACTION_COLUMN) {
        const day = user.days?.[dayIndex];
        return typeof day?.action === 'string' ? day.action : '';
      }
      const extraDayColumnTitles = titles.extraDayColumns ?? [];
      const colIdx = extraDayColumnTitles.findIndex((t) => t.toLowerCase() === colLower);
      if (colIdx === -1) return '';
      const day = user.days?.[dayIndex];
      return day?.extraColumns?.[colIdx] ?? '';
    }
  };
};

/**
 * Run all script blocks embedded in a markdown role message with table update
 * support. Returns the collected TableUpdate[].
 *
 * This is used at certify time to run each player's role message script with
 * their submitted input state, allowing UpdateCell blocks to modify the table.
 */
export const runMarkdownScriptsWithUpdates = (
  markdown: string,
  inputState: MarkdownInputState,
  source: ScriptSourceData,
  users: UserTableItem[],
  titles: UserTableTitle,
  morningMessagesList?: Record<string, string[]>
): { updates: TableUpdate[]; issues: string[] } => {
  const scriptBlocks = extractScriptBlocks(markdown);
  if (scriptBlocks.length === 0) return { updates: [], issues: [] };

  const globals = createScriptGlobals({ ...source, morningMessagesList });
  const decodedInputState = decodeInputState(inputState);
  const getCellValue = buildGetCellValue(users, titles, morningMessagesList);
  const allUpdates: TableUpdate[] = [];
  const allIssues: string[] = [];

  for (const scriptSource of scriptBlocks) {
    const updates: TableUpdate[] = [];
    try {
      const result = interpretScript(scriptSource, {
        globals: {
          ...globals,
          Inputs: decodedInputState,
        },
        inputState: decodedInputState,
        tableUpdates: updates,
        getCellValue,
      });
      allUpdates.push(...updates);
      allIssues.push(...result.issues.map((i) => i.message));
    } catch (error) {
      allIssues.push(error instanceof Error ? error.message : 'Script execution failed');
    }
  }

  return { updates: allUpdates, issues: allIssues };
};

/**
 * Run all script blocks embedded in a markdown role message in "planning mode".
 * Instead of collecting final TableUpdate values, this collects PlannedUpdate
 * objects with partially-evaluated expression strings where all variables
 * (currentDay, Inputs, etc.) are resolved to their values but function calls
 * (tag(), .append(), etc.) are kept as-is.
 *
 * At certify time, these expressions are evaluated with the cell variable
 * bound to the current cell value, and the results are applied to the table.
 */
export const planMarkdownScriptUpdates = (
  markdown: string,
  inputState: MarkdownInputState,
  source: ScriptSourceData,
  users: UserTableItem[],
  titles: UserTableTitle,
  morningMessagesList?: Record<string, string[]>
): { plannedUpdates: PlannedUpdate[]; issues: string[] } => {
  const scriptBlocks = extractScriptBlocks(markdown);
  if (scriptBlocks.length === 0) return { plannedUpdates: [], issues: [] };

  const globals = createScriptGlobals({ ...source, morningMessagesList });
  const decodedInputState = decodeInputState(inputState);
  const getCellValue = buildGetCellValue(users, titles, morningMessagesList);
  const allPlannedUpdates: PlannedUpdate[] = [];
  const allIssues: string[] = [];

  for (const scriptSource of scriptBlocks) {
    const plannedUpdates: PlannedUpdate[] = [];
    try {
      const result = interpretScript(scriptSource, {
        globals: {
          ...globals,
          Inputs: decodedInputState,
        },
        inputState: decodedInputState,
        plannedUpdates,
        getCellValue,
      });
      allPlannedUpdates.push(...plannedUpdates);
      allIssues.push(...result.issues.map((i) => i.message));
    } catch (error) {
      allIssues.push(error instanceof Error ? error.message : 'Script execution failed');
    }
  }

  return { plannedUpdates: allPlannedUpdates, issues: allIssues };
};
