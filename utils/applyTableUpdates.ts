import { UserTableItem, UserTableTitle } from '../types/playerTable';
import { TableUpdate } from '../app/script/registry';
import { parseCell, encodeTags } from './tagEncoding';

/**
 * Apply a list of TableUpdates to a user table.
 * Returns a new array with the updates applied.
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
  let result = [...users];

  for (const update of updates) {
    const { playerIndex, dayIndex, column, value, mode } = update;

    // Determine which players to update
    const indices = playerIndex === null ? result.map((_, i) => i) : [playerIndex];

    for (const idx of indices) {
      if (idx < 0 || idx >= result.length) continue;

      const user = result[idx];

      if (dayIndex === null) {
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
      } else {
        // Day-level extra column
        const extraDayColumnTitles = titles.extraDayColumns ?? [];
        const colIdx = extraDayColumnTitles.findIndex(
          (t) => t.toLowerCase() === column.toLowerCase()
        );
        if (colIdx === -1) continue;

        const days = [...(user.days ?? [])];
        while (days.length <= dayIndex) {
          days.push({ vote: '', action: '', extraColumns: [] });
        }

        const day = { ...days[dayIndex] };
        const extraColumns = [...(day.extraColumns ?? [])];
        while (extraColumns.length < extraDayColumnTitles.length) {
          extraColumns.push('');
        }
        extraColumns[colIdx] = applyCellValueMode(extraColumns[colIdx] ?? '', value, mode);

        day.extraColumns = extraColumns;
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
