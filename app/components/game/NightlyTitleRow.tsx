import React, { useState } from 'react';
import FontText from '../ui/text/FontText';
import Column from '../layout/Column';
import Row from '../layout/Row';

interface NightlyTitleRowProps {
    onEditStart?: () => void;
    onEditEnd?: () => void;
    isEditing?: boolean;
}

const NightlyTitleRow = ({ onEditStart, onEditEnd, isEditing }: NightlyTitleRowProps) => {
    return (
        <Row gap={0} className={`h-12 w-min bg-background border-b-2 border-border rounded-t-lg ${isEditing ? 'z-50' : ''}`}>
            <Column className='w-12 h-full items-center justify-center'>
                <FontText weight='medium' className='text-center'>D/A</FontText>
            </Column>
            <Column gap={0} className='w-28 h-full items-center justify-center'>
                <FontText weight='medium' className='text-center'>Player</FontText>
            </Column>
        </Row>
    );
};

export default NightlyTitleRow;
