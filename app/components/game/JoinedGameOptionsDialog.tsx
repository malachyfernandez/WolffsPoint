import React from 'react';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import Column from '../layout/Column';
import Row from '../layout/Row';
import AppButton from '../ui/buttons/AppButton';
import PoppinsText from '../ui/text/PoppinsText';
import DialogHeader from '../ui/dialog/DialogHeader';
import { useUserListGet } from 'hooks/useUserListGet';
import { useTownSquareAuthorIdentity } from './townSquare/TownSquareAuthorIdentity';
import { TownSquareAuthorAvatar } from './townSquare/TownSquareAuthorIdentity';
import { Archive, Hash } from 'lucide-react-native';

interface JoinedGameOptionsDialogProps {
    gameId: string;
    gameName: string;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onArchive: () => void;
}

const JoinedGameOptionsDialog = ({
    gameId,
    gameName,
    isOpen,
    onOpenChange,
    onArchive
}: JoinedGameOptionsDialogProps) => {
    // Get game info to find the owner/operator
    const gameInfo = useUserListGet({
        key: "games",
        filterFor: gameId,
    });

    const gameOwnerId = gameInfo?.[0]?.userToken;
    const gameData = gameInfo?.[0]?.value;

    // Get operator profile info
    const operatorIdentity = useTownSquareAuthorIdentity({
        gameId,
        userId: gameOwnerId || ''
    });

    const handleArchive = () => {
        onArchive();
        onOpenChange(false);
    };

    const handleClose = () => {
        onOpenChange(false);
    };

    return (
        <ConvexDialog.Root isOpen={isOpen} onOpenChange={handleClose}>
            <ConvexDialog.Portal>
                <ConvexDialog.Overlay />
                <ConvexDialog.Content>
                    <ConvexDialog.Close
                        iconProps={{ color: 'rgb(246, 238, 219)' }}
                        className="w-10 h-10 bg-accent-hover absolute right-4 top-4 z-10"
                    />

                    <Column gap={4}>
                        <DialogHeader
                            text={gameName}
                            subtext="Game Options"
                        />

                        {/* Game Details - displayed directly at top */}
                        <Column gap={3}>
                            <Row className="items-center gap-3">
                                <Hash size={18} color="rgb(150, 150, 150)" />
                                <PoppinsText varient="subtext">Game ID: {gameId}</PoppinsText>
                            </Row>

                            {gameData?.description && (
                                <PoppinsText varient="subtext">{gameData.description}</PoppinsText>
                            )}

                            <Column gap={2} className="mt-1">
                                <PoppinsText weight="medium">Operator</PoppinsText>
                                {gameOwnerId ? (
                                    <Row className="items-center gap-3">
                                        <TownSquareAuthorAvatar
                                            gameId={gameId}
                                            userId={gameOwnerId}
                                            size={40}
                                        />
                                        <Column>
                                            <PoppinsText weight="medium">
                                                {operatorIdentity.displayName}
                                            </PoppinsText>
                                            <PoppinsText varient="subtext">
                                                {operatorIdentity.fallbackLabel}
                                            </PoppinsText>
                                        </Column>
                                    </Row>
                                ) : (
                                    <PoppinsText varient="subtext">Operator information unavailable</PoppinsText>
                                )}
                            </Column>
                        </Column>

                        <AppButton
                            variant="filled"
                            className="h-12 w-full"
                            onPress={handleArchive}
                        >
                            <Row className="items-center gap-3">
                                <Archive size={20} color="white" />
                                <PoppinsText weight="medium" color="white">
                                    Archive Game
                                </PoppinsText>
                            </Row>
                        </AppButton>
                    </Column>
                </ConvexDialog.Content>
            </ConvexDialog.Portal>
        </ConvexDialog.Root>
    );
};

export default JoinedGameOptionsDialog;
