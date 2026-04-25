import React, { useState } from 'react';
import Column from '../layout/Column';
import { Platform, View, useWindowDimensions } from 'react-native';
import { useFindListItems, useFindValues } from 'hooks/useData';
import ShadowScrollView from '../ui/ShadowScrollView';
import OperatorGamePage from './OperatorGamePage';
import NewserGamePage from './NewserGamePage';
import PlayerGamePage from './PlayerGamePage';
import FontText from '../ui/text/FontText';
import LoadingText from '../ui/loading/LoadingText';
import WolffspointIcon from '../icons/WolffspointIcon';
import Animated, { runOnJS, useAnimatedScrollHandler } from 'react-native-reanimated';
import { NewserAssignment, PublicUserData, getNewserAssignmentKey, resolveValidNewserAssignment } from '../../../utils/newspaperControl';
import FadeInAfterDelay from '../ui/loading/FadeInAfterDelay';

interface GamePageProps {
    gameId: string;
    currentUserId: string;
}

const GamePage = ({ gameId, currentUserId }: GamePageProps) => {
    const [scrollAmount, setScrollAmount] = useState(0);
    const { width: screenWidth } = useWindowDimensions();

    const updateScrollAmount = (nextScrollAmount: number) => {
        setScrollAmount(nextScrollAmount);
    };

    const handleScroll = useAnimatedScrollHandler({
        onScroll: (event) => {
            const nextScrollAmount = event.contentOffset.y;
            runOnJS(updateScrollAmount)(nextScrollAmount);
        },
    });

    const ownedGameRows = useFindListItems('games', {
        itemId: gameId,
        userIds: [currentUserId],
    });

    const gameRows = useFindListItems('games', {
        itemId: gameId,
        returnTop: 1,
    });

    const operatorUserId = gameRows?.[0]?.userToken ?? '';

    const userDataRecords = useFindValues<PublicUserData>('userData', {
        returnTop: 500,
    });

    const newserAssignmentRecords = useFindValues<NewserAssignment>(getNewserAssignmentKey(gameId), {
        userIds: operatorUserId ? [operatorUserId] : undefined,
        returnTop: 1,
    });

    if (ownedGameRows === undefined || gameRows === undefined || userDataRecords === undefined || newserAssignmentRecords === undefined) {
        return (
            <Column className='gap-4 w-full h-full items-center justify-center'>
                <LoadingText text='Loading game' />
            </Column>
        );
    }

    const isOperator = (ownedGameRows?.length ?? 0) > 0;

    const validNewser = resolveValidNewserAssignment({
        assignment: newserAssignmentRecords?.[0]?.value,
        userDatas: userDataRecords.map((record) => record.value),
    });

    const isNewser = !isOperator && validNewser?.userId === currentUserId;

    // Calculate blur amount based on scroll (0px blur at top, 8px blur when scrolled 100px)
    const blurAmount = Math.min(Math.max((scrollAmount / 100) * 8, 0), 8);
    const logoWidth = Math.min(screenWidth * .97, 760);
    const logoHeight = (logoWidth / 522) * 183;
    const baseHeight = 183;
    // const translateY = (logoHeight - baseHeight) / 2;
    const translateY = -(logoWidth / 9) + 100;

    return (
        <Column className='gap-4 w-full h-screen'>
            <View className='absolute top-20 w-full items-center'>
                <View style={Platform.OS === 'web' ? { width: logoWidth, height: logoHeight, filter: `blur(${blurAmount}px)`, transform: `translateY(${translateY}px)` } : undefined}>
                    <FadeInAfterDelay delayMs={200}>
                        <WolffspointIcon width={logoWidth} height={logoHeight} />
                    </FadeInAfterDelay>
                </View>
            </View>
            <FadeInAfterDelay delayMs={100}>

                <ShadowScrollView
                    className='flex-1'
                    scrollViewClassName='p-6 px-2 sm:px-6 h-screen w-full'
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                    scrollViewComponent={Animated.ScrollView}
                >
                    <View className="w-full max-w-[1000px] mx-auto pt-60">
                        {isOperator ? (
                            <OperatorGamePage currentUserId={currentUserId} gameId={gameId} />
                        ) : isNewser ? (
                            <NewserGamePage currentUserId={currentUserId} gameId={gameId} />
                        ) : (
                            <PlayerGamePage currentUserId={currentUserId} gameId={gameId} />
                        )}
                    </View>
                </ShadowScrollView>
            </FadeInAfterDelay>
        </Column>
    );
};

export default GamePage;
