import React, { useState } from 'react';
import { View } from 'react-native';
import Column from '../layout/Column';
import GameTabBar, { GameTabDefinition } from './GameTabBar';
import TownSquarePagePLAYER from './TownSquarePagePLAYER';
import ReadOnlyNewspaperPagePLAYER from './ReadOnlyNewspaperPagePLAYER';
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
  // state survives tab switches.
  const [mountedTabs, setMountedTabs] = useState<ReadonlySet<PlayerTab>>(() => new Set(['townSquare']));

  const handleTabPress = (tab: PlayerTab) => {
    setActiveTab(tab);
    setMountedTabs((prev) => (prev.has(tab) ? prev : new Set(prev).add(tab)));
  };

  return (
    <PlayerAccessGate gameId={gameId} currentUserId={currentUserId}>
      {({ currentEmail, matchingPlayer, profile }) => (
        <Column className="gap-5">
          <GameTabBar activeTab={activeTab} onTabPress={handleTabPress} tabs={playerTabs} />
          <PaperContainer>
            <View className="w-full min-w-0">
              <View
                style={{ display: activeTab === 'townSquare' ? 'flex' : 'none' }}
                className="w-full min-w-0">
              {mountedTabs.has('townSquare') && (
              <BodyReportScope enabled={activeTab === 'townSquare'}>
                <TownSquarePagePLAYER gameId={gameId} currentProfile={profile} />
              </BodyReportScope>
              )}
              </View>
              <View
                style={{ display: activeTab === 'newspaper' ? 'flex' : 'none' }}
                className="w-full min-w-0">
              {mountedTabs.has('newspaper') && (
              <BodyReportScope enabled={activeTab === 'newspaper'}>
                <ReadOnlyNewspaperPagePLAYER
                  gameId={gameId}
                  currentEmail={currentEmail}
                  matchingPlayer={matchingPlayer}
                  currentProfile={profile}
                />
              </BodyReportScope>
              )}
              </View>
              <View
                style={{ display: activeTab === 'eyesOnly' ? 'flex' : 'none' }}
                className="w-full min-w-0">
              {mountedTabs.has('eyesOnly') && (
              <BodyReportScope enabled={activeTab === 'eyesOnly'}>
                <YourEyesOnlyPagePLAYER
                  gameId={gameId}
                  currentEmail={currentEmail}
                  matchingPlayer={matchingPlayer}
                  currentProfile={profile}
                />
              </BodyReportScope>
              )}
              </View>
              <View
                style={{ display: activeTab === 'ruleBook' ? 'flex' : 'none' }}
                className="w-full min-w-0">
              {mountedTabs.has('ruleBook') && (
              <BodyReportScope enabled={activeTab === 'ruleBook'}>
                <RuleBookPagePLAYER gameId={gameId} />
              </BodyReportScope>
              )}
              </View>
              <View
                style={{ display: activeTab === 'phoneBook' ? 'flex' : 'none' }}
                className="w-full min-w-0">
              {mountedTabs.has('phoneBook') && (
              <BodyReportScope enabled={activeTab === 'phoneBook'}>
                <PhoneBookPagePLAYER
                  gameId={gameId}
                  currentUserId={currentUserId}
                  currentEmail={currentEmail}
                />
              </BodyReportScope>
              )}
              </View>
            </View>
          </PaperContainer>
        </Column>
      )}
    </PlayerAccessGate>
  );
};

export default PlayerGamePage;
