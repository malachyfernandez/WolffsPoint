# Button Sizing Audit

Generated from a static scan of every `<AppButton>` in `app/` (script: `/tmp/wolf_button_audit.py`).

## Methodology

- `px/char` = (button width − horizontal padding) ÷ number of alphanumeric characters in the label.
- Tailwind spacing: `w-N` = `N × 4px` (so `w-20` = 80px, `w-24` = 96px, `w-28` = 112px, `w-32` = 128px, `w-36` = 144px, `w-40` = 160px, `w-44` = 176px, `w-48` = 192px).
- **`min-w-*` buttons are intentionally excluded** — they are floors, not caps, so they can grow to fit their label. `min-w` is the *good* pattern.
- The real problems are **fixed `w-*` widths** (cannot grow) and **primary (filled/black) buttons narrower than the secondary (outline) button next to them**.
- `AppButton` has **no default horizontal padding** — text will touch the edges unless `px-*` is supplied or the width is generous. As a rough rule, Libre Baskerville medium at ~17px needs ~9–10px per character of available width.

## Actions taken

- `app/components/ui/dialog/UnsavedChangesDialog.tsx` — "Keep Editing" (the filled/primary button) bumped `w-24` → `w-28` so it matches "Discard".
  - ⚠️ Note: 112px for "Keep Editing" (12 chars) is still borderline. Recommended: `w-32` or add `px-4` to both buttons.

---

## 1. Primary (filled) smaller than secondary (outline) — NEEDS FIXING

### A. `MustSaveDialog` — Save (96px) < Cancel (112px)

- **File:** `app/components/ui/minimize/MustSaveDialog.tsx` (lines ~51–69)
- **Classes:** Cancel `w-28` (112px), Save `w-28` (112px)
- **Status:** ✅ Fixed — Save was `w-24` (96px), now `w-28` (112px) to match Cancel.

**How to find it:**
- Be an **operator** (anyone who can edit).
- Open any minimizable editor dialog — e.g., **Roles tab → click a role's message cell → markdown editor opens**.
- Make an unsaved edit (type something).
- Press the **minimize button** (the `—` icon, top-right of the dialog).
- The "Save Required" dialog appears: **Cancel** (outline, 112px) sits next to **Save** (filled, 96px) — the primary is visibly narrower.
- Also reachable from: Action Editor, Tag Cell Editor, Vote Editor, Player Profile dialog — same minimize flow.

### B. `TableFreezeControls` — Update Now (min 144px) < Schedule Update (min 160px)

- **File:** `app/components/game/TableFreezeControls.tsx` (lines ~117–131)
- **Classes:** "Schedule Update" `min-w-40 px-3`, "Update Now" `min-w-36` (no `px-*`!)
- **Minor** — both are `min-w` so they grow — but the primary's floor is still lower and it has no horizontal padding.
- **Fix:** `min-w-36` → `min-w-40` and add `px-3` to "Update Now".

**How to find it:**
- Be an **operator**.
- Go to **Players**, **Roles**, or **Nightly** tab → press **Freeze Table** → the 3-button row appears under the table: "Cancel Update" | "Schedule Update" | **Update Now** (filled, the narrowest).

---

## 2. Tight fixed-width buttons — NEEDS REVIEW/FIX

Ranked worst → best by px/char. All of these are `w-*` (cannot grow).

### `ShareButton` — 5.7 px/char ⚠️ DEAD CODE
- **File:** `app/components/ui/buttons/ShareButton.tsx` (`h-10 w-20 sm:w-30`)
- "Share Link" (10+ chars incl. space) in an 80px button on mobile. Also `w-30` is **not a standard Tailwind class** (scale jumps 28 → 32); verify it resolves.
- **How to find:** you can't — nothing imports `ShareButton`. Either delete it or fix it before it's used.

### `MarkdownVariableDialog` — ~10 px/char
- **File:** `app/components/game/markdownEditor/MarkdownVariableDialog.tsx` (`w-36`, no padding)
- "Insert variable" is 15 chars → ~140px of text in a 144px button. Touches edges.
- **How to find:** **Operator → Roles tab** → open a role's **message editor** → press the **insert variable** button → dialog → bottom-right "Insert variable" button.

### `ViewOnlyPreviewModal` — 11–13 px/char
- **File:** `app/components/ui/dialog/ViewOnlyPreviewModal.tsx` (`w-20 sm:w-32`)
- "Cancel"/"Replace" in 80px below `sm` breakpoint.
- **How to find:** **Operator** → open any editor with a preview (role message editor, tag cell editor, action editor) → open the **preview modal** → bottom buttons. Only tight when window < 640px wide.

### `TagCellEditor` Cancel — 13.3 px/char
- **File:** `app/components/game/TagCellEditor.tsx` (`h-8 w-20`)
- "Cancel" in 80px × 32px — short and narrow.
- **How to find:** **Operator → Players or Nightly tab** → click a **tag cell** in the table → tag editor opens → "Cancel" button.

### `PlayerProfileDialogNEW` Cancel — 13.3 px/char (mobile only)
- **File:** `app/components/game/PlayerProfileDialogNEW.tsx` (`w-20 sm:w-36`)
- **How to find:** click your **player name/profile** → profile dialog → "Cancel". Only tight below 640px.

### `UserEditDialog` / `UserAddDialog` Cancel — 14.7 px/char (mobile only)
- **Files:** `app/components/game/UserEditDialog.tsx`, `app/components/game/UserAddDialog.tsx` (`w-22` = 88px, `sm:w-48`)
- `w-22` is also non-standard — verify it resolves.
- **How to find:** **Operator → Players tab** → press **Add Player** or click a **player's name** → dialog → "Cancel". Only tight below 640px.

### `ActionEditorDialog` Cancel — 14.7 px/char (mobile only)
- **File:** `app/components/game/ActionEditorDialog.tsx` (`w-22 h-12 sm:w-32`)
- **How to find:** **Operator → Nightly or Players days-table** → click an **Action cell** → action editor → "Cancel".

### `NightlyCertificationDialog` Close — 16 px/char
- **File:** `app/components/game/NightlyCertificationDialog.tsx` (`w-20`)
- **How to find:** **Operator → Nightly tab** → **"Review / Certify"** button → dialog → "Close".

### `JoinHandler` Join/Invalid — 11.4–20 px/char
- **File:** `app/components/ui/forms/JoinHandler.tsx` (`h-10 w-20`)
- "Join" is fine (4 chars); the grey **"Invalid"** state is 7 chars in 80px — tight.
- **How to find:** **anyone (no login needed)** → home page → **Join Game** → type a **bad game code** → the button turns into "Invalid".

### `Canvas` Cancel — 13.3 px/char effective
- **File:** `app/script/editor/Canvas.tsx` (`w-32 px-6`)
- 128px − 48px padding = ~80px for "Cancel". Not broken, just cramped.
- **How to find:** **Operator** → open the **script editor canvas** (role message script editor) → "Cancel".

### `GetStartedButton` / `ChangeDateInfo` — DEAD CODE
- `GetStartedButton.tsx` (`h-10 w-28` "Save"), `ChangeDateInfo.tsx` (`h-10 w-20` "Save")
- **How to find:** nowhere — neither is imported by any file in `app/`. Same dead-code cleanup note as ShareButton.

---

## 3. Not problems (checked)

- All `w-48` buttons (`VoteEnableDialog`, `RoleAddDialog`, Nightly "Review / Certify") — 192px, generous.
- `DayOffsetDropdown` `w-full` — fills its container.
- Icon-only `w-6`/`w-8`/`w-10`/`w-12` buttons (day title `⋯`, `+` column adders, role reorder arrows) — intentionally icon-sized, no text to crush.
- All `min-w-*` freeze-control buttons — they grow.

## Caveats

- The scan is static: dynamic labels (`{saveLabel}`, ternaries like `isScheduled ? 'A' : 'B'`) are approximated — always eyeball the rendered button.
- `w-22`, `w-30` are **non-standard Tailwind values**. If the project is on Tailwind v4 / Uniwind dynamic spacing they resolve (88px / 120px); on v3 they're silently ignored, making the button content-width (even tighter than reported). Worth verifying which Tailwind version resolves these.
