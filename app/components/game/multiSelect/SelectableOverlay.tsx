import React from 'react';
import { Pressable } from 'react-native';
import { CheckSquare, Square } from 'lucide-react-native';
import { useMultiSelect } from './MultiSelectContext';

const ICON_COLOR = 'rgb(46, 41, 37)';

/** Checkbox icon shown on cells in selection mode. */
export const CellCheckbox = ({ selected, size = 14 }: { selected: boolean; size?: number }) => {
  return selected ? (
    <CheckSquare size={size} color={ICON_COLOR} fill={ICON_COLOR} stroke="white" />
  ) : (
    <Square size={size} color={ICON_COLOR} />
  );
};

/** Checkbox for column headers (slightly larger). */
export const ColumnCheckbox = ({ selected }: { selected: boolean }) => (
  <CellCheckbox selected={selected} size={16} />
);

/**
 * Overlay that sits on top of a cell when in selection mode.
 * Intercepts presses for selection. Shows a checkbox on the left.
 * Greys out cells whose type doesn't match the locked selection type.
 *
 * The parent must have `position: 'relative'` for the overlay to fill it.
 */
export const SelectableOverlay = ({
  cellId,
  cellType,
}: {
  cellId: string;
  cellType: string;
}) => {
  const { selectionMode, toggleCell, isCellSelected, isCellDisabled } = useMultiSelect();

  if (!selectionMode) return null;

  const selected = isCellSelected(cellId);
  const disabled = isCellDisabled(cellType);

  return (
    <Pressable
      onPress={() => {
        if (!disabled) toggleCell(cellId, cellType);
      }}
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        backgroundColor: disabled ? 'rgba(128, 128, 128, 0.4)' : 'transparent',
      }}
      className="items-start justify-start p-1">
      {!disabled && <CellCheckbox selected={selected} />}
    </Pressable>
  );
};

/**
 * Overlay for column headers in selection mode.
 * Pressing selects/deselects all cells in the column.
 */
export const SelectableColumnOverlay = ({
  columnCellIds,
  cellType,
}: {
  columnCellIds: string[];
  cellType: string;
}) => {
  const { selectionMode, toggleColumn, isColumnAllSelected, isCellDisabled } = useMultiSelect();

  if (!selectionMode) return null;

  const allSelected = isColumnAllSelected(columnCellIds);
  const disabled = isCellDisabled(cellType);

  return (
    <Pressable
      onPress={() => {
        if (!disabled) toggleColumn(columnCellIds, cellType);
      }}
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        backgroundColor: disabled ? 'rgba(128, 128, 128, 0.4)' : 'transparent',
      }}
      className="items-start justify-start p-1">
      {!disabled && <ColumnCheckbox selected={allSelected} />}
    </Pressable>
  );
};
