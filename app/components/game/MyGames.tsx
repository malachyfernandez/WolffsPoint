import React from 'react';
import Column from '../layout/Column';
import FontText from '../ui/text/FontText';
import MyGameListItem from './MyGameListItem';

import { UserListRecord } from 'hooks/useUserList';
import { GameInfo } from 'types/games';

interface MyGamesProps {
    myGames: UserListRecord<GameInfo>[] | undefined;
    setActiveGameId: (gameId: string) => void;
}

const MyGames = ({ myGames, setActiveGameId }: MyGamesProps) => {
    return (
        <Column>
            <FontText weight='bold' className='text-text-inverted'>My Games</FontText>
            <Column gap={0}>
                {myGames?.map((game, index) => (
                    <MyGameListItem
                        index={index}
                        key={index}
                        game={game}
                        setActiveGameId={setActiveGameId}
                    />
                ))}
            </Column>
        </Column>
    );
};

export default MyGames;
