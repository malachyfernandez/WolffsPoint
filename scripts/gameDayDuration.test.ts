import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  durationInDays,
  durationValue,
  hourGameDay,
  hourGameDayInheritsDate,
  inferGameDayUnit,
  isHourGameDay,
  isInstantGameDay,
  isTimedGameDay,
  parseGameDayDate,
  serializeGameDayDate,
  timedGameDay,
  timedGameDayEnd,
  timedGameDayMinutes,
} from '../utils/gameDayDuration';
import {
  buildScheduledDate,
  createNextGameDay,
  defaultGameSchedule,
  formatHourDayLabel,
  formatMinutesCompact,
  getCurrentPlayableDayIndex,
  getDayDeadlineInstant,
  getDayEndDate,
  getDayRangeLabel,
  getDayReleaseDate,
  getDeadlineBaseDate,
  getGameDayTime24,
  isDayContentReleased,
  isDayDeadlineOpen,
  isDayReleasedAtTime,
  isHourGameSchedule,
  isNightWindowOpen,
  migrateDayDatesToHourMode,
  normalizeGameSchedule,
  parseStoredDayDates,
  resolveHourDaySequence,
} from '../utils/multiplayer';

const now = new Date('2026-10-17T15:20:30.000Z');
const minutesSchedule = {
  ...defaultGameSchedule,
  timezone: 'UTC',
  dayDurationUnit: 'minutes' as const,
};
const start = () => timedGameDay(now, 5);

test('duration units convert without dropping minutes', () => {
  assert.equal(durationInDays(5, 'minutes') * 86400000, 300000);
  assert.equal(durationValue(durationInDays(90, 'minutes'), 'minutes'), 90);
  assert.equal(durationValue(2, 'hours'), 48);
  assert.equal(inferGameDayUnit(2), 'days');
  assert.equal(inferGameDayUnit(1 / 24), 'hours');
  assert.equal(inferGameDayUnit(5 / 1440), 'minutes');
});

test('calendar storage and schedules remain backward compatible', () => {
  const dates = parseStoredDayDates(['10/17/2026', '10/19/2026']);
  assert.equal(isTimedGameDay(dates[0]), false);
  assert.equal(serializeGameDayDate(dates[0]), '10/17/2026');
  assert.equal(getDayEndDate(dates, 0, 2).getDate(), 18);
  assert.equal(getDayRangeLabel(dates, 0, 2), '10/17');
  assert.equal(
    buildScheduledDate(getDayEndDate(dates, 0), '22:00', 'UTC').toISOString(),
    '2026-10-18T22:00:00.000Z'
  );
});

test('timed rounds serialize an exact instant and their own duration', () => {
  const original = start();
  const restored = parseGameDayDate(serializeGameDayDate(original));
  assert.equal(restored.toISOString(), now.toISOString());
  assert.equal(timedGameDayMinutes(restored), 5);
  assert.equal(timedGameDayEnd(restored).getTime() - restored.getTime(), 300000);
  assert.equal(
    isTimedGameDay(
      parseGameDayDate(serializeGameDayDate(timedGameDay(new Date('2026-10-17T00:00:00Z'), 1)))
    ),
    true
  );
});

test('quick game setup starts now and creates precise future rounds', () => {
  const first = createNextGameDay(undefined, 5 / 1440, minutesSchedule, now);
  const second = createNextGameDay(first, 5 / 1440, minutesSchedule, now);
  assert.equal(first.getTime(), now.getTime());
  assert.equal(second.getTime() - first.getTime(), 300000);
  assert.equal(getDayEndDate([first, second], 0).getTime(), second.getTime());
});

test('adding a round after a pause starts now instead of creating an expired round', () => {
  const later = new Date(now.getTime() + 3600000);
  const next = createNextGameDay(start(), 5 / 1440, minutesSchedule, later);
  assert.equal(next.getTime(), later.getTime());
});

test('changing default duration does not change existing rounds', () => {
  const first = start();
  const second = createNextGameDay(first, 10 / 1440, minutesSchedule, now);
  assert.equal(getDayEndDate([first], 0, 10 / 1440).getTime(), now.getTime() + 300000);
  assert.equal(timedGameDayEnd(second).getTime() - second.getTime(), 600000);
});

test('current day compares instants, not only calendar dates', () => {
  const first = start();
  const second = createNextGameDay(first, 5 / 1440, minutesSchedule, now);
  const third = createNextGameDay(second, 5 / 1440, minutesSchedule, now);
  const dates = parseStoredDayDates([first, second, third].map(serializeGameDayDate));
  assert.equal(getCurrentPlayableDayIndex(dates, now, 'Pacific/Honolulu'), 0);
  assert.equal(getCurrentPlayableDayIndex(dates, second, 'Asia/Tokyo'), 1);
  assert.equal(getCurrentPlayableDayIndex(dates, third, 'UTC'), 2);
});

test('timed deadlines ignore calendar clock settings and day offsets', () => {
  const end = getDayEndDate([start()], 0, 2);
  const deadline = getDeadlineBaseDate(end, 3);
  assert.equal(
    buildScheduledDate(deadline, '22:00', 'America/New_York').getTime(),
    now.getTime() + 300000
  );
  assert.equal(isNightWindowOpen(deadline, '22:00', new Date(now.getTime() + 299999)), true);
  assert.equal(isNightWindowOpen(deadline, '22:00', new Date(now.getTime() + 300000)), false);
  assert.equal(getGameDayTime24(deadline, '22:00', 'UTC'), '15:25');
});

test('content unlocks at round end even without another day being created', () => {
  const dates = [start()];
  const end = new Date(now.getTime() + 300000);
  assert.equal(getDayReleaseDate(dates, 0, '08:00', 'UTC')!.getTime(), end.getTime());
  assert.equal(isDayContentReleased(dates, 0, '08:00', now, 'UTC'), false);
  assert.equal(isDayContentReleased(dates, 0, '08:00', end, 'UTC'), true);
  assert.equal(isDayReleasedAtTime(dates[0], '08:00', new Date(now.getTime() - 1)), false);
  assert.equal(isDayReleasedAtTime(dates[0], '08:00', now), true);
});

test('elapsed-minute rounds are not stretched by daylight saving transitions', () => {
  const dst = timedGameDay(new Date('2026-11-01T05:30:00Z'), 90);
  const end = timedGameDayEnd(dst);
  assert.equal(end.toISOString(), '2026-11-01T07:00:00.000Z');
  assert.equal(getDayRangeLabel([dst], 0, 1, 'America/New_York'), '11/1 1:30 AM');
});

test('switching back to calendar days does not overlap a long timed round', () => {
  const previous = timedGameDay(now, 2880);
  const next = createNextGameDay(previous, 1, { ...minutesSchedule, dayDurationUnit: 'days' }, now);
  assert.equal(isTimedGameDay(next), false);
  assert.ok(
    buildScheduledDate(next, '00:00', 'UTC').getTime() >= timedGameDayEnd(previous).getTime()
  );
});

test('schedule normalization preserves the unit through other settings edits', () => {
  assert.equal(normalizeGameSchedule(minutesSchedule).dayDurationUnit, 'minutes');
  assert.equal(normalizeGameSchedule(defaultGameSchedule).dayDurationUnit, undefined);
  assert.ok(Number.isNaN(parseGameDayDate('{"start": null, "durationMinutes": 0}').getTime()));
});

const hourSchedule = {
  ...defaultGameSchedule,
  timezone: 'UTC',
  dayMode: 'hour' as const,
};

test('hour days round-trip their start instant and date-inheritance flag', () => {
  const day = hourGameDay(new Date('2026-10-17T05:00:00Z'), true);
  const restored = parseGameDayDate(serializeGameDayDate(day));
  assert.equal(isHourGameDay(restored), true);
  assert.equal(isTimedGameDay(restored), false);
  assert.equal(isInstantGameDay(restored), true);
  assert.equal(hourGameDayInheritsDate(restored), true);
  assert.equal(restored.toISOString(), '2026-10-17T05:00:00.000Z');

  const explicit = parseGameDayDate(
    serializeGameDayDate(hourGameDay(new Date('2026-10-17T05:30:00Z'), false))
  );
  assert.equal(hourGameDayInheritsDate(explicit), false);

  assert.equal(isHourGameSchedule(hourSchedule), true);
  assert.equal(isHourGameSchedule(defaultGameSchedule), false);
  assert.equal(normalizeGameSchedule(hourSchedule).dayMode, 'hour');
});

test('hour game days end at the next start or the default length', () => {
  const first = createNextGameDay(undefined, 3 / 24, hourSchedule, now);
  const second = createNextGameDay(first, 3 / 24, hourSchedule, now);
  assert.equal(isHourGameDay(first), true);
  assert.equal(isHourGameDay(second), true);
  assert.equal(second.getTime() - first.getTime(), 3 * 3600000);
  assert.equal(getDayEndDate([first, second], 0).getTime(), second.getTime());
  assert.equal(getDayEndDate([first, second], 1, 3 / 24).getTime(), second.getTime() + 3 * 3600000);
  // A paused game still starts the next day now.
  const later = new Date(now.getTime() + 5 * 3600000);
  assert.equal(createNextGameDay(first, 3 / 24, hourSchedule, later).getTime(), later.getTime());
});

test('hour day labels show the start time and only surface date changes', () => {
  const dates = [
    hourGameDay(new Date('2026-10-17T05:00:00Z'), false),
    hourGameDay(new Date('2026-10-17T06:00:00Z'), true),
    hourGameDay(new Date('2026-10-17T23:00:00Z'), true),
    hourGameDay(new Date('2026-10-18T01:30:00Z'), true),
  ];
  assert.equal(getDayRangeLabel(dates, 0, 1, 'UTC'), '10/17 5am');
  assert.equal(getDayRangeLabel(dates, 1, 1, 'UTC'), '6am');
  assert.equal(getDayRangeLabel(dates, 2, 1, 'UTC'), '11pm');
  assert.equal(getDayRangeLabel(dates, 3, 1, 'UTC'), '10/18 1:30am');
  assert.equal(formatHourDayLabel(dates, 3, 'UTC'), '10/18 1:30am');
});

test('inherited dates roll forward and follow earlier date edits', () => {
  const dates = [
    hourGameDay(new Date('2026-10-17T05:00:00Z'), false),
    hourGameDay(new Date('2026-10-17T23:00:00Z'), true),
    hourGameDay(new Date('2026-10-17T01:00:00Z'), true),
  ];
  const resolved = resolveHourDaySequence(dates, 'UTC');
  assert.equal(resolved[1].toISOString(), '2026-10-17T23:00:00.000Z');
  // 1am must land after 11pm, so it inherits onto the next calendar date.
  assert.equal(resolved[2].toISOString(), '2026-10-18T01:00:00.000Z');

  // Editing the first day's date moves every inherited day with it.
  resolved[0] = hourGameDay(new Date('2026-10-19T05:00:00Z'), false);
  const reResolved = resolveHourDaySequence(resolved, 'UTC');
  assert.equal(reResolved[1].toISOString(), '2026-10-19T23:00:00.000Z');
  assert.equal(reResolved[2].toISOString(), '2026-10-20T01:00:00.000Z');
});

test('hour game deadlines are leads before the day ends', () => {
  const schedule = {
    ...hourSchedule,
    actionDeadlineLeadMinutes: 30,
    voteDeadlineLeadMinutes: 0,
  };
  const first = hourGameDay(new Date('2026-10-17T05:00:00Z'), false);
  const second = hourGameDay(new Date('2026-10-17T06:00:00Z'), true);
  const end = getDayEndDate([first, second], 0);
  assert.equal(
    getDayDeadlineInstant(end, schedule, 'action').toISOString(),
    '2026-10-17T05:30:00.000Z'
  );
  assert.equal(
    getDayDeadlineInstant(end, schedule, 'vote').toISOString(),
    '2026-10-17T06:00:00.000Z'
  );
  assert.equal(isDayDeadlineOpen(end, schedule, 'action', new Date('2026-10-17T05:29:00Z')), true);
  assert.equal(isDayDeadlineOpen(end, schedule, 'action', new Date('2026-10-17T05:30:00Z')), false);
  assert.equal(formatMinutesCompact(150), '2h 30m');
  assert.equal(formatMinutesCompact(120), '2h');
  assert.equal(formatMinutesCompact(45), '45m');
});

test('hour game content releases at the next start plus the wake-up offset', () => {
  const dates = [
    hourGameDay(new Date('2026-10-17T05:00:00Z'), false),
    hourGameDay(new Date('2026-10-17T06:00:00Z'), true),
  ];
  const withOffset = { ...hourSchedule, wakeUpOffsetMinutes: 10 };
  assert.equal(
    getDayReleaseDate(dates, 0, '08:00', 'UTC', withOffset)!.toISOString(),
    '2026-10-17T06:10:00.000Z'
  );
  // Zero offset releases right at the next start.
  assert.equal(
    getDayReleaseDate(dates, 0, '08:00', 'UTC', hourSchedule)!.toISOString(),
    '2026-10-17T06:00:00.000Z'
  );
  assert.equal(
    isDayContentReleased(dates, 0, '08:00', new Date('2026-10-17T05:59:00Z'), 'UTC', hourSchedule),
    false
  );
  assert.equal(
    isDayContentReleased(dates, 0, '08:00', new Date('2026-10-17T06:00:00Z'), 'UTC', hourSchedule),
    true
  );
  // The last day releases the default length after its start.
  assert.equal(
    getDayReleaseDate(dates, 1, '08:00', 'UTC', hourSchedule, 3 / 24)!.toISOString(),
    '2026-10-17T09:00:00.000Z'
  );
});

test('migrating to an hour game keeps each day start at the wake-up time', () => {
  const schedule = { ...hourSchedule, wakeUpTime: '05:00' };
  const migrated = parseStoredDayDates(
    migrateDayDatesToHourMode(['10/17/2026', '10/18/2026'], schedule)
  );
  assert.equal(migrated[0].toISOString(), '2026-10-17T05:00:00.000Z');
  assert.equal(migrated[1].toISOString(), '2026-10-18T05:00:00.000Z');
  assert.equal(isHourGameDay(migrated[0]), true);
  assert.equal(hourGameDayInheritsDate(migrated[0]), false);
});
