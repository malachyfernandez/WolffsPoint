import React from 'react';
import { useList, useValue } from 'hooks/useData';
import ConfigSectionRow from '../../ui/forms/ConfigSectionRow';
import FontNumberInput from '../../ui/forms/FontNumberInput';
import RelativeTimeInput from '../../ui/forms/RelativeTimeInput';
import FontText from '../../ui/text/FontText';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import {
  defaultGameSchedule,
  getGameScopedKey,
  isHourGameSchedule,
  normalizeGameSchedule,
} from '../../../utils/multiplayer';
import {
  DEFAULT_HOUR_GAME_DAY_MINUTES,
  durationValue,
  inferGameDayUnit,
  MAX_GAME_DAY_MINUTES,
} from '../../../utils/gameDayDuration';
import type { GameSchedule } from '../../../types/multiplayer';

interface DaysPerGameDayConfigItemProps {
  gameId: string;
}

/**
 * Configuration item for setting days per game day.
 * Controls how many real-world days each in-game day spans by default.
 */
const DaysPerGameDayConfigItem = ({ gameId }: DaysPerGameDayConfigItemProps) => {
  const [duration, setDuration] = useList<number>('numberOfRealDaysPerInGameDay', gameId);
  const [scheduleRecord] = useValue<GameSchedule>(getGameScopedKey('gameSchedule', gameId), {
    privacy: 'PUBLIC',
    defaultValue: defaultGameSchedule,
  });
  const schedule = normalizeGameSchedule(scheduleRecord.value);
  const unit = schedule.dayDurationUnit ?? inferGameDayUnit(duration.value);
  const isHourGame = isHourGameSchedule(schedule);
  const isTimedGame = !isHourGame && unit !== 'days';
  const durationMinutes =
    Number.isFinite(duration.value) && duration.value > 0
      ? Math.max(1, Math.round(duration.value * 1440))
      : DEFAULT_HOUR_GAME_DAY_MINUTES;

  return (
    <ConfigSectionRow
      title="Game day length"
      subtext={
        isHourGame
          ? 'Default length for new game days. A day ends when the next one starts.'
          : isTimedGame
            ? 'Default length for new game days.'
            : 'How many calendar days each game day spans.'
      }
      showDivider={true}>
      <Column className="w-full max-w-[340px] gap-1">
        {isHourGame || isTimedGame ? (
          <RelativeTimeInput
            valueMinutes={durationMinutes}
            minMinutes={1}
            disabled={duration.state.isSyncing || scheduleRecord.state.isSyncing}
            onChangeMinutes={(minutes) => setDuration(minutes / 1440)}
          />
        ) : (
          <Row className="items-center gap-2">
            <FontNumberInput
              accessibilityLabel="Game day length in days"
              value={durationValue(duration.value, 'days')}
              editable={!(duration.state.isSyncing || scheduleRecord.state.isSyncing)}
              onChangeText={(_text, valid, numeric) => {
                if (valid && numeric !== null) setDuration(numeric);
              }}
              minValue={1}
              maxValue={Math.floor(MAX_GAME_DAY_MINUTES / 1440)}
              inline
              useDefaultStyling
              hideHelperText
              className="border-border/15 bg-text/5 min-w-16"
            />
            <FontText weight="medium" className="opacity-60">
              days
            </FontText>
          </Row>
        )}
        <FontText variant="subtext" className="text-xs">
          {isHourGame
            ? 'Used when the last day has no next day to end on.'
            : isTimedGame
              ? 'Voting/actions close and morning messages unlock at the end of a timed round.'
              : 'Calendar days use the deadline and wake-up times below.'}
          {isHourGame
            ? ' Existing day starts are not moved.'
            : ' Existing start dates are not moved.'}
        </FontText>
      </Column>
    </ConfigSectionRow>
  );
};

export default DaysPerGameDayConfigItem;
