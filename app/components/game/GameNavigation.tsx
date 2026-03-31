import React from 'react';
import Row from '../layout/Row';
import NavTab from '../layout/NavTab';
import GameUserIcon from '../ui/icons/UserIcon';
import { Newspaper } from 'lucide-react-native';

interface GameNavigationProps {
    onTabPress: (tab: 'players' | 'config' | 'nightly' | 'newspaper') => void;
}

const GameNavigation = ({ onTabPress }: GameNavigationProps) => {
    return (
        <Row gap={0} className='-mb-20'>
            <NavTab text='Players' onPress={() => onTabPress('players')}>
                <GameUserIcon />
            </NavTab>
            <NavTab text='Roles' onPress={() => onTabPress('config')}>
                <GameUserIcon />
            </NavTab>
            <NavTab text='Nightly' onPress={() => onTabPress('nightly')}>
                <GameUserIcon />
            </NavTab>
            <NavTab text='Newspaper' onPress={() => onTabPress('newspaper')}>
                <Newspaper />
            </NavTab>
            <NavTab text='Config'>
                <></>
            </NavTab>
            <NavTab text='Config' isLast={true}>
                <></>
            </NavTab>
        </Row>
    );
};

export default GameNavigation;
