# Wolffspoint — Full Session Context & Type System Improvement Task

## THE TASK (read this first)

> The types system accurately understands if something is a string, number, or list. It does not yet seem to support js objects. Sometimes you don't know what it is, so then you would allow anything, but if I did:
>
> ```
> LIST = players.first
> ```
>
> You know that that is an object and therefore the only real option should be `.entry` (or any others if others exist).
>
> Same with stuff like:
>
> ```
> LIST = players.map(Item => Item.BLANK)
> ```
>
> The BLANK should know it's an object.
>
> Trace it through. For `players` you know it's gonna be a list, then a js Object, then if they select `days` it's a list again, and finally within that are values (string or number based on the entry of the js object).
>
> Just try your best to trace through EVERYTHING you can so there is always accurate types. Be methodical about it. Also for `InputsWithData` you should be able to figure out which ones are player functions and the whole thing should trace correctly through the network of types. EVERY built-in variable in the registry that is within the data tab (for both types of scripts — the ones found in the roles tab AND the ones found in the tag trigger menu).

**Goal:** Make the script editor's type inference system (`app/script/editor/typeInference.ts`) accurately trace types through every expression path — including js objects (so that `.entry()` is the only offered block on an object receiver), list-of-objects → object → list → scalar chains, lambda parameter types, function return types, and `InputsWithData` resolution. The type system must work for BOTH script contexts: role-message scripts (Roles tab) and tag-trigger scripts (tag trigger menu).

---

## PROJECT OVERVIEW

Wolffspoint is a React Native + Expo + Convex app for running social-deduction games (Werewolf/Mafia-style). Players have roles, take daily actions, vote, and the operator certifies each night. The app has a custom block-based scripting language that lets game operators write logic that runs at certify time (role messages) or when tags are added/removed (tag triggers).

### Tech stack
- **Frontend:** React Native + Expo (managed), NativeWind (Tailwind for RN), HeroUI dialogs
- **Backend:** Convex (realtime sync via `useValue`/`hooks/useData`)
- **State:** Per-game scoped key-value storage via `getGameScopedKey("keyName", gameId)` and `useValue`
- **UI components:** Custom `ConvexDialog`, `AppButton`, `FontText`, `Column`/`Row` layout, `AppDropdown`, `ShadowScrollView`

---

## THE SCRIPTING LANGUAGE — TWO PLACES WHERE SCRIPTS LIVE

There are exactly **two places** where scripts run. This is critical context:

### 1. Role-message scripts (Roles tab)
- Embedded in markdown via `/*script ... script*/` blocks
- Edited in the role message editor (Roles tab) via `ScriptEditorDialog` with `isTriggerContext=false`
- These are the **only** place with input/dropdown/selector blocks (`CreateSelectInput`, `CreateTextInput`, `CreateNumberInput`, `CreateCheckbox`) because only role messages can store input state (the player's submitted action)
- At certify time, each player's role message script runs with their submitted inputs, and `UpdateCell` blocks collect table updates
- Data sources available: `players`, `roles`, `currentPlayer`, `currentDay`, `dayDates`, `schedule`, `profiles`, `Inputs`, `InputsWithData`
- Top-level statements allowed: Variable, CreateSelectInput, CreateTextInput, CreateNumberInput, CreateCheckbox, CreateMarkdown, CreateDivider, If/Else, ForEach, Function, Return, "On Certify => Update Cell"

### 2. Tag-trigger scripts (tag trigger menu, via AddTagDialog)
- Stored per-game in `tagTriggers` (keyed by tag name) via `useValue(getGameScopedKey("tagTriggers", gameId))`
- Edited from `AddTagDialog` in edit mode via `ScriptEditorDialog` with `isTriggerContext=true` and `hideInputs=true`
- Run immediately when a tag is added to/removed from a cell
- Have **no input state**, so input/dropdown blocks are hidden (`hideInputs` prop)
- Use special globals: `placedTag`, `placedUser`, `placedDay`, `placedColumn`
- Data sources available: `players`, `roles`, `placedTag`, `placedUser`, `placedDay`, `placedColumn` (NO `currentPlayer`, `currentDay`, `Inputs`, `InputsWithData`)
- Top-level statements restricted: only `OnTagAdded`, `OnTagRemoved`, and `Function` blocks at root level. Everything else goes inside an `OnTagAdded`/`OnTagRemoved` block.
- A single trigger script per tag contains BOTH `OnTagAdded` and `OnTagRemoved` blocks; the interpreter uses `triggerMode` ('added' | 'removed') to decide which blocks execute

### How they differ in the editor
- `ScriptEditorDialog` takes `isTriggerContext` and `hideInputs` props
- `InsertModal` takes the same props and uses them to filter which data sources and control templates show up
- `CONTROL_TEMPLATES` in `InsertModal.tsx` has a `triggerOnly` field: `true` = only trigger root, `false` = only non-trigger, `'inside'` = only inside trigger blocks, `undefined` = both
- `DATA_SOURCES` (regular) vs `TRIGGER_DATA_SOURCES` (trigger) arrays in `InsertModal.tsx`

---

## KEY FILE MAP

### Script language core
- `app/script/lang/ast.ts` — AST node definitions (Expression, Statement types)
- `app/script/lang/parser.ts` — parses script text → AST
- `app/script/lang/printer.ts` — prints AST → script text (`printScript`, `printScriptBlock`, `printExpression`)
- `app/script/registry.ts` — **THE BLOCK REGISTRY**. Defines `STATEMENT_BLOCKS` and `EXPRESSION_BLOCKS`. Each block has `id`, `name`, `category`, `appliesTo` (for expressions), `inputs`, and `evaluate`/`execute` functions.
- `app/script/runtime/interpreter.ts` — evaluates a parsed Script AST. Handles `tag()` builtin, `Var()` builtin, `InputsWithData` resolution, `UpdateCell` collection, `OnTagAdded`/`OnTagRemoved` gating via `triggerMode`
- `app/script/runtime/sources.ts` — `createScriptGlobals(source)` builds the runtime globals object (`players`, `roles`, `currentPlayer`, `currentDay`, `dayDates`, `schedule`, `profiles`). Also defines `SCRIPT_GLOBAL_NAMES`.
- `app/script/runtime/values.ts` — `RuntimeValue` type, `NOTHING`, `isRuntimeObject`, `isRuntimeFunction`, `isInputsWithData`, `toRuntimeValue`, `displayValue`, `isTruthy`, `runtimeEquals`

### Script editor UI
- `app/script/editor/ScriptEditorDialog.tsx` — main editor dialog. Builds `entryKeysBySource` (the type metadata map), `inputSources`, `definedFunctions`, `definedVariables`. Manages blocks/text modes, undo/redo, unsaved-changes confirmation.
- `app/script/editor/Canvas.tsx` — renders the block tree (statements + expressions). Contains `ChainRenderer`, `MethodLink`, `FunctionCallRenderer`, `ArgumentRenderer`, `TagCallRenderer`, `EntryKeyInput`. This is where `.entry()` key dropdowns render.
- `app/script/editor/InsertModal.tsx` — the "add block" picker modal. Filters blocks by type compatibility (`inferExpressionType`, `isCompatible`, `explainIncompatibility`). Contains `DATA_SOURCES`, `TRIGGER_DATA_SOURCES`, `CONTROL_TEMPLATES`, `BUILTIN_FUNCTIONS`.
- `app/script/editor/expressionEditor.ts` — expression path manipulation (`decomposeChain`, `recomposeChain`, `replaceExpressionAtPath`, `setExpressionAtLocation`) AND **entry-source tracing** (`traceEntrySource`, `traceChainSource`, `ENTRY_SOURCE_TRANSITIONS`, `applyEntryTransition`). This is the "what data source does this expression resolve to" system.
- `app/script/editor/typeInference.ts` — **THE TYPE INFERENCE SYSTEM** (the file you'll mainly edit). Defines `ScriptType`, `inferExpressionType`, `inferBlockResultType`, `inferDataSourceType`, `fieldSourceType`, `isCompatible`, `appliesToType`, `explainIncompatibility`, `describeType`.
- `app/script/editor/editorReducer.ts` — reducer for AST mutations (insert/swap/remove statements and expressions). Contains `createScript`, `createOnTagAddedStatement`, `createUpdateCellStatement`, `createTriggerUpdateCellStatement`, `buildDefaultMethodArgs`, `parseLiteralValue`.
- `app/script/editor/useTooltip.ts` — hover tooltip system for disabled blocks

### Tag system
- `utils/tagEncoding.ts` — parse/encode `[/TAG: "Name"/]` format
- `utils/applyTableUpdates.ts` — apply `TableUpdate[]` to `UserTableItem[]`. Exports `VOTE_MULTIPLIER_COLUMN`, `LIVING_STATE_COLUMN`, `VOTE_COLUMN`, `ACTION_COLUMN` (all lowercase now — this was a bug fix)
- `utils/runScriptWithUpdates.ts` — run a raw script with table update support (used by tag triggers)
- `utils/runMarkdownScriptsWithUpdates.ts` — extract script blocks from markdown and run with table update support (used by certify)
- `hooks/useTagTriggers.ts` — hook that fires tag trigger scripts. Builds `placedUser` player entry, `getCellValue` for UpdateCell, calls `interpretScript` with `triggerMode`.
- `app/components/game/AddTagDialog.tsx` — tag editor dialog with trigger script section
- `app/components/game/TagCellEditor.tsx` — where tags are added/removed on cells; calls `onTagsAdded`/`onTagsRemoved`

### Table types
- `types/playerTable.ts` — `UserTableItem`, `UserTableTitle`, `DayData`. `UserTableTitle` has `extraUserColumns: string[]` and `extraDayColumns: string[]` (the custom column titles).
- `types/roleTable.ts` — `RoleTableItem`

---

## THE TYPE INFERENCE SYSTEM (what you need to improve)

### File: `app/script/editor/typeInference.ts`

#### `ScriptType` (current)
```ts
export type ScriptType =
  | 'list' | 'object' | 'string' | 'number' | 'boolean' | 'any' | 'nothing';
```
**Note:** `'object'` exists in the type but is almost never RETURNED by the inference functions. This is the core gap. `inferDataSourceType` returns `'object'` for `placedUser`/`currentPlayer`/`schedule`, but `inferBlockResultType` never returns `'object'` for `.first()`/`.last()`/`.get()` — it returns `'any'`. And `inferExpressionType` for `.entry()` returns `'any'` unless it finds a `__fieldTypes` match.

#### `EntryKeysBySource` (the metadata map)
```ts
export type EntryKeysBySource = Record<string, string[]> & {
  __fieldTypes?: Record<string, string>;
};
```
Built in `ScriptEditorDialog.tsx` (lines ~316-388). Maps source names → their available `.entry()` keys. The special `__fieldTypes` key maps `"source.field"` → `ScriptType` string. Current entries:
- `players.days` → `'list'`
- `players.realName`/`email`/`userId`/`role` → `'string'`
- `players.isAlive` → `'boolean'`
- Same for `currentPlayer.*` and `placedUser.*`
- Extra user columns (from `titles.extraUserColumns`) → `'string'` for all three player sources
- `keys.day` = `['vote', 'action', ...extraDayColumns]` — the keys on a day object
- `keys.players` = `['realName', 'email', 'userId', 'role', 'isAlive', 'days', ...extraUserColumns]`
- `keys.roles` = `['role', 'doesRoleVote', 'isVisible', 'aboutRole']`

**Gap:** There are no `__fieldTypes` entries for `day.*` (day object fields like `vote`, `action`, extra day columns). There are no entries for `roles.*` fields. There are no entries for `InputsWithData.*` (which should resolve to the source type of the input's LIST argument).

#### `inferDataSourceType(name, entryKeysBySource)` (current)
- Returns `'list'` for: `players`, `roles`, `daydates`, `profiles`, `inputs`, `inputswithdata`
- Returns `'number'` for: `currentday`, `placedday`
- Returns `'string'` for: `placedtag`, `placedcolumn`
- Returns `'object'` for: `schedule`, `placeduser`, `currentplayer`
- Falls back to `'any'`

**Gap:** `inputswithdata` is marked as `'list'` but it's actually a special marker object (`{ kind: 'inputsWithData' }`) that only supports `.entry("key")`. Each `.entry("key")` resolves to whatever the input's LIST source was (e.g. if `CreateSelectInput({ LIST = players, LABEL = "Pick" })`, then `InputsWithData.entry("Pick")` returns a player object — or a list of player objects if multi-select). This needs proper tracing.

#### `fieldSourceType(entryKeysBySource, sourceName, fieldName)` (current)
Looks up `__fieldTypes["source.field"]` or case-insensitive variant. Returns the `ScriptType` or `undefined`.

#### `inferBlockResultType(block, receiverType)` (current)
- `filter`/`map`/`sort` → `'list'`
- `length`/`count` → `'number'`
- `first`/`last`/`get` → `'any'` ← **BUG: should be `'object'` when receiver is a list of objects (like players), or trace the element type**
- `join` → `'string'`
- `contains` → `'boolean'`
- `math` category → `'number'`
- `string` category → `'string'` (except `startsWith`/`endsWith` → `'boolean'`)
- `entry` → `'any'` ← **should look up `__fieldTypes` when possible**
- `index` → `'any'`
- `toNumber` → `'number'`, `toString` → `'string'`

#### `inferExpressionType(expr, entryKeysBySource, contextVariables)` (current)
Walks the AST. Handles:
- Literals → their literal type
- `IdentifierExpression` → `inferDataSourceType` (or `'any'` if it's a context variable)
- `MemberExpression` → looks up block by property name, calls `inferBlockResultType`
- `CallExpression` with `MemberExpression` callee:
  - `.entry("field")` → looks up `fieldSourceType` if base is `IdentifierExpression`
  - Handles chained `.first().entry("days")` and `.filter(...).first().entry("days")` by looking at the inner list source
  - `.first()`/`.last()`/`.get()` on a known list source → `'object'`
  - `.filter()`/`.map()`/`.sort()` on a list source → `'list'`
- `BinaryExpression` → comparisons → `'boolean'`, arithmetic → `'number'`
- `UnaryExpression` → `NOT`/`ISTRUTHY`/`ISFALSY` → `'boolean'`

**Gaps in `inferExpressionType`:**
1. `.map(Item => Item.BLANK)` — the lambda body isn't traced. `Item` should be known as the element type of the list (e.g. `'object'` for `players.map(...)`), so `Item.entry("days")` should resolve to `'list'`, and `Item.entry("role")` to `'string'`. Currently the lambda parameter is just added to `contextVariables` which returns `'any'`.
2. `players.first` (as a `MemberExpression` property, not a call) — should return `'object'` since `players` is a list of objects. Currently `inferBlockResultType` for `first` returns `'any'`.
3. `players.entry("days").first()` — `players.entry("days")` is `'list'` (from `__fieldTypes`), then `.first()` on it should return `'object'` (a day object). Currently the chained `.first()` case only checks if the base is an `IdentifierExpression`, not a `CallExpression`.
4. `InputsWithData.entry("Pick")` — should resolve to the type of the input's LIST source. Currently `InputsWithData` is treated as `'list'` which is wrong.
5. Function calls — `myFunc(players)` should trace through the function body's return expression to determine the return type. Currently returns `'any'`.
6. `roles.entry("role")` — `roles` is a list, `.entry()` on a list doesn't make sense (should be on an object). But `roles.first().entry("role")` should work. The `__fieldTypes` map doesn't have `roles.*` entries.

---

## THE ENTRY-SOURCE TRACING SYSTEM (companion to type inference)

### File: `app/script/editor/expressionEditor.ts` (lines ~450-717)

This is a SEPARATE tracing system from `typeInference.ts`. It traces the "source name" of an expression (e.g. `"players"`, `"day"`) so the `.entry()` key dropdown knows which keys to show. It does NOT track `ScriptType` — only a string source name.

#### `ENTRY_SOURCE_TRANSITIONS`
```ts
export const ENTRY_SOURCE_TRANSITIONS: Record<string, Record<string, string>> = {
  players: { days: 'day' },
  currentplayer: { days: 'day' },
};
```
So `players.entry("days")` → source becomes `'day'`, and `day.entry("vote")` → no transition (stays `'day'` or undefined).

**Gap:** No transition for `placeduser: { days: 'day' }`. No transitions for `InputsWithData` → input source. No transitions for `roles` fields.

#### `GLOBAL_DATA_SOURCES`
```ts
const GLOBAL_DATA_SOURCES = new Set([
  'players', 'currentplayer', 'roles', 'schedule', 'profiles', 'daydates',
]);
```
**Gap:** Missing `placeduser`, `inputswithdata`, `inputs`.

#### `SOURCE_PRESERVING_METHODS`
```ts
const SOURCE_PRESERVING_METHODS = new Set(['index', 'filter', 'sort', 'first', 'last']);
```
These methods preserve the element source (array → element source).

#### `SOURCE_DROPPING_METHODS`
```ts
const SOURCE_DROPPING_METHODS = new Set(['length', 'count', 'join', 'contains']);
```
These return primitives, so source is dropped.

#### `traceEntrySource(expr, ctx)` 
Traces an expression to its source name string. Handles:
- `IdentifierExpression` → checks `ctx.varSources[name]` then `GLOBAL_DATA_SOURCES`
- `CallExpression` with `IdentifierExpression` callee → traces through defined function body (using `DefinedFunction.returnEntrySource` or re-tracing the return expression with parameter sources)
- `CallExpression`/`MemberExpression` with `MemberExpression` callee → `traceChainSource`

#### `traceChainSource(chain, ctx)`
- Special-cases `InputsWithData.entry("X")` → looks up `ctx.inputSources[key]` (the input's LIST source name)
- Special-cases `Inputs.entry("X")` → returns undefined (value is a primitive)
- Regular chains: traces base source, then applies each method link via `traceMethodSource`

#### `traceMethodSource(link, currentSource, ctx)`
- `.entry("X")` → `ENTRY_SOURCE_TRANSITIONS[source]?.[key]`
- `.map(lambda)` → traces lambda body with parameter bound to current source
- Source-preserving methods → keep source
- Source-dropping methods → undefined

#### `inputSources` (built in `ScriptEditorDialog.tsx`)
`collectInputSources(statements, entryKeysBySource)` scans `CreateSelectInput` statements and maps `label.toLowerCase()` → `listArg.name.toLowerCase()` (the LIST argument's source name). So if you have `CreateSelectInput({ LIST = players, LABEL = "Pick Player" })`, then `inputSources["pick player"] = "players"`.

---

## THE RUNTIME DATA SOURCES (what types things actually are)

### `createScriptGlobals(source)` in `app/script/runtime/sources.ts`

Builds the globals object. Key shapes:

#### `players` — `Array<RuntimeObject>`
Each player entry (from `playerEntry`):
```ts
{
  realName: string,
  email: string,
  userId: string,
  role: string,
  isAlive: boolean,         // player.playerData.livingState === 'alive'
  days: Array<{             // list of day objects
    vote: string,
    action: string,
    [extraDayColumnTitle: string]: string,  // merged in
  }>,
  [extraUserColumnTitle: string]: string,   // merged in
}
```

#### `roles` — `Array<RuntimeObject>`
```ts
{
  role: string,
  doesRoleVote: boolean | undefined,
  isVisible: boolean | undefined,
  aboutRole: string | undefined,
}
```
(Filtered by capability — non-operators only see `isVisible !== false` roles)

#### `currentPlayer` — `RuntimeObject | undefined`
Same shape as a player entry. Only set when `capability === 'player'`.

#### `currentDay` — `number`
#### `dayDates` — `string[]`
#### `schedule` — `Record<string, unknown>` (an object)
#### `profiles` — `unknown[]` (a list)

#### `Inputs` — `Record<string, unknown>` (NOT in globals; resolved from `inputState`)
Actually `Inputs` is not defined as a global in `createScriptGlobals`. The interpreter resolves `Inputs.entry("key")` by looking up `inputState[key]`. The value is whatever the player selected (a string, or array of strings for multi-select).

#### `InputsWithData` — special marker `{ kind: 'inputsWithData' }`
Defined in the interpreter constructor: `this.root.define('InputsWithData', { kind: 'inputsWithData' } as const)`. When you call `InputsWithData.entry("key")`, the interpreter's `resolveInputsWithData` method:
1. Looks up `inputState[key]` (the selected value)
2. Finds the emitted output instruction for that key (from `CreateSelectInput`) to get the options with metadata
3. Matches the selected value back to the full option object's `meta` field
4. Returns the `meta` object (or array of meta objects for multi-select)

So if `CreateSelectInput({ LIST = players, LABEL = "Pick" })` and the player selects "Alice", then:
- `Inputs.entry("Pick")` → `"Alice"` (the raw string)
- `InputsWithData.entry("Pick")` → the full player object `{ realName: "Alice", email: ..., role: ..., days: [...], ... }`

For multi-select, `InputsWithData.entry("Pick")` returns an **array** of player objects.

### Trigger-specific globals (set in `hooks/useTagTriggers.ts`)
- `placedTag` — `string` (the tag name)
- `placedUser` — `RuntimeObject` (same shape as a player entry)
- `placedDay` — `number | null` (null for player-level columns)
- `placedColumn` — `string` (the column title)

---

## THE BLOCK REGISTRY (`app/script/registry.ts`)

### Statement blocks (`STATEMENT_BLOCKS`)
| id | category | inputs |
|----|----------|--------|
| Variable | variable | NAME (string), VALUE (expression) |
| CreateSelectInput | input | LIST (list), LABEL (string), NUMSELECTABLE (number) |
| CreateTextInput | input | LABEL (string) |
| CreateNumberInput | input | LABEL (string), MIN (number), MAX (number) |
| CreateCheckbox | input | LABEL (string), DEFAULT (boolean) |
| CreateMarkdown | display | CONTENT (markdown) |
| CreateDivider | display | (none) |

### Expression blocks (`EXPRESSION_BLOCKS`)
| id | category | appliesTo | isProperty | returns (runtime) |
|----|----------|-----------|------------|-------------------|
| filter | list | list | no | list |
| map | list | list | no | list |
| sort | list | list | no | list |
| length | list | any | yes | number |
| first | list | list | yes | first item (object if list of objects) |
| last | list | list | yes | last item |
| get | list | list | no | item at index |
| contains | list | any | no | boolean |
| count | list | list | no | number |
| join | list | list | no | string |
| Round | math | number | no | number |
| abs | math | number | yes | number |
| MinMax | math | number | no | number |
| toPowerOf | math | number | no | number |
| Root | math | number | no | number |
| toNumber | math | any | yes | number |
| Trig | math | number | no | number |
| LogExp | math | number | no | number |
| Sign | math | number | no | number |
| toString | string | any | yes | string |
| upper | string | string | yes | string |
| lower | string | string | yes | string |
| startsWith | string | string | no | boolean |
| endsWith | string | string | no | boolean |
| concat | string | string | no | string |
| append | string | string | no | string |
| replace | string | string | no | string |
| **entry** | **data** | **any** | no | **field value (any type — depends on object)** |
| **index** | **data** | **any** | no | **item at position** |

### `tag()` builtin (not in registry — handled in interpreter)
`tag("Infected")` → `"[/TAG: \"Infected\"/]"` (encoded tag string). Used with `.contains()`: `column3.contains(tag("Infected"))`.

### `Var()` builtin (not in registry — handled in interpreter)
`Var("name")` → looks up a variable by name.

---

## HOW THE EDITOR USES TYPES (the filtering flow)

### In `InsertModal.tsx`:
1. **Chain insert/swap** (`target.kind === 'chainInsert' || 'chainSwap'`): 
   - Calls `inferExpressionType(target.chainExpression, entryKeysBySource, contextVariables)` to get `receiverType`
   - For each `EXPRESSION_BLOCKS` entry, calls `explainIncompatibility(receiverType, block)` which checks `isCompatible(receiverType, appliesToType(block.appliesTo))`
   - If incompatible, the block is shown greyed out with a tooltip explaining why
   - **This is where the type system matters most.** If `receiverType` is `'any'` (because inference failed), EVERYTHING is shown. If `receiverType` is `'object'`, only blocks with `appliesTo: 'any'` (like `entry`, `index`, `toNumber`, `toString`, `length`, `contains`) are enabled — `filter`/`map`/`sort`/`first`/`last`/`get`/`count`/`join` (which require `'list'`) are disabled.

2. **Expression insert** (top-level expression slot): shows all blocks + data sources + variables + functions. No type filtering at this level (the slot accepts anything).

### In `Canvas.tsx`:
- `ChainRenderer` decomposes a chain expression into links and renders each. The `entrySource` and `entrySourceMap` are threaded through to determine which keys to show in `.entry()` dropdowns.
- `ArgumentRenderer` (for method arguments): if the method is `.entry()` and there's an `entrySource` with keys in `entryKeysBySource[entrySource]`, it renders an `EntryKeyInput` dropdown instead of a generic expression slot.
- `TagCallRenderer`: renders `tag("Name")` with an `AppDropdown` of tag definitions + "Edit Tags…" footer.

---

## WHAT NEEDS TO BE FIXED (specific improvements)

### 1. `.first()`/`.last()`/`.get()` on a list of objects should return `'object'`
In `inferBlockResultType`, `first`/`last`/`get` return `'any'`. They should return `'object'` when the receiver is a list of objects (players, roles, days). 

The challenge: `inferBlockResultType` doesn't know what the list contains. It needs the receiver type to carry element-type info, OR the inference needs to happen at the `CallExpression` level where we know the source.

**Current partial fix** in `inferExpressionType`: `.first()`/`.last()`/`.get()` on an `IdentifierExpression` that's a known list source → `'object'`. But this doesn't handle:
- `players.entry("days").first()` — base is a `CallExpression`, not `IdentifierExpression`
- `players.filter(...).first()` — base is a `CallExpression`
- `myFunc().first()` where `myFunc` returns a list of objects

### 2. `.map(Item => Item.BLANK)` — lambda parameter should be typed
When tracing `players.map(Item => Item.entry("days"))`:
- `players` is `'list'` of objects
- `.map(lambda)` returns `'list'`
- Inside the lambda, `Item` should be `'object'` (the element type of players)
- `Item.entry("days")` should be `'list'` (from `__fieldTypes["players.days"]`)
- So `players.map(Item => Item.entry("days"))` returns `'list'` of `'list'` — but we flatten this to just `'list'`

The lambda body type should be traced with the parameter bound to the element type. The element type of a list source can be looked up: if the source is `players`/`currentPlayer`/`placedUser`, the element is `'object'`. If the source is `dayDates`, the element is `'string'`. If the source is `profiles`, the element is `'any'`.

### 3. `players.entry("days")` should return `'list'` (already works via `__fieldTypes`)
But `players.entry("days").first()` should return `'object'` (a day object). And `players.entry("days").first().entry("vote")` should return `'string'`.

This requires: when `.first()` is called on a `CallExpression` that returns `'list'`, look at what the inner expression resolves to and return `'object'` if it's a list of objects. Or better: track the "element source name" through the chain so `.first()` knows it's getting a `day` object.

### 4. `InputsWithData.entry("key")` should resolve to the input's source type
`InputsWithData` is currently typed as `'list'` in `inferDataSourceType` — wrong. It's a special marker. `InputsWithData.entry("key")` should:
1. Look up `inputSources[key]` to get the source name (e.g. `"players"`)
2. Return the type of that source (e.g. `'list'` for players, since the input returns a list of selected items... or a single object for single-select)

Actually: for single-select, `InputsWithData.entry("key")` returns ONE object. For multi-select, it returns an ARRAY of objects. The `inputSources` map doesn't currently track whether it's multi or single select. The `NUMSELECTABLE` argument of `CreateSelectInput` determines this. This may need to be tracked.

For type inference purposes: `InputsWithData.entry("key")` should be typed as `'object'` (single-select) or `'list'` (multi-select). If we can't determine, default to `'object'` since most selects are single.

### 5. `roles.entry("role")` and `roles.first().entry("role")` 
`roles` is a list of objects. `roles.first()` should give `'object'`. `roles.first().entry("role")` should give `'string'`. Need to add `__fieldTypes` entries for `roles.*`:
- `roles.role` → `'string'`
- `roles.doesRoleVote` → `'boolean'`
- `roles.isVisible` → `'boolean'`
- `roles.aboutRole` → `'string'`

### 6. `day` object fields
`players.entry("days").first().entry("vote")` should be `'string'`. Need `__fieldTypes` entries for `day.*`:
- `day.vote` → `'string'`
- `day.action` → `'string'`
- `day.[extraDayColumn]` → `'string'` (for each extra day column)

### 7. Function return types
`myFunc(players)` should trace through the function body's return expression. The `traceEntrySource` system already does this for source NAMES. The TYPE system should do the same for types. A function that returns `players.first()` should have return type `'object'`. A function that returns `players.length` should have return type `'number'`.

The `DefinedFunction` interface (in `InsertModal.tsx`) already has `returnEntrySource`. We could add a `returnType: ScriptType` field, or compute it on the fly by tracing the return expression with `inferExpressionType` using the parameter types as context.

### 8. `placedUser` in trigger context
`placedUser` is an object (same shape as a player entry). `placedUser.entry("days")` should be `'list'`. `placedUser.entry("role")` should be `'string'`. The `__fieldTypes` map already has `placedUser.*` entries (added in `ScriptEditorDialog.tsx`), but `inferDataSourceType` returns `'object'` for `placedUser` — good. The issue is that `placedUser` is NOT in `GLOBAL_DATA_SOURCES` in `expressionEditor.ts`, so `traceEntrySource` won't recognize it. And `ENTRY_SOURCE_TRANSITIONS` doesn't have `placeduser: { days: 'day' }`.

### 9. `schedule` is an object
`schedule` returns `'object'` from `inferDataSourceType`. `.entry("key")` on it should work but we don't know the field types. Leave as `'any'` for now.

---

## THE `entryKeysBySource` MAP (built in ScriptEditorDialog.tsx)

This is the central metadata that drives both the type system AND the `.entry()` key dropdowns. Current construction (lines ~316-388):

```ts
keys.players = ['realName', 'email', 'userId', 'role', 'isAlive', 'days', ...extraUserColumns];
keys.roles = ['role', 'doesRoleVote', 'isVisible', 'aboutRole'];
keys.day = ['vote', 'action', ...extraDayColumns];
keys._userColumns = extraUserColumns;
keys._dayColumns = extraDayColumns;
keys.__fieldTypes = {
  'players.days': 'list', 'players.realName': 'string', ... ,
  'currentPlayer.*': ..., 'placedUser.*': ...,
  // extra user columns → 'string' for all three player sources
};
if (isTriggerContext) {
  keys.placedTag = []; keys.placedUser = keys.players;
  keys.placedDay = []; keys.placedColumn = [];
} else {
  keys.currentPlayer = keys.players;
  keys.currentDay = []; keys.dayDates = []; keys.schedule = []; keys.profiles = [];
  keys.Inputs = collectInputLabels(state.ast.statements);
  keys.InputsWithData = keys.Inputs;
}
```

**To fix the type system, you'll need to add to `__fieldTypes`:**
- `roles.role` → `'string'`, `roles.doesRoleVote` → `'boolean'`, `roles.isVisible` → `'boolean'`, `roles.aboutRole` → `'string'`
- `day.vote` → `'string'`, `day.action` → `'string'`, `day.[extraDayCol]` → `'string'`
- Possibly `InputsWithData.[inputLabel]` → the source type (but this is dynamic)

And update `ENTRY_SOURCE_TRANSITIONS` in `expressionEditor.ts`:
- Add `placeduser: { days: 'day' }`
- Add `roles: { /* no transitions — roles fields are all scalars */ }`

And update `GLOBAL_DATA_SOURCES` in `expressionEditor.ts`:
- Add `'placeduser'`, `'inputswithdata'`, `'inputs'`

---

## HOW `InputsWithData` TRACES TODAY (and what's broken)

In `expressionEditor.ts` `traceChainSource`:
```ts
if (base.expr.name.toLowerCase() === 'inputswithdata') {
  // For each chain link, find .entry("key")
  const key = link.args[0].value.value.toLowerCase();
  let source = ctx.inputSources[key];  // e.g. "players"
  // Then continue tracing remaining chain links
  return source;
}
```
So `InputsWithData.entry("Pick")` traces to source `"players"`. This means the `.entry()` dropdown after it will show player keys. **This part works for source tracing.**

But in `typeInference.ts`, `InputsWithData` is in the `listSources` set, so `inferDataSourceType('inputswithdata')` returns `'list'`. Then `InputsWithData.entry("Pick")` — the `.entry()` call — tries to look up `__fieldTypes["inputswithdata.pick"]` which doesn't exist, so returns `'any'`. **This is broken.** It should resolve to `'object'` (single-select) or `'list'` (multi-select) based on the input's source.

To fix: in `inferExpressionType`, when handling `.entry()` on `InputsWithData`, look up `inputSources[key]` and return the element type of that source. But `inputSources` is not currently passed to `inferExpressionType`. It would need to be threaded through, or the `entryKeysBySource` map could include `InputsWithData.[label]` → source type entries.

---

## BUILT-IN FUNCTIONS (`BUILTIN_FUNCTIONS` in InsertModal.tsx)

Two built-in functions that get appended to the script when first used:

### `dataDaysToday(data, days, direction)`
```
Function dataDaysToday(data, days, direction) template(input("data", players), " data ", input("days", 0), " day(s) ", input("direction", Dropdown("before", ["before", "after"])), "today") {
  Variable({ NAME = "targetDay", VALUE = (currentDay + days) });
  If ((direction == "before")) {
    Variable({ NAME = "targetDay", VALUE = (currentDay - days) });
  }
  Return data.Map(Item => Item.entry("days").index(targetDay));
}
```
Returns: `data.map(Item => Item.entry("days").index(targetDay))` — a list of day-data values (strings). The `data` parameter defaults to `players`, so `Item` is a player object, `Item.entry("days")` is a list of day objects, `.index(targetDay)` is a single day object. So the return type is `'list'` of `'object'` (day objects). For type inference: `'list'`.

### `dataOnDay(data, day)`
```
Function dataOnDay(data, day) template(input("data", players), " on day ", input("day", 1)) {
  Return data.Map(Item => Item.entry("days").index(day));
}
```
Same return shape: list of day objects.

These are traced via `traceEntrySource` through the function body. The `returnEntrySource` is computed in `collectDefinedFunctions` in `ScriptEditorDialog.tsx`. For type inference, the same approach could compute a `returnType`.

---

## THE `contextVariables` PARAMETER

`inferExpressionType` takes `contextVariables: string[]`. These are variables in scope (lambda parameters, ForEach item names, defined variables). Currently, any identifier in `contextVariables` returns `'any'`.

**Improvement needed:** Instead of just names, track `(name, type)` pairs. When entering a lambda `Item => ...` on a list of objects, add `(Item, 'object')` to context. When entering a ForEach over `players`, add `(itemName, 'object')`. When a `Variable({ NAME = "x", VALUE = players.length })` is encountered, add `(x, 'number')`.

This requires changing `contextVariables` from `string[]` to `Record<string, ScriptType>` or `Array<{ name: string; type: ScriptType }>`.

---

## THE `appliesTo` → `ScriptType` MAPPING

```ts
export const appliesToType = (appliesTo: ExpressionBlockDef['appliesTo']): ScriptType => {
  if (appliesTo === 'list') return 'list';
  if (appliesTo === 'number') return 'number';
  if (appliesTo === 'string') return 'string';
  return 'any';
};
```
**Gap:** There's no `'object'` option in `appliesTo`. The `entry` block has `appliesTo: 'any'` which means it shows up everywhere. If we want `.entry()` to be the ONLY option on an object receiver, we'd need to either:
- Add `'object'` to the `appliesTo` type and set `entry.appliesTo = 'object'` (but then `.entry()` wouldn't show on `'any'` receivers, which might be too restrictive)
- OR keep `entry.appliesTo = 'any'` but make all list-only blocks (`filter`, `map`, `sort`, `first`, `last`, `get`, `count`, `join`) explicitly require `'list'` and NOT accept `'object'`. Currently `isCompatible('object', 'list')` returns `false` (good), so list blocks ARE disabled on objects. The issue is just that `first`/`last`/`get` return `'any'` instead of `'object'`, so the receiver type after `.first()` is `'any'` and everything shows up again.

**The real fix:** Make `first`/`last`/`get` return `'object'` when called on a list of objects. Then after `players.first()`, the receiver is `'object'`, and only `appliesTo: 'any'` blocks (entry, index, toNumber, toString, length, contains) are enabled. That's exactly the desired behavior — `.entry()` becomes the natural choice.

---

## SEQUENCE OF EXPRESSION TYPES (the user's example traced)

User's example: `players` → list → object → `days` → list → values

```
players                          → 'list' (of objects)
players.first                    → 'object' (a player)     ← NEEDS FIX
players.first().entry("days")    → 'list' (of day objects) ← NEEDS FIX (chained .first)
players.first().entry("days").first()  → 'object' (a day)  ← NEEDS FIX
players.first().entry("days").first().entry("vote") → 'string' ← NEEDS FIX (day field types)
```

```
players.map(Item => Item.BLANK)  → 'list'
  where Item                     → 'object' (element of players)  ← NEEDS FIX
  Item.entry("days")             → 'list'                         ← NEEDS FIX
  Item.entry("role")             → 'string'                       ← works via __fieldTypes
```

```
InputsWithData.entry("Pick")     → 'object' (if Pick is a player select) ← NEEDS FIX
InputsWithData.entry("Pick").entry("role") → 'string'                   ← NEEDS FIX
```

---

## TESTING / VERIFICATION

- `npx tsc --noEmit` — type check
- `npx prettier --write <file>` — format
- No test suite for the script editor type system. To verify changes, open the script editor in the app and check that:
  1. After `players.first()`, only `.entry()` and other `appliesTo: 'any'` blocks are enabled (not `filter`, `map`, etc.)
  2. After `players.entry("days")`, `.first()` is enabled and returns an object
  3. After `players.map(Item => ...)`, inside the lambda, `Item` shows object-appropriate blocks
  4. `InputsWithData.entry("Pick")` (where Pick is a player select) shows object-appropriate blocks
  5. `roles.first().entry("role")` works and shows `'string'` type

---

## IMPORTANT CONVENTIONS

- **Column name constants are lowercase:** `VOTE_MULTIPLIER_COLUMN = 'votemultiplier'`, `LIVING_STATE_COLUMN = 'livingstate'`, `VOTE_COLUMN = 'vote'`, `ACTION_COLUMN = 'action'`. This was a bug fix — comparing `column.toLowerCase()` against a capitalized constant failed.
- **Number coercion in interpreter:** `this.number()` in `interpreter.ts` coerces strings via `Number()`, booleans to `0`/`1`, `NOTHING` to `0`. This was a fix — `cellContents - 1` was returning `0` because `"2"` wasn't parsed.
- **Unsaved changes confirmation:** All editor dialogs must have the "are you sure you want to leave?" pattern. See `AGENTS.md` and `MarkdownEditorDialog.tsx` for the canonical implementation.
- **Tag list items in TagManagerModal:** The entire row is a button to open the edit menu (not just a pencil icon).
- **`tag()` calls in the script editor** render with an integrated `AppDropdown` showing tag definitions + "Edit Tags…" footer (via `TagCallRenderer` in `Canvas.tsx`).
- **`TagDefinitionsContext`** is provided in `Canvas.tsx` to give nested components access to tag definitions without re-rendering the `TagManagerModal`.

---

## SUMMARY OF FILES TO EDIT

1. **`app/script/editor/typeInference.ts`** — main work:
   - Make `inferBlockResultType` for `first`/`last`/`get` return `'object'` when the receiver is a list of objects (needs receiver type info)
   - Make `inferExpressionType` handle chained `.first()`/`.last()`/`.get()` on `CallExpression` bases (not just `IdentifierExpression`)
   - Make `inferExpressionType` trace lambda bodies with parameter types
   - Make `inferExpressionType` handle `InputsWithData.entry("key")` by looking up input sources
   - Make `inferExpressionType` handle function call return types
   - Change `contextVariables` from `string[]` to carry type info
   - Add `'object'` element type tracking for list sources

2. **`app/script/editor/ScriptEditorDialog.tsx`** — add `__fieldTypes` entries for:
   - `roles.*` fields
   - `day.*` fields
   - Possibly `InputsWithData.[label]` → source type (or handle dynamically in typeInference)
   - Thread `inputSources` into the type inference if needed

3. **`app/script/editor/expressionEditor.ts`** — update:
   - `ENTRY_SOURCE_TRANSITIONS`: add `placeduser: { days: 'day' }`
   - `GLOBAL_DATA_SOURCES`: add `'placeduser'`, `'inputswithdata'`, `'inputs'`
   - Possibly add `roles` field transitions if needed

4. **`app/script/editor/InsertModal.tsx`** — may need to pass `inputSources` to type inference calls, or update `DefinedFunction` to include `returnType`.

5. **`app/script/editor/Canvas.tsx`** — may need to thread additional type info through `ChainRenderer`/`MethodLink`/`ArgumentRenderer` for the `.entry()` dropdown to work with the improved types.

---

## FINAL NOTES

- The type system is "best-effort" — it doesn't evaluate expressions, just looks at their shape. When in doubt, return `'any'` (which shows all blocks). It's better to show too many blocks than too few.
- The `entryKeysBySource` map is the single source of truth for both key dropdowns AND type metadata. Keep it in sync.
- The `traceEntrySource` system (source names) and `inferExpressionType` system (ScriptTypes) are parallel and should be kept consistent. If you fix one, check the other.
- Built-in functions (`dataDaysToday`, `dataOnDay`) return lists of day objects. Their `returnEntrySource` is already computed. A `returnType` could be computed similarly.
- The `number()` method in the interpreter now coerces strings/booleans/NOTHING — arithmetic on cell contents works.
- All column-name comparisons in `applyTableUpdates.ts` use lowercase constants — don't re-capitalize them.

When you're done, run `npx tsc --noEmit` and `npx prettier --write` on changed files. There's no test suite for the type system, so verify by opening the script editor in the app and checking the block filtering behavior at each chain step.
