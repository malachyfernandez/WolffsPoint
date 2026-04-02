import React from 'react';
import AppButton from '../ui/buttons/AppButton';
import PoppinsText from '../ui/text/PoppinsText';
import ListRow from '../ui/lists/ListRow';
import { useUserListGet } from 'hooks/useUserListGet';

interface JoinedGameListItemProps {
    game: string;
    onLeave: () => void;
    className?: string;
    setActiveGameId: (gameId: string) => void;
    index: number;
}

const JoinedGameListItem = ({ game, onLeave, className, setActiveGameId, index }: JoinedGameListItemProps) => {
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

    // if index = 0 add border-top
    const borderClass = index === 0 ? 'border-t' : '';


    return (
        <>
            <ListRow className={`justify-between items-center ${className || ''} ${borderClass}`} onPress={handleSetActiveGameId}>
                <PoppinsText>
                    {`${displayName} (${displayId})`}
                    {isGameDeleted && (
                        <PoppinsText className="text-gray-500 text-sm">
                            {' - (this game might have been deleted)'}
                        </PoppinsText>
                    )}
                </PoppinsText>

            </ListRow>
            {/* <AppButton
                variant="green"
                className="h-12 w-40"
                onPress={onLeave}
            >
                <PoppinsText weight='medium' color="white">Leave</PoppinsText>
            </AppButton> */}
        </>
    );
};

export default JoinedGameListItem;
