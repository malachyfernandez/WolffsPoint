# Save Button, Save History & Keyboard Shortcuts — Implementation Plan

## Overview

Add a top-right "Save" pill (save + save-history) to all substantial editor dialogs, rename the bottom-right "Save" to "Done", add save history with preview modals, fix the double-save problem in nested editors (script editor, bio editor), add keyboard shortcuts, and add a keyboard-shortcut hint indicator.

---

## Part 1: New Shared Components

### 1A. `SaveHistoryPill` component (top-right pill button)

**File:** `app/components/ui/dialog/SaveHistoryPill.tsx` (NEW)

A two-button pill that sits in the top-right of dialogs, to the left of the existing `CloseButton` (X).

**Visual design:**
- Left 3/4 = "Save" button: fully rounded left side, sharp right corner
- Right 1/4 = "Save History" button: sharp left corner, fully rounded right side
- Together they form one pill shape
- Save history button uses the lucide `History` icon (circle with backward arrow + clock hands)
- Styled to match `CloseButton` (same bg `bg-text-inverted/10`, hover `bg-text-inverted/15`, same color text `rgb(246, 238, 219)`)

**Props:**
```tsx
interface SaveHistoryPillProps {
  hasUnsavedChanges: boolean;
  onSave: () => void;           // saves without closing
  onOpenHistory: () => void;    // opens history modal
  isInvalid?: boolean;          // if true, save shows invalid toast instead of saving
  invalidMessage?: string;
}
```

**States:**
- **Has changes:** Save half renders with normal bg. Pressing calls `onSave()`.
- **No changes:** Save half renders with NO bg and a DASHED outline (disabled look). Pressing shows toast "Nothing to save".
- **Invalid:** Save half renders enabled-looking but pressing shows toast with `invalidMessage`.
- History half is always clickable (opens history modal).

### 1B. `SaveHistoryDialog` component (history modal)

**File:** `app/components/ui/dialog/SaveHistoryDialog.tsx` (NEW)

Shows a list of previous saved values (max 5). Header says "Save History" with subtext "Showing up to 5 most recent saves".

**Each entry shows:**
- Date and time (formatted)
- One-line preview of the saved text (truncated, single line)

**Hover behavior (web):**
- On hover, existing text in the entry fades to ~50% opacity
- "Click to preview" text fades in, centered
- Quick fade animation (~150ms)

**Click behavior:**
- Opens a view-only preview modal (Part 1C) on top of the history modal

**Empty state:** "No saved versions yet"

### 1C. `ViewOnlyPreviewModal` component

**File:** `app/components/ui/dialog/ViewOnlyPreviewModal.tsx` (NEW)

A generic wrapper that renders dialog content in read-only mode. Two bottom buttons: "Cancel" (left) and "Replace" (right).

- "Cancel" closes the preview modal only
- "Replace" calls `onReplace(previewValue)` then closes both the preview modal and the history modal

**Props:**
```tsx
interface ViewOnlyPreviewModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onReplace: (value: SavedEntry) => void;
  children: React.ReactNode;  // the view-only content
}
```

The actual view-only content is provided by the parent dialog via a render function, since each dialog type needs its own view-only rendering.

### 1D. `KeyboardShortcutHint` component (bottom-right indicator)

**File:** `app/components/ui/KeyboardShortcutHint.tsx` (NEW)

A small indicator pinned to the bottom-right corner of the WHOLE SITE (fixed/absolute at app root level). Shows keyboard key chips when hovering over a button that has a shortcut.

**Visual:**
- White text in a white rounded square emulating a keyboard key
- For single keys: one chip (e.g., "esc")
- For combos: multiple chips side by side (e.g., "cmd" "s")
- Fades in/out on hover

**Implementation:**
- A React context (`KeyboardShortcutHintContext`) provides `setHint(keys: string[] | null)`
- Buttons with shortcuts call `setHint` on `onHoverIn`/`onHoverIn` and clear on `onHoverOut`
- The indicator renders at the app root, reading from context

### 1E. `useKeyboardShortcuts` hook

**File:** `hooks/useKeyboardShortcuts.ts` (NEW)

A hook for use inside dialogs that registers keyboard listeners while the dialog is open:

- **Cmd/Ctrl+S** → trigger save (calls the save handler)
- **Enter** (on small confirmation dialogs) → trigger primary action
- **Esc** → trigger the close/cancel handler (whatever the close button does — may run confirmations before closing)

The hook accepts a config object:
```tsx
interface KeyboardShortcutConfig {
  onSave?: () => void;
  onPrimaryAction?: () => void;
  onClose?: () => void;
  enabled?: boolean;
}
```

---

## Part 2: Save History Storage

### 2A. New data key in `dataConfig.ts`

Add a generic save-history storage key. Since save history is per-dialog-instance (per role, per player, per cell), we need a scoped key pattern.

**Approach:** Use the existing `useValue` hook with a game-scoped key like `saveHistory-{dialogType}-{itemId}`. Each entry stores:

```ts
type SavedEntry = {
  id: string;          // unique id (timestamp-based)
  savedAt: number;     // timestamp
  preview: string;     // one-line preview text
  value: any;          // the full saved value (markdown, profile, tags, etc.)
};
```

Stored as an array, max 5 entries (newest first). When adding a 6th, drop the oldest.

**Add to `dataConfig.ts`:**
```ts
saveHistory: {
  type: 'variable',
  privacy: 'PRIVATE',
  defaultValue: [],
}
```

The actual key used at runtime will be scoped: `saveHistory-{dialogType}-{itemId}` (following the existing `getGameScopedKey` pattern).

### 2B. `useSaveHistory` hook

**File:** `hooks/useSaveHistory.ts` (NEW)

```tsx
function useSaveHistory(historyKey: string) {
  const [historyRecord, setHistory] = useValue<SavedEntry[]>(historyKey, {
    defaultValue: [],
    privacy: 'PRIVATE',
  });

  const addSave = (value: any, preview: string) => {
    const entry: SavedEntry = {
      id: `${Date.now()}`,
      savedAt: Date.now(),
      preview,
      value,
    };
    const current = historyRecord.value ?? [];
    const next = [entry, ...current].slice(0, 5); // max 5
    setHistory(next);
  };

  const removeSave = (id: string) => { ... };
  const clearHistory = () => setHistory([]);

  return { history: historyRecord.value ?? [], addSave, removeSave, clearHistory };
}
```

---

## Part 3: Dialog-by-Dialog Audit & Changes

### Which dialogs get the save+history treatment?

**Rule:** Any substantial editor dialog that saves data to the server (directly or via parent callback) AND is triggered from the cells/tables in Players, Roles, or Nightly tabs, plus the script editor.

**Dialogs that GET the save button:**

| Dialog | File | Save target | Notes |
|---|---|---|---|
| MarkdownEditorDialog | `app/components/game/MarkdownEditorDialog.tsx` | Parent `onSubmit` | Canonical. Script editor nested inside. |
| ScriptEditorDialog | `app/script/editor/ScriptEditorDialog.tsx` | Currently just updates parent markdown. **FIX:** make it save the full outer markdown to server. History = same as parent markdown editor. |
| BioEditorDialog | `app/components/game/BioEditorDialog.tsx` | Parent `onSubmit` | Nested inside PlayerProfileDialogNEW. **FIX:** double-save issue. |
| PlayerProfileDialogNEW | `app/components/game/PlayerProfileDialogNEW.tsx` | Parent `onSave` | Has nested bio editor. |
| TagCellEditor | `app/components/game/TagCellEditor.tsx` | `useValue` tagDefinitions + `onChange` | |
| AddTagDialog | `app/components/game/AddTagDialog.tsx` | `useValue` tagTriggers + tag defs | |
| VoteEditorDialog | `app/components/game/VoteEditorDialog.tsx` | Parent `onSubmit` | |
| ActionEditorDialog | `app/components/game/ActionEditorDialog.tsx` | Parent `onSubmit` | |
| RoleEditDialog | `app/components/game/RoleEditDialog.tsx` | Parent `onSet*` callbacks | |
| RoleAddDialog | `app/components/game/RoleAddDialog.tsx` | Parent `onAddRole` | |
| VoteMessageDialog | `app/components/game/VoteMessageDialog.tsx` | `setRoleMessage` | |
| UserEditDialog | `app/components/game/UserEditDialog.tsx` | `useList` userTable | |
| UserAddDialog | `app/components/game/UserAddDialog.tsx` | `useList` userTable | |
| NightlyResponseDialog | `app/components/game/NightlyResponseDialog.tsx` | Parent callback | |
| DaySelectionDialog | `app/components/game/DaySelectionDialog.tsx` | Parent callbacks | |
| ListLiteralEditor | `app/script/editor/ListLiteralEditor.tsx` | Parent `onEditItems` | |
| DropdownLiteralEditor | `app/script/editor/DropdownLiteralEditor.tsx` | Parent `onChange` | |
| TemplateInputModal | `app/script/editor/TemplateInputModal.tsx` | Parent `onDone` | |

**Dialogs that DO NOT get the save button** (small confirmations, pickers, viewers):
- ConfirmDialog, UnsavedChangesDialog, Alert, DeleteGameConfirmationDialog, DeleteRoleConfirmationDialog
- ImageUploadDialog, TownSquareImageDialog, TownSquareLinkDialog, TownSquareMoreOptionsDialog
- MarkdownVariableDialog, MarkdownInputBuilderDialog, InsertModal, TemplatePickerModal
- PlayerPreviewModal, ArchivedGamesDialog, JoinedGameOptionsDialog
- TableOfContentsDialog, ImportDraftDialog
- ChooseDayDialog, DaysPerGameDayDialog (small settings pickers — borderline, skip for now)
- ColumnActionsDialog
- NightlyCertificationDialog (viewer with certify actions, not a save dialog)
- TownSquarePostDialog (viewer + comment, uses nested MarkdownEditorDialog)

---

## Part 4: The "Done" Button Rename

For every dialog that gets the save button:
- The bottom-right button text changes from "Save" → "Done"
- "Done" now means: save (if changes) AND close
- The `hasUnsavedChanges` logic for the Done button changes:

**New "sticky enabled" rule:**
Once the Done button becomes enabled (because there were changes), it should NOT go greyed-out again due to "lack of changes" — only due to invalid state. This fixes the bug where saving via the top-right button makes Done think there are no changes.

**Implementation:**
- Track a `hasEverBeenEnabled` ref/state
- `doneEnabled = hasUnsavedChanges || hasEverBeenEnabled`
- `doneEnabled = doneEnabled && isValid` (invalid state still disables)
- Reset `hasEverBeenEnabled` when dialog closes/reopens

---

## Part 5: The Double-Save Fix (Script Editor & Bio Editor)

### 5A. Script Editor (`ScriptEditorDialog`)

**Current problem:** Script editor's "Save" button only updates the markdown in the parent `MarkdownEditorDialog`'s draft state. User must then save the MarkdownEditorDialog again to persist to server.

**Fix:** The script editor's save button should save the FULL outer markdown to the server.

**How:**
- `MarkdownEditorDialog` passes a `onSaveToServer` callback to `ScriptEditorDialog`
- When script editor saves: it updates the parent draft (as now), THEN calls `onSaveToServer()` which triggers the full server save
- The script editor's "Save" button becomes an honest save

**History:** Script editor's history = the SAME history as the parent MarkdownEditorDialog (shares the history key). Previewing a history entry opens the MarkdownEditorDialog in view-only mode.

**View-only script preview:** In the view-only markdown renderer, add "Open Script" buttons inline at each `/*script ... script*/` block position. These open a view-only ScriptEditorDialog.

### 5B. Bio Editor (`BioEditorDialog`)

**Current problem:** Bio editor's "Save" only updates the parent `PlayerProfileDialogNEW` draft. User must save the profile again.

**Fix:** Same pattern as script editor — bio editor save triggers the full profile save to server via a callback.

**History:** Bio editor gets its own history (scoped to the player profile).

### 5C. Audit other nested editors

Check for any other nested-editor-with-its-own-save-button patterns. Based on the audit, the main ones are:
- Script editor (inside MarkdownEditorDialog) — fixed above
- Bio editor (inside PlayerProfileDialogNEW) — fixed above

---

## Part 6: View-Only Modal Implementations

For each dialog type that has save history, create a view-only rendering mode. This is needed for the preview modal in save history.

**Approach:** Rather than creating separate view-only components, add a `readOnly` prop to each editor dialog. When `readOnly=true`:
- All inputs render as static text
- No editing controls
- Script blocks in markdown render with "Open Script" buttons (view-only script editor)
- Bottom buttons are "Cancel" and "Replace" instead of "Cancel" and "Save/Done"

**Dialogs needing view-only mode:**
1. MarkdownEditorDialog (renders markdown + inline "Open Script" buttons)
2. ScriptEditorDialog (view-only block/text display)
3. BioEditorDialog (view-only markdown)
4. PlayerProfileDialogNEW (view-only profile)
5. TagCellEditor (view-only tag/text display)
6. AddTagDialog (view-only tag def)
7. VoteEditorDialog (view-only vote)
8. ActionEditorDialog (view-only action text)
9. RoleEditDialog (view-only role)
10. RoleAddDialog (view-only — though this is "add", preview may not make sense)
11. VoteMessageDialog (view-only message)
12. UserEditDialog (view-only user)
13. UserAddDialog (view-only — same as above, may skip)
14. NightlyResponseDialog (view-only response)
15. DaySelectionDialog (view-only day settings)
16. ListLiteralEditor (view-only list)
17. DropdownLiteralEditor (view-only dropdown)
18. TemplateInputModal (view-only template)

**Practical note:** Many of these are simple enough that the view-only mode is just rendering the current values as text. The complex ones are the markdown/script editors.

---

## Part 7: Header Text Layout Fix

**Current problem:** The two pieces of header text (title + subtext) can go behind the top-right buttons.

**Fix:**
- Make header text left-justified (it likely already is, but verify)
- Ensure both title and subtext WRAP instead of overflowing behind buttons
- Add right padding to the header to account for the button cluster (CloseButton + SaveHistoryPill)
- Use `flex-1` + `flex-shrink` + `pr-28` or similar to reserve space

**File to update:** `app/components/ui/dialog/DialogHeader.tsx`

---

## Part 8: Keyboard Shortcuts

### 8A. Dialog-level shortcuts (via `useKeyboardShortcuts` hook)

- **Cmd/Ctrl+S** in editor dialogs → triggers top-right save (not Done)
- **Enter** in small confirmation dialogs → triggers primary action
- **Esc** in all dialogs → triggers the close/cancel handler (runs confirmations if unsaved changes, same as clicking X)

### 8B. Shortcut hint indicator

- Hovering over a button with a shortcut shows the hint in the bottom-right corner of the site
- Buttons that need hints:
  - Close button (X) → "esc"
  - Cancel button → "esc" (same as close)
  - Save button (top-right) → "cmd" "s"
  - Done button → (no shortcut, or could add cmd+enter)
  - Confirm/primary action in small dialogs → "enter"

**Implementation:**
- Add `keyboardHint` prop to `CloseButton`, `SaveHistoryPill`, `AppButton`, `DisableableButton`
- On hover, call `setHint` from `KeyboardShortcutHintContext`
- The `KeyboardShortcutHint` component renders at app root

---

## Part 9: Implementation Order

### Phase 1: Foundation (shared components)
1. Create `SaveHistoryPill` component
2. Create `SaveHistoryDialog` component
3. Create `ViewOnlyPreviewModal` component
4. Create `KeyboardShortcutHint` component + context
5. Create `useKeyboardShortcuts` hook
6. Create `useSaveHistory` hook
7. Add `saveHistory` to `dataConfig.ts`

### Phase 2: Canonical dialog (MarkdownEditorDialog)
8. Add `SaveHistoryPill` to MarkdownEditorDialog
9. Rename bottom-right "Save" → "Done"
10. Implement sticky-enabled logic for Done
11. Wire up save history (add save on top-right save, list in history modal)
12. Add view-only mode to MarkdownEditorDialog
13. Add inline "Open Script" buttons in view-only markdown
14. Fix header text layout
15. Add keyboard shortcuts

### Phase 3: Script editor fix
16. Make ScriptEditorDialog save the full outer markdown to server
17. Share history with parent MarkdownEditorDialog
18. Add view-only mode to ScriptEditorDialog
19. Add save pill + Done rename to ScriptEditorDialog

### Phase 4: Bio editor fix
20. Make BioEditorDialog save the full profile to server
21. Add save history (scoped to profile)
22. Add view-only mode to BioEditorDialog
23. Add save pill + Done rename to BioEditorDialog

### Phase 5: Remaining editor dialogs
24. TagCellEditor
25. AddTagDialog
26. VoteEditorDialog
27. ActionEditorDialog
28. RoleEditDialog
29. RoleAddDialog
30. VoteMessageDialog
31. UserEditDialog
32. UserAddDialog
33. NightlyResponseDialog
34. DaySelectionDialog
35. ListLiteralEditor
36. DropdownLiteralEditor
37. TemplateInputModal

### Phase 6: Keyboard shortcut hints + polish
38. Wire up `KeyboardShortcutHint` at app root
39. Add `keyboardHint` props to all relevant buttons
40. Test all shortcuts across dialogs
41. Final verification (tsc, lint, manual testing)

---

## Key Decisions

1. **Save history storage:** Use `useValue` with a scoped key per dialog instance. Max 5 entries. Stored on Convex (PRIVATE). This is the simplest approach that works with the existing data system.

2. **View-only mode:** Add a `readOnly` prop to existing dialogs rather than creating separate view-only components. Less code duplication.

3. **Script editor history:** Shares the parent markdown editor's history (since the script is part of the markdown). Previewing opens the markdown editor in view-only mode.

4. **"Done" sticky-enabled:** Track `hasEverBeenEnabled` to prevent the Done button from greying out after a top-right save. Invalid state still disables it.

5. **Keyboard hints:** Context-based, rendered at app root. Buttons opt in via `keyboardHint` prop.

6. **Preview generation:** Each dialog type provides a `getPreview(value)` function that returns a one-line string for the history list.

7. **Replace action:** In the preview modal, "Replace" loads the saved value into the editor (replacing current draft) and closes both preview + history modals. The user still needs to press "Done" to save to server (or the replace could auto-save — TBD, leaning toward requiring explicit Done).

---

## Edge Cases & Considerations

- **Concurrent saves:** If user saves rapidly, the history entries should still be ordered correctly (newest first).
- **Large values:** Markdown with scripts could be large. Storing 5 copies is acceptable but worth noting.
- **Native vs web:** The hover-to-preview behavior is web-only. On native, tapping an entry should open the preview directly (or show a "Preview" button).
- **Nested modals:** The preview modal opens ON TOP of the history modal, which opens on top of the editor. Three levels of modal stacking. Need to verify this works with the portal system.
- **Script preview in view-only markdown:** Need a parser that finds `/*script ... script*/` blocks in plain text and inserts "Open Script" buttons. Can reuse `findScriptBlocks` from MarkdownEditorDialog.

---

## Files to Create (NEW)

1. `app/components/ui/dialog/SaveHistoryPill.tsx`
2. `app/components/ui/dialog/SaveHistoryDialog.tsx`
3. `app/components/ui/dialog/ViewOnlyPreviewModal.tsx`
4. `app/components/ui/KeyboardShortcutHint.tsx`
5. `hooks/useKeyboardShortcuts.ts`
6. `hooks/useSaveHistory.ts`

## Files to Modify (EXISTING)

1. `utils/dataConfig.ts` — add saveHistory key
2. `app/components/ui/dialog/DialogHeader.tsx` — header layout fix
3. `app/components/ui/dialog/ConvexDialog.web.tsx` — may need to support nested modals
4. `app/components/ui/dialog/ConvexDialog.tsx` — same
5. `app/components/game/markdownEditor/CloseButton.tsx` — add keyboardHint prop
6. `app/components/game/markdownEditor/ActionButtons.tsx` — rename to Done, sticky-enabled
7. `app/components/ui/buttons/DisableableButton.tsx` — add keyboardHint prop
8. `app/components/ui/buttons/AppButton.tsx` — add keyboardHint prop
9. `app/components/game/MarkdownEditorDialog.tsx` — canonical implementation
10. `app/script/editor/ScriptEditorDialog.tsx` — double-save fix + save pill
11. `app/components/game/BioEditorDialog.tsx` — double-save fix + save pill
12. `app/components/game/PlayerProfileDialogNEW.tsx` — save pill + view-only
13. `app/components/game/TagCellEditor.tsx` — save pill
14. `app/components/game/AddTagDialog.tsx` — save pill
15. `app/components/game/VoteEditorDialog.tsx` — save pill
16. `app/components/game/ActionEditorDialog.tsx` — save pill
17. `app/components/game/RoleEditDialog.tsx` — save pill
18. `app/components/game/RoleAddDialog.tsx` — save pill
19. `app/components/game/VoteMessageDialog.tsx` — save pill
20. `app/components/game/UserEditDialog.tsx` — save pill
21. `app/components/game/UserAddDialog.tsx` — save pill
22. `app/components/game/NightlyResponseDialog.tsx` — save pill
23. `app/components/game/DaySelectionDialog.tsx` — save pill
24. `app/script/editor/ListLiteralEditor.tsx` — save pill
25. `app/script/editor/DropdownLiteralEditor.tsx` — save pill
26. `app/script/editor/TemplateInputModal.tsx` — save pill
27. `app/components/MainPage.tsx` or app root — mount KeyboardShortcutHint
