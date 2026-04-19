import React, { useState } from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
import { MessageSquare, Newspaper, ScrollText, Shield, Users } from 'lucide-react-native';
import Column from '../layout/Column';
import PlayerPageOPERATOR from './PlayerPageOPERATOR';
import RolesPageOPERATOR from './RolesPageOPERATOR';
import NightlyPageOPERATOR from './NightlyPageOPERATOR';
import TownSquarePagePLAYER from './TownSquarePagePLAYER';
import NewspaperPageOPERATOR from './NewspaperPageOPERATOR';
import ConfigPageOPERATOR from './ConfigPageOPERATOR';
import GameTabBar, { GameTabDefinition } from './GameTabBar';
import GameUserIcon from '../ui/icons/UserIcon';
import PaperContainer from '../ui/PaperContainer';
import { PlayerProfile } from '../../../types/multiplayer';

export type OperatorTab = 'players' | 'config' | 'nightly' | 'forum' | 'newspaper' | 'rulebook';

interface OperatorGamePageProps {
    gameId: string;
    currentUserId: string;
}

const operatorTabs: GameTabDefinition<OperatorTab>[] = [
    { label: 'Players', condensedLabel: 'Players', value: 'players', icon: <GameUserIcon /> },
    { label: 'Roles', condensedLabel: 'Roles', value: 'config', icon: <Shield size={20} /> },
    { label: 'Nightly', condensedLabel: 'Nightly', value: 'nightly', icon: <Users size={20} /> },
    { label: 'Town Square', condensedLabel: 'Town Sq', value: 'forum', icon: <MessageSquare size={20} /> },
    { label: 'Newspaper', condensedLabel: 'News', value: 'newspaper', icon: <Newspaper size={20} /> },
    { label: 'Config', condensedLabel: 'Config', value: 'rulebook', icon: <ScrollText size={20} /> },
];

const OperatorGamePage = ({ gameId, currentUserId }: OperatorGamePageProps) => {
    const [activeTab, setActiveTab] = useState<OperatorTab>('players');

    // Create operator profile for TownSquare
    const profile: PlayerProfile = {
        gameId,
        email: 'operator@game.local',
        userId: currentUserId,
        inGameName: 'Game Operator',
        profileImageUrl: '',
        phoneNumber: '',
        instagram: '',
        discord: '',
        otherContact: '',
        bioMarkdown: 'Game operator account',
        claimedAt: Date.now(),
    };

    return (
        <Column gap={7}>
            <GameTabBar activeTab={activeTab} onTabPress={setActiveTab} tabs={operatorTabs} />
            <PaperContainer>
                <Animated.View entering={FadeIn.duration(300)} className='w-full'>
                    {activeTab === 'players' && <PlayerPageOPERATOR currentUserId={currentUserId} gameId={gameId} />}
                    {activeTab === 'config' && <RolesPageOPERATOR currentUserId={currentUserId} gameId={gameId} />}
                    {activeTab === 'nightly' && <NightlyPageOPERATOR currentUserId={currentUserId} gameId={gameId} />}
                    {activeTab === 'forum' && <TownSquarePagePLAYER gameId={gameId} currentProfile={profile} />}
                    {activeTab === 'newspaper' && <NewspaperPageOPERATOR currentUserId={currentUserId} gameId={gameId} />}
                    {activeTab === 'rulebook' && <ConfigPageOPERATOR gameId={gameId} currentUserId={currentUserId} />}
                </Animated.View>
            </PaperContainer>
        </Column>
    );
};

export default OperatorGamePage;
