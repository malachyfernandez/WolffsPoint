# Certification And Integration Status

## Current Implementation

The Players tab now uses the tracked certification flow, not the old untracked
copy operation. With explicit user approval, the updated functions were deployed
to the configured development backend and both certification endpoints were
verified in its function metadata. Production was not deployed. No migrations,
real game data repair, or version bump were run.

- Existing values and legacy sources remain an untracked baseline.
- Certification owns its direct vote/action fields and planned cell writes.
  Re-certification retires only that day/type's tracked contributions.
- Tags own their trigger effects. Removal restores typed fields and modular
  content, preserves shared support, and cleans unsupported cycles.
- Explicit `OnTagRemoved` handlers produce independent events; their newly added
  tags are not pruned as unsupported children. Ordinary removal still respects
  explicit `AUTOREMOVE=False`.
- Operator decisions are reviewed before replay overwrites them. Keep on a
  primary vote/action skips that submission's replacement branch. Keep on a
  derived target protects it without discarding unrelated writes.
- New scopes and newly fired tags are checked against protected decisions too.
  If choices reveal another conflict, the dialog shows it before saving.

## Runtime And Persistence

`utils/liveCertification.ts` plans on copies and re-executes with selected
decisions. `fieldProvenance.ts` tracks per-field bases/writes and source-specific
manual override markers. `cellPieces.ts`, `cellOps.ts`, and `useTagTriggers.ts`
resolve ownership, typed restoration, shared support, and tag cleanup.

`useData.ts` supplies stable, record-scoped setters: old commands do not follow
the same component into another game/simulation record. Already processed
automatic results carry `cellWriteOrigin: 'tracked'`; restoration uses
`'restore'`. Both propagate through normal and staged setters. Unattributed
backend writes are reconciled as manual edits, including edits to frozen drafts.

Public tables retain ordinary values. Detailed typed rollback data is split into
owner-private `private-fields:<table-key>` records; only owner reads join it back.
Simulation keys use separate records.

`commitCellCertification` checks exact table/config/script snapshots and the
complete accessible submission set, including submission values rather than
timestamps alone. It saves tables, messages, and private histories atomically.
Stale review writes nothing. Frozen certification uses the existing player-data
batch; publish preserves provenance and cancel discards it. Certification
undo/redo uses the guarded transaction and refuses stale restorations.

Legacy submission plans bind to stable target IDs on their first tracked
certification. An owner-private binding in the primary field history is reused
for unchanged submissions, including after Keep and later Replace. Row reorder
does not reinterpret those plans against a different player.

The older `certificationProvenance.ts` engine/tests remain standalone reference
code. The live UI uses the scoped per-cell model, not a separate whole-game
historical event ledger. There is no historical audit browser or retroactive
reconstruction of pre-tracking runs.

## Visible Behavior And Patch-Up

Subtle tints/origin marks show `From certification` or `From Infected Tag`, using
the actual tag name. Manual/untracked content has no special manual label. SET
attribution follows the actual unmasked base.

Integration fixes preserve the concurrent Markdown/Source editor work:

- The `FontText` color hook is unconditional.
- The native/web tooltip split is retained. Adding platform-specific files
  requires a Metro resolver-cache restart; that caused the missing-tooltip test.
- Folder creation no longer treats a press event as its parent path.
- Shared input autofocus/selection works after dialog entry.
- The native-unsupported percentage/pixel `calc()` divider uses stretching and
  margins instead.

## Current Verification Commands

```sh
./node_modules/.bin/tsc --noEmit
npm run test:certification
npm run test:cell-modules
npm run test:game-days
npm run test:markdown-files
```

Browser suites run only against the disposable in-memory simulator:

```sh
EXPO_PUBLIC_SIM=1 EXPO_OFFLINE=1 npm run web -- --clear --port 8083
node scripts/test-markdown-editor-ui.mjs http://localhost:8083
node scripts/test-certification-ui.mjs http://localhost:8083
```

They check desktop/mobile layouts, idle write stability, tooltips, full source
history, invalid-source guards, unsaved-close paths, folder autofocus/selection,
repeated Keep/Replace, tag rollback, origin labels, and mobile cancellation.

Repository-wide formatting debt outside these changes is not hidden by changing
the lint command or bulk-formatting unrelated work.

## Archived Foundation Checkpoint

The sections below describe the earlier standalone-engine checkpoint, not the
current runtime or the remaining rollout requirements.

The original requirements/design are in `context-certification-provenance.md`.
That document remains intact.

### Foundation Implemented And Tested

- `types/certification.ts`: stable target addresses, run and per-submission
  identities, evaluated operations, causal support, explicit manual decisions,
  conflict plans, and recorded resolutions.
- `certificationProvenance.ts`: pure retirement/replay primitives, typed and
  modular projection, graph reachability, scoped retirement, conflict detection,
  explicit Keep/Replace resolution, and revision/fingerprint checks.
- Shared trigger effects can have multiple supports. Unsupported cycles are not
  roots. Retirement removes descendants with no independent support.
- Operator decisions are applied in a protected resolution layer after automatic
  operations. A new ADD/SET does not simply bypass an earlier manual removal.
- Keeping a primary vote/action rejects that player's proposed branch and its
  unsupported descendants. Keeping a derived target does not reject unrelated
  writes from the same branch.
- Kept decisions remain reviewable on later runs. Rejected proposals and choices
  remain in the in-memory ledger for audit rather than being silently discarded.
- Execution read dependencies can be recorded. Choices that invalidate another
  accepted effect's recorded dependencies require re-planning, not committing
  operands evaluated against a rejected branch.
- `certificationIdentity.ts`: a pure, idempotent identity adoption helper, stable
  submission-plan binding, and fail-closed resolution after structural changes.
  It never invents identities for an old plan at execution time.
- Optional row/day/column IDs widen existing TypeScript models without forcing a
  migration. Day normalization preserves metadata. Column add/delete operations
  preserve aligned ID arrays when the table already has them.
- `planMarkdownScriptUpdates` binds targets when IDs exist.
  `executePlannedUpdates` and its morning-message counterpart honor bound IDs.
  Legacy plans retain existing behavior unless `requireStableTargets` is set.
- `npm run test:certification` runs the new regression suite.

### Standalone Executor Contract

The pure engine does not inspect current game tables, discover actual tag
supports, execute scripts, or record operator edits automatically. The caller
must provide:

1. Real stable identities and original pre-effect bases.
2. Unique run, branch, effect, and manual-event IDs.
3. Evaluated effects with complete causal supports and relevant read dependencies.
4. Explicit `overrides` relations for manual decisions, including same-value
   assertions and edits later changed back.
5. A fingerprint of all execution inputs, not merely the selected day number.

`certificationReplayBaseline` produces the retired ledger. The executor must use
its projection when evaluating replacement submissions.

An existing shared tag whose support changes must be reconciled explicitly.
Same-name equality does not establish refreshed ownership. The core can resolve
a correctly supplied support graph, but does not infer or refresh it from raw
marker strings. Administrative retirement must not execute gameplay
`OnTagRemoved` handlers. The core does not execute either kind of handler.

### Original Integration Checklist (Historical)

1. Add an explicit adoption path that commits stable IDs and the initial private
   ledger together. Legacy direct writes have no reconstructible pre-write base;
   do not fabricate one. Legacy marker ownership needs a deliberate compatibility
   decision, not silent conversion into invented history.
2. Extract the pure tag-trigger execution functions out of the React hook module.
   Add operation/placement tracing so typed writes, tag cascades, shared supports,
   evaluated operands, and script revisions actually reach the ledger.
3. Add a common, origin-aware write boundary for manual editors, bulk changes,
   structural operations, imports, normalization, and undo/redo. Do not treat every
   table synchronization as an operator override. Record specific edited targets
   so a same-value assertion can be distinguished from a no-op table refresh.
4. Implement complete submission loading. The current 200-row query limit is not
   evidence that a submission is absent.
5. Replace `certifySubmissions` with an in-memory domain planner and a real review
   dialog. Recompute affected execution after choices. Cancellation must write
   nothing.
6. Commit tables, morning messages, receipts, manual decisions, and run retirement
   in one authenticated revision-checked backend transaction. Client-side
   fingerprint comparison alone is not concurrency protection.
7. Include private provenance in the existing player-data staging batch and
   update undo/redo atomically. Add bounded receipt/archive storage; the pure
   ledger intentionally retains history but is not a bounded storage design.
8. Audit stable-ID preservation in day deletion/reordering, player creation,
   imports, resets, duplication, and simulation snapshots. Namespaces in the core
   prevent resolving a plan against a different ledger, but do not implement
   simulation persistence isolation.
9. Add backend/staging/concurrency and browser integration tests before switching
   the live button. Pure engine tests do not establish these guarantees.

### Foundation Verification

The new tests cover scoped retirement, changed/withdrawn submissions, chained
and shared tag effects, persistent modules, unsupported cycles, manual primary
and derived decisions, change-back/same-value intent, repeated review, stale
plans, cancellation purity, read-dependency invalidation, and stable target
resolution after player/column/day changes.

Run:

```sh
npm run test:certification
npm run test:cell-modules
npm run test:game-days
./node_modules/.bin/tsc --noEmit
```
