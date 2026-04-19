import React from 'react';
import { useUserVariable } from '../../../../hooks/useUserVariable';
import { GameSchedule } from '../../../../types/multiplayer';
import { getGameScopedKey, normalizeGameSchedule, defaultGameSchedule, formatTimeLabel } from '../../../../utils/multiplayer';
import ConfigSectionRow from '../../ui/forms/ConfigSectionRow';
import FontTimeInput from '../../ui/forms/FontTimeInput';

interface ActionDeadlineConfigItemProps {
    gameId: string;
}

/**
 * Configuration item for setting the action deadline time.
 * Allows operators to control when players can submit actions until.
 */
const ActionDeadlineConfigItem = ({ gameId }: ActionDeadlineConfigItemProps) => {
    const [gameSchedule, setGameSchedule] = useUserVariable<GameSchedule>({
        key: getGameScopedKey('gameSchedule', gameId),
        defaultValue: defaultGameSchedule,
        privacy: 'PUBLIC',
    });

    const schedule = normalizeGameSchedule(gameSchedule.value);

    return (
        <ConfigSectionRow
            title='Action deadline'
            subtext={`Players can submit actions until ${formatTimeLabel(schedule.actionDeadlineTime ?? defaultGameSchedule.actionDeadlineTime ?? '22:00')}.`}
        >
            <FontTimeInput
                value={schedule.actionDeadlineTime}
                onChangeText={(value) => setGameSchedule({
                    ...schedule,
                    actionDeadlineTime: value,
                })}
                className='w-full min-w-[280px] max-w-[320px]'
            />
        </ConfigSectionRow>
    );
};

export default ActionDeadlineConfigItem;
