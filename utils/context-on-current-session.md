# Context: Comment Button on Statement Blocks in Script Editor

## The Task

Add a comment button to the top-left corner of every "outer" statement block (not expressions) in the script editor's block-based visual editor. The button is a small circle with a comment bubble icon (`MessageCircle` from lucide). When pressed, it creates an editable comment block that appears above the statement with a thin connecting line. The comment is typed into a text input. Comments are persisted in the script source as `// comment text` lines above the statement.

## What's Been Implemented (all code is written and committed)

The full implementation is done across 7 files. Lint and typecheck pass. The parser/printer round-trip has been verified. **However, the comment circle button is not appearing in the rendered UI** — this is the current bug to fix.

### The Bug

The user reports the comment circle button is not visible. Inspecting the rendered HTML, the `data-swapable` div appears as the outermost element of each statement block with no wrapper View or comment button Pressable around it. This means either:

1. **The dev server needs a restart** (hot reload may not have picked up the structural changes to `StatementBlock`'s return)
2. **`onSetComment` is falsy** — the comment button is conditionally rendered with `{onSetComment && (...)}`. If the prop isn't reaching `StatementBlock`, the button won't render. But the wrapper `<View className="relative">` should still appear even without the button, and it's also missing from the HTML.
3. **The code isn't being executed at all** — the HTML structure matches the OLD code (where `Swapable` was the direct return with `indent={stmtPath!.length * 12}`), not the new code (which wraps in `<View style={{marginLeft:...}}>` → `<View className="relative">` → Pressable + Swapable).

**Most likely cause**: The app needs a full restart/rebuild, not just hot reload. The structural change to `StatementBlock`'s return value (from returning `<Swapable>` directly to returning a wrapper `<View>`) is the kind of change that hot reload sometimes fails to apply.

**First thing to try**: Restart the dev server and check if the button appears. If it still doesn't, add a `console.log` in `StatementBlock` to verify the new code is executing.

## Architecture & How Comments Work

### Data Model
Comments are stored as an optional `comment?: string` field on `NodeBase` (the base interface for all AST nodes) in `app/script/lang/ast.ts`. This is the safest approach — no new statement types, no structural AST changes, just an optional string field on every node.

### Text Format
Comments are saved as `// comment text` lines above the statement in the script source code. Example:
```
// This is a comment
If (true) {
  // Inner comment
  Return;
}
```

### Pipeline (7 files)

1. **`app/script/lang/ast.ts`** — Added `comment?: string` to `NodeBase` interface (line ~20). All statement and expression nodes inherit this.

2. **`app/script/lang/tokens.ts`** — Added `Comment` to `TokenKind` union (line ~12). The tokenizer now emits `Comment` tokens for `//` comments instead of skipping them (lines ~79-89). The token's `value` field holds the trimmed comment text.

3. **`app/script/lang/parser.ts`** — Added `collectComments()` method (lines ~71-78) that skips `Comment` tokens and returns their concatenated text. `parseStatement()` (line ~86) calls `collectComments()` first, then attaches the result to the parsed statement via `stmt.comment = comment` (line ~132). `parseBlockAfterOpen` and `parseRequiredBlock` were updated to handle `null` returns from `parseStatement` (since trailing comments with no statement after them return `null`).

4. **`app/script/lang/printer.ts`** — `printStatement()` (line ~143) now builds a `commentStr` from `statement.comment` (splitting on newlines, prefixing each line with `// `), and prepends it to every statement type's output. Multi-line comments are supported.

5. **`app/script/editor/editorReducer.ts`** — Added `SET_COMMENT` action type (line ~76): `{ type: 'SET_COMMENT'; path: number[]; comment: string }`. The handler (lines ~893-907) uses `getStatementAtPath` and `replaceStatementAtPath` to set/unset the comment field. Setting an empty string clears the comment (`comment: action.comment || undefined`). Supports undo/redo via the standard `past`/`future` snapshot pattern.

6. **`app/script/editor/Canvas.tsx`** — The main UI changes:
   - Added `onSetComment?: (path: number[], comment: string) => void` to `CanvasProps` (line ~108)
   - Added `MessageCircle` to lucide imports (line 3)
   - `Canvas` component destructures and passes `onSetComment` to `StatementBlock` (line ~2490)
   - `StatementBlock` (line ~1696) now has `onSetComment` in its props
   - `StatementBlock` return (lines ~2300-2350) was changed from returning `<Swapable>` directly to a wrapper structure:
     ```jsx
     <View style={{ marginLeft: stmtPath!.length * 12 }}>
       {showCommentBlock && <comment block with text input>}
       {showCommentBlock && <connecting line>}
       <View className="relative">
         {onSetComment && <Pressable comment button with MessageCircle icon>}
         <Swapable indent={0}>
           {content}
         </Swapable>
       </View>
     </View>
     ```
   - The comment button: `absolute -left-2 -top-2 z-20 h-5 w-5 rounded-full`, shows `MessageCircle` size 10. Background is `bg-text/10` normally, `bg-text/20` if a comment exists.
   - The comment block: appears above the statement, has `bg-text/5 border-subtle-border rounded-lg border p-2`, contains a `FontTextInput` (multiline) when editing or a `FontText` when displaying.
   - The connecting line: `marginLeft: 14, width: 2, height: 8, backgroundColor: 'rgb(0,0,0,0.15)'`
   - `useState` manages `isEditingComment` and `commentDraft`
   - `handleCommentSave` calls `onSetComment?.(currentPath, commentDraft.trim())` on blur
   - All 6 recursive `<Canvas>` spread props inside If/ForEach/Function/UpdateCell/OnTagAdded/OnTagRemoved bodies were updated to include `onSetComment`
   - `BlockPreview` (line ~2395) does NOT pass `onSetComment` (previews are non-interactive)

7. **`app/script/editor/ScriptEditorDialog.tsx`** — Added `handleSetComment` handler (lines ~513-515):
   ```ts
   const handleSetComment = (path: number[], comment: string) => {
     dispatchWithUndo({ type: 'SET_COMMENT', path, comment }, comment ? 'Add comment' : 'Remove comment');
   };
   ```
   Passed to `<Canvas>` as `onSetComment={handleSetComment}` (line ~693).

## Key Concepts

- **StatementBlock**: The React component in `Canvas.tsx` that renders each top-level statement (If, ForEach, Function, CreateMarkdown, UpdateCell, etc.) as a visual block. It wraps content in a `Swapable` component.
- **Swapable**: A wrapper component that makes blocks clickable to swap/replace. Has `data-swapable` attribute. Handles hover states and paper texture.
- **ExpressionSocket**: Renders expression slots within statements (arguments, conditions, etc.). These are NOT statement blocks — comments only apply to statements, not expressions.
- **stmtPath**: Array of indices representing the path to a statement in the AST tree (e.g., `[0]` = first top-level statement, `[0, 1]` = second statement inside the first statement's body).
- **dispatchWithUndo**: Wrapper in `ScriptEditorDialog.tsx` that dispatches a reducer action and records an undo snapshot with a description string.
- **BlockPreview**: A non-interactive version of StatementBlock/ExpressionSocket used in InsertModal previews. Does not have comment support (intentionally).

## Verification Done

- `npx eslint` on all 7 files: 0 errors (1 pre-existing error in Canvas.tsx line 870 about useMemo conditional call — unrelated)
- `npx tsc --noEmit`: 0 errors in script/ files (pre-existing errors in other files unrelated)
- Parser/printer round-trip verified: `// comment\nIf (true) { Return; }` parses with `comment` field set, prints back identically, re-parses correctly
- Multi-line comments and nested comments inside blocks verified

## What Hasn't Been Verified

- **The UI actually rendering the comment button** — this is the current blocker. The code is written but the button doesn't appear in the browser.
- **Clicking the button and typing a comment** — can't test until the button appears
- **The comment persisting through text mode toggle** (blocks → text → blocks) — should work since comments are in the AST and printer, but not yet tested end-to-end
