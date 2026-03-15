import React from 'react';
import Column from './layout/Column';
import JoinedGames from './JoinedGames';
import MyGames from './MyGames';

import { UserListRecord } from 'hooks/useUserList';
import { GameInfo } from 'types/games';



interface GameListProps {
    gamesTheyJoined: string[];
    setGamesTheyJoined: (games: string[]) => void;
    myGames: UserListRecord<GameInfo>[] | undefined;
    hasJoinedAGame: boolean;
    hasMadeAGame: boolean;
    setActiveGameId: (gameId: string) => void;
}

const GameList = ({ gamesTheyJoined, setGamesTheyJoined, myGames, hasJoinedAGame, hasMadeAGame, setActiveGameId }: GameListProps) => {

    return (
        <Column className='p-6'>
            {hasJoinedAGame && (
                <JoinedGames
                    gamesTheyJoined={gamesTheyJoined}
                    setGamesTheyJoined={setGamesTheyJoined}
                    setActiveGameId={setActiveGameId}
                />
            )}

            {hasMadeAGame && (
                <MyGames
                    myGames={myGames}
                    setActiveGameId={setActiveGameId}
                />
            )}
        </Column>
    );
};

export default GameList;
