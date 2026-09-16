import React, { useState } from 'react';
import { View } from 'react-native';
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
import { BodyReportScope } from '../../../contexts/BodyReadinessContext';
import { PlayerProfile } from '../../../types/multiplayer';
import { PlayerStatusProvider } from '../../../contexts/PlayerStatusContext';

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
  // Tabs mount lazily on first visit (no upfront fetching for unopened tabs),
  // then stay mounted so dialog/minimize state survives tab switches.
  const [mountedTabs, setMountedTabs] = useState<ReadonlySet<OperatorTab>>(() => new Set(['players']));

  const handleTabPress = (tab: OperatorTab) => {
    setActiveTab(tab);
    setMountedTabs((prev) => (prev.has(tab) ? prev : new Set(prev).add(tab)));
  };

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
    <PlayerStatusProvider isPlayerDead={false}>
      <Column className="w-full gap-4 sm:gap-5">
        <GameTabBar activeTab={activeTab} onTabPress={handleTabPress} tabs={operatorTabs} />
        <PaperContainer>
          <View className="w-full min-w-0">
            <View
              style={{ display: activeTab === 'players' ? 'flex' : 'none' }}
              className="w-full min-w-0">
              {mountedTabs.has('players') && (
              <BodyReportScope enabled={activeTab === 'players'}>
              <PlayerPageOPERATOR currentUserId={currentUserId} gameId={gameId} />
              </BodyReportScope>
              )}
            </View>
            <View
              style={{ display: activeTab === 'config' ? 'flex' : 'none' }}
              className="w-full min-w-0">
              {mountedTabs.has('config') && (
              <BodyReportScope enabled={activeTab === 'config'}>
              <RolesPageOPERATOR currentUserId={currentUserId} gameId={gameId} />
              </BodyReportScope>
              )}
            </View>
            <View
              style={{ display: activeTab === 'nightly' ? 'flex' : 'none' }}
              className="w-full min-w-0">
              {mountedTabs.has('nightly') && (
              <BodyReportScope enabled={activeTab === 'nightly'}>
              <NightlyPageOPERATOR currentUserId={currentUserId} gameId={gameId} />
              </BodyReportScope>
              )}
            </View>
            <View
              style={{ display: activeTab === 'forum' ? 'flex' : 'none' }}
              className="w-full min-w-0">
              {mountedTabs.has('forum') && (
              <BodyReportScope enabled={activeTab === 'forum'}>
              <TownSquarePagePLAYER gameId={gameId} currentProfile={profile} />
              </BodyReportScope>
              )}
            </View>
            <View
              style={{ display: activeTab === 'newspaper' ? 'flex' : 'none' }}
              className="w-full min-w-0">
              {mountedTabs.has('newspaper') && (
              <BodyReportScope enabled={activeTab === 'newspaper'}>
              <NewspaperPageOPERATOR currentUserId={currentUserId} gameId={gameId} />
              </BodyReportScope>
              )}
            </View>
            <View
              style={{ display: activeTab === 'rulebook' ? 'flex' : 'none' }}
              className="w-full min-w-0">
              {mountedTabs.has('rulebook') && (
              <BodyReportScope enabled={activeTab === 'rulebook'}>
              <ConfigPageOPERATOR gameId={gameId} currentUserId={currentUserId} />
              </BodyReportScope>
              )}
            </View>
          </View>
        </PaperContainer>
      </Column>
    </PlayerStatusProvider>
  );
};

export default OperatorGamePage;
