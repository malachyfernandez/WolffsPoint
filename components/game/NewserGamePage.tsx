import React, { useState, useCallback, startTransition } from 'react';
import { View } from 'react-native';
import Column from '../layout/Column';
import GameTabBar, { GameTabDefinition } from './GameTabBar';
import TownSquarePagePLAYER from './TownSquarePagePLAYER';
import RuleBookPagePLAYER from './RuleBookPagePLAYER';
import PhoneBookPagePLAYER from './PhoneBookPagePLAYER';
import PaperContainer from '../ui/PaperContainer';
import { BodyReportScope } from 'contexts/BodyReadinessContext';
import { SimProfiler } from '../../sim/perf/SimProfiler';
import ParticipantAccessGate from './ParticipantAccessGate';
import NewspaperPageNEWSER from './NewspaperPageNEWSER';
import TownSquareIcon from '../ui/icons/TownSquare';
import NewspaperIcon from '../ui/icons/Newspaper';
import RuleBookIcon from '../ui/icons/RuleBook';
import PhoneBookIcon from '../ui/icons/PhoneBook';
import TabPane from '../layout/TabPane';
import { useBoundedMountedTabs } from '../../hooks/useBoundedMountedTabs';
import { useMinimize } from '../ui/minimize/MinimizeContext';

interface NewserGamePageProps {
  gameId: string;
  currentUserId: string;
}

type NewserTab = 'townSquare' | 'newspaper' | 'ruleBook' | 'phoneBook';

const newserTabs: GameTabDefinition<NewserTab>[] = [
  {
    label: 'Town Square',
    condensedLabel: 'Town Sq',
    value: 'townSquare',
    icon: <TownSquareIcon />,
  },
  { label: 'Newspaper', condensedLabel: 'News', value: 'newspaper', icon: <NewspaperIcon /> },
  { label: 'Rule Book', condensedLabel: 'Rule Bk', value: 'ruleBook', icon: <RuleBookIcon /> },
  { label: 'Phone Book', condensedLabel: 'Phone Bk', value: 'phoneBook', icon: <PhoneBookIcon /> },
];

const NewserGamePage = ({ gameId, currentUserId }: NewserGamePageProps) => {
  const [activeTab, setActiveTab] = useState<NewserTab>('townSquare');
  // Tabs mount lazily on first visit, then stay mounted so dialog/minimize
  // state survives tab switches — bounded by device memory tier: under
  // pressure the least-recently-active hidden panes are evicted (they
  // re-mount on revisit, same as first visit).
  const scopeIdForTab = useCallback((tab: NewserTab) => `newser-tab-${gameId}-${tab}`, [gameId]);
  const { removeByScope } = useMinimize();
  const onTabEvicted = useCallback(
    (tab: NewserTab) => removeByScope(scopeIdForTab(tab)),
    [removeByScope, scopeIdForTab]
  );
  const mountedTabs = useBoundedMountedTabs(activeTab, scopeIdForTab, onTabEvicted);

  const handleTabPress = useCallback((tab: NewserTab) => {
    // Non-urgent update: keeps taps responsive while a heavy cold tab mounts.
    startTransition(() => {
      setActiveTab(tab);
    });
  }, []);

  return (
    <ParticipantAccessGate gameId={gameId} currentUserId={currentUserId}>
      {({ currentEmail, profile }) => (
        <Column className="w-full gap-4 sm:gap-5">
          <GameTabBar activeTab={activeTab} onTabPress={handleTabPress} tabs={newserTabs} />
          <SimProfiler id="newser-tabs">
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
                  <NewspaperPageNEWSER
                    currentUserId={currentUserId}
                    currentEmail={currentEmail}
                    gameId={gameId}
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
    </ParticipantAccessGate>
  );
};

export default NewserGamePage;
