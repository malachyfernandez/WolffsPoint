import React, { useState, useCallback, startTransition } from 'react';
import { View } from 'react-native';
import Column from '../layout/Column';
import GameTabBar, { GameTabDefinition } from './GameTabBar';
import TownSquarePagePLAYER from './TownSquarePagePLAYER';
import ReadOnlyNewspaperPagePLAYER from './ReadOnlyNewspaperPagePLAYER';
import DelayedReveal from '../ui/DelayedReveal';
import RuleBookPagePLAYER from './RuleBookPagePLAYER';
import YourEyesOnlyPagePLAYER from './YourEyesOnlyPagePLAYER';
import PhoneBookPagePLAYER from './PhoneBookPagePLAYER';
import PlayerAccessGate from './PlayerAccessGate';
import TownSquareIcon from '../ui/icons/TownSquare';
import NewspaperIcon from '../ui/icons/Newspaper';
import HomeIcon from '../ui/icons/Home';
import RuleBookIcon from '../ui/icons/RuleBook';
import YourEyeIcon from '../ui/icons/YourEye';
import PhoneBookIcon from '../ui/icons/PhoneBook';
import PaperContainer from '../ui/PaperContainer';
import { BodyReportScope } from 'contexts/BodyReadinessContext';
import { SimProfiler } from '../../sim/perf/SimProfiler';
import TabPane from '../layout/TabPane';
import { useBoundedMountedTabs } from '../../hooks/useBoundedMountedTabs';
import { useMinimize } from '../ui/minimize/MinimizeContext';

export type PlayerTab = 'townSquare' | 'newspaper' | 'ruleBook' | 'eyesOnly' | 'phoneBook';

interface PlayerGamePageProps {
  gameId: string;
  currentUserId: string;
}

const playerTabs: GameTabDefinition<PlayerTab>[] = [
  {
    label: 'Town Square',
    condensedLabel: 'Town Sq',
    value: 'townSquare',
    icon: <TownSquareIcon />,
  },
  { label: 'Newspaper', condensedLabel: 'News', value: 'newspaper', icon: <NewspaperIcon /> },
  {
    label: 'Your Eyes Only',
    condensedLabel: 'Your Eyes Only',
    value: 'eyesOnly',
    icon: <YourEyeIcon />,
  },
  { label: 'Rule Book', condensedLabel: 'Rule Bk', value: 'ruleBook', icon: <RuleBookIcon /> },
  { label: 'Phone Book', condensedLabel: 'Phone Bk', value: 'phoneBook', icon: <PhoneBookIcon /> },
];

const PlayerGamePage = ({ gameId, currentUserId }: PlayerGamePageProps) => {
  const [activeTab, setActiveTab] = useState<PlayerTab>('townSquare');
  // Tabs mount lazily on first visit, then stay mounted so dialog/minimize
  // state survives tab switches — bounded by device memory tier: under
  // pressure the least-recently-active hidden panes are evicted (they
  // re-mount on revisit, same as first visit).
  const scopeIdForTab = useCallback((tab: PlayerTab) => `player-tab-${gameId}-${tab}`, [gameId]);
  const { removeByScope } = useMinimize();
  const onTabEvicted = useCallback(
    (tab: PlayerTab) => removeByScope(scopeIdForTab(tab)),
    [removeByScope, scopeIdForTab]
  );
  const mountedTabs = useBoundedMountedTabs(activeTab, scopeIdForTab, onTabEvicted);

  const handleTabPress = useCallback((tab: PlayerTab) => {
    // Non-urgent update: keeps taps responsive while a heavy cold tab mounts.
    startTransition(() => {
      setActiveTab(tab);
    });
  }, []);

  return (
    <PlayerAccessGate gameId={gameId} currentUserId={currentUserId}>
      {({ currentEmail, matchingPlayer, profile }) => (
        <Column className="gap-5">
          <GameTabBar activeTab={activeTab} onTabPress={handleTabPress} tabs={playerTabs} />
          <SimProfiler id="player-tabs">
          <PaperContainer>
            <View className="w-full min-w-0">
              <TabPane
                active={activeTab === 'townSquare'}
                mounted={mountedTabs.has('townSquare')}
                scopeId={scopeIdForTab('townSquare')}>
                <BodyReportScope enabled={activeTab === 'townSquare'}>
                  <TownSquarePagePLAYER gameId={gameId} currentProfile={profile} />
                </BodyReportScope>
              </TabPane>
              <TabPane
                active={activeTab === 'newspaper'}
                mounted={mountedTabs.has('newspaper')}
                scopeId={scopeIdForTab('newspaper')}>
                <BodyReportScope enabled={activeTab === 'newspaper'}>
                  <DelayedReveal visible={activeTab === 'newspaper'}>
                    <ReadOnlyNewspaperPagePLAYER
                      gameId={gameId}
                      currentEmail={currentEmail}
                      matchingPlayer={matchingPlayer}
                      currentProfile={profile}
                    />
                  </DelayedReveal>
                </BodyReportScope>
              </TabPane>
              <TabPane
                active={activeTab === 'eyesOnly'}
                mounted={mountedTabs.has('eyesOnly')}
                scopeId={scopeIdForTab('eyesOnly')}>
                <BodyReportScope enabled={activeTab === 'eyesOnly'}>
                  <YourEyesOnlyPagePLAYER
                    gameId={gameId}
                    currentEmail={currentEmail}
                    matchingPlayer={matchingPlayer}
                    currentProfile={profile}
                  />
                </BodyReportScope>
              </TabPane>
              <TabPane
                active={activeTab === 'ruleBook'}
                mounted={mountedTabs.has('ruleBook')}
                scopeId={scopeIdForTab('ruleBook')}>
                <BodyReportScope enabled={activeTab === 'ruleBook'}>
                  <RuleBookPagePLAYER gameId={gameId} />
                </BodyReportScope>
              </TabPane>
              <TabPane
                active={activeTab === 'phoneBook'}
                mounted={mountedTabs.has('phoneBook')}
                scopeId={scopeIdForTab('phoneBook')}>
                <BodyReportScope enabled={activeTab === 'phoneBook'}>
                  <PhoneBookPagePLAYER
                    gameId={gameId}
                    currentUserId={currentUserId}
                    currentEmail={currentEmail}
                  />
                </BodyReportScope>
              </TabPane>
            </View>
          </PaperContainer>
          </SimProfiler>
        </Column>
      )}
    </PlayerAccessGate>
  );
};

export default PlayerGamePage;
