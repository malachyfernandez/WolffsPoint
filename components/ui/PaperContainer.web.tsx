import React from 'react';
import GuildedFrame from './chrome/GuildedFrame';
import FadeInAfterDelay from './loading/FadeInAfterDelay';

interface PaperContainerProps {
    children: React.ReactNode;
}

const PaperContainer = ({ children }: PaperContainerProps) => {
    return (
        <FadeInAfterDelay delayMs={100}>
            <GuildedFrame className='z-1' contentClassName='py-4 px-2 sm:px-4' backgroundToken='inner-background'>
                {children}
            </GuildedFrame>
        </FadeInAfterDelay>
    );
};

export default PaperContainer;
