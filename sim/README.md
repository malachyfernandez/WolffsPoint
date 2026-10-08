# sim/ — in-repo simulation & performance harness

A self-contained fake environment that runs the **real app** against an
in-memory backend, with instrumentation for performance auditing. No real
Convex deployment, no Clerk auth, no network dependency.

## Quick start

```bash
EXPO_PUBLIC_SIM=1 npx expo start --web --port 8090
# open http://localhost:8090 — app boots fully seeded, SimBar bottom-right
```

- **"▶ Simulate Everything"** — scripted 164-step tour over every page, tab,
  scroll surface, and dialog (see `perf/runTour.ts` for the step list).
- **"Report .md"** — downloads a markdown report of all measurements
  (commit timings, query subscribes, mutations, long tasks, frame drops).
- **Modal lab** — isolated dialog stress surface.

Headless run:

```bash
node sim/drive.mjs --url http://localhost:8090          # load + console errors
node sim/drive.mjs --url http://localhost:8090 --tour   # full tour, report → sim/out/
# drive-zen.mjs / probe-zen.mjs — Firefox/Zen variants; probe*.mjs — targeted probes
```

## How it works (keep it this way)

Sim mode is a **layer**, not a fork. Three mechanisms:

1. **Metro resolver alias** (`metro.config.js`): when `EXPO_PUBLIC_SIM=1`,
   `convex/react`, `convex/react-clerk`, and `@clerk/clerk-expo` resolve to
   `sim/mockConvexReact.ts` / `sim/mockClerk.tsx` for every importer outside
   `sim/`. App source never changes between modes — same imports, different
   resolution. TypeScript still sees the real Convex/Clerk types.
2. **`sim/isSim.ts`**: `isSimMode` flag (the env var) used by `app/_layout.tsx`
   to call `ensureSeeded()`, wrap `<Slot/>` in `SimProfiler`, and mount
   `SimBar` — the only permanent seam in app code.
3. **`sim/perf/SimProfiler.tsx`**: named React Profiler boundaries placed
   permanently in components (`screen:allGames`, `screen:game`, `game-body`,
   `op-tabs`, `player-tabs`, `newser-tabs`, `app-root`). Passthrough (renders
   children directly) when sim is off — zero prod cost.

Permanent-but-inert app changes for the harness: `testID` props on AppButton /
GuildedButton / ListRow (render to `data-testid` on web — the tour's
selectors), `data-testid` on GameTabBar web tabs, and the `testID` call sites
(listed in git history). These are safe in production — keep them.

## The mocks

- `mockDb.ts` — reactive in-memory store implementing the query/mutation
  surface the app uses (`user_vars:*`, `user_lists:*`, `globals:*`,
  `scheduled_updates:*`, games/join codes). `mockDb.queryLatencyMs` can inject
  artificial latency.
- `mockConvexReact.ts` — drop-in `useQuery`/`useMutation`/`useAction`/
  `usePaginatedQuery`/`useConvexAuth`/providers. Mutations are labelled by
  key (`user_vars:set[key]`) so write storms are readable in reports.
- `mockClerk.tsx` — always-signed-in mock user (`SignedIn` passthrough,
  `useUser` returns a fixed user).
- `seed.ts`/`seedData.ts` — seeds games (`SIMOP1234`, `SIMNEWS9`,
  `SIMPLY567`…), players, votes, threads on boot via `ensureSeeded()`.

## Maintenance rules

- **API parity**: if app code starts importing a NEW symbol from
  `convex/react` or `@clerk/clerk-expo` (e.g. `useQueries`), add a matching
  export to the mock or sim mode breaks at bundle time.
- `sim/` is dev tooling — it's fine for it to be bundled but it must never be
  *active* without `EXPO_PUBLIC_SIM=1`. Keep all behavior gates on `isSimMode`.
- `testID`s are the tour's DOM contract — don't remove/rename them without
  updating `perf/runTour.ts` + `perf/domTools.ts`.
- Baseline reports from the original audit live in `sim/out/` and
  `FINAL_AUDIT.md` / `PERFORMANCE_AUDIT.md` (repo root) — compare new tour
  output against those when perf work lands.
