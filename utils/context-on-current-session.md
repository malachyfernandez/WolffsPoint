# Session Context

## MAIN PRIORITY: Fix the TagCellDisplay cell

The immediate task is to fix the cell display in the players table. The user said:

> "I think u just need to redo the actual cell. it's such a simple part and yet this whole feature is bugged. might make more sense to just scrap and re-write it. the WHOLE cell needs to act as the button to open the modal. the text should always be centered from within it. (for both tags and text versions of the cell)"

### The problem

`TagCellDisplay` (`app/components/game/TagCellDisplay.tsx`) is the component that renders each extra column cell in the players table. It replaced the old `InlineEditableText` (an expanding text box). The cell should:

1. **Fill the entire parent cell area** (both width and height)
2. **Act as a single pressable button** — clicking anywhere in the cell opens `TagCellEditor` modal
3. **Center its content** — whether showing tags (colored pills), plain text, or "UNSET" placeholder
4. Show a small pencil edit icon next to tags

### What's broken

The cell content is NOT vertically centered. The `Pressable` has `flex: 1` and `alignSelf: 'stretch'` but the content still appears at the top, not centered. Multiple attempts to fix with `h-full`, `flex: 1`, `items-center`, `justify-center` have not resolved it.

### The parent container

In `UserRow.tsx` (line ~179), each cell is wrapped in:

```tsx
<Column
  className="border-subtle-border h-full items-center justify-center gap-4 border ..."
  style={{ width: columnWidth }}>
  <TagCellDisplay
    gameId={gameId}
    value={column}
    onChange={(newValue) => setExtraColumnValue?.(index, columnIndex, newValue)}
    width={columnWidth}
    onEditStart={() => handleColumnEditStart(columnIndex)}
    onEditEnd={() => handleColumnEditEnd(columnIndex)}
  />
</Column>
```

The `Column` has `h-full items-center justify-center`. The `TagCellDisplay` Pressable needs to fill this Column completely and center its content within. The issue is likely that `flex: 1` on the Pressable doesn't work because the Column's height comes from the Row parent (`h-12`), and the flex chain may not be resolving properly through the `Animated.View` wrapper and the `Column`.

### Approach to fix

Scrap the current `TagCellDisplay` and rewrite it. The simplest approach: make the `Pressable` use `style={{ width, height: '100%' }}` (or `flex: 1` with proper parent stretching) and `className="flex-row flex-wrap items-center justify-center gap-1"`. The key insight is that the Pressable must **grow to fill the parent** and then **center content within itself**. If `flex: 1` doesn't work, try `height: '100%'` or `position: 'absolute', inset: 0` as a fallback.

---

## Tag System Overview

### What was built

A tag system for the players table (operator view). Tags are colored pills that can be assigned to cells in the extra columns of the players table. This replaces the old expanding text input (`InlineEditableText`).

### Tag encoding (`utils/tagEncoding.ts`)

Tags are stored inline within cell text using the format:
```
[/TAG: "Infected"/]
```

A cell can be in one of two modes:
- **Tag mode**: Contains one or more `[/TAG: "Name"/]` markers (no other text)
- **Text mode**: Contains plain text (no tag markers)

Once a tag is added, text editing is disabled — it's one or the other.

Key functions:
- `parseCell(raw: string): ParsedCell` — parses raw cell value into `{ tags, text, hasTags }`
- `encodeTags(tagNames: string[]): string` — encodes tag names into storage format
- `encodeText(text: string): string` — encodes plain text (just returns it)
- `cellHasTags(raw: string): boolean` — checks if a cell contains tags

### Tag definitions storage

Tag definitions (name + color) are stored per-game using the DataProvider system:
- Key: `tagDefinitions-{gameId}` (via `getGameScopedKey('tagDefinitions', gameId)`)
- Type: `useValue` (variable type, PUBLIC privacy)
- Shape: `TagDefinition[]` where `TagDefinition = { name: string, color: string }`
- Color is a string name from the preset palette (e.g. "Red", "Blue", "Green")
- Config added to `utils/dataConfig.ts`

### Tag files

- **`app/components/game/TagPill.tsx`** — Colored pill component. Exports `TAG_COLORS` (10 preset colors), `getTagColor(name)`, and `TagPill` component. Pills can have optional remove button (`onRemove`) and selection state.
- **`app/components/game/AddTagDialog.tsx`** — Sub-modal for creating/editing tag definitions. Has name input (with duplicate check), color swatch picker, live preview. In edit mode, shows a delete button. Props: `onAdd`, `onEdit`, `onDelete`, `editTag`.
- **`app/components/game/TagCellEditor.tsx`** — Main modal for editing a cell. Left sidebar shows tag definitions (click to toggle selection, pencil icon to edit). Right side shows either selected tags (as removable pills) or a text input. Save/Cancel buttons at bottom right. Exports `TagDefinition` type.
- **`app/components/game/TagCellDisplay.tsx`** — The cell display in the table (THIS IS THE BROKEN ONE). Shows tags as pills or text, opens `TagCellEditor` on press.
- **`utils/tagEncoding.ts`** — Parse/encode utilities for the `[/TAG: "Name"/]` format.

### How cells are rendered in the table

1. `PlayerTable.tsx` renders `UserRow` for each player
2. `UserRow.tsx` maps over `user.playerData.extraColumns` and renders each as a `Column` wrapper containing a `TagCellDisplay`
3. `TagCellDisplay` shows the cell content and opens `TagCellEditor` modal on press
4. `TagCellEditor` lets you pick tags from the sidebar or type text, then saves via `onChange`
5. `onChange` calls `setExtraColumnValue` in `PlayerTable.tsx` which updates the `userTable` data via `useList`

---

## Scripting System Overview

This is the most important system to understand for upcoming work. The scripting system lets operators write visual scripts that generate dynamic input forms for players.

### Architecture

```
Script text (string)
  ↓ parseScript()
AST (Script node with Statement[])
  ↓ interpretScript()
RenderInstruction[] (UI instructions: select, text, number, checkbox, markdown, divider)
  ↓ ScriptRenderers
React components (inputs rendered to the player)
```

### Key files

- **`app/script/lang/ast.ts`** — AST type definitions. Key types: `Script`, `Statement` (BlockStatement, ExpressionStatement, IfStatement, ForEachStatement, FunctionStatement, ReturnStatement), `Expression` (StringLiteral, NumberLiteral, BooleanLiteral, NothingLiteral, IdentifierExpression, ListExpression, UnaryExpression, BinaryExpression, MemberExpression, IndexExpression, CallExpression, LambdaExpression, MarkdownLiteral, DropdownLiteral).
- **`app/script/lang/parser.ts`** — Parses script text into AST. Exports `parseScript(source: string): Script` and `parseExpression(source: string): Expression`.
- **`app/script/lang/printer.ts`** — Prints AST back to script text. Exports `printScript(ast: Script): string` and `printExpression(expr: Expression): string`.
- **`app/script/registry.ts`** — Defines all statement and expression blocks. Each block has inputs, a category, and an `execute`/`evaluate` function. Exports `STATEMENT_BLOCKS`, `EXPRESSION_BLOCKS`, `lookupStatement`, `lookupExpression`.
- **`app/script/runtime/values.ts`** — Runtime value types and helpers. `RuntimeValue` = string | number | boolean | NothingValue | RuntimeValue[] | RuntimeObject | RuntimeFunction | InputsWithDataMarker. Key helpers: `NOTHING`, `isNothing`, `isTruthy`, `displayValue`, `runtimeEquals`, `isRuntimeFunction`, `isRuntimeObject`, `isInputsWithData`, `toRuntimeValue`, `toExternalValue`.
- **`app/script/runtime/interpreter.ts`** — The interpreter. Exports `interpretScript(ast, options): InterpreterResult`. Walks the AST, executes statements, evaluates expressions, produces `RenderInstruction[]`.
- **`app/script/runtime/sources.ts`** — Creates script globals from game data. Exports `createScriptGlobals(source: ScriptSourceData): Record<string, unknown>`. Globals: `players`, `roles`, `currentPlayer`, `currentDay`, `dayDates`, `schedule`, `profiles`. Also exports `SCRIPT_GLOBAL_NAMES`.
- **`app/script/runtime/ScriptRuntime.tsx`** — React component that parses + interprets a script and renders the output. This is how scripts are actually run at runtime.

### Script syntax examples

```
// Define a variable
Variable({ NAME = "alivePlayers", VALUE = players.filter(Item => Item.isAlive) });

// Create a dropdown input from a list
CreateSelectInput({
  LIST = players,
  LABEL = "Select",
  NUMSELECTABLE = 1,
});

// Create a text input
CreateTextInput({ LABEL = "kill" });

// Create markdown content
CreateMarkdown({ CONTENT = "Hello world" });

// If/Else
If (currentDay > 0) {
  CreateMarkdown({ CONTENT = "Game has started" });
}

// ForEach loop
ForEach (Item in players) {
  CreateMarkdown({ CONTENT = Item.realName });
}

// Function definition with template
Function dataOnDay(data, day) template(input("data", players), " on day ", input("day", 1)) {
  Return data.Map(Item => Item.entry("days").index(day));
}

// Chain expressions
players.filter(Item => Item.isAlive).length
players.entry("days").index(0)
dataDaysToday(players, 0, Dropdown("before", ["before", "after"])).entry("days")
```

### Registry: Statement blocks

Defined in `registry.ts`. Each has: `id`, `name`, `kind: 'statement'`, `description`, `category`, `inputs: BlockInput[]`, `execute(args, ctx)`.

Current statement blocks:
- `Variable` — Define a named variable (inputs: NAME, VALUE)
- `CreateSelectInput` — Dropdown input (inputs: LIST, LABEL, NUMSELECTABLE)
- `CreateTextInput` — Text input (inputs: LABEL)
- `CreateNumberInput` — Number input (inputs: LABEL, MIN, MAX)
- `CreateCheckbox` — Boolean toggle (inputs: LABEL, DEFAULT)
- `CreateMarkdown` — Render markdown (inputs: CONTENT)
- `CreateDivider` — Horizontal line (no inputs)

### Registry: Expression blocks

Each has: `id`, `name`, `kind: 'expression'`, `description`, `category`, `inputs`, `appliesTo`, `evaluate(receiver, args, ctx)`, optional `isProperty`.

Current expression blocks:
- **List**: `filter` (lambda), `map` (lambda), `sort` (lambda), `length` (property), `first` (property), `last` (property), `get` (index), `contains` (value), `count` (lambda), `join` (separator)
- **Math**: `Round` (mode), `abs` (property), `MinMax` (mode, other), `toPowerOf` (exponent), `Root` (fn), `toNumber` (property), `Trig` (fn), `LogExp` (fn), `Sign` (fn)
- **String**: `toString` (property), `upper` (property), `lower` (property), `startsWith` (prefix), `endsWith` (suffix), `concat` (other)
- **Data**: `entry` (key) — get field from object, `index` (position) — get item at position

**Important**: `contains` already exists for strings and lists. It checks if a string contains a substring or if a list contains an item. For the upcoming tag feature, `column3.contains(tag("Infected"))` would need `tag()` to produce the `[/TAG: "Infected"/]` string and `.contains()` to check if the cell string contains that tag marker.

### How to add a new expression block

1. Add to `EXPRESSION_BLOCKS` in `registry.ts` with `id`, `name`, `inputs`, `evaluate` function
2. If it should appear in the InsertModal, it's automatically picked up from `EXPRESSION_BLOCKS`
3. The parser already handles `CallExpression` and `MemberExpression` — no parser changes needed for method-style calls
4. For a standalone function like `tag("Infected")`, it would be a `CallExpression` with callee `IdentifierExpression("tag")` — the interpreter resolves this by looking up the function in the scope or globals

### How to add a new statement block

1. Add to `STATEMENT_BLOCKS` in `registry.ts`
2. Define `inputs` (each with `name`, `label`, `type`, `default`)
3. Implement `execute(args, ctx)` — use `ctx.emit({...})` to produce render instructions, `ctx.defineVariable(name, value)` to set variables

### The interpreter (`runtime/interpreter.ts`)

- `interpretScript(ast, options)` walks statements, calling `execute` for statement blocks and `evaluate` for expression blocks
- Globals are passed in via `options.globals` (merged with `createScriptGlobals(sources)`)
- `Inputs` is a special global containing the current input state (what the player has entered)
- `InputsWithData` is a special marker object that resolves selected input values to their full data objects
- Functions defined with `Function` statements are stored as `RuntimeFunction` values in the scope
- The interpreter has fuel/depth limits to prevent infinite loops

### Script editor (visual block editor)

- **`app/script/editor/ScriptEditorDialog.tsx`** — The main dialog. Contains Canvas, mode toggle (blocks/text), preview, and InsertModal. Manages editor state via `editorReducer`. Scripts are saved as text via `onSubmit(scriptText)`.
- **`app/script/editor/Canvas.tsx`** — Renders the visual block editor. Renders statements as `StatementBlock` components, expressions via `ExpressionSocket`.
- **`app/script/editor/editorReducer.ts`** — Reducer for editor state (AST + undo/redo). Actions: INSERT_STATEMENT, REPLACE_STATEMENT, SET_EXPRESSION, REPLACE_CHAIN_BASE, INSERT_CHAIN_LINK_AT, etc.
- **`app/script/editor/InsertModal.tsx`** — Modal for inserting/swapping blocks and expressions. Shows categorized list of blocks, variables, functions, data sources. Also handles built-in functions (dataDaysToday, dataOnDay).
- **`app/script/editor/expressionEditor.ts`** — Expression editing utilities. Includes `traceEntrySource` for type tracing (determines what data source an expression resolves to, for autocomplete of `.entry("key")` keys). Has `ENTRY_SOURCE_TRANSITIONS` and `GLOBAL_DATA_SOURCES`.
- **`app/script/editor/PreviewPanel.tsx`** — Live preview of the script output.

### How scripts are stored and run

1. Scripts are written as text strings, stored in game data (e.g. via `useList` with a key like `actionScript-{gameId}`)
2. `MarkdownEditorDialog` embeds `ScriptEditorDialog` for editing scripts within markdown content
3. At runtime, `ScriptRuntime` component parses the script text, creates globals from game data via `createScriptGlobals`, interprets it, and renders the output instructions
4. Player input state is tracked via `Inputs` global and `inputState` option

### Built-in functions

`InsertModal.tsx` has a `BUILTIN_FUNCTIONS` array with pre-made function definitions (`dataDaysToday`, `dataOnDay`). When selected, they:
1. Show a first-time explanation dialog
2. Append the full function code to the end of the script
3. Insert a call expression at the selected location
4. Once added, they appear as regular custom functions (filtered out of built-in list)

### Type tracing for autocomplete

`expressionEditor.ts` has `traceEntrySource(expr, ctx)` which statically analyzes expressions to determine their data source (e.g. "players", "day"). This powers autocomplete for `.entry("key")` — knowing what keys are available. It handles:
- `IdentifierExpression` — checks `varSources` (local variables) then `GLOBAL_DATA_SOURCES` (players, currentPlayer, roles, etc.)
- `CallExpression` — looks up function definitions, traces their return expression
- Chain methods — `.entry("days")` transitions "players" → "day", `.map(lambda)` traces the lambda body

`ENTRY_SOURCE_TRANSITIONS`:
```typescript
{
  players: { days: 'day' },
  currentplayer: { days: 'day' },
}
```

---

## Data System (DataProvider)

### Overview

The app uses a DataProvider system with Convex backend. Data is stored per-user and synced in real-time. Client-side caching eliminates redundant network calls.

### Key hooks (`hooks/useData.ts`)

- `useValue<T>(key, config?)` — Single value per user. Returns `[record, setValue]` where `record.value` is the current value.
- `useList<T>(key, itemId, config?)` — Single item in a keyed list. Returns `[record, setValue]`.
- `useFindValues<T>(key, filters)` — Read accessible variable rows across users.
- `useFindListItems<T>(key, filters)` — Read accessible list rows.

### Game-scoped keys

Use `getGameScopedKey(baseKey, gameId)` from `utils/multiplayer.ts` → returns `${baseKey}-${gameId}`.

### Config (`utils/dataConfig.ts`)

All data keys should be defined in `DATA_CONFIG` with type, privacy, and defaultValue. Current relevant entries:
- `userTable` (list, PUBLIC) — Array of `UserTableItem[]`
- `userTableTitle` (list, PUBLIC) — Column titles `{ extraUserColumns: [], extraDayColumns: [] }`
- `userTableColumnVisibility` (list, PUBLIC) — Column visibility booleans
- `tagDefinitions` (variable, PUBLIC) — Array of `TagDefinition[]`

### Player table data shape (`types/playerTable.ts`)

```typescript
interface UserTableItem {
  userId: string | "NOT-JOINED";
  realName: string;
  email: string;
  role: string;
  playerData: {
    livingState: 'alive' | 'dead';
    extraColumns?: string[];  // ← tags are stored here as encoded strings
  };
  days: Array<{
    votes?: string[];
    actions?: string[];
    extraColumns?: string[];
  }>;
}
```

Extra columns are stored as `string[]` in `playerData.extraColumns`. Each string can be plain text or contain tag markers like `[/TAG: "Infected"/]`.

---

## UI Patterns

### Dialogs

Use `ConvexDialog` from `app/components/ui/dialog/ConvexDialog`:
```tsx
<ConvexDialog.Root isOpen={isOpen} onOpenChange={setIsOpen}>
  <ConvexDialog.Portal>
    <ConvexDialog.Overlay />
    <ConvexDialog.Content className="max-w-md">
      <ConvexDialog.Close ... />
      <DialogHeader text="Title" subtext="Subtitle" />
      {/* content */}
    </ConvexDialog.Content>
  </ConvexDialog.Portal>
</ConvexDialog.Root>
```

### Layout

- `Column` — vertical layout with `gap` prop (4px units)
- `Row` — horizontal layout with `gap` prop
- `ShadowScrollView` — ScrollView with shadow effects (use for all scrollable content)

### Components

- `FontText` — Text with custom fonts. Props: `weight` ('regular'|'medium'|'bold'), `variant` ('default'|'heading'|'subtext'), `color`.
- `AppButton` — Button with variants: 'outline', 'outline-alt', 'black', 'grey', 'green', 'accent', 'red', 'filled', 'secondary'.
- `FontTextInput` — Styled text input.
- `AppDropdown` — Dropdown select.

### Styling

Tailwind CSS for React Native. Colors: `background`, `text`, `border`, `subtle-border`, `primary-accent`.

---

## Players Table Structure

### Component hierarchy

```
PlayerPageOPERATOR.tsx
  └── PlayerTable.tsx (manages userTable data, column titles, visibility, undo/redo)
      ├── TitleRow.tsx (column headers, editable, visibility toggles)
      └── UserRow.tsx (one per player)
          ├── CustomCheckbox (dead/alive toggle)
          ├── Pressable (name + role, opens UserEditDialog)
          ├── TagCellDisplay (one per visible extra column) ← THE BROKEN COMPONENT
          │   └── TagCellEditor (modal, opened on press)
          │       └── AddTagDialog (sub-modal for creating/editing tag definitions)
          └── UserEditDialog (edit user details)
```

### Column sizing

`playerTableColumnSizing.ts` — Column widths are configurable per game. `getPlayerPageColumnSizesKey(gameId)` returns the storage key. Sizes: 'small', 'medium', 'large' with `getWidthForColumnSize(baseWidth, size)`.

---

## Verification Commands

```bash
npx tsc --noEmit          # Type check (must pass with 0 errors)
npx prettier --write <files>  # Format files
```

Both must pass before considering work complete.
