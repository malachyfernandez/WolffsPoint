import React from 'react';
import Row from '../layout/Row';
import NavTab from '../layout/NavTab';
import MiddleNavTab from '../layout/MiddleNavTab';
import SvgGroup2 from '../icons/Group2';
import { View, Text, TouchableOpacity, useWindowDimensions } from 'react-native';
import FadeInAfterDelay from '../ui/loading/FadeInAfterDelay';

export type GameTabDefinition<TTab extends string> = {
    label: string;
    condensedLabel: string;
    value: TTab;
    icon: React.ReactNode;
};

interface GameTabBarProps<TTab extends string> {
    activeTab: TTab;
    onTabPress: (tab: TTab) => void;
    tabs: GameTabDefinition<TTab>[];
    iconSize?: number;
    iconStrokeWidth?: number;
    gameId?: string;
}

const SvgTabContainer = ({ text, isHighlighted, onPress }: { text: string; isHighlighted: boolean; onPress: () => void }) => {
    return (
        <TouchableOpacity onPress={onPress} className="flex-1">
            <View className="relative justify-center items-center">
                <SvgGroup2
                    width={154}
                    height={60}
                    style={{
                        opacity: isHighlighted ? 1 : 0.7,

                    }}
                />
                <Text className="absolute text-xs font-medium text-accent">
                    {text}
                </Text>
            </View>
        </TouchableOpacity>
    );
};

const GameTabBar = <TTab extends string>({ activeTab, onTabPress, tabs, iconSize = 26, iconStrokeWidth = 0 }: GameTabBarProps<TTab>) => {
    const { width } = useWindowDimensions();
    const hasTrueMiddle = tabs.length % 2 === 1;
    const centerIndex = Math.floor(tabs.length / 2);
    const useCondensed = width < 650; // Switch to condensed text on narrow screens

    return (
        <FadeInAfterDelay delayMs={200}>
            <Row className='gap-1 px-4'>
                {tabs.map((tab, index) => (
                    (hasTrueMiddle && index === centerIndex) ? (
                        // <SvgTabContainer
                        //     key={tab.value}
                        //     text={tab.label}
                        //     isHighlighted={activeTab === tab.value}
                        //     onPress={() => onTabPress(tab.value)}
                        // />
                        <MiddleNavTab
                            key={tab.value}
                            text={useCondensed ? tab.condensedLabel : tab.label}
                            isHighlighted={activeTab === tab.value}
                            isLast={index === tabs.length - 1}
                            onPress={() => onTabPress(tab.value)}
                        >
                            {tab.icon}
                        </MiddleNavTab>
                    ) : (
                        <NavTab
                            key={tab.value}
                            text={useCondensed ? tab.condensedLabel : tab.label}
                            isHighlighted={activeTab === tab.value}
                            isLast={index === tabs.length - 1}
                            onPress={() => onTabPress(tab.value)}
                        >
                            {tab.icon}
                        </NavTab>
                    )
                ))}
            </Row>
        </FadeInAfterDelay>
    );
};

export default GameTabBar;
