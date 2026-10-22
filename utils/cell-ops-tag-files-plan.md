# Cell Operations + Provenance + Tags-as-Files — Redesign Plan

This is a redesign of **what a table cell is**, **how certification writes to it**, and **what a tag is**. It does not touch game rules, the vote model, or the file-composition system — it builds on all three.

The plan is written for approval. Nothing below is implemented yet.

---

## 1. What exists today (exact behavior)

### 1.1 Cells are flat strings

Every writable cell is a `string` inside `userTable` (`UserTableItem.days[].extraColumns[i]`, `playerData.extraColumns[i]`, `day.vote`, `day.action`, `day.voteMultiplier`, `playerData.livingState`) or `morningMessagesList[email][dayIndex]`.

A string cell has two mutually exclusive "modes" enforced only by UI (`TagCellEditor` disables typing once a tag exists):

- **Tag mode**: `[/TAG: "Infected"/][/TAG: "Suspect"/]` — parsed by `parseCell` in `utils/tagEncoding.ts`. Tag identity = **name only**.
- **Text mode**: anything else — markdown, plain text, or a file-list (`File({...})` statements resolved via `flattenCellContent` → `/*script*/` island).

### 1.2 UpdateCell today = "compute a string, replace the cell"

AST (`script/lang/ast.ts`): `UpdateCellStatement { players, columnType:'user'|'day', dayIndex, column, itemName, body, updateValue }`.

- **Input time** (`planMarkdownScriptUpdates` in `utils/runMarkdownScriptsWithUpdates.ts`): runs the script in planning mode. Per target cell it binds `cellContents` to the *current* value, runs the body, **partially evaluates** `updateValue` (input vars resolved; `tag()`, `.append()`, `File()` kept as syntax), and stores a `PlannedUpdate { playerIndex, dayIndex, column, columnType, updateExpression, itemName }` on the player's `playerNightSubmission-day-{N}-{gameId}` record.
- **Certify** (`executePlannedUpdates` in `utils/executePlannedUpdates.ts`): re-evaluates `updateExpression` against the current cell value → **writes the result as the whole cell** (replace). Because each update evaluates in sequence, `cellContents.append(tag("X"))` *appears* additive — but the stored result is a full overwrite.
- **Inside tag triggers** (execution mode): `UpdateCell` emits `TableUpdate { playerIndex, dayIndex, column, value, mode:'replace' }`. `applyCellValueMode` supports `append`/`remove` modes with tag-set merge + dedup — but **the interpreter never emits them**. The add/remove machinery is dormant.

### 1.3 The re-certify problem (real bug today)

Re-certifying replays every planned update. `cellContents.append(tag("Preview"))` re-evaluates → cell now holds `[/TAG: "Preview"/][/TAG: "Preview"/]` — duplicated tokens in storage. `fireTagTriggersForNetChanges` uses `Set`s so triggers don't re-fire, but the cell text itself corrupts. If the player changed their action, the *new* update expressions replace cells — but pieces appended by the old action inside other cells are left behind wherever the new expression doesn't happen to overwrite them.

Root cause: there is no memory of *which part* of a cell a submission wrote.

### 1.4 Tags today

- `tagDefinitions-{gameId}`: `[{name, color}]` (name = identity).
- `tagTriggers-{gameId}`: `Record<tagName, scriptText>` — scripts containing `OnTagAdded {}` / `OnTagRemoved {}` container blocks.
- `hooks/useTagTriggers.ts`: diffs before/after tag sets (UI edits fire immediately via `TagCellEditor → onTagsAdded/Removed`; certify diffs all cells via `fireTagTriggersForNetChanges`, cascading up to 10 passes). Trigger scripts run with `triggerMode:'added'|'removed'` + globals `placedTag`, `placedUser`, `placedDay`, `placedColumn`; their `UpdateCell`s emit `mode:'replace'` TableUpdates applied to the whole table.
- **No revert**: a tag's writes are permanent blind string-writes. Removing the tag requires a separately-authored `OnTagRemoved` script that must hand-undo every write — and it still can't undo correctly if the values changed in between.

### 1.5 File composition today

`File({ID=..., PATH=...})` statements + `flattenCellContent` produce one mega `/*script*/` island at the render seam (`useScriptFilesReader.resolve`). File refs are **id-stable** (`ScriptFile.id`, `rewritePathReferences` keeps path aliases). `ScriptFileKind = 'markdown' | 'script'`; pinned folders: `roleMessage`, `voteMessage`, `morningMessage`.

---

## 2. The redesign in one paragraph

**A cell is an ordered stream of pieces.** The raw cell text is base content (everything that's there today), plus appended **piece markers** that each record *what* they contain and *who* put it there (`src`). Scripts stop writing strings; they emit **operations** — `Add`, `Remove`, `Replace` — which append markers or set fields. Every certify run and every tag placement writes under a provenance key, so **undoing a source = deleting its markers**. Re-certify strips the day's certified markers and re-applies; removing a tag removes its marker and everything its trigger wrote — anywhere — automatically. **Tags become files** in a pinned `tags/` folder (stable ID, name+color meta, trigger script in the same file). `OnTagRemoved` becomes unnecessary for the common case — removal follows from provenance — but stays available.

---

## 3. Cell content model: pieces + provenance markers

### 3.1 Marker format

The cell string keeps working everywhere it does now (it is still just a string; all existing storage, freeze, sync, and transport paths are untouched). Pieces are appended **at the end** as tokens:

```text
base text stays here[/ADD src="certify:d2:a:anna@x.com"]and this came from Anna's action[/ADD][/TAG "f_k3x9" name="Infected" src="tag:f_k3x9@u1|d2|Suspects"/][/REM src="certify:d2:a:anna@x.com" match="tag:Cleared"/]
```

Three marker forms:

| Marker | Meaning |
|---|---|
| `[/TAG "tagId" name="Infected" src="S"/]` | A tag piece contributed by source `S`. `tagId` = tag file id; `name` kept for display + legacy lookup. Legacy `[/TAG: "Name"/]` still parses (no src → `manual`, name identity). |
| `[/ADD src="S" kind="text"]...content...[/ADD]` | A text piece. `kind` is optional (`text` default). |
| `[/ADD src="S" kind="file" ref="f_x"/]` | A **file piece** — the cell embeds file `f_x`'s content *live* (resolved through the files index at render/flatten time). This is "adding markdown = adding a file". |
| `[/REM src="S" match="..."/]` | A **remove tombstone**: masks earlier matching pieces while present. |
| `[/SET src="S"]value[/SET]` | A **replace marker**: effective base becomes its content (last SET wins). |

All markers parse through a new `utils/cellPieces.ts` — `parseCellPieces(raw) → { base, pieces: Piece[] }` — which runs **before** `parseFileCell`, so a file-list cell followed by markers still detects as file-mode (markers split off first; `base` goes through normal file flattening).

```ts
type ContributionSource = string; // see 3.2
type Piece =
  | { kind: 'tag';  src: ContributionSource; tagId?: string; name: string }
  | { kind: 'text'; src: ContributionSource; text: string }
  | { kind: 'file'; src: ContributionSource; fileId: string }
  | { kind: 'rem';  src: ContributionSource; match: PieceMatcher }
  | { kind: 'set';  src: ContributionSource; text: string };

type PieceMatcher =
  | { type: 'tag'; tagId?: string; name?: string }   // match a tag piece
  | { type: 'text'; substring: string }              // match text pieces containing it
  | { type: 'src'; src: string }                     // (internal) match a whole source
```

### 3.2 Provenance keys

`src` identifies *why* the piece exists:

| src | Producer | Reverted when |
|---|---|---|
| `certify:d{N}:a:{email}` / `certify:d{N}:v:{email}` | Player's certified action / vote planned ops for day N | Re-certifying that day+type (all `certify:d{N}:{t}:*` stripped, then re-applied) |
| `tag:{tagRef}@{cellAddr}` | A tag's trigger, attributed to *this placement* (cellAddr = `u{i}|d{j}|{col}` or `u{i}|d{j}|morning`) | The tag piece with that placement key is removed |
| `manual` | Operator UI edits | Never auto-reverted (ground truth) |

Why placement-keyed (not just tag id): the same tag on two different cells writes different things ("Infected" on Alice's cell may write "Spreading" on Bob's). Revert must follow the *placement instance*. Since a tag can only appear once per cell, `(cellAddr, tagId)` uniquely identifies a live placement — and that exact string is stored on the tag piece's `src`, making the linkage self-describing.

### 3.3 Effective content (the fold)

```ts
effectiveCell(raw) = {
  base:   last SET marker's text, else raw text before markers,
  pieces: ADD/TAG/file pieces in stream order, minus any piece
          that matches a REM marker appearing *later* in the stream,
}
```

A `REM` only masks pieces **before** it — order is recorded history, so a piece added after the remove stays. This gives:

- **Add** → append TAG/ADD marker.
- **Remove** → append REM marker (revertible: strip the source → marker gone → masked pieces resurface).
- **Replace** → append SET marker (revertible: strip the source → the previous SET, or the raw base, resurfaces).

All three ops are *append-only*. Reverting any source is one scan: drop its markers, re-fold. This is the complete answer to "re-certify removes the old and adds the new".

Dedup rules (idempotency, the "add a tag twice = once" requirement):

- Adding a **tag piece** whose `tagId`/`name` is already *visible* → no-op (no marker, no trigger re-fire).
- Adding a **text piece** identical (text + src) to an existing one → no-op.
- File pieces dedup on `(fileId, src)`.
- Re-certify is naturally idempotent: strip + re-apply converges to the same state.

### 3.4 Typed (non-piece) fields

`voteMultiplier`, `livingState`, `vote`, `action` are fields, not content cells:

- `Replace` on them = today's direct set (numbers/enums/values).
- `Add`/`Remove` are only meaningful on string cells; on typed fields they evaluate the value and fall back to Replace semantics for strings or are rejected in the editor for numbers/enums (`voteMultiplier`, `livingState`).

`morningMessage` is a full piece-cell (tags + text + file pieces all allowed → this is where "add markdown to the morning message which is a file" lives).

---

## 4. The operation layer

New module `utils/cellOps.ts` (pure functions over strings + the files index):

```ts
parseCellPieces(raw): { base: string; pieces: Piece[] }
serializePiece(p): string
effectiveCellBase(raw): string            // last SET or raw
visiblePieces(raw): Piece[]               // after REM masking
cellTagSet(raw): TagRef[]                 // visible tag pieces (id or name)
effectiveCellText(raw, index): string     // base + text pieces + resolved file pieces
applyCellOp(raw, op, ctx): string         // append the right marker(s) / set field
stripSource(raw, srcMatch): { raw, removed: Piece[] }
```

`applyTableUpdates` is superseded by `applyCellOps(users, morningList, ops, titles)` — same routing as today (special columns → fields, `morningMessage` → morning record, extras → column index) but ops write markers into cell strings.

`TableUpdate` (registry) grows `source?: string` and its `mode` becomes the op: `'append'|'remove'|'replace'` map to Add/Remove/Replace — the dormant modes finally get used. `PlannedUpdate` grows `op: 'add'|'remove'|'replace'|'each'` where `'each'` is the legacy "evaluate expression → replace" path (keeps every existing script working).

---

## 5. UpdateCell: from expression to action list

### 5.1 AST

```ts
interface UpdateCellStatement {
  players, columnType, dayIndex, column;   // unchanged target spec
  actions: UpdateCellAction[];
}
type UpdateCellAction =
  | { kind: 'add';     value: Expression }                       // tag() / File() / text expr
  | { kind: 'remove';  value: Expression }                       // matcher expr
  | { kind: 'replace'; value: Expression }                       // new base / field value
  | { kind: 'each';    itemName: string; body: Block; updateValue: Expression }; // legacy shape
```

The current `{body, updateValue, itemName}` fields become one `each` action — old scripts parse/print/run unchanged.

Printed form:

```text
UpdateCell({PLAYERS = nothing, COLUMNTYPE = "user", DAY = currentDay, COLUMN = ""}) {
  Add tag("Preview");
  Remove tag("Cleared");
  Each cellContents { ... Return ...; }
}
```

### 5.2 Planning mode

Each action partially evaluates to a planned op:

- `add`/`remove`/`replace` → `{op, updateExpression: partial(value)}` — same partial evaluator as today (input vars fold, `tag()`/`File()` stay symbolic).
- `each` → `{op:'each', updateExpression, itemName}` — today's `PlannedUpdate` exactly.

So a submission's `plannedUpdates` becomes a list of ops instead of replace-expressions. One UpdateCell block can now emit several ops (add one tag, remove another — the user's example).

### 5.3 Certify

`executePlannedUpdates` becomes `executePlannedOps`:

1. For each submission being certified, stamp ops with `src = certify:{day}:{type}:{submitterEmail}`.
2. Evaluate each `updateExpression` (same machinery: parse → interpret with `cellContents` bound).
3. `Add tag("X")` → emit tag-piece marker. `Add File({ID=f_x})` → file-piece marker. `Add <expr>` → text piece.
4. `Remove <expr>` → REM marker with matcher derived from the value (tag value → tag matcher; string → substring matcher).
5. `Replace <expr>` → SET marker on content cells; field set on typed fields.
6. `each` → replace-op via evaluated result (legacy; the eval reads *effective* cell text so appends still compose).

### 5.4 Execution mode (triggers)

Identical ops, emitted with `source = tag:{tagRef}@{cellAddr}` and applied immediately through `applyCellOps` (replacing `applyTableUpdates`).

### 5.5 Editor UI — the "Add action" flow

In `Canvas.tsx`, the UpdateCell card gains an **actions list** under the target spec:

- `+ Add action` → modal asking: **Add tag / Add text / Add file / Remove / Replace / For each cell** (For each = the old body+Return editor; it's also how arbitrary computed writes stay possible).
- Chosen action appears as a row inside the card: a colored op chip + inline socket(s) — tag picker dropdown for tags, file picker for files, expression socket otherwise — re-editable in place (the user's "change with dropdowns after" requirement). Rows are individually deletable; multiple actions allowed.
- `each` rows render the existing body canvas + "update with" socket — so **every existing UpdateCell in every saved script renders as a card with one `each` action**. Zero visual churn for old scripts; new ops are opt-in.
- InsertModal: the two current entries keep working; new palette entries for the action kinds (in trigger scripts, `Update Cell` gets the same action list).

---

## 6. Tags as files

### 6.1 The `tags/` folder

Fourth pinned folder: `tags`. Same `isProtectedFolder` treatment (can't delete/rename/move; contents are tag files). Tag files are `ScriptFile`s — one object, stable `id`, path `tags/{name}`:

```text
Tag({NAME = "Infected", COLOR = "Red"})

UpdateCell({PLAYERS = placedUser, ...}) {
  Add tag("Spreading");
}
```

- **First statement = `Tag` meta statement** (new hidden statement kind: name + color + optional future fields like description). Everything after is the trigger body.
- **Stable identity = file id.** Renames keep `id`; cell refs store the id so pointers never lose their target (the user's explicit requirement).
- The file body = implicit **On-Tag-Added** context: top-level statements run when the tag lands. `OnTagAdded`/`OnTagRemoved` blocks remain valid inside for rare asymmetric logic — but provenance makes OnTagRemoved unnecessary for reverting writes (a tag's `Add`s are removed with it).
- Bonus, nearly free: `CreateMarkdown` in a tag file = tag description/tooltip content.

### 6.2 Cell encoding

`[/TAG "f_k3x9" name="Infected" src="..."/]` — id-first, name cached for display and for matching when the file is deleted (missing id → still renders `name` as a legacy-looking pill). `tag("Infected")` resolves name → file id via the files index when available (interpreter gets a `tagLookup` option), else emits a name-only token → **legacy tags keep working untouched**.

Tag matching rules unify: match by `tagId` when both sides have ids; fall back to case-insensitive name — so a cell tagged before migration still matches the file after migration.

### 6.3 Legacy coexistence + migration

`tagDefinitions` + `tagTriggers` records stay live. `useTagTriggers` resolves a tag to **(a) a tag file** if one exists (by id, else by `tags/` file whose `NAME` matches), else **(b) the legacy `tagTriggers[name]` script**. TagCellEditor lists file-tags first, legacy tags in a "Legacy" group.

"**Migrate tags**" button (tag manager + Files tab tag folder header): for each legacy def → create `tags/{name}` file with `Tag({NAME, COLOR})` + the trigger script as body; mark migrated in a small `tagMigration` record. Cells are *not* rewritten eagerly — name matching bridges them; an optional "rewrite cell tokens to ids" pass can come later.

### 6.4 UI changes

- **TagCellEditor**: sources tags from `tags/` (via `useScriptFiles`) + legacy defs; toggles write id-encoded tokens; tag pills resolve name/color live from the file.
- **TagPill/TagCellDisplay**: unchanged API; color/name lookup goes tag-file-first.
- **AddTagDialog → tag file creation**: New Tag in the picker creates a `tags/` file (name field becomes file name; color writes the `Tag` meta). "Edit trigger script" opens the existing file editor on that file — trigger editing becomes normal file editing.
- **Files tab**: `tags/` shows in the browser; extend `useFilePlacements` to scan cell strings for `[/TAG "f_x"` tokens → tag files get real placements ("cells containing this tag" — the trace feature pays off here for free).

---

## 7. Certification lifecycle (new)

```
certifySubmissions(day, type):
  1. certifiedUsers = apply submissions' vote/action fields   (unchanged)
  2. srcPrefix = `certify:d{day}:{type}`
     every cell: stripSource(...) for all markers with that prefix
       → also collect dead tag placements; cascade-revert their
         `tag:{ref}@{addr}` contributions until fixpoint (≤10 passes)
  3. ops = executePlannedOps(all submissions' plannedUpdates,
                             src = `${srcPrefix}:{email}`)
     applyCellOps(...) sequentially over users + morningMessages
  4. net-change diff (same as today, now on visible tag sets):
       new visible tag placements → run their tag-file trigger
       (writes attributed `tag:{ref}@{addr}`) → iterate ≤10
       removals → fire OnTagRemoved bodies + auto-revert cascade
  5. setUserTable / setMorningMessagesList / setDoSync           (unchanged)
```

Consequences:

- **Player changes action → re-certify**: old `certify:d3:a:that-player` pieces vanish everywhere they were written (their own cells *and* other players' cells they wrote into); new ops apply. Exactly the requested semantic.
- **Re-certify with no change**: strip + re-apply → identical state; certifying twice no longer double-appends (fixes today's duplication bug for free).
- **A trigger's writes unwind with the tag**: "Infected" added "Spreading"; Infected removed → its REM/placement revert removes Spreading; Spreading was itself a tag placement → its own contributions revert too (cascade).
- Manual pieces (`src=manual` or plain base text) are never touched by certify reverts.

Tag-trigger firing keeps today's two entry points (UI edits via `TagCellEditor` callbacks; certify via net-change diff) — only the *writes* and the *resolution* (file-first) change.

---

## 8. Where the code changes (file-by-file)

| File | Change |
|---|---|
| `utils/cellPieces.ts` *(new)* | Marker parse/serialize/fold/dedup/matcher/resolve — the core. ~300 lines, pure. |
| `utils/cellOps.ts` *(new)* | `applyCellOps`, `stripSource`, `revertCascade`, `executePlannedOps` (absorbs `executePlannedUpdates` + `applyTableUpdates` responsibilities). |
| `script/lang/ast.ts`, `parser.ts`, `printer.ts` | `UpdateCellStatement.actions`; `Tag` meta statement; parse/print both forms; `each` compat. |
| `script/runtime/interpreter.ts` | Options: `contributionSource`, `tagLookup`, `filesIndex`. UpdateCell → emit ops; `tag()` → id-aware; effective-cell reads. |
| `script/registry.ts` | `TableUpdate.source`/`op`; planned-op type. |
| `script/editor/editorReducer.ts`, `Canvas.tsx`, `InsertModal.tsx` | UpdateCell actions list + add-action modal + per-op rows; `Tag` meta block in tag-file editing. |
| `utils/runMarkdownScriptsWithUpdates.ts`, `utils/executePlannedUpdates.ts` | Plan/execute ops (keep `'each'` path verbatim). |
| `utils/tagEncoding.ts` | Extend `parseCell` for `id`/`src` attrs; keep name-token compat. |
| `hooks/useTagTriggers.ts` | File-first trigger resolution; `contributionSource` on runs; revert-on-remove; net-change on visible sets. |
| `components/game/PlayerPageOPERATOR.tsx` | Certify = strip + ops + diff (§7). |
| `components/game/TagCellEditor.tsx`, `TagCellDisplay.tsx`, `TagPill.tsx`, `AddTagDialog.tsx` | File-tag source-of-truth; id tokens; new-tag → create file; legacy group. |
| `utils/scriptFiles.ts`, `hooks/useScriptFiles.ts` | `tags` pinned folder; `Tag` meta helpers; tag-file create/migrate ops. |
| `components/game/YourEyesOnlyDayContentPLAYER.tsx`, `PlayerPreviewModal.tsx` | `resolveCellText` gains piece expansion (base via files + visible piece text/file content). |
| `components/game/markdownEditor/MarkdownRenderer*` | Strip/contain markers so raw cells never render tokens. |
| `hooks/useFilePlacements.ts` | Scan cells for `[/TAG "f_x"` → tag-file placements. |
| `DaysTable`, `DayUserRow`, `PlayerTable`, `UserRow`, `multiSelect` | Cell writes go through marker-preserving ops (manual edits stay destructive-by-intent). |

**Unchanged**: submission records/keys, vote model + normalization, table freeze, DataProvider, all player-facing gating, file flattening, `plannedUpdates` storage shape (grows `op` field — old submissions still execute via `each`).

---

## 9. Edge cases decided

- **Same tag, two sources**: two certified actions both `Add tag("Infected")` to one cell → visible once (dedup); both pieces exist in the stream → removing one source leaves the tag. Correct.
- **Remove-then-readd same tag by different sources**: A removes X (REM), B later adds X — B's piece lands *after* the REM → visible. Removing B's source → X masked again by A's REM. Order-encoded history handles it.
- **Remove matcher can't see adds that haven't happened**: certify re-applies ops in submission order; a remove only masks earlier pieces — documented semantic.
- **Tag file deleted while live in cells**: tokens still render name-only pills (cached `name` attr); triggers can't run (no file) — placement removal still reverts whatever src it carried.
- **Infinite trigger loops**: today's ≤10-pass bound stays; plus dedup means a tag-adding trigger settles (adding an already-visible tag is a no-op that doesn't re-fire).
- **Freeze / scheduled updates**: cell strings (markers included) pass through untouched.
- **Legacy cells with name-only tags**: parse, match, dedup, and trigger all work via name fallback.

---

## 10. Testing

- `utils/cellPieces.test.ts`: marker round-trip, fold semantics, REM masking order, dedup, strip+cascade, legacy tokens, file-mode cell + markers interplay.
- `cellOps` integration: certify-strip-reapply idempotency (the duplicated-tag bug becomes a regression test); player-changed-action removal of that player's pieces only.
- Trigger cascade: A-adds-B, remove A → B's contributions gone.
- Parser/printer: `actions` round-trip; legacy `{body,Return}` → `each` parse.
- Manual: Zen — certify day, change an action, re-certify, inspect cell strings; migrate a legacy tag; verify Files-tab placements show tag files.

## 11. Rollout phases

1. **Pieces + ops core** (`cellPieces`, `cellOps`, apply layer) — no behavior change yet.
2. **UpdateCell actions** (AST/editor/interpreter/planning) — `each` = old path; new ops live.
3. **Provenance certify** (strip + re-apply; fixes the re-certify bug immediately).
4. **Trigger provenance** (`tag:{ref}@{addr}` src + auto-revert cascade).
5. **Tags-as-files** (`tags/` folder, `Tag` meta, file-first resolution, editor changes).
6. **Migrate tags tool** + cell-token id rewrite (optional last step).

---

## 12. Open questions for you

1. **Replace on content cells** — I chose: `Replace` sets the *base* only (pieces persist). Alternative: also wipes pieces. I think preserving pieces is right (Replace shouldn't silently delete other contributors' adds) — confirm?
2. **Tag pills on text/morning cells** — with mixed cells possible (base text + tag pieces), should tag pieces show as pills *alongside* text in day cells (TagCellDisplay currently shows tags *or* text, not both)? I'd show pills above/inline — minor UI decision.
3. **File pieces in morning messages** — `Add File(...)` links the file live (edits propagate). Alternative: bake the text at certify time. Live-link is the "everything is a file" payoff — confirm?
4. **`OnTagRemoved`** — keep it working (custom irreversible logic) but expect it to go mostly unused. OK?
5. **`For each` inside an action** — in my model UpdateCell already loops the target cells; the "for each" option is for actions whose value needs per-cell computation (the old body). Naming: show it as "For each cell (advanced)" in the modal — or keep free-form `Each` blocks? I lean the former.
6. **Planned-update compat** — old submissions in flight when this ships keep executing via the `each` replace path (no migration needed). Any objection to never rewriting stored planned updates?
