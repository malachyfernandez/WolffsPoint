import React, { PropsWithChildren, useState } from 'react';
import { Button } from 'heroui-native/button';
import { Dialog } from 'heroui-native/dialog';
import { ScrollView, View } from 'react-native';
import Column from './layout/Column';
import PoppinsText from './ui/text/PoppinsText';
import { useUserVariable } from 'hooks/useUserVariable';
import { useUserListGet } from 'hooks/useUserListGet';
import { useUserListSet } from 'hooks/useUserListSet';
import { GameInfo } from 'types/games';
import TopSiteBar from './layout/TopSiteBar';
import AllGamesPage from './game/AllGamesPage';
import GamePage from './game/GamePage';
import StateAnimatedView from './ui/StateAnimatedView';
import PoppinsTextInput from './ui/forms/PoppinsTextInput';
import JoinHandler from './ui/forms/JoinHandler';
import { ScrollShadow } from 'heroui-native';
import { LinearGradient } from 'expo-linear-gradient';



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

        <View className='w-screen h-screen p-safe'>

            <TopSiteBar isInAGame={isInAGame} setActiveGameId={setActiveGameId} />
            {isActiveGameLoading ? (
                <PoppinsText>Loading</PoppinsText>
            ) : (
                <StateAnimatedView.Container stateVar={currentScreen} className='flex-1'>
                    <StateAnimatedView.Option page={1} stateValue='allGames'>
                        <AllGamesPage
                            activeGameId={activeGameId.value}
                            setActiveGameId={setActiveGameId}
                            myGames={myGames}
                            addNewGame={addNewGame}
                        />
                    </StateAnimatedView.Option>

                    <StateAnimatedView.OptionContainer page={2}>
                        <StateAnimatedView.Option stateValue='game'>
                            <GamePage
                                gameId={activeGameId.value}
                                currentUserId={userId}
                            />
                        </StateAnimatedView.Option>
                    </StateAnimatedView.OptionContainer>
                </StateAnimatedView.Container>
            )}
        </View >
    );
};

export default MainPage;
