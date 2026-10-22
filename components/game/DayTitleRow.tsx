import React, { useState } from 'react';
import FontText from '../ui/text/FontText';
import InlineEditableText from '../ui/forms/InlineEditableText';
import Row from '../layout/Row';
import AppButton from '../ui/buttons/AppButton';
import ColumnActionsDialog from './ColumnActionsDialog';
import { ColumnSizeOption, getInnerTextWidth } from './playerTableColumnSizing';
import { SelectableColumnOverlay } from './multiSelect/SelectableOverlay';
import type { CellContentType, UserTableTitle } from '../../types/playerTable';

interface DayTitleRowProps {
  userTableTitle?: UserTableTitle;
  onSetColumnType?: (index: number, type: CellContentType) => void;
  userTableColumnVisibility?: {
    extraUserColumns: boolean[];
    extraDayColumns: boolean[];
  };
  setColumnTitle?: (columnIndex: number, newTitle: string) => void;
  onEditStart?: () => void;
  onEditEnd?: () => void;
  isEditing?: boolean;
  dayBaseColumnWidths: {
    vote: number;
    action: number;
    morningMessage: number;
  };
  extraDayColumnWidths: number[];
  dayBaseColumnSizes: {
    vote: ColumnSizeOption;
    action: ColumnSizeOption;
    morningMessage: ColumnSizeOption;
  };
  extraDayColumnSizes: ColumnSizeOption[];
  onSetDayBaseColumnSize?: (
    columnKey: 'vote' | 'action' | 'morningMessage',
    size: ColumnSizeOption
  ) => void;
  onSetExtraDayColumnSize?: (columnIndex: number, size: ColumnSizeOption) => void;
  onDeleteExtraDayColumn?: (columnIndex: number) => void;
  selectionMode?: boolean;
  columnCellIds?: {
    vote: string[];
    action: string[];
    morningMessage: string[];
    extra: string[][];
  };
}

type ActiveColumnMenu =
  | { type: 'base'; column: 'vote' | 'action' | 'morningMessage' }
  | { type: 'extra'; index: number }
  | null;

const DayTitleRow = ({
  userTableTitle,
  userTableColumnVisibility,
  setColumnTitle,
  onEditStart,
  onEditEnd,
  isEditing,
  dayBaseColumnWidths,
  extraDayColumnWidths,
  dayBaseColumnSizes,
  extraDayColumnSizes,
  onSetDayBaseColumnSize,
  onSetExtraDayColumnSize,
  onDeleteExtraDayColumn,
  selectionMode = false,
  columnCellIds,
  onSetColumnType,
}: DayTitleRowProps) => {
  const titles = userTableTitle ?? { extraUserColumns: [], extraDayColumns: [] };
  const visibility = userTableColumnVisibility ?? { extraUserColumns: [], extraDayColumns: [] };
  const [editingColumns, setEditingColumns] = useState<Record<number, boolean>>({});
  const [activeMenu, setActiveMenu] = useState<ActiveColumnMenu>(null);

  const handleColumnEditStart = (columnIndex: number) => {
    setEditingColumns((prev) => ({ ...prev, [columnIndex]: true }));
    onEditStart?.();
  };

  const handleColumnEditEnd = (columnIndex: number) => {
    setEditingColumns((prev) => ({ ...prev, [columnIndex]: false }));
    onEditEnd?.();
  };

  return (
    <>
      <Row
        className={`bg-background border-border h-12 w-min gap-0 rounded-t-lg border-b-2 ${isEditing ? 'z-50' : ''}`}>
        <Row
          className="h-full items-center justify-center gap-0 px-2"
          style={{ width: dayBaseColumnWidths.vote, position: 'relative' }}>
          <FontText
            weight="medium"
            className="text-center"
            style={{ width: getInnerTextWidth(dayBaseColumnWidths.vote) }}>
            Vote
          </FontText>
          {!selectionMode && (
            <AppButton
              variant="grey"
              className="ml-0 mr-[0.4rem] max-h-6 w-6"
              onPress={() => setActiveMenu({ type: 'base', column: 'vote' })}>
              <FontText weight="bold" color="white" className="mt-[-0.1rem] text-lg">
                ⋯
              </FontText>
            </AppButton>
          )}
          <SelectableColumnOverlay columnCellIds={columnCellIds?.vote ?? []} cellType="daysVote" />
        </Row>
        <Row
          className="h-full items-center justify-center gap-0 px-2"
          style={{ width: dayBaseColumnWidths.action, position: 'relative' }}>
          <FontText
            weight="medium"
            className="text-center"
            style={{ width: getInnerTextWidth(dayBaseColumnWidths.action) }}>
            Action
          </FontText>
          {!selectionMode && (
            <AppButton
              variant="grey"
              className="ml-0 mr-[0.4rem] max-h-6 w-6"
              onPress={() => setActiveMenu({ type: 'base', column: 'action' })}>
              <FontText weight="bold" color="white" className="mt-[-0.1rem] text-lg">
                ⋯
              </FontText>
            </AppButton>
          )}
          <SelectableColumnOverlay
            columnCellIds={columnCellIds?.action ?? []}
            cellType="daysAction"
          />
        </Row>
        {dayBaseColumnWidths.morningMessage > 0 && (
          <Row
            className="h-full items-center justify-center gap-0 px-2"
            style={{ width: dayBaseColumnWidths.morningMessage, position: 'relative' }}>
            <FontText
              weight="medium"
              className="text-center"
              style={{ width: getInnerTextWidth(dayBaseColumnWidths.morningMessage) }}>
              Morning
            </FontText>
            {!selectionMode && (
              <AppButton
                variant="grey"
                className="ml-0 mr-[0.4rem] max-h-6 w-6"
                onPress={() => setActiveMenu({ type: 'base', column: 'morningMessage' })}>
                <FontText weight="bold" color="white" className="mt-[-0.1rem] text-lg">
                  ⋯
                </FontText>
              </AppButton>
            )}
            <SelectableColumnOverlay
              columnCellIds={columnCellIds?.morningMessage ?? []}
              cellType="morningMessage"
            />
          </Row>
        )}
        {titles.extraDayColumns.map((columnTitle, index) => {
          if (!visibility.extraDayColumns[index]) return null;

          const columnWidth = extraDayColumnWidths[index] ?? 112;
          const textWidth = getInnerTextWidth(columnWidth);

          return (
            <Row
              key={index}
              className={`h-full items-center justify-center gap-0 px-2 ${editingColumns[index] ? 'z-50' : ''}`}
              style={{ width: columnWidth, position: 'relative' }}>
              {!selectionMode && (
                <InlineEditableText
                  value={columnTitle}
                  onChange={(newValue) => setColumnTitle?.(index, newValue)}
                  placeholder="UNSET"
                  className="overflow-hidden text-nowrap text-center"
                  style={{ width: textWidth }}
                  weight="medium"
                  onEditStart={() => handleColumnEditStart(index)}
                  onEditEnd={() => handleColumnEditEnd(index)}
                />
              )}
              {!selectionMode && (
                <AppButton
                  variant="grey"
                  className="ml-0 mr-[0.4rem] max-h-6 w-6"
                  onPress={() => setActiveMenu({ type: 'extra', index })}>
                  <FontText weight="bold" color="white" className="mt-[-0.1rem] text-lg">
                    ⋯
                  </FontText>
                </AppButton>
              )}
              {selectionMode && (
                <FontText weight="medium" className="text-center" style={{ width: textWidth }}>
                  {columnTitle}
                </FontText>
              )}
              <SelectableColumnOverlay
                columnCellIds={columnCellIds?.extra[index] ?? []}
                cellType={
                  titles.extraDayColumnTypes?.[index] === 'files' ? 'daysExtraFiles' : 'daysExtra'
                }
              />
            </Row>
          );
        })}
      </Row>

      <ColumnActionsDialog
        isOpen={activeMenu !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActiveMenu(null);
          }
        }}
        title={activeMenu?.type === 'extra' ? 'Column options' : 'Resize column'}
        contentType={
          activeMenu?.type === 'extra'
            ? (titles.extraDayColumnTypes?.[activeMenu.index] ?? 'tags')
            : undefined
        }
        onSelectContentType={
          activeMenu?.type === 'extra'
            ? (type) => onSetColumnType?.(activeMenu.index, type)
            : undefined
        }
        selectedSize={
          activeMenu?.type === 'base'
            ? dayBaseColumnSizes[activeMenu.column]
            : activeMenu?.type === 'extra'
              ? (extraDayColumnSizes[activeMenu.index] ?? 'small')
              : 'small'
        }
        onSelectSize={(size) => {
          if (activeMenu?.type === 'base') {
            onSetDayBaseColumnSize?.(activeMenu.column, size);
            return;
          }

          if (activeMenu?.type === 'extra') {
            onSetExtraDayColumnSize?.(activeMenu.index, size);
          }
        }}
        onDelete={
          activeMenu?.type === 'extra'
            ? () => onDeleteExtraDayColumn?.(activeMenu.index)
            : undefined
        }
      />
    </>
  );
};

export default DayTitleRow;
