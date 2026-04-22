import React from 'react';
import GuildedFrame from './chrome/GuildedFrame';
import FadeInAfterDelay from './loading/FadeInAfterDelay';

interface PaperContainerProps {
    children: React.ReactNode;
    gameId?: string;
}

const PaperContainer = ({ children, gameId }: PaperContainerProps) => {
    return (
        <FadeInAfterDelay delayMs={100}>
            <GuildedFrame className='z-1' contentClassName='py-4 px-2 sm:px-4' backgroundToken='inner-background' gameId={gameId}>
                {children}
            </GuildedFrame>
        </FadeInAfterDelay>
    );
};

export default PaperContainer;
