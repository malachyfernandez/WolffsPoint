import React, { useState } from 'react';

import { useUserVariable } from 'hooks/useUserVariable';
import { useSyncUserData } from 'hooks/useSyncUserData';
import Column from '../layout/Column';
import { ScrollView } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import JoinGameButton from './JoinGameButton';
import Row from '../layout/Row';
import GameList from './GameList';
import NoGames from './NoGames';
import { MyGames } from 'types/games';
import NewWolffspointButtonAndDialogue from './NewWolffspointButtonAndDialogue';
import PublicImageUpload from '../ui/imageUpload/PublicImageUpload';

interface AllGamesPageProps {
    activeGameId: string;
    setActiveGameId: (id: string) => void;
    myGames: MyGames;
    addNewGame: () => void;
}

const AllGamesPage = ({
    activeGameId,
    setActiveGameId,
    myGames,
    addNewGame,
}: AllGamesPageProps) => {

    const [uploadedImageUrl, setUploadedImageUrl] = useState('');

    const [gamesTheyJoined, setGamesTheyJoined] = useUserVariable<string[]>({
        key: "gamesTheyJoined",
        defaultValue: [],
    });

    const joinGame = (gameId: string) => {
        setGamesTheyJoined([...gamesTheyJoined.value, gameId]);
    };

    interface UserData {
        email?: string;
        name?: string;
        userId?: string
    };

    const [userData, setUserData] = useUserVariable<UserData>({
        key: "userData",
        defaultValue: {},
        privacy: "PUBLIC",
        searchKeys: ["name"],
    });

    useSyncUserData(userData.value, setUserData);

    const hasJoinedAGame = (gamesTheyJoined?.value.length ? true : false);
    const hasMadeAGame = (myGames?.length ? true : false);

    const isGamesPageEmpty = !hasJoinedAGame && !hasMadeAGame;
    const isGamesLoading = gamesTheyJoined?.state.isSyncing;

    return (
        <Column className='flex-1 h-full'>
            <PublicImageUpload
                url={uploadedImageUrl}
                setUrl={setUploadedImageUrl}
            />

            <Column className='flex-1 h-full'>
                {!isGamesLoading && (

                    !isGamesPageEmpty ? (
                        <Animated.View
                            entering={FadeInDown.duration(600)}
                            exiting={FadeOutDown.duration(600)}
                        >
                            <ScrollView>
                                <GameList
                                    gamesTheyJoined={gamesTheyJoined.value}
                                    setGamesTheyJoined={setGamesTheyJoined}
                                    myGames={myGames}
                                    hasJoinedAGame={hasJoinedAGame}
                                    hasMadeAGame={hasMadeAGame}
                                    setActiveGameId={setActiveGameId}
                                />
                            </ScrollView>
                        </Animated.View>
                    ) : (
                        <Column className='items-center justify-center flex-1'>
                            <Animated.View
                                entering={FadeInDown.duration(600)}
                                exiting={FadeOutDown.duration(600)}
                            >
                                <NoGames joinGame={joinGame} />
                            </Animated.View>
                        </Column>

                    )
                )}

            </Column>

            {/* bottom bar */}
            <Column>
                <Row className='p-6 border-t border-subtle-border justify-between'>
                    <NewWolffspointButtonAndDialogue onPress={addNewGame} />
                    

                    {!isGamesPageEmpty && (
                        <JoinGameButton onJoin={joinGame} />
                    )}
                </Row>
            </Column>

        </Column>
    );
};

export default AllGamesPage;
