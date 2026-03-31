import React from 'react';
import Column from '../../layout/Column';
import PoppinsText from '../text/PoppinsText';

interface DialogHeaderProps {
    text: string;
    subtext?: string;
    className?: string;
}

const DialogHeader = ({ text, subtext, className }: DialogHeaderProps) => {
    return (
        <Column gap={0} className={`bg-primary-accent p-4 items-center -m-5 rounded-t-sm mb-0 ${className || ''}`}>
            <PoppinsText weight='medium' color='white'>{text}</PoppinsText>
            {subtext && (
                <PoppinsText varient='subtext' weight='medium' color='white'>{subtext}</PoppinsText>
            )}
        </Column>
    );
};

export default DialogHeader;
