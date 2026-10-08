import React, { useMemo, useState, useCallback, startTransition } from 'react';
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
import { BodyReportScope } from 'contexts/BodyReadinessContext';
import { PlayerProfile } from 'types/multiplayer';
import { PlayerStatusProvider } from 'contexts/PlayerStatusContext';
import { SimProfiler } from '../../sim/perf/SimProfiler';
import TabPane from '../layout/TabPane';
import { useBoundedMountedTabs } from '../../hooks/useBoundedMountedTabs';
import { useMinimize } from '../ui/minimize/MinimizeContext';

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
  // then stay mounted so dialog/minimize state survives tab switches — bounded
  // by device memory tier: under pressure the least-recently-active hidden
  // panes are evicted (they re-mount on revisit, same as first visit).
  const scopeIdForTab = useCallback((tab: OperatorTab) => `op-tab-${gameId}-${tab}`, [gameId]);
  const { removeByScope } = useMinimize();
  // An evicted pane kills its dialogs' restore closures — drop their
  // (non-pinned) minimized cards so no dead UI lingers in the minimize row.
  const onTabEvicted = useCallback(
    (tab: OperatorTab) => removeByScope(scopeIdForTab(tab)),
    [removeByScope, scopeIdForTab]
  );
  const mountedTabs = useBoundedMountedTabs(activeTab, scopeIdForTab, onTabEvicted);

  const handleTabPress = useCallback((tab: OperatorTab) => {
    // Non-urgent update: keeps taps responsive while a heavy cold tab mounts.
    startTransition(() => {
      setActiveTab(tab);
    });
  }, []);

  // Create operator profile for TownSquare — memoized: a fresh object identity
  // every render re-renders the forum subtree even while hidden.
  const profile: PlayerProfile = useMemo(
    () => ({
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
    }),
    [gameId, currentUserId]
  );

  return (
    <PlayerStatusProvider isPlayerDead={false}>
      <Column className="w-full gap-4 sm:gap-5">
        <GameTabBar activeTab={activeTab} onTabPress={handleTabPress} tabs={operatorTabs} />
        <SimProfiler id="op-tabs">
        <PaperContainer>
          <View className="w-full min-w-0">
            <TabPane
              active={activeTab === 'players'}
              mounted={mountedTabs.has('players')}
              scopeId={scopeIdForTab('players')}>
              <BodyReportScope enabled={activeTab === 'players'}>
                <PlayerPageOPERATOR currentUserId={currentUserId} gameId={gameId} />
              </BodyReportScope>
            </TabPane>
            <TabPane
              active={activeTab === 'config'}
              mounted={mountedTabs.has('config')}
              scopeId={scopeIdForTab('config')}>
              <BodyReportScope enabled={activeTab === 'config'}>
                <RolesPageOPERATOR currentUserId={currentUserId} gameId={gameId} />
              </BodyReportScope>
            </TabPane>
            <TabPane
              active={activeTab === 'nightly'}
              mounted={mountedTabs.has('nightly')}
              scopeId={scopeIdForTab('nightly')}>
              <BodyReportScope enabled={activeTab === 'nightly'}>
                <NightlyPageOPERATOR currentUserId={currentUserId} gameId={gameId} />
              </BodyReportScope>
            </TabPane>
            <TabPane
              active={activeTab === 'forum'}
              mounted={mountedTabs.has('forum')}
              scopeId={scopeIdForTab('forum')}>
              <BodyReportScope enabled={activeTab === 'forum'}>
                <TownSquarePagePLAYER gameId={gameId} currentProfile={profile} />
              </BodyReportScope>
            </TabPane>
            <TabPane
              active={activeTab === 'newspaper'}
              mounted={mountedTabs.has('newspaper')}
              scopeId={scopeIdForTab('newspaper')}>
              <BodyReportScope enabled={activeTab === 'newspaper'}>
                <NewspaperPageOPERATOR currentUserId={currentUserId} gameId={gameId} />
              </BodyReportScope>
            </TabPane>
            <TabPane
              active={activeTab === 'rulebook'}
              mounted={mountedTabs.has('rulebook')}
              scopeId={scopeIdForTab('rulebook')}>
              <BodyReportScope enabled={activeTab === 'rulebook'}>
                <ConfigPageOPERATOR gameId={gameId} currentUserId={currentUserId} />
              </BodyReportScope>
            </TabPane>
          </View>
        </PaperContainer>
        </SimProfiler>
      </Column>
    </PlayerStatusProvider>
  );
};

export default OperatorGamePage;
