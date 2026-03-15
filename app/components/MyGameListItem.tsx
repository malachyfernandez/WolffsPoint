import React from 'react';
import PoppinsText from './ui/PoppinsText';
import ListRow from './ui/ListRow';

import { UserListRecord } from 'hooks/useUserList';
import { GameInfo } from 'types/games';

interface MyGameListItemProps {
    game: UserListRecord<GameInfo>;
    setActiveGameId: (gameId: string) => void;
}

const MyGameListItem = ({ game, setActiveGameId }: MyGameListItemProps) => {
    const handleSetActiveGameId = () => {
        setActiveGameId(game.value.id);
    };

    return (
        <ListRow className='justify-between' onPress={handleSetActiveGameId}>
            <PoppinsText>{game.value.name}</PoppinsText>
            <PoppinsText>{game.value.description}</PoppinsText>
            <PoppinsText>{game.value.id}</PoppinsText>
        </ListRow>
    );
};

export default MyGameListItem;
