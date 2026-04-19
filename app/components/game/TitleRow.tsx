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
}

const TitleRow = ({ userTableTitle, userTableColumnVisibility, setColumnTitle, setColumnVisibility, onEditStart, onEditEnd, isEditing, extraUserColumnWidths, extraUserColumnSizes, onSetExtraUserColumnSize, onDeleteExtraUserColumn }: TitleRowProps) => {
    const titles = userTableTitle ?? { extraUserColumns: [], extraDayColumns: [] };
    const visibility = userTableColumnVisibility ?? { extraUserColumns: [], extraDayColumns: [] };
    const [editingColumns, setEditingColumns] = useState<Record<number, boolean>>({});
    const [activeMenu, setActiveMenu] = useState<number | null>(null);

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
            <Row gap={0} className={`h-12 w-min bg-background border-b-2 border-border rounded-t-lg ${isEditing ? 'z-50' : ''}`}>
                <Column className='w-12 h-full items-center justify-center'>
                    <FontText weight='medium' className='text-center'>D/A</FontText>
                </Column>
                <Column gap={0} className='w-28 h-full items-center justify-center'>
                    <FontText weight='medium' className='text-center'>Player</FontText>
                </Column>
                {titles.extraUserColumns.map((columnTitle, index) => {
                    if (!visibility.extraUserColumns[index]) return null;

                    const columnWidth = extraUserColumnWidths?.[index] ?? 112;
                    const textWidth = getInnerTextWidth(columnWidth);

                    return (
                        <Row key={index} className={`h-full items-center justify-center px-2 ${editingColumns[index] ? 'z-50' : ''}`} gap={0} style={{ width: columnWidth }}>
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
                            <AppButton variant="grey" className='w-6 max-h-6 mr-[0.4rem] ml-0' onPress={() => setActiveMenu(index)}>
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
                title="Column options"
                selectedSize={activeMenu !== null ? (extraUserColumnSizes?.[activeMenu] ?? 'small') : 'small'}
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
