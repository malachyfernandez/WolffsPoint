import React from 'react';

import { useUserVariable } from 'hooks/useUserVariable';
import { useSyncUserData } from 'hooks/useSyncUserData';
import Column from './layout/Column';
import { ScrollView } from 'react-native';
import Animated, { FadeInDown, FadeInRight, FadeOutDown, FadeOutRight } from 'react-native-reanimated';
import AppButton from './ui/AppButton';
import JoinGameButton from './ui/JoinGameButton';
import Row from './layout/Row';
import PoppinsText from './ui/PoppinsText';
import GameList from './GameList';
import NoGames from './NoGames';
import { GameInfo, MyGames } from 'types/games';

interface ChooseGamePickerProps {
    activeGameId: string;
    setActiveGameId: (id: string) => void;
    myGames: MyGames;
    showModal: () => void;
    addNewGame: () => void;
}

const ChooseGamePicker = ({
    activeGameId,
    setActiveGameId,
    myGames,
    showModal,
    addNewGame,
}: ChooseGamePickerProps) => {

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

    const userId = userData.value.userId || "";

    useSyncUserData(userData.value, setUserData);

    const [gamesTheyJoined, setGamesTheyJoined] = useUserVariable<string[]>({
        key: "gamesTheyJoined",
        defaultValue: [],
    });


    const hasJoinedAGame = (gamesTheyJoined?.value.length ? true : false);
    const hasMadeAGame = (myGames?.length ? true : false);

    const isGamesPageEmpty = !hasJoinedAGame && !hasMadeAGame;
    const isGamesLoading = gamesTheyJoined?.state.isSyncing;

    return (
        <Column className='flex-1 h-full'>
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
                                <NoGames showModal={showModal} />
                            </Animated.View>
                        </Column>

                    )
                )}

            </Column>

            {/* bottom bar */}
            <Column>
                <Row className='p-6 border-t border-subtle-border justify-between'>
                    <AppButton variant="outline" className="h-12 w-48" onPress={addNewGame}>
                        <PoppinsText weight='medium' className='group-hover:text-white'>New WolffsPoint</PoppinsText>
                    </AppButton>

                    {!isGamesPageEmpty && (
                        <Animated.View
                            entering={FadeInRight.duration(100)}
                            exiting={FadeOutRight.duration(100)}
                        >
                            <JoinGameButton onPress={showModal} />
                        </Animated.View>
                    )}
                </Row>
            </Column>

        </Column>
    );
};

export default ChooseGamePicker;
