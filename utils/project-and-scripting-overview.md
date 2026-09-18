# Wolffspoint Project and Scripting Overview

## What the application is

Wolffspoint is an operator-managed companion application for a long-running, real-life Mafia-style game. A game can span multiple real days per in-game day.

There are three relevant capabilities:

- **Operator:** configures the game, roles, schedules, players, messages, table columns, scripts, nightly results, and newspaper content.
- **Player:** reads private role and morning information, submits votes and role actions, and reads released newspaper content.
- **Newser:** works with newspaper content without receiving the operator's full game-management capability.

The operator's `userTable` is the certified game record. Player submissions do not immediately mutate it. Players write per-day submissions, the operator reviews them in the Nightly tab, and certification copies the selected submission type into the table and applies its scripted side effects.

## Main persisted game data

The application stores user-owned values and list items through the DataProvider hooks in `wolffspoint/hooks/useData.ts`. Convex synchronizes those records and enforces their privacy settings. See `utils/about-parts-of-this-codebase/userVariables-system.md` for the full data system reference.

Important records include:

- `roleTable`: role definitions, role descriptions (`aboutRole`), action messages (`roleMessage`), optional vote-message overrides (`voteMessage`), voting eligibility (`doesRoleVote`), and visibility (`isVisible`).
- `voteMessageDefault`: the game-wide vote-message fallback inherited by roles without an override.
- `userTable`: players, role assignments, living state, player columns, and certified per-day data (`days[]` entries with `vote`, `action`, `voteMultiplier`, `voteInputs`, `extraColumns`).
- `userTableTitle`: names of operator-defined player (`extraUserColumns`) and day (`extraDayColumns`) columns.
- `dayDatesArray`: the calendar start date of each in-game day, stored as `MM/DD/YYYY` strings.
- `numberOfRealDaysPerInGameDay`: fallback span for the final day when no next start date exists.
- `selectedDayIndex`: the operator's currently selected day in the players/nightly tabs.
- `skipVotingDays` / `skipActionsDays`: arrays of day indices where the vote or action form is replaced with a "skipped" notice.
- `morningMessagesList`: operator-authored per-player messages keyed by lowercase email → array indexed by day, released on later days.
- `gameSchedule-{gameId}`: vote/action deadlines (`voteDeadlineTime`, `actionDeadlineTime`, `voteDayOffset`, `actionDayOffset`), `wakeUpTime`, `publicVoting`, and `timezone`.
- `playerNightSubmission-day-{N}-{gameId}`: each player's uncertified vote, `voteInputs`, `voteInputKey`, `voteMultiplier`, action input map, and planned cell updates (`plannedUpdates`, `votePlannedUpdates`) for a day. Owned per-player, `PUBLIC` so the operator's Nightly tab can read them via `useFindValues`.
- `tagTriggers-{gameId}`: scripts that run when tags are added to or removed from table cells, keyed by tag name.
- `playerProfile-{gameId}`: per-player profile (in-game name, bio markdown, contact info) for the phone book.

Game-wide operator records are generally public so participating clients can read them, while UI capability and ownership determine who can manage them. Table-freeze workflows stage edits as scheduled updates (`record.scheduledUpdate`); players always see the published `record.value`.

## Role action and vote messages

Each role can have two interactive markdown documents:

- **Role Message (`roleMessage`):** the action form shown in the Action area of Your Eyes Only.
- **Vote Message (`voteMessage`):** the vote form shown in the Vote area of Your Eyes Only.
- **About (`aboutRole`):** the role description shown at the top of Your Eyes Only.

Vote messages use a shared fallback. Clicking the Vote Message column header edits that default; clicking a role's cell edits that role's override. Existing roles without an override inherit the default.

The built-in default is:

```text
/*script
CreateSelectVoteInput({
  LIST = players.Filter(Item => (Item.entry("isAlive") == true)),
  LABEL = "Vote",
  NUMSELECTABLE = 1,
  MULTIPLYER = 1,
});
script*/
```

Markdown outside script blocks renders as normal player-facing content. Script blocks are delimited by `/*script` and `script*/` and render their output inline with that markdown. Markdown can also contain inline `/["label": TYPE]/` input tokens (text, player-alive/dead/all dropdowns, role dropdowns), which write into the same input-state map as scripted inputs.

## The built-in scripting system

The scripting system is an internal, block-editable language rather than JavaScript. Its main layers are:

1. `wolffspoint/script/lang`: AST, parser, printer, and language analysis.
2. `wolffspoint/script/registry.ts`: definitions for statement and expression blocks plus the `TableUpdate` type.
3. `wolffspoint/script/editor`: visual block editor, insertion palette, type hints, and player preview.
4. `wolffspoint/script/runtime/interpreter.ts`: evaluates scripts with bounded fuel/depth and emits render instructions or planned effects.
5. `wolffspoint/script/runtime/renderers.tsx`: turns render instructions into React Native controls.
6. `wolffspoint/components/ui/markdown/MarkdownRenderer.tsx`: combines markdown blocks with script runtime output.

### Statement kinds (AST)

- `BlockStatement`, `ExpressionStatement`
- `IfStatement` — `If (cond) { ... }` / `IfElse`
- `ForEachStatement` — `ForEach (item in list) { ... }`
- `FunctionStatement` / `ReturnStatement` — user-defined functions
- `UpdateCellStatement` — the `UpdateCell` table-write block (below)
- `OnTagAddedStatement` / `OnTagRemovedStatement` — container blocks used inside tag trigger scripts

### Where scripts run

There are exactly **two** places scripts execute:

1. **Role / vote / morning markdown** — `/*script ... script*/` blocks rendered through `MarkdownRenderer` → `ScriptRuntime`. Only these have input blocks, because only player-facing forms have input state. At input time, `UpdateCell` blocks are partially evaluated into `PlannedUpdate`s (see below); at certify time the stored planned updates execute against the table.
2. **Tag triggers** — stored per-game in `tagTriggers-{gameId}`, edited from `AddTagDialog` in edit mode. They run when a tag is added to or removed from a cell. They have **no input state** (input blocks are hidden via `hideInputs` on `ScriptEditorDialog`), and instead use trigger globals (`placedTag`, `placedUser`, `placedDay`, `placedColumn`) plus `OnTagAdded { }` / `OnTagRemoved { }` container blocks — the interpreter's `triggerMode` decides which containers execute.

### Script globals

Scripts receive capability-dependent globals built by `createScriptGlobals` in `wolffspoint/script/runtime/sources.ts`:

- `players`: flattened player records — `realName`, `email`, `userId`, `role`, `isAlive`, a `days` array (`vote`, `action`, `morningMessage`, plus each extra day-column title), plus each extra user-column title merged in at the top level. Tag cells keep their encoded `[/TAG: "Name"/]` contents, so `.contains(tag("Name"))` works on them.
- `roles`: visible role records (all roles for operator capability).
- `currentPlayer`: the flattened record of the current player — only set when `capability === 'player'`.
- `currentDay`: zero-based current day index.
- `dayDates`: the stored `MM/DD/YYYY` day strings.
- `schedule`: the normalized game schedule.
- `profiles`: player profiles where provided.
- `Inputs`: submitted input values keyed by input label.
- `InputsWithData`: `.entry("label")` resolves a selected value back to its full source object (e.g. the player record behind a dropdown option).
- Trigger scripts only: `placedTag`, `placedUser`, `placedDay`, `placedColumn`.

Inputs are stored as strings. Multi-select controls store a JSON-encoded string array, which `decodeStoredInputState` in `script/runtime/values.ts` decodes before evaluating `Inputs` and `InputsWithData`.

### Builtins and notable blocks

- `tag("Name")` — returns the encoded tag string `[/TAG: "Name"/]`; use with `.contains()` to test cell contents (`currentPlayer.entry("Column").contains(tag("Infected"))`). A builtin in `interpreter.ts`, also in `InsertModal` under "Data".
- `Var("name")` — reads a script global/variable by name.
- `Variable` — statement that defines a script variable.
- `CreateMarkdown` / `CreateDivider` — display blocks that emit rendered markdown / a divider.
- `UpdateCell` — statement that plans a table write: `PLAYER` (expression; `nothing` targets all players), `DAY` (number; `nothing` targets a player-level column), `COLUMN` (string title or a built-in field), `VALUE` (expression), `MODE` (`replace` / `append` / `remove`). In `replace` mode the previous cell value is captured as `previousCell`.
- List/data expressions: `Filter`, `Map`, `Sort`, `Length`, `First`, `Last`, `Get`, `Contains`, `Count`, `Join`, `.entry(key)`, `.index(pos)`, `.append`, `.replace`, `.concat`, `.contains`, `.startsWith`, `.endsWith`, `.upper`, `.lower`, `.toString`, `.toNumber`, math blocks (`Round`, `abs`, `MinMax`, `toPowerOf`, `Root`, `Trig`, `LogExp`, `Sign`).

## Input blocks

Action and vote markdown can render normal supplemental controls:

- `CreateSelectInput` — `LIST`, `LABEL`, `NUMSELECTABLE` (>1 renders a multi-select and stores a JSON array).
- `CreateTextInput`, `CreateNumberInput` (`MIN`/`MAX`), `CreateCheckbox` (`DEFAULT`).

Vote markdown also has `CreateSelectVoteInput`. It uses the same single/multi-select renderer and options as a normal input, but marks one response as the certified vote. Its arguments are:

- `LIST`: selectable values, normally a filtered `players` list.
- `LABEL`: form label and input-state key.
- `NUMSELECTABLE`: maximum selected targets. Values above one enable multi-voting.
- `MULTIPLYER`: vote weight certified into `DayData.voteMultiplier`.

For player objects, the special vote input stores email addresses as stable target identifiers while displaying names and emails. Other controls in the same vote message are supplemental vote responses. They are retained with the certified day and shown when the operator opens the vote cell, but they are not rendered as vote targets in the table or counted by the newspaper.

## Player submission flow

`YourEyesOnlyPagePLAYER.tsx` gates on the sleep window and per-day release (`hasWokenUp`), then mounts `YourEyesOnlyDayContentPLAYER.tsx`, which loads the player, role, schedule, table sources, messages, skip-day lists, and the player's current per-day submission (`playerNightSubmission-day-{N}-{gameId}`).

Day timing is zone-aware (`resolveGameTimeZone` → `schedule.timezone` else device zone):

- `getCurrentPlayableDayIndex` — which in-game day "today" is.
- `isDayContentReleased` / `isDayReleasedAtTime` — wake-up gating for day content and morning messages.
- `isNightWindowOpen` — whether the vote/action deadline window is still open for the selected day.
- `skipVotingDays` / `skipActionsDays` — replace the respective form with a skipped notice.

For votes:

1. The role override or shared default vote markdown is rendered.
2. Input changes update `submission.voteInputs` immediately.
3. The special vote input is identified via `inspectMarkdownVoteInput`.
4. Its selected target or targets become `submission.vote` (string or string array; `SKIP_VOTE` for explicit skips).
5. Its `MULTIPLYER` becomes `submission.voteMultiplier`.
6. `UpdateCell` effects from the vote script are planned into `votePlannedUpdates`.

For actions:

1. Role and morning markdown inputs update `submission.action`.
2. Their `UpdateCell` effects are planned into `plannedUpdates`.

Vote and action deadlines remain independent. Skipped voting and skipped-action days bypass their respective forms.

## Planned `UpdateCell` effects

`UpdateCell` does not mutate the operator table while a player is filling in a form. `planMarkdownScriptUpdates` (`utils/runMarkdownScriptsWithUpdates.ts`) partially evaluates it into a `PlannedUpdate`:

- input values and context variables are resolved at submission time;
- operations that need the final cell value remain as expression strings (`updateExpression`);
- certification evaluates those expressions against the current table via `executePlannedUpdates` (`utils/executePlannedUpdates.ts`).

This allows multiple submissions to append to or remove from the same cell sequentially without every submission overwriting the earlier result.

Updates can target player columns, day columns, and built-in fields such as `vote`, `action`, `voteMultiplier`, `livingState`, and `morningMessage` (morning-message updates are applied separately via `executeMorningMessagePlannedUpdates`). Net tag changes caused by certification then invoke tag-trigger scripts via `fireTagTriggersForNetChanges` (`hooks/useTagTriggers.ts`).

Vote scripts and action scripts have separate planned-update arrays (`votePlannedUpdates` vs `plannedUpdates`). Certifying votes applies only vote updates; certifying actions applies only action updates.

## Nightly review and certification

The Nightly tab (`NightlyPageOPERATOR.tsx`) reads all `playerNightSubmission-day-{N}-{gameId}` records for the selected day through `useFindValues`. Its review dialog groups each player's data into:

- vote targets, vote weight, and vote-script cell updates;
- action responses and action-script cell updates.

The operator can independently choose:

- **Add Votes To Table:** certifies vote targets, supplemental vote responses, vote multiplier, and vote-script updates.
- **Add Actions To Table:** certifies action responses and action-script updates.

Both paths preserve existing table fields from the other submission type.

## Certified vote representation and compatibility

A certified `DayData.vote` accepts either:

- a legacy single string target;
- a JSON-array string produced by older transitional data;
- a string array for current multi-votes;
- `SKIP_VOTE` for an explicit skipped vote.

All vote readers normalize these forms through `normalizeVoteTargets` (`utils/multiplayer.ts`). This keeps old certified games displayable while allowing current multi-vote data.

The player and nightly tables resolve every normalized email to a player name. The vote-cell editor shows comma-separated targets and the supplemental vote responses. The newspaper counts each selected target separately and applies the player's vote multiplier to every selected target. Public-voting details continue to associate the voter with each target they selected.

## Newspaper flow

`NewspaperPreviousDayVoteSummary.tsx` reads the previous certified day from the operator's `userTable`. It:

1. normalizes each player's legacy or current vote representation;
2. handles `SKIP_VOTE` separately;
3. adds `voteMultiplier` to every selected target;
4. builds voter lists for public-voting details;
5. sorts targets by weighted totals.

Only certified table data appears in newspaper vote results; changing an uncertified player submission has no newspaper effect.

## Operator "Preview As Player"

`components/game/TableRowPreview.tsx` wraps the operator tables (players, days, nightly) and registers each row's preview target (`{ kind: 'player', email, dayIndex? }` or `{ kind: 'role', roleName }`). Hovering a row reveals a floating Preview pill; clicking it opens `components/game/markdownEditor/PlayerPreviewModal.tsx`.

The preview **emulates the player**, it does not just render markdown:

- `scriptSources` are built with `capability: 'player'`, `currentUserId`/`currentEmail` from the selected player, and `currentDay` = the previewed day index — so `currentPlayer`, tag checks, day checks, and `players` filters evaluate exactly as they would for that player on that day.
- An **emulated "now"** is placed just after `wakeUpTime` on the previewed day's start date (in the game's timezone). Release gating, deadline windows, and the countdown all evaluate against that simulated instant — selecting a day means "believe it is that day," regardless of the real clock.
- The player's real `playerNightSubmission-day-{N}-{gameId}` record seeds the emulated vote/action input state (including `SKIP_VOTE`), so scripts that branch on `Inputs` show what the player actually submitted; operators can still edit the state freely — nothing is saved.
- `skipVotingDays` / `skipActionsDays` replace the respective form with the same "skipped" notice players see; vote/action lock state and deadlines are computed the same way as `YourEyesOnlyDayContentPLAYER`.
- The role editor's role-scoped preview uses the same modal, restricted to players holding that role.

## Important extension rules

When extending this system:

- Add script behavior through registry blocks and interpreter/runtime metadata rather than parsing source text ad hoc.
- Keep player submission state separate from certified `userTable` state.
- Plan table updates at input time and execute them only for the certified submission type.
- Normalize vote values at every display/counting boundary to retain backward compatibility.
- Preserve full option metadata so `InputsWithData` can resolve selected player or role objects.
- Keep vote targets distinct from supplemental vote-form inputs.
- Keep the player preview in sync with `YourEyesOnlyDayContentPLAYER` — new player-facing gating (locks, skips, releases) must be emulated there too.
- Verify role editor preview, player input, Nightly review, table display, download/export, and newspaper counting together when changing stored vote shapes.
