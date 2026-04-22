import React, { useRef } from 'react';
import { View } from 'react-native';
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
    const TILE_SIZE = 600;

    // Only animate on first load, never on subsequent transitions
    // The leaving duplicate never animates in (it's exiting)
    const shouldAnimate = !isLeaving && !hasAnimatedRef.current;

    if (shouldAnimate) {
        hasAnimatedRef.current = true;
    }

    const newspaperContent = (
        <Column className='gap-0 min-h-[760px]'>
            <NewspaperViewingView dayIndex={dayIndex} gameId={gameId} ownerUserId={ownerUserId} TILE_SIZE={TILE_SIZE} />
            <View className='px-5'>
                <View className='rounded-b-2xl' style={{
                    // @ts-ignore: web-only CSS
                    backgroundImage: "url('https://d9tic9wqq4.ufs.sh/f/e3bq9j1bOXyi6QFuqBSV3IcVxmF4QjUoPvCOdS2HLawpi0Ey')",
                    backgroundRepeat: 'repeat',
                    backgroundSize: `${TILE_SIZE}px ${TILE_SIZE}px`,
                }}>
                    <NewspaperPreviousDayVoteSummary dayIndex={dayIndex} gameId={gameId} />
                </View>
            </View>
        </Column>
    );

    return (
        <Column className="gap-4 w-full">

            {/* <NewspaperViewingHeader /> */}
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
