# Report: `[object Object]` Folder Bug + Auto-Select In Name Dialogs

**Implementation update (2026-10-17): both issues are fixed in code.** The investigation below is retained as historical context; descriptions of the old implementation are not the current state.

| Issue                                                                        | Fixed?                                                                  |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Folder created as `[object Object]` (containing the real `Templates` folder) | **Fixed:** wrap the press handler and validate the parent argument      |
| Name/select dialogs auto-selecting their pre-filled text                     | **Fixed:** shared autofocus/selection support applied to naming prompts |

`FontTextInput` now forwards focus, blur, selection, submit, and editable props.
Web autofocus waits for dialog entry to become focusable. Both ordinary inputs
and auto-growing textareas support `selectTextOnFocus`. File/folder prompts,
tag/role names, variables, file options, and file-input names use this behavior.
The markdown browser regression verifies actual focus, full initial selection,
and root-level folder creation through the list toolbar.

Existing incorrectly created folders are not moved or deleted automatically.
No real game data was repaired by these code changes.

Repo root: `/Users/malachyfernandez/Documents/1-programing/1-apps-and-sites/wolfspoint/wolffspoint`. All paths below are relative to it.

---

## Issue 1 — `[object Object]` folder

### Root cause (confirmed)

`components/game/scriptFiles/FileBrowserDialog.tsx:1421`:

```tsx
<ViewToggleButton
  icon={<FolderPlus size={15} color="#1a1a1a" />}
  label="New Folder"
  active={false}
  first={false}
  onPress={openNewFolderPrompt} // ← passed bare, not wrapped
/>
```

`openNewFolderPrompt` is declared at `FileBrowserDialog.tsx:431` as:

```ts
const openNewFolderPrompt = (parent = activeFolder) => { ... }
```

`ViewToggleButton` (defined `FileBrowserDialog.tsx:129-156`) types `onPress` as `() => void` but hands it straight to `<Pressable onPress={onPress}>`. **React Native's Pressable always calls `onPress(event)`** — the `GestureResponderEvent` object becomes `parent`, silently satisfying the `() => void` signature.

Then the submit path does:

- `FileBrowserDialog.tsx:441` — `joinFilePath(parent, name.trim())` in `validate`
- `FileBrowserDialog.tsx:450` — `onSubmit: (name) => filesApi.createFolder(joinFilePath(parent, name.trim()))`
- `utils/scriptFiles.ts:98` — `joinFilePath` string-interpolates `folder`, so the event coerces to `"[object Object]"` → folder path `"[object Object]/Templates"`.
- `hooks/useScriptFiles.ts:248-254` — `createFolder` normalizes and commits it without complaint (`[object Object]` passes `isValidFileName`).

That exactly reproduces the screenshot: a folder literally named `[object Object]` containing the correctly named `Templates` folder the user typed. Validation never catches it because `isValidFileName` only runs on `name`, never on `parent`.

### Blast radius

- Only the list-view toolbar button is buggy. The other call sites wrap correctly: `FileBrowserDialog.tsx:890` (`openNewFolderPrompt(folder)` from the per-folder "+" strip) and `:943` (context menu). `openNewFilePrompt` / `openNewTagPrompt` are always arrow-wrapped too.
- Same dialog is reused in pick mode (e.g. creating a file from a file block via `CellFilesEditorDialog`), which matches the user's repro path — "created a file from a file block, then made a folder."
- No other `onPress={someFunctionWithDefaultParam}` passthroughs found on this dialog's toolbar.

### Fix sketch (not applied)

- Minimal: `onPress={() => openNewFolderPrompt()}` at line 1421.
- Belt-and-suspenders: type `openNewFolderPrompt(parent?: string)` and coerce non-strings to `activeFolder`, since the `() => void` type makes this mistake invisible to TypeScript. Could also guard inside `joinFilePath`/`createFolder` against non-string input, but that hides bugs — the call-site wrap is the real fix.

### Existing bad data

The fix won't heal the already-created `[object Object]/Templates` path in the user's game data. Manual cleanup: use the folder's context menu **Move folder** to relocate `Templates` to root, then **Delete folder** on `[object Object]`; or rename it. Worth doing before shipping since `[object Object]` isn't a valid pinned folder and pollutes every folder dropdown.

---

## Issue 2 — auto-select in dialogs

### What the user wants

Any dialog that opens with a pre-filled value (suggested file/folder name, current name on rename, etc.) should have that text **selected on open** so typing replaces it — and this should come from a shared primitive rather than per-dialog ad-hoc wiring. Screenshot example: "New markdown file" → Name field shows `New file` unselected.

### Current state (confirmed)

- `grep selectTextOnFocus` across `components/`, `hooks/`, `utils/`, `script/` — **zero hits**. Nothing selects text.
- Name-prompt inputs use `autoFocus` only:
  - `FileBrowserDialog.tsx:1837-1847` — the shared name prompt (new file, new tag, new folder, rename file, rename folder — one `FontTextInput` serves all five).
  - `MoveToDialog.tsx:268-278` — "New folder" inside the move sheet.
  - `AddTagDialog.tsx:228`, `RoleAddDialog.tsx:78`, `MarkdownVariableDialog.tsx:66` — `autoFocus` only.
- `FontTextInput` (`components/ui/forms/FontTextInput.tsx`) extends `TextInputProps`, so `selectTextOnFocus` would flow through `{...props}` to the standard `<TextInput>` — on web, react-native-web maps it to select-all-on-focus. The autoGrow `<textarea>` branch (lines 134-190) would need an `onFocus={e => e.currentTarget.select()}` equivalent since it hand-rolls props.

### Related latent bug worth flagging

`FontTextInput.tsx:55` destructures `autoFocus` out of props but only forwards it in the **autoGrow textarea** branch (line 148). The standard `<TextInput>` return (lines 193-209) never receives it — it's excluded from `{...props}` after destructuring. So `autoFocus` is silently dead on the path every name prompt actually uses. `ConvexDialog.web.tsx:84-99` only _blurs_ stale focus from dialogs underneath; it does not move focus into inputs — nothing else compensates. So on web the prompt likely isn't focused either; fixing auto-select should forward `autoFocus` too (one line in the TextInput JSX).

### Sweep candidates for the shared primitive

Dialogs with a pre-filled or name-style input that would benefit from select-on-focus:

- `FileBrowserDialog` name prompt — new file / new tag / new folder / rename file / rename folder (single shared input, biggest win).
- `MoveToDialog` — new-folder prompt.
- `AddTagDialog` — tag name.
- `MarkdownVariableDialog` — variable name (relevant to the pending markdown-editor handoff in `utils/context-on-current-session.md`).
- `RoleAddDialog` — role name (starts empty; focus matters, select is a no-op but harmless).
- Prefilled config/rename fields worth auditing: `GameNameConfigItem`, `NewserConfigItem`, `PlayerProfileDialogNEW`, `ManageFauxPlayersDialog`, `ChangeDateInfo`, `TagCellEditor` text mode, `VoteEditorDialog`, `ActionEditorDialog`, column rename in `PlayerTable` (`UNDOABLEsetColumnTitle` flow), `FileEditorDialog` rename/clone fields.

Suggested primitive direction (not implemented): a `selectOnFocus`/`autoSelect` prop on `FontTextInput` (forward `selectTextOnFocus` to `TextInput`; wire `onFocus → select()` in the textarea branch), applied wherever a dialog opens with an initial value. Rename dialogs arguably want it always; "new X" prompts want it because the suggested name is meant to be replaced.

### Interpretation note

The user's "dialogs that select something should auto select" clearly covers prefilled text inputs (their screenshot). If they also mean _picker_ dialogs should preselect the current value (e.g. file picker selects the already-chosen file), that's a separate sweep — pick-mode `FileBrowserDialog`, tag pickers, `MoveToDialog`. Flag for clarification only if they push on it.

---

## Housekeeping notes

- The name prompts (`FileBrowserDialog`, `MoveToDialog`) are simple single-field prompts; the AGENTS.md unsaved-changes-confirmation rule arguably applies to them but they're currently exempt — worth a deliberate decision if the auto-select work touches them.
- `ViewToggleButton`'s `onPress: () => void` type + direct `Pressable` passthrough is the footgun pattern that caused issue 1; any future handler with defaulted params passed bare to `onPress`/`onChange` hits the same trap.
- No code was modified for this report. Prior-session worktree changes (including user's edits to `interpreter.ts`, `markdownFileEditor.ts`, `scriptFiles.ts`, and `context-certification-provenance.md`) are untouched.
