import React from 'react';
import GuildedFrame from './chrome/GuildedFrame';

interface PaperContainerProps {
    children: React.ReactNode;
}

const PaperContainer = ({ children }: PaperContainerProps) => {
    return (
        <GuildedFrame className='z-1' contentClassName='p-4' backgroundToken='inner-background'>
            {children}
        </GuildedFrame>
    );
};

export default PaperContainer;
