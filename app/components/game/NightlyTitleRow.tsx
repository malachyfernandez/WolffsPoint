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
        <Row className={`gap-0 h-12 w-min bg-background border-b-2 border-border rounded-t-lg ${isEditing ? 'z-50' : ''}`}>
            <Column className='gap-4 w-12 h-full items-center justify-center'>
                <FontText weight='medium' className='text-center'>D/A</FontText>
            </Column>
            <Column className='gap-0 w-28 h-full items-center justify-center'>
                <FontText weight='medium' className='text-center'>Player</FontText>
            </Column>
        </Row>
    );
};

export default NightlyTitleRow;
