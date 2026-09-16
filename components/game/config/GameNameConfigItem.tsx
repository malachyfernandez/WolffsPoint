import React from 'react';
import { useList, useValue } from '../../../../hooks/useData';
import { GameInfo } from '../../../../types/games';
import ConfigSectionRow from '../../ui/forms/ConfigSectionRow';
import FontTextInput from '../../ui/forms/FontTextInput';

interface GameNameConfigItemProps {
    gameId: string;
}

const GameNameConfigItem = ({ gameId }: GameNameConfigItemProps) => {
    const [gameInfo, setGameInfo] = useList<GameInfo>("games", gameId, {
        defaultValue: { id: gameId, name: 'WolffsPoint', description: '' },
        filterKey: 'id',
        privacy: 'PUBLIC',
    });

    return (
        <ConfigSectionRow
            title='WolffsPoint name'
            subtext='Change the title shown for this WolffsPoint in the game list.'
            showDivider={false}
        >
            <FontTextInput
                value={gameInfo.value?.name ?? ''}
                onChangeText={(value) => setGameInfo({
                    ...gameInfo.value,
                    id: gameInfo.value?.id ?? gameId,
                    name: value,
                    description: gameInfo.value?.description ?? '',
                })}
                placeholder='WolffsPoint'
                variant='styled'
                className='w-full min-w-[280px] max-w-[320px] p-3'
                
            />
        </ConfigSectionRow>
    );
};

export default GameNameConfigItem;
