import React, { PropsWithChildren, useState } from 'react';
import { Button } from 'heroui-native/button';
import { Dialog } from 'heroui-native/dialog';
import { ScrollView, View } from 'react-native';
import Column from './layout/Column';
import FontText from './ui/text/FontText';
import { useUserVariable } from 'hooks/useUserVariable';
import { useUserListGet } from 'hooks/useUserListGet';
import { useUserListSet } from 'hooks/useUserListSet';
import { GameInfo } from 'types/games';
import TopSiteBar from './layout/TopSiteBar';
import AllGamesPage from './game/AllGamesPage';
import GamePage from './game/GamePage';
import LayoutStateAnimatedView, { fromBottom } from './ui/LayoutStateAnimatedView';
import FontTextInput from './ui/forms/FontTextInput';
import JoinHandler from './ui/forms/JoinHandler';
import FadeInAfterDelay from './ui/loading/FadeInAfterDelay';



type FontWeight = 'regular' | 'medium' | 'bold';
type ScreenState = 'allGames' | 'game';

interface MainPageProps extends PropsWithChildren {
    className?: string;
}

const MainPage: React.FC<MainPageProps> = ({
    className = '',
}) => {
    const [isHeroDialogOpen, setIsHeroDialogOpen] = useState(false);

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

    const userId = userData.value.userId || "";

    const myGames = useUserListGet<GameInfo>({
        key: "games",
        userIds: [userId],
    });

    const [activeGameId, setActiveGameId] = useUserVariable<string>({
        key: "activeGameId",
        defaultValue: "",
    });

    const generateGameId = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    const addNewGame = () => {
        const newGameId = generateGameId();

        setUserListItem({
            key: "games",
            itemId: newGameId,
            value: {
                id: newGameId,
                name: "Game 1",
                description: "Description 1",
            },
            filterKey: "id",
            privacy: "PUBLIC",
        });
    }

    const setUserListItem = useUserListSet();
    const isInAGame = activeGameId.value !== "";
    const currentScreen: ScreenState = isInAGame ? 'game' : 'allGames';

    const isActiveGameLoading = (activeGameId.state.isSyncing == true)

    return (
        <>
            <View className='w-screen h-screen p-safe'>


                {isActiveGameLoading ? (
                    <FontText>Loading</FontText>
                ) : (
                    <FadeInAfterDelay delayMs={200}>
                        <LayoutStateAnimatedView.Container stateVar={currentScreen} className='flex-1'>
                            <LayoutStateAnimatedView.Option page={1} stateValue='allGames'>
                                <AllGamesPage
                                    activeGameId={activeGameId.value}
                                    setActiveGameId={setActiveGameId}
                                    myGames={myGames}
                                    addNewGame={addNewGame}
                                />
                            </LayoutStateAnimatedView.Option>

                            <LayoutStateAnimatedView.OptionContainer pushInAnimation={fromBottom} page={2}>
                                <LayoutStateAnimatedView.Option stateValue='game'>
                                    <GamePage
                                        gameId={activeGameId.value}
                                        currentUserId={userId}
                                    />
                                </LayoutStateAnimatedView.Option>
                            </LayoutStateAnimatedView.OptionContainer>
                        </LayoutStateAnimatedView.Container>
                    </FadeInAfterDelay>
                )}


            </View >
            <View className='absolute top-0 right-0'>
                <TopSiteBar />
            </View>
        </>
    );
};

export default MainPage;
