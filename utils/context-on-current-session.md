# Context: Fix Markdown Editor TextInput Height Recalculation Causing Cursor Jump

## The Task

The generic `MarkdownEditorDialog` component contains a multiline `TextInput` whose height is dynamically recalculated to fit its content. The current height-recalculation logic causes the **cursor to jump to the bottom** of the text every time the height is re-evaluated (which fires on nearly every keystroke that changes the line count).

### What happened (history)

1. **Originally** the TextInput had no dynamic height — just a CSS `min-h-[50vh]` class. Large loaded text was cut off because the TextInput didn't grow to fit.

2. **Line-count-based height was added** (commit `4a6f0e8a6`): height was computed inline as `Math.max(120, value.split('\n').length * 24 + 32)`. This fixed the cutoff for most cases but was imperfect — line wrapping meant the actual rendered height could exceed the line-count estimate, so some text was still cut off.

3. **"Improved" height calculation was added** (commit `d000cf378`): introduced `onContentSizeChange` to track the actual rendered content height, plus kept the line-count-based `minHeight`, and used `Math.max(minHeight, contentHeight)`. This is the **current code**. It fixed the cutoff problem thoroughly, but **introduced the cursor-jumping bug** — the cursor jumps to the bottom every time the height changes.

### The goal

Keep the thorough whole-document height re-evaluation (so large text loaded into the editor is never cut off), but **stop the cursor from jumping** when the height is recalculated during typing. The height should still grow/shrink correctly, but the recalculation must not disrupt the cursor position or cause a jarring re-layout on every keystroke.

---

## Where Things Sit

### The TextInput with the height logic

**File:** `app/components/game/townSquare/TownSquareComposerEditorPane.tsx` (37 lines total — the entire file is relevant)

This is the component that renders the actual `TextInput` and contains all the height logic. Current code:

```tsx
const TownSquareComposerEditorPane = ({ onBodyChange, onSelectionChange, value }: TownSquareComposerEditorPaneProps) => {
    const [contentHeight, setContentHeight] = useState(0);       // from onContentSizeChange
    const lineCount = value.split('\n').length;                   // recomputed every render
    const minHeight = Math.max(120, lineCount * 24 + 32);        // line-count estimate
    const height = Math.max(minHeight, contentHeight);           // final height

    return (
        <Column className='gap-2 flex-1 grow min-w-0'>
            <TextInput
                multiline={true}
                className='min-w-0 min-h-[50vh] rounded-3xl bg-text/10 overflow-hidden p-4 text-base text-text'
                onChangeText={onBodyChange}
                onContentSizeChange={(event) => setContentHeight(event.nativeEvent.contentSize.height)}
                onSelectionChange={(event) => onSelectionChange(event.nativeEvent.selection)}
                placeholder='Write the thread the way you want it to look.'
                placeholderTextColor='#0004'
                scrollEnabled={false}
                style={{ lineHeight: 24, textAlignVertical: 'top', height }}
                value={value}
            />
        </Column>
    );
};
```

**Why the cursor jumps:** The `height` value changes on nearly every keystroke. There are two sources of change:
- `lineCount` (and thus `minHeight`) changes whenever a newline is added/removed — recomputed synchronously on every render from `value`.
- `contentHeight` changes via `onContentSizeChange`, which fires asynchronously after the native text layout updates. This can fire even when line count doesn't change (e.g., text wrapping changes).

Each time `height` changes, the `style` prop changes, the TextInput re-layouts natively, and the cursor/scroll position resets to the bottom. The double-update (synchronous `minHeight` change + asynchronous `contentHeight` change) makes it worse.

### How this component is used

`TownSquareComposerEditorPane` is used in two places inside the markdown editor:

1. **`EditorPane`** (`app/components/game/markdownEditor/EditorPane.tsx`) — wraps it in a `ShadowScrollView` with the toolbar above it. Used by `SideBySideLayout` (wide screens).

2. **`TabbedLayout`** (`app/components/game/markdownEditor/TabbedLayout.tsx`) — wraps it directly in a `ShadowScrollView` with the toolbar above it. Used by `MainContent` (narrow screens).

Both pass `value={draftBody}`, `onBodyChange={setDraftBody}`, and `onSelectionChange={setSelection}` from the parent `MarkdownEditorDialog`.

### The parent dialog that owns the text state

**File:** `app/components/game/MarkdownEditorDialog.tsx`

Key state (line ~135-140):
```tsx
const [draftBody, setDraftBody] = useState('');
const [selection, setSelection] = useState<SelectionRange>(emptySelection);
```

- `draftBody` is the markdown text being edited. It's set from `initialMarkdown` when the dialog opens (line ~166) and updated via `onBodyChange` (which is `setDraftBody`).
- `selection` tracks the cursor position as `{ start, end }`. It's updated via `onSelectionChange` from the TextInput. It's used by `runBodyUpdate` (line ~254) to insert/wrap text at the cursor for toolbar actions (bold, italic, link, etc.).

The `selection` state is managed here, not inside `TownSquareComposerEditorPane`. The cursor jumping happens at the native TextInput level — the React `selection` state isn't being reset, but the native view's scroll/cursor position is disrupted by the height change.

### The ShadowScrollView wrapper

Both `EditorPane` and `TabbedLayout` wrap the `TownSquareComposerEditorPane` in a `ShadowScrollView` (from `app/components/ui/ShadowScrollView`). The TextInput itself has `scrollEnabled={false}`, so scrolling is handled by the outer `ShadowScrollView`. This means the TextInput grows to full content height and the ScrollView scrolls — the height calculation is what makes the TextInput tall enough to show all content.

### Selection utilities

**File:** `app/components/game/townSquare/townSquareUtils.ts`

- `SelectionRange` type: `{ start: number; end: number }` (line 3)
- `emptySelection`: `{ start: 0, end: 0 }` (line 48)
- `insertAtSelection`, `wrapSelection` — used by toolbar handlers to modify text at the cursor

---

## Key Terminology

- **MarkdownEditorDialog** — The generic markdown editor dialog component (`app/components/game/MarkdownEditorDialog.tsx`). Used for role messages, morning messages, script editor markdown literals, town square posts, etc. It owns the `draftBody` and `selection` state.
- **TownSquareComposerEditorPane** — The actual `TextInput` component (`app/components/game/townSquare/TownSquareComposerEditorPane.tsx`). Despite the "TownSquare" name, it's used by the generic markdown editor. Contains the height logic.
- **contentHeight** — State tracking the actual rendered height of the TextInput content, updated via `onContentSizeChange`. Starts at 0.
- **minHeight** — Line-count-based height estimate: `Math.max(120, lineCount * 24 + 32)`. The `24` is the `lineHeight` and `32` is padding.
- **onContentSizeChange** — React Native TextInput event that fires when the rendered content size changes. Fires asynchronously after native layout.
- **scrollEnabled={false}** — The TextInput doesn't scroll itself; the outer `ShadowScrollView` handles scrolling. The TextInput must be tall enough to show all content.

---

## Constraints & Design Principles

- Follow the app's existing conventions: ConvexDialog, FontText/FontTextInput, lucide icons, Tailwind classes, Column/Row layout components.
- The fix should be localized to `TownSquareComposerEditorPane.tsx` (or minimally touch the parent if needed).
- The height must still grow to fit large loaded text (the cutoff bug must not return).
- The cursor must not jump when typing.
- React Native `TextInput` on both iOS and Android must be considered — the cursor-jump behavior may differ between platforms.
- See `utils/about-parts-of-this-codebase/about-this-codebase.md` for general codebase conventions.
- See `AGENTS.md` for project rules (unsaved-changes confirmation pattern, etc. — though this fix likely doesn't need a new dialog).

---

## Possible Approaches (not prescriptive — pick what works)

1. **Only grow, never shrink during editing:** Track the max content height seen and only update `contentHeight` when it increases. This prevents height "flicker" that might cause cursor jumps. Reset only when the value changes externally (e.g., dialog reopens with new `initialMarkdown`).

2. **Debounce `contentHeight` updates:** Don't update `contentHeight` on every `onContentSizeChange` fire — debounce or throttle it so the height only recalculates after typing settles.

3. **Only use `onContentSizeChange` for initial sizing, then rely on line-count:** Use `contentHeight` only for the initial load (to fix cutoff), then switch to line-count-based height during active editing (which was the pre-d000cf378 behavior that didn't jump).

4. **Preserve scroll/cursor position explicitly:** After a height change, programmatically restore the scroll position or selection. This is fragile but might work.

5. **Avoid changing the `style.height` prop unless the change is significant:** Only update `height` if the new value differs by more than a threshold (e.g., one line height = 24px), reducing unnecessary re-layouts.

---

## Files to Change

- **`app/components/game/townSquare/TownSquareComposerEditorPane.tsx`** — Primary file. The height logic lives here.
- Possibly **`app/components/game/MarkdownEditorDialog.tsx`** — if the fix needs to signal "external value change" vs "user typing" (e.g., passing a `key` or a ref to reset height state on dialog open).

No other files should need changes.
