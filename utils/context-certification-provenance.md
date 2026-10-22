# Handoff: Certification Provenance And Manual Overrides

## 1. Scope And User Request

This is a **research/design handoff, not an implemented feature**. The user explicitly asked: "Please just look into this and write a second context file." No application code, schema, or game data was changed for this investigation. Findings below come from reading the current code, not newly reproduced end-to-end tests.

Repository: `/Users/malachyfernandez/Documents/1-programing/1-apps-and-sites/wolfspoint/wolffspoint`.
All paths below are relative to that directory. The parent `wolfspoint` folder is not the Git repo.

The user wants deeper tracking because, long term, certification must safely support this sequence:

1. Certify votes or actions.
2. The operator manually changes something certification wrote.
3. Certify that scope again.
4. Remove the prior certification's effects modularly, **including consequences produced by tag scripts**.
5. Identify the operator-overridden item and ask whether the operator wants that item changed by the new certification. Do not silently overwrite it.

The user agreed that stable identities are important. They want each certification/action and its consequences tracked, not just a final string or one coarse "manual edit happened" flag.

Required confirmation is on re-certification. A separate warning at the moment an operator first edits a certified item might be useful, but the user did not explicitly specify whether both popups are desired.

This file is standalone for the provenance task. The separate `utils/context-on-current-session.md` is the handoff for pending markdown/source editor unification and tooltips. Do not replace it or conflate that UI work with this feature.

## 2. Essential Concepts

- **Submission:** A player's submitted vote/action, input values, and planned cell updates.
- **Certification scope:** Currently a game day plus votes OR actions. Re-certifying actions should not erase unrelated vote certifications, other days, manual changes, or independent tag effects.
- **Certification run:** A particular execution/revision of certification. There is currently no persistent run ID/receipt.
- **Certified submission branch:** One player's vote/action within a run, plus its executed effects. Different from the whole day's bulk certification.
- **Effect/contribution:** A concrete operation on a target: add/remove a tag/file/text module, replace content, set living state, change a multiplier, etc.
- **Provenance:** Identity of the event that produced a contribution.
- **Causality:** The links explaining why an effect happened, e.g. run -> player action -> tag addition -> tag trigger -> morning-message file.
- **Manual override:** An operator decision superseding/masking/editing a specific certified result or effect. Not every unrelated manual edit to the same cell should be a conflict.
- **Materialized value:** The value shown in the current player table/message, obtained by resolving active automatic effects and manual decisions.
- **Retiring a run:** Making its automatic contributions inactive without erasing history or restoring an obsolete whole-table snapshot.

Example of desired behavior:

```text
Certification R1: Alice's action adds Infected to Bob.
Infected's trigger adds the live Infected file to Bob's morning message.
Operator manually removes that file or changes Alice's certified action.
Re-certify as R2:
  retire R1's attributable effects and dependent effects;
  preserve independent manual/other-run contributions;
  review the conflicting operator change before R2 replaces it.
```

## 3. What Exists Today

### Certification entry point

`components/game/PlayerPageOPERATOR.tsx`, `certifySubmissions(type: 'votes' | 'actions')`, approximately lines 275-370:

1. Maps the current user table and directly copies each available submission into the selected day's `vote`, `voteInputs`, `voteInputKey`, `voteMultiplier`, or `action`.
2. Sets `beforeUsers = certifiedUsers`, already after those direct assignments.
3. Calls `stripSourceFromTables` with `certifySrcPrefix(day, typeLetter)` to remove old matching modular markers.
4. Executes each submission's `plannedUpdates` or `votePlannedUpdates` with `executePlannedUpdates` and `executeMorningMessagePlannedUpdates`.
5. Runs `runTagTriggerFixpoint` for net tag placement changes, including a correct old-morning-message placement baseline.
6. Normalizes results and writes `userTable` and `morningMessagesList` separately.

There is no per-run receipt, override comparison, conflict dialog, or atomic provenance transaction here.
If a player has no submission object, the direct-copy branch is skipped, so an earlier raw vote/action can remain. Decide explicitly what "no new submission" means rather than inheriting that accident.
Submission lookup uses `useFindValues(..., {returnTop: 200})`; a future planner must distinguish absent submissions from unloaded/truncated results.

`components/game/NightlyCertificationDialog.tsx` previews submissions/planned updates and invokes `onCertifyVotes` / `onCertifyActions`. It immediately closes afterward. It is the existing review UI, not an override-resolution dialog.

### Submission/planning types

- `types/multiplayer.ts`: `PlayerNightSubmission` includes player email/user ID, dayIndex, `gameDayId`, vote/action/input payloads, submitted timestamps, and two planned-update arrays. It has no certification run/revision/effect IDs.
- `gameDayId` is currently derived as `${gameId}-day-${dayIndex}`; its name does not make it stable across reindexing.
- `PlannedUpdate` targets `playerIndex`, `dayIndex`, column title/type, expression, itemName, op, and duplicate/removal settings. It has no stable target IDs or unique action/effect ID.
- `components/game/YourEyesOnlyDayContentPLAYER.tsx` writes submissions and computed planned updates.
- `utils/runMarkdownScriptsWithUpdates.ts` collects partially evaluated plans from markdown scripts. Some expressions are frozen at submission time; cellContents-dependent expressions are evaluated later.
- `utils/executePlannedUpdates.ts` evaluates plans in order against current effective cells and produces/applies `TableUpdate`s.
- `script/registry.ts`: `TableUpdate` carries location, mode/value, optional source/file reference and settings, but no execution-run/action lineage.

### Current marker provenance

`utils/cellPieces.ts` stores base content plus attributed ADD/TAG/REM/SET markers, file references, and ORDER metadata.
`effectiveCell` / `effectiveCellText` fold them; `stripSource` removes selected sources.

Source keys:

```text
certify:d{dayIndex}:{a|v}:{submitterEmail}
tag:{tagFileId or name}@u{playerIndex}|d{dayIndex}|{columnTitle}
manual
```

Player-level tag addresses use `p` instead of `d{dayIndex}`.

- `certifySrc` / `certifySrcPrefix`: certification keys are reused across executions. No unique run/revision.
- `tagPlacementSrc` / `formatCellAddress`: tag effects identify the placement, not the certification/operation that caused it.
- `MANUAL_SRC = 'manual'`: all manual marker writes share one source, without an edit ID, actor, timestamp, or overridden-effect relation.
- Duplicate suppression keeps each owner's stored contribution and shows one module by default. Preserve this behavior.
- `AUTOREMOVE = False` tag writes get a `persistent:` source prefix, intentionally surviving ordinary tag-removal stripping.

### Tag consequences

`hooks/useTagTriggers.ts`:

- `resolveTagTrigger`: file-backed tags first, legacy tag-trigger records as fallback.
- `fireSingleTagTrigger`: interprets the tag script with contributionSource = its placement key, then applies regular/morning writes.
- `runTagTriggerFixpoint`: diffs visible placements, fires newly added triggers, reverts dead placements and runs explicit OnTagRemoved bodies; bounded to ten passes.
- Hook wrappers commit morning-message changes. `planTableChanges` helps bulk edits and has morning-message undo callbacks, but is not a persisted certification planner.

`utils/cellOps.ts`: `collectTagPlacements`, `stripSourceFromTables`, `revertDeadTagPlacements`, placement diff helpers. Rollback checks actual placement disappearance so removing one owner does not erase effects of a still-live shared tag.

## 4. Verified Gaps Relevant To The Request

1. **No certification revision history.** Identical scope/email source keys are reused, so the app cannot distinguish R1 from R2 or enumerate each executed operation afterward.
2. **No complete causal link.** A tag-trigger write has a placement source, not a root certification ID or a link to its causing operation. String-prefix deletion of certification sources cannot identify all descendants.
3. **Net tag presence is not full replay.** If the same tag is present before and after re-certification, there is no added/removed placement transition. Existing tag effects may remain under their old placement key without being retired/re-evaluated. That can be acceptable for the current presence-based model, but does not establish the user's stronger per-certification replay guarantee.
4. **Typed fields bypass provenance.** `applyCellOps` directly assigns vote, action, voteMultiplier, and livingState. Prefix stripping cannot undo them, distinguish overlapping writers, or protect manual overrides. Raw submission-copy writes bypass even TableUpdate provenance.
5. **Manual markers do not protect future replay.** A manual REM masks earlier additions only; a newly appended certification ADD can re-add that module. A new automatic SET can supersede an operator's earlier SET. Keeping old manual marker strings is not sufficient override protection.
6. **No durable override intent.** Comparing current values to last certified values would help only some cases. It cannot identify changes later changed back, same-value operator assertions, or specific overridden effects.
7. **Separate table/message writes.** Current certification updates have no persisted run receipt or cross-record atomic consistency guarantee.
8. **Absent/changed submissions and scripts lack explicit replay policy.** Prior direct values may remain; planned expressions and live tag scripts come from different execution times.
9. **Structural identity is mutable**, described next.

These are static-code observations. No new production debugging, mutation, or behavioral patch was performed.

## 5. Stable Identity Prerequisite

Use permanent IDs for player ROWS, game days, columns, placements, runs, and effects. Display names, array indexes, dates, and column titles are not identities.

Concrete failure examples:

- Rename originating column Status to Conditions: the tag's new placement key differs from the source stamped on earlier effects.
- Delete a player earlier in the array: later players change index and their ownership keys change.
- Delete the originating row/column: effects on other cells can remain with no durable origin record from which to retire them.

Authentication userId is not necessarily a player-row ID: multiple unjoined rows share NOT-JOINED; simulated/other rows may share user identity. Emails are mutable too.
Existing stable file IDs provide a useful pattern, but not a ready-made player/day/column migration.

Changing only future source-key generation is insufficient. Existing marker keys and stored PlannedUpdate targets also need compatibility/migration. A plan captured before a row reorder must not execute against a different player later.
Column-title script arguments still need a deliberate authoring/resolution strategy if stable column references are added.

Important normalization trap: `components/game/playerTableNormalization.ts`, `normalizeDay`, constructs a fixed object rather than spreading the old day. New day IDs or tracking fields could be silently dropped unless normalization is updated. Audit imports, seeding, duplication, reset, and simulation snapshot code too.

## 6. Manual Write Paths That Must Be Covered

- `components/game/PlayerTable.tsx`: UNDOABLEsetLivingState, UNDOABLEsetExtraColumnValue, column rename/delete, bulk cell changes.
- `components/game/DaysTable.tsx`: UNDOABLEsetVoteValue (also multiplier), UNDOABLEsetActionValue, UNDOABLEsetExtraDayColumnValue, UNDOABLEupdateMorningMessage, bulk vote/action/morning/tag/file updates.
- `components/game/PlayerPageOPERATOR.tsx`: updateMorningMessage and bulkUpdateMorningMessages currently replace message strings.
- `components/game/TagCellEditor.tsx`: buildSavedValue writes manual tag ADD/REM and optional text SET markers.
- `components/game/scriptFiles/CellFilesEditorDialog.tsx`: visible file-list edits reconcile through `fileCellEditorText` / `reconcileFileCell`, not raw stream overwrite.
- `utils/tagEncoding.ts`: reconcileTagSelection.
- `components/game/UserRow.tsx`: deleting a player filters the array; it does not centrally migrate provenance or retire all effects caused by that player's removed tags.
- VoteEditorDialog, ActionEditorDialog, DayUserRow, and TagCellDisplay are UI callers into these paths.
- History restoration, imports, resets, and any legacy raw setters also need classification.

A common write boundary should record origin explicitly: manual, certification, trigger, normalization/migration, undo/redo, etc. Do not label every table write as an operator override.
Editing a shared markdown FILE's contents is not the same as manually overriding membership of that file module in one cell.

## 7. Recommended Tracking Model (Proposal, Not A Decision Or Implementation)

Keep this a focused provenance/effect layer over the existing data model, not an unrelated game-engine rewrite.

Record at least:

- CertificationRun: unique ID, game/day/type scope, actor, execution sequence/time, superseded run, submission snapshots/revisions, status.
- Certified submission branch: stable player/submission identity, root vote/action/input payload, selected/executed script plan.
- Effect: unique ID, originating event/branch, stable target and operation, evaluated operand/result, ordering and lifecycle state.
- Causal support links: causing effects/placements/root events, not just a display source label.
- ManualWrite/Override: unique event/actor, stable target or affected effect/module IDs, relevant value/operation and which certified result it supersedes.
- Per-target revision / relevant state fingerprint for stale-plan detection.

Preserve old receipts as superseded history instead of deleting all evidence. Bound active metadata and history/subscription size; do not append unlimited history to one hot shared document.

For typed fields, retain normal scalar/structured public projections for existing readers, but track their base plus active operations/overrides in an appropriate sidecar or canonical effect model. Merely saving an old value and restoring it on undo would erase independent later writes.
Define operations/conflicts explicitly: living-state override vs multiplier set/multiply/add vs vote/action replacement are not interchangeable string append operations.

Record evaluated effects and execution/source revisions for audit and reliable retirement. Keep display FILE modules live-linked; do not bake their markdown content into cell storage to obtain provenance.

### Shared Tags Need More Than One Parent

Example: R1 adds Infected; a manual event or R2 also supports that same placement. Its visible tag and trigger output should survive retirement of R1 if independently supported.
Model support from multiple owners. Do not delete all effects with that tag's placement key simply because one parent certification is replaced.
Conversely, once the final supporting root is gone, retire attributable descendants recursively.
The current trigger system allows cascades/cycles; do not assume a simple single-parent tree. Pure reference counts can leave unsupported cycles alive; consider reachability from independent roots.
Whether an existing shared tag's output must be refreshed after its read dependencies/script version change needs an explicit policy.

## 8. Safe Re-Certification Workflow (Recommended)

1. Read a complete, consistent effective snapshot of tables, messages, relevant ledger, submissions, and scripts. Distinguish loading/truncation from genuinely absent submissions.
2. Identify prior active runs ONLY in the replacement scope.
3. In memory, retire those runs' direct effects and dependent causal support; resolve the baseline with unrelated roots and manual events preserved.
4. Evaluate the replacement submissions/scripts in that baseline, collecting identifiable new effects and dependencies. Reconcile shared tag support, not merely final tag-name equality.
5. Detect which proposed writes would supersede protected manual decisions; classify unrelated additive edits separately.
6. Present an override review. No real writes should have occurred before confirmation.
7. Apply choices to the plan and recompute dependent effects as required.
8. Check that relevant revisions still match; if another tab/operator changed data during the popup, re-plan/review rather than clobber it.
9. Commit effective values, new receipt, retired-run state, causal links, and override decisions consistently. Use existing staging/batch semantics or an appropriate atomic backend mutation; separate best-effort setters are insufficient for durable tracking.

Retirement is not automatically the same as a gameplay OnTagRemoved event. A virtual remove/re-add during re-certification should not accidentally run an explicit irreversible removal handler twice. Distinguish administrative replay from real final tag transitions and define the policy.
Likewise, clarify whether AUTOREMOVE=False only exempts ordinary tag removal or also survives certification supersession. The user's request says remove previous certification consequences; do not silently let persistent prefixes escape it.

## 9. Conflict UI And Decisions Still To Clarify

Required UI: identify the particular overridden result and ask before changing it. Suggested review rows group by player/submission and show target, last certified result, current manual result, proposed replacement, and relevant tag consequences. Offer Keep operator change / Use new certification and cancellation, with optional apply-to-all choices.

Do not implement Keep by simply leaving an old manual marker in place: newer appended operations may still supersede it. Preserve an explicit protected decision or adjust/suppress the conflicting new effect.
Do not implement Replace by globally stripping source 'manual'; it would erase unrelated operator work.

Important open decisions:

- Does "the one" mean a field/module, a player's submitted action/vote, or its whole causal branch?
- If the PRIMARY action/vote is kept manually, should new effects from a different submitted action run? Keeping one action label while applying another's effects is misleading. A branch-level choice may be safer here than cell-only protection.
- If only a DERIVED morning-message module is manually overridden, should unaffected effects of the same submission still apply? Likely yes, but record a targeted decision.
- Does a same-value manual assertion count as a protected override? Track events so the UI can decide; value equality alone cannot establish intent.
- Does Keep protect this replay only or pin an override until explicitly cleared?
- What should happen when a previously certified submission is missing/withdrawn?
- What should happen to historical untracked direct writes or already-orphaned legacy keys? Do not invent ancestry that cannot be reconstructed.

## 10. Undo, Staging, Persistence, Privacy

- `hooks/useUndoRedo.ts` is an in-memory global command stack of action/undo closures, not durable provenance. Undo/redo must update ledger/override state together with displayed values, not create accidental fresh manual conflicts.
- `hooks/useTableFreeze.ts`, `usePlayerDataFreeze`, uses batch `game:${gameId}:player-data` for userTable, userTableTitle, visibility, morningMessagesList.
- `record.value` stays published; operators use `record.scheduledUpdate?.value ?? record.value` for drafts. Tracking must describe that SAME revision/branch and publish/cancel consistently with it.
- Do not introduce a separate publication-group architecture; existing batchId groups atomic publication.
- Audit/history/role details should not be exposed publicly just because materialized table values are public.
- Simulation roots/IDs and provenance records must be namespaced/snapshotted consistently; live and simulated games must never share causal events accidentally.
- Read `AGENTS.md`, `utils/about-parts-of-this-codebase/userVariables-system.md`, and before Convex edits `convex/_generated/ai/guidelines.md`.
- For stable-ID/schema rollout, use widen/migrate/narrow compatibility, update DATA_CONFIG for new generic-record keys, and never run destructive migrations or production writes without explicit approval.

## 11. Acceptance Tests For A Future Implementation

- Re-certify unchanged input: same visible state, no duplicated modules, traceable new run/receipt policy.
- Changed/withdrawn submission: retire old effects even in cells the replacement no longer targets.
- Cert -> tag A -> tag B -> morning file: clean attributable retirement and replay.
- Same tag before/after: verify the chosen refresh policy, including changed trigger logic/read inputs.
- Shared manual/other-cert tag support survives retirement of one run; last support removal cleans descendants.
- Unsupported cycles do not keep retired effects alive.
- Manual vote/action/multiplier/living-state override prompts; Keep/Replace behave consistently with dependent effects.
- Manual tag/file removal is not silently undone by a later automatic ADD.
- Unrelated manual additive contribution does not trigger or get erased by a whole-cell overwrite policy.
- Manual change and change-back, same-value assertion, input-override edit, and undo/redo remain attributable.
- Rename/delete/reorder players/columns/days before and after planning/certification; target identity does not drift.
- Another day/type's effects remain untouched.
- Concurrent write while review is open forces safe re-planning.
- Cancel review leaves all real state unchanged; failed execution/commit leaves no half-updated receipt or tables.
- Staged certify -> edit -> re-certify -> publish/cancel keeps ledger and values consistent.
- Reload, simulation isolation, legacy adoption, and file live-link behavior remain correct.

## 12. Implementation Sequence And Current Status

Suggested later sequence: stable IDs/compatibility and write-origin boundary -> identifiable typed/modular effects -> pure certification retirement/replay planner -> conflict review and revision-checked commit -> staging/undo integration -> migration/rollout tests.

The user has not requested implementation now. No new tests were run for this research-only document. Previous baseline: 12 game-day timing tests, 29 cell-module tests, and full TypeScript passed before this investigation.

Useful commands later: `npm run test:cell-modules`, `npm run test:game-days`, `./node_modules/.bin/tsc --noEmit`.
The worktree contains extensive prior changes; preserve them. No commits, deployment, data repair, or version bump was made for this handoff.
