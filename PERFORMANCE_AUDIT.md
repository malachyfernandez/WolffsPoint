# WolffsPoint Performance Audit — Findings & Recommendations

**Phase 1 deliverable, v2.** Instrumented copy at `wolffspoint-perf-audit/` —
mock Convex, fake auth, seeded dummy data, scripted tour of every screen/tab/
modal. Raw log: `sim/out/wolffspoint-perf-audit-2026-10-08T15-45-47.md`
(verified run, zero errors — see "Harness" below).

- **Test env**: headless Chrome 146, 1280×900, 12 cores, 20ms simulated backend
  latency. Mobile Safari will be worse on every render cost — the *ordering* of
  bottlenecks is what transfers.
- **Re-run**: `npm run web` → click **Simulate Everything** → export `.md`.
  Phone: `http://<LAN-IP>:8090` on the same wifi.

## The goal

**Navigation speed is the metric that matters.** Initial load is a budget to
spend — a slower first paint is an acceptable price for instant tab-to-tab
movement. Every recommendation below is ordered by what it does to *switching
between things*.

## Harness (v2 — state verification added)

v1 had a silent-failure class: a dialog that didn't close stayed on screen and
the tour measured *its* scroll instead of the page's. The harness now enforces
state, not just timing:

- **Stale-dialog precondition** — before every `navigate`/`tab`/`scroll` step,
  any still-open `[role="dialog"]` is logged as an error *and* force-closed, so
  one failure can't contaminate everything after it.
- **Post-action verify** — modal opens must produce a `[role="dialog"]`; modal
  closes must leave zero; tab clicks must flip the button's `is-active` class.
  Failures render as ⚠️ error steps in the report.
- **Real close path** — dialogs close via their own `[aria-label="Close"]`
  control (the user path). Note: Escape does **not** close dialogs on web
  (finding F9 — a real app bug, not just a harness issue).
- **Page-only scroll targets** — scroll steps ignore scrollables inside
  dialogs.

Verified run: the nightly certification dialog now measures a **real ~280–540ms
close** (v1 reported a fake 3ms because Escape was a no-op). The verification
layer also caught a real lab-store bug — `simUi.closeModal()` mutated state
in place without a new snapshot, so lab-dialog X buttons silently did nothing
(`useSyncExternalStore` sees a reference-equal snapshot → no re-render). Fixed
in `sim/perf/uiState.ts`; this was the root cause of the stuck nightly modal.

---

## Findings — ordered by navigation impact

### F1 · Warm tab switches re-render anyway: 90–1600ms per click · THE BUG

Tabs lazy-mount once, then stay mounted and are re-shown on click. But the
un-hide isn't free — measured warm revisits from the verified run:

| Tab | Warm revisit settle | What happens |
|---|---|---|
| op:newspaper | **726–866ms** | 3 commits but a long task + re-layout |
| op:rulebook | **500–1067ms** | plus the StickyTocButton churn underneath |
| player:phoneBook | **1226–1600ms** | the 1s `setNow` ticker means the page never sits still |
| newser:phoneBook | **1252ms** | same |
| op:players | 191–434ms | 4–5 commits |
| op:forum | 239–257ms | 4 commits |
| op:nightly | 124–346ms | 4–5 commits |
| op:config | 154–600ms | 4 commits |

Rapid all-tab cycle: **1542ms** total. The kept-alive model is the right
architecture for fast navigation — the problem is the show path re-runs render,
layout, and query re-validation instead of being a pure visibility flip.

> **Fix direction**: make hidden tabs fully inert — `content-visibility: hidden`
> + freeze the subtree so showing a tab costs a style change, not a render.
> A warm switch should be <50ms.

### F2 · Cold mounts still sting on first click: 0.75–2.1s · HIGH

Cold mounts: op:config **2098ms**, op:nightly **1891ms** (worst single long
task 684ms), op:rulebook 803ms, op:newspaper 769ms, op:forum 748ms,
player:ruleBook/phoneBook hit the 8s churn ceiling (see F4).

> **Fix direction — and this is where your 4s budget buys real speed**: mount
> ALL tabs during the initial game-open (you're already paying ~3.6s there, and
> the browser is idle-ish between long tasks). First clicks then pay warm cost
> instead of cold. **But it only pays off if F1 lands too** — otherwise eager
> mounting just moves the render cost around without removing it.

### F3 · Game open: ~3.6s settle, 16 long tasks, 523 commits · HIGH (but useful)

`open game: SIMOP1234` — first paint in 4ms, then **3572ms** of work: 16 long
tasks (worst 442ms), p95 frame **400ms**, 1762 DOM mutations, 528 query
subscriptions opened, ~500 backend writes (F5). Player/newser games: ~2.4s.

This is currently a wall of synchronous work. If F1+F2 land, this is the budget
where eager mounting should happen — chunked across frames so the shell stays
interactive while tabs mount behind it.

### F4 · Three screens never stop working · HIGH (competes with every navigation)

Rulebook and phonebook (all roles) hit the 8s settle cap — content paints in
<80ms but the DOM mutates forever: **675–1018 mutations per 8s window**. While
one of these is the active tab, every navigation competes with it for the main
thread.

- `StickyTocButton.web.tsx` — `setInterval(update, 200)`; each tick writes
  inline styles and runs `elementFromPoint` for **every pixel row of viewport
  height** (~900 hit-tests, 5×/second).
- `PhoneBookPagePLAYER`, `YourEyesOnlyPagePLAYER`, `ReadOnlyNewspaperPagePLAYER`,
  `StatusIconButton`/`StatusButton` — 1s `setNow` intervals re-rendering for
  relative timestamps.

> **Fix direction**: `IntersectionObserver` for the TOC (fires on section
> change only); a shared `useNow()` store at the coarsest needed precision for
> the tickers. These also explain why phonebook warm revisits measure 1.2–1.6s.

### F5 · Write amplification on mount: ~500 mutations per game open · HIGH

`useUserVariable`/`useUserList` auto-create a record on mount when a key is
missing. First visit to a fresh game = hundreds of `user_vars:set` calls in one
burst. In the mock they're ~0.1ms; **in production each is a real network
mutation that also revalidates every live subscription** (668 by tour end). The
app's own rate limiter already tripped on this in an earlier run.

> **Fix direction**: don't persist default-equal values; treat "absent" as
> "default" on read. Batch or defer creation. Matters more if F2 eager-mounts
> (the burst gets bigger) — fix alongside it.

### F6 · Scroll drives React re-renders · HIGH (scroll + steals frames during nav)

- `TownSquareThreadListView.tsx:136` — `onScroll → setThreadListScrollY`:
  React setState per scroll event, unthrottled → ~121 commits/scroll.
- `scroll: operator nightly` — **210 commits** in one scroll window; newspaper
  131, roles table 99.
- `GamePage.tsx:57–71` — `useAnimatedScrollHandler` + `useAnimatedStyle` writing
  `filter: blur(...)`. **Reanimated on web has no UI thread** — each scroll
  frame re-renders a React component, and `filter: blur` repaint is expensive
  on Safari specifically. The render-time `.value` warnings confirm it.
- `scroll: operator rulebook` — p95 frame 67ms (~15fps).

> **Fix direction**: persist scroll position on scroll-end/unmount, not
> per-event; replace the scroll-linked blur with opacity or a static treatment.

### F7 · Subscriptions accumulate forever: 18 → 668 · MEDIUM (resident cost)

Active data subs never decrease — every visited tab and opened/minimized
dialog keeps its queries. Costs: (a) every write revalidates a bigger subscriber
set (compounds F5), (b) heap grew to ~480MB in one session. Not an interaction
cost directly — it's the tax on the keep-mounted model.

> **Fix direction**: only act after F1–F4. If hidden tabs still need live data,
> keep them; if snapshots suffice, pause subs while hidden/minimized.

### F8 · Thread list ↔ detail: ~700ms each way · MEDIUM

`list → detail` 699ms, `detail → list` 775ms — with single 366–411ms long tasks
on each transition. The most frequent in-game navigation in Town Square. Part
of the back-nav cost is the list re-render from scroll-position bookkeeping
(F6).

### F9 · Real bugs found · BUG

- **Escape never closes dialogs on web.** Verified: dispatching Escape at
  document *and* directly at the `[role="dialog"]` element leaves it open. The
  `CloseButton` shows an `esc` hint on hover that doesn't work — broken UX on
  desktop web.
- `Unexpected text node` warning on every boot — a literal text child inside a
  `<View>` somewhere.
- `hasCompletedInitialDaySetup` self-heal write loop (v1 finding) — app hits
  its own mutation rate limiter when the var is absent.
- Minimize → restore works and is cheap: **288ms / 192ms**.

### F10 · Modals are healthy · INFO

~38 dialogs exercised. Typical open 60–260ms; heaviest `MarkdownEditorDialog`
347ms, `PlayerPreviewModal` 317ms. **Real closes cost 150–540ms** (v1's ~3ms
closes were a broken-Escape artifact) — worth a look but not urgent.

---

## Phase 2 — recommended order (navigation-first)

| # | Fix | Evidence | Win | Risk |
|---|-----|----------|-----|------|
| 1 | Inert hidden tabs — `content-visibility` + frozen subtrees so warm switch ≈ <50ms | F1 | **The core complaint** | Low-Med |
| 2 | Eager-mount all tabs inside the initial-load budget | F2, F3 | First clicks become warm | Med |
| 3 | Kill perpetual churn (StickyTocButton → IntersectionObserver; shared `useNow`) | F4 | Frees main thread during every nav | Low |
| 4 | Stop scroll-linked React renders (scrollY persistence, web blur) | F6 | Smooth scroll + fewer stalls | Low |
| 5 | Var defaults don't write; batch auto-creates | F5 | Kills the mount-time write storm | Med |
| 6 | Fix Escape-closes-dialog on web (or drop the hint) | F9 | Correctness, cheap | Low |
| 7 | Subscription diet for hidden/minimized surfaces | F7 | Resident cost | Med-High |

**Not touching**: modal open/close machinery, dialog visuals, the keep-mounted
tab model itself (it's the *right* model — it just needs cheap show/hide),
`CLIENT_VERSION`, the original repo until Phase 2.

## Caveats

- Mock can't reproduce network cost — F5 and F7 are *understated* in prod.
- 8s "settle" steps mean "never stops churning," not "8s to appear" — first
  paint on those steps is <80ms.
- Headless numbers have run-to-run variance (config cold was 735ms in v1,
  2098ms in v2) — treat individual ms as ±30%, trust the ordering.
