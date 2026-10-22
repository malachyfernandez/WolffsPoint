<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.

<!-- convex-ai-end -->

<!-- svg-conversion-start -->

## SVG to React Native Component Conversion

This project uses SVGR for converting SVG files to React Native components.

### Conversion Process

1. **Convert SVG to React Native component:**

   ```bash
   npx @svgr/cli --native --typescript --out-dir app/components/icons/ path/to/svg/file.svg
   ```

2. **Key Options:**
   - `--native`: Essential for React Native compatibility (uses react-native-svg components)
   - `--typescript`: Generates .tsx files with proper types
   - `--out-dir`: Specifies where generated components should be saved
   - `--icon`: Scales SVG to standard icon size (usually 1em) - optional

3. **Usage in Components:**

   ```tsx
   import SvgComponent from '../icons/ConvertedSvg';

   // Use as container with centered text
   <View className="relative items-center justify-center">
     <SvgComponent width={154} height={60} />
     <Text className="absolute">Centered Text</Text>
   </View>;
   ```

4. **Requirements:**
   - Ensure `react-native-svg` is installed in the project
   - Generated components use `Svg`, `Path`, `Circle` from react-native-svg
   - Components accept standard SvgProps for customization

### Example Workflow

The GameTabBar component was updated to use SVG containers:

- SVG acts as the outer container
- Text is positioned absolutely in the center
- No icons displayed, text-only design
- Scalable and themeable through props
<!-- svg-conversion-end -->

<!-- unsaved-changes-confirmation-start -->

## Unsaved Changes Confirmation on Dialogs

**ALWAYS** add an "are you sure you want to leave?" confirmation to any dialog that has editable state (text inputs, tag selections, color pickers, etc.) when the user closes or cancels with unsaved changes. This is a required pattern for all editor dialogs in this project.

### Reference implementation

See `app/components/game/MarkdownEditorDialog.tsx` for the canonical implementation. The reusable confirmation dialog is `app/components/ui/dialog/UnsavedChangesDialog.tsx`.

### Required steps for every editor dialog

1. **Snapshot the initial state** when the dialog opens. Store it in dedicated `initial*` state variables (e.g. `initialTextValue`, `initialSelectedTagNames`) set inside the `useEffect` that runs on `isOpen`.

2. **Compute `hasUnsavedChanges`** by comparing the current draft state to the snapshot. Use `.trim()` on text comparisons. For arrays, compare sorted JSON strings.

3. **Intercept all dismiss paths:**
   - `handleAttemptClose()`: called by the Cancel button and the X close button. If `hasUnsavedChanges`, open the confirm dialog; otherwise close normally.
   - `handleOpenChange(open)`: passed to `ConvexDialog.Root`. If `!open && hasUnsavedChanges`, open the confirm dialog; otherwise pass through to `onOpenChange`. This catches overlay clicks and Escape key.

4. **Disable swipe-to-dismiss** by passing `isSwipeable={false}` to `ConvexDialog.Content`. HeroUI's swipe animation completes before `onOpenChange` fires, so intercepting the close after a swipe leaves the dialog stuck off-screen.

5. **Replace `ConvexDialog.Close` with a `Pressable`** that calls `handleAttemptClose`. The built-in `ConvexDialog.Close` auto-closes the dialog and bypasses the unsaved-changes check. Use a `Pressable` with the same styling and a lucide `X` icon instead:

   ```tsx
   <Pressable
     onPress={handleAttemptClose}
     className="bg-text-inverted/10 hover:bg-text-inverted/15 absolute right-0 top-0 z-10 h-10 w-10 items-center justify-center rounded-full">
     <X size={18} color="rgb(246, 238, 219)" />
   </Pressable>
   ```

6. **Render `UnsavedChangesDialog`** alongside the main dialog (sibling, inside the fragment):

   ```tsx
   <UnsavedChangesDialog
     isOpen={isLeaveConfirmOpen}
     onOpenChange={setIsLeaveConfirmOpen}
     onSave={handleSubmit}
     onDiscard={handleConfirmLeave}
   />
   ```

7. **`handleConfirmLeave`** closes both dialogs: `setIsLeaveConfirmOpen(false); onOpenChange(false);`

8. **Reset `isLeaveConfirmOpen` to `false`** in the open `useEffect` so stale state doesn't persist across reopens.

### Dialogs that already follow this pattern

- `MarkdownEditorDialog.tsx` (canonical)
- `TagCellEditor.tsx`
- `AddTagDialog.tsx`
<!-- unsaved-changes-confirmation-end -->

<!-- scripting-tag-system-start -->

## Scripting: Cell Pieces, UpdateCell Actions, and Tag Triggers

There are exactly **two places** where scripts run:

1. **Role/vote/morning messages**: embedded in markdown via `/*script ... script*/` blocks. At certify time the stored `plannedUpdates` on each player's submission are re-executed by `executePlannedUpdates` (see below).

2. **Tag triggers**: scripts attached to tags, run when the tag appears/disappears on a cell. Globals: `placedTag`, `placedUser`, `placedDay`, `placedColumn`. Input blocks are hidden (`hideInputs`).

### Cell pieces: provenance-attributed cell content (`utils/cellPieces.ts`)

A cell string is `base text + append-only marker stream`:

- `[/ADD src="S"]text[/ADD]` — text piece
- `[/ADD src="S" kind="file" ref="f_x"/]` — live-linked file piece (resolves from the files index at read time)
- `[/TAG id="f_x" name="N" src="S"/]` — tag piece (id-first, name fallback)
- `[/REM src="S" match="tag:X"/]` — remove tombstone (masks earlier matching pieces)
- `[/SET src="S"]text[/SET]` — replace marker (last unmasked SET wins as base)
- `[/ORDER src="manual" refs="..."/]` records encoded file ordering independently of module ownership.

Effective content = `effectiveCell`/`effectiveCellText` fold; `parseCell`/`cellTagRefs` (tagEncoding) are piece-aware so all consumers see effective content. Reverting a source = `stripSource(raw, srcPrefix)` + re-fold. Sources: `certify:d{day}:{a|v}:{email}`, `tag:{ref}@{cellAddr}` (placement key, `formatCellAddress` = `u{p}|d{d}|{col}` or `u{p}|p|{col}`), `manual`.

### `UpdateCell` cell-op blocks

`UpdateCellStatement.body` is a real block — cell ops are nested statements, not an action list:

- `CellOpStatement { scope, op, value }` — add / remove / replace. `scope: 'all'` ("For All Cells") applies to every matched cell and belongs at UpdateCell level; `scope: 'cell'` ("For Cell") applies to the iterated cell and belongs inside a ForEachCell loop. The block's dropdown switches `op` only (never scope).
- `ForEachCellStatement { itemName, body }`: the "For each cell" loop; binds `itemName` + `cellContents` per matched cell. New loops are empty. Only explicit cell operations write cells; `Return` in an update body is flagged and ignored, while real function returns still work. Display/input declarations and standalone file includes do not belong in update bodies.

```
UpdateCell({PLAYERS = ..., COLUMNTYPE = "user", DAY = currentDay, COLUMN = "Suspects"}) {
  Add tag("Infected");                 // 'all' scope
  Each cellContents {                  // ForEachCellStatement
    Add tag("seen");                   // 'cell' scope (bare op inside loop)
    ForAllCells Remove tag("X");       // explicit prefix also parses
    Replace cellContents.append("!");
  }
}
```

Parser: `Add`/`Remove`/`Replace` at statement level parse as CellOps (scope positional: inside a cell loop → `'cell'`, else `'all'`; explicit `ForCell`/`ForAllCells` prefixes win). Loose statements inside `UpdateCell { }` fold into a `ForEachCellStatement` so legacy `{ ...; Return e; }` parses to the lone-loop shape and prints back byte-identical (only when the loop body has no cell ops — otherwise canonical `Each` prints). `lintCellPlacement` flags `'cell'` ops outside a loop, `'all'` ops inside one, cell ops outside UpdateCell, and nested/misplaced `Each` — runs in every script editor (role files + role messages). The insert picker's "Cells" tab (first when `target.cellScope` is set — provided by `CellScopeContext` around the UpdateCell/ForEachCell nested canvases) offers "For All Cells" ops + the loop at UpdateCell level, "For Cell" ops inside a loop.

`Add File(...)` emits a live-linked file piece (`valueKind: 'file'`), not baked content. TableUpdates carry `mode` + `source` (provenance) into `applyCellOps`/`applyMorningMessageOps` (`utils/cellOps.ts`).

File values in cell operations share the normal file card and declared-input sockets. Empty chips and selector buttons open the file explorer; selected chips open the referenced file. The outer "Change file module" wrapper opens the expression swap picker, so File() can be replaced with tag() or another expression after a column change. Retargeting changes only the expression and preserves input overrides case-insensitively. Input values are frozen in the originating script/cell scope before storing the live reference, including deferred certification writes. `npm run test:cell-operation-files-ui -- http://localhost:8084` checks both trigger/display paths against the offline simulator only.

File input contracts are authoritative. Shared cleanup drops undeclared named arguments case-insensitively, preserving ID/PATH and declared overrides. Missing files and invalid definitions are never treated as empty signatures. File saves repair reusable-file callers in the same doc; open Blocks/Text/Markdown drafts normalize without discarding unrelated edits. `useFileInputCleanup` watches confirmed input removals in the operator game, then repairs active role/vote/morning/custom-column, newspaper, rulebook, and legacy-trigger references. It uses tracked writes, retains every module owner/tombstone/order marker, and cleans staged tables without publishing them. Save histories, certification snapshots, and private field histories stay immutable; deferred operations are cleaned before evaluation/execution instead. Scheduled payloads are not rescheduled by cleanup. Undeclared overrides must never emit FileInput statements into the flat namespace. Run `npm run test:file-inputs` and offline-only `npm run test:file-inputs-ui -- http://localhost:8084`. The same watcher also removes deleted tags from cells: when a tag file disappears (deleted or moved out of `tags/`) or a legacy tagDefinitions entry is dropped, `utils/deletedTagCleanup.ts` appends `tagid:`/`tag:` REM tombstones (`src="cleanup"`) to every cell with a visible ref, while a surviving same-named tag keeps name-only refs alive. Run `npm run test:tag-cleanup` and `scripts/probe-deleted-tag-cleanup-ui.mjs` against the offline simulator only.

UpdateCell supports optional `ALLOWDUPLICATES` (default False) and `AUTOREMOVE` (default True). Propagate these through the AST, printer, interpreter, planned updates, and cell ops. Duplicate suppression belongs in the effective-content fold: retain each owner's stored addition so removing one owner cannot erase another's module. Individual tag-placement rollback uses exact source matching; certify rollback intentionally uses a prefix. File pieces may store an encoded `call` attribute to preserve call-site input overrides.

Block-mode **flags** (purely client-side, `script/editor/Canvas.tsx`): rarely-changed options hide behind a flag menu in the block header instead of taking a row. A flag row renders while its value is non-default OR while locally opted in — default-valued flags clean themselves up on remount, and hiding a modified flag confirms + resets to default. Statement inputs opt in via `flag: true` in `script/registry.ts` (NUMSELECTABLE, MULTIPLYER, MIN/MAX, DEFAULT, FileInput DEFAULT); UpdateCell's ALLOWDUPLICATES/AUTOREMOVE are hand-coded flags. `buildStatementFromRegistry` skips flag args, `setRootExpression` removes a callArg set to `nothing`, and the reducer drops UpdateCell bool fields written back to their default — all so resets produce clean source.

Extra-column content types live in optional `UserTableTitle.extraUserColumnTypes` / `extraDayColumnTypes` arrays (`tags` / `files`, absent = tags). Keep these aligned when deleting columns. Tag columns disallow free typing. File-cell editors use `fileCellEditorText` + `reconcileFileCell`; never save their visible file list over the raw provenance stream. Bulk edits also reconcile each destination, rather than copying the source cell's marker stream.

Update Cell editor defaults wait for a column. `utils/cellColumnTypes.ts` treats morningMessage as Files and built-in scalar fields as direct values. Only newly generated, untouched bodies follow column changes; `editorDefaultBody` is editor-only undo metadata, never printed. Any body edit opts out permanently for that snapshot. Loaded source is never auto-rewritten. `lintCellColumnTypes` flags known column/value mismatches in every editor, including tag triggers, without guessing dynamic expression types. Run `npm run test:cell-columns`.

Single-value columns (voteMultiplier, vote, action, livingState) use For each cell plus For Cell Replace With; all-cell operations and per-cell Add/Remove are disabled with explanatory tooltips/toasts and flagged in loaded source. New untouched scalar bodies generate that loop. The UI label is "Replace With"; source syntax remains `Replace`. Root cell-value pickers show only File for Files columns, only tag for Tags columns, and compatible scalar expressions for direct-value columns. Suggested contains all valid root choices and empty categories disappear. Nested operands and file-input overrides retain the normal picker; unknown/dynamic columns remain unrestricted. Block previews provide file-card context so File values render a chooser, not generic positional arguments.

Whole-game upgrades use the existing DataProvider user-list/user-variable records, not a Convex schema migration. `cellModuleVersion >= 1` marks a completed upgrade; new games seed it with a file-backed default vote script before navigation. There is no legacy toggle or per-cell/per-tag migration button. The config upgrade creates a complete safety copy, preserves existing provenance streams, rebases copied certification namespaces, refuses conflicting triggers/frozen or loading inputs, and writes the completion marker only after content succeeds. New tags always use `tags/` files, including the Canvas tag manager. Migration UI is absent for new/upgraded games. `npm run test:cell-columns-ui` requires the offline simulator and must never target live data.

### Display modules + modular rulebooks (`cellModuleVersion >= 2`)

`DISPLAY_MODULE_VERSION = 2` enables full display composition (`useCellModuleStatus().displayModules`; player views use `useSharedCellModuleStatus(gameId, operatorUserIds)` since version/files live on the operator's records). A composition cell is top-level `File(...)`, `Folder(...)`, `CreateMarkdown(...)`, `CreateDivider(...)`, and `NavButton("label") { ... }` statements — parsed by `parseDisplayComposition` (`utils/displayComposition.ts`), reconciled with provenance markers by `displayCellEditorText`/`reconcileDisplayCell`, and expanded for render by `foldCellForResolve` + `flattenCellContent` (bounded; cycles diagnose, never recurse). `NavButton` bodies are real blocks visited by traversal, identifier rename, lint, and input collection — hidden-screen controls still contribute flat input keys and diagnostics. The renderer switches to `MarkdownDocumentView` (document nodes: markdown/control/navigation) whenever source contains display calls or file markers; navigation rows render as iOS-style push rows with arbitrary nesting, scroll/focus snapshots, and Android back handling.

`Folder(...)` references resolve by stable `folderIds` identity (survives rename/move; deleted folders never rebind to a new folder at the old path) and support `ORDER`/`HIDDEN`/`RECURSIVE`/`DIVIDERS`/`ALIGN`/`IMAGEHEIGHT` literals — selection is live and recursive by default. Folder blocks open settings/retargeting, not a file editor.

v2 rulebooks render `RuleBookData.modularContent` (legacy `content`/`roleOrder` kept as the safety snapshot); the appended `RuleBookRoleDescriptions` list and the role-table "visible in rulebook" toggle exist only for `!displayModules` — folder membership/order/hidden is authoritative. About Role becomes a composition cell on each role; migration converts legacy strings into `aboutRole/` files inside a `NavButton("Role Descriptions") { Folder("aboutRole") }`, reuses existing file references, and is idempotent. TOC entries follow the modular document, including headings inside nav screens. Runtime `roles[].aboutRole` resolves the composition to markdown for scripts. Run `npm run test:display-modules` and `node scripts/test-cell-modules.mjs scripts/migrationRulebook.test.ts`.

Markdown-kind files with one literal CreateMarkdown block open directly in MarkdownEditorDialog, using the same file controls and underlying AST. Supporting FileInput, Variable, and function declarations are preserved. The persistent Markdown / Source switch works in source Blocks and Text. File variables select declared inputs; computed markdown bindings must never be hoisted into input defaults or stripped during expansion. `utils/markdownFileEditor.ts` handles guarded body replacement, legacy input adoption, and reference-aware renaming; referenced inputs cannot be removed until their uses are removed. Keep markdown initialization keyed to file identity so metadata edits cannot erase unsaved text or queued insertions. File history stores complete `{ scriptText }` snapshots. See `utils/about-parts-of-this-codebase/markdown-file-editor.md` and `npm run test:markdown-files`. Complex files fall back to source editing. Legacy markdown script islands use `CellModuleScriptEditor` for cell-module file picks while retaining their script wrapper. See `CELL_MODULE_AUDIT.md` for behavior, compatibility boundaries, and remaining structural-identity risks. Run `npm run test:cell-modules` for regressions.

### Certify (Players tab, `PlayerPageOPERATOR.certifySubmissions`)

Re-certify = `stripSourceFromTables(..., certifySrcPrefix(day, type))` then `executePlannedUpdates(..., {source: certifySrc(day,type,email), filesIndex, tagLookup})`. Old contributions disappear even in cells the new action no longer touches; the op set is idempotent. Then `runTagTriggerFixpoint` diffs tag placements before/after.

### Tags are files (`tags/` pinned folder)

Each tag = a script file in `tags/` whose source is a `Tag({NAME = "...", COLOR = "..."})` meta header + the trigger body. The header is **file meta, not a block**: the file editor strips it (`tagFileTriggerSource`) and edits name/color in the header row; the body is a flat "on tag" script (no OnTagAdded wrapper, `flatTrigger` mode). On remove, tracked ops revert and only explicit `OnTagRemoved` blocks run (`tagFileRemovedSource`). File id is the tag's identity (renames safe; pieces carry `id`). Legacy `tagDefinitions`/`tagTriggers` records still resolve as a compatibility fallback until the whole-game upgrade, but new tags never write legacy definitions. Helpers: `isTagFile`, `isTriggerFile`, `findTagFile`, `getTagMeta`, `tagFileTriggerSource`, `tagFileRemovedSource`, `createTagFileSource`, `tagFileSourceWithMeta`, `tagLookupFromIndex`, `TAGS_FOLDER` in `utils/scriptFiles.ts`.

### File roles + the shared linter (`utils/scriptLint.ts`)

Every script file has a role: **display** (default — renders into cells/messages, inputs allowed) or **trigger** (`ScriptFile.role`, or implied by `tags/`). The file editor header has a "Type: Display/Trigger" picker (non-tag script files). `lintScriptStatements` produces `FileValidationFlag`s — merged with `validateFileReferences` in `ScriptEditorDialog` so ONE flag style (red card + message banner) covers: inputs in trigger files, `placed*` globals in display files, certify globals (`currentDay`, `Inputs`, …) in trigger files, OnTag blocks outside trigger files, Tag headers outside `tags/`, and `File()` includes whose target role mismatches ("X is a display file — set its type to Trigger…"). `File()` inside UpdateCell action values is a cell-write target, not an include — exempt. `showFileInputBlocks` on `FileBlocksContextValue` keeps FileInput statements on the canvas (flagged) for trigger files instead of hoisting them to the header strip.

### Tag triggers + cascading revert

`hooks/useTagTriggers.ts`: `resolveTagTrigger(ref, env, mode)` (file first, legacy fallback — mode-aware for file tags), `fireSingleTagTrigger` (runs script with `contributionSource = tagPlacementSrc(ref, addr)`), `runTagTriggerFixpoint` (diffs placements, fires on-added, reverts dead placements via `revertDeadTagPlacements`, bounded fixpoint since trigger writes can create/kill placements). `OnTagRemoved` bodies still run for irreversible logic. Morning-message writes are supported from triggers.

### Key files

- `utils/cellPieces.ts`: marker grammar, parse/serialize/fold, `applyCellOp`, `stripSource`, provenance keys, `foldCellForResolve`, `previewCellText`
- `utils/cellOps.ts`: `applyCellOps`, `applyMorningMessageOps`, `stripSourceFromTables`, `collectTagPlacements`, `revertDeadTagPlacements`, placement diffs
- `utils/executePlannedUpdates.ts`: op-aware planned-update execution at certify time
- `utils/tagEncoding.ts`: `parseCell` (piece-aware), `encodeTags`, legacy `[/TAG: "x"/]` tokens
- `hooks/useTagTriggers.ts`: trigger resolution/execution/fixpoint
- `hooks/useFilePlacements.ts` + `buildFilePlacements` (scriptFiles): Files-tab placement chips incl. table cells + tag files
- `utils/scriptLint.ts`: role lint — `lintScriptStatements` + `lintCellPlacement` → `FileValidationFlag[]` merged into the editor's flag path
- `script/lang/{ast,parser,printer}.ts`, `script/runtime/{interpreter,sources}.ts`: cell-op AST (`CellOpStatement`, `ForEachCellStatement`, `UpdateCellStatement.body`), `contributionSource`, effective cell text in `players` global
<!-- scripting-tag-system-end -->

## Game Day Timing

Game-day timing supports legacy calendar tokens, fixed-duration hour/minute rounds, and Hour Games (`gameSchedule.dayMode === 'hour'`, where each day is a start instant running until the next day begins and deadlines/wake-up are relative). Always use `parseStoredDayDates` / `serializeGameDayDate` instead of hand-parsing or date-only formatting, and run `resolveHourDaySequence` before serializing edited day arrays; otherwise timed-round metadata and date inheritance are lost. See `utils/about-parts-of-this-codebase/game-day-timing.md` and `npm run test:game-days`. No Convex schema migration is needed.

<!-- app-versioning-start -->

## App Versioning & the Update Notice

The app can prompt connected clients to reload when a newer version is released.

### NEVER bump the version unless the user explicitly asks

**Do not run `version:bump`, edit `CLIENT_VERSION`, or set `latestClientVersion` unless the user explicitly tells you to.** Most updates should ship WITHOUT forcing a reload; the notice is disruptive by design. Committing and deploying code on its own never changes the version: `latestClientVersion` lives in the Convex database, not in the repo, so nothing prompts clients until a bump is deliberately run.

### How it works

- `utils/appVersion.ts` exports `CLIENT_VERSION`: baked into every bundle.
- The Convex `globals` table stores the newest released version under the key `latestClientVersion`.
- `hooks/useAppVersionStatus.ts` compares them (`latest > client` → `isOutdated`). Never-set or loading counts as up-to-date.
- `components/ui/VersionUpdateNotice.tsx` is a standalone bottom-left overlay mounted in `app/_layout.tsx` (own `document.body` portal on web, absolute view on native). It persists until reload; its "−" button shrinks it to a small "Update" pill (modeled on the minimize row's pills/animations, but not part of `MinimizeContext`).

### How to increment the version (only when told to)

A bump has TWO halves, `npm run version:bump` does both:

1. `CLIENT_VERSION` increments in `utils/appVersion.ts` (bakes into the next deployed bundle).
2. `latestClientVersion` is pushed to a Convex deployment: **dev and prod are separate databases**.

```bash
npm run version:bump               # bump file + push to dev Convex
npm run version:bump -- --prod     # bump file + push to production Convex
npm run version:bump -- --no-push  # bump the file only
```

For a prod release: run `npm run version:bump -- --prod`, commit, and let the frontend deploy (git push → Vercel). Connected clients get the prompt when the global lands; reloading pulls the new bundle once the deploy is live and the notice clears. Manual equivalent: `npx convex run --prod globals:set '{"key":"latestClientVersion","value":<N>}'`.

Full details: `utils/about-parts-of-this-codebase/versioning-system.md`.

<!-- app-versioning-end -->

<!-- touch-target-outline-start -->

## Outlines must align with the touch target

**A visible border/outline marks exactly what is clickable.** Never draw an outline around a region that mixes interactive and non-interactive content; it makes the whole outlined area look like one button when only part of it is.

- If only part of a row is a button, the border goes around **that part alone**; surrounding text/icons stay unbordered.
- Example (script editor file header): `</> roleMessage/` is plain text and the bordered chip contains only the file **name**, which opens the file options menu. The switch-file icon next to it is a separate unbordered icon button.
- The same rule applies the other way: don't merge two separate actions into one outlined container; each action gets its own outline (or a consistent icon-button treatment).
<!-- touch-target-outline-end -->

<!-- scroll-shadow-start -->

## Always use ShadowScrollView for scrollable content

**Never use a bare `ScrollView` for scrollable UI.** Always use `components/ui/ShadowScrollView` so overflowing content gets an edge fade that tells the user there's more to scroll to.

- Applies to both vertical and horizontal scrolling (`horizontal` prop works the same as `ScrollView`).
- `ShadowScrollView` forwards scroll props (`contentContainerStyle`, `showsHorizontalScrollIndicator`, `onScroll`, etc.) to the inner `ScrollView`, so it's a drop-in replacement.
- `className` styles the wrapper; `scrollViewClassName` styles the inner scroll view.
<!-- scroll-shadow-end -->

<!-- content-width-breakpoints-start -->

## Responsive breakpoints: use content width, not viewport width

The sim sidebar (`components/game/sim/SimSwitcher.tsx`) sits **in layout flow** on the left of the game area (`MainPage` root is `flex-row`). When it is expanded (224px) or collapsed to the icon rail (52px), it shrinks the actual game content — so viewport-based breakpoints are wrong inside the game area.

**Inside the game area, NEVER use:**

- `useWindowDimensions().width` for layout/breakpoint decisions
- `window.innerWidth`
- Tailwind responsive prefixes (`sm:`, `md:`, `lg:`) in classNames — they compile to viewport `@media` queries that cannot see the sidebar
- raw `@media (max-width: …)` blocks in component CSS — drive a JS modifier class instead (see `is-tiny` in `GameTabBar.web.tsx`)

**Instead use `useContentWidth()`** (`hooks/useContentWidth.ts`), which returns `viewport width − sidebar width`. Write breakpoints as JS conditionals in the className, e.g.:

```tsx
const contentWidth = useContentWidth();
<Column className={`py-3 ${contentWidth >= 640 ? 'px-4' : ''}`}>
<FontText className={contentWidth >= 768 ? 'flex' : 'hidden'}>
```

Existing breakpoints preserved their original numbers (`sm:` = 640, `md:` = 768, plus file-specific values like the tab bar's 600/650 and the sim strip's 820). Keep the same thresholds when editing; only the width source changes.

**Stay on real viewport dimensions for:**

- Dialogs and modals — they overlay the whole viewport, not the content area
- Portal/floating positioning (`WebDropdownPortal`, `AppDropdown`'s `window.innerWidth`, the rail hover tooltip) — coordinates are viewport-level
- `useWindowDimensions().height` — the sidebar never affects height

The sidebar publishes its width through `utils/sidebarWidth.ts` (`setSidebarWidth` / `useSidebarWidth`); `useContentWidth` reads it. If another in-flow rail/panel is ever added, publish its width through the same store so all breakpoints react automatically.

<!-- content-width-breakpoints-end -->

<!-- dialog-portal-reuse-start -->

## Dialog portal index reuse (intermittent wrong position/state)

`HeroUINativeProvider` mounts a `PortalHost` that renders every open dialog's portal children as an **unkeyed array**. When one dialog closes and another opens in the same commit (e.g. Vote Settings → Edit Vote Message), React can diff `[oldPortal] → [newPortal]` at the same index and **reuse the whole subtree** — same component types mean same instances:

- The entering-animated wrapper keeps the outgoing dialog's reanimated position snapshot (`position: absolute` + old `top/left/width/height`), so the new dialog pins itself to the old dialog's rect.
- `WidthTrackingDialogContent` keeps its stale `initialWidth`, producing a wrong `translate(...)` offset.

It only reproduces when the portal remove+add batch into one `PortalHost` render, which is why it is intermittent.

**Fix in place:** `ConvexDialog.Portal` (web + native) wraps children in `<React.Fragment key={useDialog().nativeID}>`, giving each dialog root a unique key so the old subtree always truly unmounts. Do not remove that keyed fragment.

**Symptom to recognize:** a dialog opening "at the same top y" (or same rect) as the dialog it replaced. `switchFileEditor`'s 200ms unmounted transition in `ScriptEditorDialog.tsx` guards the same bug for the markdown/source swap; prefer the keying fix for new sites over adding more timers.

<!-- dialog-portal-reuse-end -->

<!-- closed-dialog-root-gap-start -->

## Closed `ConvexDialog.Root` elements eat flex gaps

A closed `ConvexDialog.Root` still renders an empty host `View` inline; its content portals out separately. When a dialog component sits inside a gapped flex container (e.g. `Column className="gap-3"`), each non-hidden closed root is a real flex child and consumes a gap slot — dead space that pools at the bottom of the parent (the "Add content" picker had ~24px from `AddTagDialog` + its `UnsavedChangesDialog`).

**Rule:** pass `className="hidden"` to `ConvexDialog.Root` on any dialog rendered as a sibling inside flex layouts (it hides only the empty host; the portal still opens normally). Exception: roots that render a visible inline `ConvexDialog.Trigger` child can't be hidden — the trigger lives inside the host.

<!-- closed-dialog-root-gap-end -->
