# Task: Fix argument labels showing above inputs instead of as placeholders

## CURRENT PRIORITY: Fix the label/placeholder issue

The user writes scripts in a visual block editor. When they write:

```
CreateTextInput({
  NAME = "kill",
  LABEL = "kill",
});
```

The block editor renders this as a `CreateTextInput` statement block with two argument rows: one for `NAME` and one for `LABEL`. Each argument has a value (e.g. `LABEL = "kill"` means the argument value is a StringLiteral with value "kill").

**The problem:** The label text (e.g. "kill" or "Label") appears ABOVE the input field as separate text. The user wants the label to appear ONLY as the placeholder text INSIDE the input field. There should be no text above the input.

**What was done so far:** The `<FontText>` label that was rendered above the input in `ArgRow` was removed. The `ArgRow` component now passes `label={input?.label ?? argument.name}` directly to `ExpressionSocket`, which passes it as `placeholder` to `ReplaceableTextInput`. However, the user reports the label still appears above the input.

**Possible causes the previous agent missed:**
1. The dev server may not have hot-reloaded — but the user says it's still broken, so assume the code is wrong.
2. There may be ANOTHER place rendering labels that wasn't found. Search ALL files in `app/script/editor/` for any `FontText` or `Text` that renders `label`, `input.label`, `argument.name`, or similar.
3. The `ExpressionSocket` component may be rendering the expression value as visible text in some code path. For a `StringLiteral` like `"kill"`, check if there's a path where it renders the string value as a `FontText` label rather than inside a `TextInput`.
4. The `MethodArgument` component (used for method call arguments like `.filter(...)`) also passes `label={input.label}` — check if it renders a label above.
5. The `StatementBlock` renders `{calleeName}` (e.g. "CreateTextInput") as a header — this is correct and should stay. But check if argument names or values are being rendered as sub-headers.

## What to investigate and fix

1. **Search the entire `app/script/editor/` directory** for any component that renders argument labels or input labels as visible text (FontText, Text, etc.) above or beside inputs. The label should ONLY appear as placeholder text inside inputs.

2. **Check `ExpressionSocket`** — when it receives a `StringLiteral` expression, it should render a `ReplaceableTextInput` with the string value as the input's value and the `label` prop as the placeholder. Verify this is the only rendering path. Check if there's a path where the label is rendered as separate text.

3. **Check `MethodArgument`** — it has its own rendering logic for lambda inputs, entry keys, and general expressions. Make sure no label text is rendered above the input.

4. **Check `ArgRow`** — it was already modified to remove the label text, but verify the current code is correct and there's no other label rendering.

5. **The `label` prop flow:** `ArgRow` passes `label={input?.label ?? argument.name}` to `ExpressionSocket`. `ExpressionSocket` passes `label` as `placeholder` to `ReplaceableTextInput` / `ParsedTextInput`. This is correct — the label should only appear as placeholder. But verify there's no other use of `label` that renders it as visible text.

## Project overview

This is a React Native Web app (Expo + Convex backend) called WolffsPoint. It has a visual script editor for creating dynamic game inputs. The script editor is in `app/script/editor/`.

### Key files:

- **`app/script/editor/Canvas.tsx`** — The main visual editor component. Renders statement blocks and expressions as visual blocks. This is where the label/placeholder issue is.
- **`app/script/editor/ScriptEditorDialog.tsx`** — The dialog wrapper. Contains the Canvas, mode toggle (blocks/text), preview, and insert modal.
- **`app/script/editor/InsertModal.tsx`** — The modal for inserting/swapping blocks and expressions.
- **`app/script/editor/editorReducer.ts`** — The reducer that manages editor state (AST, undo/redo).
- **`app/script/registry.ts`** — Defines all statement and expression blocks (their inputs, types, execution logic).
- **`app/script/lang/ast.ts`** — The AST types.
- **`app/script/lang/parser.ts`** — Parses script text into AST.
- **`app/script/lang/printer.ts`** — Prints AST back to script text.

### How the block editor works:

1. **Script text** is parsed into an AST (list of `Statement` nodes).
2. **`Canvas`** renders each statement as a `StatementBlock`.
3. **`StatementBlock`** renders the statement's arguments as `ArgRow` components.
4. **`ArgRow`** renders each argument's value using `ExpressionSocket`.
5. **`ExpressionSocket`** renders the expression based on its type:
   - `StringLiteral` → `ReplaceableTextInput` (text input with the string value)
   - `NumberLiteral` → `ReplaceableTextInput` (text input with the number)
   - `BooleanLiteral` → `SwapablePiece` (true/false toggle)
   - `IdentifierExpression` → `SwapablePiece` (variable name)
   - `CallExpression` → `SwapableBlock` (function call with arguments)
   - `BinaryExpression` → `SwapableBlock` (left operator right)
   - `MemberExpression` / chains → `SwapablePiece` + `MethodLink` components
   - `NothingLiteral` → `BooleanSocket` (empty + button)
   - `LambdaExpression` → lambda parameter input + body expression

### The registry defines inputs like this:

```typescript
{
  id: 'CreateTextInput',
  name: 'CreateTextInput',
  kind: 'statement',
  inputs: [
    { name: 'NAME', label: 'Name', type: 'string', required: true, default: 'input' },
    { name: 'LABEL', label: 'Label', type: 'string', default: 'Text' },
    { name: 'PLACEHOLDER', label: 'Placeholder', type: 'string' },
  ],
}
```

Each input has a `name` (the argument key in the script), a `label` (human-readable display name), and a `type` (string, number, boolean, expression, list, lambda, markdown).

### The data flow for arguments:

1. `StatementBlock` matches each `input` from the registry definition with the corresponding `argument` from the AST.
2. It passes both to `ArgRow`: `argument` (the AST node with the value) and `input` (the registry definition with the label/type).
3. `ArgRow` passes `label={input?.label ?? argument.name}` to `ExpressionSocket`.
4. `ExpressionSocket` uses `label` as the `placeholder` for text inputs.

### The `label` prop should NEVER be rendered as visible text above or beside the input. It should ONLY be used as placeholder text inside input fields.

## What was done in previous sessions (context)

1. **Surgical swap system** — implemented targeted swapping of chain bases and links using `REPLACE_CHAIN_BASE` and `REPLACE_CHAIN_LINK_AT` actions.
2. **Modal logic** — simplified `handleInsertExpression` in `ScriptEditorDialog`.
3. **Default mode** — editor defaults to 'blocks' mode.
4. **Identifier sanitization** — `sanitizeIdentifier` utility strips invalid characters.
5. **Variable display** — loop variables and defined variables are deduplicated in the InsertModal.
6. **Variable renaming** — renaming a Variable block's NAME field updates all references.
7. **Tooltip system** — a shared tooltip DOM element appended to `document.body`, with ownership model. Used by `SwapableBlock`, `SwapablePiece`, `PuzzleConnector`, `BooleanSocket`, `DeleteButton`, `ReplaceableTextInput`.
8. **Hover/swap system** — `SwapableBlock` and `SwapablePiece` components handle hover (dark bg + tooltip) and click-to-swap. Uses `onMouseOver`/`onMouseOut` with `INTERACTIVE_SELECTOR` and `data-no-swap` attributes. **This system has known bugs with nested hover targets — parent hover leaks through children. A full rewrite was planned but not yet executed.**
9. **Label removal** — the `<FontText>` label above inputs in `ArgRow` was removed, but the user reports labels still appear above inputs.

## What NOT to touch

- **Swap logic** — `onSwap` callbacks, `openExpressionModal`, `onAdd` calls should remain as-is.
- **`ReplaceableTextInput` / `StableTextInput` input handling** — these have local-state-while-focused behavior to prevent focus loss. Do not touch.
- **Tooltip system** — the shared tooltip with ownership model works. Don't change it.
- **`PuzzleConnector`, `BooleanSocket`, `DeleteButton` tooltips** — these work. Don't change them.

## Verification

After making changes, run:
```bash
npx prettier --write app/script/editor/Canvas.tsx
npx tsc --noEmit
```
Both must pass with no errors.
