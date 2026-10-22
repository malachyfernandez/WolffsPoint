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
  const isHourGame = isHourGameSchedule(schedule);
  const actionDayOffset = schedule.actionDayOffset ?? 0;
  const offsetLabel =
    actionDayOffset === 0
      ? 'on the final day'
      : actionDayOffset === 1
        ? '1 day before'
        : `${actionDayOffset} days before`;
  const lead = schedule.actionDeadlineLeadMinutes ?? 0;

  return (
    <ConfigSectionRow
      title="Action deadline"
      subtext={
        isHourGame
          ? lead === 0
            ? 'Actions stay open until the next day starts.'
            : `Actions close ${formatMinutesCompact(lead)} before each day ends.`
          : `${schedule.dayDurationUnit && schedule.dayDurationUnit !== 'days' ? 'Calendar days only. ' : ''}Players can submit actions ${offsetLabel} until ${formatTimeLabel(schedule.actionDeadlineTime ?? defaultGameSchedule.actionDeadlineTime ?? '22:00')}.`
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
                actionDeadlineLeadMinutes: minutes,
              })
            }
          />
        ) : (
          <>
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
              className="min-w-70 w-full max-w-[320px]"
            />
          </>
        )}
      </Column>
    </ConfigSectionRow>
  );
};

export default ActionDeadlineConfigItem;
