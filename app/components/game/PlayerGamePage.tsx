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

export type PlayerTab = 'townSquare' | 'newspaper' | 'ruleBook' | 'eyesOnly' | 'phoneBook';

interface PlayerGamePageProps {
    gameId: string;
    currentUserId: string;
}

const playerTabs: GameTabDefinition<PlayerTab>[] = [
    { label: 'Town Square', value: 'townSquare', icon: <MessageSquare size={20} /> },
    { label: 'Newspaper', value: 'newspaper', icon: <Newspaper size={20} /> },
    { label: 'Rule Book', value: 'ruleBook', icon: <BookUser size={20} /> },
    { label: 'Your Eyes Only', value: 'eyesOnly', icon: <Eye size={20} /> },
    { label: 'Phone Book', value: 'phoneBook', icon: <Phone size={20} /> },
];

const PlayerGamePage = ({ gameId, currentUserId }: PlayerGamePageProps) => {
    const [activeTab, setActiveTab] = useState<PlayerTab>('townSquare');

    return (
        <PlayerAccessGate gameId={gameId} currentUserId={currentUserId}>
            {({ currentEmail, matchingPlayer, profile }) => (
                <Column>
                    <GameTabBar activeTab={activeTab} onTabPress={setActiveTab} tabs={playerTabs} />
                    <Column className='w-full bg-inner-background border-border border-2 rounded-xl p-4 mb-8' style={{ boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}>
                        {activeTab === 'townSquare' && <TownSquarePagePLAYER gameId={gameId} currentProfile={profile} />}
                        {activeTab === 'newspaper' && <ReadOnlyNewspaperPagePLAYER gameId={gameId} />}
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
                    </Column>
                </Column>
            )}
        </PlayerAccessGate>
    );
};

export default PlayerGamePage;
