import React, { useState } from 'react';
import { useUserVariable } from 'hooks/useUserVariable';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import Column from '../layout/Column';
import { View } from 'react-native';
import AppButton from '../ui/buttons/AppButton';
import FontText from '../ui/text/FontText';
import FontTextInput from '../ui/forms/FontTextInput';
import JoinHandler from '../ui/forms/JoinHandler';
import DialogHeader from '../ui/dialog/DialogHeader';

interface JoinGameButtonProps {
    onJoin?: (gameId: string) => void;
}

const JoinGameButton = ({ onJoin }: JoinGameButtonProps) => {
    const [isHeroDialogOpen, setIsHeroDialogOpen] = useState(false);
    const [gameCode, setGameCode] = useState('');

    // const [gamesTheyJoined, setGamesTheyJoined] = useUserVariable<string[]>({
    //     key: "gamesTheyJoined",
    //     defaultValue: [],
    // });

    const handleJoin = (code: string) => {
        // setGamesTheyJoined([...gamesTheyJoined.value, code]);
        onJoin?.(code);
    };

    return (
        <View>
            <ConvexDialog.Root isOpen={isHeroDialogOpen} onOpenChange={setIsHeroDialogOpen}>
                <ConvexDialog.Trigger asChild>
                    <AppButton variant="accent" className="h-12 w-40 shrink">
                        <FontText weight='medium' color="white">Join a Game</FontText>
                    </AppButton>
                </ConvexDialog.Trigger>
                <ConvexDialog.Portal>
                    <ConvexDialog.Overlay />

                    <ConvexDialog.Content>

                        <ConvexDialog.Close iconProps={{ color: 'rgb(246, 238, 219)' }} className="w-10 h-10 bg-accent-hover absolute right-4 top-4 z-10" />

                        <Column>
                            <DialogHeader
                                text="Join a Game"
                                subtext="Enter a game code to join."
                            />

                            <FontTextInput
                                placeholder="Enter game code"
                                className="w-full border border-subtle-border p-2"
                                value={gameCode}
                                onChangeText={setGameCode}
                            />
                            
                            <JoinHandler gameCode={gameCode} onClose={() => setIsHeroDialogOpen(false)} onJoin={handleJoin} />

                        </Column>
                    </ConvexDialog.Content>
                </ConvexDialog.Portal>
            </ConvexDialog.Root>
        </View>
    );
};

export default JoinGameButton;
