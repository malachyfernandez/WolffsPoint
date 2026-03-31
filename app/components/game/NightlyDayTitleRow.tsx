import React, { useState } from 'react';
import PoppinsText from '../ui/text/PoppinsText';
import Column from '../layout/Column';
import Row from '../layout/Row';

interface NightlyDayTitleRowProps {
    onEditStart?: () => void;
    onEditEnd?: () => void;
    isEditing?: boolean;
}

const NightlyDayTitleRow = ({ onEditStart, onEditEnd, isEditing }: NightlyDayTitleRowProps) => {
    return (
        <Row gap={0} className={`h-12 w-min bg-background border-b-2 border-border rounded-t-lg ${isEditing ? 'z-50' : ''}`}>
            <Column className='w-28 h-full items-center justify-center'>
                <PoppinsText weight='medium' className='text-center'>Vote</PoppinsText>
            </Column>
            <Column gap={0} className='w-28 h-full items-center justify-center'>
                <PoppinsText weight='medium' className='text-center'>Action</PoppinsText>
            </Column>
            <Column className='w-64 h-full items-center justify-center'>
                <PoppinsText weight='medium' className='text-center'>Nightly Response</PoppinsText>
            </Column>
            <Column gap={0} className='w-64 h-full items-center justify-center'>
                <PoppinsText weight='medium' className='text-center'>Nightly Messages</PoppinsText>
            </Column>
        </Row>
    );
};

export default NightlyDayTitleRow;
