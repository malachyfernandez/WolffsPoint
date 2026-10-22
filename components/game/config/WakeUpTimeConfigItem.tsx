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

interface WakeUpTimeConfigItemProps {
  gameId: string;
}

/**
 * Configuration item for setting the wake up time.
 * Controls when morning messages and the newspaper unlock for players.
 */
const WakeUpTimeConfigItem = ({ gameId }: WakeUpTimeConfigItemProps) => {
  const [gameSchedule, setGameSchedule] = useValue<GameSchedule>(
    getGameScopedKey('gameSchedule', gameId),
    {
      defaultValue: defaultGameSchedule,
      privacy: 'PUBLIC',
    }
  );

  const schedule = normalizeGameSchedule(gameSchedule.value);
  const isHourGame = isHourGameSchedule(schedule);
  const offset = schedule.wakeUpOffsetMinutes ?? 0;

  return (
    <ConfigSectionRow
      title="Wake up time"
      subtext={
        isHourGame
          ? offset === 0
            ? 'Morning messages and the newspaper unlock as soon as each day starts.'
            : `Morning messages and the newspaper unlock ${formatMinutesCompact(offset)} after each day starts.`
          : `${schedule.dayDurationUnit && schedule.dayDurationUnit !== 'days' ? 'Calendar days only. ' : ''}Morning messages and the newspaper unlock at ${formatTimeLabel(schedule.wakeUpTime)}.`
      }>
      {isHourGame ? (
        <RelativeTimeInput
          valueMinutes={offset}
          minMinutes={0}
          disabled={gameSchedule.state.isSyncing}
          onChangeMinutes={(minutes) =>
            setGameSchedule({
              ...schedule,
              wakeUpOffsetMinutes: minutes,
            })
          }
          className="w-full min-w-[280px] max-w-[320px]"
        />
      ) : (
        <FontTimeInput
          value={schedule.wakeUpTime}
          onChangeText={(value) =>
            setGameSchedule({
              ...schedule,
              wakeUpTime: value,
              nightlyResponseReleaseTime: value,
              newspaperReleaseTime: value,
            })
          }
          className="w-full min-w-[280px] max-w-[320px]"
        />
      )}
    </ConfigSectionRow>
  );
};

export default WakeUpTimeConfigItem;
