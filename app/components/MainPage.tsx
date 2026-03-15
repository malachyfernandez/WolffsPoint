import React, { PropsWithChildren, useState } from 'react';

import { useUserVariable } from 'hooks/useUserVariable';
import { useSyncUserData } from 'hooks/useSyncUserData';
import Column from './layout/Column';
import { useClerk } from '@clerk/clerk-expo';
import { Text, TextInput, TouchableOpacity, View, ScrollView } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp, FadeOut, FadeOutDown } from 'react-native-reanimated';
import AppButton from './ui/AppButton';
import JoinGameButton from './ui/JoinGameButton';
import Row from './layout/Row';
import PoppinsText from './ui/PoppinsText';
import { UserIcon } from './icons/UserIcon';
import { SadEmoji } from './icons/SadEmoji';
import PoppinsTextInput from './ui/PoppinsTextInput';
import JoinGameModal from './ui/JoinGameModal';
import GameList from './GameList';
import TopSiteBar from './TopSiteBar';
import NoGames from './NoGames';
// import { AnimatedView } from 'react-native-reanimated/lib/typescript/component/View';



type FontWeight = 'regular' | 'medium' | 'bold';

interface MainPageProps extends PropsWithChildren {
    className?: string;
}

const MainPage = ({
    className = '',
}: MainPageProps) => {


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

    const { signOut } = useClerk();

    const [gamesTheyJoined, setGamesTheyJoined] = useUserVariable<string[]>({
        key: "gamesTheyJoined",
        defaultValue: [],
    });

    const hasJoinedAGame = (gamesTheyJoined?.value.length ? true : false);

    const [isModalShowing, setIsModalShowing] = useState(false);

    const [gameCode, setGameCode] = useState("");

    const showModal = () => {
        setIsModalShowing(true)
    }

    const hideModal = () => {
        setIsModalShowing(false)
    }

    const joinGame = (gameId: string) => {
        setGamesTheyJoined([...gamesTheyJoined.value, gameId])
        hideModal()
    }

    return (
        <View className='justify-between w-full h-full'>

            <TopSiteBar />
            <Column className='flex-1 h-full'>
                <Column className='flex-1 h-full'>
                    {hasJoinedAGame ? (
                        <ScrollView>
                            <GameList 
                                gamesTheyJoined={gamesTheyJoined.value}
                                setGamesTheyJoined={setGamesTheyJoined}
                            />
                        </ScrollView>
                    ) : (
                        <NoGames showModal={showModal} />
                    )}

                </Column>
                <Column>
                    <Row className='p-6 border-t border-subtle-border justify-between'>
                        <AppButton variant="outline" className="h-12 w-40" onPress={signOut}>
                            <PoppinsText weight='medium' className='group-hover:text-white'>New WolffsPoint</PoppinsText>
                        </AppButton>

                        {hasJoinedAGame && (
                            <JoinGameButton onPress={showModal} />
                        )}
                    </Row>
                </Column>
            </Column>
            <JoinGameModal
                isVisible={isModalShowing}
                onHide={hideModal}
                onJoinGame={joinGame}
            />



        </View >
    );
};

export default MainPage;
