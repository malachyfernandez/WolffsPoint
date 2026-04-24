import React from 'react';
import { useValue } from '../../../../hooks/useData';
import { GameSchedule } from '../../../../types/multiplayer';
import { getGameScopedKey, normalizeGameSchedule, defaultGameSchedule, formatTimeLabel } from '../../../../utils/multiplayer';
import ConfigSectionRow from '../../ui/forms/ConfigSectionRow';
import FontTimeInput from '../../ui/forms/FontTimeInput';

interface VoteDeadlineConfigItemProps {
    gameId: string;
}

/**
 * Configuration item for setting the vote deadline time.
 * Allows operators to control when players can submit votes until.
 */
const VoteDeadlineConfigItem = ({ gameId }: VoteDeadlineConfigItemProps) => {
    const [gameSchedule, setGameSchedule] = useValue<GameSchedule>(getGameScopedKey('gameSchedule', gameId), {
        defaultValue: defaultGameSchedule,
        privacy: 'PUBLIC',
    });

    const schedule = normalizeGameSchedule(gameSchedule.value);

    return (
        <ConfigSectionRow
            title='Vote deadline'
            subtext={`Players can submit votes until ${formatTimeLabel(schedule.voteDeadlineTime ?? defaultGameSchedule.voteDeadlineTime ?? '22:00')}.`}
        >
            <FontTimeInput
                value={schedule.voteDeadlineTime}
                onChangeText={(value) => setGameSchedule({
                    ...schedule,
                    voteDeadlineTime: value,
                })}
                className='w-full min-w-[280px] max-w-[320px]'
            />
        </ConfigSectionRow>
    );
};

export default VoteDeadlineConfigItem;
