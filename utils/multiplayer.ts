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
  isValidTimeZone,
  zonedWallTimeOnInstantDayMs,
  zonedWallTimeToInstantMs,
} from './timezone';

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
  };
};

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
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const parseStoredDayDates = (dayDates: string[]) => {
  return dayDates.map((dateStr) => {
    const [month, day, year] = dateStr.split('/').map(Number);
    return new Date(year, month - 1, day);
  });
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

export const buildScheduledDate = (baseDate: Date, time24: string, timeZone?: string) => {
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
 * `time24` on the calendar day that `instant` falls on — in `timeZone` when
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
  now: Date = new Date(),
  timeZone?: string
) => {
  const nowDayValue = timeZone
    ? getZonedDayValue(now.getTime(), timeZone)
    : getCalendarDayValue(now);
  const dayDifference = Math.round(
    (getCalendarDayValue(date) - nowDayValue) / 86400000
  );
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
  now: Date = new Date(),
  casing: 'lower' | 'title' = 'title',
  timeZone?: string
) => {
  return getRelativeCalendarLabel(date, casing, now, timeZone) ?? fallbackLabel;
};

export const getDayEndDate = (dayDates: Date[], dayIndex: number, fallbackSpanDays: number = 1) => {
  const startDate = dayDates[dayIndex];
  if (!startDate) {
    return new Date();
  }

  const nextStartDate = dayDates[dayIndex + 1];
  if (nextStartDate) {
    return addDays(nextStartDate, -1);
  }

  return addDays(startDate, Math.max(fallbackSpanDays, 1) - 1);
};

export const getDayReleaseDate = (
  dayDates: Date[],
  dayIndex: number,
  wakeUpTime24: string,
  timeZone?: string
) => {
  const nextStartDate = dayDates[dayIndex + 1];
  if (!nextStartDate) {
    return null;
  }

  return buildScheduledDate(nextStartDate, wakeUpTime24, timeZone);
};

export const isDayContentReleased = (
  dayDates: Date[],
  dayIndex: number,
  wakeUpTime24: string,
  now: Date = new Date(),
  timeZone?: string
) => {
  const releaseDate = getDayReleaseDate(dayDates, dayIndex, wakeUpTime24, timeZone);
  if (!releaseDate) {
    return false;
  }

  return now.getTime() >= releaseDate.getTime();
};

export const getDayRangeLabel = (
  dayDates: Date[],
  dayIndex: number,
  fallbackSpanDays: number = 1
) => {
  const startDate = dayDates[dayIndex];
  if (!startDate) {
    return '';
  }

  const endDate = getDayEndDate(dayDates, dayIndex, fallbackSpanDays);
  const includeYear = startDate.getFullYear() !== endDate.getFullYear();
  const startLabel = formatCalendarDateLabel(startDate, includeYear);
  const endLabel = formatCalendarDateLabel(endDate, includeYear);

  if (startDate.getTime() === endDate.getTime()) {
    return startLabel;
  }

  return `${startLabel} - ${endLabel}`;
};

export const getContextualDayRangeLabel = (
  dayDates: Date[],
  dayIndex: number,
  fallbackSpanDays: number = 1,
  now: Date = new Date(),
  timeZone?: string
) => {
  const startDate = dayDates[dayIndex];
  if (!startDate) {
    return '';
  }

  const endDate = getDayEndDate(dayDates, dayIndex, fallbackSpanDays);
  const includeYear = startDate.getFullYear() !== endDate.getFullYear();
  const startLabel = formatContextualDateLabel(
    startDate,
    formatCalendarDateLabel(startDate, includeYear),
    now,
    'title',
    timeZone
  );
  const endLabel = formatContextualDateLabel(
    endDate,
    formatCalendarDateLabel(endDate, includeYear),
    now,
    'title',
    timeZone
  );

  if (startDate.getTime() === endDate.getTime()) {
    return startLabel;
  }

  return `${startLabel} - ${endLabel}`;
};

export const getCurrentPlayableDayIndex = (
  dayDates: Date[],
  now: Date = new Date(),
  timeZone?: string
) => {
  if (dayDates.length === 0) {
    return 0;
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
  now: Date = new Date(),
  timeZone?: string
) => {
  return now.getTime() >= buildScheduledDate(dayDate, time24, timeZone).getTime();
};

export const isNightWindowOpen = (
  dayDate: Date,
  deadlineTime24: string,
  now: Date = new Date(),
  timeZone?: string
) => {
  const deadline = buildScheduledDate(dayDate, deadlineTime24, timeZone);
  return now.getTime() <= deadline.getTime();
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
  now: Date = new Date(),
  timeZone?: string
) => {
  if (dayDates.length === 0) {
    return -1;
  }

  let latestReleasedIndex = -1;

  dayDates.forEach((dayDate, index) => {
    if (isDayContentReleased(dayDates, index, wakeUpTime24, now, timeZone)) {
      latestReleasedIndex = index;
    }
  });

  return latestReleasedIndex;
};

export const formatCountdown = (targetDate: Date, now: Date = new Date()) => {
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

export const formatRelativeDuration = (targetDate: Date, now: Date = new Date()) => {
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
