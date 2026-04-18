import React, { useState } from 'react';
import { BookUser, Eye, MessageSquare, Newspaper, Phone } from 'lucide-react-native';
import Column from '../layout/Column';
import GameTabBar, { GameTabDefinition } from './GameTabBar';
import TownSquarePagePLAYER from './TownSquarePagePLAYER';
import ReadOnlyNewspaperPagePLAYER from './ReadOnlyNewspaperPagePLAYER';
import RuleBookPagePLAYER from './RuleBookPagePLAYER';
import YourEyesOnlyPagePLAYER from './YourEyesOnlyPagePLAYER';
import PhoneBookPagePLAYER from './PhoneBookPagePLAYER';
import PlayerAccessGate from './PlayerAccessGate';
import PaperContainer from '../ui/PaperContainer';

export type PlayerTab = 'townSquare' | 'newspaper' | 'ruleBook' | 'eyesOnly' | 'phoneBook';

interface PlayerGamePageProps {
    gameId: string;
    currentUserId: string;
}

const playerTabs: GameTabDefinition<PlayerTab>[] = [
    { label: 'Town Square', condensedLabel: 'Town Sq', value: 'townSquare', icon: <MessageSquare size={20} /> },
    { label: 'Newspaper', condensedLabel: 'News', value: 'newspaper', icon: <Newspaper size={20} /> },
    { label: 'Your Eyes Only', condensedLabel: 'Your Eyes Only', value: 'eyesOnly', icon: <Eye size={20} /> },
    { label: 'Rule Book', condensedLabel: 'Rule Bk', value: 'ruleBook', icon: <BookUser size={20} /> },
    { label: 'Phone Book', condensedLabel: 'Phone Bk', value: 'phoneBook', icon: <Phone size={20} /> },
];

const PlayerGamePage = ({ gameId, currentUserId }: PlayerGamePageProps) => {
    const [activeTab, setActiveTab] = useState<PlayerTab>('townSquare');

    return (
        <PlayerAccessGate gameId={gameId} currentUserId={currentUserId}>
            {({ currentEmail, matchingPlayer, profile }) => (
                <Column gap={0}>
                    <GameTabBar activeTab={activeTab} onTabPress={setActiveTab} tabs={playerTabs} />
                    <PaperContainer>
                        {activeTab === 'townSquare' && <TownSquarePagePLAYER gameId={gameId} currentProfile={profile} />}
                        {activeTab === 'newspaper' &&
                            <ReadOnlyNewspaperPagePLAYER
                                gameId={gameId}
                                currentEmail={currentEmail}
                                matchingPlayer={matchingPlayer}
                                currentProfile={profile}
                            />}
                        {activeTab === 'ruleBook' && <RuleBookPagePLAYER gameId={gameId} />}
                        {activeTab === 'eyesOnly' && (
                            <YourEyesOnlyPagePLAYER
                                gameId={gameId}
                                currentEmail={currentEmail}
                                matchingPlayer={matchingPlayer}
                                currentProfile={profile}
                            />
                        )}
                        {activeTab === 'phoneBook' && (
                            <PhoneBookPagePLAYER
                                gameId={gameId}
                                currentUserId={currentUserId}
                                currentEmail={currentEmail}
                            />
                        )}
                    </PaperContainer>
                </Column>
            )}
        </PlayerAccessGate>
    );
};

export default PlayerGamePage;
