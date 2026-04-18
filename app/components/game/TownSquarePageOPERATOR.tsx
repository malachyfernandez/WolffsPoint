import React, { useMemo } from 'react';
import TownSquarePagePLAYER from './TownSquarePagePLAYER';

interface TownSquarePageOPERATORProps {
    gameId: string;
    currentUserId: string;
}

const TownSquarePageOPERATOR = ({ gameId, currentUserId }: TownSquarePageOPERATORProps) => {
    const operatorProfile = useMemo(() => ({
        bioMarkdown: 'Game operator account',
        claimedAt: 0,
        discord: '',
        email: 'operator@game.local',
        gameId,
        inGameName: 'Game Operator',
        instagram: '',
        otherContact: '',
        phoneNumber: '',
        profileImageUrl: '',
        userId: currentUserId,
    }), [currentUserId, gameId]);

    return <TownSquarePagePLAYER currentProfile={operatorProfile} gameId={gameId} />;
};

export default TownSquarePageOPERATOR;
