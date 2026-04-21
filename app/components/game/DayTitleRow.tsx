import React, { useState } from 'react';
import FontText from '../ui/text/FontText';
import InlineEditableText from '../ui/forms/InlineEditableText';
import Row from '../layout/Row';
import AppButton from '../ui/buttons/AppButton';
import ColumnActionsDialog from './ColumnActionsDialog';
import { ColumnSizeOption, getInnerTextWidth } from './playerTableColumnSizing';

interface DayTitleRowProps {
    userTableTitle?: {
        extraUserColumns: string[];
        extraDayColumns: string[];
    };
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
    };
    extraDayColumnWidths: number[];
    dayBaseColumnSizes: {
        vote: ColumnSizeOption;
        action: ColumnSizeOption;
    };
    extraDayColumnSizes: ColumnSizeOption[];
    onSetDayBaseColumnSize?: (columnKey: 'vote' | 'action', size: ColumnSizeOption) => void;
    onSetExtraDayColumnSize?: (columnIndex: number, size: ColumnSizeOption) => void;
    onDeleteExtraDayColumn?: (columnIndex: number) => void;
}

type ActiveColumnMenu =
    | { type: 'base'; column: 'vote' | 'action' }
    | { type: 'extra'; index: number }
    | null;

const DayTitleRow = ({ userTableTitle, userTableColumnVisibility, setColumnTitle, onEditStart, onEditEnd, isEditing, dayBaseColumnWidths, extraDayColumnWidths, dayBaseColumnSizes, extraDayColumnSizes, onSetDayBaseColumnSize, onSetExtraDayColumnSize, onDeleteExtraDayColumn }: DayTitleRowProps) => {
    const titles = userTableTitle ?? { extraUserColumns: [], extraDayColumns: [] };
    const visibility = userTableColumnVisibility ?? { extraUserColumns: [], extraDayColumns: [] };
    const [editingColumns, setEditingColumns] = useState<Record<number, boolean>>({});
    const [activeMenu, setActiveMenu] = useState<ActiveColumnMenu>(null);

    const handleColumnEditStart = (columnIndex: number) => {
        setEditingColumns(prev => ({ ...prev, [columnIndex]: true }));
        onEditStart?.();
    };

    const handleColumnEditEnd = (columnIndex: number) => {
        setEditingColumns(prev => ({ ...prev, [columnIndex]: false }));
        onEditEnd?.();
    };

    return (
        <>
            <Row className={`gap-0 h-12 w-min bg-background border-b-2 border-border rounded-t-lg ${isEditing ? 'z-50' : ''}`}>
                <Row className='gap-0 h-full items-center justify-center px-2' style={{ width: dayBaseColumnWidths.vote }}>
                    <FontText weight='medium' className='text-center' style={{ width: getInnerTextWidth(dayBaseColumnWidths.vote) }}>Vote</FontText>
                    <AppButton variant="grey" className='w-6 max-h-6 mr-[0.4rem] ml-0' onPress={() => setActiveMenu({ type: 'base', column: 'vote' })}>
                        <FontText weight='bold' color='white' className='text-lg mt-[-0.1rem]'>⋯</FontText>
                    </AppButton>
                </Row>
                <Row className='gap-0 h-full items-center justify-center px-2' style={{ width: dayBaseColumnWidths.action }}>
                    <FontText weight='medium' className='text-center' style={{ width: getInnerTextWidth(dayBaseColumnWidths.action) }}>Action</FontText>
                    <AppButton variant="grey" className='w-6 max-h-6 mr-[0.4rem] ml-0' onPress={() => setActiveMenu({ type: 'base', column: 'action' })}>
                        <FontText weight='bold' color='white' className='text-lg mt-[-0.1rem]'>⋯</FontText>
                    </AppButton>
                </Row>
                {titles.extraDayColumns.map((columnTitle, index) => {
                    if (!visibility.extraDayColumns[index]) return null;

                    const columnWidth = extraDayColumnWidths[index] ?? 112;
                    const textWidth = getInnerTextWidth(columnWidth);

                    return (
                        <Row key={index} className={`gap-0 h-full items-center justify-center px-2 ${editingColumns[index] ? 'z-50' : ''}`} style={{ width: columnWidth }}>
                            <InlineEditableText
                                value={columnTitle}
                                onChange={(newValue) => setColumnTitle?.(index, newValue)}
                                placeholder='UNSET'
                                className='text-center text-nowrap overflow-hidden'
                                style={{ width: textWidth }}
                                weight='medium'
                                onEditStart={() => handleColumnEditStart(index)}
                                onEditEnd={() => handleColumnEditEnd(index)}
                            />
                            <AppButton variant="grey" className='w-6 max-h-6 mr-[0.4rem] ml-0' onPress={() => setActiveMenu({ type: 'extra', index })}>
                                <FontText weight='bold' color='white' className='text-lg mt-[-0.1rem]'>⋯</FontText>
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
                title={activeMenu?.type === 'extra' ? 'Column options' : 'Resize column'}
                selectedSize={activeMenu?.type === 'base'
                    ? dayBaseColumnSizes[activeMenu.column]
                    : activeMenu?.type === 'extra'
                        ? (extraDayColumnSizes[activeMenu.index] ?? 'small')
                        : 'small'}
                onSelectSize={(size) => {
                    if (activeMenu?.type === 'base') {
                        onSetDayBaseColumnSize?.(activeMenu.column, size);
                        return;
                    }

                    if (activeMenu?.type === 'extra') {
                        onSetExtraDayColumnSize?.(activeMenu.index, size);
                    }
                }}
                onDelete={activeMenu?.type === 'extra'
                    ? () => onDeleteExtraDayColumn?.(activeMenu.index)
                    : undefined}
            />
        </>
    );
};

export default DayTitleRow;
