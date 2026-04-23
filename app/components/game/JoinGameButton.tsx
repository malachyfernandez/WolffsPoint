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
    condensed?: boolean;
}

const JoinGameButton = ({ onJoin, condensed }: JoinGameButtonProps) => {
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
                    <AppButton variant="accent" className={condensed ? "h-12 w-36 shrink" : "h-12 w-42 shrink"}>
                        <FontText weight='medium' color="white">Join a Game</FontText>
                    </AppButton>
                </ConvexDialog.Trigger>
                <ConvexDialog.Portal>
                    <ConvexDialog.Overlay />

                    <ConvexDialog.Content>

                        <ConvexDialog.Close iconProps={{ color: 'rgb(246, 238, 219)' }} className="w-10 h-10 bg-text-inverted/10 hover:bg-text-inverted/15 rounded-full absolute right-0 top-0 z-10" />

                        <Column className='gap-4'>
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
