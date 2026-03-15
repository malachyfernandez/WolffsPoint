import React from 'react';
import PoppinsText from './ui/PoppinsText';

interface OperatorsPlayerPageProps {
    currentUserId: string;
    gameId: string;
}

const OperatorsPlayerPage = ({ currentUserId, gameId }: OperatorsPlayerPageProps) => {
    return (
        <PoppinsText>{`currentUserId: ${currentUserId}, gameId: ${gameId}`}</PoppinsText>
    );
};

export default OperatorsPlayerPage;
