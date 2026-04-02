import React from 'react';
import { View } from 'react-native';
import Column from '../layout/Column';
import Row from '../layout/Row';
import JoinedGames from './JoinedGames';
import MyGames from './MyGames';
import PoppinsText from '../ui/text/PoppinsText';
import AppButton from '../ui/buttons/AppButton';

import { UserListRecord } from 'hooks/useUserList';
import { GameInfo } from 'types/games';
import { UserData } from 'types/common';
import { useUserVariable } from 'hooks/useUserVariable';



interface GameListProps {
    gamesTheyJoined: string[];
    setGamesTheyJoined: (games: string[]) => void;
    myGames: UserListRecord<GameInfo>[] | undefined;
    hasJoinedAGame: boolean;
    hasMadeAGame: boolean;
    setActiveGameId: (gameId: string) => void;
}

const GameList = ({ gamesTheyJoined, setGamesTheyJoined, myGames, hasJoinedAGame, hasMadeAGame, setActiveGameId }: GameListProps) => {
    const [userData] = useUserVariable<UserData>({ key: 'userData' });
    const handleSignOut = () => {
        // TODO: Implement sign out logic
    };

    return (
        <Column className='p-6' gap={6}>
            <Column className='pt-5 px-5 pb-5' gap={6}>
                
                <Column gap={3} className='w-full items-center'>
                    <Row className='items-center' gap={4}>
                        <PoppinsText className='text-base text-text-inverted border-r border-subtle-border pr-4'>
                            {`${userData?.value?.name || 'Not set'}`}
                        </PoppinsText>
                        

                        <PoppinsText className='text-base text-text-inverted' varient='subtext'>
                            {userData?.value?.email || 'Not available'}
                        </PoppinsText>
                    </Row>

                    <Column className='px-4'>
                        <PoppinsText varient='subtext' className='text-xs text-text-inverted font-mono'>
                            {userData?.value?.userId || 'Not available'}
                        </PoppinsText>
                    </Column>
                </Column>

                {/* Sign Out Button */}
                <View className='mt-auto'>
                    <AppButton
                        variant='red'
                        className='h-12 w-full'
                        onPress={handleSignOut}
                    >
                        <PoppinsText weight='medium' color='red'>
                            Sign Out
                        </PoppinsText>
                    </AppButton>
                </View>
            </Column>
            {hasJoinedAGame && (
                <JoinedGames
                    gamesTheyJoined={gamesTheyJoined}
                    setGamesTheyJoined={setGamesTheyJoined}
                    setActiveGameId={setActiveGameId}
                />
            )}

            {hasMadeAGame && (
                <MyGames
                    myGames={myGames}
                    setActiveGameId={setActiveGameId}
                />
            )}
        </Column>
    );
};

export default GameList;
