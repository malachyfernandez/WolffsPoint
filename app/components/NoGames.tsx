import React from 'react';
import Column from '../layout/Column';
import { SadEmoji } from './icons/SadEmoji';
import PoppinsText from './ui/PoppinsText';
import JoinGameButton from './ui/JoinGameButton';

interface NoGamesProps {
    showModal: () => void;
}

const NoGames = ({ showModal }: NoGamesProps) => {
    return (
        <Column className='w-full items-center h-full justify-center'>
            <SadEmoji size={100} lineWidth={1} />
            <PoppinsText >You dont have any games right now</PoppinsText>
            <JoinGameButton onPress={showModal} />
        </Column>
    );
};

export default NoGames;
