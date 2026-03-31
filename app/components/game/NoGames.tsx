import React from 'react';
import Column from '../layout/Column';
import { SadEmoji } from '../ui/icons/SadEmoji';
import PoppinsText from '../ui/text/PoppinsText';
import JoinGameButton from './JoinGameButton';

interface NoGamesProps {
    joinGame: (gameId: string) => void;
}

const NoGames = ({ joinGame }: NoGamesProps) => {
    return (
        <Column className='w-full items-center h-full justify-center'>

            
                <SadEmoji size={100} lineWidth={1} />
            
            <PoppinsText >You dont have any games right now</PoppinsText>
            <JoinGameButton onJoin={joinGame}/>
        </Column>
    );
};

export default NoGames;
