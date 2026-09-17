# Game Timezone Implementation Plan

## Context: the bug this fixes

All schedule times (`wakeUpTime`, `voteDeadlineTime`, `actionDeadlineTime`, etc.) are currently interpreted in **each player's device timezone**. Every helper in `utils/multiplayer.ts` (`buildScheduledDate`, `isNightWindowOpen`, `isDayReleasedAtTime`, `getCurrentPlayableDayIndex`, `setHours(0,0,0,0)` comparisons, etc.) uses device-local time.

Observed bug: a player whose device was set to **UTC** (while the game intended **US Eastern, UTC-4**) saw the "Go to sleep, man" screen ~4 hours early — her action deadline computed as `22:00 UTC` (= 6:00 PM her real time) instead of `22:00 EDT`.

**Goal:** the operator sets one IANA timezone per game (stored in `gameSchedule`). All players interpret every schedule wall-clock time and every "what day is it" question in **that** timezone, regardless of device settings.

> **Amended semantics (implemented):** every game ALWAYS has a shared zone — device-local is not an option for players. `TimezoneConfigItem` seeds `schedule.timezone` from the **operator's device zone** the first time the operator opens Config; from then on the stored value governs everyone. `resolveGameTimeZone` never returns `undefined`: it falls back to `getDeviceTimeZone()` for schedules that predate the field (results identical to the old device-local paths until the operator's config visit stamps it).

## Mental model — read this first

- `dayDatesArray` stores `"M/D/YYYY"` strings. These are **calendar dates**, not instants. They need no migration and no timezone — a calendar date is the same value in every zone.
- `parseStoredDayDates` returns `new Date(year, month-1, day)` — a **local-midnight Date used purely as a calendar-date token**. Only its `getFullYear()/getMonth()/getDate()` fields are meaningful. Keep this convention everywhere. Do NOT change what it returns.
- Schedule strings like `'22:00'` are **wall-clock times in the game zone**.
- `new Date()` / `Date.now()` are **absolute instants** — fine as-is.

There are exactly three kinds of operations, and only the first two need the timezone:

1. **"Wall time in game zone" → instant.** `buildScheduledDate(dayToken, '22:00')` must mean 22:00 in the game zone, producing a real ms instant comparable to `now`. **Needs tz.**
2. **"What calendar date is this instant?"** e.g. "is today the start date of day 3", "is it past midnight". Must be answered **in the game zone**. **Needs tz.**
3. **Calendar-token arithmetic/formatting.** `getDayEndDate`, `addDays` on tokens, `formatCalendarDateLabel(token)`, `${token.getMonth()+1}/${token.getDate()}` — pure calendar math. **No tz needed, leave alone.**

`formatCountdown` and `formatRelativeDuration` compare two absolute instants — **no change needed**.

## Step 1 — `types/multiplayer.ts`

Add an optional field to `GameSchedule` (around line 45):

```ts
export type GameSchedule = {
  // ...existing fields...
  /** IANA timezone name, e.g. "America/New_York". All schedule wall-clock
   * times (wakeUpTime, deadlines) are interpreted in this zone for every
   * player, regardless of device timezone. Absent = device-local (legacy). */
  timezone?: string;
};
```

## Step 2 — new file `utils/timezone.ts`

Intl-based helpers. No new dependency. Copy this implementation:

```ts
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
```

## Step 3 — `utils/multiplayer.ts`

Add `timeZone?: string` as a **trailing optional parameter** to every function that turns a calendar token + wall-clock time into an instant, or answers "what day is it". When `timeZone` is undefined, keep the existing device-local behavior exactly.

Concretely:

```ts
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
```

Then thread `timeZone?: string` through and pass it into `buildScheduledDate` in:

- `isDayReleasedAtTime(dayDate, time24, now, timeZone?)`
- `isNightWindowOpen(dayDate, deadlineTime24, now, timeZone?)`
- `getDayReleaseDate(dayDates, dayIndex, wakeUpTime24, timeZone?)`
- `isDayContentReleased(dayDates, dayIndex, wakeUpTime24, now, timeZone?)` (forwards to `getDayReleaseDate`)
- `getLatestReleasedDayIndex(dayDates, wakeUpTime24, now, timeZone?)` (forwards to `isDayContentReleased`)

`getCurrentPlayableDayIndex(dayDates, now = new Date(), timeZone?)`: when `timeZone` is set, replace the `normalizedToday`/`normalizedDays` local-midnight comparisons with day-value comparisons:

```ts
const todayValue = getZonedDayValue(now.getTime(), timeZone);
// compare against getDateTokenDayValue(dayToken) for findIndex/reduce
```

`getRelativeCalendarLabel(date, casing, now, timeZone?)` and its callers `formatContextualDateLabel` / `getContextualDayRangeLabel`: add a trailing optional `timeZone` used ONLY for the "today/yesterday/tomorrow" comparison — replace `getCalendarDayValue(now)` with `getZonedDayValue(now.getTime(), timeZone)` when a zone is given. The `date` argument is a day token, so `getCalendarDayValue(date)` / `getDateTokenDayValue(date)` is unchanged.

`normalizeGameSchedule`: add `timezone` to the returned object:

```ts
const timezone = schedule?.timezone; // may be undefined — see below
return { ...existing, timezone };
```

Leave it `undefined` when unset — do NOT stamp `getDeviceTimeZone()` inside `normalizeGameSchedule` (callers resolve it, see Step 5). Reason: config items write `{...schedule}` back to storage; silently stamping the zone would also stamp `wakeUpTime`-style fallback normalization, which is fine, but an explicit field keeps the diff predictable. Either way works; prefer leaving it undefined and resolving at use sites.

Add a small resolver export in `utils/multiplayer.ts` or `utils/timezone.ts`:

```ts
/** The zone all game timing uses. Every game shares one zone, set by the
 * operator (the config item seeds it from the operator's device on first
 * open). Schedules that predate the timezone field fall back to the device
 * zone, which produces identical results to the legacy device-local paths. */
export const resolveGameTimeZone = (schedule?: Partial<GameSchedule> | null): string => {
  const tz = schedule?.timezone;
  return tz && isValidTimeZone(tz) ? tz : getDeviceTimeZone();
};
```

## Step 4 — operator UI: `components/game/config/TimezoneConfigItem.tsx`

New config item following the exact pattern of `components/game/config/WakeUpTimeConfigItem.tsx`:

- `useValue<GameSchedule>(getGameScopedKey('gameSchedule', gameId), { defaultValue: defaultGameSchedule, privacy: 'PUBLIC' })`
- `const schedule = normalizeGameSchedule(gameSchedule.value);`
- Wrap in `ConfigSectionRow` with `title='Game timezone'` and subtext showing the effective zone.
- **Seeding:** a `useEffect` writes `{ ...schedule, timezone: getDeviceTimeZone() }` when the stored zone is absent/invalid (guarded on `isSyncing` and device-zone validity). This stamps the operator's device zone on first config open.
- **No unselect:** `allowUnselect={false}` — a zone is required; the dropdown value is `schedule.timezone ?? deviceTimeZone`.
- For the input, use `components/ui/forms/AppDropdown.tsx` (`AppDropdownOption[]` = `{ value, label }`) with a curated list of common zones plus the device's current zone:

```ts
const COMMON_TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Phoenix',
  'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu',
  'America/Toronto', 'America/Vancouver', 'America/Mexico_City',
  'America/Sao_Paulo', 'Europe/London', 'Europe/Dublin', 'Europe/Paris',
  'Europe/Berlin', 'Europe/Madrid', 'Europe/Amsterdam', 'Europe/Stockholm',
  'Europe/Athens', 'Africa/Lagos', 'Africa/Johannesburg', 'Asia/Dubai',
  'Asia/Kolkata', 'Asia/Bangkok', 'Asia/Singapore', 'Asia/Shanghai',
  'Asia/Tokyo', 'Asia/Seoul', 'Australia/Perth', 'Australia/Sydney',
  'Pacific/Auckland', 'UTC',
];
// merge in getDeviceTimeZone() if not already listed, label it e.g.
// "America/New_York (this device)"
```

- `onValueChange`: `setGameSchedule({ ...schedule, timezone: value })` (validate with `isValidTimeZone` first; `AppDropdown` options are all valid anyway).
- Register it in `components/game/ConfigPageOPERATOR.tsx`: import it and render `<TimezoneConfigItem gameId={gameId} />` inside the config `Column` (around line 153-161) — put it FIRST, before `ActionDeadlineConfigItem`, since it qualifies all the other time settings.

## Step 5 — thread `timeZone` through every call site

In every component that reads the schedule, after `const schedule = normalizeGameSchedule(...)` add:

```ts
const gameTimeZone = resolveGameTimeZone(schedule);
```

and pass `gameTimeZone` as the new trailing arg. Also replace every `new Date(x).setHours(0, 0, 0, 0)` day-boundary comparison with `getZonedDayValue(instantMs, gameTimeZone) ? getDateTokenDayValue(token)` comparisons when `gameTimeZone` is set (fall back to the old `setHours` comparison when it isn't — or simpler: write a local helper `const dayValueOf = (d: Date) => gameTimeZone ? getZonedDayValue(d.getTime(), gameTimeZone) : new Date(d).setHours(0,0,0,0)` and compare `dayValueOf(now)` vs `getDateTokenDayValue(token)`. Note `setHours` returns a number, so mixing is fine.)

### Confirmed call sites

| File | What to change |
|---|---|
| `components/game/YourEyesOnlyPagePLAYER.tsx` | `getCurrentPlayableDayIndex` (~line 83, 85), `isDayReleasedAtTime` (~92), `isNightWindowOpen` ×2 (~124-129), `isDayReleasedAtTime` in `hasWokenUp` (~143), `isPastMidnight` `setHours` comparison (~134), `isStartOfSelectedDay` `setHours` comparison (~141), `formatContextualDateLabel` (~153), `getContextualDayRangeLabel` ×3 (~159, 165, 172) |
| `components/game/YourEyesOnlyDayContentPLAYER.tsx` | `getCurrentPlayableDayIndex` (~120), `isDayContentReleased` (~132), `isNightWindowOpen` ×2 (~206, 209). ALSO audit the deadline math around `primaryDeadline`/`secondaryDeadline` (~380-510) — anywhere it builds a deadline `Date` from a day token + `schedule.*Time` string must go through `buildScheduledDate(..., gameTimeZone)` or equivalent. `formatCountdown`/`formatRelativeDuration` need no change. |
| `components/game/ReadOnlyNewspaperPagePLAYER.tsx` | `getCurrentPlayableDayIndex` (~36, 37), `isStartOfSelectedDay` `setHours` comparison (~53), `isDayReleasedAtTime` (~60), `formatContextualDateLabel` (~62), `getContextualDayRangeLabel` ×3 (~63-65) |
| `components/game/markdownEditor/PlayerPreviewModal.tsx` | `getContextualDayRangeLabel` (~111) — the operator previews what players see, so use the game zone. |
| `components/ui/daySelector/OperatorDayNavigation.tsx` | `getContextualDayRangeLabel` ×3 (~46-48). This component does not currently read the schedule — add `useSharedVariableValue({ key: getGameScopedKey('gameSchedule', gameId), defaultValue: defaultGameSchedule, userIds: ownerUserId ? [ownerUserId] : undefined })` (it already receives `ownerUserId` and uses this exact pattern for other keys). |
| `components/ui/daySelector/ComprehensiveDaySelector.tsx` | `getCurrentPlayableDayIndex` (~63). `addNewDay` (~110-128): `new Date()` as "first day" means "today in game zone" — build the token from `getZonedParts(Date.now(), gameTimeZone)` i.e. `new Date(p.year, p.month - 1, p.day)`. This is operator-side so read the schedule with `useValue(getGameScopedKey('gameSchedule', gameId), { defaultValue: defaultGameSchedule, privacy: 'PUBLIC' })`. |
| `components/ui/daySelector/DaySelector.tsx` | Same audit — it formats/writes day tokens (~34, 52, 104); token math needs no tz, but check for any "today" usage. |
| `components/game/PlayerDaysSection.tsx` | `getDayRangeLabel`-family usage (~23, 69) and `new Date()` as "today" (~79) — same treatment as ComprehensiveDaySelector. |
| `components/game/PlayerDaySelector.tsx` | Label helper (~28). |
| `components/game/NewspaperPage.tsx` | `new Date()` as first day (~54) — today-in-game-zone. Token formatting elsewhere is fine. |
| `components/game/NewWolffspointButtonAndDialogue.tsx` | `new Date()` usage (~40-48) at game-creation time — a new game has no schedule yet; device zone is acceptable, but note it in a comment. |

### Files that touched schedule/dates but need NO change

- `components/game/NewspaperPreviousDayVoteSummary.tsx` — only reads `schedule.publicVoting`.
- `components/ui/forms/FontDateInput.tsx`, `components/game/DaySelectionDialog.tsx`, `components/game/ScheduleTableUpdateDialog.tsx` — pure calendar-token formatting (`getMonth()`/`getDate()` on tokens) and min/max bounds between tokens. Leave alone.
- `formatTimeLabel` everywhere — formats the raw `'HH:MM'` string for display; zone-free by definition.

### Required sweep

After handling the table above, grep the whole codebase and resolve every remaining hit using the mental-model rules:

```
grep -rn "buildScheduledDate\|isNightWindowOpen\|isDayReleasedAtTime\|isDayContentReleased\|getDayReleaseDate\|getLatestReleasedDayIndex\|getCurrentPlayableDayIndex" components/ hooks/ utils/ --include="*.ts" --include="*.tsx"
grep -rn "setHours(0, 0, 0, 0)" components/ hooks/ --include="*.ts" --include="*.tsx"
```

Any call that lacks the timezone argument is a device-local-time bug waiting to happen. Any `setHours(0,0,0,0)` comparing `now` to a token is a "what day is it" question that must use `getZonedDayValue`/`getDateTokenDayValue`.

## Step 6 — remove the temporary sleep-screen debug logging

This was added to `components/game/YourEyesOnlyPagePLAYER.tsx` to diagnose the original bug. Remove ALL of it:

1. `import { useValue } from 'hooks/useData';` and `import { useToast } from 'contexts/ToastContext';` (added near the top, ~lines 11-12 — verify `useValue`/`useToast` aren't used elsewhere in the file before deleting).
2. The entire `// TEMP debug:` block (~lines 176-242): the `useValue('sleepWindowDebugLog')` call, `sleepDebugSnapshotRef`, `sleepDebugWrittenRef`, `showToast`, the big snapshot object, and the `useEffect` that writes `'noSleepWindow'` / `{ status: 'SLEEP_WINDOW', ... }`.
3. In `utils/dataConfig.ts`: delete the `sleepWindowDebugLog` entry (marked `// TEMP debug:`).
4. The kill switch from the earlier temporary removal: delete `const SHOW_SLEEP_SCREEN = false;` and its `// TODO` comment (~line 40), and change the render condition `{SHOW_SLEEP_SCREEN && isSleepWindow ? (` back to `{isSleepWindow ? (` (~line 300). The sleep screen should be live again once the timezone fix is in.
5. Optional: the stored `sleepWindowDebugLog` rows in the Convex `user_vars` table can be deleted manually — no code cleanup needed for that.

## Step 7 — verify

1. `npx tsc --noEmit -p tsconfig.json` — must pass with no new errors.
2. Existing games with no `timezone` in their stored `gameSchedule` must behave **identically to today** (device-local) — that's the `undefined` path.
3. Operator flow: open Config → set "Game timezone" to a zone different from the device → confirm it persists in Convex (`user_vars` row, key `gameSchedule-<gameId>`).
4. Reproduction check for the original bug: with game zone `America/New_York`, a device set to UTC should see the sleep screen between 22:00 and 08:00 **Eastern**, not UTC.
5. Sanity: `getCurrentPlayableDayIndex` returns the same index for devices in different zones viewing the same game near a day boundary (it will differ near midnight in the game zone — that's correct and intended).
6. DST edge: schedule a deadline on a date that doesn't exist in the zone (e.g. 02:30 on a spring-forward day) — `zonedWallTimeToInstantMs` resolves to a nearby real instant; acceptable.

## Notes / risks

- **Intl support**: Hermes (RN 0.81 / Expo 54) ships `Intl.DateTimeFormat` with `timeZone` on both platforms, and the app also runs on web. `getFormatter` guards with try/catch and falls back to device-local + `devWarn` if a zone is unsupported, so a bad stored value degrades gracefully rather than crashing.
- **Date objects are instants**: after this change, values returned by `buildScheduledDate`/`getDayReleaseDate` are real instants — do not call `.setHours()`/`.getDate()` on them expecting game-zone fields. Calendar fields only ever come from day tokens or `getZonedParts`.
- **`isPastMidnight` semantics**: "past midnight" must mean past midnight **in the game zone**, comparing `getZonedDayValue(now)` to `getZonedDayValue(laterDeadlineInstant)` — the deadline is an instant whose calendar date is only defined relative to a zone.
- **Sub-second wall times**: all schedule times are minute-precision; the offset calc floors to seconds — do not feed it sub-second instants expecting exact offsets (irrelevant in practice).
