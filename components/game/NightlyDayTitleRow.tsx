import React, { useState } from 'react';
import FontText from '../ui/text/FontText';
import Row from '../layout/Row';
import AppButton from '../ui/buttons/AppButton';
import ColumnActionsDialog from './ColumnActionsDialog';
import { ColumnSizeOption, getInnerTextWidth } from './nightlyTableColumnSizing';
import { SelectableColumnOverlay } from './multiSelect/SelectableOverlay';

interface NightlyDayTitleRowProps {
  onEditStart?: () => void;
  onEditEnd?: () => void;
  isEditing?: boolean;
  columnWidths: {
    vote: number;
    action: number;
    morningMessage: number;
  };
  columnSizes: {
    vote: ColumnSizeOption;
    action: ColumnSizeOption;
    morningMessage: ColumnSizeOption;
  };
  onSetColumnSize?: (
    columnKey: 'vote' | 'action' | 'morningMessage',
    size: ColumnSizeOption
  ) => void;
  extraDayColumns?: string[];
  extraDayColumnWidths?: number[];
  selectionMode?: boolean;
  columnCellIds?: {
    vote: string[];
    action: string[];
    morningMessage: string[];
    extra: string[][];
  };
}

type ActiveColumnMenu = { column: 'vote' | 'action' | 'morningMessage' } | null;

const NightlyDayTitleRow = ({
  onEditStart,
  onEditEnd,
  isEditing,
  columnWidths,
  columnSizes,
  onSetColumnSize,
  extraDayColumns = [],
  extraDayColumnWidths = [],
  selectionMode = false,
  columnCellIds,
}: NightlyDayTitleRowProps) => {
  const [activeMenu, setActiveMenu] = useState<ActiveColumnMenu>(null);

  // Wait for column widths to be ready before rendering to prevent flicker
  const areColumnWidthsReady =
    columnWidths.vote > 0 && columnWidths.action > 0 && columnWidths.morningMessage > 0;

  if (!areColumnWidthsReady) {
    return <Row className="bg-background border-border h-12 w-min gap-0 rounded-t-lg border-b-2" />;
  }

  return (
    <>
      <Row
        className={`bg-background border-border h-12 w-min gap-0 rounded-t-lg border-b-2 ${isEditing ? 'z-50' : ''}`}>
        <Row
          className="h-full items-center justify-center gap-0 px-2"
          style={{ width: columnWidths.vote, position: 'relative' }}>
          <FontText
            weight="medium"
            className="text-center"
            style={{ width: getInnerTextWidth(columnWidths.vote) }}>
            Vote
          </FontText>
          {!selectionMode && (
            <AppButton
              variant="grey"
              className="ml-0 mr-[0.4rem] max-h-6 w-6"
              onPress={() => setActiveMenu({ column: 'vote' })}>
              <FontText weight="bold" color="white" className="mt-[-0.1rem] text-lg">
                ⋯
              </FontText>
            </AppButton>
          )}
          <SelectableColumnOverlay
            columnCellIds={columnCellIds?.vote ?? []}
            cellType="nightlyVote"
          />
        </Row>
        <Row
          className="h-full items-center justify-center gap-0 px-2"
          style={{ width: columnWidths.action, position: 'relative' }}>
          <FontText
            weight="medium"
            className="text-center"
            style={{ width: getInnerTextWidth(columnWidths.action) }}>
            Action
          </FontText>
          {!selectionMode && (
            <AppButton
              variant="grey"
              className="ml-0 mr-[0.4rem] max-h-6 w-6"
              onPress={() => setActiveMenu({ column: 'action' })}>
              <FontText weight="bold" color="white" className="mt-[-0.1rem] text-lg">
                ⋯
              </FontText>
            </AppButton>
          )}
          <SelectableColumnOverlay
            columnCellIds={columnCellIds?.action ?? []}
            cellType="nightlyAction"
          />
        </Row>
        <Row
          className="h-full items-center justify-center gap-0 px-2"
          style={{ width: columnWidths.morningMessage, position: 'relative' }}>
          <FontText
            weight="medium"
            className="text-center"
            style={{ width: getInnerTextWidth(columnWidths.morningMessage) }}>
            Morning Message (Tomorrow)
          </FontText>
          {!selectionMode && (
            <AppButton
              variant="grey"
              className="ml-0 mr-[0.4rem] max-h-6 w-6"
              onPress={() => setActiveMenu({ column: 'morningMessage' })}>
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
        {extraDayColumns.map((title, index) => {
          const width = extraDayColumnWidths[index] ?? 112;
          return (
            <Row
              key={index}
              className="h-full items-center justify-center gap-0 px-2"
              style={{ width, position: 'relative' }}>
              <FontText
                weight="medium"
                className="overflow-hidden text-nowrap text-center"
                style={{ width: getInnerTextWidth(width) }}>
                {title || 'UNSET'}
              </FontText>
              <SelectableColumnOverlay
                columnCellIds={columnCellIds?.extra[index] ?? []}
                cellType="nightlyExtra"
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
        title="Resize column"
        selectedSize={activeMenu ? columnSizes[activeMenu.column] : 'small'}
        onSelectSize={(size) => {
          if (activeMenu) {
            onSetColumnSize?.(activeMenu.column, size);
          }
        }}
      />
    </>
  );
};

export default NightlyDayTitleRow;
