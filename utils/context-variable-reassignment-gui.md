# Context: Variable Reassignment GUI Enhancement

## Task

Enhance the block-based script editor GUI so that when a user adds or edits a `Variable` block, the NAME field offers a dropdown of existing variables (from the current script) plus an "Add new…" option at the bottom that switches the field to a free-text input. This makes variable reassignment discoverable — users can pick an existing variable to reassign, or type a new name to declare a new one.

**This is a GUI-only change.** The scripting language and runtime already support reassignment (calling `Variable({ NAME = "x", VALUE = ... })` with an existing name simply overwrites the variable). No runtime, parser, or AST changes are needed. The change is entirely in the block-based visual editor (`Canvas.tsx` and related files).

### Backward compatibility requirement

The implementation must be fully backward compatible. The only acceptable edge-case difference is around reassignment behavior (which already works at runtime — the GUI just didn't surface it well). Existing scripts, saved data, and the text-mode editor must continue to work unchanged.

## Key Terminology

- **Variable block**: A statement block `Variable({ NAME = "varName", VALUE = <expression> })`. Defined in the registry at `app/script/registry.ts` line 222. At runtime, it calls `ctx.defineVariable(name, value)` which sets/overwrites the variable in the current environment.
- **Defined variables**: The list of variable names that have been declared by `Variable` blocks anywhere in the current script. Collected by `collectDefinedVariables()` in `ScriptEditorDialog.tsx` (line 76), which recursively walks all statements (including inside If/ForEach/Function bodies) looking for `Variable({NAME = "..."})` calls.
- **String slot rendering**: When a block input has `type: 'string'`, the Canvas renders it as a `ReplaceableTextInput` — an inline text field. See `Canvas.tsx` around line 1212-1225. This is how the Variable block's NAME field currently renders.
- **EntryKeyInput pattern**: The existing pattern to implement — a dropdown of known keys plus a "Custom…" option that switches to free-text. See `Canvas.tsx` line 1509-1552 (`EntryKeyInput` component). This is the reference implementation to follow.
- **AppDropdown**: The project's reusable dropdown component at `app/components/ui/forms/AppDropdown.tsx`. Supports a `footer` prop for custom content at the bottom (used by `TagCallRenderer` for an "Edit Tags" button).

## Where Things Sit

### Registry (block definitions)

**`app/script/registry.ts`** line 222-236:
```typescript
{
  id: 'Variable',
  name: 'Variable',
  kind: 'statement',
  description: 'Define a named variable',
  category: 'variable',
  inputs: [
    { name: 'NAME', label: 'Name', type: 'string', required: true, default: 'newVariable' },
    { name: 'VALUE', label: 'Value', type: 'expression', required: true, default: 'nothing' },
  ],
  execute: (args, ctx) => {
    const rawName = str(args.name ?? NOTHING);
    const name = rawName.replace(/[^a-zA-Z0-9_]/g, '').replace(/^[0-9]/, '_$&');
    if (name) ctx.defineVariable(name, args.value ?? NOTHING);
  },
},
```

The NAME input has `type: 'string'`, which means the Canvas renders it as a plain text input. To add the dropdown, either:
- (a) Change the rendering in Canvas.tsx to special-case Variable blocks' NAME arg (similar to how `tag()` calls and `.entry()` methods get special renderers), or
- (b) Add a new input type like `'string-or-existing'` to the registry input type system and handle it in Canvas.

Option (a) is simpler and more localized.

### Canvas (block rendering)

**`app/script/editor/Canvas.tsx`**:
- Line 1212-1225: The generic string literal rendering path. This is where NAME currently renders as a `ReplaceableTextInput`.
- Line 1509-1552: `EntryKeyInput` — the reference pattern. It has a `custom` state boolean. When `false`, shows an `AppDropdown` with known keys + a `{ value: '__custom__', label: 'Custom…' }` option. When the user picks "Custom…", it switches to a `ReplaceableTextInput` with a "List" link to switch back.
- Line 1692-1740: `TagCallRenderer` — another reference, showing an `AppDropdown` with a `footer` prop for extra actions.
- Line 474-510: `ReplaceableTextInput` — the inline editable text component used throughout.

The Variable block's NAME argument is rendered through the generic call-argument rendering path. To intercept it, look at how `tag()` calls are intercepted at line 704-706:
```typescript
if (fnName === 'tag') {
  return <TagCallRenderer call={call} onSetExpression={onSetExpression} location={location} />;
}
```

A similar check for `fnName === 'Variable'` and `argName === 'NAME'` can route to a new `VariableNameInput` component.

### Defined variables collection

**`app/script/editor/ScriptEditorDialog.tsx`** line 76-105:
```typescript
const collectDefinedVariables = (statements: Statement[], acc: string[] = []): string[] => {
  for (const stmt of statements) {
    if (stmt.kind === 'ExpressionStatement' &&
        stmt.expression.kind === 'CallExpression' &&
        stmt.expression.callee.kind === 'IdentifierExpression' &&
        stmt.expression.callee.name.toUpperCase() === 'VARIABLE') {
      const nameArg = stmt.expression.arguments.find(
        (a) => a.kind === 'NamedArgument' && a.name.toUpperCase() === 'NAME'
      );
      if (nameArg && nameArg.kind === 'NamedArgument' &&
          nameArg.value.kind === 'StringLiteral' && nameArg.value.value) {
        const clean = sanitizeIdentifier(nameArg.value.value);
        if (clean) acc.push(clean);
      }
    }
    // Recurse into If/ForEach/Function bodies
  }
  return acc;
};
```

This is called at line 953 and the result (`definedVariables: string[]`) is passed to `Canvas` as a prop. The Canvas already receives this list — it's used for the "Variables" category in the InsertModal. The same list should be available to the new `VariableNameInput` component.

### Editor reducer (rename on NAME change)

**`app/script/editor/editorReducer.ts`** line 631-675:
The `SET_EXPRESSION` action already handles Variable block NAME changes specially — when the NAME of a Variable block changes, it renames all references to the old name throughout the script (using `renameIdentifierInStatements`). This logic must continue to work when the NAME is changed via the new dropdown. The dropdown should dispatch the same `SET_EXPRESSION` action with a `StringLiteral` expression, so the existing rename logic fires automatically.

### Sanitize identifier

Used everywhere to clean variable names:
```typescript
const sanitizeIdentifier = (value: string) =>
  value.replace(/[^a-zA-Z0-9_]/g, '').replace(/^[0-9]/, '_$&');
```
Defined in `ScriptEditorDialog.tsx` line 73, `InsertModal.tsx` line 337, and `Canvas.tsx` line 68.

## Implementation Plan

1. **Create a `VariableNameInput` component** in `Canvas.tsx`, modeled after `EntryKeyInput`:
   - Props: `expression: Expression`, `definedVariables: string[]`, `onChange: (expression: Expression) => void`
   - State: `custom` boolean — whether the user is in free-text mode
   - When `custom` is `false`: show an `AppDropdown` with:
     - All `definedVariables` as options
     - A `{ value: '__new__', label: 'Add new…' }` option at the bottom
   - When the user picks an existing variable: call `onChange` with a `StringLiteral` of that name
   - When the user picks "Add new…": switch to `custom = true` mode, show a `ReplaceableTextInput` with a "List" link to switch back
   - When `custom` is `true`: show a `ReplaceableTextInput` that sanitizes the input via `sanitizeIdentifier` and calls `onChange` with a `StringLiteral`
   - If the current value is not in `definedVariables` (e.g., a new variable or loaded from text mode), default to `custom = true` mode

2. **Wire it into the Canvas rendering**: In the call-argument rendering path (where `tag()` is intercepted), add a check: if the call's callee is `Variable` and the argument name is `NAME`, render `VariableNameInput` instead of the generic string input. Pass `definedVariables` from the Canvas props.

3. **Ensure the rename logic still fires**: The `onChange` callback should produce a `StringLiteral` expression, which flows through `onSetExpression` → `SET_EXPRESSION` reducer action, which already detects Variable NAME changes and renames references.

4. **Handle the "Add new" edge case**: When switching from an existing variable to "Add new", the text input starts empty. As the user types, the name is sanitized. If they type an existing variable name, it's fine — it just reassigns (which is the desired behavior).

## Files to Modify

- `app/script/editor/Canvas.tsx` — Add `VariableNameInput` component and wire it into the Variable block's NAME argument rendering.

## Files to Read First

- `app/script/editor/Canvas.tsx` — Focus on `EntryKeyInput` (line ~1509), `TagCallRenderer` (line ~1692), the string literal rendering path (line ~1212), and the call argument rendering path (line ~700).
- `app/script/editor/ScriptEditorDialog.tsx` — Focus on `collectDefinedVariables` (line 76) and how `definedVariables` is passed to Canvas (line 1365).
- `app/script/editor/editorReducer.ts` — Focus on `SET_EXPRESSION` action (line 631) and the Variable NAME rename logic (line 642-666).
- `app/script/registry.ts` — The Variable block definition (line 222).
- `app/components/ui/forms/AppDropdown.tsx` — The dropdown component API (props: `options`, `value`, `onValueChange`, `footer`, `isInDialog`, `allowUnselect`).

## Constraints

- **GUI-only change**: No runtime, parser, AST, or serialization changes.
- **Backward compatible**: Existing scripts and saved data must work unchanged.
- **Follow existing patterns**: Use `EntryKeyInput` and `TagCallRenderer` as reference implementations.
- **Sanitize names**: All variable names must pass through `sanitizeIdentifier`.
- **Rename references**: When picking an existing variable that differs from the current name, the existing rename logic in the reducer should fire (it will, as long as `onChange` produces a `StringLiteral`).
- **Project conventions**: Follow the unsaved-changes confirmation pattern from `AGENTS.md` if any new dialog state is introduced (unlikely for this change since it's inline). Use `AppDropdown` for the dropdown. Use `ReplaceableTextInput` for the free-text input. Use NativeWind classes for styling.
