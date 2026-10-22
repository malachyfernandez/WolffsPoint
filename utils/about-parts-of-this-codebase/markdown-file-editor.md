# Markdown File Editing

Markdown-kind files store script source, not a second raw-markdown document.
`ScriptEditorDialog` owns the AST, file inputs, source draft, and full-file save
history. `MarkdownEditorDialog` is a simplified view of the primary literal
`CreateMarkdown` block.

## Supported Markdown View

One top-level literal `CreateMarkdown` is required. Supporting `FileInput`,
`Variable`, and function declarations are retained unchanged. Additional
rendering blocks, dynamic CONTENT expressions, and other statement structures
stay in Source. The persistent Markdown / Source switch remains available in
both source Blocks and Text modes. Failed switches leave the source draft intact;
valid complex source remains saveable. Syntax errors block saving and switching.

`withMarkdownFileBody` refuses ambiguous scripts and converts legacy string
CONTENT to `MarkdownLiteral` so inserted variable markers actually substitute.
Unused explicit markdown bindings survive printing/parsing, including when an
operator temporarily removes the matching marker while editing.

## Inputs And Calculations

- Insert variable selects a file input or opens the existing typed input-creation
  flow. Creating an input inserts its marker at the stored selection.
- Renaming updates markers, binding names, and literal `Inputs.entry(...)` /
  `InputsWithData.entry(...)` references case-insensitively, including manual `!`
  entry keys. It does not rewrite unrelated strings or other files' override keys.
- Removal is blocked while references remain. The operator gets an explanation
  to remove the references in Source first.
- Legacy unbound markers and literal/default bindings remain compatible inputs.
  Opening a supported markdown file adopts them as editable FileInput declarations.
- Computed bindings are expressions, not implicit inputs. They are neither
  hoisted as defaults nor stripped during expansion.
- FileInput updates both runtime input state and the live `Inputs` object, so
  calculations following declarations see call-site overrides.

Example:

```text
FileInput({NAME = "Count", DEFAULT = 3});
Variable({NAME = "total", VALUE = Inputs.entry("Count").toNumber * 2});
CreateMarkdown({CONTENT = Markdown(`Total: /*markdownVariable: "Total"*/`, "Total" = total)});
```

## Drafts And History

File identity controls markdown initialization, not every incoming body prop.
Input creation merges the latest unsaved body before modifying the AST; it must
not reset the child editor and erase queued marker insertion. Explicit body
replacements (rename and history restore) use `draftReplacement`. Selection is
remembered across mode switches. Keep the 200ms outgoing-portal unmount interval.
An open file session ignores incoming published source echoes; saving updates
its AST explicitly, so a delayed subscription update cannot erase a newer draft.

Both file views use the existing `scriptFile:<game>:<id>` history key, saving
`{ scriptText }` snapshots with declarations, calculations, and bindings intact.
Old `{ markdown }` history entries can restore their body, but cannot recover
metadata that was never stored. History restore edits the draft, not the server.

## Shared Tooltips

Both tooltip import paths share the scripting editor's detached, cursor-following
tooltip, with one mouse-position listener and no per-move React state updates.
Touch-modality subscriptions are shared too. Tooltips hide on click/unmount and
clamp to the viewport.

`AppButton` accepts `tooltip` and `accessibilityLabel`; its gilded variants forward
the label and hover handlers. Formatting, close, minimize, and save/history
controls provide semantic labels. Prefer explicit action labels over guessing
from an icon's name, especially for file insertion versus script insertion.

## Verification

```sh
npm run test:markdown-files
npm run test:cell-modules
npm run test:game-days
./node_modules/.bin/tsc --noEmit
```

For browser regressions, start an offline in-memory simulator, then run the UI
suite in another terminal:

```sh
EXPO_PUBLIC_SIM=1 EXPO_OFFLINE=1 npm run web -- --port 8082
npm run test:markdown-ui
```

The browser suite refuses non-simulator servers and covers both desktop and
390px layouts. It does not write real game data.
