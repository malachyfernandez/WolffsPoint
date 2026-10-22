# Modular About Role, Folder Display, and Navigation

Status: implementation plan, not an implemented feature.
Research and baseline verification: 2026-10-21.

## 1. Scope and intended result

About Role becomes the fourth built-in display-composition cell, alongside Role
Message, Vote Message, and Morning Message. Custom Files columns use the same
composition editor. A composition can contain live File and Folder references,
inline Display Markdown, Divider, and nested Nav Button blocks.

The modular rulebook becomes one editable composition, not custom markdown followed
by a separately rendered role list. Its initial composition contains the existing
rules, followed by a Nav Button labeled "Role Descriptions" containing a reference
to the About Role folder. Operators can move, replace, wrap, or remove those blocks.

Folder references are live queries over folder membership, with ordering and
visibility configured on each reference. A Nav Button opens a child screen within
the current document: the entire parent document, including the button, pans away.
Nav Buttons can contain other Nav Buttons.

Legacy games keep their current rulebook, raw About Role editing, role-order
controls, and visibility toggles until explicitly upgraded. This is not a backend
schema migration, a global content rewrite, or an automatic write on page mount.

## 2. Verified current behavior

These are findings from the current working tree, not assumptions from older plans.

| Area                 | Current implementation and consequence                                                                                                                                                                                                                                                                                                  |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stored files         | `utils/scriptFiles.ts`: `ScriptFilesDoc` contains `files: Record<string, ScriptFile>` and `folders: string[]`. Files have stable IDs; folders do not. Files resolve by ID first, with path fallback only for references without an ID.                                                                                                  |
| Default folders      | `PINNED_FOLDERS` is `roleMessage`, `voteMessage`, `morningMessage`, `tags`. `buildFilesIndex` also discovers folders implied by file paths. Pinned roots cannot be renamed, moved, deleted, or dragged. `FileBrowserDialog` maps their names to friendly labels.                                                                        |
| Folder purpose       | Default folders are organizational defaults, not cell ownership constraints. `CellFilesEditorDialog` opens the picker in `pinnedFolder` and creates new files there, but can select files elsewhere. Moving a file preserves its existing ID-backed references.                                                                         |
| File cells           | `parseFileCell` accepts empty text or a script consisting exclusively of top-level `File(...)` statements. Its fast-path check specifically requires a leading `File(`. Other source is treated as legacy markdown.                                                                                                                     |
| File expansion       | `flattenCellContent` expands file calls into a script island. `expandStatements` handles recursive file inclusion and selected nested statement bodies, detects cycles, and limits nesting to 16. File inputs use the existing flat namespace.                                                                                          |
| Rendering seam       | `useScriptFiles` and `useScriptFilesReader` fold provenance with `foldCellForResolve` before flattening. Resolution is cached per index. `MarkdownRenderer` parses markdown/script islands; each island has its own `ScriptRuntime`.                                                                                                    |
| Runtime output       | `RenderInstruction` currently represents markdown, divider, and input controls, with no child-screen structure. `ScriptRuntime` interprets source and sends a flat instruction list to `ScriptRenderers`. Passing a files index currently cleans inputs; it does not itself expand standalone file includes.                            |
| Reconciliation       | `fileCellEditorText` and `reconcileFileCell` reconstruct and compare File references. File identity is the reconciliation key. `[/ORDER ... refs="..."/]` orders files independently of their contributing owners. Simply adding a Markdown or Folder block would currently be lost or misclassified here.                              |
| Cell editor          | `CellFilesEditorDialog` uses `ScriptEditorDialog` with `fileOnly: true`. Statement insertion goes directly to the file picker; expression insertion still uses the expression picker. Empty lists offer New Text, New Script, and Open File Browser.                                                                                    |
| About Role           | `RoleTableItem.aboutRole` is a string. `RoleRow` opens `MarkdownEditorDialog`, displays a raw substring in the table, and bulk About Role editing writes raw markdown. Unlike role/vote cells, it does not use the file-cell editor.                                                                                                    |
| About Role consumers | `YourEyesOnlyPagePLAYER` and `markdownEditor/PlayerPreviewModal` pass `aboutRole` directly to `MarkdownRenderer`. Both must change when it stores composition source. `script/runtime/sources.ts` also exposes the stored string through role data.                                                                                     |
| Rulebook storage     | `RuleBookData` stores `content`, index-based `roleOrder`, and optional rulebook/role-description titles in the game-scoped `ruleBook` variable.                                                                                                                                                                                         |
| Rulebook rendering   | Operator/player pages render `content`, then append separate `RuleBookRoleDescriptions` components. Those filter `isVisible !== false`, `hiddenFromRulebook !== true`, and nonempty About Role; saved role indices come first, then remaining eligible roles. Description items are centered, use image-height 30, and have separators. |
| Rulebook editing     | The operator has a main markdown editor, plus separate description editing/order/hide controls. Both Add Role and Edit Role expose rulebook visibility. `RoleTable` implements deletion as `isVisible: false`, not physical removal.                                                                                                    |
| Contents             | `TableOfContentsDialog` parses the raw rulebook markdown and separately fabricates role entries. It is not based on composed runtime output; its role entries are not driven by `roleOrder`.                                                                                                                                            |
| Migration            | `legacyMigration.ts` converts role/vote/morning/custom Files content and tags, but not About Role or the rulebook. `useMigrateEverything` copies the rulebook unchanged. It builds a safety copy, refuses loading/pending/staged inputs, awaits writes, and writes completion last.                                                     |
| Capability marker    | `CELL_MODULE_VERSION` is currently 1. `useCellModuleStatus` compares against that constant. Raising it naively would make existing v1 games look unmigrated throughout the app.                                                                                                                                                         |
| New games            | Creation seeds a default vote file and file reference, version 1, game metadata, and first day, awaiting writes before navigation. It does not seed a modular rulebook.                                                                                                                                                                 |
| Cleanup and usage    | File-input cleanup already visits About Role and rulebook values. Usage tracking does not include About Role or the rulebook, and only follows File calls/tag references, not folder membership. These are separate responsibilities.                                                                                                   |
| Existing transitions | Town Square uses `LayoutStateAnimatedView`, not the simpler `StateAnimatedView`. It has from-right push/pop transitions, adjacent depth levels, one mounted content tree, and explicit scroll restoration.                                                                                                                              |
| Persistence          | DataProvider deduplicates subscriptions. Pending replacements remain separate from published values; ordinary setters can target an existing pending draft. Player-facing reads must remain on published, operator-owned records.                                                                                                       |

Primary reference files are listed in section 12. The two requested architecture
guides were read; their older examples are subordinate to the actual implementations
above and the current `AGENTS.md`.

## 3. Recommended design decisions

These are proposals to approve, not claims about existing functionality.

1. Keep cells and rulebook compositions as script source, sharing the language and
   renderer. Do not create a second JSON-only page-builder language.
2. Add `aboutRole/` as a pinned default folder, friendly label "About Roles".
   Its location is a default, never a constraint on what an About Role cell may use.
3. Add a distinct `Folder(...)` include. Do not overload `File(...)` or enumerate
   the folder into permanently stored File calls.
4. Folder order/hide options belong to the include occurrence, not the folder
   globally. Two pages can display the same folder differently.
5. New members appear automatically, after explicitly ordered members. References
   remember hidden/ordered file IDs across moves out and back; deleted IDs never
   bind to replacement files with the same name.
6. Default to recursive folder membership, flattened into one ordered file list.
   Show relative paths in the configuration dialog. A flag can restrict to direct
   children. No implicit per-subfolder navigation or automatic heading generation.
7. A Nav Button controls presentation, not authorization or execution. Hidden
   content is not mounted/displayed until entered; navigation is not an action
   submission or certification trigger.
8. Evaluate script semantics independently of the currently viewed screen. Keep
   existing flat input names and submission behavior, including hidden-screen
   inputs. Clicking Back must not erase their values.
9. Reuse CreateMarkdown and CreateDivider. "Heading" is a creation shortcut to a
   Markdown block, not another runtime primitive.
10. Keep legacy data and renderers available. New/v2 games use composition behavior;
    v0/v1 games need a deliberate upgrade before replacing their old rulebook.

## 4. Language, folder identity, and expansion

### Proposed source representation

Exact option spelling should be frozen with round-trip fixtures before UI work:

```text
File({PATH = "rules/Main rules", ID = "f_rules"});

NavButton({LABEL = "Role Descriptions"}) {
  Folder({
    PATH = "aboutRole",
    ID = "folder_about_role",
    ORDER = ["f_infector", "f_healer"],
    HIDDEN = ["f_unreleased"],
    RECURSIVE = True,
    DIVIDERS = True,
    ALIGN = "center",
    IMAGEHEIGHT = 30
  });
}
```

Folder settings are not individual canvas sockets. Render a compact folder chip;
pressing it opens its order/visibility dialog. Keep retargeting as a separate,
clearly labeled control. Text mode retains every option. Omit default-valued
options when printing, following the existing flag convention.

`ORDER` and `HIDDEN` contain file IDs, not role indices or names. Membership is
resolved first; ordered IDs outside the folder are ignored, not imported. Explicit
order wins, then a deterministic normalized-relative-path sort with an ID
tie-breaker. Visibility filters the resulting list. Empty existing folders render
no content; missing folders produce an operator/editor diagnostic.

`DIVIDERS`, `ALIGN`, and `IMAGEHEIGHT` are generic per-item presentation options,
needed to preserve the old role-description treatment without hard-coding "roles"
inside the renderer. Normal folder inclusion inherits surrounding presentation and
does not insert headings. Migrations set the old role-list presentation explicitly.

### Stable folders

Do not ship editable-folder references that depend solely on path rewriting.
Folder rename/move currently rebuilds paths, and cells live outside the files doc.

- Retain `folders: string[]` for compatibility and add optional folder identity
  metadata, e.g. `folderIds: Record<folderId, normalizedPath>`.
- Use fixed reserved IDs for pinned roots, including About Role. Existing ordinary
  folders acquire IDs on an explicit operator mutation/selection or upgrade, never
  by a reader creating random IDs during render.
- New references carry ID and a readable path. Resolve ID first; if an ID is
  missing, do not fall back to a newly created folder at its old path.
- Index explicit and implied parent folders consistently and case-insensitively.
  Reject malformed IDs, duplicate identity/path assignments, and ambiguous paths.
- Update every document mutation: create/rename/move/delete/clone/copy folders,
  descendant handling, and file moves that imply folders. Existing object literals
  rebuilding `{files, folders}` must not drop the new metadata.
- Rename/move preserves IDs; copy/clone creates new folder IDs. Do not silently
  retarget existing references when copying. Explicit deletion removes identities;
  recreation at the same path is a new identity.
- Readers can derive pinned identities for old documents without writing. Persist
  canonical identity metadata before committing a new ordinary-folder reference.

### Expansion contract

Create a shared resolver for File and Folder includes in standalone script source,
composition source, script islands, and editor previews. Use the same expansion
rules in display, planning, and certification helpers; do not rely on every caller
remembering an extra flattening step.

- Expand folder members into live File includes at evaluation time, with their own
  declared defaults and existing file-input cleanup. No folder-wide input override
  namespace in the initial feature; use files/wrappers for customized calls.
- Preserve containment under Nav Button and presentation groups. Flattening file
  includes must not flatten navigation children into the parent output.
- Display folder includes only render display files. Trigger/tag files must never
  execute merely because they share a folder with display documents.
- For "any script" support, apply the existing caller-role contract: trigger
  contexts may include compatible trigger files; display contexts include display
  files. Excluded incompatible members receive diagnostics. Nav Button itself is
  display-only and invalid in tag triggers or UpdateCell bodies.
- Include paths through folders in cycle detection: a file displaying its own
  containing folder is a cycle. Preserve the current depth guard and add total
  expansion/output limits so a wide folder cannot bypass resource limits.
- Cache by source plus index revision and configuration, including membership
  changes. Do not cache solely by folder path or file timestamps.
- Preserve origin/call-site information for diagnostics and repeated includes.
  Do not run the same expansion twice in a host and then in ScriptRuntime.

## 5. Display compositions and cell ownership

Introduce an explicit composition capability rather than extending `fileOnly` with
unrelated booleans. Suggested modes: general script, display composition, legacy
script island. Migrate current file-cell callers to display-composition mode.

Keep strict `parseFileCell` for code that actually requires a File value/list,
including cell operations. Add `parseDisplayComposition` with a constrained
statement whitelist: File, Folder, CreateMarkdown, CreateDivider, and Nav Button
whose body is another composition. Markdown headings are ordinary Markdown.
Expressions inside these blocks still use normal expression editing.

Do not reinterpret arbitrary legacy prose as executable source. Select composition
mode from the game/record capability and explicit host context, retaining
File-only compatibility detection. Invalid composition source stays editable with
errors; it must not fall back to legacy markdown or silently become an empty list.

### Required ownership extension

Current file-ID reconciliation cannot represent repeated inline blocks, nested
compositions, folder settings, or interleaving those with independently owned files.
This is a prerequisite, not cleanup to postpone until the UI is finished.

- Add stable occurrence identity for new manual non-file display entries, using a
  provenance piece that carries a versioned, encoded composition payload and entry
  ID. A folder entry stores the reference/configuration, not resolved children.
- Keep existing File pieces, sources, tombstones, and file-ID deduplication behavior.
  Do not repurpose a real file ID to identify a Markdown or Folder block.
- Generalize ordering to entry keys while accepting all old file-ID ORDER records.
  Define keys so legacy file references still sort exactly as before.
- For an unchanged existing base, retain its bytes and represent edits through
  attributed additions/removals/order operations. Do not replace the entire raw
  marker stream with the editor's visible source.
- Preserve entry IDs through editor reorder, text/block switches, undo, history,
  and save/reopen. Use editor sidecar identity mapping or internal serialization
  metadata rather than source spans as persisted identity. Define conservative
  matching for externally edited Text source; ambiguous duplicates get fresh
  manual identities, never steal an automatic owner's identity.
- Treat a Nav Button subtree as one attributed display entry for ownership.
  Reconcile its nested edits within that payload, leaving siblings' owners intact.
- Preserve encoded call overrides, tombstones, masked owners, immutable histories,
  and certification rollback. Bulk edits reconcile against each destination.
- Do not widen UpdateCell scalar/tag compatibility just because the display editor
  accepts more blocks. Folder/inline display insertion into those operations is
  out of scope; File-valued writes continue to work unchanged.

Write the mixed-entry round-trip/rollback tests before adopting this representation.
If the existing marker grammar cannot express a case losslessly, extend it
additively; do not settle for a visually correct but destructive save.

## 6. Navigation: one document, many screens

### AST and interpretation

Add a first-class `NavButtonStatement` with label expression and block body.
Use the existing If/ForEach editing patterns for nesting, not an If with a hidden
special condition. Add a navigation render instruction with child instructions.
Folder item presentation may also need a non-navigation group instruction.

The interpreter evaluates children in a child lexical environment, captures their
output under the navigation instruction, and restores the parent's output target.
Children do not leak into the parent instruction list. Keep inputs in the current
flat input namespace. Navigation is not a new user-variable scope.

Chosen semantics: bodies are interpreted for the document independent of the
current screen, but their controls/content are not mounted until entered. This
preserves deterministic submissions/planning and avoids making screen visits
implicitly determine game effects. Back/Forward only changes local presentation.
UpdateCell collection still occurs only in execution/planning contexts that already
permit it, not in click handlers. A bare Return inside Nav Button is a lint error;
real function returns retain normal semantics. Inputs under conditional branches
retain existing language behavior, not a new visibility-based execution rule.

Add one recursive instruction walker and use it everywhere that currently assumes
a flat list: active-input discovery, vote-input detection, interpreter input
metadata lookup, preview counts, and render utilities. Check Markdown instructions
containing further script islands too. Merely walking `navigation.children` will
not cover those embedded runtimes. Add duplicate-input diagnostics without
silently renaming existing keys.

Navigation IDs must distinguish two inclusions of the same file, two identical
labels, and loop-generated buttons. Derive runtime occurrence paths from document,
include call-site, AST location, and iteration occurrence, not label/file ID alone.
Content revisions may invalidate/reset navigation; they must never accidentally
reuse a different subtree with the same label.

### Document-level viewport

Create a shared document navigation host around the complete markdown/composition
display surface. A Nav Button in one script island must replace all root markdown,
other islands, file output, and sibling buttons in that document.

- Refactor the renderer seam into document evaluation/structure and screen
  presentation. Build/register the navigable structure before choosing the
  active screen; do not discover child routes only from mounted controls.
- Every nested MarkdownRenderer/ScriptRuntime joins its nearest document host.
  They must not independently create navigation stacks for CreateMarkdown output.
- Independent documents, such as separate newspaper sections or messages, get
  independent explicit boundaries. The host replaces a document, not the entire
  app/game tab. Rulebook is one boundary; a composed cell preview is another.
- Keep script input/submission state above animated screens. Unmounting the parent
  screen must not erase inputs, repeat defaults, prune hidden-screen state, or
  publish writes. Only visible controls mount; collect valid keys from all pages.
- Reuse `LayoutStateAnimatedView` and `fromRight`, assigning adjacent depth pages
  for arbitrary nested navigation. Extract reusable navigation glue if needed;
  do not change global animation behavior just for this feature.
- Keep a path stack with screen title, scroll position, and return-focus target.
  A child screen has Back/title chrome; returning restores the originating button
  and parent scroll, while a newly entered child begins at the top.
- Integrate native Back with the nearest document stack; root Back still belongs
  to the outer page. Avoid global Escape handlers that steal dialog dismissal.
- Handle rapid taps, animation cancellation, resized content, reduced motion,
  removed/hidden active routes, game/persona changes, and content identity changes.
  Fall back to the nearest valid ancestor, not an unrelated screen.
- Use existing typography/colors and chevron-right disclosure rows. Child content
  is not a modal, accordion, hyperlink to a different tab, or browser URL route.

The runtime/document bridge is the largest design spike. Prove it with static
markdown before and after a script island, nested CreateMarkdown output, and two
independent document instances before integrating About Role.

## 7. Picker and block-editor UX

Add a bottom-left Files / Blocks segmented switch to the insertion chooser:
folder/file icon and blocks icon, with short labels below and distinct selected
background/border states. Keep view controls separate: List / Columns continues
to control only the file-browser layout.

- Files is the default for cell insertion and remembers no state across unrelated
  expression pickers. Selecting a file inserts it directly, without first asking
  the operator to choose a File block.
- Browsing a folder still navigates into it. Add an explicit "Use this folder"
  action; do not turn normal folder opening into accidental insertion.
- Blocks offers Display Markdown, Divider, Heading, and Nav Button. Selecting one
  inserts a real block into the current composition target.
- Heading offers a title/level starter that produces CreateMarkdown. Never
  convert a general Markdown block back into a heading and lose its content.
- The same chooser works inside a Nav Button body and at the root. Preserve the
  insertion target while switching panels, opening new-file editors, or cancelling.
- Folder chips open configuration, not a file editor. The configuration dialog
  lists current eligible members, with visibility controls, reorder controls
  (drag where available plus accessible Move Up/Down), and Preview/Open File.
- Hide changes inclusion at this occurrence, not folder membership or other uses.
  Provide reset-order/show-all actions with clear scope. Draft changes apply only
  on Save and warn on every unsaved dismissal path.
- Show incompatible/excluded files and missing references as diagnostics, without
  allowing a display picker to select trigger content.
- Show resolved item count and an optional hidden-count summary on folder chips;
  leave ID/path/array settings out of the normal canvas.
- Source mode remains available. Preserve unknown/invalid source and flag it,
  rather than dropping blocks outside the normal UI's whitelist.
- Preserve the current expression-picker route and editable missing File inputs.
  The new switch must not regress the previous `fileOnly` expression-routing fix.
- General script editors also offer Folder and Nav Button in appropriate
  categories. Folder settings use the same dialog, not a second implementation.

## 8. About Role and rulebook integration

### About Role

Use the shared composition cell editor for v2 single and bulk About Role editing.
Keep the existing string field and undoable table writes; change its interpretation
only behind the display-composition capability.

Update row previews to friendly resolved labels, add About Role placement/highlight
support, and preserve per-cell history. New role creation in v2 creates/references
an About Role file using the current role-description starter, rather than putting
that markdown directly in the cell. Await file persistence before committing the
role reference; failed saves must not create a dangling role cell.

Resolve About Role in Your Eyes Only, player previews, and rulebook composition
consumers, with the correct operator/shared files index and loading state.
Do not change `roles.entry(...).aboutRole` from a stored string into an unrelated
runtime object; document its source-text contract and provide explicit rendering
resolution at the display seam.

Hide rulebook visibility controls in both Add Role and Edit Role for v2. Do not
clear `hiddenFromRulebook` fields on incidental saves. They remain compatibility
data and migration input for old versions.

### Rulebook

Add an optional `modularContent` source field to RuleBookData; retain legacy
`content`, `roleOrder`, and `roleDescriptionsTitle` as the pre-upgrade snapshot.
The v2 renderer uses modularContent and never appends the legacy descriptions.
An intentionally empty modularContent is valid: do not fall back to legacy content.
Keep `ruleBookTitle` as shared page metadata rather than silently adding a second
title block. The source field is a composition, not necessarily a single file.

The operator uses the composition editor and a separate Edit control. Remove the
whole-preview Pressable in v2 so clicking Nav Buttons does not also open editing.
The player and operator previews render the same document structure; operator
editing affordances do not become player controls.

Build modular TOC entries from composed headings/navigation structure, not raw
source or role-table filters. Entries identify navigation path plus heading anchor;
selecting one first enters the screen, waits for it to mount, then scrolls.
Use occurrence-aware IDs for repeated files/headings. Keep the legacy TOC branch
unchanged. A folder moved elsewhere in the composition moves its TOC entries too.

Folder membership, not the role table, owns v2 rulebook inclusion. Editing an About
Role cell to reference another file does not automatically relocate either file.
Deleting/soft-hiding a role does not delete or hide a reusable description file.
Explain this in role deletion UI: remove/hide the folder item separately. This is
an intentional consequence of replacing the old role-driven rulebook, not a new
hidden synchronization rule.

## 9. Compatibility, defaults, and upgrade

Separate capabilities: retain `migrated` as version >= 1; add `displayModules` as
version >= 2. Do not make `migrated` depend on a latest-version constant.
New games seed version 2 only after the complete files/rulebook seeds succeed.
Register defaults/configuration centrally and disable auto-creation for seeded
records. Loading or missing capability records must not trigger conversions.

Upgrade matrix:

| Stored version | Before explicit upgrade                                  | Upgrade result                                                                                                |
| -------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| v0 / missing   | Existing legacy rulebook and About Role UX               | Existing whole-game safety-copy upgrade also converts About Role/rulebook and completes at v2                 |
| v1             | Existing modular messages, old rulebook/About Role UX    | Explicit "Upgrade rulebook and role descriptions" safety-copy flow; existing message/tag modules pass through |
| v2             | Composition editors/rendering, no role visibility toggle | No migration UI or repeated seed writes                                                                       |

Extend the pure migration input/output to include RuleBookData. The hook must write
the returned rulebook, not its current unchanged source value.

Migration steps:

1. Require confirmed, fully loaded inputs, no pending writes, and no frozen/staged
   replacements. Reuse the existing safety-copy procedure and destination naming.
2. Snapshot legacy role order/visibility before converting cells. Preserve all
   descriptions, including hidden/soft-deleted roles; hidden is not deleted.
3. Convert raw About Role markdown into files under aboutRole and replace the
   cell with File references. Preserve already modular cells and provenance.
4. Build the folder display items from the exact legacy role order and eligible
   set, including appended roles absent from roleOrder. Map to file IDs, not
   persisted role indices. Mark hidden/soft-deleted description files hidden.
5. If an About Role is already a multi-file composition, references files outside
   aboutRole, or shares a file with a differently visible role, create a display
   wrapper file in aboutRole for that role. Its body references existing modules;
   do not duplicate underlying content or move operator-organized source files.
   Simple raw descriptions can use their newly generated file directly.
6. Preserve existing rules in a rules file (or preserve their existing modular
   representation if explicitly known). Build modularContent from the rules
   followed by NavButton -> Folder, preserving custom titles and list presentation.
7. Detect a preexisting unrelated aboutRole folder/file collision. Preview/report
   what would become visible; never silently publish an unrelated file. Hide such
   members by default during conversion, retaining future-new-file auto-inclusion.
8. Save all destination records, identities, and the legacy snapshot. Check
   conversion diagnostics; failures leave the source untouched and no completed
   v2 destination exposed. Write the version marker last, then expose/navigate to
   the completed copy. A rerun on an already completed v2 payload is idempotent.

Never migrate real records during development or tests. Do not rewrite save
histories, certification snapshots, private field histories, or scheduled payloads.
Do not automatically backfill all v1 games through a mounting hook.

No new Convex tables/schema or migrations component is currently required: the
records already store serialized application values. Use additive application
fields and dual readers; retain legacy readers indefinitely while v0/v1 are
supported. Old frontend bundles do not understand v2; only expose the upgrade after
the new readers/writers ship, and warn against editing a v2 game from an old tab.
Do not bump the app version or deploy the backend without an explicit request.

## 10. Cross-cutting integration

- Usage graph: include About Role, modular rulebook roots, Folder membership edges,
  and nested Nav bodies. Distinguish "used through folder" from an explicit File
  placement. Hidden folder members do not become reachable through that occurrence,
  but direct references elsewhere still count. Recompute when membership/config
  changes; do not persist expanded placement lists.
- Placement navigation: extend `PlacementCellKind`, chip labels, Files-page routing,
  and `CellHighlight` matching for About Role and rulebook. Rulebook destinations
  open the rulebook screen, not a nonexistent table cell.
- File cleanup: ensure new AST bodies/payloads are visited by input-contract
  cleanup, retargeting, markdown-input rename/reference checks, and invalid-input
  linting. Preserve histories. Folder children use the same cleaned File semantics.
  Make rulebook cleanup version-aware: clean active modularContent, not the retained
  legacy snapshot fields. The current generic recursive content cleaner does not
  distinguish those fields automatically.
- Language traversal: audit every Statement-kind switch, including parser/printer,
  reducer body lookup/update, expression location paths, cloning, drag/drop,
  selection, function inference, closure/input discovery, block colors, source
  serialization, linting, and file-reference/path rewriting. Adding only Canvas
  rendering would leave nested blocks uneditable or invisible to other systems.
- Capability enforcement: Nav/display groups are invalid in UpdateCell bodies
  and tag-trigger display contexts. Folder inclusion must not evade file-role
  checks, scalar column restrictions, or planning resource bounds.
- Data ownership: use read-only shared file access for players/previews/sim personas.
  Do not create empty persona-local scriptFiles/rulebook records. Never route a
  player through an operator-owned writable hook just to resolve content.
- Privacy: folder hiding and Nav nesting are presentation only. Existing PUBLIC
  files/role records can still be read; these controls are not spoiler security.
- Staging: editor drafts and staged replacements remain private/unpublished.
  New shared file edits are separately persisted, as today; cancelling a cell
  composition must not claim to roll those edits back. Explain that distinction.
- Responsive/dialog rules: content-width breakpoints for pages, viewport width
  for dialogs, ShadowScrollView, modal-safe tooltips, unsaved-change confirmation,
  no swipe dismissal for editable dialogs, and keyed ConvexDialog portals.

## 11. Implementation sequence and gates

Do not begin with About Role UI. Establish the two hard primitives first.

### Phase A: fixtures and data contracts

Freeze syntax, folder identity metadata, v1/v2 capability semantics, and mixed-entry
ownership format. Create legacy/v1/v2 fixtures containing hidden/deleted/shared
roles, customized role order, staged data, existing provenance, and folder
collisions. Add parser/serializer fixtures and a pure upgrade preview.

Gate: old fixtures round-trip unchanged; new syntax/config can round-trip without
dropping IDs, bodies, order, or visibility.

### Phase B: folder resolution

Implement identities/index/CRUD and shared include expansion. Add Folder source
support, role-aware member selection, diagnostics, traversal, cache invalidation,
and bounded cycles. Support nested bodies before exposing the picker.

Gate: File-only behavior is unchanged; folder members stay live across source
edits, file/folder moves, rename, deletion, copy, and recreation.

### Phase C: document navigation spike, then complete runtime

Implement Nav AST and instruction trees, recursive discovery, document-level
viewport, shared input lifetime, scroll/focus restoration, and nested animation.
Test a button inside CreateMarkdown/script islands as well as direct composition.
Prototype the item presentation group needed by folder separators/alignment.

Gate: all surrounding document content leaves, arbitrary nesting works, independent
documents stay independent, and navigation visits never affect submission updates.
If the current recursive markdown pipeline cannot satisfy this cleanly, refactor
the evaluation/render seam here, before shipping dependent UI.

### Phase D: composition reconciliation and editor

Implement mixed-entry ownership/ordering and history identity. Then build the
Files/Blocks chooser, Folder settings, nested Nav canvas, inline display blocks,
Source support, errors, and previews. Update all existing message/custom Files
cell entry points to the shared composition mode without enabling extra column
operation types.

Gate: save/reopen/bulk-edit/undo and automatic-source rollback preserve independent
owners for mixed File/Folder/Markdown/Divider/Nav compositions.

### Phase E: About Role and rulebook integration

Wire all single/bulk editors, row labels, player/preview displays, usage graph,
placement routing, rulebook editor, and modular TOC. Implement v2-gated visibility
UI removal in Add Role and Edit Role. Keep legacy components behind the old branch.

Gate: the rulebook has exactly one composed source of rendered content and every
About Role consumer resolves the same source correctly.

### Phase F: new-game seeds and explicit upgrade

Extend the pure migration and safety-copy hook, including wrapper generation,
titles/order/visibility, collision handling, and capability versioning. Seed new
games with folder identities, files/default vote, and modular rulebook; await those
writes before version-2 completion and navigation. Prefer exposing the game record
last so partial seeds are not advertised as a ready game.

Gate: new games and copies behave correctly; an upgraded copy can be verified
without modifying the original; no mount triggers writes or repeated defaults.

### Phase G: offline UI and cross-platform verification

Run all regressions plus new simulator-only suites. Verify desktop, narrow mobile,
expanded sim sidebar, touch interactions, and web/native build compatibility.
Manually verify native Back/animation/accessibility where browser tests cannot.
Do not use production/backend games for validation.

## 12. Main implementation map

| Responsibility                                          | Existing files to change or use                                                                                                                                                                                  |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| File/folder models, include expansion, traversal, graph | `utils/scriptFiles.ts`, `hooks/useScriptFiles.ts`, `hooks/useFilePlacements.ts`                                                                                                                                  |
| Mixed composition provenance                            | `utils/cellPieces.ts`, relevant checks in `utils/cellOps.ts`, `utils/cellColumnTypes.ts`, `utils/fileInputCleanup.ts`                                                                                            |
| Language/runtime                                        | `script/lang/ast.ts`, `parser.ts`, `printer.ts`; `script/registry.ts`; `script/runtime/interpreter.ts`, `ScriptRuntime.tsx`, `renderers.tsx`; `utils/runMarkdownScriptsWithUpdates.ts`                           |
| Nested block editing                                    | `script/editor/Canvas.tsx`, `ScriptEditorDialog.tsx`, `InsertModal.tsx`, `editorReducer.ts`, `expressionEditor.ts`, `typeInference.ts`, `PreviewPanel.tsx`; `utils/scriptLint.ts`, `utils/markdownFileEditor.ts` |
| Choosers/dialogs                                        | `components/game/scriptFiles/CellFilesEditorDialog.tsx`, `FileBrowserDialog.tsx`, `FileEditorDialog.tsx`; new shared composition insertion and folder settings components                                        |
| Navigation                                              | `components/ui/markdown/MarkdownRenderer.tsx`; new document host/context and instruction-tree helpers; reuse `components/ui/LayoutStateAnimatedView.tsx` and Town Square scroll/back patterns                    |
| Role UI                                                 | `components/game/RoleRow.tsx`, `RoleTable.tsx`, `RoleAddDialog.tsx`, `RoleEditDialog.tsx`, `types/roleTable.ts`                                                                                                  |
| About Role reads                                        | `components/game/YourEyesOnlyPagePLAYER.tsx`, `components/game/markdownEditor/PlayerPreviewModal.tsx`, `script/runtime/sources.ts`                                                                               |
| Rulebook                                                | `types/ruleBook.ts`, `RuleBookPageOPERATOR.tsx`, `RuleBookPagePLAYER.tsx`, `ruleBook/TableOfContentsDialog.tsx`, `utils/parseHeadings.ts`; retain legacy description components                                  |
| Placement UI                                            | `scriptFiles/PlacementChips.tsx`, `FilesPageOPERATOR.tsx`, `OperatorGamePage.tsx`, `CellHighlight.tsx`                                                                                                           |
| Capability and seeds                                    | `utils/legacySystems.ts`, `utils/dataConfig.ts`, `utils/legacyMigration.ts`, `hooks/useMigrateEverything.ts`, relevant upgrade config UI, `NewWolffspointButtonAndDialogue.tsx`                                  |

New helpers should separate folder resolution, instruction-tree walking, document
navigation, and display composition reconciliation instead of adding all of this
to the already large Canvas/ScriptEditorDialog files.

## 13. Acceptance and regression tests

### Pure tests

- Language: nested Nav parse/print/parse, labels/expressions, invalid bodies,
  reducer targets/undo, File input rename/cleanup inside new bodies.
- Folder: direct/recursive enumeration, deterministic ordering, new members,
  per-occurrence hidden/order settings, unknown/deleted IDs, rename/move/copy,
  path reuse, implicit folders, mixed roles, folder/file include cycles and bounds.
- Ownership: interleaved old file pieces and new inline entries, identical Markdown
  blocks, two uses of one folder with different settings, changed File overrides,
  manual reorder plus tag/certify rollback, masked pieces, and bulk destinations.
- Navigation: output trees, repeated files/labels, loop occurrences, nested Markdown
  script islands, hidden inputs retained, nested vote detection, input metadata,
  unchanged planned updates regardless of visited screens, and resource limits.
- Migration: v0->v2 and v1->v2, exact visible legacy order, custom titles, hidden and
  deleted descriptions, shared/out-of-folder/multi-file wrappers, collisions,
  empty rules/descriptions, existing module/provenance preservation, idempotency,
  unchanged original, partial-write failure, and refusal of pending/staged inputs.
- Defaults: version gating/loading, v1 remains modular rather than "legacy again",
  no automatic writes, v2 empty rulebook never resurrects the legacy list.

### Offline UI tests

- File selection remains direct; Files/Blocks selection is clear and independent
  of List/Columns. All nested targets survive chooser switches and cancellation.
- Add/edit About Role, inline Markdown/Heading/Divider, Folder settings, nested Nav,
  Source mode and history; save/reopen and bulk edit retain content.
- Folder click edits order/visibility; ordinary browser folder click still browses.
  A new folder member appears automatically without editing the include source.
- Rulebook starts with rules plus the Role Descriptions Nav; entering hides rules
  and all siblings, Back restores position/focus, nested nav behaves identically.
- TOC enters the correct subtree before scrolling; repeated headings/files target
  distinct instances. Operator navigation does not open the edit dialog.
- About Role resolves in real player, preview, and simulated persona views, with
  no local empty records shadowing shared files.
- V2 Add/Edit Role lacks visibility toggles; v0/v1 keeps them and old rulebook
  behavior. Folder hiding does not mutate role flags or other folder occurrences.
- Narrow screens, touch, keyboard-only, unsaved dismissal, rapid Back/taps, live
  content updates, reduced motion, and idle-write-loop detection.

### Baseline verified during planning

No application code was changed. On the inspected tree:

- `./node_modules/.bin/tsc --noEmit`: passed.
- `npm run test:cell-modules`: 35 passed.
- `npm run test:markdown-files`: 17 passed.
- `npm run test:certification`: 30 provenance + 34 live tests passed.
- `npm run test:cell-columns`: 14 passed, including existing migration cases.
- `npm run test:file-inputs`: 8 passed.

These 138 passing tests establish the existing baseline; none implements or proves
the proposed features. Browser/native tests were not run for this planning task.
Implementation must rerun them plus the new suites, targeted ESLint/Prettier,
`git diff --check`, and cross-platform Expo compilation.

## 14. Product choices to confirm

The plan uses these defaults so implementation need not guess:

1. Recursive folders, new files automatically visible, per-include visibility/order.
2. Nav hides rendering, not evaluation; existing input/certification semantics stay
   independent of screen visits.
3. Explicit safety-copy upgrade for existing v1 games, rather than silent mutation.
4. Folder membership becomes authoritative: deleting/hiding a role does not
   automatically remove its reusable files from the rulebook.
5. Heading is a Markdown shortcut; display folder presentation has generic flags
   rather than a hard-coded "role descriptions" renderer.

The original request does not fully specify these lifecycle details. They are
deliberate recommendations, not verified user preferences. Confirm or adjust them
before implementation; do not represent the plan as eliminating those decisions.
