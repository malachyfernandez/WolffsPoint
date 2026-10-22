# Handoff: Integration Patch-Up And Production Verification

## Follow-Up Checkpoint (2026-10-17)

The blockers described below have been patched and re-tested. The original
handoff is retained as history; current runtime details are in
`certification-implementation-status.md`.

- TypeScript and all 120 unit/integration tests pass.
- Both browser suites pass in the isolated simulator, including real vote
  editing/undo/redo, Keep/Replace, tag cleanup, source labels, desktop/mobile
  layouts, folder autofocus/selection, markdown history, and tooltip dismissal.
- Offline web, iOS, and Android exports pass. Both changed backend modules also
  compile offline. The mixed-unit divider warning is fixed.
- ESLint has no errors; existing warnings remain. Repository-wide Prettier debt
  outside the patched files is not bulk-reformatted. Generated bundles, Convex
  output, and the historical truncated profiling trace are excluded from source
  formatting checks.
- The browser tooltip failure was stale Metro resolution after adding `.web`
  files; a cleared resolver-cache restart fixed it without weakening the test.
- The folder event/path bug and shared name-field autofocus/selection are fixed.
- Provenance origin flags now preserve automatic/restored snapshots through
  ordinary writes, staged drafts, and publication. Submission values are checked
  as well as timestamps, and unchanged legacy plans retain their accepted target
  identities across replay.
- The development backend was deployed after explicit user approval, and both
  certification endpoints were verified as registered. No production deployment,
  real game data repair, migration, or version bump was run.

## 1. What You Are Being Asked To Do

Repository root:

```text
/Users/malachyfernandez/Documents/1-programing/1-apps-and-sites/wolfspoint/wolffspoint
```

The user asked the previous agent to verify that the large integrated worktree is fully integrated and production-ready, and to keep working until it is. This handoff is specifically so another agent can patch the last verified holes without re-reading the old conversation.

There were multiple agents/people working in the same dirty worktree. Do **not** assume every failure came from the other agent, and do **not** revert broad changes. Preserve concurrent certification/provenance, simulator, markdown-editor, timing, and UI work unless a specific line is proven wrong.

Current goal for the receiving agent:

1. Fix the remaining verified blockers listed below.
2. Preserve the existing markdown/file editor, tag/cell module, game-day timing, simulator, and certification/provenance behavior.
3. Re-run the verification suite.
4. Only call it production-ready when the checks are clean and the simulator/browser run has no blocking runtime errors.
5. If asked to show the live site, open the running local app in Zen as a new tab. The previous local URL was `http://localhost:8081`, while the markdown UI suite normally uses `http://localhost:8082`.

## 2. Current Verified Status

Latest direct verification state before this handoff:

| Check                                                                                                                                                        | Result                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| `./node_modules/.bin/tsc --noEmit`                                                                                                                           | **Pass**                                                             |
| `npm run test:markdown-files`                                                                                                                                | **17 pass**                                                          |
| `npm run test:cell-modules`                                                                                                                                  | **29 pass**                                                          |
| `npm run test:game-days`                                                                                                                                     | **12 pass**                                                          |
| `npm run test:certification`                                                                                                                                 | **47 pass** (`certificationProvenance`: 30, `liveCertification`: 17) |
| `EXPO_PUBLIC_SIM=0 EXPO_OFFLINE=1 EXPO_NO_DOCTOR=1 CI=1 ./node_modules/.bin/expo export --platform all --output-dir /tmp/wolffspoint-release-check-20261017` | **Pass** for web, iOS, Android                                       |
| `eslint "**/*.{js,jsx,ts,tsx}"`                                                                                                                              | **Fail**: 1 error, 325 warnings                                      |
| `npm run test:markdown-ui` against the in-memory sim                                                                                                         | **Fail** at the tooltip assertion                                    |

The latest TypeScript run was clean. Earlier type errors in `utils/liveCertification.ts` and `script/runtime/interpreter.ts` have already been resolved.

The latest export completed successfully. Warnings still observed during export:

- `caniuse-lite` is about seven months old.
- Uniwind reports `Invalid calc, you can't mix % with other units` at least once.
- These were warnings, not export failures, but should be assessed rather than silently ignored.

## 3. Remaining Verified Blockers

### A. One ESLint error: conditional hook in `FontText`

File: `components/ui/text/FontText.tsx`

Current code around lines 63-66:

```ts
const colorToken = color || getColorTokenFromClassName(className) || 'text';
const colorClass = `text-${colorToken}`;
const resolvedStyle = useResolveClassNames(colorClass);
const resolvedColor = String(
  resolvedStyle?.color ?? (useCSSVariable(`--color-${colorToken}`) || colorToken)
);
```

`useCSSVariable` is inside a nullish fallback expression, so it is called conditionally. ESLint reports:

```text
React Hook "useCSSVariable" is called conditionally.
React Hooks must be called in the exact same order in every component render.
```

Expected patch shape:

```ts
const resolvedStyle = useResolveClassNames(colorClass);
const cssVariableColor = useCSSVariable(`--color-${colorToken}`);
const resolvedColor = String(resolvedStyle?.color ?? cssVariableColor ?? colorToken);
```

Do not remove color resolution behavior; just make the hook unconditional.

### B. `test:markdown-ui` now reaches the editor but fails on the shared tooltip

File: `scripts/test-markdown-editor-ui.mjs`, around lines 129-140.

The test successfully:

- Enters game `SIMOP1234` in `EXPO_PUBLIC_SIM=1` mode.
- Verifies `morningMessagesList` does not keep writing while idle.
- Creates a new markdown file.
- Inserts/creates inputs without losing draft text.
- Switches Source Text -> Markdown.
- Preserves calculations and renders `Hello Ada. Total: 6`.
- Renames `Name` to `Recipient`.

It then fails here:

```ts
await page.hover('[aria-label="Bold"]');
await settle();
assert.ok(
  await page.evaluate(() =>
    [...document.querySelectorAll('body > div')].some(
      (node) =>
        node.style.position === 'fixed' && node.style.opacity === '1' && node.textContent === 'Bold'
    )
  )
);
```

This is the current observed failure. It is **not** the earlier stale-file/editor-identity failure anymore; the test output shows the correct file session and source/markdown round trip reached the tooltip check.

Relevant implementation files:

- `hooks/useTooltip.ts` — native/shared entry point. Keeps hovered state but imports no DOM renderer.
- `hooks/useTooltip.web.ts` — web implementation. Creates one `body > div`, owns it via `tooltipOwner`, renders content through `createRoot`, tracks document `mousemove`, hides on `pointerdown`, clamps to viewport.
- `hooks/useIsTouchInput.ts` — shared input-modality store. Native always returns true. Web starts from `(pointer: coarse)` and flips on observed pointer events.
- `script/editor/useTooltip.ts` — compatibility re-export to `../../hooks/useTooltip`.
- `components/game/townSquare/TownSquareToolbarButton.tsx` — passes `label` to `useTooltip` and calls `setHovered` from `Pressable.onHoverIn/onHoverOut`.
- `components/game/townSquare/TownSquareComposerToolbar.tsx` — creates the `label="Bold"` toolbar button.
- `components/game/markdownEditor/EditorPane.tsx` and `TabbedLayout.tsx` — mount the toolbar.

Likely debugging path:

1. Inspect all `[aria-label="Bold"]` elements, not only the first. `page.hover` selects the first DOM match; a hidden/read-only duplicate could receive the hover.
2. For each candidate, log bounding box, visibility, `elementFromPoint`, and whether it is in the active dialog portal.
3. Check whether `Pressable.onHoverIn` actually fires under React Native Web in this nested dialog.
4. Check `useIsTouchInput` has not incorrectly latched to `true`. The test dispatches a synthetic touch `pointermove` only **after** the first assertion, so the initial tooltip should be visible in headless mouse mode.
5. The test intentionally requires a direct `document.body > div` tooltip with `position: fixed`, `opacity: 1`, and text `Bold`. Preserve that behavior or update the test only if the UI contract deliberately changes.
6. After showing it, the test dispatches a touch `pointermove` and requires the tooltip to hide. Do not remove touch gating.

### C. Full lint is still not clean

The direct ESLint run produced 1 error and 325 warnings. The only hard error is `FontText.tsx`. Most warnings are broad/pre-existing (`no-unused-vars`, hook dependency warnings, default-import naming warnings, unused eslint-disable comments). After fixing the hook error, run the repository's real lint script:

```sh
npm run lint
```

That script also runs `prettier -c` over the repo. Targeted Prettier previously passed on the markdown/tooltip/input files, but a full repo prettier check had not completed after the latest concurrent edits.

## 4. Browser/Simulator Status

The in-memory sim is activated with `EXPO_PUBLIC_SIM=1`. Metro aliases the real Convex/Clerk imports:

- `convex/react` -> `sim/mockConvexReact.ts`
- `convex/react-clerk` -> `sim/mockConvexReact.ts`
- `@clerk/clerk-expo` -> `sim/mockClerk.tsx`

See `metro.config.js` and `sim/README.md`.

The UI test requires `window.__simDb` and refuses non-sim servers. The standard test server command is:

```sh
EXPO_PUBLIC_SIM=1 EXPO_OFFLINE=1 npm run web -- --port 8082
```

Then in another terminal:

```sh
npm run test:markdown-ui
```

`npm run test:markdown-ui` runs `node scripts/test-markdown-editor-ui.mjs` and defaults to `http://localhost:8082`.

### Earlier simulator write/render loop appears improved

Previously, browser runs reported:

- React `Maximum update depth exceeded` in `<SimSwitcher>`.
- `GlobalRateLimitMonitor user_lists:morningMessagesList:SIMOP1234: 51 calls in last 30s`.
- `BeanJar Dev Warning: uservar_rate_limited`.

The diagnosed cause was that provenance-aware list wrappers returned a new setter every render. `DaysTable` normalization depended on that setter and could repeatedly write morning messages.

Current state:

- `hooks/useData.ts` now wraps `userTable` and `morningMessagesList` setters in `useCallback`/`useMemo`.
- The wrapper reads the latest staged baseline through a ref rather than closing over an old render.
- It passes `cellWriteOrigin: 'tracked'` for normal writes and `'restore'` for undo/history restore paths.
- `scripts/test-markdown-editor-ui.mjs` now explicitly counts `morningMessagesList:SIMOP1234` mutations and asserts idle renders do not add writes.
- In the latest UI run, those morning-write assertions passed and the test proceeded into the file editor. So the previous `SimSwitcher`/morning-message storm was not the immediate blocker in that run.

Still inspect these if the loop returns:

- `components/game/sim/SimSwitcher.tsx` publishes claimed width through `setSidebarWidth` in `useLayoutEffect`.
- `utils/sidebarWidth.ts` uses a module-level external store and only notifies when width changes.
- `hooks/useContentWidth.ts` returns `useWindowDimensions().width - useSidebarWidth()`.
- `SimSwitcher` intentionally uses viewport width for its overlay decision because using content width would feed back through the sidebar width it publishes.

## 5. Markdown/File Editor Context

The markdown-file work is mostly implemented and heavily tested. Treat it as existing behavior to preserve.

Core architecture:

- `script/editor/ScriptEditorDialog.tsx` owns the parsed AST, file input state, source draft, full-file save history, file identity, and Source/Markdown mode transitions.
- `components/game/MarkdownEditorDialog.tsx` is the simpler direct-markdown view for eligible markdown-kind files.
- `script/editor/FileEditorModeSwitch.tsx` provides the persistent Markdown / Source switch.
- `utils/markdownFileEditor.ts` extracts/replaces the primary markdown body, normalizes file inputs, and guards unsafe flattening.
- `utils/scriptFiles.ts` handles script-file indexing, file references, parse caching, `FileInput` declarations, file markers, and flattening.
- `script/markdownVariables.ts` handles `/*markdownVariable: "Name"*/` marker parsing/substitution/rename.
- `script/lang/parser.ts` and `script/lang/printer.ts` preserve markdown literal bindings and expressions.
- `script/runtime/interpreter.ts` evaluates `FileInput`, `Inputs.entry(...)`, markdown substitutions, functions, and file call-site overrides.
- `components/game/scriptFiles/FileEditorDialog.tsx` and `components/game/scriptFiles/` contain the file browser/editor integration.
- `components/game/markdownEditor/` contains the reusable markdown editor subcomponents.

Semantics to preserve:

- `FileInput({NAME = "X", DEFAULT = ...})` declarations are editable inputs.
- Input names are case-insensitive.
- Runtime `inputState` and call-site file overrides must update both markdown substitution and the live `Inputs` object used by calculations.
- Explicit computed markdown bindings such as `"Total" = total` are calculations, not implicit overridable inputs. They must not be hoisted into `FileInput` declarations or stripped.
- Legacy unbound markers/default literal bindings can become compatible inputs.
- Functions are hoisted and must see `FileInput`s declared later.
- Markdown view supports one primary literal `CreateMarkdown` block plus supporting declarations. Multiple rendering blocks, dynamic content expressions, or complex script structures stay in Source; do not flatten them destructively.
- Renaming inputs updates markers, binding names, and `Inputs.entry(...)` / `InputsWithData.entry(...)` references case-insensitively.
- Removing an input is blocked while references remain.
- Save history stores the full source draft (`scriptText`), not only rendered markdown.
- History restore edits the draft but does not publish it until Save.
- Open editor sessions should ignore delayed published echoes that would erase a newer unsaved draft.
- Unsaved changes need confirmation on all dismissal paths.

Useful documentation:

- `utils/about-parts-of-this-codebase/markdown-file-editor.md`
- `CELL_MODULE_AUDIT.md`
- Relevant AGENTS.md sections in the repo rules.

Markdown regression tests live in `scripts/markdownFileEditor.test.ts`; latest run had 17 passing tests.

## 6. Certification/Provenance Work To Preserve

Another agent/user actively modified this area during verification. It is substantial and should not be reverted.

Important files include:

- `types/playerTable.ts` — `PlayerData`, `DayData`, `UserTableItem`, `UserTableTitle`; includes stable IDs and `fieldProvenance`.
- `types/certification.ts` — planned ledger/effect/conflict types using stable target IDs.
- `utils/fieldProvenance.ts` — typed-field histories, manual decisions, manual override marker encoding, provenance source helpers.
- `utils/fieldProvenanceStorage.ts` — splits private field histories from public user-table projections and joins them back.
- `utils/liveCertification.ts` — plans re-certification on copies, detects manual override conflicts, applies keep/replace choices, replays planned updates, and runs tag-trigger fixpoints.
- `utils/certificationIdentity.ts` and `utils/certificationProvenance.ts` — stable identity adoption and provenance helpers.
- `utils/cellOps.ts` — cell/table operations, source stripping, tag placements, persistent tag writes, and reachability pruning.
- `utils/cellPieces.ts` — append-only attributed marker stream, effective-cell folding, `cellTagSupports`, and tag/file/text provenance.
- `utils/cellWriteOrigin.ts` — distinguishes ordinary tracked writes from undo/history restores.
- `components/game/CellOriginIndicator.tsx` — displays a field/module origin; currently strips the `persistent:` prefix before labeling.
- `components/game/CertificationReviewDialog.tsx` — review UI for keep/replace conflicts.
- `components/game/DayUserRow.tsx`, `DaysTable.tsx`, `PlayerTable.tsx`, `UserRow.tsx`, `playerTableNormalization.ts`, `hooks/useTagTriggers.ts`, `hooks/useData.ts`, `convex/user_lists.ts`, `sim/mockDb.ts`.

Current semantics worth preserving:

- Public `userTable` data should remain ordinary scalar/cell values; detailed rollback histories are stored separately under `private-fields:userTable` via `fieldStorageKey`.
- `convex/user_lists.ts` accepts `cellWriteOrigin?: 'tracked' | 'restore'` and avoids re-recording restored snapshots as fresh manual edits.
- `sim/mockDb.ts` mirrors that provenance split for simulator tests.
- `trackManualTableChanges` records manual typed-field writes only when an automatic history exists; it keeps unrelated fields untouched.
- Manual string overrides are encoded as `manual:override:<encoded sources>` so re-certification can identify exactly which automatic owners were superseded.
- `AUTOREMOVE = False` tag writes use a `persistent:` source prefix; provenance still treats `persistent:tag:tracked:` as automatic.
- `pruneUnsupportedTagPlacements` uses reachability from manual/baseline/certification/persistent roots so unsupported tag cycles can be removed without deleting independently rooted shared tags.
- Stable player/day/column IDs matter; do not reintroduce row index, email, display name, or column title as identity.
- `planLiveCertification` works on copies and returns `{users, mornings, conflicts, scope}`; callers should commit only after review/freshness checks.

The package script now runs both certification suites:

```json
"test:certification": "node scripts/test-cell-modules.mjs scripts/certificationProvenance.test.ts && node scripts/test-cell-modules.mjs scripts/liveCertification.test.ts"
```

Latest certification result: 47 tests passing.

## 7. Other Known User-Visible Issues Worth Including In The Patch-Up

A separate report exists at `utils/report-file-dialog-issues.md`. These were not necessarily part of the current markdown UI failure, but they are known unresolved issues and may be worth fixing if the user expects production readiness broadly.

### `[object Object]` folder bug

In `components/game/scriptFiles/FileBrowserDialog.tsx`, the list-view toolbar passes `openNewFolderPrompt` directly to `Pressable` through `ViewToggleButton`. React Native calls `onPress(event)`, so the event object becomes the `parent` argument. `joinFilePath(parent, name)` then creates a literal `"[object Object]/..."` folder.

Likely minimal fix:

```tsx
onPress={() => openNewFolderPrompt()}
```

Optionally type `openNewFolderPrompt(parent?: string)` and defensively ignore non-string event arguments. Existing bad data already created under `[object Object]` will not be healed by the code fix.

### Prefilled name fields do not auto-select

No `selectTextOnFocus` usage exists. Name prompts use `autoFocus`, but `components/ui/forms/FontTextInput.tsx` destructures `autoFocus` and does not forward it on the normal `TextInput` path; it only forwards it in the autoGrow `<textarea>` branch.

Likely direction:

- Forward `autoFocus` in the standard `TextInput` return.
- Add a shared select-on-focus prop/primitive, forwarding `selectTextOnFocus` to `TextInput` and selecting on focus in the textarea branch.
- Apply it to shared name prompts (`FileBrowserDialog`, `MoveToDialog`, `MarkdownVariableDialog`, `AddTagDialog`, etc.) deliberately rather than scattering ad-hoc handlers.

## 8. Project Rules And Constraints

- Read `AGENTS.md` and `CLAUDE.md`; before Convex changes, read `convex/_generated/ai/guidelines.md`.
- Do **not** bump `CLIENT_VERSION`, run `version:bump`, or touch `latestClientVersion` unless the user explicitly asks.
- Do **not** deploy Convex or modify schema casually. The recent `convex/user_lists.ts` changes are already part of the provenance work; preserve them unless a verified bug requires a fix.
- Do **not** run the markdown UI test against a live backend. It must run under `EXPO_PUBLIC_SIM=1` and verify `window.__simDb`.
- Use `ShadowScrollView` for scrollable UI, not bare `ScrollView`.
- Game-area breakpoints should use `useContentWidth()`, not raw viewport width, except `SimSwitcher`'s deliberate overlay decision documented above.
- Editor dialogs with editable state must intercept Cancel, X, overlay click, Escape, and swipe dismissal with unsaved-change confirmation; use `isSwipeable={false}` where required.
- Tooltips are mouse affordances. They must be disabled/hidden after touch input and must not rely on per-pointer-move React state.
- The worktree is intentionally very large and dirty. Do not reset, checkout, clean, rebase, or revert unrelated files.

## 9. Suggested Verification Sequence

From the repo root:

```sh
./node_modules/.bin/tsc --noEmit
npm run test:markdown-files
npm run test:cell-modules
npm run test:game-days
npm run test:certification
```

For lint/format:

```sh
npm run lint
```

For simulator UI:

```sh
EXPO_PUBLIC_SIM=1 EXPO_OFFLINE=1 npm run web -- --port 8082
npm run test:markdown-ui
```

For a production-like bundle check without sim mode:

```sh
EXPO_PUBLIC_SIM=0 EXPO_OFFLINE=1 EXPO_NO_DOCTOR=1 CI=1 \
  ./node_modules/.bin/expo export --platform all \
  --output-dir /tmp/wolffspoint-release-check-<date>
```

If a web-only export is enough for a quick check:

```sh
EXPO_PUBLIC_SIM=0 npx expo export --platform web --output-dir /tmp/wolffspoint-web-check
```

Expected final state:

- TypeScript clean.
- All listed unit/integration suites pass.
- `npm run lint` has no errors.
- Markdown UI test completes, including the tooltip and touch-dismiss assertions.
- No `Maximum update depth exceeded`, uncaught errors, or uncontrolled `morningMessagesList` mutation logs in the browser test.
- Export succeeds.
- Any remaining warnings are explicitly understood and reported.

## 10. Notes On Recent Concurrent Changes

Recent user/other-agent edits that should be treated as current state, not mistakes:

- `components/game/CellOriginIndicator.tsx` now strips `persistent:` before producing a label.
- `components/game/CertificationReviewDialog.tsx` uses the named `CloseButton` import and button padding.
- `components/game/DayUserRow.tsx` selects the vote provenance first only when a vote history exists, otherwise falls back to vote multiplier.
- `components/game/PlayerTable.tsx` routes edits through `planTableChanges`, adds an undoable delete-user path, and tracks extra-column manual changes.
- `components/game/UserRow.tsx` accepts an optional `onDeleteUser` prop.
- `components/game/playerTableNormalization.ts` avoids duplicate generated stable IDs.
- `hooks/useTagTriggers.ts` prunes unsupported placements and resolves dead placements through stable player/day IDs.
- `hooks/useData.ts` passes `cellWriteOrigin` and keeps tracked setters stable.
- `convex/user_lists.ts` and `sim/mockDb.ts` understand `cellWriteOrigin` and private field-history storage.
- `utils/cellPieces.ts` adds `cellTagSupports` so hidden duplicate owners still count as support.
- `utils/cellOps.ts` records persistent tag sources and prunes unsupported placements by reachability.
- `utils/liveCertification.ts` supports an optional namespace, friendlier conflict labels, and vote display names.
- `scripts/test-markdown-editor-ui.mjs` now checks idle morning-message writes before opening the file editor.
