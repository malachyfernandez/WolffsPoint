import { UserTableItem, UserTableTitle } from '../types/playerTable';
import { TableUpdate } from '../app/script/registry';
import { parseCell, encodeTags } from './tagEncoding';

/**
 * Special column names for built-in fields that are not extra columns.
 * These can be selected in the UpdateCell column dropdown but are stored
 * directly on PlayerData / DayData instead of in the extraColumns array.
 */
export const VOTE_MULTIPLIER_COLUMN = 'votemultiplier';
export const LIVING_STATE_COLUMN = 'livingstate';
export const VOTE_COLUMN = 'vote';
export const ACTION_COLUMN = 'action';

/** Columns whose updates should be applied last (vote/action are high-impact). */
const LAST_PRIORITY_COLUMNS = new Set([VOTE_COLUMN, ACTION_COLUMN]);

/** Check if a column name refers to a special built-in field. */
const isVoteMultiplier = (column: string): boolean =>
  column.toLowerCase() === VOTE_MULTIPLIER_COLUMN;
const isLivingState = (column: string): boolean => column.toLowerCase() === LIVING_STATE_COLUMN;
const isVote = (column: string): boolean => column.toLowerCase() === VOTE_COLUMN;
const isAction = (column: string): boolean => column.toLowerCase() === ACTION_COLUMN;

/**
 * Apply a list of TableUpdates to a user table.
 * Returns a new array with the updates applied.
 *
 * Updates are sorted so that vote and action updates are applied LAST,
 * ensuring any other cell changes (including the tag add/remove that
 * triggered the script) are already in place before vote/action are set.
 *
 * - replace: set the cell to the new value
 * - append: append the value to the cell (for tags, add the tag; for text, concatenate)
 * - remove: remove the value from the cell (for tags, remove the tag; for text, string replace)
 */
export const applyTableUpdates = (
  users: UserTableItem[],
  updates: TableUpdate[],
  titles: UserTableTitle
): UserTableItem[] => {
  // Sort so vote/action updates come last
  const sorted = [...updates].sort((a, b) => {
    const aLast = LAST_PRIORITY_COLUMNS.has(a.column.toLowerCase()) ? 1 : 0;
    const bLast = LAST_PRIORITY_COLUMNS.has(b.column.toLowerCase()) ? 1 : 0;
    return aLast - bLast;
  });

  let result = [...users];

  for (const update of sorted) {
    const { playerIndex, dayIndex, column, value, mode } = update;

    // Determine which players to update
    const indices = playerIndex === null ? result.map((_, i) => i) : [playerIndex];

    for (const idx of indices) {
      if (idx < 0 || idx >= result.length) continue;

      const user = result[idx];

      if (dayIndex === null) {
        if (isLivingState(column)) {
          // livingState: 'alive' or 'dead'
          const lower = value.toLowerCase();
          const livingState = lower === 'alive' || lower === 'dead' ? lower : 'dead';
          result[idx] = {
            ...user,
            playerData: {
              ...user.playerData,
              livingState: livingState as 'alive' | 'dead',
            },
          };
        } else {
          // Player-level extra column
          const extraUserColumnTitles = titles.extraUserColumns ?? [];
          const colIdx = extraUserColumnTitles.findIndex(
            (t) => t.toLowerCase() === column.toLowerCase()
          );
          if (colIdx === -1) continue;

          const extraColumns = [...(user.playerData.extraColumns ?? [])];
          while (extraColumns.length < extraUserColumnTitles.length) {
            extraColumns.push('');
          }
          extraColumns[colIdx] = applyCellValueMode(extraColumns[colIdx] ?? '', value, mode);

          result[idx] = {
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
        while (days.length <= dayIndex) {
          days.push({ vote: '', action: '', extraColumns: [] });
        }

        const day = { ...days[dayIndex] };

        if (isVoteMultiplier(column)) {
          // voteMultiplier is a number, not a string cell — parse and replace
          const parsed = parseFloat(value);
          day.voteMultiplier = isNaN(parsed) ? 1 : parsed;
        } else if (isVote(column)) {
          // vote is a string field on DayData
          day.vote = applyCellValueMode(day.vote ?? '', value, mode);
        } else if (isAction(column)) {
          // action is a string field on DayData (MarkdownInputState is also string-compatible)
          day.action = applyCellValueMode(
            typeof day.action === 'string' ? day.action : '',
            value,
            mode
          );
        } else {
          // Extra day column
          const extraDayColumnTitles = titles.extraDayColumns ?? [];
          const colIdx = extraDayColumnTitles.findIndex(
            (t) => t.toLowerCase() === column.toLowerCase()
          );
          if (colIdx === -1) continue;

          const extraColumns = [...(day.extraColumns ?? [])];
          while (extraColumns.length < extraDayColumnTitles.length) {
            extraColumns.push('');
          }
          extraColumns[colIdx] = applyCellValueMode(extraColumns[colIdx] ?? '', value, mode);
          day.extraColumns = extraColumns;
        }

        days[dayIndex] = day;

        result[idx] = {
          ...user,
          days,
        };
      }
    }
  }

  return result;
};

/**
 * Apply a mode (replace/append/remove) to a cell value.
 * Handles both tag-mode and text-mode cells.
 */
const applyCellValueMode = (current: string, value: string, mode: string): string => {
  if (mode === 'replace') {
    return value;
  }

  if (mode === 'append') {
    // If the value looks like a tag, and the cell is in tag mode (or empty),
    // add it as a tag. Otherwise concatenate as text.
    const currentParsed = parseCell(current);
    const valueParsed = parseCell(value);

    if (valueParsed.hasTags) {
      // Appending a tag — merge tags
      const currentTags = currentParsed.hasTags ? currentParsed.tags.map((t) => t.name) : [];
      const newTags = valueParsed.tags.map((t) => t.name);
      const merged = [...new Set([...currentTags, ...newTags])];
      return encodeTags(merged);
    }

    // Appending text — just concatenate
    return current + value;
  }

  if (mode === 'remove') {
    // If the value is a tag, remove that specific tag from the cell
    const valueParsed = parseCell(value);
    if (valueParsed.hasTags) {
      const currentParsed = parseCell(current);
      if (currentParsed.hasTags) {
        const tagsToRemove = new Set(valueParsed.tags.map((t) => t.name.toLowerCase()));
        const remaining = currentParsed.tags.filter((t) => !tagsToRemove.has(t.name.toLowerCase()));
        return encodeTags(remaining.map((t) => t.name));
      }
      return current;
    }

    // Remove text substring
    return current.replace(value, '');
  }

  return current;
};
