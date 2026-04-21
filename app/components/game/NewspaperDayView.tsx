import React, { useRef } from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
import Column from '../layout/Column';
import NewspaperViewingView from './NewspaperViewingView';
import NewspaperPreviousDayVoteSummary from './NewspaperPreviousDayVoteSummary';
import NewspaperViewingHeader from './NewspaperViewingHeader';
import PressLogo from '../ui/icons/Press';

interface NewspaperDayViewProps {
    gameId: string;
    dayIndex: number;
    ownerUserId: string;
    isLeaving?: boolean;
}

const NewspaperDayView = ({ gameId, dayIndex, ownerUserId, isLeaving }: NewspaperDayViewProps) => {
    const hasAnimatedRef = useRef(false);

    // Only animate on first load, never on subsequent transitions
    // The leaving duplicate never animates in (it's exiting)
    const shouldAnimate = !isLeaving && !hasAnimatedRef.current;

    if (shouldAnimate) {
        hasAnimatedRef.current = true;
    }

    const newspaperContent = (
        <Column className='gap-0'>
            <NewspaperViewingView dayIndex={dayIndex} gameId={gameId} ownerUserId={ownerUserId} />
            <NewspaperPreviousDayVoteSummary dayIndex={dayIndex} gameId={gameId} />
        </Column>
    );

    return (
        <Column className="gap-4 w-full">
            
            <NewspaperViewingHeader />
            {shouldAnimate ? (
                <Animated.View entering={FadeIn.duration(400)}>
                    {newspaperContent}
                </Animated.View>
            ) : (
                newspaperContent
            )}
        </Column>
    );
};

export default NewspaperDayView;
