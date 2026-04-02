import React from 'react';
import PoppinsText from '../ui/text/PoppinsText';
import ListRow from '../ui/lists/ListRow';

import { UserListRecord } from 'hooks/useUserList';
import { GameInfo } from 'types/games';

interface MyGameListItemProps {
    game: UserListRecord<GameInfo>;
    index: number;
    setActiveGameId: (gameId: string) => void;
}

const MyGameListItem = ({ game, index, setActiveGameId }: MyGameListItemProps) => {
    const handleSetActiveGameId = () => {
        setActiveGameId(game.value.id);
    };

    const borderClass = index === 0 ? 'border-t' : '';

    return (

        <ListRow className={`justify-between ${borderClass}`} onPress={handleSetActiveGameId}>
            <PoppinsText className='text-text-inverted'>{game.value.name}</PoppinsText>
            <PoppinsText className='text-text-inverted'>{game.value.description}</PoppinsText>
            <PoppinsText className='text-text-inverted'>{game.value.id}</PoppinsText>
        </ListRow>
    );
};

export default MyGameListItem;
