import React from 'react';
import Row from '../layout/Row';
import NavTab from '../layout/NavTab';
import MiddleNavTab from '../layout/MiddleNavTab';
import SvgGroup2 from '../icons/Group2';
import { View, Text, TouchableOpacity } from 'react-native';
import { useContentWidth } from 'hooks/useContentWidth';

export type GameTabDefinition<TTab extends string> = {
  label: string;
  condensedLabel: string;
  value: TTab;
  icon: React.ReactNode;
  disabled?: boolean;
};

interface GameTabBarProps<TTab extends string> {
  activeTab: TTab;
  onTabPress: (tab: TTab) => void;
  tabs: GameTabDefinition<TTab>[];
  iconSize?: number;
  iconStrokeWidth?: number;
}

const SvgTabContainer = ({
  text,
  isHighlighted,
  onPress,
}: {
  text: string;
  isHighlighted: boolean;
  onPress: () => void;
}) => {
  return (
    <TouchableOpacity onPress={onPress} className="flex-1">
      <View className="relative items-center justify-center">
        <SvgGroup2
          width={154}
          height={60}
          style={{
            opacity: isHighlighted ? 1 : 0.7,
          }}
        />
        <Text className="text-accent absolute text-xs font-medium">{text}</Text>
      </View>
    </TouchableOpacity>
  );
};

const GameTabBar = <TTab extends string>({
  activeTab,
  onTabPress,
  tabs,
  iconSize = 26,
  iconStrokeWidth = 0,
}: GameTabBarProps<TTab>) => {
  const width = useContentWidth();
  const hasTrueMiddle = tabs.length % 2 === 1;
  const centerIndex = Math.floor(tabs.length / 2);
  const useCondensed = width < 650; // Switch to condensed text on narrow screens

  return (
    <Row className="gap-1 px-4">
      {tabs.map((tab, index) =>
        hasTrueMiddle && index === centerIndex ? (
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
            disabled={tab.disabled}
            onPress={() => onTabPress(tab.value)}>
            {tab.icon}
          </MiddleNavTab>
        ) : (
          <NavTab
            key={tab.value}
            text={useCondensed ? tab.condensedLabel : tab.label}
            isHighlighted={activeTab === tab.value}
            isLast={index === tabs.length - 1}
            disabled={tab.disabled}
            onPress={() => onTabPress(tab.value)}>
            {tab.icon}
          </NavTab>
        )
      )}
    </Row>
  );
};

export default GameTabBar;
