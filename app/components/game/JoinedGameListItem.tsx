import React, { useState } from 'react';
import AppButton from '../ui/buttons/AppButton';
import FontText from '../ui/text/FontText';
import ListRow from '../ui/lists/ListRow';
import { useUserListGet } from 'hooks/useUserListGet';
import JoinedGameOptionsDialog from './JoinedGameOptionsDialog';
import { MoreVertical } from 'lucide-react-native';
import Row from '../layout/Row';

interface JoinedGameListItemProps {
    game: string;
    onArchive: () => void;
    className?: string;
    setActiveGameId: (gameId: string) => void;
    index: number;
}

const JoinedGameListItem = ({ game, onArchive, className, setActiveGameId, index }: JoinedGameListItemProps) => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const gameInfo = useUserListGet({
        key: "games",
        filterFor: game,
    })

    const GameName = gameInfo?.[0]?.value?.name
    const GameID = gameInfo?.[0]?.value?.id

    const displayName = GameName || 'Unknown Game'
    const displayId = GameID || game
    const isGameDeleted = !GameName && !GameID

    const handleSetActiveGameId = () => {
        setActiveGameId(game)
    }

    const handleMenuPress = () => {
        setIsDialogOpen(true);
    }

    // if index = 0 add border-top
    const borderClass = index === 0 ? 'border-t' : '';

    return (
        <>
            <Row gap={0} className='items-center'>
                <ListRow className={`justify-between items-center ${className || ''} ${borderClass}`} onPress={handleSetActiveGameId}>
                    <FontText className='text-text-inverted' >
                        {`${displayName} (${displayId})`}
                        {isGameDeleted && (
                            <FontText className="text-text-inverted text-sm">
                                {' - (this game might have been deleted)'}
                            </FontText>
                        )}
                    </FontText>


                </ListRow>
                <AppButton
                    variant="none"
                    className="w-12 h-12 hover:bg-accent/20 items-center justify-center"
                    onPress={handleMenuPress}
                >
                    <MoreVertical size={20} color="white" />
                </AppButton>

            </Row>
            <JoinedGameOptionsDialog
                gameId={game}
                gameName={displayName}
                isOpen={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onArchive={onArchive}
            />
        </>
    );
};

export default JoinedGameListItem;
