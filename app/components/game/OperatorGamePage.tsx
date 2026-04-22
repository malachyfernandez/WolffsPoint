import React, { useState } from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
import Column from '../layout/Column';
import PlayerPageOPERATOR from './PlayerPageOPERATOR';
import RolesPageOPERATOR from './RolesPageOPERATOR';
import NightlyPageOPERATOR from './NightlyPageOPERATOR';
import TownSquarePagePLAYER from './TownSquarePagePLAYER';
import NewspaperPageOPERATOR from './NewspaperPageOPERATOR';
import ConfigPageOPERATOR from './ConfigPageOPERATOR';
import GameTabBar, { GameTabDefinition } from './GameTabBar';
import PlayersIcon from '../ui/icons/Players';
import RolesIcon from '../ui/icons/Roles';
import NightlyIcon from '../ui/icons/Nightly';
import TownSquareIcon from '../ui/icons/TownSquare';
import NewspaperIcon from '../ui/icons/Newspaper';
import ConfigIcon from '../ui/icons/Config';
import PaperContainer from '../ui/PaperContainer';
import { PlayerProfile } from '../../../types/multiplayer';

export type OperatorTab = 'players' | 'config' | 'nightly' | 'forum' | 'newspaper' | 'rulebook';

interface OperatorGamePageProps {
    gameId: string;
    currentUserId: string;
}

const operatorTabs: GameTabDefinition<OperatorTab>[] = [
    { label: 'Players', condensedLabel: 'Players', value: 'players', icon: <PlayersIcon /> },
    { label: 'Roles', condensedLabel: 'Roles', value: 'config', icon: <RolesIcon /> },
    { label: 'Nightly', condensedLabel: 'Nightly', value: 'nightly', icon: <NightlyIcon /> },
    { label: 'Town Square', condensedLabel: 'Town Sq', value: 'forum', icon: <TownSquareIcon /> },
    { label: 'Newspaper', condensedLabel: 'News', value: 'newspaper', icon: <NewspaperIcon /> },
    { label: 'Config', condensedLabel: 'Config', value: 'rulebook', icon: <ConfigIcon /> },
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
        <Column className='gap-4 w-full sm:gap-5'>
            <GameTabBar activeTab={activeTab} onTabPress={setActiveTab} tabs={operatorTabs} gameId={gameId} />
            <PaperContainer gameId={gameId}>
                <Animated.View key={activeTab} entering={FadeIn.duration(300)} className='w-full min-w-0'>
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
