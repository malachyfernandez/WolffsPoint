# Wolffspoint Project and Scripting Overview

## What the application is

Wolffspoint is an operator-managed companion application for a long-running, real-life Mafia-style game. A game can span multiple real days per in-game day.

There are three relevant capabilities:

- **Operator:** configures the game, roles, schedules, players, messages, table columns, scripts, nightly results, and newspaper content.
- **Player:** reads private role and morning information, submits votes and role actions, and reads released newspaper content.
- **Newser:** works with newspaper content without receiving the operator’s full game-management capability.

The operator’s `userTable` is the certified game record. Player submissions do not immediately mutate it. Players write per-day submissions, the operator reviews them in the Nightly tab, and certification copies the selected submission type into the table and applies its scripted side effects.

## Main persisted game data

The application stores user-owned values and list items through the DataProvider hooks in `hooks/useData.ts`. Convex synchronizes those records and enforces their privacy settings.

Important records include:

- `roleTable`: role definitions, role descriptions, action messages, optional vote-message overrides, and voting eligibility.
- `voteMessageDefault`: the game-wide vote-message fallback inherited by roles without an override.
- `userTable`: players, role assignments, living state, player columns, and certified per-day data.
- `userTableTitle`: names of operator-defined player and day columns.
- `playerNightSubmission-day-{N}-{gameId}`: each player’s uncertified vote, vote form responses, action responses, and planned cell updates for a day.
- `morningMessagesList`: operator-authored per-player messages released on later days.
- `gameSchedule-{gameId}`: vote/action deadlines, release times, and public-voting behavior.
- `tagTriggers-{gameId}`: scripts that run when tags are added to or removed from table cells.

Game-wide operator records are generally public so participating clients can read them, while UI capability and ownership determine who can manage them.

## Role action and vote messages

Each role can have two interactive markdown documents:

- **Role Message:** the action form shown in the Action area of Your Eyes Only.
- **Vote Message:** the vote form shown in the Vote area of Your Eyes Only.

Vote messages use a shared fallback. Clicking the Vote Message column header edits that default; clicking a role’s cell edits that role’s override. Existing roles without an override inherit the default.

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

Markdown outside script blocks renders as normal player-facing content. Script blocks are delimited by `/*script` and `script*/` and render their output inline with that markdown.

## The built-in scripting system

The scripting system is an internal, block-editable language rather than JavaScript. Its main layers are:

1. `app/script/lang`: AST, parser, printer, and language analysis.
2. `app/script/registry.ts`: definitions for statement and expression blocks.
3. `app/script/editor`: visual block editor, insertion palette, type hints, and player preview.
4. `app/script/runtime/interpreter.ts`: evaluates scripts with bounded fuel/depth and emits render instructions or planned effects.
5. `app/script/runtime/renderers.tsx`: turns render instructions into React Native controls.
6. `app/components/ui/markdown/MarkdownRenderer.tsx`: combines markdown blocks with script runtime output.

Scripts receive capability-dependent globals such as:

- `players`: flattened player records, including custom columns and per-day entries.
- `roles`: visible role records.
- `currentPlayer`: the current player in player-capability contexts.
- `currentDay`: zero-based current day index.
- `dayDates` and `schedule`.
- `Inputs`: submitted values keyed by input label.
- `InputsWithData`: selected values resolved back to their full source objects.

Inputs are stored as strings. Multi-select controls store a JSON-encoded string array, which the runtime decodes before evaluating `Inputs` and `InputsWithData`.

## Input blocks

Action and vote markdown can render normal supplemental controls:

- `CreateSelectInput`
- `CreateTextInput`
- `CreateNumberInput`
- `CreateCheckbox`

`CreateSelectInput` supports `NUMSELECTABLE > 1`; the renderer then displays a multi-select control and stores all selected values.

Vote markdown also has `CreateSelectVoteInput`. It uses the same single/multi-select renderer and options as a normal input, but marks one response as the certified vote. Its arguments are:

- `LIST`: selectable values, normally a filtered `players` list.
- `LABEL`: form label and input-state key.
- `NUMSELECTABLE`: maximum selected targets. Values above one enable multi-voting.
- `MULTIPLYER`: vote weight certified into `DayData.voteMultiplier`.

For player objects, the special vote input stores email addresses as stable target identifiers while displaying names and emails. Other controls in the same vote message are supplemental vote responses. They are retained with the certified day and shown when the operator opens the vote cell, but they are not rendered as vote targets in the table or counted by the newspaper.

## Player submission flow

`YourEyesOnlyDayContentPLAYER.tsx` loads the player, role, schedule, table sources, messages, and current per-day submission.

For votes:

1. The role override or shared default vote markdown is rendered.
2. Input changes update `voteInputs` immediately.
3. The special vote input is identified from its runtime instruction.
4. Its selected target or targets become `submission.vote`.
5. Its `MULTIPLYER` becomes `submission.voteMultiplier`.
6. `UpdateCell` effects from the vote script are planned into `votePlannedUpdates`.

For actions:

1. Role and morning markdown inputs update `submission.action`.
2. Their `UpdateCell` effects are planned into `plannedUpdates`.

Vote and action deadlines remain independent. Skipped voting and skipped-action days bypass their respective forms.

## Planned `UpdateCell` effects

`UpdateCell` does not mutate the operator table while a player is filling in a form. Instead, the interpreter partially evaluates it into a `PlannedUpdate`:

- input values and context variables are resolved at submission time;
- operations that need the final cell value remain as expressions;
- certification evaluates those expressions against the current table.

This allows multiple submissions to append to or remove from the same cell sequentially without every submission overwriting the earlier result.

Updates can target player columns, day columns, and built-in fields such as `vote`, `action`, `voteMultiplier`, `livingState`, and `morningMessage`. Net tag changes caused by certification can then invoke tag-trigger scripts.

Vote scripts and action scripts have separate planned-update arrays. Certifying votes applies only vote updates; certifying actions applies only action updates.

## Nightly review and certification

The Nightly tab reads all player submission records for the selected day. Its review dialog groups each player’s data into:

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

All vote readers normalize these forms through `normalizeVoteTargets`. This keeps old certified games displayable while allowing current multi-vote data.

The player and nightly tables resolve every normalized email to a player name. The vote-cell editor shows comma-separated targets and the supplemental vote responses. The newspaper counts each selected target separately and applies the player’s vote multiplier to every selected target. Public-voting details continue to associate the voter with each target they selected.

## Newspaper flow

`NewspaperPreviousDayVoteSummary.tsx` reads the previous certified day from the operator’s `userTable`. It:

1. normalizes each player’s legacy or current vote representation;
2. handles `SKIP_VOTE` separately;
3. adds `voteMultiplier` to every selected target;
4. builds voter lists for public-voting details;
5. sorts targets by weighted totals.

Only certified table data appears in newspaper vote results; changing an uncertified player submission has no newspaper effect.

## Important extension rules

When extending this system:

- Add script behavior through registry blocks and interpreter/runtime metadata rather than parsing source text ad hoc.
- Keep player submission state separate from certified `userTable` state.
- Plan table updates at input time and execute them only for the certified submission type.
- Normalize vote values at every display/counting boundary to retain backward compatibility.
- Preserve full option metadata so `InputsWithData` can resolve selected player or role objects.
- Keep vote targets distinct from supplemental vote-form inputs.
- Verify role editor preview, player input, Nightly review, table display, download/export, and newspaper counting together when changing stored vote shapes.
