import React, { useEffect, useState } from 'react';

import { useValue } from 'hooks/useData';

function useWindowWidth(): number {
    const [width, setWidth] = useState(() =>
        typeof window !== 'undefined' ? window.innerWidth : 0
    );
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handleResize = () => setWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    return width;
}
import { useSyncUserData } from 'hooks/useSyncUserData';
import Column from '../layout/Column';
import BottomBar from '../layout/BottomBar';
import { View } from 'react-native';
import JoinGameButton from './JoinGameButton';
import GameList from './GameList';
import NoGames from './NoGames';
import { MyGames } from 'types/games';
import NewWolffspointButtonAndDialogue from './NewWolffspointButtonAndDialogue';
import PublicImageUpload from '../ui/imageUpload/PublicImageUpload';
import LoadingText from '../ui/loading/LoadingText';
import ShadowScrollView from '../ui/ShadowScrollView';
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
    const width = useWindowWidth();
    const [uploadedImageUrl, setUploadedImageUrl] = useState('');

    const [gamesTheyJoined, setGamesTheyJoined] = useValue<string[]>("gamesTheyJoined", {
        defaultValue: [],
    });

    const [archivedGames] = useValue<string[]>("archivedGames", {
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

    const [userData, setUserData] = useValue<UserData>("userData", {
        defaultValue: { name: "", email: "", userId: "" },
        privacy: "PUBLIC",
        searchKeys: ["name"],
    });

    useSyncUserData(userData.value, setUserData);

    const hasJoinedAGame = (activeJoinedGames.length ? true : false);
    const hasMadeAGame = (myGames?.length ? true : false);
    const hasArchivedGames = (archivedGames.value || []).length > 0;

    const isGamesPageEmpty = !hasJoinedAGame && !hasMadeAGame && !hasArchivedGames;
    const isGamesLoading = gamesTheyJoined?.state.isSyncing;

    return (
        <Column className='gap-4 flex-1 mt-10 max-w-[1000px] w-full mx-auto'>
            <ProfileInfo />

            <Column className='gap-4 flex-1'>
                {isGamesLoading ? (
                    <Column className='gap-4 flex-1 items-center justify-center'>
                        <LoadingText text='Loading games' />
                    </Column>
                ) : (
                    <ShadowScrollView className='h-full' scrollViewClassName='h-full'>
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
                                <Column className='gap-4 items-center justify-center flex-1'>
                                    <NoGames joinGame={joinGame} />
                                </Column>

                            )}
                    </ShadowScrollView>
                )}

            </Column>

            {/* bottom bar */}
            <Column className='gap-4'>
                
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
