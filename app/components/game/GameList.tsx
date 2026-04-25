import React from 'react';
import Column from '../layout/Column';
import JoinedGames from './JoinedGames';
import MyGames from './MyGames';
import ProfileInfo from './ProfileInfo';
import { useValue } from 'hooks/useData';
import { UserListRecord } from 'hooks/useUserList';
import { GameInfo } from 'types/games';
import LoadingContainer from '../ui/loading/LoadingContainer';


interface GameListProps {
    gamesTheyJoined: string[];
    setGamesTheyJoined: (games: string[]) => void;
    myGames: UserListRecord<GameInfo>[] | undefined;
    hasJoinedAGame: boolean;
    hasMadeAGame: boolean;
    setActiveGameId: (gameId: string) => void;
}

const GameList = ({ gamesTheyJoined, setGamesTheyJoined, myGames, hasJoinedAGame, hasMadeAGame, setActiveGameId }: GameListProps) => {
    const [archivedGames, setArchivedGames] = useValue<string[]>("archivedGames");
    return (
        <LoadingContainer dependencies={[archivedGames]} loadingText="Loading games">
            <Column className='gap-6 py-6 px-4 sm:px-6'>

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
        </LoadingContainer>
    );
};

export default GameList;
