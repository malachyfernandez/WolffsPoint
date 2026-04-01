import React from 'react';
import Column from '../layout/Column';
import { ScrollView } from 'react-native';
import { useUserListGet } from 'hooks/useUserListGet';
import { ScrollShadow } from 'heroui-native';
import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';
import OperatorGamePage from './OperatorGamePage';
import PlayerGamePage from './PlayerGamePage';
import PoppinsText from '../ui/text/PoppinsText';

interface GamePageProps {
    gameId: string;
    currentUserId: string;
}

const GamePage = ({ gameId, currentUserId }: GamePageProps) => {
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

    return (
        <Column className='w-full h-full'>
            <ScrollShadow LinearGradientComponent={LinearGradient}>
                <ScrollView className='p-6 max-h-[calc(100vh-6rem)] h-full w-full flex-1'>
                    <View className="w-full max-w-[1000px] mx-auto">
                        {isOperator ? (
                            <OperatorGamePage currentUserId={currentUserId} gameId={gameId} />
                        ) : (
                            <PlayerGamePage currentUserId={currentUserId} gameId={gameId} />
                        )}
                    </View>
                </ScrollView>
            </ScrollShadow>
        </Column>
    );
};

export default GamePage;
