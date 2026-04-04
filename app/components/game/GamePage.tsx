import React, { useState } from 'react';
import Column from '../layout/Column';
import { Platform, View } from 'react-native';
import { useUserListGet } from 'hooks/useUserListGet';
import { ScrollShadow } from 'heroui-native';
import { LinearGradient } from 'expo-linear-gradient';
import OperatorGamePage from './OperatorGamePage';
import PlayerGamePage from './PlayerGamePage';
import PoppinsText from '../ui/text/PoppinsText';
import WolffspointIcon from '../icons/WolffspointIcon';
import Animated, { runOnJS, useAnimatedScrollHandler } from 'react-native-reanimated';

interface GamePageProps {
    gameId: string;
    currentUserId: string;
}

const GamePage = ({ gameId, currentUserId }: GamePageProps) => {
    const [scrollAmount, setScrollAmount] = useState(0);

    const updateScrollAmount = (nextScrollAmount: number) => {
        setScrollAmount(nextScrollAmount);
    };

    const handleScroll = useAnimatedScrollHandler({
        onScroll: (event) => {
            const nextScrollAmount = event.contentOffset.y;
            runOnJS(updateScrollAmount)(nextScrollAmount);
        },
    });
    
    const ownedGameRows = useUserListGet({
        key: 'games',
        itemId: gameId,
        userIds: [currentUserId],
    });

    if (ownedGameRows === undefined) {
        return (
            <Column className='w-full h-full items-center justify-center'>
                <PoppinsText>Loading game…</PoppinsText>
            </Column>
        );
    }

    const isOperator = (ownedGameRows?.length ?? 0) > 0;

    // Calculate blur amount based on scroll (0px blur at top, 8px blur when scrolled 100px)
    const blurAmount = Math.min(Math.max((scrollAmount / 100) * 8, 0), 8);

    return (
        <Column className='w-full h-screen'>
            <View className='absolute top-20 w-full items-center'>
                <View style={Platform.OS === 'web' ? { filter: `blur(${blurAmount}px)` } : undefined}>
                    <WolffspointIcon />
                </View>
            </View>
            <ScrollShadow LinearGradientComponent={LinearGradient} color="rgb(30, 30, 30)">
                <Animated.ScrollView 
                    className='p-6 h-screen w-full'
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                >
                    <View className="w-full max-w-[1000px] mx-auto pt-60">
                        {isOperator ? (
                            <OperatorGamePage currentUserId={currentUserId} gameId={gameId} />
                        ) : (
                            <PlayerGamePage currentUserId={currentUserId} gameId={gameId} />
                        )}
                    </View>
                </Animated.ScrollView>
            </ScrollShadow>
        </Column>
    );
};

export default GamePage;
