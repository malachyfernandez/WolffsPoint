# Wolffspoint Handoff: Unified Markdown File Editor

## Start Here

The user explicitly requested a stopping point and this self-contained handoff **instead of implementing the latest markdown-editor request in this thread**. The next thread should implement the pending request below. The preceding day-duration feature is implemented; do not start that over.

Repository: `/Users/malachyfernandez/Documents/1-programing/1-apps-and-sites/wolfspoint/wolffspoint`.
The parent `wolfspoint` directory is not the Git repository. Source paths are `components/...`, not `app/components/...`.

The worktree is very dirty, with substantial existing/untracked work from several sessions. Preserve it. The user also reformatted many files during this session. No commits, deployments, production data writes, or version bumps were performed here. `rg` is unavailable in this terminal; use grep/find if necessary. Do not launch subagents unless the user requests them.

## 1. The Pending User Request

The user tested the new markdown-first editor and supplied screenshots showing a filename/path row, an `Inputs: +` row, a separate large `Edit source` row, then formatting controls and side-by-side markdown editing/preview. Formatting buttons are split into outlined groups: Bold, Italic, More, Link, Image, a dropdown/input icon, Code, and Variable.

They want:

1. **Tooltips on these icon buttons using the scripting editor's cursor-following tooltip.** Ideally most icon-only buttons throughout the app should gain them too, through sensible shared components rather than a separate implementation per screen.
2. **A compact, combined controls row.** Inputs and source-mode controls should not occupy separate rows. Match the existing style and wrap gracefully on narrow screens.
3. **A persistent Markdown / Source segmented mode switch**, analogous to Blocks / Text in the scripting editor. Switching both ways must be obvious and preserve unsaved text, inputs, expressions, and selections where practical. The return switch should not disappear in source Text mode.
4. **One input/variable system.** Inserting a markdown variable should select an existing file input or allow creating one, then insert its reference. Users should not have to type matching names into unrelated systems. Inputs must actually pass into the backend script/rendering pipeline.
5. Markdown editing should be a simplified view of the same script file. Source is the advanced escape hatch for calculations/math on inputs, not a necessary extra editing step.
6. The user grants design/implementation discretion. They are comfortable restricting a markdown-kind file to **one primary CreateMarkdown rendering block**, or adding a special primary-markdown construct if that genuinely simplifies things. Prefer the existing AST if possible; do not invent an unrelated persistence system.

**No changes for this latest request were successfully applied before stopping.** An attempted tooltip refactor failed at its first patch hunk; original tooltip files remain. `utils/buttonTooltip.ts` does not exist. Earlier markdown-first work described below is already present.

## 2. Application Conventions

React Native + Expo web, React 19, TypeScript, Uniwind/Tailwind, Convex generic per-game records. Existing design: Libre Baskerville, paper surfaces, dark outlined/filled rounded controls, theme tokens.

- Read `AGENTS.md`. Before any Convex edits, read `convex/_generated/ai/guidelines.md`.
- Data guide: `utils/about-parts-of-this-codebase/userVariables-system.md`.
- Architecture guide: `utils/about-parts-of-this-codebase/about-this-codebase.md`.
- `useList(key, gameId)` and `useValue(getGameScopedKey(key, gameId))` use the shared DataProvider cache. Independent component subscriptions do not duplicate backend subscriptions. Prefer self-contained components.
- Centralize new persistent keys/defaults/privacy in `utils/dataConfig.ts`. Prefer existing file records.
- `record.value` is published data; private staged edits use `record.scheduledUpdate?.value`.
- Editable dialogs need snapshots, unsaved-close confirmation on X/Cancel/Escape/overlay, and `isSwipeable={false}`. Use `UnsavedChangesDialog`; avoid auto-closing controls that bypass it.
- Use `ShadowScrollView`, not bare ScrollView, for scrollable UI.
- In-flow layout uses `useContentWidth`; viewport dimensions are appropriate for overlay dialogs.
- Never revert existing changes or bump the app version without permission.

## 3. File And Markdown Terminology

`ScriptFile` in `utils/scriptFiles.ts`:

```ts
{ id: string; path: string; kind: 'markdown' | 'script';
  source: string; role?: 'display' | 'trigger'; updatedAt: number }
```

A markdown-kind file stores **script source**, not raw markdown. Normal example:

```text
FileInput({NAME = "Name", DEFAULT = "World"});
CreateMarkdown({CONTENT = Markdown(`Hello /*markdownVariable: "Name"*/!`)});
```

- `CreateMarkdown` is a statement call. `CONTENT` is usually a `MarkdownLiteral`.
- `MarkdownLiteral` has `value` plus optional `variables: {name, expression}[]`.
- `Markdown(` followed by a backtick literal and `, "Total" = expression)` binds an expression to an inline marker.
- `createMarkdownVariableMarker("Name")` emits `/*markdownVariable: "Name"*/`.
- `FileInput` declares an overridable input/default in the flat file-input namespace.
- `File({ID = "...", PATH = "...", Name = "Ada"})` includes a file with call-site overrides. ID is identity; PATH is display/legacy lookup. Preserve IDs on moves/renames.
- Flattening emits FileInput declarations with overrides, then file-body statements. There is intentionally no per-file scoped runtime namespace.
- `Inputs.entry("Name")` accesses input state. `InputsWithData` is a related richer source.
- Legacy markdown may contain `/*script ... script*/` islands rather than being a file. Preserve their wrapper on save.

An advanced source user should be able to calculate a value before the primary markdown:

```text
FileInput({NAME = "Count", DEFAULT = 3});
Variable({NAME = "total", VALUE = Inputs.entry("Count").toNumber * 2});
CreateMarkdown({CONTENT = Markdown(`Total: /*markdownVariable: "Total"*/`, "Total" = total)});
```

This illustrates intended behavior, not a validated current flow. Fix the analysis/flattening issues below before promising it.

## 4. Existing Editor Structure

### File host and state

- `components/game/scriptFiles/FileEditorDialog.tsx`: looks up the file, builds `ScriptFileContext`, saves through `filesApi.updateFileSource`, owns file picking and stacked nested editors. Tag metadata headers are stripped/reapplied separately.
- `script/editor/ScriptEditorDialog.tsx`: owns AST/reducer state, Blocks/Text mode, file metadata/input controls, input dialogs, file actions, and previews. It also hosts markdown-first mode.
- Relevant state: `directMarkdown`, `directMarkdownDraft` ref, `directEditorSession`, `switchingFileEditor`, `state.ast`, `textDraft`, `hasModifications`.
- `switchFileEditor` uses a 200ms unmounted transition to prevent HeroUI portal-index reuse/positioning bugs. Preserve that protection if retaining separate dialog roots.
- `serializeDraft` emits raw source for files but preserves script-island wrapping for `fileContext.scriptIsland`.
- `markdownFileBody` currently determines whether direct markdown mode is possible.
- Direct mode renders `MarkdownEditorDialog`; otherwise the source dialog is visible.
- Source currently has an `Edit markdown` button only in Blocks mode when the helper returns a body. This is NOT the requested persistent switch.
- `commitNewInput`, `commitEditInput`, `removeEditingInput`, `uniqueInputName`, and `fileInputEntries` implement input editing. They are not yet a fully linked variable model.

### Markdown view and toolbar

- `components/game/MarkdownEditorDialog.tsx`: local `draftBody`, selection, formatting, preview input state, save/history, dirty-close protection.
- Current relevant props: `headerContent`, `onEditSource`, `onDraftChange`, `initialModified`, `onDone`, `transformPreviewMarkdown`.
- It renders `headerContent`, then a **separate Edit source row**. The file host's headerContent contains filename controls and a separate inputs row.
- Initialization depends on `initialMarkdown`, `initialTitle`, `isOpen`, and `readOnly`. Parent initialMarkdown changes while open reset text/selection/dirty snapshots. Do not create reset-on-every-keystroke behavior or erase queued variable insertion when creating an input.
- `onSubmit` is also used by Save-without-closing. `onDone` is the actual Done-only callback; new-file/pick completion depends on this distinction.
- `components/game/markdownEditor/MainContent.tsx` chooses `SideBySideLayout` or `TabbedLayout`; those use `EditorPane.tsx`, which renders the shared formatting toolbar.
- `components/game/townSquare/TownSquareComposerToolbar.tsx`: Bold/Italic/More and Link/Image/Input/Code/Variable groups.
- `TownSquareToolbarButton.tsx`: shared TouchableOpacity icon button, currently no tooltip or accessibility-label prop.
- Code in a file-aware markdown editor may mean **insert a file**, not insert an inline script. Label tooltips according to the actual action.
- `components/game/markdownEditor/MarkdownVariableDialog.tsx` only asks for a free-form name; it knows nothing about file inputs.
- `script/editor/TemplatePickerModal.tsx` and `TemplateInputModal.tsx` provide existing input-kind/default-expression editing and removal. Reuse where appropriate.
- `script/editor/FilePathControls.tsx` is already shared between source/markdown filename headers.
- `components/game/scriptFiles/CellModuleScriptEditor.tsx` gives legacy islands a file-module picker while retaining island serialization.

## 5. Critical Input/Binding Pitfalls Found (Not Fixed Yet)

1. `utils/markdownFileEditor.ts`:
   - `markdownFileBody(script)` permits only FileInput statements and one literal CreateMarkdown.
   - A preceding Variable/math/function statement makes it return null, blocking return to markdown.
   - `withMarkdownFileBody` preserves literal metadata but retains StringLiteral kind; StringLiteral content does not get MarkdownLiteral substitution.
2. `utils/scriptFiles.ts`:
   - `collectDraftFileInputs` collects explicit FileInputs AND every markdown marker, using inline bindings as implicit defaults.
   - A computed binding such as `"Total" = total` is therefore mistaken for an overridable input. Its default can be hoisted before `total` exists.
   - `stripDeclaredBindings` removes bindings whose names are declared inputs. Since every marker is currently considered an input, computed bindings can be stripped incorrectly.
   - Related pipeline: `getFileInputs`, `fileInputDefaults`, `buildInputStatements`, `flattenStatementsToMarkdown`, `flattenCellContent`, `expandMarkdownLiterals`.
   - Private `mapStatementExpressions` and `mapExpressionChildren` already exist and could be exported/reused for focused transforms.
3. `script/runtime/interpreter.ts`, evaluate MarkdownLiteral: explicit bindings are evaluated first; non-nothing values win. Remaining markers fall back to inputState by case-insensitive key lookup.
4. `script/markdownVariables.ts`: regex/JSON marker discovery and substitution. Explicit binding map substitution is case-sensitive, unlike input lookup; make naming consistent.
5. Input renaming currently replaces the declaration without updating markers or `Inputs.entry("oldName")`. This leaves phantom inputs.
6. Input removal deletes the declaration but not uses; marker discovery can recreate an apparent undeclared input.
7. Parent AST input changes must merge the latest unsaved markdown text, not stale AST body text.

## 6. Suggested Direction (Not Implemented; Use Judgment)

- Make explicit FileInputs the user-facing inputs. Let the variable dialog select them or offer Create input, then insert the matching marker.
- Preserve compatibility for old literal/default bindings and undeclared markers, but distinguish computed bindings from defaults. Do not strip/hoist computed expressions as overridable inputs.
- Permit one primary literal CreateMarkdown plus computational source statements. Explain extra rendering blocks; never silently discard a complex existing file. Script-kind files remain the unrestricted alternative.
- Shared file toolbar: inputs left, Markdown / Source segmented switch right, wrapping on mobile. Filename/path can remain its own compact row.
- Keep the switch available in source Blocks and Text. Invalid source should prevent switching/saving with an actionable explanation, not destroy the draft.
- Add pure helpers for primary-block analysis, normalization, and input rename/removal.
- Rename matching markers, appropriate binding names, and Inputs/InputsWithData entry-key literals case-insensitively.
- Removing an input with uses needs a clear confirmation/decision; do not quietly leave a marker that re-creates it.
- Consider a stable file/draft identity for markdown initialization so metadata edits/input creation do not reset selection or erase marker insertion callbacks.
- Audit history as part of the same file model: current direct markdown history stores bodies, not complete AST/input versions.

## 7. Tooltip Infrastructure

There are two current implementations:

- `script/editor/useTooltip.ts`: the requested scripting version. One detached DOM tooltip/root, ownership tracking, cursor-following direct position updates, shared mouse listener, touch suppression through `useIsTouchInput`.
- `hooks/useTooltip.ts`: similar visuals but older; each caller installs a listener and updates React state on every mousemove. No shared touch gating.

Recommended: consolidate into one shared implementation and retain import paths via re-export. Whole-app tooltip support must not cause per-button React rerenders on every mousemove. Consider viewport clamping and hiding on click/unmount.

High-leverage components:

- `components/ui/buttons/AppButton.tsx`: widely used; has hover callbacks/keyboardHint, no tooltip/accessibility-label API. TouchableOpacity drops web hover props; the existing component forwards onMouseEnter/Leave as a workaround.
- `GuildedButton.shared.ts`, `GuildedButton.tsx`, `GuildedButton.web.tsx`: AppButton accent/secondary branch; forward new accessibility/hover props correctly if added.
- `TownSquareToolbarButton.tsx`: add explicit semantic labels for formatting controls.
- `components/ui/dialog/CloseButton.tsx`, `components/ui/minimize/MinimizeButton.tsx`, `components/ui/dialog/SaveHistoryPill.tsx`: shared close/minimize/history controls.
- FilePathControls already uses scripting-style tooltips via callbacks.

Lucide RN icons have meaningful displayName values. Conservative single-icon fallback labels for AppButton are possible, but avoid misleading guesses for multi-icon/text-labelled controls. Explicit action labels should win. Arbitrary Pressables need targeted migration or a deliberately designed shared/delegated solution. Touch still needs accessibility labels even if hover is suppressed.

## 8. Earlier Completed Modularity Work

See `CELL_MODULE_AUDIT.md` for details.

- Cells store source-attributed tag/text/file pieces. The effective fold dedupes display while retaining each owner's contribution.
- UpdateCell settings: ALLOWDUPLICATES defaults false; AUTOREMOVE defaults true.
- File-valued Add/Remove/Replace retain live references and call-site overrides.
- Tag removal reverts its contributions. Cascading rollback, exact source matching, certify morning-state comparison, and sequential reads were fixed.
- Custom columns support Tags/Files. Tags disallow free typing. File/bulk editors reconcile each destination instead of overwriting ownership streams. File order has separate ORDER metadata.
- Core: `utils/cellPieces.ts`, `utils/cellOps.ts`, `utils/executePlannedUpdates.ts`, `hooks/useTagTriggers.ts`, `script/lang/{ast,parser,printer}.ts`.
- Typed vote/action/multiplier/living-state fields are still direct writes. Tag ownership still uses player indexes/column titles; structural edits need a separate stable-ID migration.

## 9. Day-Duration Work At The Stopping Point

Implemented; see `utils/about-parts-of-this-codebase/game-day-timing.md`:

- Settings and initial setup use numeric Game day length with Days / Hours / Minutes controls.
- Day Options can convert an individual calendar day via Use minutes or hours for this day, or edit a timed round's start/time/length. Other start dates are not moved; overlaps are rejected and unsaved drafts protected.
- `numberOfRealDaysPerInGameDay` stores fractional days for hours/minutes; `gameSchedule.dayDurationUnit` stores the default unit.
- `dayDatesArray` is still string[]: legacy MM/DD/YYYY or JSON strings containing UTC start, durationMinutes, and unit.
- `utils/gameDayDuration.ts` handles parsing/serialization and Date WeakMap metadata. Use `parseStoredDayDates`/`serializeGameDayDate`; naive Date cloning/date-only formatting loses timed metadata.
- Shared timing helpers and player/preview/navigation consumers respect timed rounds; calendar behavior remains. Timed deadlines use exact round end, not calendar wall-clock offsets.
- New defaults do not resize existing timed rounds. The last legacy calendar day retains the old default-duration fallback behavior.
- SimStrip uses minute clock steps for minute-based games. No Convex schema migration/deploy was needed.

## 10. Verification And Next Steps

At handoff: TypeScript passes; `test:game-days` has 12 passing tests and `test:cell-modules` has 29. Targeted ESLint has no errors, with existing warnings elsewhere. Authenticated desktop/mobile UI has not been manually verified. The final handoff response records the last verification result.

From repository root:

```sh
npm run test:game-days
npm run test:cell-modules
./node_modules/.bin/tsc --noEmit
```

The Node runner bundles TS using already installed esbuild, now a declared dev dependency. `scripts/test-cell-modules.mjs` accepts an optional test-entry path. Persistence hooks are isolated for pure trigger tests; tests do not write backend data.

Expo was running at `http://localhost:8081`. Browser preview ID was `2a7a5c94-2f69-47c8-ae7c-ee354a117f03`; a new thread may need a new preview. Browser captures only arrive if the user sends them.

Next thread: implement sections 1 and 5-7. Add regressions for markdown/source round-trips with calculations, input selection/creation/insertion, rename/removal, overrides reaching rendered text, case handling, duplicate rendering-block restrictions, unsaved/history behavior, tooltips, and responsive combined toolbar layout.
