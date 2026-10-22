import React from 'react';
import Row from '../../layout/Row';
import Column from '../../layout/Column';
import FontText from '../text/FontText';
import FontNumberInput from './FontNumberInput';
import { MAX_GAME_DAY_MINUTES } from '../../../utils/gameDayDuration';
import { formatMinutesCompact } from '../../../utils/multiplayer';

interface RelativeTimeInputProps {
  /** Total duration in minutes. */
  valueMinutes: number;
  onChangeMinutes: (minutes: number) => void;
  /** Smallest allowed duration; 0 for leads/offsets, 1 for day lengths. */
  minMinutes?: number;
  maxMinutes?: number;
  disabled?: boolean;
  className?: string;
}

/**
 * A single relative-duration control: "2 hours 30 minutes". Used in hour
 * games where deadlines, wake-up and day length are all durations rather
 * than clock times or calendar days.
 */
const RelativeTimeInput = ({
  valueMinutes,
  onChangeMinutes,
  minMinutes = 0,
  maxMinutes = MAX_GAME_DAY_MINUTES,
  disabled = false,
  className = '',
}: RelativeTimeInputProps) => {
  const total = Math.max(minMinutes, Math.min(maxMinutes, Math.round(valueMinutes)));
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  const maxHours = Math.floor(maxMinutes / 60);

  const update = (nextHours: number, nextMinutes: number) => {
    const next = Math.max(minMinutes, Math.min(maxMinutes, nextHours * 60 + nextMinutes));
    onChangeMinutes(next);
  };

  return (
    <Column className={`gap-1 ${className ?? ''}`.trim()}>
      <Row className="flex-wrap items-center gap-2">
        <FontNumberInput
          accessibilityLabel="Hours"
          value={hours}
          minValue={0}
          maxValue={maxHours}
          editable={!disabled}
          inline
          useDefaultStyling
          hideHelperText
          className="border-border/15 bg-text/5 min-w-16"
          onChangeText={(_text, valid, numeric) => {
            if (valid && numeric !== null) update(numeric, minutes);
          }}
        />
        <FontText weight="medium" className="opacity-60">
          hours
        </FontText>
        <FontNumberInput
          accessibilityLabel="Minutes"
          value={minutes}
          minValue={0}
          maxValue={59}
          editable={!disabled}
          inline
          useDefaultStyling
          hideHelperText
          className="border-border/15 bg-text/5 min-w-16"
          onChangeText={(_text, valid, numeric) => {
            if (valid && numeric !== null) update(hours, numeric);
          }}
        />
        <FontText weight="medium" className="opacity-60">
          minutes
        </FontText>
      </Row>
      <FontText variant="subtext" className="text-xs">
        {formatMinutesCompact(total)} total
      </FontText>
    </Column>
  );
};

export default RelativeTimeInput;
