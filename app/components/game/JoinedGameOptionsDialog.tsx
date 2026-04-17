import React, { useState } from 'react';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import Column from '../layout/Column';
import Row from '../layout/Row';
import AppButton from '../ui/buttons/AppButton';
import PoppinsText from '../ui/text/PoppinsText';
import DialogHeader from '../ui/dialog/DialogHeader';
import { useUserListGet } from 'hooks/useUserListGet';
import { useTownSquareAuthorIdentity } from './townSquare/TownSquareAuthorIdentity';
import { TownSquareAuthorAvatar } from './townSquare/TownSquareAuthorIdentity';
import { useUserVariable } from 'hooks/useUserVariable';
import { Archive, LogOut, Hash } from 'lucide-react-native';

interface JoinedGameOptionsDialogProps {
    gameId: string;
    gameName: string;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onLeave: () => void;
    onArchive: () => void;
}

const JoinedGameOptionsDialog = ({
    gameId,
    gameName,
    isOpen,
    onOpenChange,
    onLeave,
    onArchive
}: JoinedGameOptionsDialogProps) => {
    const [showingSection, setShowingSection] = useState<'menu' | 'archive'>('menu');

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

    // Get archived games list for this user
    const [archivedGames, setArchivedGames] = useUserVariable<string[]>({
        key: "archivedGames",
        defaultValue: [],
    });

    const isArchived = archivedGames.value?.includes(gameId) || false;

    const handleArchive = () => {
        if (isArchived) {
            // Unarchive
            setArchivedGames(archivedGames.value?.filter(id => id !== gameId) || []);
        } else {
            // Archive
            setArchivedGames([...(archivedGames.value || []), gameId]);
        }
        onArchive();
        onOpenChange(false);
        setShowingSection('menu');
    };

    const handleLeave = () => {
        onLeave();
        onOpenChange(false);
        setShowingSection('menu');
    };

    const handleClose = () => {
        onOpenChange(false);
        setShowingSection('menu');
    };

    const handleBackToMenu = () => {
        setShowingSection('menu');
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

                    {showingSection === 'menu' && (
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

                            <Column gap={2}>
                                <AppButton
                                    variant="grey"
                                    className="h-12 w-full justify-start px-4"
                                    onPress={() => setShowingSection('archive')}
                                >
                                    <Row className="items-center gap-3">
                                        <Archive size={20} color="white" />
                                        <PoppinsText weight="medium" color="white">
                                            {isArchived ? 'Unarchive Game' : 'Archive Game'}
                                        </PoppinsText>
                                    </Row>
                                </AppButton>

                                <AppButton
                                    variant="red"
                                    className="h-12 w-full justify-start px-4"
                                    onPress={handleLeave}
                                >
                                    <Row className="items-center gap-3">
                                        <LogOut size={20} color="white" />
                                        <PoppinsText weight="medium" color="white">Leave Game</PoppinsText>
                                    </Row>
                                </AppButton>
                            </Column>
                        </Column>
                    )}

                    {showingSection === 'archive' && (
                        <Column gap={4}>
                            <DialogHeader
                                text={isArchived ? 'Unarchive Game' : 'Archive Game'}
                                subtext={gameName}
                            />

                            <PoppinsText>
                                {isArchived
                                    ? 'Unarchiving will move this game back to your active games list.'
                                    : 'Archiving will hide this game from your main list. You can unarchive it later.'}
                            </PoppinsText>

                            <Row gap={2} className="mt-4">
                                <AppButton
                                    variant="grey"
                                    className="h-12 flex-1"
                                    onPress={handleBackToMenu}
                                >
                                    <PoppinsText weight="medium" color="white">Cancel</PoppinsText>
                                </AppButton>

                                <AppButton
                                    variant="accent"
                                    className="h-12 flex-1"
                                    onPress={handleArchive}
                                >
                                    <PoppinsText weight="medium" color="white">
                                        {isArchived ? 'Unarchive' : 'Archive'}
                                    </PoppinsText>
                                </AppButton>
                            </Row>
                        </Column>
                    )}
                </ConvexDialog.Content>
            </ConvexDialog.Portal>
        </ConvexDialog.Root>
    );
};

export default JoinedGameOptionsDialog;
