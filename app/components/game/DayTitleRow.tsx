import React, { useState } from 'react';
import PoppinsText from '../ui/text/PoppinsText';
import InlineEditableText from '../ui/forms/InlineEditableText';
import Column from '../layout/Column';
import Row from '../layout/Row';
import AppButton from '../ui/buttons/AppButton';

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
    setColumnVisibility?: (columnIndex: number, visibility: boolean) => void;
    onEditStart?: () => void;
    onEditEnd?: () => void;
    isEditing?: boolean;
}

const DayTitleRow = ({ userTableTitle, userTableColumnVisibility, setColumnTitle, setColumnVisibility, onEditStart, onEditEnd, isEditing }: DayTitleRowProps) => {
    const titles = userTableTitle ?? { extraUserColumns: [], extraDayColumns: [] };
    const visibility = userTableColumnVisibility ?? { extraUserColumns: [], extraDayColumns: [] };
    const [editingColumns, setEditingColumns] = useState<Record<number, boolean>>({});

    const handleColumnEditStart = (columnIndex: number) => {
        setEditingColumns(prev => ({ ...prev, [columnIndex]: true }));
        onEditStart?.();
    };

    const handleColumnEditEnd = (columnIndex: number) => {
        setEditingColumns(prev => ({ ...prev, [columnIndex]: false }));
        onEditEnd?.();
    };

    return (
        <Row gap={0} className={`h-12 w-min bg-background border-b-2 border-border rounded-t-lg ${isEditing ? 'z-50' : ''}`}>
            <Column className='w-28 h-full items-center justify-center'>
                <PoppinsText weight='medium' className='text-center'>Vote</PoppinsText>
            </Column>
            <Column gap={0} className='w-28 h-full items-center justify-center'>
                <PoppinsText weight='medium' className='text-center'>Action</PoppinsText>
            </Column>
            {titles.extraDayColumns.map((columnTitle, index) => {
                if (!visibility.extraDayColumns[index]) return null;
                
                return (
                    <Row key={index} className={`h-full w-28 items-center justify-center px-2 ${editingColumns[index] ? 'z-50' : ''}`} gap={0}>
                        <InlineEditableText
                            value={columnTitle}
                            onChange={(newValue) => setColumnTitle?.(index, newValue)}
                            placeholder='UNSET'
                            className='w-20 text-center text-nowrap overflow-hidden'
                            weight='medium'
                            onEditStart={() => handleColumnEditStart(index)}
                            onEditEnd={() => handleColumnEditEnd(index)}
                        />
                        <AppButton variant="grey" className='w-6 max-h-6 mr-[0.4rem] ml-0' onPress={() => setColumnVisibility?.(index, false)}>
                            {/* TODO: add this as a way to resize rows (modal to delete and to small medium large it)*/}
                            {/* <PoppinsText weight='bold' color='white' className='text-xl mt-[-0.1rem]'>⋯</PoppinsText> */}
                            <PoppinsText weight='bold' color='white' className='text-xl'>-</PoppinsText>
                        </AppButton>
                    </Row>
                );
            })}
        </Row>
    );
};

export default DayTitleRow;
