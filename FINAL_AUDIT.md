# WolffsPoint — Final Performance Audit & Phase 2 Plan

**Basis**: three full verified tours (164 steps each, zero errors, zero state
violations) — headed Chrome 154, Zen/Firefox 157, real iPhone Safari 18.7 —
plus keyed write instrumentation. Reports in Downloads + `sim/out/`.

**The goal, restated**: kill **lag spikes**. Instant tab switch → content fades
in as ready beats a blocked 2s mount. Cold loads may stay lazy; the keep-mounted
/ stay-subscribed Convex model is *kept* (it avoids re-paying subscription costs
on revisit). Preserve look & functionality exactly.

---

## 1. Cross-browser summary

| Step | Zen (desktop) | iOS Safari | Chrome (desktop) |
|---|---|---|---|
| open game (operator) | 3359ms | 4585ms · **p95 frame 2372ms** | 4664ms · 16 long tasks (worst 327ms) |
| cold tab: config | 2063ms | 2262ms | 1069ms (worst LT 462ms) |
| cold tab: nightly | 1932ms | 2085ms | 2114ms (worst LT 822ms) |
| warm revisit: typical | 136–291ms | 269–399ms | 140–267ms |
| warm revisit: newspaper | 724–792ms | 803ms | 765–799ms |
| warm revisit: phonebook | ~1.2–1.5s | ~1.5s | ~1.2–1.5s |
| rapid cycle (6 tabs) | 1574ms | 1706ms | 1500ms |
| thread list ⇄ detail | 763 / 795ms | 789 / 767ms | 733 / 767ms (single LTs 363–425ms) |
| config → rulebook / phonebook subpage | ~8.0s settle timeout | ~7.9s | ~8.0s |
| rulebook scroll | 3094ms, p95f 59ms | 3079ms, p95f 60ms | 3098ms |
| game-open backend writes | ~500 `user_vars:set` | ~500 | ~500 |
| subs: after open / after tabs / end | 285 / 455 / 669 | same | same |

Reads:

- **Settles are similar across browsers; the *shape* of the cost differs.** iOS
  delivers the game-open mount as a **single ~2.4s frozen frame** (p95 2372ms)
  vs Chrome's 233ms + 16 long tasks. Same work, but on iPhone it's one solid
  hang — that's the lag-spike feel.
- iOS warm revisits run ~1.5–2× desktop (players 315–399ms vs ~200ms). Every
  interaction carries a bigger worst-frame on mobile.
- Long-task API doesn't exist on Firefox/Safari — frame p95 is the spike metric
  there. Chrome shows the underlying reality: 105–822ms single long tasks during
  tab actions.
- Newspaper is the worst warm revisit on **all three** browsers (~750–800ms) —
  it's not browser noise, it's the tab's reveal cost.
- Rulebook/phonebook subpages hit the 8s settle cap on every browser — they
  never stop churning (see F4).

## 2. Root causes, ranked by effect on lag spikes

### F1 — Warm tab switch pays a full re-layout of the hidden subtree 🔴

`OperatorGamePage.tsx` (same pattern in `PlayerGamePage`/`NewserGamePage`) keeps
visited tabs mounted under `display:none → flex` wrappers (lines 72–125). On
every switch:

- the incoming subtree pays a **full style/layout/paint** of thousands of DOM
  nodes (warm revisits: 150–800ms settle, tiny DOM-mutation counts — it's
  layout, not data churn);
- `BodyReportScope enabled={…}` flips a context value in **both** subtrees →
  all 33 `useBodyReportEnabled`/`registerContainer` consumers re-render;
- a new `profile` object is built every render → the forum subtree re-renders
  even while hidden.

**Fix**: replace `display:none` with keep-laid-out hiding —
`content-visibility: hidden` (supported Chrome 85+, FF 125+, Safari 18.0 — all
three tested browsers qualify) or `visibility:hidden + position:absolute` if
layout must stay fresh. Show becomes a paint flip, ~instant. Memoize `profile`.
Gate the `enabled` context so it only notifies on real mount/unmount.

### F2 — ~500 backend writes + ~480 subscriptions on game open 🔴 (smoking gun)

Keyed write log shows the burst is almost entirely **`saveHistory:*` auto-creates**:

```
user_vars:set[saveHistory:action:SIMOP1234:{player}:{day}]   × ~240
user_vars:set[saveHistory:vote:SIMOP1234:{player}:{day}]     × ~240
user_vars:set[saveHistory:tagCell:SIMOP1234:{p}:{d}:{tag}]   × ~96
user_vars:set[__saveHistory_unused__], [playerPageColumnSizes-…]
```

Mechanism: `useSaveHistory` → `useValue` → `DataSubscriber` →
`useUserVariable`, whose documented behavior is "auto-create if missing and
defaultValue provided" (`useUserVariable.ts` ~L114). **Every mounted editor
dialog in every table cell does this on mount** — before the dialog is ever
opened. In production that's ~500 network mutations + ~480 permanent
subscriptions per game open; each write also invalidates/revalidates the whole
sub tree. Null-`historyKey` dialogs all share one `__saveHistory_unused__` var.

**Fix**: add `autoCreate?: false` to `useUserVariable`/`useList` (missing record
⇒ return `defaultValue`, create on first explicit set). Pass it from
`useSaveHistory`. Optionally gate the hook on `isOpen` to drop the ~480 subs
too. Also stops `playerPageColumnSizes` mount writes — first resize creates it.
Zero UI change: history was always async; "no record" and "empty history"
render identically.

### F3 — Game open is one mount burst; on iOS it's a 2.4s frozen frame 🔴

525 React commits and ~890 DOM mutations in the open window; `app-root`
profiler: 2.5–3.0s. Chrome splits it into 16 long tasks (327ms worst); iOS
delivers it as a **single 2372ms frame** — the entire app is dead for 2.4s.

**Fix**: chunk the mount, don't defer it — mount the players table
progressively (rows in slices via `requestIdleCallback`/time-sliced renders)
and wrap the game-open + tab-switch transitions in `startTransition` so urgent
input (tab taps) preempts background mounting. Same final DOM, but no single
frame can hang.

### F4 — `StickyTocButton.web.tsx`: 200ms interval × ~900 `elementFromPoint` 🔴

`setInterval(update, 200)`; each tick writes inline styles **and** hit-tests up
to `window.innerHeight` points. This is why config→rulebook and
config→phonebook *never settle* (8s cap, all browsers) and why rulebook scroll
measures a 3.1s window at ~15fps.

**Fix**: IntersectionObserver on section headers (or scroll-position math).
Constant cost → zero when idle, O(1) per scroll event.

### F5 — Per-second tickers keep pages permanently non-quiet 🟡

`PhoneBookPagePLAYER`'s 1s `setNow` (and siblings in `YourEyesOnlyPagePLAYER`,
`ReadOnlyNewspaperPagePLAYER`, `StatusIconButton`) re-render forever → phonebook
warm revisit "settles" at 1.2–1.5s only because the window never goes quiet.

**Fix**: one shared clock context; tick at the coarsest displayed precision;
pause when the tab/page is hidden (`document.visibilityState` or the
`enabled` context that already exists).

### F6 — Scroll → React work per event 🟡

- `TownSquareThreadListView.tsx:136` — `onScroll → setThreadListScrollY`
  unthrottled setState per scroll event.
- `GamePage.tsx` — Reanimated `useAnimatedScrollHandler`/`useAnimatedStyle` for
  the web logo blur. On web there's no UI thread: every scroll frame re-renders
  the host component. The runs emit a **continuous flood** of "Reading from
  `value` during render" warnings — dozens per second during any scroll.

**Fix**: throttle/scrollY into a ref+`requestAnimationFrame` flush (or move to
CSS-only state); on web, implement the logo blur with a plain `position:sticky`
+ CSS `backdrop-filter`/`filter` (or accept a static blur) and drop the
Reanimated path on `Platform.OS === 'web'`.

### F7 — Escape never closes dialogs (real app bug) 🟡

Verified: synthetic *and* trusted Escape at `document`/dialog level does
nothing; `CloseButton` even shows an `esc` hint. Check HeroUI's
`isKeyboardDismissDisabled`/portal keydown listener in `ConvexDialog` — a
one-line-ish fix with real UX payoff.

### F8 — Subscription accumulation: 18 → 669 🟡

End-of-tour active subs: 669 on all browsers. Kept-alive tabs + minimized
dialogs + per-cell `saveHistory` subs all persist. Keeping subs is the *right*
call (your Convex-cost priority), but ~480 of them are the useless history subs
from F2 — killing those leaves ~190 legit subs. Remaining risk is invalidation
fan-out: any backend write wakes all live subs' re-render paths → freeze hidden
subtrees (F1's fix doubles as this).

### F9 — Modal open/close is fine; minimize is the keeper 🟢

Opens 60–260ms, closes 180–250ms (iOS ~250ms close vs ~185 desktop — the exit
animation). ~38 dialogs exercised, minimize/restore verified. No action beyond
the F2 subscription cleanup and Escape fix.

### F10 — Incidental

- `Unexpected text node` — a stray text node inside a `<View>` somewhere;
  cosmetic on web, find via the console stack and remove.
- Chrome heap 137→544MB over the tour — mostly modal-lab accumulation (matches
  the keep-mounted design), but worth a real-world memory sanity check later.

## 3. Phase 2 plan — ordered

| # | Change | Files | Lag-spike killed | Risk |
|---|---|---|---|---|
| 1 | `autoCreate:false` on `useUserVariable`/`useList`; apply via `useSaveHistory`; skip storage when `historyKey=null` | `hooks/useUserVariable.ts`, `hooks/useUserList.ts`, `hooks/useSaveHistory.ts`, `hooks/useData.ts` | the ~500-write storm + ~480 subs on every game open | low — verify history reads still populate |
| 2 | `content-visibility:hidden` (fallback `visibility`) for inactive tab panes; memoize `profile`; context-flip gating | `OperatorGamePage.tsx`, `PlayerGamePage.tsx`, `NewserGamePage.tsx` | warm-switch 150–800ms → ~paint flip | med — `onLayout`/measure code in hidden tabs (the existing `enabled` flag already models this) |
| 3 | `startTransition` on tab/game switches; progressive mount of the players table | `OperatorGamePage` handlers, `PlayerPageOPERATOR`, `MainPage.tsx` | the 2.4s iOS frozen frame; cold-mount 500–800ms single tasks | med |
| 4 | Rewrite `StickyTocButton.web` → IntersectionObserver | `components/game/ruleBook/StickyTocButton.web.tsx` | perpetual churn, 15fps rulebook scroll, never-settling screens | low |
| 5 | Shared ticker context + hidden-pause | `PhoneBookPage*`, `YourEyesOnlyPagePLAYER`, `ReadOnlyNewspaperPagePLAYER`, `StatusIconButton` | phonebook 1.2–1.5s "settles", idle CPU | low |
| 6 | Throttle `onScrollYChange`; web-appropriate logo blur (CSS), audit Reanimated-on-web | `TownSquareThreadListView.tsx`, `GamePage.tsx` | scroll jank + warning flood | low-med |
| 7 | Escape-to-close fix in dialog layer | `components/ui/dialog/*` (ConvexDialog wrapper) | stuck-modals-by-keyboard UX bug | low |
| 8 | `__saveHistory_unused__` cleanup + `Unexpected text node` | `useSaveHistory.ts`, TBD | correctness/cosmetic | low |

**Explicitly NOT doing**: unmounting visited tabs, unsubscribing on hide, or
eager-mounting all tabs upfront — all three trade against your stated
priorities (re-pay Convex costs / lag spikes vs load time).

## 4. Acceptance criteria (re-runnable)

Re-run the same tour after Phase 2 on Chrome + iOS Safari; targets:

| Metric | Now | Target |
|---|---|---|
| warm tab revisit settle | 150–800ms | < 100ms, p95 frame < 50ms |
| game-open worst frame (iOS) | 2372ms | < 600ms |
| backend writes on game open | ~500 | < 20 |
| active subs after all tabs | 455 | < ~150 |
| rulebook/phonebook subpage settle | 8s timeout | < 1s |
| rapid 6-tab cycle | 1.5–1.7s | < 600ms |
| thread list ⇄ detail | ~750ms each way | < 350ms |
| state violations | 0 | 0 (kept by harness) |

## 5. Caveats

- Mock backend is ~0ms local; production adds real latency to every
  `user_vars:set` — F2 is *worse* in prod than measured, not better.
- "Settle" = DOM-quiet window; 8s steps mean "never stops mutating," not "takes
  8s to show." First-paint numbers are in the raw reports per step.
- Subscription counts are app-level registrations, not necessarily unique
  Convex queries — the store dedupes by subId.
- iOS frame timings use rAF deltas; the ~35ms idle baseline is the harness's
  own rAF cost floor, not app jank.
