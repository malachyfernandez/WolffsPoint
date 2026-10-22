export type GameDayUnit = 'days' | 'hours' | 'minutes';

export const MINUTES_PER_UNIT: Record<GameDayUnit, number> = {
  days: 1440,
  hours: 60,
  minutes: 1,
};
export const MAX_GAME_DAY_MINUTES = 30 * 1440;
// Hour games default each day to two hours when no length has been set.
export const DEFAULT_HOUR_GAME_DAY_MINUTES = 120;

export const isGameDayUnit = (value: unknown): value is GameDayUnit =>
  value === 'days' || value === 'hours' || value === 'minutes';

export const durationInDays = (value: number, unit: GameDayUnit): number =>
  (value * MINUTES_PER_UNIT[unit]) / 1440;

export const durationValue = (days: number, unit: GameDayUnit): number =>
  Math.min(
    MAX_GAME_DAY_MINUTES / MINUTES_PER_UNIT[unit],
    Math.max(1, Math.round((days * 1440) / MINUTES_PER_UNIT[unit]))
  );

export const inferGameDayUnit = (days: number): GameDayUnit =>
  days >= 1 && Number.isInteger(days)
    ? 'days'
    : Math.round(days * 1440) % 60 === 0
      ? 'hours'
      : 'minutes';

// Calendar tokens represent dates, not instants. Timed rounds retain an
// explicit duration, including when their start happens to be midnight.
const timedDurations = new WeakMap<Date, number>();
const timedUnits = new WeakMap<Date, GameDayUnit>();

export const timedGameDay = (start: Date, minutes: number, unit?: GameDayUnit): Date => {
  const date = new Date(start);
  timedDurations.set(date, Math.max(1, Math.round(minutes)));
  timedUnits.set(date, unit ?? inferGameDayUnit(minutes / 1440));
  return date;
};

export const isTimedGameDay = (date: Date | undefined): boolean =>
  !!date && timedDurations.has(date);

export const timedGameDayMinutes = (date: Date): number | undefined => timedDurations.get(date);
export const timedGameDayUnit = (date: Date): GameDayUnit | undefined => timedUnits.get(date);

export const timedGameDayEnd = (date: Date): Date =>
  timedGameDay(new Date(date.getTime() + (timedDurations.get(date) ?? 1) * 60_000), 1);

// Hour-game days are instants too, but carry no duration of their own: a day
// runs until the next day's start (or the game's default length for the last
// day). `inherit` marks days whose stored date should follow the previous
// day's date when an earlier day is edited. The stored start is always the
// resolved instant, so parsing stays context-free and timezone-free.
const hourDayInherits = new WeakMap<Date, boolean>();

export const hourGameDay = (start: Date, inheritDate: boolean = false): Date => {
  const date = new Date(start);
  hourDayInherits.set(date, inheritDate);
  return date;
};

export const isHourGameDay = (date: Date | undefined): boolean =>
  !!date && hourDayInherits.has(date);

export const hourGameDayInheritsDate = (date: Date | undefined): boolean =>
  !!date && (hourDayInherits.get(date) ?? false);

/** True for days stored as absolute instants (timed rounds and hour-game
 * days) as opposed to calendar-date tokens. */
export const isInstantGameDay = (date: Date | undefined): boolean =>
  isTimedGameDay(date) || isHourGameDay(date);

export const parseGameDayDate = (stored: string): Date => {
  if (stored.startsWith('{')) {
    try {
      const value = JSON.parse(stored);
      const start = new Date(value.start);
      if (typeof value.start !== 'string' || !Number.isFinite(start.getTime())) {
        return new Date(NaN);
      }
      if (value.hour === true) {
        return hourGameDay(start, value.inherit === true);
      }
      if (
        Number.isFinite(value.durationMinutes) &&
        value.durationMinutes >= 1 &&
        value.durationMinutes <= MAX_GAME_DAY_MINUTES
      ) {
        return timedGameDay(
          start,
          value.durationMinutes,
          isGameDayUnit(value.unit) ? value.unit : undefined
        );
      }
    } catch {
      return new Date(NaN);
    }
    return new Date(NaN);
  }
  const [month, day, year] = stored.split('/').map(Number);
  return new Date(year, month - 1, day);
};

export const serializeGameDayDate = (date: Date): string =>
  isHourGameDay(date)
    ? JSON.stringify({
        start: date.toISOString(),
        hour: true,
        inherit: hourDayInherits.get(date) === true,
      })
    : isTimedGameDay(date)
      ? JSON.stringify({
          start: date.toISOString(),
          durationMinutes: timedDurations.get(date),
          unit: timedUnits.get(date),
        })
      : `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;

export const formatTimedDayRange = (start: Date, end: Date, timeZone?: string): string => {
  const options = { timeZone, hour: 'numeric', minute: '2-digit' } as const;
  const time = (date: Date) => date.toLocaleTimeString('en-US', options);
  const day = (date: Date) =>
    date.toLocaleDateString('en-US', { timeZone, month: 'numeric', day: 'numeric' });
  return day(start) === day(end)
    ? `${day(start)} ${time(start)} - ${time(end)}`
    : `${day(start)} ${time(start)} - ${day(end)} ${time(end)}`;
};
