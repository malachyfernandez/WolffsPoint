import React, { useRef } from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
import Column from '../layout/Column';
import NewspaperViewingView from './NewspaperViewingView';
import NewspaperViewingHeader from './NewspaperViewingHeader';

interface NewspaperDayViewProps {
    gameId: string;
    dayIndex: number;
    isLeaving?: boolean;
}

const getNewspaperKey = (dayIndex: number) => {
    return `day-${dayIndex}`;
};

const NewspaperDayView = ({ gameId, dayIndex, isLeaving }: NewspaperDayViewProps) => {
    const hasAnimatedRef = useRef(false);

    // Only animate on first load, never on subsequent transitions
    // The leaving duplicate never animates in (it's exiting)
    const shouldAnimate = !isLeaving && !hasAnimatedRef.current;

    if (shouldAnimate) {
        hasAnimatedRef.current = true;
    }

    const newspaperContent = (
        <NewspaperViewingView itemId={`${gameId}-${getNewspaperKey(dayIndex)}`} />
    );

    return (
        <Column gap={4}>
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
