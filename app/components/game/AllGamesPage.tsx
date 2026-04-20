import React, { useState } from 'react';
import { useWindowDimensions } from 'react-native';

import { useUserVariable } from 'hooks/useUserVariable';
import { useSyncUserData } from 'hooks/useSyncUserData';
import Column from '../layout/Column';
import BottomBar from '../layout/BottomBar';
import { ScrollView, View } from 'react-native';
import JoinGameButton from './JoinGameButton';
import GameList from './GameList';
import NoGames from './NoGames';
import { MyGames } from 'types/games';
import NewWolffspointButtonAndDialogue from './NewWolffspointButtonAndDialogue';
import PublicImageUpload from '../ui/imageUpload/PublicImageUpload';
import LoadingText from '../ui/loading/LoadingText';
import { ScrollShadow } from 'heroui-native';
import { LinearGradient } from 'expo-linear-gradient';
import StateAnimatedView from '../ui/StateAnimatedView';
import Row from '../layout/Row';
import FontText from '../ui/text/FontText';
import ProfileInfo from './ProfileInfo';

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
    const { width } = useWindowDimensions();
    const [uploadedImageUrl, setUploadedImageUrl] = useState('');

    const [gamesTheyJoined, setGamesTheyJoined] = useUserVariable<string[]>({
        key: "gamesTheyJoined",
        defaultValue: [],
    });

    const [archivedGames] = useUserVariable<string[]>({
        key: "archivedGames",
        defaultValue: [],
    });

    // Filter out archived games from the joined games list
    const activeJoinedGames = (gamesTheyJoined.value || []).filter(
        gameId => !(archivedGames.value || []).includes(gameId)
    );

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
        defaultValue: { name: "", email: "", userId: "" },
        privacy: "PUBLIC",
        searchKeys: ["name"],
    });

    useSyncUserData(userData.value, setUserData);

    const hasJoinedAGame = (activeJoinedGames.length ? true : false);
    const hasMadeAGame = (myGames?.length ? true : false);

    const isGamesPageEmpty = !hasJoinedAGame && !hasMadeAGame;
    const isGamesLoading = gamesTheyJoined?.state.isSyncing;

    return (
        <Column className='flex-1 mt-10 max-w-[1000px] w-full mx-auto'>
            <ProfileInfo />

            <Column className='flex-1   '>
                {isGamesLoading ? (
                    <Column className='flex-1 items-center justify-center'>
                        <LoadingText text='Loading games' />
                    </Column>
                ) : (
                    <ScrollShadow LinearGradientComponent={LinearGradient} color="rgb(30, 30, 30)" className='h-full'>
                        <ScrollView className='h-full'>

                            {!isGamesPageEmpty ? (
                                <GameList
                                    gamesTheyJoined={activeJoinedGames}
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
            <Column>
                
                <BottomBar>
                    <NewWolffspointButtonAndDialogue onCreate={setActiveGameId} condensed={width < 450}/>
                    <StateAnimatedView.Container stateVar={!isGamesPageEmpty}>
                        <StateAnimatedView.Option stateValue={true}>
                            <JoinGameButton onJoin={joinGame} condensed={width < 400}/>
                        </StateAnimatedView.Option>
                        <StateAnimatedView.Option stateValue={false}>
                            {/* Empty state - no button shown */}
                        </StateAnimatedView.Option>
                    </StateAnimatedView.Container>
                </BottomBar>
            </Column>

        </Column>
    );
};

export default AllGamesPage;
