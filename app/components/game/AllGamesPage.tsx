import React, { useState } from 'react';

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
import { ScrollShadow } from 'heroui-native';
import { LinearGradient } from 'expo-linear-gradient';
import StateAnimatedView from '../ui/StateAnimatedView';
import Row from '../layout/Row';
import UserProfileDialog from '../dialog/UserProfileDialog';
import PoppinsText from '../ui/text/PoppinsText';

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
        defaultValue: { name: "", email: "", userId: "" },
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
            {/* Profile Section */}
            <Row className='justify-end items-center p-4'>
                <UserProfileDialog>
                    <Row className='items-center gap-2'>
                        <PoppinsText varient='subtext'>Profile</PoppinsText>
                        <View className="w-8 h-8 bg-gray-400 rounded-full" />
                    </Row>
                </UserProfileDialog>
            </Row>

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
                    <StateAnimatedView.Container stateVar={!isGamesPageEmpty}>
                        <StateAnimatedView.Option stateValue={true}>
                            <JoinGameButton onJoin={joinGame} />
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
