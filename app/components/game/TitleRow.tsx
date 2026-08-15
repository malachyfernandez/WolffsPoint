import React, { useState } from 'react';
import FontText from '../ui/text/FontText';
import InlineEditableText from '../ui/forms/InlineEditableText';
import Column from '../layout/Column';
import Row from '../layout/Row';
import AppButton from '../ui/buttons/AppButton';
import ColumnActionsDialog from './ColumnActionsDialog';
import { ColumnSizeOption, getInnerTextWidth } from './playerTableColumnSizing';

interface TitleRowProps {
  userTableTitle?: {
    extraUserColumns: string[];
    extraDayColumns: string[];
  };
  userTableColumnVisibility?: {
    extraUserColumns: boolean[];
    extraDayColumns: boolean[];
  };
  setColumnTitle?: (columnIndex: number, newTitle: string) => void;
  setColumnVisibility?: (columnIndex: number, visibility: boolean) => void;
  onEditStart?: () => void;
  onEditEnd?: () => void;
  isEditing?: boolean;
  extraUserColumnWidths?: number[];
  extraUserColumnSizes?: ColumnSizeOption[];
  onSetExtraUserColumnSize?: (columnIndex: number, size: ColumnSizeOption) => void;
  onDeleteExtraUserColumn?: (columnIndex: number) => void;
  /** Per-column nightly visibility flags (extra user columns). */
  nightlyVisibility?: boolean[];
  /** Toggle nightly visibility for a column. */
  onToggleNightlyVisibility?: (columnIndex: number) => void;
}

const TitleRow = ({
  userTableTitle,
  userTableColumnVisibility,
  setColumnTitle,
  setColumnVisibility,
  onEditStart,
  onEditEnd,
  isEditing,
  extraUserColumnWidths,
  extraUserColumnSizes,
  onSetExtraUserColumnSize,
  onDeleteExtraUserColumn,
  nightlyVisibility,
  onToggleNightlyVisibility,
}: TitleRowProps) => {
  const titles = userTableTitle ?? { extraUserColumns: [], extraDayColumns: [] };
  const visibility = userTableColumnVisibility ?? { extraUserColumns: [], extraDayColumns: [] };
  const [editingColumns, setEditingColumns] = useState<Record<number, boolean>>({});
  const [activeMenu, setActiveMenu] = useState<number | null>(null);

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
        <Column className="h-full w-12 items-center justify-center gap-4">
          <FontText weight="medium" className="text-center">
            D/A
          </FontText>
        </Column>
        <Column className="h-full w-28 items-center justify-center gap-0">
          <FontText weight="medium" className="text-center">
            Player
          </FontText>
        </Column>
        {titles.extraUserColumns.map((columnTitle, index) => {
          if (!visibility.extraUserColumns[index]) return null;

          const columnWidth = extraUserColumnWidths?.[index] ?? 112;
          const textWidth = getInnerTextWidth(columnWidth);

          return (
            <Row
              key={index}
              className={`h-full items-center justify-center gap-0 px-2 ${editingColumns[index] ? 'z-50' : ''}`}
              style={{ width: columnWidth }}>
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
              <AppButton
                variant="grey"
                className="ml-0 mr-[0.4rem] max-h-6 w-6"
                onPress={() => setActiveMenu(index)}>
                <FontText weight="bold" color="white" className="mt-[-0.1rem] text-lg">
                  ⋯
                </FontText>
              </AppButton>
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
        title="Column options"
        selectedSize={
          activeMenu !== null ? (extraUserColumnSizes?.[activeMenu] ?? 'small') : 'small'
        }
        onSelectSize={(size) => {
          if (activeMenu !== null) {
            onSetExtraUserColumnSize?.(activeMenu, size);
          }
        }}
        onDelete={activeMenu !== null ? () => onDeleteExtraUserColumn?.(activeMenu) : undefined}
        showInNightly={activeMenu !== null ? nightlyVisibility?.[activeMenu] : undefined}
        onToggleShowInNightly={
          activeMenu !== null && onToggleNightlyVisibility
            ? () => onToggleNightlyVisibility(activeMenu)
            : undefined
        }
      />
    </>
  );
};

export default TitleRow;
