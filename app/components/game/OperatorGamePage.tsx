import React, { useState } from 'react';
import { MessageSquare, Newspaper, ScrollText, Shield, Users } from 'lucide-react-native';
import Column from '../layout/Column';
import PlayerPageOPERATOR from './PlayerPageOPERATOR';
import ConfigPageOPERATOR from './ConfigPageOPERATOR';
import NightlyPageOPERATOR from './NightlyPageOPERATOR';
import TownSquarePageOPERATOR from './TownSquarePageOPERATOR';
import NewspaperPageOPERATOR from './NewspaperPageOPERATOR';
import RuleBookPageOPERATOR from './RuleBookPageOPERATOR';
import GameTabBar, { GameTabDefinition } from './GameTabBar';
import RemoveGameButton from './RemoveGameButton';
import GameUserIcon from '../ui/icons/UserIcon';

export type OperatorTab = 'players' | 'config' | 'nightly' | 'forum' | 'newspaper' | 'rulebook';

interface OperatorGamePageProps {
    gameId: string;
    currentUserId: string;
}

const operatorTabs: GameTabDefinition<OperatorTab>[] = [
    { label: 'Players', condensedLabel: 'Players', value: 'players', icon: <GameUserIcon /> },
    { label: 'Roles', condensedLabel: 'Roles', value: 'config', icon: <Shield size={20} /> },
    { label: 'Nightly', condensedLabel: 'Nightly', value: 'nightly', icon: <Users size={20} /> },
    { label: 'Forum', condensedLabel: 'Forum', value: 'forum', icon: <MessageSquare size={20} /> },
    { label: 'Newspaper', condensedLabel: 'News', value: 'newspaper', icon: <Newspaper size={20} /> },
    { label: 'Config', condensedLabel: 'Config', value: 'rulebook', icon: <ScrollText size={20} /> },
];

const OperatorGamePage = ({ gameId, currentUserId }: OperatorGamePageProps) => {
    const [activeTab, setActiveTab] = useState<OperatorTab>('players');

    return (
        <Column>
            <GameTabBar activeTab={activeTab} onTabPress={setActiveTab} tabs={operatorTabs} />
            <Column className='w-full bg-inner-background border-border border-2 rounded-xl p-4 mb-8' style={{ boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}>
                {activeTab === 'players' && <PlayerPageOPERATOR currentUserId={currentUserId} gameId={gameId} />}
                {activeTab === 'config' && <ConfigPageOPERATOR currentUserId={currentUserId} gameId={gameId} />}
                {activeTab === 'nightly' && <NightlyPageOPERATOR currentUserId={currentUserId} gameId={gameId} />}
                {activeTab === 'forum' && <TownSquarePageOPERATOR gameId={gameId} currentUserId={currentUserId} />}
                {activeTab === 'newspaper' && <NewspaperPageOPERATOR currentUserId={currentUserId} gameId={gameId} />}
                {activeTab === 'rulebook' && <RuleBookPageOPERATOR gameId={gameId} />}
            </Column>
            <RemoveGameButton gameId={gameId} />
        </Column>
    );
};

export default OperatorGamePage;
