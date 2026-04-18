import React, { useState } from 'react';
import Column from '../layout/Column';
import Row from '../layout/Row';
import PoppinsText from '../ui/text/PoppinsText';
import AppButton from '../ui/buttons/AppButton';
import JoinedGameListItem from './JoinedGameListItem';
import ArchivedGamesDialog from './ArchivedGamesDialog';
import { useUserVariable } from 'hooks/useUserVariable';
import { UserVariableResult } from 'hooks/useUserVariable';

interface JoinedGamesProps {
    gamesTheyJoined: string[];
    setGamesTheyJoined: (games: string[]) => void;
    setActiveGameId: (gameId: string) => void;
    archivedGames: UserVariableResult<string[]>;
    setArchivedGames: (newValue: string[]) => void;
}

const JoinedGames = ({ gamesTheyJoined, setGamesTheyJoined, setActiveGameId, archivedGames, setArchivedGames }: JoinedGamesProps) => {
    const [isArchivedDialogOpen, setIsArchivedDialogOpen] = useState(false);

    const archivedCount = archivedGames.value?.length || 0;

    return (
        <Column>
            <PoppinsText weight='bold' className='text-text-inverted'>Joined Games</PoppinsText>

            <Column gap={0}>
                {gamesTheyJoined.map((game, index) => (
                    <JoinedGameListItem
                        key={game}
                        game={game}
                        index={index}
                        setActiveGameId={setActiveGameId}
                        onArchive={() => {
                            setGamesTheyJoined(gamesTheyJoined.filter((g) => g !== game));
                            setArchivedGames([...(archivedGames.value || []), game]);
                        }}
                    />
                ))}

                {archivedCount > 0 && (
                    <Row className='justify-center mt-3'>
                        <AppButton
                            variant="grey"
                            className="px-6 py-2 rounded-full"
                            onPress={() => setIsArchivedDialogOpen(true)}
                        >
                            <PoppinsText weight='medium' color='white'>
                                {archivedCount} archived
                            </PoppinsText>
                        </AppButton>
                    </Row>
                )}
            </Column>

            <ArchivedGamesDialog
                isOpen={isArchivedDialogOpen}
                onOpenChange={setIsArchivedDialogOpen}
                setActiveGameId={setActiveGameId}
                textClassName="text-text"
                archivedGames={archivedGames}
                setArchivedGames={setArchivedGames}
            />
        </Column>
    );
};

export default JoinedGames;
