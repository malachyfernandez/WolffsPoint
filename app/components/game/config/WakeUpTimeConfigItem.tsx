import React from 'react';
import { useValue } from '../../../../hooks/useData';
import { GameSchedule } from '../../../../types/multiplayer';
import { getGameScopedKey, normalizeGameSchedule, defaultGameSchedule, formatTimeLabel } from '../../../../utils/multiplayer';
import ConfigSectionRow from '../../ui/forms/ConfigSectionRow';
import FontTimeInput from '../../ui/forms/FontTimeInput';

interface WakeUpTimeConfigItemProps {
    gameId: string;
}

/**
 * Configuration item for setting the wake up time.
 * Controls when morning messages and the newspaper unlock for players.
 */
const WakeUpTimeConfigItem = ({ gameId }: WakeUpTimeConfigItemProps) => {
    const [gameSchedule, setGameSchedule] = useValue<GameSchedule>(getGameScopedKey('gameSchedule', gameId), {
        defaultValue: defaultGameSchedule,
        privacy: 'PUBLIC',
    });

    const schedule = normalizeGameSchedule(gameSchedule.value);

    return (
        <ConfigSectionRow
            title='Wake up time'
            subtext={`Morning messages and the newspaper unlock at ${formatTimeLabel(schedule.wakeUpTime)}.`}
        >
            <FontTimeInput
                value={schedule.wakeUpTime}
                onChangeText={(value) => setGameSchedule({
                    ...schedule,
                    wakeUpTime: value,
                    nightlyResponseReleaseTime: value,
                    newspaperReleaseTime: value,
                })}
                className='w-full min-w-[280px] max-w-[320px]'
            />
        </ConfigSectionRow>
    );
};

export default WakeUpTimeConfigItem;
