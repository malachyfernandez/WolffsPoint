import { devWarn } from './devWarnings';

/**
 * IANA-timezone helpers. The game schedule stores one IANA zone per game;
 * all wall-clock schedule times and "what day is it" questions are resolved
 * in that zone so every player sees identical timing regardless of device.
 */

const formatterCache = new Map<string, Intl.DateTimeFormat>();
const warnedZones = new Set<string>();

const getFormatter = (timeZone: string): Intl.DateTimeFormat | null => {
  const cached = formatterCache.get(timeZone);
  if (cached) return cached;
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hourCycle: 'h23',
    });
    // Force a format call — invalid zones throw RangeError here on some engines.
    formatter.format(0);
    formatterCache.set(timeZone, formatter);
    return formatter;
  } catch {
    if (!warnedZones.has(timeZone)) {
      warnedZones.add(timeZone);
      devWarn(
        'timezone_unsupported',
        `Intl does not support timezone "${timeZone}". Falling back to device-local time.`
      );
    }
    return null;
  }
};

/** True if Intl can format in this IANA zone (also validates config input). */
export const isValidTimeZone = (timeZone: string): boolean =>
  !!timeZone && getFormatter(timeZone) !== null;

/** The device's IANA zone, e.g. "America/New_York". 'UTC' if unavailable. */
export const getDeviceTimeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

export type ZonedParts = {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number;
  second: number;
};

/** Calendar/clock fields of `instantMs` as observed in `timeZone`. */
export const getZonedParts = (instantMs: number, timeZone: string): ZonedParts => {
  const formatter = getFormatter(timeZone);
  if (!formatter) {
    const d = new Date(instantMs); // device-local fallback
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
      hour: d.getHours(),
      minute: d.getMinutes(),
      second: d.getSeconds(),
    };
  }
  const parts: Record<string, number> = {};
  for (const part of formatter.formatToParts(new Date(instantMs))) {
    if (part.type !== 'literal') parts[part.type] = Number(part.value);
  }
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
};

/** Offset in ms that `timeZone` is ahead of UTC at `instantMs`. */
export const getTimeZoneOffsetMs = (timeZone: string, instantMs: number): number => {
  const p = getZonedParts(instantMs, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(instantMs / 1000) * 1000;
};

/**
 * Convert a wall-clock time in `timeZone` to an absolute instant (ms).
 * Re-checks the offset once to handle DST-transition edges.
 */
export const zonedWallTimeToInstantMs = (
  parts: { year: number; month: number; day: number; hour?: number; minute?: number },
  timeZone: string
): number => {
  const guess = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour ?? 0,
    parts.minute ?? 0
  );
  const offset1 = getTimeZoneOffsetMs(timeZone, guess);
  const instant = guess - offset1;
  const offset2 = getTimeZoneOffsetMs(timeZone, instant);
  return offset2 === offset1 ? instant : guess - offset2;
};

/**
 * Wall time `hour:minute` on the calendar day that `instantMs` falls on in
 * `timeZone`, optionally shifted by `dayOffset` calendar days. Use when the
 * base is a real instant (e.g. a deadline) rather than a day token.
 */
export const zonedWallTimeOnInstantDayMs = (
  instantMs: number,
  timeZone: string,
  hour: number,
  minute: number,
  dayOffset: number = 0
): number => {
  const p = getZonedParts(instantMs, timeZone);
  const dayMs = Date.UTC(p.year, p.month - 1, p.day) + dayOffset * 86400000;
  const d = new Date(dayMs);
  return zonedWallTimeToInstantMs(
    {
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      day: d.getUTCDate(),
      hour,
      minute,
    },
    timeZone
  );
};

/**
 * Calendar-date token (local-midnight Date) for the day `instantMs` falls on
 * in `timeZone`. Only its getFullYear/getMonth/getDate fields are meaningful —
 * same convention as parseStoredDayDates. Use to convert a real instant into
 * a day token before passing it to token-based helpers.
 */
export const getZonedDayToken = (instantMs: number, timeZone: string): Date => {
  const p = getZonedParts(instantMs, timeZone);
  return new Date(p.year, p.month - 1, p.day);
};

/**
 * Numeric day value (ms at UTC midnight) for the calendar date that
 * `instantMs` falls on in `timeZone`. Safe for <, ===, > comparisons and
 * sorting. NOT a real instant — never mix with Date.now().
 */
export const getZonedDayValue = (instantMs: number, timeZone: string): number => {
  const p = getZonedParts(instantMs, timeZone);
  return Date.UTC(p.year, p.month - 1, p.day);
};

/**
 * Numeric day value for a calendar-date token (a Date created by
 * parseStoredDayDates / local-midnight construction). Pair with
 * getZonedDayValue when comparing a token to an instant.
 */
export const getDateTokenDayValue = (dateToken: Date): number =>
  Date.UTC(dateToken.getFullYear(), dateToken.getMonth(), dateToken.getDate());
