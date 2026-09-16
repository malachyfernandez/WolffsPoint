import React, { useState } from 'react';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import Column from '../layout/Column';
import { View } from 'react-native';
import AppButton from '../ui/buttons/AppButton';
import FontText from '../ui/text/FontText';
import FontTextInput from '../ui/forms/FontTextInput';
import JoinHandler from '../ui/forms/JoinHandler';
import DialogHeader from '../ui/dialog/DialogHeader';
import CloseButton from '../ui/dialog/CloseButton';

interface JoinGameButtonProps {
    onJoin?: (gameId: string) => void;
    condensed?: boolean;
}

const JoinGameButton = ({ onJoin, condensed }: JoinGameButtonProps) => {
    const [isHeroDialogOpen, setIsHeroDialogOpen] = useState(false);
    const [gameCode, setGameCode] = useState('');

    const handleJoin = (code: string) => {
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

                    <ConvexDialog.Content className='w-md'>

                        <CloseButton onPress={() => setIsHeroDialogOpen(false)} />

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
