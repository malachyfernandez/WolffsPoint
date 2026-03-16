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
}

const JoinedGameListItem = ({ game, onLeave, className, setActiveGameId }: JoinedGameListItemProps) => {
    const gameInfo = useUserListGet({
        key: "games",
        filterFor: game,
    })

    const GameName = gameInfo?.[0].value.name
    const GameID = gameInfo?.[0].value.id

    const handleSetActiveGameId = () => {
        setActiveGameId(game)
    }


    return (
        <>
            <ListRow className={`justify-between items-center ${className || ''}`} onPress={handleSetActiveGameId}>
                <PoppinsText>{`${GameName} (${GameID})`}</PoppinsText>

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
