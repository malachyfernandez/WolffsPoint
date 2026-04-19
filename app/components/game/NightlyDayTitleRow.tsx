import React, { useState } from 'react';
import FontText from '../ui/text/FontText';
import Row from '../layout/Row';
import AppButton from '../ui/buttons/AppButton';
import ColumnActionsDialog from './ColumnActionsDialog';
import { ColumnSizeOption, getInnerTextWidth } from './nightlyTableColumnSizing';

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
    onSetColumnSize?: (columnKey: 'vote' | 'action' | 'morningMessage', size: ColumnSizeOption) => void;
}

type ActiveColumnMenu =
    | { column: 'vote' | 'action' | 'morningMessage' }
    | null;

const NightlyDayTitleRow = ({
    onEditStart,
    onEditEnd,
    isEditing,
    columnWidths,
    columnSizes,
    onSetColumnSize
}: NightlyDayTitleRowProps) => {
    const [activeMenu, setActiveMenu] = useState<ActiveColumnMenu>(null);

    // Wait for column widths to be ready before rendering to prevent flicker
    const areColumnWidthsReady = columnWidths.vote > 0 && columnWidths.action > 0 && columnWidths.morningMessage > 0;

    if (!areColumnWidthsReady) {
        return <Row gap={0} className='h-12 w-min bg-background border-b-2 border-border rounded-t-lg' />;
    }

    return (
        <>
            <Row gap={0} className={`h-12 w-min bg-background border-b-2 border-border rounded-t-lg ${isEditing ? 'z-50' : ''}`}>
                <Row className='h-full items-center justify-center px-2' gap={0} style={{ width: columnWidths.vote }}>
                    <FontText weight='medium' className='text-center' style={{ width: getInnerTextWidth(columnWidths.vote) }}>Vote</FontText>
                    <AppButton variant="grey" className='w-6 max-h-6 mr-[0.4rem] ml-0' onPress={() => setActiveMenu({ column: 'vote' })}>
                        <FontText weight='bold' color='white' className='text-lg mt-[-0.1rem]'>⋯</FontText>
                    </AppButton>
                </Row>
                <Row gap={0} className='h-full items-center justify-center px-2' style={{ width: columnWidths.action }}>
                    <FontText weight='medium' className='text-center' style={{ width: getInnerTextWidth(columnWidths.action) }}>Action</FontText>
                    <AppButton variant="grey" className='w-6 max-h-6 mr-[0.4rem] ml-0' onPress={() => setActiveMenu({ column: 'action' })}>
                        <FontText weight='bold' color='white' className='text-lg mt-[-0.1rem]'>⋯</FontText>
                    </AppButton>
                </Row>
                <Row gap={0} className='h-full items-center justify-center px-2' style={{ width: columnWidths.morningMessage }}>
                    <FontText weight='medium' className='text-center' style={{ width: getInnerTextWidth(columnWidths.morningMessage) }}>Morning Message (Tomorrow)</FontText>
                    <AppButton variant="grey" className='w-6 max-h-6 mr-[0.4rem] ml-0' onPress={() => setActiveMenu({ column: 'morningMessage' })}>
                        <FontText weight='bold' color='white' className='text-lg mt-[-0.1rem]'>⋯</FontText>
                    </AppButton>
                </Row>
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
