# Handoff context — current WolffsPoint session

This document is meant to be self-contained. A new thread should be able to read
this file and continue the current work without re-reading the prior
conversation.

---

## 1. The enduring objective: operator freeze tables

The broader feature being built is an operator-side **freeze / schedule /
publish** workflow for the **Players**, **Roles**, and **Nightly** tables.

Key design decisions (do not change without user approval):

- `userVar.value` is the **published/current** value.
- Each variable or list item can have **at most one optional scheduled value**.
- Operators explicitly render private drafts through `userVar.scheduledUpdate.value`.
- When the scheduled time is reached, the scheduled value replaces the normal
  value and the scheduled update is removed.
- `batchId` is used only to group related pending values for **atomic
  publication** (one Publish button).
- Do not introduce an elaborate publication-group architecture; the system is
  intentionally a simple client-side variable model.

Freeze-table behavior (per table):

- Freeze the currently published table.
- Continue editing privately.
- Publish all pending changes with one button.
- Cancel and revert to the currently published version.
- Schedule publication for a future time.

Control placement:

- **Players** — across from "Add Player".
- **Roles** — across from "Add Role".
- **Nightly** — right-aligned beneath the table.

Relevant files:

- `convex/scheduled_updates.ts`
- `convex/schema.ts`
- `hooks/useScheduledUpdates.ts`
- `hooks/useUserVariable.ts`
- `hooks/useUserList.ts`
- `contexts/DataProvider.tsx`
- `hooks/useData.ts`
- `app/components/game/PlayerPageOPERATOR.tsx`
- `app/components/game/RolesPageOPERATOR.tsx`
- `app/components/game/NightlyPageOPERATOR.tsx`
- `app/components/game/TableFreezeControls.tsx`
- `convex/_generated/*` (regenerated when the schema/deploy changed)

The scheduled-update backend and its generated bindings were already deployed to
production.

---

## 2. Convex deployment status

- Deployment: `fastidious-ant-502`
- URL: `https://fastidious-ant-502.convex.cloud`
- The `/version` endpoint returned HTTP 200 when last checked.
- A direct WebSocket handshake returned `HTTP/1.1 101 Switching Protocols`.
- The production web bundle pointed at this deployment (`fastidious-ant-502`),
  not the example `happy-otter-123` string that appears in Convex sample code.
- The scheduled-update tables and indexes were added in an earlier deploy:
  - `scheduled_update_batches.by_ownerUserToken_and_batchId`
  - `scheduled_update_targets.by_ownerUserToken_and_batchId`
  - `scheduled_update_targets.by_ownerUserToken_and_targetType_and_key_and_itemId`

---

## 3. Button sizing audit

A whole-app button audit for buttons that are too tight/small was performed.

- Report: `utils/button-sizing-audit.md`
- The only primary/secondary modal mismatch that needed fixing was
  `MustSaveDialog`:
  - **Save** was `w-24`; **Cancel** was `w-28`.
  - `Save` was widened to `w-28` so both buttons match.
- `UnsavedChangesDialog` **Keep Editing** was also widened to `w-28` in an
  earlier step.
- Many `AppButton` instances lack explicit width. That is intentional for
  layout-dependent and icon-only controls; do not blanket-add fixed widths.

---

## 4. Color / FontText work

### Request

Make the **Delete Section** control in
`app/components/game/newspaperPageOperator/NewspaperSectionOptionsDialog.tsx`
red, including the `Trash2` icon, while keeping disabled/faded behavior.

### Implementation

- `app/components/ui/text/FontText.tsx` now parses a color token from a
  `className` like `text-red-700` and resolves it through Uniwind's
  `useCSSVariable`. It falls back to the `color` prop, then the default `text`
  color.
- `NewspaperSectionOptionsDialog` uses the resolved red for the `Trash2` icon
  and `FontText color="red-700"` for the label, with an `opacity-40` wrapper/
  class for the disabled state.
- Documentation: `utils/color-implementation.md`

The color commit has already been made.

---

## 5. The production-only "Your Eyes Only" loading issue

### Symptom

The **Your Eyes Only** tab is stuck on a permanent loading screen in
**production only**. Development loads fine.

### Known non-causes

These production console messages have not been shown to cause the hang:

- Layout forced before stylesheets loaded.
- `unreachable code after return statement`.
- Cloudflare `_cfuvid` cookie domain warnings.
- The React/Metro require cycle between `ScriptEditorDialog.tsx` and
  `MarkdownEditorDialog.tsx` (development only).

The Convex "Attempting reconnect in 1215ms" message appeared, but the
 deployment and WebSocket endpoint were reachable when tested, so it was not
 conclusively the root cause.

### Loading gate

Primary file:

- `app/components/game/YourEyesOnlyPagePLAYER.tsx`

The page wraps its content in `LoadingContainer` with these dependencies:

```tsx
<LoadingContainer
  dependencies={[
    dayDateStringsRecord,
    numberOfRealDaysRecord,
    roleTable.record,
    scheduleRecord.record,
    !isOperatorLoading,
  ]}
  loadingText="Loading..."
  className='flex-1 min-h-190'
>
```

If any of those is `undefined`, `false`, or `isSyncing`, the page stays on the
loading screen.

The dependencies come from:

- `useGameOperatorUserId(gameId)` → `operatorUserId` and `isLoading`.
- `useSharedListValue` for `dayDatesArray`, `numberOfRealDaysPerInGameDay`,
  `roleTable`.
- `useSharedVariableValue` for `gameSchedule`.

`useSharedListValue` / `useSharedVariableValue` sit on top of:

- `hooks/useData.ts` → `useFindListItems` / `useFindValues`
- `contexts/DataProvider.tsx` → `DataSubscriber` with `useUserListGet` /
  `useUserVariableGet`
- `hooks/useUserListGet.ts` / `hooks/useUserVariableGet.ts` → raw `useQuery`
  from `convex/react`

### Likely root-cause direction (not yet proven)

Because the issue is **production-only** and **player-only**, the leading
hypothesis is an authorization / permission issue:

- `YourEyesOnlyPagePLAYER` loads operator-scoped data (`gameSchedule`,
  `dayDatesArray`, `numberOfRealDaysPerInGameDay`, `roleTable`).
- If the logged-in player is not allowed to read the operator's values,
  `useFindListItems` / `useFindValues` may return an **empty array** (`[]`)
  instead of `undefined`.
- `useSharedListValue` / `useSharedVariableValue` set `record = records?.[0]`.
  An empty array means `record` is `undefined`.
- `LoadingContainer` sees `dayDateStringsRecord` / `scheduleRecord.record` as
  `undefined` and continues loading forever.

Another possibility is that `useGameOperatorUserId` cannot resolve the operator
user for the game in production, leaving `isOperatorLoading` true.

A third possibility is that a `DataSubscriber` or a Convex query is hanging and
never returning, so the `records` stay `undefined`.

The root cause has **not** been fixed. The next step is to read the production
logs described below.

---

## 6. Diagnostic logs added in this session

A set of clearly-prefixed `console.log` statements was added to the production
relevant loading path. They are intentionally in production so the user can
paste the browser console output to the next thread.

Search the console for the prefix:

```
[YourEyesOnly][PROD-DIAG]
```

Files modified:

- `app/components/game/YourEyesOnlyPagePLAYER.tsx`
  - `[YourEyesOnly][PROD-DIAG][Page] MOUNT / UNMOUNT`
  - `[YourEyesOnly][PROD-DIAG][Page] DATA` — operator loading state and which
    shared records are resolved.
  - `[YourEyesOnly][PROD-DIAG][Page] DERIVED` — day/date/render decision.
  - `LoadingContainer onReady` log when the container exits loading.
- `app/components/game/YourEyesOnlyDayContentPLAYER.tsx`
  - `[YourEyesOnly][PROD-DIAG][DayContent] MOUNT` — confirms the child is
    actually being rendered.
- `app/components/ui/loading/LoadingContainer.tsx`
  - `[YourEyesOnly][PROD-DIAG][Loading] isLoading=true/false` plus a
    dependency-by-dependency breakdown (e.g. `dep[0]=undefined`).
- `hooks/useGameOperatorUserId.ts`
  - `[YourEyesOnly][PROD-DIAG][OperatorId]` — game rows undefined/empty/set and
    the resolved operator user id.
- `hooks/useSharedListValue.ts`
  - `[YourEyesOnly][PROD-DIAG][SharedList]` — records undefined/0/N for each
    list key.
- `hooks/useSharedVariableValue.ts`
  - `[YourEyesOnly][PROD-DIAG][SharedVar]` — records undefined/0/N for each
    variable key.
- `hooks/useUserListGet.ts`
  - `[YourEyesOnly][PROD-DIAG][ListGet]` — raw Convex `user_lists_get.search`
    results undefined/length.
- `hooks/useUserVariableGet.ts`
  - `[YourEyesOnly][PROD-DIAG][VarGet]` — raw Convex `user_vars_get.search`
    results undefined/length.
- `contexts/DataProvider.tsx`
  - `[YourEyesOnly][PROD-DIAG][DataProvider]` — `DataSubscriber` results for
    `find-values` and `find-list-items` only (with key, itemId, userIds, result
    summary, refCount).

### How to interpret the logs

1. Open the browser console on the production **Your Eyes Only** tab.
2. Filter for `[YourEyesOnly][PROD-DIAG]`.
3. Look for the first `[YourEyesOnly][PROD-DIAG][Loading]` line.
   - It tells you which `dep[0..N]` is not `ready`.
   - `dep[N]=undefined` means the underlying `useFind...` hook has not resolved.
   - `dep[N]=syncing` means a `useValue`/`useList` result has
     `state.isSyncing`.
   - `dep[N]=false` means an explicit boolean flag is still false.
4. Cross-reference with `[YourEyesOnly][PROD-DIAG][SharedList]` /
   `[SharedVar]` / `[ListGet]` / `[VarGet]` to see whether Convex returned
   `undefined`, `0`, or a populated result.
   - `undefined` → query is still loading or never returned.
   - `0` → the query finished but the caller is not authorized to see any rows,
     or no rows exist.
   - `>0` → the query found data.
5. Check `[YourEyesOnly][PROD-DIAG][OperatorId]` to confirm the operator user
   was resolved. If it is `missing`, the `games` list query is not returning the
   expected row.
6. If `DataProvider` logs `result=undefined` forever for a key, the Convex
   `useQuery` for that key is not resolving (auth, network, server error,
   missing index, permission rule rejecting silently).

### Important note

`DataProvider.tsx` does **not** have an error boundary around individual
`DataSubscriber` components. If a `useUser...` hook throws, the whole React tree
crashes rather than logging. Watch for a white screen or uncaught errors in the
console. If that appears, the stack trace is more useful than the planned logs.

---

## 7. Scheduled update architecture

Files:

- `convex/scheduled_updates.ts` — backend functions (`getPendingTarget`,
  `getBatchState`, `stageTarget`, `scheduleBatch`, `publishBatchNow`,
  `cancelBatch`, internal `publishScheduledBatch`).
- `hooks/useScheduledUpdates.ts` — frontend `useScheduledTarget` hook.
- `hooks/useUserVariable.ts` / `hooks/useUserList.ts` — expose `scheduledUpdate`
  while keeping `record.value` as the published value.

`useScheduledTarget` shape:

```tsx
type ScheduledTarget =
  | { targetType: 'variable'; key: string }
  | { targetType: 'list'; key: string; itemId: string };

useScheduledTarget<T>(...) => {
  isLoading,
  pendingTarget,
  scheduledUpdate, // { value, batchId, status, scheduledTime }
  stageValue,      // set a staged/scheduled value
  schedule,
  publishNow,
  cancel,
}
```

Default batch IDs:

- variable: `variable:${key}`
- list item: `list:${key}:${itemId}`

Publishing calls `setUserVarForToken` / `setUserListForToken` to overwrite the
published value and remove the scheduled target.

---

## 8. Shared data layer

- `contexts/DataProvider.tsx` — global `DataStore`, `DataSubscriber` chooses the
  right hook per `config.type`.
- `hooks/useData.ts` — `useValue`, `useList`, `useFindValues`,
  `useFindListItems`, `useValueCount`, `useListCount`.
- `hooks/useUserVariable.ts` / `useUserList.ts` — owner-scoped single value/list.
- `hooks/useUserVariableGet.ts` / `hooks/useUserListGet.ts` — cross-user search.
- `hooks/useGameOperatorUserId.ts` — fetches the operator's `userToken` for a
  game from the `games` list.
- `hooks/useSharedListValue.ts` / `hooks/useSharedVariableValue.ts` — small
  wrappers that return `{ record, value, isLoading }` from `useFind...`.

`DataStore` uses `useSyncExternalStore` so consumers get snapshots from a single
background subscriber per query.

---

## 9. What still needs to happen

1. **Diagnose the production loading issue.**
   - Build and deploy the current code so the new logs appear in production.
   - Open the production **Your Eyes Only** tab.
   - Copy the `[YourEyesOnly][PROD-DIAG]` console output.
   - Determine which dependency is stuck and why.
2. **Fix the root cause.**
   - If it is a permission issue, adjust Convex access rules or use a
     player-accessible mirror of the operator values.
   - If it is a missing query result, investigate the Convex query/index/
     deployment.
   - If it is a client subscription problem, fix the `DataProvider` or hook.
3. **(Optional) Remove or downgrade the diagnostic logs** once the issue is
   resolved. They are intentionally temporary.
4. **Resume color work if requested.**
   - See `utils/color-implementation.md`.
   - The current shipped state uses the `color` prop and a direct
     `useCSSVariable` call; a later pass can switch to pure class-based styling.
5. **Button sizing audit is essentially complete.**
   - `utils/button-sizing-audit.md` holds the findings.
   - Apply targeted fixes only for actual primary/secondary mismatch issues.

---

## 10. Key constraints and values

- Do not introduce a publication-group architecture.
- Keep `userVar.value` as the published value.
- Operators render drafts via `userVar.scheduledUpdate.value`.
- Preserve `batchId` only for atomic publish groups.
- Preserve unsaved-changes confirmation on editable dialogs (`UnsavedChangesDialog`).
- For Convex code, read `convex/_generated/ai/guidelines.md` first.
- For SVG conversion, use SVGR with `--native --typescript`.

---

## 11. Known unknowns

- The exact production cause of the Your Eyes Only loading hang is **not yet
  known**.
- Whether the player has permission to read operator-scoped values in production
  has not been verified.
- Whether the `games` list query returns a row with a `userToken` for the
  production game has not been verified.
- The logs in this session are the first real attempt to observe the failure in
  production.
