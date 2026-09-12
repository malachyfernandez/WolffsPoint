# Context: Read-only preview improvements for Markdown Editor history preview

## Task

When previewing a historical version of a markdown document in the `ViewOnlyPreviewModal`, the `MainContent` component is rendered with `readOnly` and `activeTab="preview"`. There are three problems to fix:

### 1. Toast on typing in read-only editor

When the user is on the **editing tab** of a read-only preview and tries to type, nothing happens (the textarea is `editable={false}`). Instead, a toast should appear at the bottom of the screen saying "Preview only" (or similar). Use the existing toast system:

- `contexts/ToastContext.tsx` exports `useToast()` which provides `showToast(message: string)`.
- The `ToastProvider` is mounted in `app/_layout.tsx`.
- Example usage: `const { showToast } = useToast(); showToast("Preview only");`
- The toast auto-hides after 3 seconds.
- Reference doc: `utils/about-parts-of-this-codebase/how-to-undo.md` (mentions toast integration with undo system, but the toast itself is simple `showToast`).

The read-only editor pane is `TownSquareComposerEditorPane` at `app/components/game/townSquare/TownSquareComposerEditorPane.tsx`. It receives `readOnly` prop and sets `editable={!readOnly}` on the `TextInput`/`FontTextInput`. When `readOnly`, `onChangeText` is set to `undefined`. To intercept typing attempts, you need to capture key presses even when `editable={false}` — this may require keeping `editable` true but intercepting `onChangeText` to show the toast instead of actually changing the text, OR adding a `onKeyPress` handler that fires the toast. On web, the underlying element is a `<textarea>` with `disabled` or `readOnly` attribute; you may need a different approach (e.g., wrapping with a keydown listener).

### 2. Allow tab switching in read-only preview

Currently when `readOnly` is true, the `TabSelector` and `TabbedLayout` both pass `onValueChange={readOnly ? () => {} : onTabChange}`. This **disables tab switching entirely**. The user should be able to switch between "Editing" and "Preview" tabs even in read-only mode — they just can't edit the content.

Files to fix:
- `app/components/game/markdownEditor/TabSelector.tsx` — line 11: `onValueChange={onValueChange}` (already passes through, but `MainContent` passes `readOnly ? () => {} : onTabChange` at line 84).
- `app/components/game/markdownEditor/MainContent.tsx` — line 84: `<TabSelector value={activeTab} onValueChange={readOnly ? () => {} : onTabChange} />` — should just pass `onTabChange` always.
- `app/components/game/markdownEditor/TabbedLayout.tsx` — line 65: `<Tabs value={activeTab} onValueChange={readOnly ? () => {} : onTabChange} ...>` — should just pass `onTabChange` always.

The `ViewOnlyPreviewModal` in `MarkdownEditorDialog.tsx` (lines 655-681) currently hardcodes `activeTab="preview"` and `onTabChange={() => {}}`. This needs to be changed to use a local state for `activeTab` so the user can switch tabs. The `onTabChange` callback should be a real setter.

### 3. Open script editor in read-only mode from preview

When the user moves their cursor into a `/*script ... script*/` block in the editing tab of the read-only preview, the "Edit Code" button should appear (currently it's hidden when `readOnly` via `cursorScriptBlock && !readOnly` at line 515 of `MarkdownEditorDialog.tsx`). Clicking it should open `ScriptEditorDialog` in **read-only mode**.

The `ScriptEditorDialog` already supports `readOnly` prop (see lines 87, 552, and many usages throughout). When `readOnly`:
- The close button just closes (no unsaved-changes check).
- Save/SaveHistory pill is hidden.
- Block editing actions are no-ops.
- Mode switcher is hidden.
- Text editor is not editable.
- Move/clone buttons are hidden.
- The bottom action area shows a "Close" button instead of Save/Done.

The `ScriptEditorWithSources` wrapper (lines 121-141 of `MarkdownEditorDialog.tsx`) already passes `readOnly` through to `ScriptEditorDialog`.

The `ViewOnlyPreviewModal` content (lines 655-681) currently renders `MainContent` with `readOnly` but does NOT render a `ScriptEditorWithSources` dialog. The parent `MarkdownEditorDialog` does render a `ScriptEditorWithSources` (lines 581-626) but it's shared with the main editor and not wired to the preview's cursor.

**Approach:** The `ViewOnlyPreviewModal` children are rendered as `children` prop. The preview's `MainContent` needs:
- A local `activeTab` state (so user can switch tabs).
- A local `editingScriptBlock` state and `cursorScriptBlock` memo (to detect when cursor is in a script block).
- A local `isScriptDialogOpen` state.
- A `ScriptEditorWithSources` (or `ScriptEditorDialog`) rendered with `readOnly` and the script block content.
- The `onScript` and `handleEditCode` handlers wired up.

This is complex because `MainContent` expects many props. The simplest approach is to create a small wrapper component (e.g., `ReadOnlyMarkdownPreview`) that encapsulates the `activeTab` state, script block detection, and script dialog rendering, so the `ViewOnlyPreviewModal` children can use it instead of inline `MainContent`.

## Key files

### Toast system
- `contexts/ToastContext.tsx` — `useToast()` hook, `ToastProvider`, `showToast(message)`.
- `app/_layout.tsx` — mounts `ToastProvider`.

### Markdown editor
- `app/components/game/MarkdownEditorDialog.tsx` — main dialog, renders `MainContent`, `ScriptEditorWithSources`, `ViewOnlyPreviewModal`.
- `app/components/game/markdownEditor/MainContent.tsx` — layout component, passes `readOnly` to `TabSelector`, `TabbedLayout`, `SideBySideLayout`.
- `app/components/game/markdownEditor/TabSelector.tsx` — tab switcher (Editing/Preview).
- `app/components/game/markdownEditor/TabbedLayout.tsx` — tabbed layout with editing + preview panes.
- `app/components/game/markdownEditor/SideBySideLayout.tsx` — side-by-side layout (desktop, width > 800).
- `app/components/game/townSquare/TownSquareComposerEditorPane.tsx` — the actual textarea/editor pane, receives `readOnly`.

### Script editor
- `app/script/editor/ScriptEditorDialog.tsx` — full script editor, supports `readOnly` prop.
- `app/components/game/MarkdownEditorDialog.tsx` lines 121-141 — `ScriptEditorWithSources` wrapper.

### Preview modal
- `app/components/ui/dialog/ViewOnlyPreviewModal.tsx` — generic view-only modal shell with Cancel/Replace buttons.

### Script block detection (in MarkdownEditorDialog)
- `cursorScriptBlock` memo (line 394) — detects `/*script ... script*/` block at current cursor position.
- `handleEditCode` (line 399) — opens script editor for the block at cursor.
- `editingScriptBlock` state (line 186) — `{ start, end, content }` of the script block being edited.

## Current state of read-only preview rendering

In `MarkdownEditorDialog.tsx` lines 647-683, the `ViewOnlyPreviewModal` children block:

```tsx
{previewEntry && (
  <InputOptionsProvider gameId={gameId} showInputs>
    <MainContent
      includeTitle={includeTitle}
      draftTitle={(previewEntry.value as { title?: string })?.title ?? ''}
      draftBody={(previewEntry.value as { markdown: string })?.markdown ?? ''}
      isPreviewSideBySide={isPreviewSideBySide}
      activeTab="preview"              // ← hardcoded, can't switch
      showInputs={showInputs}
      previewInputState={{}}
      setPreviewInputState={() => {}}
      setDraftTitle={() => {}}
      setDraftBody={() => {}}
      setSelection={() => {}}
      onTabChange={() => {}}           // ← no-op, can't switch
      onBold={() => {}}
      onItalic={() => {}}
      onLink={() => {}}
      onImage={() => {}}
      onInput={() => {}}
      onMore={() => {}}
      centered={centered}
      readOnly                          // ← disables tab switching
    />
  </InputOptionsProvider>
)}
```

## Constraints

- Do NOT break the non-read-only editor behavior.
- The toast should use `useToast()` from `contexts/ToastContext.tsx`.
- Tab switching must work in read-only mode (both `TabSelector` and `TabbedLayout`/`SideBySideLayout`).
- The script editor opened from read-only preview must itself be read-only (pass `readOnly` to `ScriptEditorDialog`).
- The `ViewOnlyPreviewModal` already has Cancel/Replace buttons at the bottom; the script editor dialog opens as a separate modal on top.
- `SideBySideLayout` (desktop) shows both editing and preview side-by-side, so tab switching isn't needed there — but the editing pane still needs the toast-on-type behavior.
- The `InputOptionsProvider` wrapping is needed for script input rendering in preview.

## Tech stack
- Expo SDK 54, React Native Web, Expo Router
- Convex backend, Clerk auth
- HeroUI Native dialogs (`heroui-native`)
- NativeWind / Tailwind styling
- `lucide-react-native` icons
- Reanimated for toast animations
- TypeScript
