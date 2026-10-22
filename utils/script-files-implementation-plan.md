# Script Files: Implementation Plan

A "files" system for the three programmable-markdown cells (role message, vote
message, morning message). Cells become a list of file references; files are
reusable scripts/markdown documents stored per game, composable into one flat
mega-script at render time. Old content is legacy: no migration, a
"replace with new system" option wipes a legacy cell to a fresh file list.

## Core model

### Storage

One per-game user variable, public so players' devices can resolve files:

```ts
useValue<ScriptFilesDoc>(getGameScopedKey('scriptFiles', gameId), { privacy: 'PUBLIC', defaultValue: { files: {}, folders: [] } })
```

```ts
interface ScriptFile {
  id: string;                     // stable id
  path: string;                   // "roleMessage/Werewolf 1": folder segments are path components
  kind: 'markdown' | 'script';
  source: string;                 // printed script source (markdown files: a single CreateMarkdown)
  updatedAt: number;
}
interface ScriptFilesDoc {
  files: Record<string, ScriptFile>;   // keyed by id
  folders: string[];                   // explicit folder paths (so empty folders persist)
}
```

Players read it with `useSharedVariableValue({ key: getGameScopedKey('scriptFiles', gameId), userIds: operatorUserIds })`: the existing ruleBook/gameSchedule pattern.

### Cell format

A file-mode cell stores **printed script text containing only `File(...)` call
statements**:

```
File(PATH = "roleMessage/Werewolf Intro");
File(PATH = "shared/Roll for survival", RequiredPlayers = 4);
```

Detection: text parses cleanly AND has ≥1 statement AND every top-level
statement is a `CallExpression` with callee `File` → file mode. Anything else
→ legacy markdown, rendered/edited exactly as today. Old content works
untouched; "Replace with new system" wipes the cell to an empty file list.

`File` needs no new AST node; it's a plain call expression, so the existing
parser/printer round-trips it for free. `PATH` is required; every other named
arg is a call-site input override (`Players = 4` above).

### File inputs: declaration and runtime

New statement block, `FileInput(NAME = "...", DEFAULT = <expr>)`, placed at the
top of a script file. It serves triple duty:

1. **Declaration**: editors scan a file's `FileInput` statements to know its
   input list (name + default expression).
2. **Runtime write**: `execute` calls a new `ctx.setInput(name, value)` which
   writes `interpreter.inputState[name]`. Because the `Inputs` global and
   `inputState` are the same object, `Inputs.entry("name")`, the `emit` value
   fallback, and `getInputState()` all see it, one flat namespace, no scoping.
3. **Override point**: at flatten time the flattener emits each `FileInput`
   with the call-site's arg expression if supplied, else the file's own
   default.

Markdown files can't hold statements inside their content string, so their
inputs are the `/*markdownVariable: "Name"*/` markers (identical to today).
Two small interpreter changes unify them into the same namespace:

- `MarkdownLiteral` eval falls back to `inputState[name]` when a marker has no
  local `variables` binding.
- The flattener emits `FileInput(NAME, <callsite-or-default>)` for each marker
  name before the markdown file's `CreateMarkdown`.

Result: `Inputs.entry("X")` reads any file input, script or markdown, from
anywhere in the mega-script: matching the "one GIANT file, no scoping" spec.
Same name in two files = same input; last write wins (flat semantics,
intended).

### Flattening (`utils/scriptFiles.ts`)

```ts
flattenCellContent(text, filesIndex) → { markdown: string; issues: FlattenIssue[] }
```

1. Not a file list → return text unchanged (legacy passthrough).
2. Walk `File(...)` statements in order; resolve `PATH` → file.
   Missing file → issue (UI renders red) + skip.
3. For each resolved file: emit its `FileInput` statements with resolved
   arg/default, then splice in the file's own statements, recursively
   expanding nested `File` blocks, with a path stack for **cycle detection**
   (A→B→A flags an issue, emits nothing) and a depth cap (~16).
4. Also expand `/*file: {...}*/` markers *inside* MarkdownLiteral contents:
   markdown file → inline its content text; script file → inline
   `/*script ... script*/` text. Inputs inside a marker emit
   `/*script FileInput(...) script*/` islands before the inlined content.
5. Output: `/*script\n<mega script>\nscript*/`: plain markdown text that every
   existing pipeline already accepts.

### Render-time resolution (not save-time)

Concatenation happens **where markdown is consumed**, because files are
reusable: a file edit must ripple into every referencing cell without
re-saving anything.

- `hooks/useScriptFiles.ts`: loads the doc (operator: `useValue`; player:
  `useSharedVariableValue`), builds a `filesIndex`, returns a memoized
  `resolve(text)` applying `flattenCellContent`. Cache flatten results by
  (text, docVersion); reuse the `cachedParse` pattern from ScriptRuntime.
- Apply at every seam where cell text enters the engine:
  - `YourEyesOnlyDayContentPLAYER`: roleMessage render, voteMessage render +
    `inspectMarkdownVoteInput` ×2, morning-message markdown, and all three
    `planMarkdownScriptUpdates` calls (resolve text before calling).
  - `PlayerPreviewModal`, `PreviewPanel` role-message preview.
  - `collectActiveInputKeys` call sites.
  - Tag triggers do **not** resolve files (no input state there anyway).

## Editing UI

### Cell editor (new `CellFilesEditorDialog`)

Replaces `MarkdownEditorDialog` for the three cell types: `RoleRow`
(roleMessage + voteMessage), `NightlyDayUserRow` (morningMessage). It is the
existing `ScriptEditorDialog` in a `fileOnly` mode:

- InsertModal filtered to the `File` block only; the canvas "+" opens the
  file browser **directly** (no block picker, only one option), and choosing
  a file inserts the full `File(...)` block with editable sockets per declared
  input. Input sockets accept arbitrary expressions, unrestricted.
- Empty state: three buttons: **New Text**, **New Script**, **Open File
  Browser**. New Text/Script create a file (default folder per cell type) and
  open it in the file editor; Open File Browser goes straight to picking.
- Legacy cell → banner: "This cell uses the old format" + **Edit legacy
  markdown** (opens today's MarkdownEditorDialog, unchanged) + **Replace with
  new system** (confirm → wipe to empty file list).
- Keeps: unsaved-changes interception on all close paths, `isSwipeable=false`
  when dirty, minimize support, save history keyed by the existing
  `historyKey`s, Escape stack behavior.

### Script file editor

`ScriptEditorDialog` gains a file header when opened on a file:

- **Path chip** + file-browser button: "change the file you're editing at any
  time", always force-saving current work first (same submit-then-open pattern
  as Preview-as-Player).
- **Inputs strip** at the top, the `FileInput` declarations rendered as a
  chip row modeled on `FunctionTemplateEditor`: "+" adds an input via the
  `TemplateInputModal` dialog; tapping a chip opens the Edit Input dialog
  (Variable name + Default value expression socket + Remove + Save, same as
  the screenshots). The chips are a view onto real `FileInput` statements, so
  text mode and parse/print round-trip them naturally.
- **Preview button**: mounts the existing `PreviewPanel` (already does live
  interpretation + player spoofing) as an Editing/Preview toggle like the
  markdown editor's tabs. File previews standalone with inputs at defaults.
- Minimize, history, unsaved-changes: all existing behavior preserved.

### Markdown file editor

A markdown file is a script whose only block is `CreateMarkdown`, so its editor
is the existing markdown editor UI editing that block's CONTENT, inputs are
its `/*markdownVariable: "Name"*/` markers, defaults are the variable bindings,
overridable per call site via the file block's sockets.

### Inserting a file inside markdown

In any markdown editing surface belonging to the file system (markdown file
editor, markdown sockets in the script editor), the script/insert action now
opens the file browser instead of creating an inline `/*script*/` block, and
inserts a `/*file: {"path": "...", "inputs": {...}}*/` marker: same UX as
today's script insert, but it's a file call. (Standalone markdown editors with
no gameId keep current behavior.)

### `inputs.entry("...")` dropdown + red flagging

- `entryKeysBySource.Inputs` currently comes from `collectInputLabels`
  (CreateSelectInput etc. LABEL args). Extend it: merged with every declared
  input name in the **flattened closure**, the current file's `FileInput`s
  plus those of all transitively included files, plus markdownVariable names
  of included markdown files. Same for `collectDefinedVariables` /
  `collectDefinedFunctions`: variables/functions defined in included files
  autocomplete, since the flat runtime sees them.
- **Manual-entry marker**: `Inputs.entry("!custom")`: a leading `!` inside the
  string means "typed deliberately, don't validate". The entry dropdown adds it
  automatically when the user types a custom name; `entry()`'s runtime evaluate
  strips `!` before lookup; the block parser/validator treats `!`-prefixed
  names as intentional. Pattern can extend to other validated string args
  later.
- **Red flagging**: a semantic validation pass marks: `Inputs.entry` /
  `InputsWithData.entry` keys absent from the merged known set and not
  `!`-marked; `File(PATH)` pointing at a missing file; flatten issues
  (cycles, depth). Flagged sockets/cards tint red in the canvas. Removing a
  file input → every un-flagged entry on that name lights up red, per spec.

### File browser (`FileBrowserDialog`)

- Opens **on top of** the current editor; every path that opens it
  (cell "+", header change-file, markdown insert, file card) force-saves the
  editor beneath first, so nothing unsaved is ever stranded under it.
- Modes: pick (choose a file → insert block / swap edit target) and manage.
- Contents: folder navigation with breadcrumb path, files + folders, nested
  folders.
- **New Markdown** / **New Script** buttons in the browser too.
- Three pinned root folders: `roleMessage`, `voteMessage`, `morningMessage`:
  always exist, can't be renamed/moved/deleted. New files default into the
  folder matching the cell type being edited.
- Name suggestion: row context of the cell being edited, role name or player
  name: plus a counter (`Werewolf`, `Werewolf 2`…). Duplicate names rejected
  (case-insensitive, per full path).
- File ops: rename, move, clone, delete: modeled on the editor's move/clone
  paradigms (move session two-phase pick, clone duplicates subtree). Deleting
  a referenced file warns and lists referencers.
- Rename/move rewrites `PATH` references across the files index and the known
  cell stores (roleMessage/voteMessage fields, morningMessagesList); anything
  missed still surfaces as a red dangling-path flag rather than breaking.

## Wiring changes by file

| Area | Change |
|---|---|
| `utils/scriptFiles.ts` (new) | types, doc helpers, flatten, validation, name/ref utils |
| `hooks/useScriptFiles.ts` (new) | doc loading (operator + player), memoized `resolve`, CRUD ops |
| `script/registry.ts` | `FileInput` statement block (internal; hidden from insert picker or shown under a 'file' category) |
| `script/runtime/interpreter.ts` | `ctx.setInput` → `inputState` write; MarkdownLiteral inputState fallback; `entry()` strips `!` |
| `script/editor/ScriptEditorDialog.tsx` | `fileOnly` mode (cell editor), file header (path chip, inputs strip, Preview button), merged input/variable/function inference, red-flag pass |
| `script/editor/InsertModal.tsx` | File block entry → opens browser; `fileOnly` filter |
| `script/editor/Canvas.tsx` | File card rendering (path chip + per-input sockets, dangling-path red), red-flag display |
| `script/markdownVariables.ts` | `/*file:*/` marker encode/parse helpers |
| `components/game/files/` (new) | `FileBrowserDialog`, `CellFilesEditorDialog`, inputs strip components |
| `RoleRow.tsx`, `NightlyDayUserRow.tsx` | swap MarkdownEditorDialog → CellFilesEditorDialog for the 3 cells |
| `YourEyesOnlyDayContentPLAYER.tsx`, `PlayerPreviewModal.tsx`, `PreviewPanel.tsx` | resolve cell text before all render/plan/inspect calls |
| `roleTable.ts`/types | no schema change: cells still store strings |

## Decisions / defaults (flagged, easy to revisit)

1. `voteMessageDefault` editor becomes file-capable too (it renders through the
   same path). Bulk-update editors stay legacy writers, bulk-written markdown
   still renders via the legacy passthrough.
2. Path-string references with rewrite-on-rename, over opaque IDs, matches
   "file paths", readable in text mode; dangling paths flag red.
3. File previews run standalone (inputs at defaults) in v1; previewing inside
   a specific caller's context is a later add.
4. Tag triggers unchanged: no files, no inputs.
