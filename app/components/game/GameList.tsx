import React from 'react';
import Column from '../layout/Column';
import JoinedGames from './JoinedGames';
import MyGames from './MyGames';
import ProfileInfo from './ProfileInfo';
import { useUserVariable } from 'hooks/useUserVariable';

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
    const [archivedGames, setArchivedGames] = useUserVariable<string[]>({
        key: "archivedGames",
        defaultValue: [],
    });
    return (
        <Column className='p-6' gap={6}>

            {(hasJoinedAGame || (archivedGames.value?.length || 0) > 0) && (
                <JoinedGames
                    gamesTheyJoined={gamesTheyJoined}
                    setGamesTheyJoined={setGamesTheyJoined}
                    setActiveGameId={setActiveGameId}
                    archivedGames={archivedGames}
                    setArchivedGames={setArchivedGames}
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
