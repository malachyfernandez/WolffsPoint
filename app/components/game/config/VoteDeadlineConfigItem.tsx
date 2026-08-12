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

interface VoteDeadlineConfigItemProps {
  gameId: string;
}

/**
 * Configuration item for setting the vote deadline time.
 * Allows operators to control when players can submit votes until.
 */
const VoteDeadlineConfigItem = ({ gameId }: VoteDeadlineConfigItemProps) => {
  const [gameSchedule, setGameSchedule] = useValue<GameSchedule>(
    getGameScopedKey('gameSchedule', gameId),
    {
      defaultValue: defaultGameSchedule,
      privacy: 'PUBLIC',
    }
  );

  const schedule = normalizeGameSchedule(gameSchedule.value);
  const voteDayOffset = schedule.voteDayOffset ?? 0;
  const offsetLabel =
    voteDayOffset === 0
      ? 'on the final day'
      : voteDayOffset === 1
        ? '1 day before'
        : `${voteDayOffset} days before`;

  return (
    <ConfigSectionRow
      title="Vote deadline"
      subtext={`Players can submit votes ${offsetLabel} until ${formatTimeLabel(schedule.voteDeadlineTime ?? defaultGameSchedule.voteDeadlineTime ?? '22:00')}.`}>
      <Column className="w-full min-w-70 max-w-[320px] gap-2">
        <DayOffsetDropdown
          value={voteDayOffset}
          onValueChange={(offset) =>
            setGameSchedule({
              ...schedule,
              voteDayOffset: offset,
            })
          }
          triggerClassName="min-w-70 max-w-[320px]"
        />
        <FontTimeInput
          value={schedule.voteDeadlineTime}
          onChangeText={(value) =>
            setGameSchedule({
              ...schedule,
              voteDeadlineTime: value,
            })
          }
          className="w-full min-w-70 max-w-[320px]"
        />
      </Column>
    </ConfigSectionRow>
  );
};

export default VoteDeadlineConfigItem;
