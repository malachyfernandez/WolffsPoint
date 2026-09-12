import React from 'react';
import Column from '../../layout/Column';
import FontText from '../text/FontText';

interface DialogHeaderProps {
    text: string;
    subtext?: string;
    className?: string;
}

const DialogHeader = ({ text, subtext, className }: DialogHeaderProps) => {
    return (
        <Column className={`gap-0 bg-text pt-4 pb-4 pl-5 pr-44 items-start -mx-5 -mt-5 rounded-t-sm mb-0 ${className || ''}`}>
            <FontText weight='medium' color='white' className='shrink'>{text}</FontText>
            {subtext && (
                <FontText variant='subtext' weight='medium' color='white' className='shrink'>{subtext}</FontText>
            )}
        </Column>
    );
};

export default DialogHeader;
