# Context: Full "Your Eyes Only" Page Preview from Roles Tab

## Task

Replace the current per-message "Preview As Player" functionality with a **full "your eyes only" page preview** that shows the operator the complete page a player sees — role message, vote message, about role, and the vote/action sections — all in one modal.

### Current behavior (to be replaced)

Currently, each `MarkdownEditorDialog` for role message, vote message, and about role has a `showPreviewAsPlayerOption` prop. When enabled, a "Preview As Player" button appears in the preview pane. Clicking it:
1. Force-saves the current draft markdown
2. Opens `PlayerPreviewModal`, which renders **only that one markdown field** as the selected player would see it

This is limited because it only shows one piece at a time, and the operator has to manually select a player from a dropdown before seeing anything.

### Desired behavior

1. **One button under the whole roles column** (not per-message). The button should appear below all the role rows in the `RoleTable` component, not inside individual `MarkdownEditorDialog` instances.

2. **Shows the full "your eyes only" page.** The preview modal should render the entire page that `YourEyesOnlyDayContentPLAYER.tsx` renders for a player, including:
   - The role message (action section)
   - The vote message (vote section)
   - The about role section
   - The vote/action layout with countdown timers (or simplified versions)
   - All the markdown rendered with proper script sources and input state

3. **Auto-select a player.** Instead of forcing the operator to pick a player from a dropdown before seeing anything, automatically select the first valid player (e.g., the first alive player, or just the first player in the user table). The operator can still change the selection via a dropdown if desired.

4. **No morning message.** The morning message section should NOT be rendered in the preview. Instead, show a note: "Morning messages are not part of this preview." so the operator doesn't get confused about why it's missing.

5. **No day/locking logic.** Don't check if the day is locked, if voting/actions are closed, etc. The preview should show everything as if it's the current playable day, unlocked. Use `selectedDayIndex` from the game state for `currentDay`.

6. **Keep the force-save behavior.** When the button is clicked, it should force-save any unsaved changes to the role table (role messages, vote messages, about roles) before opening the preview. This is important so the preview reflects the latest edits.

7. **Remove the per-message preview buttons.** The `showPreviewAsPlayerOption` prop on individual `MarkdownEditorDialog` instances for role message, vote message, and about role should be removed (or at least the buttons should no longer appear). The single full-page preview button replaces them.

## Key Terminology

- **Your Eyes Only page**: The page a player sees during a game day showing their vote section, action section, and any morning message. Implemented in `YourEyesOnlyDayContentPLAYER.tsx`.
- **Role message**: Per-role markdown with script blocks that create interactive inputs (actions). Stored in `RoleTableItem.roleMessage`.
- **Vote message**: Per-role markdown with `CreateSelectVoteInput` blocks for voting. Stored in `RoleTableItem.voteMessage`, falling back to `defaultVoteMessage` (game-wide).
- **About role**: Per-role markdown describing the role. Stored in `RoleTableItem.aboutRole`. Shown in the rulebook/player view.
- **PlayerPreviewModal**: The current modal that previews a single markdown field as a player. Located at `app/components/game/markdownEditor/PlayerPreviewModal.tsx`.
- **MarkdownRendererInputDataProvider**: Context provider that gives `MarkdownRenderer` access to player options, role options, and script sources. Located in `app/components/ui/markdown/MarkdownRenderer.tsx`.
- **ScriptSourceData**: The data object passed to the script runtime containing `capability`, `players`, `roles`, `currentUserId`, `currentEmail`, `currentDay`, `dayDates`, `schedule`, `userTableTitle`, `morningMessagesList`. Defined in `app/script/runtime/sources.ts`.

## Where Things Sit

### Current preview trigger and modal

**`app/components/game/MarkdownEditorDialog.tsx`**:
- Line 83: `showPreviewAsPlayerOption?: boolean` prop
- Line 140: Default `false`
- Line 284-295: `handlePreviewAsPlayer()` — force-saves draft, then opens `PlayerPreviewModal`
- Line 377-380: Passes `showPreviewAsPlayer` and `onPreviewAsPlayer` to `MainContent`
- Line 455-462: Renders `PlayerPreviewModal` with `markdown={savedMarkdownForPreview}`

**`app/components/game/markdownEditor/PlayerPreviewModal.tsx`** (full file, 222 lines):
- Props: `isOpen`, `onOpenChange`, `gameId`, `roleName?`, `markdown`
- Loads `userTable`, `roleTable`, `userTableTitle`, `dayDatesArray`, `selectedDayIndex` via `useList`
- Filters players by `roleName` if provided
- Shows a player dropdown (line 165-173)
- Renders a single `MarkdownRenderer` with the provided markdown (line 192-197)
- Does NOT auto-select a player — `selectedPlayerEmail` starts as `undefined`

**`app/components/game/townSquare/TownSquareComposerPreviewPane.tsx`** line 33-41:
The actual "Preview As Player" button in the preview pane toolbar.

### Roles tab (where the new button goes)

**`app/components/game/RoleTable.tsx`**:
- Line 184-262: The main return JSX. Renders the table with title row and `RoleRow` components.
- Line 248-261: The `MarkdownEditorDialog` for the default vote message (has `showPreviewAsPlayerOption`).
- The new full-page preview button should go after the table (after line 245, before the `MarkdownEditorDialog` at line 248), or below the table column.

**`app/components/game/RoleRow.tsx`**:
- Line 165-178: Role message `MarkdownEditorDialog` with `showPreviewAsPlayerOption`
- Line 187-202: Vote message `MarkdownEditorDialog` with `showPreviewAsPlayerOption`
- Line 203-213: About role `MarkdownEditorDialog` (no `showPreviewAsPlayerOption`)

### The full "your eyes only" page (to be replicated in preview)

**`app/components/game/YourEyesOnlyDayContentPLAYER.tsx`** (full file, ~696 lines):
- Line 41-46: Props: `gameId`, `currentEmail`, `currentUserId`, `dayIndex`
- Line 56-109: Loads all game data (userTable, roleTable, userTableTitle, morningMessagesList, dayDatesArray, schedule, etc.)
- Line 131-141: Resolves the matching player and their roleData. `voteMessage` falls back to `defaultVoteMessage`.
- Line 155-172: `useValue` for `PlayerNightSubmission` — the player's vote/action state. The preview should use emulated/local state instead.
- Line 174-186: Builds `playerOptions` and `roleOptions` for `MarkdownRendererInputDataProvider`.
- Line 408-692: The full page render:
  - Line 410-456: Morning message section (NOT needed in preview — show note instead)
  - Line 458-475: Countdown timer section (NOT needed in preview — or show simplified)
  - Line 477-621: Vote section (vote message rendered with `MarkdownRenderer`, skip vote checkbox, vote summary)
  - Line 623-690: Action section (role message rendered with `MarkdownRenderer`, action summary)

### Data loading patterns

The preview modal needs the same data as `YourEyesOnlyDayContentPLAYER`:
- `userTable` — `useList<UserTableItem[]>('userTable', gameId, { privacy: 'PUBLIC' })`
- `roleTable` — `useList<RoleTableItem[]>('roleTable', gameId, { privacy: 'PUBLIC' })`
- `userTableTitle` — `useList<UserTableTitle>('userTableTitle', gameId, { privacy: 'PUBLIC' })`
- `dayDatesArray` — `useList<string[]>('dayDatesArray', gameId, { privacy: 'PUBLIC' })`
- `selectedDayIndex` — `useList<number>('selectedDayIndex', gameId, { privacy: 'PUBLIC' })`
- `defaultVoteMessage` — `useList<string>('voteMessageDefault', gameId, { privacy: 'PUBLIC', defaultValue: DEFAULT_VOTE_MESSAGE })`

The existing `PlayerPreviewModal` already loads most of these (line 44-48).

### About role rendering

The "about role" content is shown to players in the rulebook/player view. Look at how it's rendered for players:
- Search for `aboutRole` in the codebase to find the player-facing rendering
- It's likely rendered with `MarkdownRenderer` without interactive inputs (no `setState`)

## Implementation Plan

1. **Create a new `FullPlayerPreviewModal` component** (or heavily modify `PlayerPreviewModal`):
   - Props: `isOpen`, `onOpenChange`, `gameId`
   - No `roleName` or `markdown` props — it loads everything from game state
   - Auto-select the first player on open (use `useEffect` on `isOpen` to set `selectedPlayerEmail` to the first player's email)
   - Load all game data (userTable, roleTable, userTableTitle, dayDatesArray, selectedDayIndex, defaultVoteMessage)
   - For the selected player, resolve their `roleData` from the role table (same as `YourEyesOnlyDayContentPLAYER` line 138)
   - Render the full page layout:
     - Morning message section: show "Morning messages are not part of this preview." note
     - Vote section: render `voteMessage` (role-specific or default) with `MarkdownRenderer` and emulated vote state
     - Action section: render `roleData.roleMessage` with `MarkdownRenderer` and emulated action state
     - About role section: render `roleData.aboutRole` with `MarkdownRenderer` (read-only, no inputs)
   - Use `MarkdownRendererInputDataProvider` with proper `playerOptions`, `roleOptions`, and `scriptSources`
   - Keep the player dropdown so the operator can switch players, but pre-select the first one
   - Use local emulated state for vote/action inputs (like the current `PlayerPreviewModal` does with `emulatedActionState`)

2. **Add the preview button to `RoleTable.tsx`**:
   - Below the roles table (after the `RoleRow` map, around line 245)
   - A button like "Preview Full Page As Player" that:
     - Force-saves the role table (call the existing save mechanism — though the role table uses `useList` which auto-saves, so this may just be ensuring the latest state is committed)
     - Opens the new `FullPlayerPreviewModal`
   - State: `const [isFullPreviewOpen, setIsFullPreviewOpen] = useState(false);`

3. **Remove per-message preview buttons**:
   - In `RoleRow.tsx`: Remove `showPreviewAsPlayerOption` from the role message and vote message `MarkdownEditorDialog` instances (lines 177 and 201)
   - In `RoleTable.tsx`: Remove `showPreviewAsPlayerOption` from the default vote message `MarkdownEditorDialog` (line 260)
   - Optionally: Remove the `showPreviewAsPlayerOption` prop and `handlePreviewAsPlayer` from `MarkdownEditorDialog.tsx` if no other callers use it. Check `grep -r showPreviewAsPlayerOption` first.

4. **Handle the force-save**: The role table uses `useList` which auto-saves on set. The individual `MarkdownEditorDialog` instances already save on submit. The main concern is if an editor dialog is open with unsaved changes when the operator clicks the full preview button. Consider:
   - Closing any open editor dialogs before opening the preview
   - Or just reading from the saved game state (which is what `useList` returns) — if there are unsaved drafts in open dialogs, those won't appear in the preview, which is acceptable

## Files to Modify

- `app/components/game/markdownEditor/PlayerPreviewModal.tsx` — Either heavily modify to show the full page, or create a new component and leave this as-is (check if anything else uses it)
- `app/components/game/RoleTable.tsx` — Add the preview button and modal, remove `showPreviewAsPlayerOption` from default vote message dialog
- `app/components/game/RoleRow.tsx` — Remove `showPreviewAsPlayerOption` from role message and vote message dialogs

## Files to Read First

- `app/components/game/YourEyesOnlyDayContentPLAYER.tsx` — The full page layout to replicate. Focus on lines 408-692 (the render section) and lines 131-186 (data resolution).
- `app/components/game/markdownEditor/PlayerPreviewModal.tsx` — The current preview modal to replace or modify.
- `app/components/game/RoleTable.tsx` — Where to add the new button.
- `app/components/game/RoleRow.tsx` — Where to remove per-message preview props.
- `app/components/game/MarkdownEditorDialog.tsx` — How `showPreviewAsPlayerOption` and `handlePreviewAsPlayer` currently work (lines 83, 140, 284-295, 377-380, 455-462).
- `app/components/ui/markdown/MarkdownRenderer.tsx` — The `MarkdownRendererInputDataProvider` API and `MarkdownRenderer` props.
- `app/script/runtime/sources.ts` — The `ScriptSourceData` type.
- `types/roleTable.ts` — `RoleTableItem` type and `DEFAULT_VOTE_MESSAGE`.
- `types/playerTable.ts` — `UserTableItem` and `UserTableTitle` types.

## Constraints

- **No day/locking logic in preview**: Show everything as unlocked, current day.
- **No morning message**: Show a note explaining it's not part of the preview.
- **Auto-select first player**: Don't make the operator pick before seeing anything.
- **Keep force-save**: The preview should reflect saved state. If editors are open with unsaved drafts, those won't appear (acceptable).
- **Emulated input state**: Vote/action inputs in the preview should be local state only, never saved to Convex (same as current `PlayerPreviewModal`).
- **Follow existing patterns**: Use `MarkdownRendererInputDataProvider`, `MarkdownRenderer`, `AppDropdown`, `ConvexDialog`, `ShadowScrollView`, `FontText`, `Column`, `Row`, `AppButton` — all existing UI components.
- **Project conventions**: Follow the unsaved-changes confirmation pattern from `AGENTS.md` if any new dialog state is introduced. Use NativeWind classes for styling.
