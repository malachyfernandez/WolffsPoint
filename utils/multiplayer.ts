import {
  GameSchedule,
  MarkdownInputState,
  PlayerActionValue,
  VoteValue,
} from '../types/multiplayer';
import {
  getDateTokenDayValue,
  getDeviceTimeZone,
  getZonedDayValue,
  getZonedParts,
  getZonedDayToken,
  isValidTimeZone,
  zonedWallTimeOnInstantDayMs,
  zonedWallTimeToInstantMs,
} from './timezone';
import { nowDate, nowMs } from './simNow';
import {
  isGameDayUnit,
  isTimedGameDay,
  isHourGameDay,
  isInstantGameDay,
  hourGameDay,
  hourGameDayInheritsDate,
  parseGameDayDate,
  serializeGameDayDate,
  timedGameDay,
  timedGameDayEnd,
  DEFAULT_HOUR_GAME_DAY_MINUTES,
} from './gameDayDuration';

const DEFAULT_SCHEDULE: GameSchedule = {
  nightlyDeadlineTime: '22:00',
  actionDeadlineTime: '22:00',
  voteDeadlineTime: '22:00',
  wakeUpTime: '08:00',
  nightlyResponseReleaseTime: '08:00',
  newspaperReleaseTime: '08:00',
};

export const defaultGameSchedule = DEFAULT_SCHEDULE;

export const getWakeUpTime = (schedule: GameSchedule) => {
  return (
    schedule.wakeUpTime ||
    schedule.newspaperReleaseTime ||
    schedule.nightlyResponseReleaseTime ||
    defaultGameSchedule.wakeUpTime
  );
};

export const normalizeGameSchedule = (schedule?: Partial<GameSchedule> | null): GameSchedule => {
  const fallbackDeadlineTime =
    schedule?.actionDeadlineTime ||
    schedule?.voteDeadlineTime ||
    schedule?.nightlyDeadlineTime ||
    defaultGameSchedule.nightlyDeadlineTime;
  const actionDeadlineTime = schedule?.actionDeadlineTime || fallbackDeadlineTime;
  const voteDeadlineTime = schedule?.voteDeadlineTime || fallbackDeadlineTime;
  const wakeUpTime =
    schedule?.wakeUpTime ||
    schedule?.newspaperReleaseTime ||
    schedule?.nightlyResponseReleaseTime ||
    defaultGameSchedule.wakeUpTime;
  const actionDayOffset = schedule?.actionDayOffset ?? 0;
  const voteDayOffset = schedule?.voteDayOffset ?? 0;
  const publicVoting = schedule?.publicVoting ?? false;
  const timezone = schedule?.timezone;

  return {
    nightlyDeadlineTime: fallbackDeadlineTime,
    actionDeadlineTime,
    voteDeadlineTime,
    wakeUpTime,
    nightlyResponseReleaseTime: wakeUpTime,
    newspaperReleaseTime: wakeUpTime,
    actionDayOffset,
    voteDayOffset,
    publicVoting,
    timezone,
    dayMode: schedule?.dayMode === 'hour' ? 'hour' : undefined,
    dayDurationUnit: isGameDayUnit(schedule?.dayDurationUnit)
      ? schedule.dayDurationUnit
      : undefined,
    actionDeadlineLeadMinutes: schedule?.actionDeadlineLeadMinutes ?? undefined,
    voteDeadlineLeadMinutes: schedule?.voteDeadlineLeadMinutes ?? undefined,
    wakeUpOffsetMinutes: schedule?.wakeUpOffsetMinutes ?? undefined,
  };
};

/** True for hour games: each day is a clock-time start that runs until the
 * next day begins; deadlines/wake-up are relative to the day's span. */
export const isHourGameSchedule = (schedule?: Partial<GameSchedule> | null): boolean =>
  schedule?.dayMode === 'hour';

/** The zone all game timing uses. Every game shares one zone, set by the
 * operator (the config item seeds it from the operator's device on first
 * open). Schedules that predate the timezone field fall back to the device
 * zone, which produces identical results to the legacy device-local paths. */
export const resolveGameTimeZone = (schedule?: Partial<GameSchedule> | null): string => {
  const tz = schedule?.timezone;
  return tz && isValidTimeZone(tz) ? tz : getDeviceTimeZone();
};

export const getGameScopedKey = (baseKey: string, gameId: string) => {
  return `${baseKey}-${gameId}`;
};

export const createClientId = (prefix: string) => {
  return `${prefix}-${nowMs()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const parseStoredDayDates = (dayDates: string[]) => {
  return dayDates.map(parseGameDayDate);
};

export const formatTimeLabel = (time24: string) => {
  const [hoursString, minutesString] = time24.split(':');
  const hours = Number(hoursString || '0');
  const minutes = Number(minutesString || '0');
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const normalizedHours = hours % 12 || 12;
  const normalizedMinutes = `${minutes}`.padStart(2, '0');
  return `${normalizedHours}:${normalizedMinutes} ${suffix}`;
};

export const getGameDayTime24 = (
  date: Date | undefined,
  calendarTime: string,
  timeZone?: string
): string => {
  if (!date || !isInstantGameDay(date)) return calendarTime;
  const parts = getZonedParts(date.getTime(), timeZone ?? getDeviceTimeZone());
  return `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`;
};

/** "5:30 PM"-style label for a real instant in the game zone. */
export const formatInstantTimeLabel = (instant: Date, timeZone?: string) => {
  const parts = getZonedParts(instant.getTime(), timeZone ?? getDeviceTimeZone());
  return formatTimeLabel(
    `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`
  );
};

/** When a day "wakes up". Hour games: the day start plus wakeUpOffsetMinutes.
 * Calendar games: the wall-clock wake-up on the day's start date. */
export const getDayWakeUpInstant = (
  dayStart: Date,
  schedule: GameSchedule,
  timeZone?: string
): Date =>
  isHourGameSchedule(schedule)
    ? new Date(dayStart.getTime() + (schedule.wakeUpOffsetMinutes ?? 0) * 60_000)
    : buildScheduledDate(dayStart, getWakeUpTime(schedule), timeZone);

export const buildScheduledDate = (baseDate: Date, time24: string, timeZone?: string) => {
  if (isInstantGameDay(baseDate)) return new Date(baseDate);
  const [hoursString, minutesString] = time24.split(':');
  if (timeZone) {
    return new Date(
      zonedWallTimeToInstantMs(
        {
          year: baseDate.getFullYear(),
          month: baseDate.getMonth() + 1,
          day: baseDate.getDate(),
          hour: Number(hoursString || '0'),
          minute: Number(minutesString || '0'),
        },
        timeZone
      )
    );
  }
  const scheduledDate = new Date(baseDate);
  scheduledDate.setHours(Number(hoursString || '0'), Number(minutesString || '0'), 0, 0);
  return scheduledDate;
};

/**
 * `time24` on the calendar day that `instant` falls on, in `timeZone` when
 * given, else device-local. Use when the base is a real instant (e.g. a
 * deadline) rather than a calendar-date token. `dayOffset` shifts by whole
 * calendar days.
 */
export const buildScheduledDateOnInstantDay = (
  instant: Date,
  time24: string,
  timeZone?: string,
  dayOffset: number = 0
) => {
  const [hoursString, minutesString] = time24.split(':');
  const hour = Number(hoursString || '0');
  const minute = Number(minutesString || '0');
  if (timeZone) {
    return new Date(
      zonedWallTimeOnInstantDayMs(instant.getTime(), timeZone, hour, minute, dayOffset)
    );
  }
  const scheduledDate = new Date(instant);
  if (dayOffset !== 0) {
    scheduledDate.setDate(scheduledDate.getDate() + dayOffset);
  }
  scheduledDate.setHours(hour, minute, 0, 0);
  return scheduledDate;
};

export const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

export const formatCalendarDateLabel = (date: Date, includeYear: boolean = false) => {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  if (includeYear) {
    return `${month}/${day}/${date.getFullYear()}`;
  }

  return `${month}/${day}`;
};

const getCalendarDayValue = (date: Date) => {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
};

export const getRelativeCalendarLabel = (
  date: Date,
  casing: 'lower' | 'title' = 'title',
  now: Date = nowDate(),
  timeZone?: string
) => {
  const nowDayValue = timeZone
    ? getZonedDayValue(now.getTime(), timeZone)
    : getCalendarDayValue(now);
  const dayDifference = Math.round((getCalendarDayValue(date) - nowDayValue) / 86400000);
  const relativeLabel =
    dayDifference === -1
      ? 'yesterday'
      : dayDifference === 0
        ? 'today'
        : dayDifference === 1
          ? 'tomorrow'
          : null;

  if (!relativeLabel) {
    return null;
  }

  return casing === 'title'
    ? `${relativeLabel.charAt(0).toUpperCase()}${relativeLabel.slice(1)}`
    : relativeLabel;
};

export const formatContextualDateLabel = (
  date: Date,
  fallbackLabel: string = formatCalendarDateLabel(date),
  now: Date = nowDate(),
  casing: 'lower' | 'title' = 'title',
  timeZone?: string
) => {
  if (isInstantGameDay(date)) {
    const token = timeZone
      ? getZonedDayToken(date.getTime(), timeZone)
      : new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return getRelativeCalendarLabel(token, casing, now, timeZone) ?? formatCalendarDateLabel(token);
  }
  return getRelativeCalendarLabel(date, casing, now, timeZone) ?? fallbackLabel;
};

export const getDayEndDate = (dayDates: Date[], dayIndex: number, fallbackSpanDays: number = 1) => {
  const startDate = dayDates[dayIndex];
  if (!startDate) {
    return nowDate();
  }

  const nextStartDate = dayDates[dayIndex + 1];
  // Hour-game days have no duration of their own: the day ends when the next
  // one starts, or the default length after its own start for the last day.
  if (isHourGameDay(startDate)) {
    const spanDays =
      Number.isFinite(fallbackSpanDays) && fallbackSpanDays > 0
        ? fallbackSpanDays
        : DEFAULT_HOUR_GAME_DAY_MINUTES / 1440;
    const endMs = nextStartDate
      ? nextStartDate.getTime()
      : startDate.getTime() + spanDays * 86400000;
    return timedGameDay(new Date(endMs), 1);
  }
  if (isTimedGameDay(startDate)) return timedGameDayEnd(startDate);
  if (isInstantGameDay(nextStartDate)) return timedGameDay(nextStartDate, 1);
  if (nextStartDate) {
    return addDays(nextStartDate, -1);
  }

  return addDays(startDate, Math.max(fallbackSpanDays, 1) - 1);
};

export const getDeadlineBaseDate = (dayEnd: Date, offsetDays = 0): Date =>
  isInstantGameDay(dayEnd) ? dayEnd : new Date(dayEnd.getTime() - offsetDays * 86400000);

export const createNextGameDay = (
  previous: Date | undefined,
  spanDays: number,
  schedule: GameSchedule,
  now = nowDate()
): Date => {
  if (isHourGameSchedule(schedule)) {
    // Hour games: the new day starts one default length after the previous
    // day's start, or now if the game has already run past that point.
    const spanMs = Math.max(
      (Number.isFinite(spanDays) && spanDays > 0
        ? spanDays
        : DEFAULT_HOUR_GAME_DAY_MINUTES / 1440) * 86400000,
      60_000
    );
    if (!previous) return hourGameDay(now, false);
    const prevStart = isInstantGameDay(previous)
      ? previous.getTime()
      : buildScheduledDate(previous, '00:00', resolveGameTimeZone(schedule)).getTime();
    return hourGameDay(new Date(Math.max(now.getTime(), prevStart + spanMs)), true);
  }
  if (
    schedule.dayDurationUnit === 'hours' ||
    schedule.dayDurationUnit === 'minutes' ||
    spanDays < 1
  ) {
    const start =
      previous && isTimedGameDay(previous)
        ? new Date(Math.max(now.getTime(), timedGameDayEnd(previous).getTime()))
        : previous
          ? new Date(
              Math.max(
                now.getTime(),
                buildScheduledDate(
                  previous,
                  schedule.wakeUpTime,
                  resolveGameTimeZone(schedule)
                ).getTime()
              )
            )
          : now;
    return timedGameDay(start, spanDays * 1440, schedule.dayDurationUnit);
  }
  if (!previous) {
    const token = getZonedDayValue(now.getTime(), resolveGameTimeZone(schedule));
    const utc = new Date(token);
    return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
  }
  if (isTimedGameDay(previous)) {
    return addDays(createNextGameDay(undefined, spanDays, schedule, timedGameDayEnd(previous)), 1);
  }
  return addDays(previous, spanDays);
};

export const getDayReleaseDate = (
  dayDates: Date[],
  dayIndex: number,
  wakeUpTime24: string,
  timeZone?: string,
  schedule?: GameSchedule,
  fallbackSpanDays: number = 1
) => {
  const nextStartDate = dayDates[dayIndex + 1];
  const start = dayDates[dayIndex];
  if (schedule && isHourGameSchedule(schedule) && start && isHourGameDay(start)) {
    // Hour games: content releases when the next day starts (or the default
    // length after this day's start for the last day), plus the wake-up offset.
    const base = nextStartDate
      ? nextStartDate.getTime()
      : start.getTime() + Math.max(fallbackSpanDays, 0) * 86400000;
    return new Date(base + (schedule.wakeUpOffsetMinutes ?? 0) * 60_000);
  }
  if (start && isTimedGameDay(start)) return timedGameDayEnd(start);
  if (isInstantGameDay(nextStartDate)) return new Date(nextStartDate);
  if (!nextStartDate) {
    return null;
  }

  return buildScheduledDate(nextStartDate, wakeUpTime24, timeZone);
};

export const isDayContentReleased = (
  dayDates: Date[],
  dayIndex: number,
  wakeUpTime24: string,
  now: Date = nowDate(),
  timeZone?: string,
  schedule?: GameSchedule,
  fallbackSpanDays: number = 1
) => {
  const releaseDate = getDayReleaseDate(
    dayDates,
    dayIndex,
    wakeUpTime24,
    timeZone,
    schedule,
    fallbackSpanDays
  );
  if (!releaseDate) {
    return false;
  }

  return now.getTime() >= releaseDate.getTime();
};

/**
 * Hour-game day label: the start time ("5am", "5:30am"), prefixed with the
 * calendar date only on the first day or when the game-zone date differs from
 * the previous day's. That's the only time the date carries information.
 */
export const formatHourDayLabel = (
  dayDates: Date[],
  dayIndex: number,
  timeZone?: string
): string => {
  const start = dayDates[dayIndex];
  if (!start || !Number.isFinite(start.getTime())) return '';
  const tz = timeZone ?? getDeviceTimeZone();
  const parts = getZonedParts(start.getTime(), tz);
  const suffix = parts.hour < 12 ? 'am' : 'pm';
  const time =
    parts.minute === 0
      ? `${parts.hour % 12 || 12}${suffix}`
      : `${parts.hour % 12 || 12}:${String(parts.minute).padStart(2, '0')}${suffix}`;

  const dayValue = getZonedDayValue(start.getTime(), tz);
  const previous = dayDates[dayIndex - 1];
  const previousValue = previous
    ? isInstantGameDay(previous)
      ? getZonedDayValue(previous.getTime(), tz)
      : getDateTokenDayValue(previous)
    : null;
  if (dayIndex === 0 || dayValue !== previousValue) {
    return `${formatCalendarDateLabel(getZonedDayToken(start.getTime(), tz))} ${time}`;
  }
  return time;
};

export const getDayRangeLabel = (
  dayDates: Date[],
  dayIndex: number,
  fallbackSpanDays: number = 1,
  timeZone?: string
) => {
  const startDate = dayDates[dayIndex];
  if (!startDate) {
    return '';
  }

  if (isHourGameDay(startDate)) {
    return formatHourDayLabel(dayDates, dayIndex, timeZone);
  }

  if (isTimedGameDay(startDate)) {
    const tz = timeZone ?? getDeviceTimeZone();
    return `${formatCalendarDateLabel(getZonedDayToken(startDate.getTime(), tz))} ${formatInstantTimeLabel(startDate, tz)}`;
  }
  return formatCalendarDateLabel(startDate);
};

export const getContextualDayRangeLabel = (
  dayDates: Date[],
  dayIndex: number,
  fallbackSpanDays: number = 1,
  now: Date = nowDate(),
  timeZone?: string
) => {
  const startDate = dayDates[dayIndex];
  if (!startDate) {
    return '';
  }

  if (isHourGameDay(startDate)) {
    return formatHourDayLabel(dayDates, dayIndex, timeZone);
  }

  if (isInstantGameDay(startDate)) {
    const tz = timeZone ?? getDeviceTimeZone();
    return `${formatCalendarDateLabel(getZonedDayToken(startDate.getTime(), tz))} ${formatInstantTimeLabel(startDate, tz)}`;
  }
  return formatContextualDateLabel(
    startDate,
    formatCalendarDateLabel(startDate),
    now,
    'title',
    timeZone
  );
};

export const getCurrentPlayableDayIndex = (
  dayDates: Date[],
  now: Date = nowDate(),
  timeZone?: string
) => {
  if (dayDates.length === 0) {
    return 0;
  }
  if (dayDates.some(isInstantGameDay)) {
    const latest = dayDates.reduce((best, date, index) => {
      const start = isInstantGameDay(date) ? date : buildScheduledDate(date, '00:00', timeZone);
      return start.getTime() <= now.getTime() ? index : best;
    }, -1);
    return Math.max(0, latest);
  }

  if (timeZone) {
    const todayValue = getZonedDayValue(now.getTime(), timeZone);
    const dayValues = dayDates.map(getDateTokenDayValue);

    const zonedTodayIndex = dayValues.findIndex((value) => value === todayValue);
    if (zonedTodayIndex >= 0) {
      return zonedTodayIndex;
    }

    const zonedLatestPastIndex = dayValues.reduce((bestIndex, value, index) => {
      if (value <= todayValue) {
        return index;
      }
      return bestIndex;
    }, -1);

    if (zonedLatestPastIndex >= 0) {
      return zonedLatestPastIndex;
    }

    return 0;
  }

  const normalizedToday = new Date(now);
  normalizedToday.setHours(0, 0, 0, 0);

  const normalizedDays = dayDates.map((dayDate) => {
    const nextDate = new Date(dayDate);
    nextDate.setHours(0, 0, 0, 0);
    return nextDate;
  });

  const todayIndex = normalizedDays.findIndex(
    (date) => date.getTime() === normalizedToday.getTime()
  );
  if (todayIndex >= 0) {
    return todayIndex;
  }

  const latestPastIndex = normalizedDays.reduce((bestIndex, date, index) => {
    if (date.getTime() <= normalizedToday.getTime()) {
      return index;
    }
    return bestIndex;
  }, -1);

  if (latestPastIndex >= 0) {
    return latestPastIndex;
  }

  return 0;
};

export const isDayReleasedAtTime = (
  dayDate: Date,
  time24: string,
  now: Date = nowDate(),
  timeZone?: string
) => {
  return now.getTime() >= buildScheduledDate(dayDate, time24, timeZone).getTime();
};

export const isNightWindowOpen = (
  dayDate: Date,
  deadlineTime24: string,
  now: Date = nowDate(),
  timeZone?: string
) => {
  const deadline = buildScheduledDate(dayDate, deadlineTime24, timeZone);
  return isInstantGameDay(dayDate)
    ? now.getTime() < deadline.getTime()
    : now.getTime() <= deadline.getTime();
};

/**
 * The instant a deadline closes. Hour games: the day end minus the lead
 * minutes. Calendar games: the wall-clock deadline on the (offset) final day.
 * Timed rounds keep their exact end.
 */
export const getDayDeadlineInstant = (
  dayEnd: Date,
  schedule: GameSchedule,
  kind: 'action' | 'vote',
  timeZone?: string
): Date => {
  if (isHourGameSchedule(schedule)) {
    const lead =
      kind === 'vote' ? schedule.voteDeadlineLeadMinutes : schedule.actionDeadlineLeadMinutes;
    return new Date(dayEnd.getTime() - (lead ?? 0) * 60_000);
  }
  const offset = kind === 'vote' ? (schedule.voteDayOffset ?? 0) : (schedule.actionDayOffset ?? 0);
  const time24 =
    (kind === 'vote' ? schedule.voteDeadlineTime : schedule.actionDeadlineTime) ??
    defaultGameSchedule.voteDeadlineTime ??
    '22:00';
  return buildScheduledDate(getDeadlineBaseDate(dayEnd, offset), time24, timeZone);
};

/** Whether submissions are still open for the given deadline kind. */
export const isDayDeadlineOpen = (
  dayEnd: Date,
  schedule: GameSchedule,
  kind: 'action' | 'vote',
  now: Date = nowDate(),
  timeZone?: string
): boolean => {
  if (isHourGameSchedule(schedule)) {
    return now.getTime() < getDayDeadlineInstant(dayEnd, schedule, kind, timeZone).getTime();
  }
  const offset = kind === 'vote' ? (schedule.voteDayOffset ?? 0) : (schedule.actionDayOffset ?? 0);
  const time24 =
    (kind === 'vote' ? schedule.voteDeadlineTime : schedule.actionDeadlineTime) ??
    defaultGameSchedule.voteDeadlineTime ??
    '22:00';
  return isNightWindowOpen(getDeadlineBaseDate(dayEnd, offset), time24, now, timeZone);
};

export const normalizePlayerActionState = (
  action: PlayerActionValue | undefined
): MarkdownInputState => {
  if (!action) {
    return {};
  }

  if (typeof action === 'string') {
    const trimmedValue = action.trim();
    if (!trimmedValue.startsWith('{')) {
      return {};
    }

    try {
      const parsedValue = JSON.parse(trimmedValue) as MarkdownInputState;
      return typeof parsedValue === 'object' && parsedValue !== null ? parsedValue : {};
    } catch {
      return {};
    }
  }

  return action;
};

export const normalizeVoteTargets = (vote: VoteValue | undefined): string[] => {
  const uniqueTargets = (targets: string[]) => [
    ...new Set(targets.map((target) => target.trim()).filter(Boolean)),
  ];
  if (Array.isArray(vote)) return uniqueTargets(vote);
  if (!vote?.trim()) return [];
  if (vote.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(vote);
      if (Array.isArray(parsed)) return uniqueTargets(parsed.map(String));
    } catch {
      return [vote.trim()];
    }
  }
  return [vote.trim()];
};

export const hasVoteContent = (vote: VoteValue | undefined) =>
  normalizeVoteTargets(vote).length > 0;

export const getPlayerActionSummary = (action: PlayerActionValue | undefined) => {
  if (!action) {
    return '';
  }

  if (typeof action === 'string') {
    return action;
  }

  const entries = Object.entries(action)
    .map(([label, value]) => [label, value?.trim() || ''] as const)
    .filter(([, value]) => value.length > 0);

  return entries.map(([label, value]) => `${label}: ${value}`).join(' • ');
};

export const hasPlayerActionContent = (action: PlayerActionValue | undefined) => {
  return getPlayerActionSummary(action).trim().length > 0;
};

export const getLatestReleasedDayIndex = (
  dayDates: Date[],
  wakeUpTime24: string,
  now: Date = nowDate(),
  timeZone?: string,
  schedule?: GameSchedule,
  fallbackSpanDays: number = 1
) => {
  if (dayDates.length === 0) {
    return -1;
  }

  let latestReleasedIndex = -1;

  dayDates.forEach((dayDate, index) => {
    if (
      isDayContentReleased(dayDates, index, wakeUpTime24, now, timeZone, schedule, fallbackSpanDays)
    ) {
      latestReleasedIndex = index;
    }
  });

  return latestReleasedIndex;
};

/**
 * Re-resolve hour-game days before they are serialized. Days flagged
 * `inherit` take the previous day's game-zone date and roll forward until
 * their start is strictly after the previous day's start; explicitly dated
 * days keep their stored instant. Run this on every write path so a date
 * edit on one day cascades through the days that follow it.
 */
export const resolveHourDaySequence = (dates: Date[], timeZone?: string): Date[] => {
  const tz = timeZone ?? getDeviceTimeZone();
  let previousStart = Number.NEGATIVE_INFINITY;
  let previousDayParts: { year: number; month: number; day: number } | null = null;

  return dates.map((date) => {
    if (!isHourGameDay(date) || !Number.isFinite(date.getTime())) {
      if (Number.isFinite(date.getTime())) {
        previousStart = Math.max(previousStart, date.getTime());
        previousDayParts = isInstantGameDay(date)
          ? getZonedParts(date.getTime(), tz)
          : { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
      }
      return date;
    }

    const inherit = hourGameDayInheritsDate(date);
    const zoned = getZonedParts(date.getTime(), tz);
    const base =
      inherit && previousDayParts
        ? { ...previousDayParts, hour: zoned.hour, minute: zoned.minute }
        : {
            year: zoned.year,
            month: zoned.month,
            day: zoned.day,
            hour: zoned.hour,
            minute: zoned.minute,
          };

    // Roll the wall-clock date forward until the resolved start is strictly
    // after the previous day's start (an 11pm day followed by a 1am day lands
    // on the next calendar date).
    let extraDays = 0;
    let resolved = zonedWallTimeToInstantMs(base, tz);
    while (resolved <= previousStart) {
      extraDays += 1;
      resolved = zonedWallTimeToInstantMs({ ...base, day: base.day + extraDays }, tz);
    }

    previousStart = resolved;
    previousDayParts = getZonedParts(resolved, tz);
    return hourGameDay(new Date(resolved), inherit);
  });
};

/**
 * Convert an existing day list to hour-game storage, keeping each day's
 * current start: timed rounds keep their instant; calendar days start at the
 * schedule's wake-up time in the game zone. Every migrated day is explicitly
 * dated (inherit off) so nothing moves on its own afterward.
 *
 * When `firstDayStart` is given, the whole sequence shifts so day 1 lands on
 * it (every other day keeps its relative offset), and a day is seeded at it
 * when the list is empty.
 */
export const migrateDayDatesToHourMode = (
  storedDates: string[],
  schedule: GameSchedule,
  firstDayStart?: Date
): string[] => {
  const tz = resolveGameTimeZone(schedule);
  const migrated = parseStoredDayDates(storedDates).map((date) => {
    if (isHourGameDay(date)) return date;
    if (isTimedGameDay(date)) return hourGameDay(date, false);
    if (!Number.isFinite(date.getTime())) return date;
    return hourGameDay(buildScheduledDate(date, getWakeUpTime(schedule), tz), false);
  });
  const chosenStart =
    firstDayStart && Number.isFinite(firstDayStart.getTime()) ? firstDayStart : null;
  if (!chosenStart) return migrated.map(serializeGameDayDate);
  // No days yet: seed day 1 at the chosen start.
  if (migrated.length === 0) {
    return [serializeGameDayDate(hourGameDay(chosenStart, false))];
  }
  // Shift the whole sequence so day 1 lands on the chosen start; every other
  // day keeps its offset and order relative to it.
  const offset = chosenStart.getTime() - migrated[0].getTime();
  if (!Number.isFinite(offset) || offset === 0) return migrated.map(serializeGameDayDate);
  return migrated.map((date) =>
    Number.isFinite(date.getTime())
      ? serializeGameDayDate(hourGameDay(new Date(date.getTime() + offset), false))
      : serializeGameDayDate(date)
  );
};

/** "2h 30m" / "2h" / "45m" for relative-time labels. */
export const formatMinutesCompact = (minutes: number): string => {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) return `${rest}m`;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
};

export const formatCountdown = (targetDate: Date, now: Date = nowDate()) => {
  const differenceMs = targetDate.getTime() - now.getTime();
  if (differenceMs <= 0) {
    return '00:00:00';
  }

  const totalSeconds = Math.floor(differenceMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((value) => `${value}`.padStart(2, '0')).join(':');
};

export const formatRelativeDuration = (targetDate: Date, now: Date = nowDate()) => {
  const differenceMs = targetDate.getTime() - now.getTime();
  if (differenceMs <= 0) {
    return 'now';
  }

  const totalMinutes = Math.ceil(differenceMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
};
