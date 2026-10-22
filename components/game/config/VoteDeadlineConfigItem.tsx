import React from 'react';
import { useValue } from 'hooks/useData';
import { GameSchedule } from 'types/multiplayer';
import {
  getGameScopedKey,
  isHourGameSchedule,
  normalizeGameSchedule,
  defaultGameSchedule,
  formatMinutesCompact,
  formatTimeLabel,
} from 'utils/multiplayer';
import ConfigSectionRow from '../../ui/forms/ConfigSectionRow';
import FontTimeInput from '../../ui/forms/FontTimeInput';
import RelativeTimeInput from '../../ui/forms/RelativeTimeInput';
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
  const isHourGame = isHourGameSchedule(schedule);
  const voteDayOffset = schedule.voteDayOffset ?? 0;
  const offsetLabel =
    voteDayOffset === 0
      ? 'on the final day'
      : voteDayOffset === 1
        ? '1 day before'
        : `${voteDayOffset} days before`;
  const lead = schedule.voteDeadlineLeadMinutes ?? 0;

  return (
    <ConfigSectionRow
      title="Vote deadline"
      subtext={
        isHourGame
          ? lead === 0
            ? 'Votes stay open until the next day starts.'
            : `Votes close ${formatMinutesCompact(lead)} before each day ends.`
          : `${schedule.dayDurationUnit && schedule.dayDurationUnit !== 'days' ? 'Calendar days only. ' : ''}Players can submit votes ${offsetLabel} until ${formatTimeLabel(schedule.voteDeadlineTime ?? defaultGameSchedule.voteDeadlineTime ?? '22:00')}.`
      }>
      <Column className="min-w-70 w-full max-w-[320px] gap-2">
        {isHourGame ? (
          <RelativeTimeInput
            valueMinutes={lead}
            minMinutes={0}
            disabled={gameSchedule.state.isSyncing}
            onChangeMinutes={(minutes) =>
              setGameSchedule({
                ...schedule,
                voteDeadlineLeadMinutes: minutes,
              })
            }
          />
        ) : (
          <>
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
              className="min-w-70 w-full max-w-[320px]"
            />
          </>
        )}
      </Column>
    </ConfigSectionRow>
  );
};

export default VoteDeadlineConfigItem;
