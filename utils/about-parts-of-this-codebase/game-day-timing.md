# Game Day Timing

## Modes

A game's `gameSchedule.dayMode` picks the timing model:

- **`'calendar'`** (default/absent): each in-game day spans real calendar days. Deadlines are wall-clock times plus before-final-day offsets.
- **`'hour'`**: Hour Game. Each day is a start instant that runs until the next day begins; the last day runs the default length. Deadlines are relative leads (`end − leadMinutes`), wake-up/release is `day start + wakeUpOffsetMinutes` (0 = immediate).

Separate from `dayMode`, individual calendar days can still be fixed-duration timed rounds (`dayDurationUnit` = hours/minutes).

## Controls

- New-game creation asks Calendar vs Hour Game. Hour Game seeds day 1 at the chosen start time (default 5:00 AM) and writes `dayMode: 'hour'` plus the relative fields into `gameSchedule`.
- Settings > Day mode converts between modes. Calendar → hour re-times every existing day in place (each keeps its date, starts at the schedule's wake-up time, marked non-inheriting). Hour → calendar is destructive: it wipes all days plus index-keyed lists (`selectedDayIndex`, `skipActionsDays`, `skipVotingDays`) and clears the hour fields. Both directions confirm explicitly.
- Hour-mode config uses `RelativeTimeInput` ("N hours M minutes") for day length, action lead, vote lead, and wake-up offset. Zero is valid for leads/offsets; day length is min 1 minute.
- Day Options on an hour day edits the start time and, for day 2+, a "same date as previous day" (inherit) checkbox. Edits must keep the sequence strictly increasing; a follower that inherits rolls forward automatically.
- Day-bar labels come from `getDayRangeLabel`/`getContextualDayRangeLabel`: `5am`, `5:30am`, prefixed with the date only when the calendar date changes (or on day 1).
- Simulation clock steppers pick 1-minute steps when the _current_ day's real span (or stored round length) is under an hour, else 1-hour steps.

## Storage

The existing `useList<number>('numberOfRealDaysPerInGameDay', gameId)` remains the canonical default duration (fractional days). In hour games it is the fallback length for the last day and the spacing for newly added days.

`gameSchedule` additions: `dayMode`, `dayDurationUnit` (calendar display/creation unit), `actionDeadlineLeadMinutes`, `voteDeadlineLeadMinutes`, `wakeUpOffsetMinutes`. `normalizeGameSchedule` must preserve all of them when other schedule settings are edited.

`dayDatesArray` remains a public list of strings:

```text
Calendar day: "10/17/2026"
Timed round: {"start":"2026-10-17T15:20:30.000Z","durationMinutes":5,"unit":"minutes"}
Hour-game day: {"start":"2026-10-17T05:00:00.000Z","hour":true,"inherit":false}
```

Always read with `parseStoredDayDates` and write with `serializeGameDayDate`. Instant-based Date objects carry module-local WeakMap metadata; blindly cloning them with `new Date(...)` or manually formatting MM/DD/YYYY loses their duration/inheritance flags. Write paths must also pass the array through `resolveHourDaySequence` before serializing so an edited date cascades through days that inherit it.

`migrateDayDatesToHourMode(storedDates, schedule)` converts calendar/timed entries to hour-day storage, anchoring each at the schedule's wake-up time (timed rounds keep their start instant).

## Scheduling

- Hour-day ends: next day's start, or `start + default length` for the last day (`getDayEndDate`).
- Hour deadlines: `end − actionDeadlineLeadMinutes / voteDeadlineLeadMinutes`. A lead of 0 keeps submissions open until the next day starts.
- Hour release: previous day's start + `wakeUpOffsetMinutes` (`getDayReleaseDate`/`isDayReleasedAtTime`). 0 = available at the day transition.
- `resolveHourDaySequence` re-derives inheriting days: each takes the previous day's game-zone date at its own wall-clock time, rolling forward until strictly after the previous start (an 11pm day followed by a 1am day lands on the next date).
- Timed starts are UTC instants, rendered in the game timezone. Fixed-minute durations use elapsed milliseconds across DST; calendar schedules continue using wall-clock helpers.
- Script globals expose instant `dayDates` (timed or hour) as ISO start strings rather than leaking the internal envelope.
- Day-indexed records (`skipActionsDays`, `skipVotingDays`, `selectedDayIndex`) survive calendar→hour conversion (indices are preserved) but are reset on revert since days are wiped.
- Day removal lives in `DaySelectionDialog` (Day Options): a red "Remove Day" button (secondary line names the following days) opens `RemoveDaysDialog` to confirm. Only end-anchored cuts are possible: removing a middle day drops it plus all later days (`dayDatesArray.slice(0, index)`), trims the skip lists below the cut, and clamps `selectedDayIndex`. Day 1 can't be removed, so at least one day remains. Day-indexed content (cells, submissions, newspapers) is intentionally left stored: a re-added day reuses its index and the content resurfaces.

## Checks

Run `npm run test:game-days`, `npm run test:cell-modules`, and `npx tsc --noEmit`.
The timing tests cover legacy schedules, persistence, same-date rounds, exact deadline boundaries, final-round release, unit conversion, DST, timezone labels, default changes, returning to calendar scheduling, hour-day round trips/labels/inheritance, relative deadlines/release, and the calendar→hour migration.
