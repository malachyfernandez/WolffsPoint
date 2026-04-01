import React from 'react';
import Row from '../layout/Row';
import NavTab from '../layout/NavTab';

export type GameTabDefinition<TTab extends string> = {
    label: string;
    value: TTab;
    icon: React.ReactNode;
};

interface GameTabBarProps<TTab extends string> {
    activeTab: TTab;
    onTabPress: (tab: TTab) => void;
    tabs: GameTabDefinition<TTab>[];
}

const GameTabBar = <TTab extends string>({ activeTab, onTabPress, tabs }: GameTabBarProps<TTab>) => {
    return (
        <Row gap={0} className='mb-4'>
            {tabs.map((tab, index) => (
                <NavTab
                    key={tab.value}
                    text={tab.label}
                    isHighlighted={activeTab === tab.value}
                    isLast={index === tabs.length - 1}
                    onPress={() => onTabPress(tab.value)}
                >
                    {tab.icon}
                </NavTab>
            ))}
        </Row>
    );
};

export default GameTabBar;
