# Context: Move Tool — Place-as-Swap, English Operator Labels, and `not` as a Chain-Wrapping Block

## What is being asked

Three related changes to the script editor's expression system. **Do not run verification (tsc/prettier/eslint/browser tests) — just build the changes.** This file is the only context the new thread receives; it is self-contained.

### Task 1: Allow "place as swap" during the move/clone Place phase

Today, during the Place phase of a Move/Clone session, you can only place the moving expression **into** an existing expression's empty slots — i.e. into a `BooleanSocket` (the empty "+" placeholder) or onto a green `PuzzleConnector` (the "+" between/around chain links and blocks). You can place into either argument of a `==` expression, but you **cannot** click the `==` block itself to swap it with the moving expression.

**Requested:** During Place phase, clicking a whole expression block (the same `Swapable` you'd click to swap it normally) should **swap** that expression with the moving/shelf expression — replacing it entirely. This is the "place onto the block itself" path, complementing the existing "place into an argument" path.

**Confirmation dialog required:** Before performing a swap, show a confirmation dialog with a Cancel button. It should explain what is being swapped, e.g. `"Swapping == with players.entry(\"Select\")"` — i.e. describe the existing expression being replaced and the incoming shelf expression. Use the existing `UnsavedChangesDialog` component (see below) or a small confirm dialog following the same pattern.

### Task 2: Replace operator symbol labels with English names

The operator dropdown in `BinaryExpression` rendering currently shows the raw symbols (`==`, `!=`, `>`, `<`, `>=`, `<=`, `AND`, `OR`, `+`, `-`, `*`, `/`, `%`) as both the option labels and the displayed value. Replace these with English names everywhere they're shown to the user:

- `==` → equals
- `!=` → not equal
- `>` → greater than
- `<` → less than
- `>=` → at least
- `<=` → at most
- `AND` → and
- `OR` → or
- `+` → plus
- `-` → minus
- `*` → times
- `/` → divide
- `%` → modulo

The `InsertModal` already has English-label operator lists (`BOOLEAN_OPERATORS` and `MATH_OPERATORS` with `label` fields) — reuse those mappings. The `Canvas` `BinaryExpression` renderer's `AppDropdown` is where the symbol labels currently leak through. Also check the `expressionLabel` used for tooltips/swap labels.

### Task 3: Add `not` (and other single-input prefix operators) as chain-attachable blocks that wrap the chain

Today, when you have a chain expression like `players.entry("Select")` and you click the green "+" after it, the InsertModal offers chain links (`.filter(...)`, `.length`, etc.) AND binary operators (`equals`, `plus`, …). Picking a binary operator **wraps** the current chain as the left operand: `players.entry("Select") == ___`. The whole chain becomes the left side of a new `BinaryExpression`. This wrapping behavior is implemented in `InsertModal` (~line 648-704).

**Requested:** Add `not` the same way — as a chain-attachable block that **wraps** the current chain expression as its operand, producing `NOT (players.entry("Select"))`. The `UnaryExpression` with `operator: 'NOT'` already exists in the AST and is parsed/printed/evaluated.

Generalize: there are several **single-input starting expressions** (prefix operators that don't start with a dot) — `NOT`, `isTruthy`, `isFalsy`, and unary `-`/`+`. All of these should be offered as chain-wrapping blocks the same way binary operators are, since they consume the preceding expression as their single operand. (`NOT` is the primary one the user wants; the others follow the same pattern.)

## Terminology & concepts

- **Move/Clone session**: A modal editing mode in the script editor. `operation: 'move' | 'clone'`, `phase: 'collect' | 'place'`. Collect = pick up expressions/blocks onto a shelf (numbered markers replace them). Place = drop the shelf expression into the canvas via green targets.
- **Shelf expression**: The combined expression built from picked selections (`composeShelfExpression`), shown at the bottom; placed via green targets.
- **Chain**: A method-chain expression `base.method().property`. `decomposeChain` → `[base, .method(), .property, ...]`; `recomposeChain` reassembles. Index 0 is the base.
- **Chain-wrapping operator**: An operator that, when "attached after" a chain, wraps the entire chain as one of its operands (binary: left operand; unary: the operand). This is distinct from a chain *link* (a `.method()` that extends the chain).
- **`Swapable`**: The wrapper around every expression/block that handles hover, click-to-swap, and move picking. During Place phase its `onClick` is disabled (`if (moveTool) return;`), so today you cannot click a whole block to place onto it — only green connectors/sockets work.
- **`BooleanSocket`**: The empty "+" placeholder for an empty expression slot; doubles as a green place target during Place.
- **`PuzzleConnector`**: The "+" between chain links / blocks; doubles as a green place target during Place.
- **`MoveNumberMarker`**: The numbered circle shown where a moved item was during Collect.

## Where things sit in the codebase

### Move tool state & handlers — `app/script/editor/ScriptEditorDialog.tsx`

- **`MoveSelection`** (~265): `{ kind: 'whole' | 'chainLink' | 'block'; number; location/linkIndex; expression/link/statement }`.
- **`MoveSession`** (~281): `{ operation; phase; category; baseline; selections; nextNumber }`.
- **`deriveSessionAst`** (~329): AST with picked items removed (used for Place-phase canvas + final commit). `whole` → `NothingLiteral`; `chainLink` → drop link + recompose; `block` → delete statement. Clone returns baseline unchanged.
- **`deriveSessionCanvasAst`** (~388): During `collect` + expression category, returns `baseline` (stable indices for markers); otherwise `deriveSessionAst`.
- **`composeShelfExpression`** (~393): Combines selections into one `Expression | null`.
- **`canPlaceExpression`** (~784): Validates a place target against the shelf expression (concrete base required for whole/base placement; `NothingLiteral` base + links for mid-chain).
- **`handlePlaceExpression`** (~797): Commits a placement. `linkIndex === undefined` → replace whole expression at location; `0` → replace base keeping rest of chain; else → splice shelf links into chain. **This is where swap-on-whole-block would hook in** (the `linkIndex === undefined` branch already replaces the whole expression — Task 1 needs to make whole-expression Swapables *invoke* this branch during Place, with a confirm dialog).
- **`handleEnterPlacePhase`** (~745): Switches collect→place, re-derives canvas AST. **`handleBackToCollect`** (~755): place→collect.
- **`moveToolControls`** (~840): Builds `MoveToolControls`. `getLinkMarkers`/`getWholeMarker` return markers only during `collect` (empty/undefined during place). `canPlaceExpression`/`onPlaceExpression`/`onPlaceBlock` exposed here.
- **Confirmation dialog state**: `isLeaveConfirmDialogOpen` (~537) uses `UnsavedChangesDialog`. A new confirm state (e.g. `swapConfirm`) + dialog should be added for Task 1.

### Rendering — `app/script/editor/Canvas.tsx`

- **`MoveToolControls`** interface (~125): `getLinkMarkers`, `getWholeMarker`, `canPlaceExpression`, `onPlaceExpression`, etc. **Task 1 may need a new method here** (e.g. `onPlaceExpression` already takes `{ location, linkIndex? }` — a whole-block swap is `linkIndex === undefined`, so no new method strictly required; the Swapable just needs to call it during Place).
- **`Swapable`** (~250): `onPointerDown` (~315) handles **collect** picking (`canPick` requires `phase === 'collect'`). `onClick` (~354) handles normal swap but **early-returns when `moveTool` is active** (`if (moveTool) return;`). **Task 1: add a Place-phase click path** that, when `moveTool.phase === 'place'` and the target is a `whole` expression, calls `moveTool.onPlaceExpression({ location })` (after confirm). The `moveTarget` is already passed to every whole-expression Swapable.
- **`PuzzleConnector`** (~376): Green place target; `validPlace` checks `canPlaceExpression`; calls `onPlaceExpression({ location, linkIndex })`.
- **`BooleanSocket`** (~592): Empty-slot placeholder; also a green place target via `canPlaceExpression({ location, linkIndex })`.
- **`BinaryExpression` rendering** (~889): Renders left `ExpressionSocket` + operator `AppDropdown` + right `ExpressionSocket`, wrapped in a `Swapable` with `moveTarget={{ kind: 'whole', location, expression }}`. The `AppDropdown` options use raw symbols: `operatorSet.map((operator) => ({ value: operator, label: operator }))` (~912). **Task 2: replace `label: operator` with English names.** `expressionLabel` (~825) returns `expression.operator` for BinaryExpression — also needs the English name.
- **`UnaryExpression` rendering** (~959): Renders operator text + operand `ExpressionSocket`, wrapped in `Swapable` with `moveTarget={{ kind: 'whole', ... }}`. Operator text shows `isTruthy`/`isFalsy`/`NOT`/`-`/`+` (~964-969). **Task 2/3: show English names; ensure `not` renders as "not".**
- **`BOOLEAN_OPERATORS`/`MATH_OPERATORS`** (~64-65): Raw symbol arrays used for `operatorSet` and `isMathOperator`.

### Operator definitions & chain-wrapping — `app/script/editor/InsertModal.tsx`

- **`BOOLEAN_OPERATORS`** (~381): `{ label, operator }[]` with English labels (equals, not equal, greater than, less than, at least, at most, and, or). **Reuse this for Task 2 labels.**
- **`MATH_OPERATORS`** (~392): `{ label, operator, description }[]` (plus, minus, times, divide, modulo). **Reuse for Task 2.**
- **Chain-attach item building** (~622-704): For `chainInsert`/`chainSwap` targets, builds chain-link items from `EXPRESSION_BLOCKS` + binary-operator items that wrap `target.chainExpression` as the left operand (~648-702). **Task 3: add unary-operator items here** that wrap `target.chainExpression` as the operand: `{ kind: 'UnaryExpression', operator: 'NOT', operand: target.chainExpression ?? NothingLiteral, span }`. Do the same for `isTruthy`/`isFalsy` (and unary `-`/`+` if desired). These call `onInsertExpression(expr, target)`.

### AST / parser / printer — `app/script/lang/`

- **`ast.ts`**: `UnaryExpression` (~146) `operator: 'NOT' | '-' | '+' | 'ISTRUTHY' | 'ISFALSY'`, `operand`. `BinaryOperator` (~152). `BinaryExpression` (~167) `left`/`right`.
- **`parser.ts`** (~458-482): Parses `NOT`/`-`/`+` and `isTruthy`/`isFalsy` as prefix unary operators (precedence 7). `NOT` is a keyword token.
- **`printer.ts`** (~94-103): Prints `NOT ` / `isTruthy ` / `isFalsy ` prefix. **Task 2 may want to keep printer as-is (source form) but show English in UI only** — confirm whether the user wants printed source to change too; the request is about UI labels, so likely keep printer using `NOT`/symbols for valid source, and only change UI display.
- **`types.ts`** (~45): `UnaryExpression` with `NOT` → boolean; others → number.

### Editor reducer — `app/script/editor/editorReducer.ts`

- `INSERT_CHAIN_LINK_AT` (~698) and `REPLACE_CHAIN_LINK_AT` (~717): handle chain link insert/replace. Whole-expression replacement during place goes through `setScriptExpression` in `handlePlaceExpression` (not the reducer) — `linkIndex === undefined` branch.

### Confirmation dialog — `app/components/ui/dialog/UnsavedChangesDialog.tsx`

Reusable confirm dialog. Props: `isOpen`, `onOpenChange`, `onStay`, `onLeave`, `title?`, `message?`, `stayLabel?`, `leaveLabel?`. Defaults: title "Unsaved Changes", stay "Stay", leave "Leave". **For Task 1, render it with a custom title/message like `Swapping <existing> with <shelf>`**, `stayLabel="Cancel"`, `leaveLabel="Swap"`. `onLeave` performs the swap via `handlePlaceExpression({ location })` (no linkIndex → whole replacement). Pattern is already used in `ScriptEditorDialog` for unsaved-changes-on-close (~537, ~1238-1254).

## Implementation notes & decisions

- **Task 1 (place-as-swap):** The cleanest hook is `Swapable`'s click handler. Today it early-returns when `moveTool` is set. Add: if `moveTool.phase === 'place'` and `moveTarget.kind === 'whole'` and `moveTool.canPlaceExpression({ location: moveTarget.location })`, then instead of swapping, open the confirm dialog; on confirm call `moveTool.onPlaceExpression({ location: moveTarget.location })` (no `linkIndex` → `handlePlaceExpression` replaces the whole expression). The `handlePlaceExpression` `linkIndex === undefined` branch already does `setScriptExpression(next, target.location, shelfExpression)` on the derived AST — exactly a swap. Need a way to surface the confirm dialog from inside `Canvas`/`Swapable`: either lift a callback into `MoveToolControls` (e.g. `onRequestSwap(target)`) that `ScriptEditorDialog` implements by opening the confirm dialog, or manage confirm state in `ScriptEditorDialog` and pass an `onPlaceExpression` that itself opens the confirm. Prefer keeping confirm state in `ScriptEditorDialog` (where the dialog is rendered) and have `Swapable` call `moveTool.onPlaceExpression` only after confirm — so expose a `requestPlaceExpression(target)` on `MoveToolControls` that opens the confirm, vs the direct `onPlaceExpression`. Decide and stay consistent.
- **Task 2 (English labels):** Add a shared `OPERATOR_LABELS: Record<BinaryOperator, string>` (and unary equivalent) — derive from the existing `BOOLEAN_OPERATORS`/`MATH_OPERATORS` arrays in `InsertModal`, or duplicate the map in `Canvas`. Use it in the `AppDropdown` options (`label: OPERATOR_LABELS[operator]`) and in `expressionLabel` for BinaryExpression/UnaryExpression. Keep the `value` as the real operator symbol so `onValueChange` keeps working.
- **Task 3 (`not` wrapping):** In `InsertModal`'s chain-attach section (~704), after the binary operator items, add unary operator items: `[{ label: 'not', operator: 'NOT' }, { label: 'isTruthy', operator: 'ISTRUTHY' }, { label: 'isFalsy', operator: 'ISFALSY' }]` (and optionally unary minus/plus). Each `onSelect` calls `onInsertExpression({ kind: 'UnaryExpression', operator, operand: target.chainExpression ?? NothingLiteral, span }, target)`. Category `'operator'` (or `'boolean'` for `not`). Preview expression: `{ kind: 'UnaryExpression', operator, operand: NothingLiteral, span }`. These wrap the chain just like binary operators do.
- **Do not break clone mode** — clone keeps originals in place; swap-as-place should still work (it places a copy, leaving originals on the shelf).
- **Keep the existing toast/keyboard-shortcut/key-cap-tooltip work intact.**
- **Do not run verification.**

## Key files

- `app/script/editor/ScriptEditorDialog.tsx` — move session state, `handlePlaceExpression` (~797), `handleEnterPlacePhase`/`handleBackToCollect`, `moveToolControls` (~840), confirm dialog state (~537)
- `app/script/editor/Canvas.tsx` — `Swapable` onClick (~354), `PuzzleConnector` (~376), `BooleanSocket` (~592), `BinaryExpression` render (~889, dropdown ~912), `UnaryExpression` render (~959), `expressionLabel` (~825), `BOOLEAN_OPERATORS`/`MATH_OPERATORS` (~64)
- `app/script/editor/InsertModal.tsx` — `BOOLEAN_OPERATORS` (~381), `MATH_OPERATORS` (~392), chain-attach item building (~622-704)
- `app/script/lang/ast.ts` — `UnaryExpression` (~146), `BinaryOperator` (~152), `BinaryExpression` (~167)
- `app/script/lang/parser.ts` (~458-482), `printer.ts` (~94-103), `types.ts` (~45)
- `app/components/ui/dialog/UnsavedChangesDialog.tsx` — reusable confirm dialog
