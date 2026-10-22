# Cell Module Audit

## What Was Already Here

- Source-attributed cell pieces, rather than only destructive string replacement.
- `Add`, `Remove`, and `Replace` cell operations, including certify-time planned operations.
- Automatic removal of contributions owned by removed tag placements.
- Live-linked file pieces and a file-resolution pipeline.

These are the right building blocks. This change extends them rather than introducing a second storage system.

## Behavior Now

An Update Cell block can contain tag, text, or file modules:

```text
UpdateCell({
  PLAYERS = placedUser,
  COLUMNTYPE = "day",
  DAY = placedDay,
  COLUMN = "morningMessage"
}) {
  Add File({ID = "f_infected", PATH = "templates/Infected"});
}
```

The referenced markdown file might contain `You have been infected.` Its content is resolved live; it is not copied into the morning message. File IDs survive moves and renames.

Optional Update Cell settings apply to that block:

- `ALLOWDUPLICATES = True`: show repeated module additions. Default: `False`.
- `AUTOREMOVE = False`: keep a tag-trigger contribution when its originating tag is removed. Default: `True`.

Both settings are available in the block editor. Certify contributions still refresh on re-certification; `AUTOREMOVE` only opts out of tag-removal rollback.

Duplicate suppression happens when folding the stored contributions, not by discarding another owner's addition. If two tags add the same file, one file is displayed. Removing either owner keeps the file; removing the last owner removes it.

Custom all-game and per-day columns have a Tags/Files setting in Column options. Unconfigured columns default to Tags. Tags use selection only, with no free-text cell input. Files use the reusable-file composer. Switching types preserves existing data. Bulk selection cannot mix Tags and Files; bulk edits reconcile each destination separately and run tag transitions with undo support for morning-message changes.

Markdown-kind files containing a single literal CreateMarkdown block open directly in the markdown editor. File options, switching files, input declarations, composed previews, formatting, variables, file insertion, save/history, and unsaved-change protection remain available. Edit source opens the underlying script without saving or discarding the draft. Complex markdown-kind files stay in the script editor rather than silently losing additional logic.

## Bugs Fixed

- File and text modules lacked the tag module's duplicate behavior.
- Skipping duplicate additions discarded ownership, breaking independent rollback.
- The marker parser could consume a self-closing file piece as the start of a later text piece.
- Replace left earlier appended pieces visible instead of replacing the effective cell.
- Cascading rollback reverted dependent tags even when another contribution kept them alive.
- Rollback used prefix matching for an individual placement, so similarly named columns could collide.
- Rollback stopped after ten queued removals.
- Manual tag changes did not run the full cascading transition pass.
- Certification compared morning-message tags against the new morning-message state rather than the previous one.
- File-cell editors could expose or overwrite the raw contribution stream.
- File-list reordering now stores ordering metadata, without reassigning ownership of the moved modules.
- Bulk edits copied the first cell's provenance to other cells.
- Sequential operations could read stale cell contents.
- File-valued cell operations were missing from the expression picker.
- Missing files in cell-operation values were not validated.
- Switching markdown Preview back to Editing incorrectly marked unsaved edits as clean.

## Compatibility And Remaining Boundaries

- Existing marker-free text and legacy tags remain readable. No automatic database migration or content deletion is performed.
- Only tracked contributions can be automatically reverted. The system cannot infer provenance for historical destructive writes.
- Vote, action, vote multiplier, and living-state fields remain typed/direct-write fields, not modular text cells. Automatic module rollback applies to extra columns and morning messages.
- Tag placement provenance still uses player indexes and column titles. Renaming/deleting columns or reindexing players with active tag contributions needs a separate identity/migration pass. The exact-match rollback fix prevents prefix collisions but does not solve that older structural-identity issue.
- Trigger execution is a bounded fixpoint to prevent infinite cycles. Self-referential tag scripts should still be avoided.
- Files continue to use the existing per-game document, rather than a new Convex component or schema.

## Verification

Run `npm run test:cell-modules` for the pure storage, interpreter, planning, file-resolution, and tag-transition regressions. The test harness isolates persistence hooks; it does not exercise authenticated UI or real backend writes.

Also run `npx tsc --noEmit` and targeted ESLint/Prettier checks. Manual desktop/mobile validation should cover the new column setting, file-module picker, markdown/source round-trip, file options, input editing, preview, save/history, and unsaved-close confirmation.
