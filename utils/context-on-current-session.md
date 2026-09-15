# Handoff context — current WolffsPoint session

This document is meant to be self-contained. A new thread should be able to read
this file and continue the current work without re-reading the prior
conversation.

---

## 0. What was completed in this thread

The production **Your Eyes Only** player-tab loading hang was diagnosed and
fixed.

- **Diagnosis:** The `numberOfRealDaysPerInGameDay` list item for game
  `InMWQuJR` / operator `user_3Cbf5yT6oC4L55Mn5ymUsWDS9M9` returned
  `results=0` in production. Every other dependency (`dayDatesArray`,
  `roleTable`, `gameSchedule`) resolved successfully. The record being missing
  or inaccessible left `numberOfRealDaysRecord` as `undefined`.
- **Why it hung:** `YourEyesOnlyPagePLAYER` gated its `LoadingContainer` on
  the `numberOfRealDaysRecord` object itself, not on whether the query had
  finished. `useSharedListValue` already supplied `defaultValue: 2`, so the
  page could render without that record.
- **Fix:** In `app/components/game/YourEyesOnlyPagePLAYER.tsx`, destructured
  `isLoading` from `useSharedListValue('numberOfRealDaysPerInGameDay', ...)` and
  changed the `LoadingContainer` dependency from `numberOfRealDaysRecord` to
  `!isNumberOfRealDaysLoading`. The page now exits loading once the query
  resolves and falls back to the default `2` real days per in-game day when no
  accessible record exists.
- **Caveat:** If the operator previously set a custom value and the record is
  `PRIVATE`, players will continue to see the default `2` instead. Existing
  missing or private records may need a data repair if the operator wants the
  custom value to be visible.

The `[YourEyesOnly][PROD-DIAG]` logs from this session are still in place.
They can be removed or downgraded once the fix is verified in production.

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

## 5. The production-only "Your Eyes Only" loading issue (RESOLVED)

### What happened

The **Your Eyes Only** tab was stuck on a permanent loading screen in
production. The diagnostic logs showed that the only unresolved dependency was
`numberOfRealDaysPerInGameDay`:

- `dayDatesArray` → `records=1`
- `roleTable` → `records=1`
- `gameSchedule` → `records=1`
- `numberOfRealDaysPerInGameDay` → `results=0`

Operator for game `InMWQuJR`: `user_3Cbf5yT6oC4L55Mn5ymUsWDS9M9`.

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
    !isNumberOfRealDaysLoading,
    roleTable.record,
    scheduleRecord.record,
    !isOperatorLoading,
  ]}
  loadingText="Loading..."
  className='flex-1 min-h-190'
>
```

If any of those is `undefined`, `false`, or `isSyncing`, the page stays on the
loading screen. Previously the container gated on `numberOfRealDaysRecord`,
which is `undefined` when the record is missing or not accessible to the
player. The container now gates on `!isNumberOfRealDaysLoading` so the page
exits loading once the query resolves and uses the `defaultValue: 2` when no
accessible record exists.

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

### Root cause and fix

The issue was not an auth or query hang. The logs showed every other
dependency resolved (`dayDatesArray`, `roleTable`, `gameSchedule`) while
`numberOfRealDaysPerInGameDay` returned `results=0`. The missing or
inaccessible record left `numberOfRealDaysRecord` as `undefined`.

The fix was in `app/components/game/YourEyesOnlyPagePLAYER.tsx`:

- Destructured `isLoading` from the `useSharedListValue<number>({ key: 'numberOfRealDaysPerInGameDay', itemId: gameId, defaultValue: 2, userIds: operatorUserIds })` call.
- Changed the `LoadingContainer` dependency from `numberOfRealDaysRecord` to
  `!isNumberOfRealDaysLoading`.

This lets the page exit loading once the query resolves, using the default `2`
real days per in-game day when the operator has not set or has not made the
value public.

### Notes

- `useSharedListValue` / `useSharedVariableValue` set `record = records?.[0]`.
  An empty `records` array makes `record` `undefined`, which `LoadingContainer`
  treats as loading. The `isLoading` field they also return is the safer gate
  for cross-user reads that may legitimately come back empty.
- The record may be `PRIVATE` because of an earlier write before `DATA_CONFIG`
  stabilized this key as `PUBLIC`. New writes use `DATA_CONFIG`'s `PUBLIC`
  setting.
- If the operator has a custom `numberOfRealDaysPerInGameDay` value, players
  will not see it until the record is made public or a data migration fixes it.
- The `[YourEyesOnly][PROD-DIAG]` logs are still in place and can be removed
  once the fix is verified.

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

1. **Verify the loading fix in production.**
   - Build and deploy the updated `YourEyesOnlyPagePLAYER.tsx`.
   - Open the production **Your Eyes Only** tab.
   - Confirm the page exits loading and renders the in-game days.
2. **(Optional) Remove or downgrade the diagnostic logs** once the fix is
   verified. They are intentionally temporary.
3. **(Optional) Repair the production `numberOfRealDaysPerInGameDay` record** if
   the operator intended a value other than the default `2`. Make the record
   `PUBLIC` so players can read it.
4. **Resume color work if requested.**
   - See `utils/color-implementation.md`.
   - The current shipped state uses the `color` prop and a direct
     `useCSSVariable` call; a later pass can switch to pure class-based styling.
5. **Button sizing audit is essentially complete.**
   - `utils/button-sizing-audit.md` holds the findings.
   - Apply targeted fixes only for actual primary/secondary mismatch issues.
6. **Continue the freeze/schedule/publish workflow** for Players, Roles, and
   Nightly.

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

- The production `numberOfRealDaysPerInGameDay` record is missing or
  inaccessible to the player. The `LoadingContainer` gate now tolerates this by
  using `!isNumberOfRealDaysLoading`, so the page renders, but the actual
  operator value (if any) may not be visible to players until the record is made
  public or is repaired.
- Whether the freeze/schedule/publish implementation works correctly across
  Players, Roles, and Nightly remains to be verified.
- The temporary `[YourEyesOnly][PROD-DIAG]` diagnostic logs can be removed once
  the fix is verified.
