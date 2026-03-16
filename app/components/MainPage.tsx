import React, { PropsWithChildren } from 'react';
import { View } from 'react-native';
import Column from './layout/Column';
import PoppinsText from './ui/text/PoppinsText';
import { useUserVariable } from 'hooks/useUserVariable';
import { useUserListGet } from 'hooks/useUserListGet';
import { useUserListSet } from 'hooks/useUserListSet';
import { GameInfo } from 'types/games';
import TopSiteBar from './layout/TopSiteBar';
import ChooseGamePicker from './game/ChooseGamePicker';
import GamePage from './game/GamePage';
import { ModalProvider } from './modal/ModalContext';
import GenericModal from './modal/GenericModal';
import ModalRegistry from './modal/ModalRegistry';



type FontWeight = 'regular' | 'medium' | 'bold';

interface MainPageProps extends PropsWithChildren {
    className?: string;
}

const MainPageContent: React.FC<MainPageProps> = ({
    className = '',
}) => {

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

    return (

        <View className='justify-between w-full h-full'>
            <ModalRegistry />
            
            <TopSiteBar isInAGame={isInAGame} setActiveGameId={setActiveGameId} />
            {!isInAGame ? (
                <ChooseGamePicker
                    activeGameId={activeGameId.value}
                    setActiveGameId={setActiveGameId}
                    myGames={myGames}
                    addNewGame={addNewGame}
                />
            ) : (
                <GamePage 
                    gameId={activeGameId.value} 
                    currentUserId={userId}
                />
            )}
            <GenericModal />
        </View>
    );
};

const MainPage: React.FC<MainPageProps> = (props) => {
    return (
        <ModalProvider>
            <MainPageContent {...props} />
        </ModalProvider>
    );
};

export default MainPage;
