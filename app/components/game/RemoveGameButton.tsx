import React, { useState } from 'react';
import { View } from 'react-native';
import AppButton from '../ui/buttons/AppButton';
import { useUserListRemove } from 'hooks/useUserListRemove';
import { useUserVariable } from 'hooks/useUserVariable';
import FontText from '../ui/text/FontText';
import DeleteGameConfirmationDialog from '../dialog/DeleteGameConfirmationDialog';

interface RemoveGameButtonProps {
    gameId: string;
    className?: string;
}

const RemoveGameButton = ({ gameId, className }: RemoveGameButtonProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const removeGame = useUserListRemove();

    const handleRemoveGame = () => {
        removeGame({
            key: "games", // Assuming the list key is "games" based on GameList context
            itemId: gameId
        });
        setActiveGameId("");
        setIsOpen(false);
    };

    const [activeGameId, setActiveGameId] = useUserVariable<string>({
        key: "activeGameId",
    });

    return (
        <View className={`items-center ${className}`}>
            <DeleteGameConfirmationDialog
                isOpen={isOpen}
                onOpenChange={setIsOpen}
                onConfirm={handleRemoveGame}
            />
            <AppButton
                variant='red'
                className='h-12 max-w-96 w-full'
                onPress={() => setIsOpen(true)}
            >
                <FontText weight='medium' color='red'>
                    Delete Game
                </FontText>
            </AppButton>
        </View>
    );
};

export default RemoveGameButton;
