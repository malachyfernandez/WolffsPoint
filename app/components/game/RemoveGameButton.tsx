import React from 'react';
import { Text, View } from 'react-native';
import AppButton from '../ui/buttons/AppButton';
import { useUserListRemove } from 'hooks/useUserListRemove';
import { useUserVariable } from 'hooks/useUserVariable';

interface RemoveGameButtonProps {
    gameId: string;
    className?: string;
}

const RemoveGameButton = ({ gameId, className }: RemoveGameButtonProps) => {
    const removeGame = useUserListRemove();

    const handleRemoveGame = () => {
        removeGame({
            key: "games", // Assuming the list key is "games" based on GameList context
            itemId: gameId
        });
        setActiveGameId("");
    };

    const [activeGameId, setActiveGameId] = useUserVariable<string>({
        key: "activeGameId",
    });

    return (
        <View className={`items-center ${className}`}>

            <AppButton
                variant="black"
                onPress={handleRemoveGame}
                className="w-32"
            >
                <Text className="text-white font-semibold">Remove</Text>
            </AppButton>
        </View>
    );
};

export default RemoveGameButton;
