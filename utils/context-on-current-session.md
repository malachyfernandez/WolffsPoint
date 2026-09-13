# Context: LoadingContainer `keepMounted` Conversion + Site-wide Loading Audit

## The task (verbatim request)

> "let's just go around and one by one replace them with loading containers that have it always set to mount. set that to the new default once u do and remove the prop explicitly setting it.
>
> Then go through and do a comprehensive audit of the whole site and add them where it makes sense. ideally most every screen that has something load in should use it. most places using loading text were just made before this component was made."

Broken down:

1. Convert every existing `LoadingContainer` call site so children stay mounted while loading (the new `keepMounted` behavior).
2. Make `keepMounted` the **default** in `LoadingContainer` (so `keepMounted` no longer needs to be passed — remove the explicit prop at call sites). Consider whether to keep an opt-out prop (e.g. `keepMounted={false}`) for any call site that genuinely needs unmount semantics.
3. Audit the entire app for places that render loading states manually (direct `<LoadingText>` usage, `=== undefined` early returns, custom `isLoading`/`isSyncing`/`showLoading` gates, `ActivityIndicator`, etc.) and wrap them in `LoadingContainer` where it makes sense.

## Project background

- **WolffsPoint** — React Native / Expo web app, Convex backend, TypeScript `strict: true`, Reanimated, NativeWind `className` styling.
- Repo root: `/Users/malachyfernandez/Documents/1-programing/apps-and-sites/wolfspoint/wolffspoint`
- Dev server: `npm run web` (expo start --web) → http://localhost:8081
- Typecheck: `npx tsc --noEmit --project tsconfig.json`
- AGENTS.md rules worth knowing: read `convex/_generated/ai/guidelines.md` before touching `convex/`; all editable dialogs need an unsaved-changes confirmation (canonical impl: `app/components/game/MarkdownEditorDialog.tsx`).

## Three game roles

`GamePage` picks a role page after loading game/user/newser-assignment data:

- **Operator** (`OperatorGamePage`) — owns the game. Tabs: players, config (roles), nightly, forum, newspaper, rulebook (config).
- **Newser** (`NewserGamePage`) — valid newser assignment, not operator. Tabs: townSquare, newspaper, ruleBook, phoneBook. Wrapped in `ParticipantAccessGate`.
- **Player** (`PlayerGamePage`) — everyone else. Tabs: townSquare, newspaper, eyesOnly, ruleBook, phoneBook. Wrapped in `PlayerAccessGate`.

Each role page keeps ALL tab bodies mounted; inactive tabs are hidden via `display: none` (deliberate — preserves dialog state across tab switches).

## LoadingContainer (`app/components/ui/loading/LoadingContainer.tsx`)

Signature:

```tsx
<LoadingContainer
  dependencies={DependencyItem[]}   // undefined | {state:{isSyncing:true}} | false → loading
  loadingText="Loading X"
  loadingDelayMs?                   // delay before showing the text
  className?
  fadeInDuration?                   // default 300
  keepMounted?                      // NEW — see below
  onReady?                          // fires fadeInDuration ms after isLoading→false
>
```

Two modes:

- **Default (`keepMounted=false`)**: while `isLoading`, returns only centered `LoadingText`; children do not mount. When ready, children mount with `entering={FadeIn.duration(fadeInDuration)}`.
- **`keepMounted=true`** (new, added this session): children are ALWAYS mounted inside `<Animated.View style={{opacity: contentOpacity, pointerEvents}}>`; a shared value fades 0→1 over `fadeInDuration` once deps resolve (can't use `entering` — children are already mounted by then). While `isLoading`, an `absolute inset-0` overlay shows `LoadingText` and `pointerEvents: 'none'` blocks interaction.

Why `keepMounted` is safe here: `strict` TS means hooks return `T | undefined` and all children already handle it (verified — no `!`/`as` on dep data). Remaining behavioral differences: children effects/subscriptions run during load; invisible children occupy layout height (actually reduces jump); wrong intermediate states (e.g. `isGameDeleted` flash) are invisible under opacity 0.

## BodyReadiness system (built this session — interacts with the task)

Game-page body uses a registration system so the outer container only fades in once ALL nested loaders finish loading AND finish their fades.

- `contexts/BodyReadinessContext.tsx`
  - `BodyReadinessProvider({ outerReady, onAllReady, children })` — tracks `pendingRef: Map<id,label>`; fires `onAllReady` once `outerReady && pending.size === 0` (latches via `firedRef`).
  - `registerContainer(label?) → id`, `reportReady(id)`, `unregisterContainer(id)`.
  - `BodyReportScope({ enabled, children })` — context flag; descendants only register when `enabled`. Role pages wrap each tab body: `<BodyReportScope enabled={activeTab === 'x'}>` — REQUIRED because `display:none` children never get `onLayout` (deadlocked `NewspaperDayView` in the inactive newspaper tab was the bug this fixed).
- `hooks/useBodyLoadReport.ts`
  - `useBodyLoadReport(isLoading, fadeDuration = 300, label = 'component')` — registers on mount (if `enabled`), reports ready `fadeDuration` ms after `isLoading`→false, unregisters on unmount. No-op when no provider above.
  - `LoadingContainer` calls it internally: `useBodyLoadReport(isLoading, fadeInDuration, \`LoadingContainer(${loadingText})\`)`. When a `LoadingContainer` sits ABOVE the provider (like the GamePage outer one), it's a no-op — no deadlock.

### Current GamePage gate structure (`app/components/game/GamePage.tsx`)

```tsx
const [allLoadsDone, setAllLoadsDone] = useState(false);
const [mountSettled, setMountSettled] = useState(false);   // 50ms after mount — guards premature "zero pending" fire
// ...
<LoadingContainer
  dependencies={[allLoadsDone]}
  loadingText="Loading game"
  className="flex-1"
  keepMounted                          // ← will become the default; remove this prop then
  onReady={handleFadeComplete}>        // → calls MainPage onReady once → TopSiteBar appears
  <BodyReadinessProvider key={gameId} outerReady={mountSettled} onAllReady={() => setAllLoadsDone(true)}>
    <ShadowScrollView>
      {isOperator ? <OperatorGamePage/> : isNewser ? <NewserGamePage/> : <PlayerGamePage/>}
    </ShadowScrollView>
  </BodyReadinessProvider>
</LoadingContainer>
```

`MainPage` holds `isGameBodyReady` and conditionally renders `TopSiteBar`'s code/home controls on it (fade was removed; it appears when the body fade completes). `GameTabBar` also has no fade now — it rides the single outer fade.

### Components already reporting via `useBodyLoadReport`

| File | Reports |
|---|---|
| `LoadingContainer.tsx` | `isLoading` + fadeInDuration |
| `ParticipantAccessGate.tsx` | `!hasLoaded` (userData + profile sync) |
| `PlayerAccessGate.tsx` | `!hasLoaded` (userData, operator, userTable, profile, customUserInfo) |
| `PlayerPageOPERATOR.tsx` | `showLoading` (syncing + hasInitiallyLoaded + all columns ready) |
| `RolesPageOPERATOR.tsx` | `isSyncing \|\| !hasInitiallyLoaded` |
| `NightlyPageOPERATOR.tsx` | `showLoading` |
| `NewspaperDayView.tsx` | `!isFullyReady` (data + image preload + layout `onReady` from `NewspaperZoomableView`) |
| `RuleBookPagePLAYER.tsx` | `isLoading` (3 queries undefined) |
| `PhoneBookPagePLAYER.tsx` | `isLoading` (profile sync + phonebook) |

## Existing `LoadingContainer` call sites (the conversion list)

1. `app/components/game/GameList.tsx:24` — `dependencies={[archivedGames]}`, "Loading games"
2. `app/components/game/JoinedGameListItem.tsx:46` — `dependencies={[gameInfo]}`, "Loading games"
3. `app/components/game/ProfileInfo.tsx:46` — `dependencies={[userData, customUserInfo]}`, "Loading profile..."
4. `app/components/game/ReadOnlyNewspaperPagePLAYER.tsx:89` — `dependencies={[scheduleRecord.record]}`, "Loading newspaper"
5. `app/components/game/TownSquarePagePLAYER.tsx:123` — `dependencies={[]}` (always ready; children take an `isLoading` prop instead), "Loading Town Square"
6. `app/components/game/GamePage.tsx:141` — the new `keepMounted` gate

Note: `TownSquarePagePLAYER` passes `dependencies={[]}` — it's effectively never loading via the container (its own `isLoading` is passed down to children). Decide during conversion whether it should report its real `isLoading` instead.

## Audit candidates — direct `LoadingText` / manual loading returns

These render loading UI without `LoadingContainer` (likely predate it). Evaluate each for conversion:

- `app/components/MainPage.tsx:91` — `isActiveGameLoading` → "Loading"
- `app/components/game/GamePage.tsx:104` — early return while game/role data loads
- `app/components/game/NightlyPageOPERATOR.tsx:323` — "Loading nightly data" (custom `showLoading` logic)
- `app/components/game/RolesPageOPERATOR.tsx:61` — "Loading roles"
- `app/components/game/PlayerPageOPERATOR.tsx:90` — "Loading players" (custom `showLoading` + opacity-0 pre-mount pattern already)
- `app/components/game/PhoneBookPagePLAYER.tsx:71,230` — "Loading phone book" / "Loading players"
- `app/components/game/RuleBookPagePLAYER.tsx:62` — "Loading rule book"
- `app/components/game/NewspaperDayView.tsx:142,151` — two "Loading newspaper" states (assets + layout) — has its own sophisticated readiness; probably leave as-is or only lightly touch
- `app/components/game/PlayerAccessGate.tsx:117,125` — gate loading
- `app/components/game/ParticipantAccessGate.tsx:78` — gate loading
- `app/components/game/ReadOnlyNewspaperPagePLAYER.tsx:154` — inner "Loading newspaper" (inside the already-converted container — nested state)
- `app/components/game/PhoneBookPageOPERATOR.tsx:32,110`
- `app/components/game/townSquare/TownSquareThreadListView.tsx:138` — "Loading threads" (children already get `isLoading`; may be fine)
- `app/components/game/AllGamesPage.tsx:98` — "Loading games"

Also grep for other patterns during the audit: `isSyncing`, `=== undefined` early returns, `ActivityIndicator`, `isLoading ?` in JSX.

## Constraints / decisions / gotchas

- **User wants a single outer fade**: everything loads invisible, then the whole tab+body container fades in once. Inner components keep their own fades — they play during the hidden phase or on tab switch.
- **No fixed-delay coordination**: readiness is event-driven (register/report), not timers. The only deliberate delays: `mountSettled` 50ms registration window, `fadeDuration` report delay, and the loading UX itself.
- **Inactive tabs must not gate** — keep `BodyReportScope enabled={activeTab === ...}` wrappers; `display:none` children can never finish layout-dependent readiness.
- **Don't unmount children of the outer gate** — deadlock (nothing mounts → nothing reports → never ready).
- **Hooks order**: all hooks in `LoadingContainer` are declared before its early return — keep it that way when editing.
- **Safari iOS**: Reanimated `entering={FadeIn}` caused a post-animation flash on the top bar earlier; shared-value `withTiming` fades were the workaround. `NewspaperZoomableView` also has a comment that Safari iOS may not fire `onLayout` inside `opacity:0` containers — its fallback requires `containerWidth` first, which itself needs `onLayout`; keepMounted relies on `onLayout` working under `opacity:0` for the newspaper tab when active (verify on Safari iOS).
- **Remounting caveat**: don't restructure `LoadingContainer`'s ready/loading branches into different root elements for the same children — React would unmount/remount the subtree and reset state. The current keepMounted impl keeps one stable wrapper.
- Debug logs (`[BodyReadiness]`, `[GamePage]`, `[MainPage]`, `[LoadingContainer]`, `[GameTabBar]`, `[FadeInAfterDelay]`) were all removed at user request.
- Dev server may already be running on 8081 (a previous instance on 8086 was killed). Expo warns about several out-of-date packages — pre-existing, unrelated.
- A `.backup` file exists: `app/components/game/PlayerPageOPERATOR.tsx.backup` — not part of the build.

## Definition of done for the task

1. `keepMounted` behavior is the default in `LoadingContainer`; explicit prop removed at call sites (or inverted to an opt-out).
2. All 5 pre-existing call sites verified working with mounted-children mode.
3. Audit pass: every screen with a meaningful loading state uses `LoadingContainer` (or a deliberate reason not to).
4. `npx tsc --noEmit` clean; site runs at http://localhost:8081; loading → single fade works for operator, newser, and player paths.

## Resolution (completed)

- `LoadingContainer.keepMounted` now defaults to `true` (opt out via `keepMounted={false}`). While loading: children mounted at opacity 0, `pointerEvents='none'`, `absolute inset-0 min-h-24` overlay with `LoadingText`. Opacity resets to 0 instantly if a dep goes back to loading.
- `GamePage`: role-data early return folded into the container — `dependencies={[!isRoleDataLoading, allLoadsDone]}`, placeholder `<View className="min-h-[400px]"/>` while role resolves, provider `outerReady={mountSettled && !isRoleDataLoading}` so late-mounting role pages still register before the gate can fire.
- Converted call sites: `MainPage` (activeGameId sync), `AllGamesPage` (gamesTheyJoined+archivedGames+myGames), `TownSquarePagePLAYER` (now `!isLoading` from useTownSquareForum instead of `[]`), `RuleBookPagePLAYER`, `PhoneBookPagePLAYER`, `PhoneBookPageOPERATOR`, `RolesPageOPERATOR`, `PlayerPageOPERATOR`, `NightlyPageOPERATOR` (keeps deliberate "initial load only" semantics — deps are `[hasInitiallyLoaded, areAllColumnsReady]`), `NewspaperPageOPERATOR`, `NewspaperPageNEWSER` (both `dependencies={[isReady]}` — also gains body-readiness reporting they lacked).
- Deliberately NOT converted: `PlayerAccessGate`/`ParticipantAccessGate` (multi-branch render-prop gates — children need `matchingPlayer`/claimed profile, can't mount early; still report via `useBodyLoadReport`), `NewspaperDayView` (custom asset+layout readiness), `TownSquareThreadListView` "Loading threads" + `ReadOnlyNewspaperPagePLAYER` inner "Loading newspaper" (nested states), phone-book grid overlays (per-card readiness), `PlayerProfilePreviewCard`/`TownSquareAuthorIdentity` (inline skeletons), upload `ActivityIndicator`s (button spinners), `app/index.tsx` (auth gate).
- `useBodyLoadReport` calls removed from pages now wrapped in LoadingContainer (it reports internally). Verified: `tsc --noEmit` clean, Metro bundle compiles on :8081.

## Bugfix: blank newspaper viewing tab (operator first load)

- Symptom: operator opens Newspaper tab → viewing content permanently blank.
- Cause 1 (latent bug in `LayoutStateAnimatedView`): in `phase === 'waiting'`, `displayedContent` rendered the `displayedOption` snapshot captured at swap time. If `selectedDayOwner.isLoading` was still true then, the frozen children were the loading branch — `NewspaperDayView` never mounted → `readyDayKey` never set → `Option.isReady` never true → stuck at `opacity:0` forever. Fixed: `displayedContent` now renders live `currentOption.children` whenever the ref's option matches the current state.
- Cause 2 (regression from keepMounted default): `NewspaperPageOPERATOR`/`NEWSER` containers mounted `LayoutStateAnimatedView` at `selectedDayIndex=0` before the stored-day seed landed, forcing a `0→N` transition into `waiting` while the new day's owner was still resolving. Fix: `keepMounted={false}` on both newspaper page containers — their subtree's readiness is layout-dependent (`onLayout`), so mounting invisible buys nothing and the old mount timing is restored.
- Same freeze could previously hit day-to-day switching on a slow connection (target-day owner not resolved within the ~200ms exit animation) — the `displayedContent` fix covers that too.
