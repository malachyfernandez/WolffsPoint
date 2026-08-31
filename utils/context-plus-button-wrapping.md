# Context: Plus Button After Binary/Unary Expressions for Wrapping

## Task

Add a "+" (PuzzleConnector) button at the end of `BinaryExpression` and `UnaryExpression` blocks in the block-based script editor GUI. This plus button should open the InsertModal showing the same items that `chainInsert` shows — i.e., wrapping operators (`==`, `>`, `+`, `-`, `*`, `/`, `%`, `!=`, `<`, `>=`, `<=`, `AND`, `OR`, `NOT`, `isTruthy`, `isFalsy`) and method blocks (`.toPowerOf`, `.floor`, etc.) that can wrap the entire expression.

### Current behavior

- **Chain expressions** (e.g., `players.Filter(...).first()`) already have a `PuzzleConnector` plus button after each link in the chain (Canvas.tsx line ~1413-1431). Clicking it opens the InsertModal with `kind: 'chainInsert'`, which shows method blocks + wrapping binary/unary operators.
- **BinaryExpression** (e.g., `a == b`, `x + y`) renders as a `Swapable` block with left/operator/right sub-sockets (Canvas.tsx line ~931-998). There is **no plus button** after it.
- **UnaryExpression** (e.g., `NOT x`, `isTruthy(x)`) renders similarly (Canvas.tsx line ~1001-1054). There is **no plus button** after it.

### Desired behavior

1. **BinaryExpression and UnaryExpression should have a plus button after them** that opens the InsertModal in a wrapping mode — the same items shown for `chainInsert`, where the entire current expression becomes the left operand (for binary) or the operand (for unary) of the new wrapping expression.

2. **The wrapping items should include:**
   - All `MATH_OPERATORS` (`+`, `-`, `*`, `/`, `%`) — these wrap the current expression as the left operand
   - All `BOOLEAN_OPERATORS` (`==`, `!=`, `>`, `<`, `>=`, `<=`, `AND`, `OR`) — these wrap the current expression as the left operand
   - All `CHAIN_WRAPPING_UNARY_OPERATORS` (`NOT`, `isTruthy`, `isFalsy`) — these wrap the current expression as the operand
   - Method blocks (`.toPowerOf`, `.floor`, etc.) — these wrap the current expression as the receiver of a method call

3. **Method blocks should be allowed** because binary/unary expressions can produce numbers (e.g., `(a + b).toPowerOf(2)`) or booleans (e.g., `(a == b)` could be used with `.contains()` on a list, though rare). The type inference system should handle compatibility — if the receiver type doesn't match, the item is disabled with a reason.

4. **`.BLANK` (property access) should NOT be offered** as a wrapping option. The user explicitly does not want property access as a wrapping option. (Double-check: property access like `.length` is actually a method block in `EXPRESSION_BLOCKS`, so it would be included in the method blocks list. The user wants to exclude plain property access. Look at how `EXPRESSION_BLOCKS` distinguishes methods from properties — methods have arguments, properties don't. The `chainInsert` path shows all `EXPRESSION_BLOCKS` as method expressions via `buildMethodExpression`. If property-only blocks exist, they should be filtered out.)

5. **Runtime coercion already works**: `==`, `>`, `+`, `-`, etc. all produce values that can be used as numbers. Specifically:
   - Boolean `true`/`false` coerce to `1`/`0` via `toNumber()` in `values.ts` (line 151)
   - Comparison results (`==`, `>`, etc.) are JavaScript booleans, which coerce to `1`/`0` when used in math
   - So `(a == b) + 1` works at runtime: if `a == b` is `true`, it becomes `1 + 1 = 2`
   - This is already implemented and verified — no runtime changes needed

## Key Terminology

- **Chain**: A sequence of method calls / property accesses on a base expression, e.g., `players.Filter(...).first().entry("name")`. Decomposed by `decomposeChain()` into `ChainLink[]` (base + methods/properties).
- **ChainLink**: `{ type: 'base', expr } | { type: 'method', name, args } | { type: 'property', name }`. Defined in `expressionEditor.ts` line 35-38.
- **PuzzleConnector**: The plus button component that appears after chain links. Renders a `+` icon and calls `onAdd` with a chain insert target. Located in Canvas.tsx (search for `PuzzleConnector`).
- **chainInsert target**: An `InsertTarget` with `kind: 'chainInsert'`, carrying the `chainExpression` (the current chain up to the insertion point) so the InsertModal can infer the receiver type and show compatible blocks.
- **Wrapping**: When you pick a binary operator from the chainInsert modal, it wraps the current expression as the left operand: `currentExpr OP newRight`. For unary operators: `OP currentExpr`. For methods: `currentExpr.method(args)`.
- **BinaryExpression**: AST node `{ kind: 'BinaryExpression', operator, left, right }`. Operators: `+`, `-`, `*`, `/`, `%`, `==`, `!=`, `>`, `<`, `>=`, `<=`, `AND`, `OR`.
- **UnaryExpression**: AST node `{ kind: 'UnaryExpression', operator, operand }`. Operators: `NOT`, `ISTRUTHY`, `ISFALSY`, `-` (negate).
- **Swapable**: A wrapper component that makes an expression block swappable (click to replace the whole thing). Binary/Unary expressions are wrapped in `Swapable` with `variant="block"`.

## Where Things Sit

### Chain plus button (the pattern to replicate)

**`app/components/game/.../Canvas.tsx`** — actually `app/script/editor/Canvas.tsx`:

Line 1413-1431 — the `PuzzleConnector` after each chain link:
```tsx
{!preview && (
  <PuzzleConnector
    direction="horizontal"
    type={nextDefinition?.appliesTo === 'list' ? 'list' : expectedType}
    tooltip="Add to chain"
    placeTarget={{ kind: 'expression', location, linkIndex: index + 1 }}
    onPress={() =>
      onAdd({
        kind: 'chainInsert',
        location,
        linkIndex: index + 1,
        contextVariables,
        variableSources: entrySourceMap,
        inputSources,
        chainExpression: recomposeChain(chain.slice(0, index + 1)),
      })
    }
  />
)}
```

### BinaryExpression rendering (where to add the button)

**`app/script/editor/Canvas.tsx`** line 931-998:
```tsx
if (expression.kind === 'BinaryExpression') {
  const operandType = ['AND', 'OR'].includes(expression.operator) ? 'boolean' : 'expression';
  const operatorSet = isMathOperator(expression.operator) ? MATH_OPERATORS : BOOLEAN_OPERATORS;
  const binaryContent = (
    <Row className="items-center gap-1" style={{ borderRadius: ... }}>
      <ExpressionSocket ... expression={expression.left} ... />
      <AppDropdown ... operator selector ... />
      <ExpressionSocket ... expression={expression.right} ... />
    </Row>
  );
  const binarySwapable = (
    <Swapable label={expressionLabel} moveTarget={...} variant="block" onSwap={...}>
      {binaryContent}
    </Swapable>
  );
  return isOuterExpression ? (
    <ScrollView horizontal ...>{binarySwapable}</ScrollView>
  ) : (
    binarySwapable
  );
}
```

The plus button should go **after** `binaryContent` but **inside** the `Swapable` (or inside the `Row` wrapping the `Swapable`). The key is that the plus button should not be part of the swappable content — it should be a sibling so clicking it doesn't trigger a swap.

A clean approach: wrap `binarySwapable` and the `PuzzleConnector` in a `Row`:
```tsx
const withPlusButton = (
  <Row className="items-center">
    {binarySwapable}
    {!preview && (
      <PuzzleConnector
        direction="horizontal"
        type={expectedType}
        tooltip="Wrap expression"
        placeTarget={{ kind: 'expression', location, linkIndex: 0 }}
        onPress={() =>
          onAdd({
            kind: 'chainInsert',
            location,
            linkIndex: 0,
            contextVariables,
            variableSources: entrySourceMap,
            inputSources,
            chainExpression: expression, // the whole binary expression is the "chain"
          })
        }
      />
    )}
  </Row>
);
```

Then return `withPlusButton` (wrapped in `ScrollView` if `isOuterExpression`).

### UnaryExpression rendering (same pattern)

**`app/script/editor/Canvas.tsx`** line 1001-1054:
Same structure as BinaryExpression but with `expression.operand` instead of left/right. Add the same plus button after `unarySwapable`.

### InsertModal chainInsert handling (already supports wrapping)

**`app/script/editor/InsertModal.tsx`** line 662-767:
The `chainInsert` / `chainSwap` target type already shows:
- `chainExpressionItems` — all `EXPRESSION_BLOCKS` as method calls (line 676-687)
- `binaryOperatorItems` — all `MATH_OPERATORS` + `BOOLEAN_OPERATORS` as wrapping binary expressions (line 696-743)
- `unaryOperatorItems` — all `CHAIN_WRAPPING_UNARY_OPERATORS` as wrapping unary expressions (line 744-766)

When a binary/unary operator is selected, `onInsertExpression` is called with a new `BinaryExpression`/`UnaryExpression` that wraps `target.chainExpression` as the left/operand. This already works — no changes needed in InsertModal.

### The `onInsertExpression` flow for wrapping

When `onInsertExpression` is called with a wrapping expression (e.g., `BinaryExpression { left: currentExpr, right: defaultRight }`), it dispatches `SET_EXPRESSION` in the editor reducer, which replaces the expression at the given location with the new wrapping expression. The old expression becomes the left/operand of the new one. This is the same flow used by chain wrapping — no reducer changes needed.

### PuzzleConnector component

Search for `PuzzleConnector` in Canvas.tsx to find its definition. It's a simple pressable that renders a `+` icon. Props: `direction`, `type`, `tooltip`, `placeTarget`, `onPress`.

### Type inference for receiver type

**`app/script/editor/InsertModal.tsx`** line 664-675:
```tsx
const receiverType: ScriptType = target.chainExpression
  ? inferExpressionType(target.chainExpression, entryKeysBySource ?? {}, target.contextVariables ?? [], {
      variableSources: target.variableSources,
      inputSources: target.inputSources,
      definedFunctions,
    })
  : 'any';
```

This infers the type of the current expression so the InsertModal can show which method blocks are compatible. For a `BinaryExpression` with `+`, the inferred type is `number`. For `==`, it's `boolean`. This already works — passing the binary/unary expression as `chainExpression` will trigger the right type inference.

### Runtime coercion (already works, no changes needed)

**`app/script/runtime/values.ts`**:
- `toNumber()` (line 149-162): `true → 1`, `false → 0`, `"true" → 1`, `"3" → 3`
- `runtimeEquals()` (line 164-206): Scratch-style primitive coercion
- `isTruthy()` (line 208+): type-aware truthiness

**`app/script/runtime/interpreter.ts`**:
- Binary operators use `toNumber()` for arithmetic (line ~804+)
- Comparison operators try numeric first, fall back to string (line ~792+)
- `==`/`!=` use `runtimeEquals()` with coercion

So `(a == b) + 1` works: `a == b` returns `true` (JS boolean), `toNumber(true) = 1`, `1 + 1 = 2`. Verified in previous session.

## Implementation Plan

1. **Refactor the BinaryExpression return** (Canvas.tsx ~line 980-998):
   - Instead of returning `binarySwapable` directly, wrap it with a `PuzzleConnector` in a `Row`
   - The `PuzzleConnector`'s `onPress` calls `onAdd` with `kind: 'chainInsert'` and `chainExpression: expression` (the full `BinaryExpression`)
   - Pass `contextVariables`, `variableSources: entrySourceMap`, `inputSources` to the target
   - Keep the `isOuterExpression` ScrollView wrapper

2. **Refactor the UnaryExpression return** (Canvas.tsx ~line 1035-1054):
   - Same pattern as BinaryExpression

3. **Filter out property-only blocks** (optional, if the user's "no .BLANK" requirement means property access):
   - In InsertModal's `chainExpressionItems` (line 676-687), check if any `EXPRESSION_BLOCKS` are property-only (no arguments). If so, filter them out or check the block definition.
   - Actually, `EXPRESSION_BLOCKS` are all method-style blocks (they have `buildMethodExpression` which creates a `CallExpression` with `MemberExpression` callee). Property access like `.length` may be a separate block type. Check `registry.ts` for `EXPRESSION_BLOCKS` to see if any are property-only. If the user just means "don't show `.length`-style accessors", that's a filtering question.
   - The user said "definitly not a .BLANK" — this likely means don't show bare property access. The current `chainExpressionItems` already only shows method blocks (with arguments), not bare properties. So this may already be satisfied. Verify by checking `buildMethodExpression` and `EXPRESSION_BLOCKS`.

4. **No runtime changes needed** — coercion already works.

5. **No reducer changes needed** — `SET_EXPRESSION` already handles replacing an expression with a wrapping expression.

6. **No InsertModal changes needed** — the `chainInsert` target type already shows all wrapping operators and method blocks.

## Files to Modify

- `app/script/editor/Canvas.tsx` — Add `PuzzleConnector` after `BinaryExpression` and `UnaryExpression` blocks.

## Files to Read First

- `app/script/editor/Canvas.tsx` — Focus on:
  - `ExpressionSocket` component (line ~819+) — the main expression renderer
  - BinaryExpression rendering (line ~931-998)
  - UnaryExpression rendering (line ~1001-1054)
  - Chain `PuzzleConnector` (line ~1413-1431) — the pattern to replicate
  - `PuzzleConnector` component definition (search for it)
- `app/script/editor/InsertModal.tsx` — Focus on:
  - `chainInsert`/`chainSwap` target handling (line ~662-767) — already shows wrapping operators
  - `MATH_OPERATORS`, `BOOLEAN_OPERATORS`, `CHAIN_WRAPPING_UNARY_OPERATORS` (line ~388-425)
  - `buildMethodExpression` (line ~370-386) — how method blocks are built
- `app/script/editor/expressionEditor.ts` — Focus on:
  - `decomposeChain` / `recomposeChain` (line ~42-79)
  - `ChainLink` type (line ~35-38)
- `app/script/registry.ts` — `EXPRESSION_BLOCKS` array — to verify which blocks are methods vs properties
- `app/script/runtime/values.ts` — `toNumber`, `isTruthy`, `runtimeEquals` — to verify coercion works (already confirmed)

## Constraints

- **GUI-only change**: No runtime, parser, AST, or reducer changes.
- **No `.BLANK` (property access) as wrapping option**: Only method blocks and operators.
- **Method blocks ARE allowed**: `.toPowerOf`, `.floor`, etc. should appear because the expression result is a number/boolean that can have methods called on it.
- **All operators allowed as wrapping**: `==`, `!=`, `>`, `<`, `>=`, `<=`, `AND`, `OR`, `+`, `-`, `*`, `/`, `%`, `NOT`, `isTruthy`, `isFalsy`.
- **Runtime coercion works**: `==`/`>`/`+` etc. produce values that coerce to numbers (true→1, false→0). No runtime changes needed.
- **Follow existing patterns**: Use `PuzzleConnector`, `onAdd` with `kind: 'chainInsert'`, same as chain links.
- **Don't break existing chain behavior**: The chain plus button after method/property links should continue to work unchanged.
- **preview mode**: Don't show the plus button when `preview` is true (same as chain links — `!preview &&` guard).
