import React, { useState } from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
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

export type PlayerTab = 'townSquare' | 'newspaper' | 'ruleBook' | 'eyesOnly' | 'phoneBook';

interface PlayerGamePageProps {
    gameId: string;
    currentUserId: string;
}

const playerTabs: GameTabDefinition<PlayerTab>[] = [
    { label: 'Town Square', condensedLabel: 'Town Sq', value: 'townSquare', icon: <TownSquareIcon /> },
    { label: 'Newspaper', condensedLabel: 'News', value: 'newspaper', icon: <NewspaperIcon /> },
    { label: 'Your Eyes Only', condensedLabel: 'Your Eyes Only', value: 'eyesOnly', icon: <YourEyeIcon /> },
    { label: 'Rule Book', condensedLabel: 'Rule Bk', value: 'ruleBook', icon: <RuleBookIcon /> },
    { label: 'Phone Book', condensedLabel: 'Phone Bk', value: 'phoneBook', icon: <PhoneBookIcon /> },
];

const PlayerGamePage = ({ gameId, currentUserId }: PlayerGamePageProps) => {
    const [activeTab, setActiveTab] = useState<PlayerTab>('townSquare');

    return (
        <PlayerAccessGate gameId={gameId} currentUserId={currentUserId}>
            {({ currentEmail, matchingPlayer, profile }) => (
                <Column className='gap-5'>
                    <GameTabBar activeTab={activeTab} onTabPress={setActiveTab} tabs={playerTabs} />
                    <PaperContainer>
                        <Animated.View key={activeTab} entering={FadeIn.duration(300)} className='w-full min-w-0'>
                            {activeTab === 'townSquare' && <TownSquarePagePLAYER gameId={gameId} currentProfile={profile} />}
                            {activeTab === 'newspaper' &&
                                <ReadOnlyNewspaperPagePLAYER
                                    gameId={gameId}
                                    currentEmail={currentEmail}
                                    matchingPlayer={matchingPlayer}
                                    currentProfile={profile}
                                />}
                            {activeTab === 'ruleBook' && <RuleBookPagePLAYER gameId={gameId} />}
                            {activeTab === 'eyesOnly' && (
                                <YourEyesOnlyPagePLAYER
                                    gameId={gameId}
                                    currentEmail={currentEmail}
                                    matchingPlayer={matchingPlayer}
                                    currentProfile={profile}
                                />
                            )}
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
        </PlayerAccessGate>
    );
};

export default PlayerGamePage;
