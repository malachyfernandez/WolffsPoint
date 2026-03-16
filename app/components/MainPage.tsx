import React, { PropsWithChildren, useState } from 'react';
import { Button } from 'heroui-native/button';
import { Dialog } from 'heroui-native/dialog';
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
    const [isHeroDialogOpen, setIsHeroDialogOpen] = useState(false);

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

        <View className=' justify-between w-full h-full'>
            <ModalRegistry />
            <View className='absolute right-4 top-20 z-10'>
                <Dialog isOpen={isHeroDialogOpen} onOpenChange={setIsHeroDialogOpen}>
                    <Dialog.Trigger asChild>
                        <Button>Open HeroUI Dialog</Button>
                    </Dialog.Trigger>
                    <Dialog.Portal>
                        <Dialog.Overlay />
                        <Dialog.Content className='bg-background rounded border-2 border-border'>
                            <Dialog.Close className='w-10 h-10 bg-accent-hover'/>
                            <Dialog.Title>HeroUI is working</Dialog.Title>
                            <Dialog.Description>
                                
                            </Dialog.Description>
                            <PoppinsText varient='subtext'>
                                    This dialog was opened from a HeroUI Native button inside `MainPage.tsx`.
                                </PoppinsText>
                        </Dialog.Content>
                    </Dialog.Portal>
                </Dialog>
            </View>
            
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
