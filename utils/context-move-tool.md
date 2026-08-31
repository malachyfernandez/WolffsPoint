# Context: Move Tool — Fix Chain-Link Removal Bugs & Simplify Marker Rendering

## What is being asked

The Move/Clone/Place tool in the script editor has bugs and over-complicated rendering logic for showing where moved expressions used to be. Two bugs to fix, plus a requested simplification of the rendering approach. **Do not run verification (tsc/prettier/eslint/browser tests) — just build the changes.**

### Bug 1: Removing chain links in sequence misindexes and fails to remove subsequent links

Repro with this script block:

```
UpdateCell({PLAYERS = Inputs.entry("Select"), COLUMNTYPE = "user", DAY = currentDay, COLUMN = "Column 1"}) {
  Return cellContents.append(tag("Infected"));
}
```

Start a Move session. Click `Inputs` (the base of the chain `Inputs.entry("Select")`), then click `entry("Select")` (the `.entry("Select")` method link).

- Clicking `Inputs` works: it's removed from the expression and a numbered marker appears; the item appears on the shelf at the bottom.
- Clicking `entry("Select")` **after that** is broken: the marker "moves down to the bottom row" but **the `entry("Select")` link is NOT actually removed** from the expression. So the second pick fails to remove the link it should.

Root cause is in the original-index remapping logic (`getOriginalLinkIndex`, `getLinkMarkers`, `getOriginalExpressionLocation`, and `deriveSessionAst`). After the first chain link is removed, the remaining chain reindexes (the link that was at index 1 is now at index 0), and the mapping between "current rendered index" and "original selection linkIndex" breaks, so the second pick either targets the wrong link or no link.

### Bug 2: Removing ALL chain links leaves the empty "plus button" with no number marker

When you remove every link in a chain expression, what's left is a `NothingLiteral` base. That renders as the square "add expression" plus button (the `BooleanSocket` / empty-base placeholder). In that state **no number marker is shown**, even though the whole expression slot has effectively been emptied by the move.

This happens because `getWholeMarker` only matches selections of `kind: 'whole'`. When you remove links one at a time they are `kind: 'chainLink'` selections, and once the chain is fully emptied there is no `whole` selection covering that location, so no marker renders — just the bare plus button.

### Requested simplification: stop doing the fancy contextual plus/marker fill-in

The current rendering tries to be clever: it removes moved links from the AST (`deriveSessionAst`), reindexes the remaining chain, then uses `getOriginalLinkIndex` / `getLinkMarkers` / `getOriginalExpressionLocation` to map the *current* rendered indices back to the *original* selection indices so markers appear at the right spot and picks target the right original link. This contextual remapping is the source of Bug 1 and is more complexity than the feature needs.

**Preferred approach:** For rendering purposes, treat a moved expression/link as if you're **replacing that block with a NEW block that is just a circle labeled "1" or "2"** (the `MoveNumberMarker`). I.e. the marker simply sits in the slot where the expression was, in original-index order, without reindexing the remaining chain or remapping indices. Don't do the contextual "fill in the gap with a plus" logic that doesn't make sense when we're just replacing expressions with numbers.

If implementing this simplification cleanly turns out to be *more* complicated than the current approach, you don't have to do the full rewrite — but you should at minimum fix Bugs 1 and 2 and remove the contextual plus-filling behavior that produces wrong results. The user does **not** want the fancy contextual stuff that "doesn't make sense when we're just replacing expressions with numbers."

## How the move tool works (architecture)

### State (`app/script/editor/ScriptEditorDialog.tsx`)

- **`MoveSelection`** (~line 263): union of:
  - `{ kind: 'whole'; number; location: ExpressionLocation; expression: Expression }` — a whole expression picked up
  - `{ kind: 'chainLink'; number; location; linkIndex: number; link: ChainLink }` — one link of a method chain (base or `.method()`/`.property`)
  - `{ kind: 'block'; number; path: number[]; statement: Statement }` — a whole statement block
- **`MoveSession`** (~line 281): `{ operation: 'move' | 'clone'; phase: 'collect' | 'place'; category: 'expression' | 'block' | null; baseline: Script; selections: MoveSelection[]; nextNumber: number }`
- **`deriveSessionAst(session)`** (~line 329): computes the AST shown in the canvas during a *move* session by removing picked items from `session.baseline`. For expressions: `whole` selections → replace with `NothingLiteral`; `chainLink` selections → drop those links from the chain and recompose (prepends a `NothingLiteral` base if the first remaining link isn't a base). For blocks: deletes the picked statements. **For clone, returns `baseline` unchanged** (nothing removed from the canvas).
- **`composeShelfExpression(selections)`** (~line 388): combines expression selections into one `Expression | null` for placing. Returns `null` when fragments are incompatible (e.g. two concrete bases).
- **`moveToolControls`** (~line 837): builds the `MoveToolControls` object passed to `Canvas` via context. This is where the buggy remapping lives:
  - `getOriginalExpressionLocation(location)` (~855): walks the expression path and, for each `chainArgument` step, adds back the count of removed links at or before that index — mapping a *current* (post-removal) location back to its *original* location.
  - `getOriginalLinkIndex(location, currentIndex)` (~897): maps a current chain link index back to its original index by adding back removed link indexes ≤ it.
  - `getLinkMarkers(location, currentBoundary)` (~906): returns the marker numbers to render *before* the link at `currentBoundary` — filtering chainLink selections whose original index maps to that boundary.
  - `getWholeMarker(location)` (~925): returns the marker number for a `whole` selection at that (original) location.
  - `getOriginalStatementPath` / `getBlockMarkers`: the block equivalents.
- Handlers: `startMoveSession` (~637), `cancelMoveSession` (~652), `handlePickExpression` (~664), `handlePickBlock` (~697), `handleReturnSelection` (~720), `handlePlaceExpression` / `handlePlaceBlock`.

### Rendering (`app/script/editor/Canvas.tsx`)

- **`MoveToolControls`** interface (~line 125): the contract above.
- **`MoveToolContext`** (~line 143): React context providing `MoveToolControls` to all swapable elements.
- **`MoveNumberMarker`** (~line 211): the numbered circle shown where a moved item was. `onPointerDown`/`onPress` calls `moveTool.onReturn(number)` to return it to the shelf. This is the "circle labeled 1/2" the user wants to use as the replacement rendering.
- **`Swapable`** (~line 250): wraps every expression/block. `onPointerDown` (~326) handles move picking (calls `onPickExpression`/`onPickBlock` with the *resolved* move target, whose location is passed through `getOriginalExpressionLocation`). `onClick` (~363) handles normal swap when no move session.
- **`ExpressionSocket`** (~line 802): the whole-expression renderer. At ~806 it checks `getWholeMarker(location)`:
  - if `move` → returns just `<MoveNumberMarker>` (replaces the whole expression with the circle)
  - if `clone` → renders the marker **plus** the original expression side by side (clone keeps the original).
- **Chain rendering** (~line 1258-1402): iterates `decomposeChain(expression)` links. Before each link at `index` it renders `getLinkMarkers(location, index)` markers (~1260). Each link's `moveTarget.linkIndex` is set to `getOriginalLinkIndex(location, index) ?? index` (~1279, 1293, 1317, 1331). After the last link it renders `getLinkMarkers(location, chain.length)` markers (~1400). The empty `NothingLiteral` base renders as the square plus button (`BooleanSocket` / "Add expression") at ~1264-1272 — this is what shows with no marker in Bug 2.
- **Block markers** (~line 2846-2901): `getBlockMarkers` rendered between/around statement blocks, same pattern.

### The chain data model (`app/script/editor/expressionEditor.ts`)

- `decomposeChain(expression): ChainLink[]` — splits a chained expression into `[base, .method(), .property, ...]` links. Index 0 is the base.
- `recomposeChain(links): Expression` — joins links back into an expression.
- `ChainLink` type: `{ type: 'base'; expr: Expression } | { type: 'method' | 'property'; name: string; args?: ... }`.
- `ExpressionLocation`: `{ statementPath: number[]; slot: ...; expressionPath: ExpressionPathStep[] }`. `expressionPath` steps include `{ kind: 'chainArgument'; linkIndex: number }` for descending into a chain link.

## What to change

The core idea of the simplification: **don't reindex the chain and don't remap indices.** Keep the original chain intact in the rendered AST (or at least keep original indices stable), and render a `MoveNumberMarker` in the slot of each picked link in original-index order. Picking should target the original link index directly.

Concretely, the likely changes:

1. **`deriveSessionAst`** (~line 329): for `chainLink` selections, instead of removing the link and recomposing (which reindexes the remaining links), either (a) keep the link in place but mark it as moved so the renderer swaps it for a marker, or (b) replace the moved link with a sentinel that renders as a marker. The goal is that original link indices stay stable so `getOriginalLinkIndex`/`getOriginalExpressionLocation` become identity (or unnecessary). For `whole` selections, replacing with `NothingLiteral` is fine (that already renders a marker via `getWholeMarker`).

2. **`moveToolControls` remapping** (~line 855-931): with stable indices, `getOriginalLinkIndex` and `getOriginalExpressionLocation` can return their input unchanged (or be removed), and `getLinkMarkers` simplifies to "return the numbers of chainLink selections at this location whose `linkIndex === currentBoundary`" without the removed-count arithmetic. `getWholeMarker` stays as-is.

3. **Chain rendering** (~line 1258-1402): render a `MoveNumberMarker` in place of a picked link (when `getLinkMarkers` returns a number for that index, or check a direct "is this linkIndex picked" predicate) **instead of** rendering the link plus a marker before it. For the fully-emptied chain (Bug 2), ensure a marker still renders — e.g. when all links are picked, show the marker rather than the bare `NothingLiteral` plus button. The `BooleanSocket` empty-base plus (~1264) should not appear without a marker when the base was moved.

4. **`Swapable` move target** (~line 270-276, 326-338): since indices are now stable, `resolvedMoveTarget` no longer needs `getOriginalExpressionLocation` remapping — pass the location through directly.

If a clean simplification isn't feasible, at minimum: fix Bug 1 (second chain-link pick must remove the correct link) and Bug 2 (fully-emptied chain shows a marker, not a bare plus), and remove the contextual plus-filling that produces wrong markers.

## Constraints

- **Do not run verification.** No `npx tsc --noEmit`, no prettier, no eslint, no Puppeteer browser tests. Just make the changes.
- Keep the existing toast/keyboard-shortcut/key-cap-tooltip work from the previous session intact — those are done and unrelated to this task.
- `MoveNumberMarker` is the desired "circle labeled 1/2" rendering — reuse it, don't reinvent it.
- Clone mode (`operation === 'clone'`) keeps the original expression in place and shows the marker alongside it (see `ExpressionSocket` ~807-830). Don't break clone; the simplification mainly concerns move mode where items are removed.
- The shelf at the bottom (the row of picked `ShelfItem`s) and Place phase are unaffected by this task — only the in-canvas marker rendering and pick targeting during collect phase.

## Key files

- `app/script/editor/ScriptEditorDialog.tsx` — `deriveSessionAst` (~329), `moveToolControls` (~837-961), pick/return handlers
- `app/script/editor/Canvas.tsx` — `MoveNumberMarker` (~211), `Swapable` (~250), `ExpressionSocket` wholeMarker (~802-831), chain rendering (~1258-1402), block markers (~2846-2901)
- `app/script/editor/expressionEditor.ts` — `decomposeChain` / `recomposeChain` / `ChainLink` / `ExpressionLocation`
