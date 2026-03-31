import React from 'react';
import Row from '../layout/Row';
import NavTab from '../layout/NavTab';
import GameUserIcon from '../ui/icons/UserIcon';
import { Newspaper } from 'lucide-react-native';

interface GameNavigationHighlightProps {
    activeTab: 'players' | 'config' | 'nightly' | 'newspaper';
}

const GameNavigationHighlight = ({ activeTab }: GameNavigationHighlightProps) => {
    return (
        <Row gap={0} className='mb-[-10px] z-20' pointerEvents="none">
            <NavTab text='Players' isInvisible={activeTab !== "players"} isHighlighted={true}>
                <GameUserIcon />
            </NavTab>

            <NavTab text='Roles' isInvisible={activeTab !== "config"} isHighlighted={true}>
                <GameUserIcon />
            </NavTab>

            <NavTab text='Nightly' isInvisible={activeTab !== "nightly"} isHighlighted={true}>
                <GameUserIcon />
            </NavTab>

            <NavTab text='Newspaper' isInvisible={activeTab !== "newspaper"} isHighlighted={true}>
                <Newspaper />
            </NavTab>

            <NavTab text='Players' isInvisible={true} isHighlighted={true}>
                <></>
            </NavTab>
            <NavTab text='Players' isInvisible={true} isHighlighted={true} isLast={true}>
                <></>
            </NavTab>
        </Row>
    );
};

export default GameNavigationHighlight;
