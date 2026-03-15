import React from 'react';
import Column from './layout/Column';
import AppButton from './ui/AppButton';
import PoppinsText from './ui/PoppinsText';

interface GameListProps {
    gamesTheyJoined: string[];
    setGamesTheyJoined: (games: string[]) => void;
}

const GameList = ({ gamesTheyJoined, setGamesTheyJoined }: GameListProps) => {
    return (
        <Column className='p-6'>
            <Column>
                <PoppinsText weight='bold'>Joined Games</PoppinsText>
            </Column>
            <Column>
                {gamesTheyJoined.map((game) => (
                    <Column key={game}>
                        <PoppinsText>{game}</PoppinsText>
                        <AppButton 
                            variant="green" 
                            className="h-12 w-40" 
                            onPress={() => setGamesTheyJoined(gamesTheyJoined.filter((g) => g !== game))}
                        >
                            <PoppinsText weight='medium' color="white">Leave</PoppinsText>
                        </AppButton>
                    </Column>
                ))}
            </Column>

            <Column>
                <PoppinsText weight='bold'>My Games</PoppinsText>
            </Column>
        </Column>
    );
};

export default GameList;
