import React from 'react';
import FontText from '../ui/text/FontText';
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
            <FontText className='text-text-inverted'>{game.value.name}</FontText>
            <FontText className='text-text-inverted'>{game.value.description}</FontText>
            <FontText className='text-text-inverted'>{game.value.id}</FontText>
        </ListRow>
    );
};

export default MyGameListItem;
