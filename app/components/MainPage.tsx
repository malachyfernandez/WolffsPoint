import React, { PropsWithChildren, useState } from 'react';

import { useUserVariable } from 'hooks/useUserVariable';
import { useUserListGet } from 'hooks/useUserListGet';
import { useUserListSet } from 'hooks/useUserListSet';
import Column from './layout/Column';
import { View } from 'react-native';
import TopSiteBar from './TopSiteBar';
import ChooseGamePicker from './ChooseGamePicker';
import JoinGameModal from './ui/JoinGameModal';
import { GameInfo } from 'types/games';
import PoppinsText from './ui/PoppinsText';



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

    const userId = userData.value.userId || "";

    const myGames = useUserListGet<GameInfo>({
        key: "games",
        userIds: [userId],
    });

    const [activeGameId, setActiveGameId] = useUserVariable<string>({
        key: "activeGameId",
        defaultValue: "",
    });

    const [isModalShowing, setIsModalShowing] = useState(false);

    const [gamesTheyJoined, setGamesTheyJoined] = useUserVariable<string[]>({
        key: "gamesTheyJoined",
        defaultValue: [],
    });

    const showModal = () => {
        setIsModalShowing(true);
    }

    const hideModal = () => {
        setIsModalShowing(false);
    }

    const joinGame = (gameId: string) => {
        setGamesTheyJoined([...gamesTheyJoined.value, gameId]);
        hideModal();
    }

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
            <TopSiteBar isInAGame={isInAGame} setActiveGameId={setActiveGameId} />
            {!isInAGame ? (
                <ChooseGamePicker
                    activeGameId={activeGameId.value}
                    setActiveGameId={setActiveGameId}
                    myGames={myGames}
                    showModal={showModal}
                    addNewGame={addNewGame}
                />
            ) : (
                <Column className='p-6 bg-l h-full'>
                    <PoppinsText>{`Game ${activeGameId.value}`}</PoppinsText>
                </Column>
            )}
            <JoinGameModal
                isVisible={isModalShowing}
                onHide={hideModal}
                handleJoinGame={joinGame}
            />
        </View>
    );
};

export default MainPage;
