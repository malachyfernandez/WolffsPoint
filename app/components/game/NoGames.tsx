import React from 'react';
import Column from '../layout/Column';
import { SadEmoji } from '../ui/icons/SadEmoji';
import FontText from '../ui/text/FontText';
import JoinGameButton from './JoinGameButton';

interface NoGamesProps {
    joinGame: (gameId: string) => void;
}

const NoGames = ({ joinGame }: NoGamesProps) => {
    return (
        <Column className='gap-4 w-full items-center h-full justify-center'>

            
                <SadEmoji size={100} lineWidth={1} color={"white"}/>
            
            <FontText color='white' >You dont have any games right now</FontText>
            <JoinGameButton onJoin={joinGame}/>
        </Column>
    );
};

export default NoGames;
