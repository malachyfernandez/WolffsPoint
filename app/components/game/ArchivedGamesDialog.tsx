import React from 'react';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import Column from '../layout/Column';
import Row from '../layout/Row';
import AppButton from '../ui/buttons/AppButton';
import FontText from '../ui/text/FontText';
import DialogHeader from '../ui/dialog/DialogHeader';
import { useUserVariable } from 'hooks/useUserVariable';
import { useUserListGet } from 'hooks/useUserListGet';
import ListRow from '../ui/lists/ListRow';
import { UserVariableResult } from 'hooks/useUserVariable';

interface ArchivedGamesDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    setActiveGameId: (gameId: string) => void;
    textClassName?: string;
    archivedGames: UserVariableResult<string[]>;
    setArchivedGames: (newValue: string[]) => void;
}

const ArchivedGamesDialog = ({ isOpen, onOpenChange, setActiveGameId, textClassName, archivedGames, setArchivedGames }: ArchivedGamesDialogProps) => {
    const [gamesTheyJoined, setGamesTheyJoined] = useUserVariable<string[]>({
        key: "gamesTheyJoined",
        defaultValue: [],
    });

    const archivedGameIds = archivedGames.value || [];

    const handleUnarchive = (gameId: string) => {
        // Remove from archived
        setArchivedGames(archivedGameIds.filter(id => id !== gameId));
        // Add back to joined games
        setGamesTheyJoined([...(gamesTheyJoined.value || []), gameId]);
    };

    const handleGamePress = (gameId: string) => {
        setActiveGameId(gameId);
        onOpenChange(false);
    };

    return (
        <ConvexDialog.Root isOpen={isOpen} onOpenChange={onOpenChange}>
            <ConvexDialog.Portal>
                <ConvexDialog.Overlay />
                <ConvexDialog.Content>
                    <ConvexDialog.Close
                        iconProps={{ color: 'rgb(246, 238, 219)' }}
                        className="w-10 h-10 bg-accent-hover absolute right-4 top-4 z-10"
                    />

                    <Column className='gap-4'>
                        <DialogHeader
                            text="Archived Games"
                            subtext={`${archivedGameIds.length} game${archivedGameIds.length === 1 ? '' : 's'} archived`}
                        />

                        <Column className='gap-0'>
                            {archivedGameIds.length === 0 ? (
                                <FontText variant="subtext">No archived games</FontText>
                            ) : (
                                archivedGameIds.map((gameId, index) => (
                                    <ArchivedGameRow
                                        key={gameId}
                                        gameId={gameId}
                                        index={index}
                                        onUnarchive={() => handleUnarchive(gameId)}
                                        onPress={() => handleGamePress(gameId)}
                                        textClassName={textClassName}
                                    />
                                ))
                            )}
                        </Column>
                    </Column>
                </ConvexDialog.Content>
            </ConvexDialog.Portal>
        </ConvexDialog.Root>
    );
};

interface ArchivedGameRowProps {
    gameId: string;
    index: number;
    onUnarchive: () => void;
    onPress: () => void;
    textClassName?: string;
}

const ArchivedGameRow = ({ gameId, index, onUnarchive, onPress, textClassName }: ArchivedGameRowProps) => {
    const gameInfo = useUserListGet({
        key: "games",
        filterFor: gameId,
    });

    const GameName = gameInfo?.[0]?.value?.name;
    const GameID = gameInfo?.[0]?.value?.id;
    const displayName = GameName || 'Unknown Game';
    const displayId = GameID || gameId;
    const isGameDeleted = !GameName && !GameID;

    const borderClass = index === 0 ? 'border-t' : '';

    return (
        <Row className="gap-0 items-center">
            <ListRow
                className={`justify-between items-center flex-1 ${borderClass}`}
                onPress={onPress}
            >
                <FontText className={textClassName || "text-text-inverted"}>
                    {`${displayName} (${displayId})`}
                    {isGameDeleted && (
                        <FontText className={`${textClassName || "text-text-inverted"} text-sm`}>
                            {' - (this game might have been deleted)'}
                        </FontText>
                    )}
                </FontText>
            </ListRow>

            <AppButton
                variant="accent"
                className="h-10 px-3"
                onPress={onUnarchive}
            >
                <FontText weight="medium" color="white">Unarchive</FontText>
            </AppButton>
        </Row>
    );
};

export default ArchivedGamesDialog;
