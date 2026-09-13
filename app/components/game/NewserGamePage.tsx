import React, { useState } from 'react';
import { View } from 'react-native';
import Column from '../layout/Column';
import GameTabBar, { GameTabDefinition } from './GameTabBar';
import TownSquarePagePLAYER from './TownSquarePagePLAYER';
import RuleBookPagePLAYER from './RuleBookPagePLAYER';
import PhoneBookPagePLAYER from './PhoneBookPagePLAYER';
import PaperContainer from '../ui/PaperContainer';
import { BodyReportScope } from '../../../contexts/BodyReadinessContext';
import ParticipantAccessGate from './ParticipantAccessGate';
import NewspaperPageNEWSER from './NewspaperPageNEWSER';
import TownSquareIcon from '../ui/icons/TownSquare';
import NewspaperIcon from '../ui/icons/Newspaper';
import RuleBookIcon from '../ui/icons/RuleBook';
import PhoneBookIcon from '../ui/icons/PhoneBook';

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

  return (
    <ParticipantAccessGate gameId={gameId} currentUserId={currentUserId}>
      {({ currentEmail, profile }) => (
        <Column className="w-full gap-4 sm:gap-5">
          <GameTabBar activeTab={activeTab} onTabPress={setActiveTab} tabs={newserTabs} />
          <PaperContainer>
            <View className="w-full min-w-0">
              <View
                style={{ display: activeTab === 'townSquare' ? 'flex' : 'none' }}
                className="w-full min-w-0">
              <BodyReportScope enabled={activeTab === 'townSquare'}>
                <TownSquarePagePLAYER gameId={gameId} currentProfile={profile} />
              </BodyReportScope>
              </View>
              <View
                style={{ display: activeTab === 'newspaper' ? 'flex' : 'none' }}
                className="w-full min-w-0">
              <BodyReportScope enabled={activeTab === 'newspaper'}>
                <NewspaperPageNEWSER
                  currentUserId={currentUserId}
                  currentEmail={currentEmail}
                  gameId={gameId}
                />
              </BodyReportScope>
              </View>
              <View
                style={{ display: activeTab === 'ruleBook' ? 'flex' : 'none' }}
                className="w-full min-w-0">
              <BodyReportScope enabled={activeTab === 'ruleBook'}>
                <RuleBookPagePLAYER gameId={gameId} />
              </BodyReportScope>
              </View>
              <View
                style={{ display: activeTab === 'phoneBook' ? 'flex' : 'none' }}
                className="w-full min-w-0">
              <BodyReportScope enabled={activeTab === 'phoneBook'}>
                <PhoneBookPagePLAYER
                  gameId={gameId}
                  currentUserId={currentUserId}
                  currentEmail={currentEmail}
                />
              </BodyReportScope>
              </View>
            </View>
          </PaperContainer>
        </Column>
      )}
    </ParticipantAccessGate>
  );
};

export default NewserGamePage;
