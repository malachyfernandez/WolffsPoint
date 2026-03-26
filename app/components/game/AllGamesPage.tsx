import React, { useState } from 'react';

import { useUserVariable } from 'hooks/useUserVariable';
import { useSyncUserData } from 'hooks/useSyncUserData';
import Column from '../layout/Column';
import BottomBar from '../layout/BottomBar';
import { ScrollView } from 'react-native';
import JoinGameButton from './JoinGameButton';
import GameList from './GameList';
import NoGames from './NoGames';
import { MyGames } from 'types/games';
import NewWolffspointButtonAndDialogue from './NewWolffspointButtonAndDialogue';
import PublicImageUpload from '../ui/imageUpload/PublicImageUpload';
import { ScrollShadow } from 'heroui-native';
import { LinearGradient } from 'expo-linear-gradient';

interface AllGamesPageProps {
    activeGameId: string;
    setActiveGameId: (id: string) => void;
    myGames: MyGames;
    addNewGame: () => void;
}

const AllGamesPage = ({
    setActiveGameId,
    myGames,
}: AllGamesPageProps) => {

    const [uploadedImageUrl, setUploadedImageUrl] = useState('');

    const [gamesTheyJoined, setGamesTheyJoined] = useUserVariable<string[]>({
        key: "gamesTheyJoined",
        defaultValue: [],
    });

    const joinGame = (gameId: string) => {
        const updatedGamesTheyJoined = gamesTheyJoined.value.includes(gameId)
            ? gamesTheyJoined.value
            : [...gamesTheyJoined.value, gameId];

        setGamesTheyJoined(updatedGamesTheyJoined);
        setActiveGameId(gameId);
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
        <Column className='flex-1'>
            {/* <PublicImageUpload
                url={uploadedImageUrl}
                setUrl={setUploadedImageUrl}
            /> */}

            <Column className='flex-1   '>
                {!isGamesLoading && (
                    <ScrollShadow LinearGradientComponent={LinearGradient} className='h-full'>
                        <ScrollView className='h-full'>

                            {!isGamesPageEmpty ? (
                                <GameList
                                    gamesTheyJoined={gamesTheyJoined.value}
                                    setGamesTheyJoined={setGamesTheyJoined}
                                    myGames={myGames}
                                    hasJoinedAGame={hasJoinedAGame}
                                    hasMadeAGame={hasMadeAGame}
                                    setActiveGameId={setActiveGameId}
                                />
                            ) : (
                                <Column className='items-center justify-center flex-1'>
                                    <NoGames joinGame={joinGame} />
                                </Column>

                            )}
                        </ScrollView>
                    </ScrollShadow>
                )}

            </Column>

            {/* bottom bar */}
            <Column className='h-24'>
                <BottomBar>
                    <NewWolffspointButtonAndDialogue onCreate={setActiveGameId} />


                    {!isGamesPageEmpty && (
                        <JoinGameButton onJoin={joinGame} />
                    )}
                </BottomBar>
            </Column>

        </Column>
    );
};

export default AllGamesPage;
