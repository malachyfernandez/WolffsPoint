import React from 'react';
import GuildedFrame from './chrome/GuildedFrame';

interface PaperContainerProps {
    children: React.ReactNode;
}

const PaperContainer = ({ children }: PaperContainerProps) => {
    return (
        <GuildedFrame className='z-1' contentClassName='py-4 px-2 sm:px-4' backgroundToken='inner-background'>
            {children}
        </GuildedFrame>
    );
};

export default PaperContainer;
