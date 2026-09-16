import React from 'react';
import { useValue } from '../../../../hooks/useData';
import { GameSchedule } from '../../../../types/multiplayer';
import {
  getGameScopedKey,
  normalizeGameSchedule,
  defaultGameSchedule,
  formatTimeLabel,
} from '../../../../utils/multiplayer';
import ConfigSectionRow from '../../ui/forms/ConfigSectionRow';
import FontTimeInput from '../../ui/forms/FontTimeInput';
import DayOffsetDropdown from '../../ui/forms/DayOffsetDropdown';
import Column from '../../layout/Column';

interface ActionDeadlineConfigItemProps {
  gameId: string;
}

/**
 * Configuration item for setting the action deadline time.
 * Allows operators to control when players can submit actions until.
 */
const ActionDeadlineConfigItem = ({ gameId }: ActionDeadlineConfigItemProps) => {
  const [gameSchedule, setGameSchedule] = useValue<GameSchedule>(
    getGameScopedKey('gameSchedule', gameId),
    {
      defaultValue: defaultGameSchedule,
      privacy: 'PUBLIC',
    }
  );

  const schedule = normalizeGameSchedule(gameSchedule.value);
  const actionDayOffset = schedule.actionDayOffset ?? 0;
  const offsetLabel =
    actionDayOffset === 0
      ? 'on the final day'
      : actionDayOffset === 1
        ? '1 day before'
        : `${actionDayOffset} days before`;

  return (
    <ConfigSectionRow
      title="Action deadline"
      subtext={`Players can submit actions ${offsetLabel} until ${formatTimeLabel(schedule.actionDeadlineTime ?? defaultGameSchedule.actionDeadlineTime ?? '22:00')}.`}>
      <Column className="w-full min-w-70 max-w-[320px] gap-2">
        <DayOffsetDropdown
          value={actionDayOffset}
          onValueChange={(offset) =>
            setGameSchedule({
              ...schedule,
              actionDayOffset: offset,
            })
          }
          triggerClassName="min-w-70 max-w-[320px]"
        />
        <FontTimeInput
          value={schedule.actionDeadlineTime}
          onChangeText={(value) =>
            setGameSchedule({
              ...schedule,
              actionDeadlineTime: value,
            })
          }
          className="w-full min-w-70 max-w-[320px]"
        />
      </Column>
    </ConfigSectionRow>
  );
};

export default ActionDeadlineConfigItem;
