import React, { useState } from 'react';
import { Pressable } from 'react-native';
import FontText from '../ui/text/FontText';
import Column from '../layout/Column';
import Row from '../layout/Row';
import ColumnActionsDialog from './ColumnActionsDialog';
import { ColumnSizeOption, getInnerTextWidth } from './playerTableColumnSizing';
import { SelectableColumnOverlay } from './multiSelect/SelectableOverlay';
import type { CellContentType, UserTableTitle } from '../../types/playerTable';

interface TitleRowProps {
  userTableTitle?: UserTableTitle;
  onSetColumnType?: (index: number, type: CellContentType) => void;
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
  selectionMode?: boolean;
  columnCellIds?: string[][];
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
  selectionMode = false,
  columnCellIds,
  onSetColumnType,
}: TitleRowProps) => {
  const titles = userTableTitle ?? { extraUserColumns: [], extraDayColumns: [] };
  const visibility = userTableColumnVisibility ?? { extraUserColumns: [], extraDayColumns: [] };
  const [activeMenu, setActiveMenu] = useState<number | null>(null);

  const openMenu = (index: number) => {
    setActiveMenu(index);
    onEditStart?.();
  };

  return (
    <>
      <Row
        className={`bg-background border-border h-12 w-min gap-0 rounded-t-sm border-b-2 ${isEditing ? 'z-50' : ''}`}>
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
              className="h-full items-center justify-center gap-0 px-2"
              style={{ width: columnWidth, position: 'relative' }}>
              {selectionMode ? (
                <FontText weight="medium" className="text-center" style={{ width: textWidth }}>
                  {columnTitle}
                </FontText>
              ) : (
                <Pressable
                  onPress={() => openMenu(index)}
                  className="hover:bg-text/10"
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <FontText
                    weight="medium"
                    className="overflow-hidden text-nowrap text-center"
                    style={{ width: textWidth }}>
                    {columnTitle || <FontText className="opacity-50">UNSET</FontText>}
                  </FontText>
                </Pressable>
              )}
              <SelectableColumnOverlay
                columnCellIds={columnCellIds?.[index] ?? []}
                cellType={
                  titles.extraUserColumnTypes?.[index] === 'files'
                    ? 'playerExtraFiles'
                    : 'playerExtra'
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
            onEditEnd?.();
          }
        }}
        title="Column options"
        columnTitle={activeMenu !== null ? titles.extraUserColumns[activeMenu] : undefined}
        onRename={
          activeMenu !== null
            ? (newTitle) => setColumnTitle?.(activeMenu, newTitle)
            : undefined
        }
        contentType={
          activeMenu === null ? 'tags' : (titles.extraUserColumnTypes?.[activeMenu] ?? 'tags')
        }
        onSelectContentType={
          activeMenu === null ? undefined : (type) => onSetColumnType?.(activeMenu, type)
        }
        selectedSize={
          activeMenu !== null ? (extraUserColumnSizes?.[activeMenu] ?? 'small') : 'small'
        }
        onSelectSize={(size) => {
          if (activeMenu !== null) {
            onSetExtraUserColumnSize?.(activeMenu, size);
          }
        }}
        onDelete={activeMenu !== null ? () => onDeleteExtraUserColumn?.(activeMenu) : undefined}
      />
    </>
  );
};

export default TitleRow;
