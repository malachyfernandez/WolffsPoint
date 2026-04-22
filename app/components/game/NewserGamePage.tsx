import React, { useState } from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
import Column from '../layout/Column';
import GameTabBar, { GameTabDefinition } from './GameTabBar';
import TownSquarePagePLAYER from './TownSquarePagePLAYER';
import RuleBookPagePLAYER from './RuleBookPagePLAYER';
import PhoneBookPagePLAYER from './PhoneBookPagePLAYER';
import PaperContainer from '../ui/PaperContainer';
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
    { label: 'Town Square', condensedLabel: 'Town Sq', value: 'townSquare', icon: <TownSquareIcon /> },
    { label: 'Newspaper', condensedLabel: 'News', value: 'newspaper', icon: <NewspaperIcon /> },
    { label: 'Rule Book', condensedLabel: 'Rule Bk', value: 'ruleBook', icon: <RuleBookIcon /> },
    { label: 'Phone Book', condensedLabel: 'Phone Bk', value: 'phoneBook', icon: <PhoneBookIcon /> },
];

const NewserGamePage = ({ gameId, currentUserId }: NewserGamePageProps) => {
    const [activeTab, setActiveTab] = useState<NewserTab>('townSquare');

    return (
        <ParticipantAccessGate gameId={gameId} currentUserId={currentUserId}>
            {({ currentEmail, profile }) => (
                <Column className='gap-4 w-full sm:gap-5'>
                    <GameTabBar activeTab={activeTab} onTabPress={setActiveTab} tabs={newserTabs} />
                    <PaperContainer>
                        <Animated.View key={activeTab} entering={FadeIn.duration(300)} className='w-full min-w-0'>
                            {activeTab === 'townSquare' && <TownSquarePagePLAYER gameId={gameId} currentProfile={profile} />}
                            {activeTab === 'newspaper' && <NewspaperPageNEWSER currentUserId={currentUserId} gameId={gameId} />}
                            {activeTab === 'ruleBook' && <RuleBookPagePLAYER gameId={gameId} />}
                            {activeTab === 'phoneBook' && (
                                <PhoneBookPagePLAYER
                                    gameId={gameId}
                                    currentUserId={currentUserId}
                                    currentEmail={currentEmail}
                                />
                            )}
                        </Animated.View>
                    </PaperContainer>
                </Column>
            )}
        </ParticipantAccessGate>
    );
};

export default NewserGamePage;
