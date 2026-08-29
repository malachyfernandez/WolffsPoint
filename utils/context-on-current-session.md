# Context: Horizontal Scroll Bug for BinaryExpression in Script Editor

## The Task

Fix a bug where horizontal scrolling breaks when a BinaryExpression (e.g. `==`, `+`, `-`, `AND`, etc.) is the outermost expression in a statement argument slot. Without the BinaryExpression (just a chain like `players.entry("X").entry("")`), horizontal scrolling works fine. Adding any binary operator (`==`, `+`, etc.) as the outer expression makes it unscrollable.

## The Bug

### What works (chain only, no binary operator)

When an expression is a plain chain (e.g. `dataDaysToday(players, 0, ...).entry("Infected").entry("")`), the rendered DOM is:

```
<div class="flex-row items-start gap-2">  <!-- ArgRow -->
  <div>Value</div>  <!-- label -->
  <div class="r-overflowX-lltvgl ...">  <!-- ScrollView horizontal, OUTERMOST -->
    <div style="flex-grow: 1">
      <div class="flex-row items-center gap-0 rounded-lg bg-black/5">  <!-- chain Row -->
        ...chain links...
      </div>
    </div>
  </div>
</div>
```

The `ScrollView` is the outermost element wrapping the chain content. No `Swapable` wrapper. This scrolls correctly.

### What's broken (BinaryExpression as outer expression)

When the expression has a binary operator (e.g. `chain == nothing`), the rendered DOM is:

```
<div class="flex-row items-start gap-2">  <!-- ArgRow -->
  <div>Value</div>  <!-- label -->
  <div data-swapable class="... overflow-hidden ...">  <!-- Swapable, has overflow-hidden! -->
    <div class="relative">
      <div class="r-overflowX-lltvgl ...">  <!-- ScrollView horizontal, INSIDE Swapable -->
        <div style="flex-grow: 1">
          <div class="flex-row items-center gap-1">  <!-- BinaryExpression Row -->
            ...left operand (chain)...
            ...operator dropdown...
            ...right operand...
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

The `ScrollView` is **inside** the `Swapable`, which has `overflow-hidden`. This prevents horizontal scrolling from working.

### Root cause

The `Swapable` component (Canvas.tsx ~line 173) has `overflow-hidden` in its className for all variants (piece, block, statement). This is needed to clip the paper texture and hover overlay to rounded corners.

For chain expressions, when `isOuterExpression` is true, the code at Canvas.tsx ~line 1055 wraps the chain in `<ScrollView horizontal>` **without** a Swapable wrapper — the ScrollView is outermost.

For BinaryExpressions, the code at Canvas.tsx ~line 680 returns a `<Swapable>` wrapping the content. A previous fix added `<ScrollView horizontal>` **inside** the Swapable. This is wrong — the `overflow-hidden` on the Swapable constrains/clips the ScrollView.

### What was tried (wrong approach)

Added `<ScrollView horizontal>` inside the `<Swapable>` for BinaryExpression when `isOuterExpression` is true:

```tsx
// WRONG - ScrollView inside Swapable, overflow-hidden clips it
<Swapable>
  {isOuterExpression ? (
    <ScrollView horizontal>{binaryContent}</ScrollView>
  ) : (
    binaryContent
  )}
</Swapable>
```

This does not work because the Swapable's `overflow-hidden` prevents the ScrollView from expanding/scrolling.

### Likely correct approach

Move the ScrollView **outside** the Swapable, matching how chains do it:

```tsx
// Correct - ScrollView outside Swapable
return isOuterExpression ? (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
    <Swapable label={expressionLabel} variant="block" onSwap={...}>
      {binaryContent}
    </Swapable>
  </ScrollView>
) : (
  <Swapable label={expressionLabel} variant="block" onSwap={...}>
    {binaryContent}
  </Swapable>
);
```

The same pattern should likely be applied to UnaryExpression too (Canvas.tsx ~line 746), which has the same structure (Swapable wrapping a Row with inner ExpressionSockets).

## Codebase Structure

### Key files

- **`app/script/editor/Canvas.tsx`** — Main rendering component for the script editor
  - `Swapable` component (~line 173): Wraps expression/statement blocks with border, paper texture, hover overlay. Has `overflow-hidden` on all variants.
  - `ExpressionSocket` component (~line 600): Renders an expression. Has `isOuterExpression` prop (default true). When false, inner expressions don't get ScrollView wrappers.
  - Chain rendering (~line 920): `ChainContent` is a `<Row>` with chain links. At ~line 1055, if `isOuterExpression`, wraps in `<ScrollView horizontal>` with no Swapable.
  - BinaryExpression rendering (~line 680): Returns `<Swapable>` wrapping a `<Row>` with left ExpressionSocket, operator AppDropdown, right ExpressionSocket. Currently has a broken ScrollView-inside-Swapable fix.
  - UnaryExpression rendering (~line 746): Similar structure to BinaryExpression — `<Swapable>` wrapping a `<Row>` with operator text and operand ExpressionSocket. No ScrollView at all currently.
  - `BlockPreview` component (~line 2241): Renders a non-interactive preview of a statement/expression for use in InsertModal. Uses `pointerEvents="none"` and no-op callbacks.

- **`app/script/editor/InsertModal.tsx`** — The insert block picker modal
  - `ModalItem` interface (~line 377): Has `previewStatement?` and `previewExpression?` fields for rendering visual previews.
  - `ModalItemRow` component (~line 423): Renders each item. If preview AST node exists, renders `<BlockPreview>` instead of text label, with description below.
  - All items in the useMemo (~line 530+) now have `previewStatement` or `previewExpression` fields.
  - Function items (custom, built-in, saved) use `previewStatement: createFunctionStatement('fn', [])` — a plain empty function block.
  - Chain insert/swap binary operator previews use `{ kind: 'NothingLiteral' }` for left side (not `target.chainExpression`) so the preview doesn't show existing context.

- **`app/script/editor/editorReducer.ts`** — AST creation helpers
  - `createFunctionStatement(name, parameters, body?)` (~line 547): Creates a FunctionStatement AST node. Requires name and parameters arguments.

### Key concepts

- **`isOuterExpression`**: A prop on `ExpressionSocket`. When true (default), the expression is at the top level of a slot and gets a horizontal ScrollView wrapper for chains. When false (inner expressions like binary left/right), no ScrollView.
- **`Swapable`**: Visual wrapper with border, paper texture, hover overlay. Has `overflow-hidden` to clip decorative layers. Variants: `piece` (small), `block` (medium), `statement` (large), `bare` (no styling).
- **Chain**: A sequence of method calls like `players.filter(...).first`. Decomposed into links by `decomposeChain()`. Each link is a Swapable piece connected by PuzzleConnector buttons.
- **BinaryExpression**: An expression like `left + right` or `left == right`. Rendered as a Row with left ExpressionSocket, operator dropdown, right ExpressionSocket.
- **`overflow-hidden` on Swapable**: Needed to clip the PaperTexture and HoverOverlay absolute-positioned layers to the rounded border. This is what prevents ScrollView-inside-Swapable from working.

### The `overflow-hidden` constraint

The Swapable uses `overflow-hidden` to clip decorative layers (PaperTexture, HoverOverlay) to rounded corners. This means any ScrollView placed inside a Swapable will be clipped and won't scroll properly. The solution is to place the ScrollView outside the Swapable, so the Swapable's `overflow-hidden` only clips its own decorative layers, not the scroll container.

## Current state of the code

The BinaryExpression rendering (Canvas.tsx ~line 680) currently has a broken fix where `<ScrollView horizontal>` is placed inside `<Swapable>`. This needs to be changed to place the ScrollView outside the Swapable.

The UnaryExpression rendering (Canvas.tsx ~line 746) has no ScrollView at all and likely needs the same fix.

The chain rendering (Canvas.tsx ~line 1055) is the reference implementation — ScrollView outside, no Swapable for outer expressions.

## Other completed work (context, don't touch)

- BlockPreview component added to Canvas.tsx for InsertModal previews
- All InsertModal items now have preview AST nodes
- Function previews show plain empty function (`createFunctionStatement('fn', [])`)
- Chain insert/swap binary operator previews use NothingLiteral (not existing context)
- Saved functions persist via Convex `useValue('savedFunctions')` in `useSavedFunctions.ts`
- `savedFunctions` config added to `utils/dataConfig.ts`
