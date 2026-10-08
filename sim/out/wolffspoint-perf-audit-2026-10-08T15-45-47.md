# WolffsPoint Perf Audit — Simulated Run

- **Started**: 2026-10-08T15:45:47.333Z
- **Run duration**: 198.2s
- **UA**: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/146.0.0.0 Safari/537.36`
- **Viewport**: 1280x900 @ 1x
- **CPU cores**: 12 · **Memory**: 8GB
- **Simulated backend latency**: 20ms

## Summary

| # | Step | Kind | Settle | First paint | Frames | Long tasks | Slowest subtree | Rating |
|---|------|------|--------|-------------|--------|------------|-----------------|--------|
| 1 | Perf audit tour starting | note | 0ms | — | — | 0 | — | 🟢 ok |
| 2 | Phase A — game list | note | 0ms | — | — | 0 | — | 🟢 ok |
| 3 | scroll: game list | scroll | 4ms | 4ms | p95 0ms, 0 slow | 0 | — | 🟢 ok |
| 4 | action: New WolffsPoint dialog open | modal-open | 66ms | 30ms | p95 17ms, 0 slow | 0 | app-root 1ms (2 commits) | 🟢 ok |
| 5 | modal close: New WolffsPoint | modal-close | 183ms | 11ms | p95 17ms, 0 slow | 0 | screen:allGames 1ms (1 commits) | 🟢 ok |
| 6 | Phase B — operator game | note | 0ms | — | — | 0 | — | 🟢 ok |
| 7 | open game: SIMOP1234 (as operator) | navigate | 3795ms | 4ms | p95 308ms, 17 slow | 16 (466ms worst) | app-root 2817ms (523 commits) | 🔴 slow |
| 8 | tab → op:config (cold mount) | tab | 2163ms | 342ms | p95 75ms, 6 slow | 4 (343ms worst) | app-root 799ms (144 commits) | 🔴 slow |
| 9 | tab → op:nightly (cold mount) | tab | 1998ms | 740ms | p95 208ms, 6 slow | 6 (742ms worst) | app-root 1365ms (86 commits) | 🔴 slow |
| 10 | tab → op:forum (cold mount) | tab | 767ms | 236ms | p95 75ms, 4 slow | 2 (250ms worst) | app-root 511ms (97 commits) | 🟡 meh |
| 11 | tab → op:newspaper (cold mount) | tab | 775ms | 208ms | p95 83ms, 2 slow | 2 (208ms worst) | app-root 270ms (27 commits) | 🟡 meh |
| 12 | tab → op:rulebook (cold mount) | tab | 816ms | 120ms | p95 17ms, 1 slow | 1 (120ms worst) | app-root 110ms (16 commits) | 🟡 meh |
| 13 | tab → op:players (warm revisit) | tab | 434ms | 188ms | p95 225ms, 2 slow | 2 (225ms worst) | game-body 384ms (4 commits) | 🟡 meh |
| 14 | tab → op:config (warm revisit) | tab | 157ms | 57ms | p95 75ms, 2 slow | 2 (88ms worst) | app-root 119ms (4 commits) | 🟢 ok |
| 15 | tab → op:nightly (warm revisit) | tab | 117ms | 53ms | p95 58ms, 1 slow | 2 (65ms worst) | app-root 85ms (4 commits) | 🟢 ok |
| 16 | tab → op:forum (warm revisit) | tab | 256ms | 194ms | p95 199ms, 1 slow | 1 (205ms worst) | game-body 224ms (4 commits) | 🟡 meh |
| 17 | tab → op:newspaper (warm revisit) | tab | 716ms | 51ms | p95 17ms, 0 slow | 1 (56ms worst) | app-root 41ms (3 commits) | 🟡 meh |
| 18 | tab → op:rulebook (warm revisit) | tab | 509ms | 191ms | p95 17ms, 1 slow | 1 (195ms worst) | app-root 180ms (3 commits) | 🟡 meh |
| 19 | tab → op:players (warm revisit) | tab | 216ms | 62ms | p95 92ms, 2 slow | 2 (102ms worst) | screen:game 134ms (4 commits) | 🟢 ok |
| 20 | rapid tab cycle (all 6 operator tabs) | action | 1567ms | 3ms | p95 75ms, 5 slow | 7 (199ms worst) | app-root 556ms (15 commits) | 🔴 slow |
| 21 | tab → op:players (warm revisit) | tab | 295ms | 191ms | p95 183ms, 2 slow | 2 (191ms worst) | screen:game 256ms (4 commits) | 🟡 meh |
| 22 | scroll: operator players table (vertical) | scroll | 30ms | 30ms | p95 24ms, 0 slow | 0 | — | 🟢 ok |
| 23 | scroll: players table horizontal | scroll | 23ms | 23ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 24 | tab → op:nightly (warm revisit) | tab | 352ms | 194ms | p95 199ms, 2 slow | 2 (207ms worst) | app-root 299ms (5 commits) | 🟡 meh |
| 25 | scroll: operator nightly | scroll | 375ms | 25ms | p95 17ms, 0 slow | 0 | app-root 7ms (7 commits) | 🟢 ok |
| 26 | modal open: Review/Certify (nightly) | modal-open | 553ms | 531ms | p95 21ms, 1 slow | 1 (534ms worst) | app-root 183ms (5 commits) | 🔴 slow |
| 27 | modal close: Review/Certify | modal-close | 283ms | 134ms | p95 17ms, 1 slow | 1 (134ms worst) | app-root 102ms (4 commits) | 🟡 meh |
| 28 | tab → op:forum (warm revisit) | tab | 257ms | 192ms | p95 199ms, 1 slow | 2 (203ms worst) | app-root 225ms (4 commits) | 🟡 meh |
| 29 | scroll: town square thread list | scroll | 31ms | 31ms | p95 17ms, 0 slow | 0 | app-root 6ms (6 commits) | 🟢 ok |
| 30 | navigate: thread list → thread detail | navigate | 758ms | 4ms | p95 17ms, 2 slow | 1 (454ms worst) | app-root 419ms (16 commits) | 🔴 slow |
| 31 | scroll: thread detail comments | scroll | 29ms | 29ms | p95 17ms, 0 slow | 0 | op-tabs 3ms (2 commits) | 🟢 ok |
| 32 | navigate: thread detail → thread list | navigate | 783ms | 18ms | p95 17ms, 1 slow | 1 (382ms worst) | app-root 358ms (8 commits) | 🔴 slow |
| 33 | navigate: open second thread (warm) | navigate | 498ms | 62ms | p95 42ms, 2 slow | 2 (92ms worst) | app-root 149ms (13 commits) | 🟢 ok |
| 34 | navigate: back to thread list (warm) | navigate | 791ms | 18ms | p95 17ms, 1 slow | 1 (390ms worst) | app-root 370ms (6 commits) | 🔴 slow |
| 35 | modal open: New Thread composer | modal-open | 92ms | 67ms | p95 17ms, 1 slow | 1 (67ms worst) | screen:game 16ms (4 commits) | 🟢 ok |
| 36 | modal close: New Thread composer | modal-close | 184ms | 38ms | p95 17ms, 0 slow | 0 | app-root 23ms (4 commits) | 🟢 ok |
| 37 | tab → op:newspaper (warm revisit) | tab | 867ms | 201ms | p95 17ms, 1 slow | 1 (206ms worst) | app-root 190ms (3 commits) | 🟡 meh |
| 38 | scroll: operator newspaper | scroll | 30ms | 30ms | p95 17ms, 0 slow | 0 | app-root 9ms (7 commits) | 🟢 ok |
| 39 | tab → op:rulebook (warm revisit) | tab | 508ms | 194ms | p95 17ms, 1 slow | 1 (199ms worst) | screen:game 187ms (5 commits) | 🟡 meh |
| 40 | scroll: operator config page | scroll | 175ms | 29ms | p95 17ms, 0 slow | 0 | app-root 3ms (2 commits) | 🟢 ok |
| 41 | navigate: config → rule book subpage | navigate | 7976ms | 3ms | p95 17ms, 1 slow | 1 (349ms worst) | app-root 345ms (16 commits) | 🔴 slow |
| 42 | scroll: operator rulebook (scroll-linked TOC) | scroll | 3051ms | 31ms | p95 17ms, 0 slow | 0 | app-root 8ms (6 commits) | 🔴 slow |
| 43 | modal open: rulebook table of contents | modal-open | 81ms | 5ms | p95 17ms, 1 slow | 1 (67ms worst) | app-root 8ms (5 commits) | 🟢 ok |
| 44 | modal close: rulebook TOC | modal-close | 168ms | 20ms | p95 17ms, 0 slow | 0 | op-tabs 5ms (2 commits) | 🟢 ok |
| 45 | navigate: rule book → config | navigate | 516ms | 6ms | p95 17ms, 1 slow | 1 (130ms worst) | app-root 105ms (8 commits) | 🟡 meh |
| 46 | navigate: config → phone book subpage | navigate | 7989ms | 4ms | p95 17ms, 1 slow | 1 (324ms worst) | app-root 309ms (16 commits) | 🔴 slow |
| 47 | scroll: operator phone book | scroll | 2375ms | 44ms | p95 17ms, 0 slow | 0 | op-tabs 3ms (2 commits) | 🔴 slow |
| 48 | navigate: phone book → config | navigate | 685ms | 15ms | p95 31ms, 1 slow | 1 (290ms worst) | app-root 215ms (9 commits) | 🟡 meh |
| 49 | tab → op:config (warm revisit) | tab | 483ms | 483ms | p95 483ms, 1 slow | 1 (483ms worst) | app-root 449ms (4 commits) | 🔴 slow |
| 50 | scroll: operator roles table | scroll | 47ms | 47ms | p95 17ms, 0 slow | 0 | app-root 4ms (3 commits) | 🟢 ok |
| 51 | navigate → game list | navigate | 675ms | 3ms | p95 17ms, 1 slow | 1 (208ms worst) | app-root 37ms (10 commits) | 🟡 meh |
| 52 | Phase C — player game | note | 0ms | — | — | 0 | — | 🟢 ok |
| 53 | open game: SIMPLY567 (as player) | navigate | 2383ms | 3ms | p95 17ms, 3 slow | 2 (247ms worst) | app-root 410ms (104 commits) | 🔴 slow |
| 54 | tab → player:newspaper (cold mount) | tab | 380ms | 34ms | p95 25ms, 1 slow | 1 (166ms worst) | app-root 178ms (28 commits) | 🟡 meh |
| 55 | tab → player:eyesOnly (cold mount) | tab | 458ms | 70ms | p95 50ms, 2 slow | 2 (70ms worst) | app-root 151ms (19 commits) | 🟢 ok |
| 56 | tab → player:ruleBook (cold mount) | tab | 7834ms | 49ms | p95 17ms, 1 slow | 2 (242ms worst) | app-root 395ms (17 commits) | 🔴 slow |
| 57 | tab → player:phoneBook (cold mount) | tab | 8015ms | 75ms | p95 17ms, 2 slow | 2 (331ms worst) | app-root 501ms (27 commits) | 🔴 slow |
| 58 | tab → player:newspaper (warm revisit) | tab | 345ms | 31ms | p95 34ms, 1 slow | 0 | app-root 43ms (16 commits) | 🟢 ok |
| 59 | tab → player:eyesOnly (warm revisit) | tab | 29ms | 25ms | p95 24ms, 0 slow | 0 | game-body 20ms (3 commits) | 🟢 ok |
| 60 | tab → player:ruleBook (warm revisit) | tab | 375ms | 26ms | p95 17ms, 0 slow | 0 | screen:game 45ms (5 commits) | 🟢 ok |
| 61 | tab → player:phoneBook (warm revisit) | tab | 1233ms | 25ms | p95 17ms, 1 slow | 1 (240ms worst) | app-root 257ms (8 commits) | 🔴 slow |
| 62 | tab → player:townSquare (warm revisit) | tab | 179ms | 31ms | p95 17ms, 0 slow | 0 | app-root 42ms (4 commits) | 🟢 ok |
| 63 | tab → player:townSquare (warm revisit) | tab | 3ms | 3ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 64 | scroll: player town square | scroll | 1490ms | 10ms | p95 17ms, 0 slow | 0 | app-root 42ms (5 commits) | 🔴 slow |
| 65 | tab → player:newspaper (warm revisit) | tab | 343ms | 27ms | p95 17ms, 0 slow | 0 | app-root 49ms (18 commits) | 🟢 ok |
| 66 | scroll: player newspaper | scroll | 1737ms | 12ms | p95 17ms, 0 slow | 0 | app-root 44ms (5 commits) | 🔴 slow |
| 67 | tab → player:eyesOnly (warm revisit) | tab | 110ms | 34ms | p95 31ms, 0 slow | 0 | game-body 44ms (5 commits) | 🟢 ok |
| 68 | scroll: player eyes only | scroll | 1791ms | 12ms | p95 17ms, 0 slow | 0 | app-root 53ms (6 commits) | 🔴 slow |
| 69 | tab → player:ruleBook (warm revisit) | tab | 466ms | 26ms | p95 17ms, 0 slow | 0 | game-body 37ms (4 commits) | 🟢 ok |
| 70 | scroll: player rulebook (scroll-linked) | scroll | 2835ms | 9ms | p95 17ms, 0 slow | 0 | app-root 57ms (8 commits) | 🔴 slow |
| 71 | tab → player:phoneBook (warm revisit) | tab | 1607ms | 25ms | p95 17ms, 1 slow | 1 (250ms worst) | app-root 270ms (9 commits) | 🔴 slow |
| 72 | scroll: player phone book | scroll | 2334ms | 11ms | p95 17ms, 0 slow | 0 | app-root 79ms (8 commits) | 🔴 slow |
| 73 | navigate → game list | navigate | 623ms | 3ms | p95 17ms, 1 slow | 2 (107ms worst) | app-root 70ms (12 commits) | 🟡 meh |
| 74 | Phase D — newser game | note | 0ms | — | — | 0 | — | 🟢 ok |
| 75 | open game: SIMNEWS9 (as newser) | navigate | 2400ms | 3ms | p95 17ms, 3 slow | 2 (251ms worst) | app-root 391ms (88 commits) | 🔴 slow |
| 76 | tab → newser:newspaper (cold mount) | tab | 288ms | 31ms | p95 83ms, 2 slow | 1 (93ms worst) | app-root 169ms (33 commits) | 🟢 ok |
| 77 | tab → newser:ruleBook (cold mount) | tab | 7810ms | 20ms | p95 17ms, 1 slow | 1 (195ms worst) | app-root 202ms (10 commits) | 🔴 slow |
| 78 | tab → newser:phoneBook (cold mount) | tab | 7831ms | 58ms | p95 17ms, 2 slow | 2 (315ms worst) | app-root 356ms (22 commits) | 🔴 slow |
| 79 | tab → newser:newspaper (warm revisit) | tab | 700ms | 12ms | p95 17ms, 0 slow | 0 | game-body 11ms (3 commits) | 🟡 meh |
| 80 | tab → newser:ruleBook (warm revisit) | tab | 702ms | 8ms | p95 17ms, 0 slow | 0 | game-body 8ms (3 commits) | 🟡 meh |
| 81 | tab → newser:phoneBook (warm revisit) | tab | 1250ms | 8ms | p95 17ms, 1 slow | 1 (231ms worst) | app-root 221ms (7 commits) | 🔴 slow |
| 82 | tab → newser:townSquare (warm revisit) | tab | 25ms | 13ms | p95 17ms, 0 slow | 0 | app-root 9ms (2 commits) | 🟢 ok |
| 83 | tab → newser:newspaper (warm revisit) | tab | 667ms | 9ms | p95 17ms, 0 slow | 0 | app-root 8ms (3 commits) | 🟡 meh |
| 84 | scroll: newser newspaper editor | scroll | 517ms | 11ms | p95 17ms, 0 slow | 0 | newser-tabs 6ms (3 commits) | 🟡 meh |
| 85 | navigate → game list | navigate | 608ms | 3ms | p95 17ms, 1 slow | 2 (83ms worst) | app-root 38ms (10 commits) | 🟡 meh |
| 86 | Phase E — modal lab | note | 0ms | — | — | 0 | — | 🟢 ok |
| 87 | modal open: MarkdownEditorDialog (heavy editor) | modal-open | 346ms | 18ms | p95 17ms, 2 slow | 2 (326ms worst) | — | 🔴 slow |
| 88 | modal close: MarkdownEditorDialog (heavy editor) | modal-close | 209ms | 41ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 89 | modal open: markdown-editor (for minimize test) | modal-open | 300ms | 281ms | p95 17ms, 1 slow | 1 (285ms worst) | — | 🟡 meh |
| 90 | modal minimize: markdown-editor | action | 287ms | 52ms | p95 17ms, 0 slow | 1 (52ms worst) | screen:allGames 1ms (1 commits) | 🟢 ok |
| 91 | modal restore: markdown-editor | action | 192ms | 42ms | p95 17ms, 0 slow | 0 | screen:allGames 1ms (1 commits) | 🟢 ok |
| 92 | modal close: markdown-editor (after restore) | modal-close | 200ms | 37ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 93 | modal open: TownSquarePostDialog | modal-open | 176ms | 19ms | p95 17ms, 1 slow | 2 (117ms worst) | — | 🟢 ok |
| 94 | modal close: TownSquarePostDialog | modal-close | 200ms | 37ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 95 | modal open: PlayerProfileDialogNEW | modal-open | 125ms | 21ms | p95 17ms, 1 slow | 1 (114ms worst) | — | 🟢 ok |
| 96 | modal close: PlayerProfileDialogNEW | modal-close | 200ms | 32ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 97 | modal open: UserEditDialog | modal-open | 108ms | 21ms | p95 17ms, 1 slow | 1 (97ms worst) | — | 🟢 ok |
| 98 | modal close: UserEditDialog | modal-close | 183ms | 30ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 99 | modal open: UserAddDialog | modal-open | 108ms | 23ms | p95 17ms, 1 slow | 1 (93ms worst) | — | 🟢 ok |
| 100 | modal close: UserAddDialog | modal-close | 184ms | 30ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 101 | modal open: RoleEditDialog | modal-open | 83ms | 23ms | p95 17ms, 1 slow | 1 (70ms worst) | — | 🟢 ok |
| 102 | modal close: RoleEditDialog | modal-close | 183ms | 31ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 103 | modal open: RoleAddDialog | modal-open | 83ms | 24ms | p95 17ms, 1 slow | 1 (72ms worst) | — | 🟢 ok |
| 104 | modal close: RoleAddDialog | modal-close | 200ms | 32ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 105 | modal open: VoteEditorDialog | modal-open | 109ms | 25ms | p95 17ms, 1 slow | 1 (91ms worst) | — | 🟢 ok |
| 106 | modal close: VoteEditorDialog | modal-close | 200ms | 33ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 107 | modal open: VoteEnableDialog | modal-open | 83ms | 26ms | p95 17ms, 1 slow | 1 (73ms worst) | — | 🟢 ok |
| 108 | modal close: VoteEnableDialog | modal-close | 183ms | 34ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 109 | modal open: ActionEditorDialog | modal-open | 100ms | 26ms | p95 17ms, 1 slow | 1 (91ms worst) | — | 🟢 ok |
| 110 | modal close: ActionEditorDialog | modal-close | 183ms | 34ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 111 | modal open: BioEditorDialog | modal-open | 158ms | 28ms | p95 17ms, 1 slow | 1 (143ms worst) | — | 🟡 meh |
| 112 | modal close: BioEditorDialog | modal-close | 183ms | 37ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 113 | modal open: TagCellEditor | modal-open | 142ms | 28ms | p95 17ms, 1 slow | 1 (129ms worst) | — | 🟡 meh |
| 114 | modal close: TagCellEditor | modal-close | 200ms | 40ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 115 | modal open: AddTagDialog | modal-open | 117ms | 32ms | p95 17ms, 1 slow | 1 (100ms worst) | — | 🟢 ok |
| 116 | modal close: AddTagDialog | modal-close | 207ms | 40ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 117 | modal open: AddTagDialog (edit mode + trigger script) | modal-open | 133ms | 32ms | p95 17ms, 1 slow | 1 (117ms worst) | — | 🟢 ok |
| 118 | modal close: AddTagDialog (edit mode + trigger script) | modal-close | 199ms | 48ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 119 | modal open: ChooseDayDialog | modal-open | 125ms | 37ms | p95 17ms, 1 slow | 1 (108ms worst) | — | 🟢 ok |
| 120 | modal close: ChooseDayDialog | modal-close | 208ms | 44ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 121 | modal open: DaySelectionDialog | modal-open | 108ms | 37ms | p95 17ms, 1 slow | 1 (92ms worst) | — | 🟢 ok |
| 122 | modal close: DaySelectionDialog | modal-close | 207ms | 45ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 123 | modal open: DaysPerGameDayDialog | modal-open | 108ms | 38ms | p95 17ms, 1 slow | 1 (92ms worst) | — | 🟢 ok |
| 124 | modal close: DaysPerGameDayDialog | modal-close | 208ms | 45ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 125 | modal open: DeleteRoleConfirmationDialog | modal-open | 108ms | 38ms | p95 17ms, 1 slow | 1 (96ms worst) | — | 🟢 ok |
| 126 | modal close: DeleteRoleConfirmationDialog | modal-close | 208ms | 47ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 127 | modal open: EditInfoDialog | modal-open | 117ms | 39ms | p95 17ms, 1 slow | 1 (103ms worst) | — | 🟢 ok |
| 128 | modal close: EditInfoDialog | modal-close | 192ms | 46ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 129 | modal open: JoinedGameOptionsDialog | modal-open | 150ms | 40ms | p95 17ms, 1 slow | 1 (138ms worst) | — | 🟡 meh |
| 130 | modal close: JoinedGameOptionsDialog | modal-close | 208ms | 48ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 131 | modal open: ArchivedGamesDialog | modal-open | 150ms | 41ms | p95 17ms, 1 slow | 1 (137ms worst) | — | 🟡 meh |
| 132 | modal close: ArchivedGamesDialog | modal-close | 192ms | 48ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 133 | modal open: MarkdownInputBuilderDialog | modal-open | 125ms | 42ms | p95 17ms, 1 slow | 1 (111ms worst) | — | 🟢 ok |
| 134 | modal close: MarkdownInputBuilderDialog | modal-close | 192ms | 48ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 135 | modal open: MarkdownVariableDialog | modal-open | 108ms | 41ms | p95 17ms, 1 slow | 1 (98ms worst) | — | 🟢 ok |
| 136 | modal close: MarkdownVariableDialog | modal-close | 216ms | 50ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 137 | modal open: NightlyCertificationDialog | modal-open | 192ms | 43ms | p95 17ms, 1 slow | 1 (177ms worst) | — | 🟡 meh |
| 138 | modal close: NightlyCertificationDialog | modal-close | 200ms | 53ms | p95 17ms, 0 slow | 1 (53ms worst) | — | 🟢 ok |
| 139 | modal open: ScheduleTableUpdateDialog | modal-open | 158ms | 48ms | p95 17ms, 1 slow | 1 (144ms worst) | — | 🟡 meh |
| 140 | modal close: ScheduleTableUpdateDialog | modal-close | 217ms | 53ms | p95 17ms, 0 slow | 1 (53ms worst) | — | 🟢 ok |
| 141 | modal open: ColumnActionsDialog | modal-open | 125ms | 45ms | p95 17ms, 1 slow | 1 (113ms worst) | — | 🟢 ok |
| 142 | modal close: ColumnActionsDialog | modal-close | 216ms | 54ms | p95 17ms, 0 slow | 1 (54ms worst) | — | 🟢 ok |
| 143 | modal open: PhoneBookTocDialog | modal-open | 150ms | 48ms | p95 17ms, 1 slow | 1 (135ms worst) | — | 🟡 meh |
| 144 | modal close: PhoneBookTocDialog | modal-close | 216ms | 55ms | p95 17ms, 0 slow | 1 (54ms worst) | — | 🟢 ok |
| 145 | modal open: TableOfContentsDialog (rulebook) | modal-open | 150ms | 47ms | p95 17ms, 1 slow | 1 (140ms worst) | — | 🟡 meh |
| 146 | modal close: TableOfContentsDialog (rulebook) | modal-close | 217ms | 56ms | p95 17ms, 0 slow | 1 (56ms worst) | — | 🟢 ok |
| 147 | modal open: ImportDraftDialog | modal-open | 196ms | 48ms | p95 17ms, 2 slow | 2 (119ms worst) | — | 🟢 ok |
| 148 | modal close: ImportDraftDialog | modal-close | 225ms | 58ms | p95 17ms, 0 slow | 1 (58ms worst) | — | 🟢 ok |
| 149 | modal open: NewspaperSectionOptionsDialog | modal-open | 158ms | 50ms | p95 17ms, 1 slow | 1 (148ms worst) | — | 🟡 meh |
| 150 | modal close: NewspaperSectionOptionsDialog | modal-close | 225ms | 58ms | p95 17ms, 0 slow | 1 (57ms worst) | — | 🟢 ok |
| 151 | modal open: PlayerPreviewModal | modal-open | 217ms | 50ms | p95 17ms, 1 slow | 1 (203ms worst) | — | 🟡 meh |
| 152 | modal close: PlayerPreviewModal | modal-close | 208ms | 61ms | p95 17ms, 0 slow | 1 (60ms worst) | — | 🟢 ok |
| 153 | modal open: TownSquareImageDialog | modal-open | 142ms | 50ms | p95 17ms, 1 slow | 1 (125ms worst) | — | 🟡 meh |
| 154 | modal close: TownSquareImageDialog | modal-close | 224ms | 63ms | p95 17ms, 0 slow | 1 (63ms worst) | — | 🟢 ok |
| 155 | modal open: TownSquareLinkDialog | modal-open | 142ms | 52ms | p95 17ms, 1 slow | 1 (125ms worst) | — | 🟡 meh |
| 156 | modal close: TownSquareLinkDialog | modal-close | 224ms | 58ms | p95 17ms, 0 slow | 1 (58ms worst) | — | 🟢 ok |
| 157 | modal open: TownSquareMoreOptionsDialog | modal-open | 142ms | 52ms | p95 17ms, 1 slow | 1 (126ms worst) | — | 🟡 meh |
| 158 | modal close: TownSquareMoreOptionsDialog | modal-close | 208ms | 60ms | p95 17ms, 0 slow | 1 (60ms worst) | — | 🟢 ok |
| 159 | modal open: ConfirmDialog | modal-open | 142ms | 52ms | p95 17ms, 1 slow | 1 (126ms worst) | — | 🟡 meh |
| 160 | modal close: ConfirmDialog | modal-close | 225ms | 60ms | p95 17ms, 0 slow | 1 (60ms worst) | — | 🟢 ok |
| 161 | modal open: ImageUploadDialog | modal-open | 142ms | 53ms | p95 22ms, 1 slow | 1 (126ms worst) | — | 🟡 meh |
| 162 | modal close: ImageUploadDialog | modal-close | 225ms | 60ms | p95 17ms, 0 slow | 1 (60ms worst) | — | 🟢 ok |
| 163 | modal open: SaveHistoryDialog | modal-open | 142ms | 54ms | p95 17ms, 1 slow | 1 (132ms worst) | — | 🟡 meh |
| 164 | modal close: SaveHistoryDialog | modal-close | 225ms | 61ms | p95 17ms, 0 slow | 1 (61ms worst) | — | 🟢 ok |
| 165 | modal open: UnsavedChangesDialog | modal-open | 134ms | 54ms | p95 17ms, 1 slow | 1 (121ms worst) | — | 🟡 meh |
| 166 | modal close: UnsavedChangesDialog | modal-close | 207ms | 59ms | p95 17ms, 0 slow | 1 (59ms worst) | — | 🟢 ok |
| 167 | modal open: ViewOnlyPreviewModal | modal-open | 133ms | 54ms | p95 17ms, 1 slow | 1 (121ms worst) | — | 🟡 meh |
| 168 | modal close: ViewOnlyPreviewModal | modal-close | 224ms | 60ms | p95 17ms, 0 slow | 1 (60ms worst) | — | 🟢 ok |
| 169 | modal open: DeleteGameConfirmationDialog | modal-open | 133ms | 54ms | p95 17ms, 1 slow | 1 (124ms worst) | — | 🟡 meh |
| 170 | modal close: DeleteGameConfirmationDialog | modal-close | 224ms | 61ms | p95 17ms, 0 slow | 1 (60ms worst) | — | 🟢 ok |
| 171 | Tour complete | note | 0ms | — | — | 0 | — | 🟢 ok |

## Slowest steps

- **8015ms** — tab → player:phoneBook (cold mount) (longTasks 2/331ms, p95 frame 17ms)
- **7989ms** — navigate: config → phone book subpage (longTasks 1/324ms, p95 frame 17ms)
- **7976ms** — navigate: config → rule book subpage (longTasks 1/349ms, p95 frame 17ms)
- **7834ms** — tab → player:ruleBook (cold mount) (longTasks 2/242ms, p95 frame 17ms)
- **7831ms** — tab → newser:phoneBook (cold mount) (longTasks 2/315ms, p95 frame 17ms)
- **7810ms** — tab → newser:ruleBook (cold mount) (longTasks 1/195ms, p95 frame 17ms)
- **3795ms** — open game: SIMOP1234 (as operator) (longTasks 16/466ms, p95 frame 308ms)
- **3051ms** — scroll: operator rulebook (scroll-linked TOC) (longTasks 0/0ms, p95 frame 17ms)
- **2835ms** — scroll: player rulebook (scroll-linked) (longTasks 0/0ms, p95 frame 17ms)
- **2400ms** — open game: SIMNEWS9 (as newser) (longTasks 2/251ms, p95 frame 17ms)

## Detail log

### — Perf audit tour starting
> UA: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/146.0.0.0 Safari/537.36

### — Phase A — game list

### scroll: game list
- kind: `scroll` · measured at +1871ms into run
- **settle**: 4ms · **first DOM change**: 4ms · **window**: 4ms
- 
- queries subscribed during window: 0 · active data subs after: 18 · dom mutations: 1 · heap: 59MB

### action: New WolffsPoint dialog open
- kind: `modal-open` · measured at +1876ms into run
- **settle**: 66ms · **first DOM change**: 30ms · **window**: 576ms
- frames 33 · avg 17.4ms · p95 17ms · worst 42ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 18 · dom mutations: 32 · heap: 62MB
- react commits by boundary (worst first):
  - `app-root`: 2 commits, total 1ms, worst 1ms
  - `screen:allGames`: 1 commits, total 1ms, worst 1ms

### modal close: New WolffsPoint
- kind: `modal-close` · measured at +2451ms into run
- **settle**: 183ms · **first DOM change**: 11ms · **window**: 450ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 18 · dom mutations: 27 · heap: 63MB
- react commits by boundary (worst first):
  - `screen:allGames`: 1 commits, total 1ms, worst 1ms
  - `app-root`: 1 commits, total 1ms, worst 1ms

### — Phase B — operator game
> current user owns SIMOP1234

### open game: SIMOP1234 (as operator)
- kind: `navigate` · measured at +2902ms into run
- **settle**: 3795ms · **first DOM change**: 4ms · **window**: 4044ms
- frames 48 · avg 83.8ms · p95 308ms · worst 492ms · >50ms: 17
- long tasks: 16 (total 2739ms, worst 466ms)
- backend writes this window: user_vars:set 0.2ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms
- queries subscribed during window: 528 · active data subs after: 285 · dom mutations: 842 · heap: 263MB
- react commits by boundary (worst first):
  - `app-root`: 523 commits, total 2817ms, worst 215ms
  - `screen:game`: 514 commits, total 2776ms, worst 215ms
  - `game-body`: 508 commits, total 2761ms, worst 215ms
  - `op-tabs`: 506 commits, total 2756ms, worst 215ms
  - `screen:allGames`: 7 commits, total 30ms, worst 8ms

### tab → op:config (cold mount)
- kind: `tab` · measured at +6947ms into run
- **settle**: 2163ms · **first DOM change**: 342ms · **window**: 2730ms
- frames 107 · avg 25.4ms · p95 75ms · worst 350ms · >50ms: 6
- long tasks: 4 (total 808ms, worst 343ms)
- backend writes this window: user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms
- queries subscribed during window: 93 · active data subs after: 331 · dom mutations: 1132 · heap: 350MB
- react commits by boundary (worst first):
  - `app-root`: 144 commits, total 799ms, worst 199ms
  - `screen:game`: 142 commits, total 791ms, worst 199ms
  - `game-body`: 142 commits, total 789ms, worst 199ms
  - `op-tabs`: 142 commits, total 788ms, worst 199ms

### tab → op:nightly (cold mount)
- kind: `tab` · measured at +9678ms into run
- **settle**: 1998ms · **first DOM change**: 740ms · **window**: 2565ms
- frames 57 · avg 45.0ms · p95 208ms · worst 717ms · >50ms: 6
- long tasks: 6 (total 1477ms, worst 742ms)
- backend writes this window: user_lists:set 0.2ms, user_lists:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms
- queries subscribed during window: 52 · active data subs after: 357 · dom mutations: 801 · heap: 253MB
- react commits by boundary (worst first):
  - `app-root`: 86 commits, total 1365ms, worst 321ms
  - `screen:game`: 86 commits, total 1363ms, worst 321ms
  - `game-body`: 86 commits, total 1363ms, worst 321ms
  - `op-tabs`: 86 commits, total 1361ms, worst 319ms

### tab → op:forum (cold mount)
- kind: `tab` · measured at +12243ms into run
- **settle**: 767ms · **first DOM change**: 236ms · **window**: 1333ms
- frames 44 · avg 30.3ms · p95 75ms · worst 275ms · >50ms: 4
- long tasks: 2 (total 486ms, worst 250ms)
- backend writes this window: user_vars:set 0.1ms, user_vars:set 0.1ms
- queries subscribed during window: 83 · active data subs after: 437 · dom mutations: 769 · heap: 283MB
- react commits by boundary (worst first):
  - `app-root`: 97 commits, total 511ms, worst 194ms
  - `screen:game`: 97 commits, total 510ms, worst 194ms
  - `game-body`: 97 commits, total 509ms, worst 194ms
  - `op-tabs`: 97 commits, total 507ms, worst 192ms

### tab → op:newspaper (cold mount)
- kind: `tab` · measured at +13576ms into run
- **settle**: 775ms · **first DOM change**: 208ms · **window**: 859ms
- frames 37 · avg 23.2ms · p95 83ms · worst 192ms · >50ms: 2
- long tasks: 2 (total 298ms, worst 208ms)
- backend writes this window: user_vars:set 0.0ms
- queries subscribed during window: 14 · active data subs after: 450 · dom mutations: 204 · heap: 316MB
- react commits by boundary (worst first):
  - `app-root`: 27 commits, total 270ms, worst 182ms
  - `screen:game`: 27 commits, total 270ms, worst 182ms
  - `game-body`: 27 commits, total 269ms, worst 182ms
  - `op-tabs`: 27 commits, total 267ms, worst 180ms

### tab → op:rulebook (cold mount)
- kind: `tab` · measured at +14435ms into run
- **settle**: 816ms · **first DOM change**: 120ms · **window**: 1033ms
- frames 56 · avg 18.4ms · p95 17ms · worst 108ms · >50ms: 1
- long tasks: 1 (total 120ms, worst 120ms)
- queries subscribed during window: 9 · active data subs after: 455 · dom mutations: 175 · heap: 315MB
- react commits by boundary (worst first):
  - `app-root`: 16 commits, total 110ms, worst 77ms
  - `game-body`: 16 commits, total 109ms, worst 77ms
  - `screen:game`: 16 commits, total 109ms, worst 77ms
  - `op-tabs`: 16 commits, total 108ms, worst 77ms

### tab → op:players (warm revisit)
- kind: `tab` · measured at +15469ms into run
- **settle**: 434ms · **first DOM change**: 188ms · **window**: 624ms
- frames 15 · avg 41.5ms · p95 225ms · worst 225ms · >50ms: 2
- long tasks: 2 (total 413ms, worst 225ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 12 · heap: 350MB
- react commits by boundary (worst first):
  - `game-body`: 4 commits, total 384ms, worst 208ms
  - `screen:game`: 4 commits, total 384ms, worst 208ms
  - `app-root`: 4 commits, total 384ms, worst 208ms
  - `op-tabs`: 4 commits, total 382ms, worst 208ms

### tab → op:config (warm revisit)
- kind: `tab` · measured at +16093ms into run
- **settle**: 157ms · **first DOM change**: 57ms · **window**: 341ms
- frames 14 · avg 24.3ms · p95 75ms · worst 75ms · >50ms: 2
- long tasks: 2 (total 155ms, worst 88ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 12 · heap: 360MB
- react commits by boundary (worst first):
  - `app-root`: 4 commits, total 119ms, worst 74ms
  - `screen:game`: 4 commits, total 119ms, worst 74ms
  - `game-body`: 4 commits, total 119ms, worst 74ms
  - `op-tabs`: 4 commits, total 118ms, worst 74ms

### tab → op:nightly (warm revisit)
- kind: `tab` · measured at +16434ms into run
- **settle**: 117ms · **first DOM change**: 53ms · **window**: 316ms
- frames 15 · avg 21.1ms · p95 58ms · worst 58ms · >50ms: 1
- long tasks: 2 (total 115ms, worst 65ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 12 · heap: 375MB
- react commits by boundary (worst first):
  - `app-root`: 4 commits, total 85ms, worst 44ms
  - `game-body`: 4 commits, total 85ms, worst 44ms
  - `screen:game`: 4 commits, total 85ms, worst 44ms
  - `op-tabs`: 4 commits, total 84ms, worst 44ms

### tab → op:forum (warm revisit)
- kind: `tab` · measured at +16751ms into run
- **settle**: 256ms · **first DOM change**: 194ms · **window**: 441ms
- frames 14 · avg 31.5ms · p95 199ms · worst 199ms · >50ms: 1
- long tasks: 1 (total 205ms, worst 205ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 12 · heap: 386MB
- react commits by boundary (worst first):
  - `game-body`: 4 commits, total 224ms, worst 182ms
  - `screen:game`: 4 commits, total 224ms, worst 182ms
  - `app-root`: 4 commits, total 224ms, worst 182ms
  - `op-tabs`: 4 commits, total 222ms, worst 179ms

### tab → op:newspaper (warm revisit)
- kind: `tab` · measured at +17193ms into run
- **settle**: 716ms · **first DOM change**: 51ms · **window**: 900ms
- frames 52 · avg 17.3ms · p95 17ms · worst 49ms · >50ms: 0
- long tasks: 1 (total 56ms, worst 56ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 90 · heap: 383MB
- react commits by boundary (worst first):
  - `app-root`: 3 commits, total 41ms, worst 40ms
  - `game-body`: 3 commits, total 40ms, worst 40ms
  - `screen:game`: 3 commits, total 40ms, worst 40ms
  - `op-tabs`: 3 commits, total 40ms, worst 39ms

### tab → op:rulebook (warm revisit)
- kind: `tab` · measured at +18093ms into run
- **settle**: 509ms · **first DOM change**: 191ms · **window**: 692ms
- frames 31 · avg 22.3ms · p95 17ms · worst 191ms · >50ms: 1
- long tasks: 1 (total 195ms, worst 195ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 48 · heap: 395MB
- react commits by boundary (worst first):
  - `app-root`: 3 commits, total 180ms, worst 180ms
  - `game-body`: 3 commits, total 180ms, worst 180ms
  - `screen:game`: 3 commits, total 180ms, worst 180ms
  - `op-tabs`: 3 commits, total 178ms, worst 177ms

### tab → op:players (warm revisit)
- kind: `tab` · measured at +18785ms into run
- **settle**: 216ms · **first DOM change**: 62ms · **window**: 400ms
- frames 16 · avg 24.9ms · p95 92ms · worst 92ms · >50ms: 2
- long tasks: 2 (total 180ms, worst 102ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 14 · heap: 408MB
- react commits by boundary (worst first):
  - `screen:game`: 4 commits, total 134ms, worst 86ms
  - `app-root`: 4 commits, total 134ms, worst 86ms
  - `game-body`: 4 commits, total 133ms, worst 86ms
  - `op-tabs`: 4 commits, total 133ms, worst 86ms

### rapid tab cycle (all 6 operator tabs)
- kind: `action` · measured at +19184ms into run
- **settle**: 1567ms · **first DOM change**: 3ms · **window**: 1967ms
- frames 84 · avg 23.4ms · p95 75ms · worst 192ms · >50ms: 5
- long tasks: 7 (total 556ms, worst 199ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 107 · heap: 470MB
- react commits by boundary (worst first):
  - `app-root`: 15 commits, total 556ms, worst 187ms
  - `screen:game`: 15 commits, total 555ms, worst 187ms
  - `game-body`: 15 commits, total 555ms, worst 187ms
  - `op-tabs`: 15 commits, total 550ms, worst 184ms

### tab → op:players (warm revisit)
- kind: `tab` · measured at +21151ms into run
- **settle**: 295ms · **first DOM change**: 191ms · **window**: 491ms
- frames 16 · avg 30.7ms · p95 183ms · worst 183ms · >50ms: 2
- long tasks: 2 (total 282ms, worst 191ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 12 · heap: 477MB
- react commits by boundary (worst first):
  - `screen:game`: 4 commits, total 256ms, worst 179ms
  - `app-root`: 4 commits, total 256ms, worst 179ms
  - `game-body`: 4 commits, total 256ms, worst 179ms
  - `op-tabs`: 4 commits, total 254ms, worst 177ms

### scroll: operator players table (vertical)
- kind: `scroll` · measured at +21643ms into run
- **settle**: 30ms · **first DOM change**: 30ms · **window**: 331ms
- frames 19 · avg 17.1ms · p95 24ms · worst 24ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 1 · heap: 478MB

### scroll: players table horizontal
- kind: `scroll` · measured at +21973ms into run
- **settle**: 23ms · **first DOM change**: 23ms · **window**: 1228ms
- frames 74 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 1 · heap: 479MB

### tab → op:nightly (warm revisit)
- kind: `tab` · measured at +23201ms into run
- **settle**: 352ms · **first DOM change**: 194ms · **window**: 533ms
- frames 14 · avg 38.0ms · p95 199ms · worst 199ms · >50ms: 2
- long tasks: 2 (total 350ms, worst 207ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 13 · heap: 503MB
- react commits by boundary (worst first):
  - `app-root`: 5 commits, total 299ms, worst 182ms
  - `screen:game`: 5 commits, total 299ms, worst 182ms
  - `game-body`: 5 commits, total 299ms, worst 182ms
  - `op-tabs`: 5 commits, total 296ms, worst 180ms

### scroll: operator nightly
- kind: `scroll` · measured at +23735ms into run
- **settle**: 375ms · **first DOM change**: 25ms · **window**: 2441ms
- frames 146 · avg 16.7ms · p95 17ms · worst 24ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 20 · heap: 506MB
- react commits by boundary (worst first):
  - `app-root`: 7 commits, total 7ms, worst 3ms
  - `screen:game`: 7 commits, total 7ms, worst 3ms
  - `op-tabs`: 7 commits, total 6ms, worst 3ms
  - `game-body`: 7 commits, total 6ms, worst 3ms

### modal open: Review/Certify (nightly)
- kind: `modal-open` · measured at +26176ms into run
- **settle**: 553ms · **first DOM change**: 531ms · **window**: 1109ms
- frames 35 · avg 31.6ms · p95 21ms · worst 533ms · >50ms: 1
- long tasks: 1 (total 534ms, worst 534ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 610 · heap: 524MB
- react commits by boundary (worst first):
  - `app-root`: 5 commits, total 183ms, worst 176ms
  - `screen:game`: 5 commits, total 183ms, worst 176ms
  - `op-tabs`: 5 commits, total 183ms, worst 176ms
  - `game-body`: 5 commits, total 183ms, worst 176ms

### modal close: Review/Certify
- kind: `modal-close` · measured at +27286ms into run
- **settle**: 283ms · **first DOM change**: 134ms · **window**: 548ms
- frames 27 · avg 20.3ms · p95 17ms · worst 117ms · >50ms: 1
- long tasks: 1 (total 134ms, worst 134ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 29 · heap: 546MB
- react commits by boundary (worst first):
  - `app-root`: 4 commits, total 102ms, worst 99ms
  - `screen:game`: 4 commits, total 102ms, worst 99ms
  - `op-tabs`: 4 commits, total 102ms, worst 99ms
  - `game-body`: 4 commits, total 102ms, worst 99ms

### tab → op:forum (warm revisit)
- kind: `tab` · measured at +27835ms into run
- **settle**: 257ms · **first DOM change**: 192ms · **window**: 441ms
- frames 14 · avg 31.5ms · p95 199ms · worst 199ms · >50ms: 1
- long tasks: 2 (total 255ms, worst 203ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 12 · heap: 555MB
- react commits by boundary (worst first):
  - `app-root`: 4 commits, total 225ms, worst 179ms
  - `screen:game`: 4 commits, total 225ms, worst 179ms
  - `game-body`: 4 commits, total 225ms, worst 179ms
  - `op-tabs`: 4 commits, total 223ms, worst 176ms

### scroll: town square thread list
- kind: `scroll` · measured at +28276ms into run
- **settle**: 31ms · **first DOM change**: 31ms · **window**: 2358ms
- frames 141 · avg 16.7ms · p95 17ms · worst 24ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 1 · heap: 558MB
- react commits by boundary (worst first):
  - `app-root`: 6 commits, total 6ms, worst 3ms
  - `screen:game`: 6 commits, total 6ms, worst 3ms
  - `op-tabs`: 6 commits, total 6ms, worst 3ms
  - `game-body`: 6 commits, total 6ms, worst 3ms

### navigate: thread list → thread detail
- kind: `navigate` · measured at +30635ms into run
- **settle**: 758ms · **first DOM change**: 4ms · **window**: 1309ms
- frames 49 · avg 26.7ms · p95 17ms · worst 449ms · >50ms: 2
- long tasks: 1 (total 454ms, worst 454ms)
- backend writes this window: user_vars:set 0.1ms, user_vars:set 0.1ms
- queries subscribed during window: 2 · active data subs after: 456 · dom mutations: 775 · heap: 183MB
- react commits by boundary (worst first):
  - `app-root`: 16 commits, total 419ms, worst 235ms
  - `screen:game`: 16 commits, total 419ms, worst 235ms
  - `op-tabs`: 16 commits, total 419ms, worst 235ms
  - `game-body`: 16 commits, total 419ms, worst 235ms

### scroll: thread detail comments
- kind: `scroll` · measured at +31944ms into run
- **settle**: 29ms · **first DOM change**: 29ms · **window**: 2449ms
- frames 147 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 456 · dom mutations: 1 · heap: 184MB
- react commits by boundary (worst first):
  - `op-tabs`: 2 commits, total 3ms, worst 3ms
  - `game-body`: 2 commits, total 3ms, worst 3ms
  - `screen:game`: 2 commits, total 3ms, worst 3ms
  - `app-root`: 2 commits, total 3ms, worst 3ms

### navigate: thread detail → thread list
- kind: `navigate` · measured at +34393ms into run
- **settle**: 783ms · **first DOM change**: 18ms · **window**: 1301ms
- frames 57 · avg 22.8ms · p95 17ms · worst 367ms · >50ms: 1
- long tasks: 1 (total 382ms, worst 382ms)
- queries subscribed during window: 0 · active data subs after: 456 · dom mutations: 660 · heap: 202MB
- react commits by boundary (worst first):
  - `app-root`: 8 commits, total 358ms, worst 204ms
  - `op-tabs`: 8 commits, total 358ms, worst 204ms
  - `game-body`: 8 commits, total 358ms, worst 204ms
  - `screen:game`: 8 commits, total 358ms, worst 204ms

### navigate: open second thread (warm)
- kind: `navigate` · measured at +35694ms into run
- **settle**: 498ms · **first DOM change**: 62ms · **window**: 1015ms
- frames 54 · avg 18.8ms · p95 42ms · worst 75ms · >50ms: 2
- long tasks: 2 (total 154ms, worst 92ms)
- backend writes this window: user_vars:set 0.2ms, user_vars:set 0.0ms
- queries subscribed during window: 2 · active data subs after: 457 · dom mutations: 144 · heap: 221MB
- react commits by boundary (worst first):
  - `app-root`: 13 commits, total 149ms, worst 32ms
  - `screen:game`: 13 commits, total 149ms, worst 32ms
  - `op-tabs`: 13 commits, total 148ms, worst 32ms
  - `game-body`: 13 commits, total 148ms, worst 32ms

### navigate: back to thread list (warm)
- kind: `navigate` · measured at +36709ms into run
- **settle**: 791ms · **first DOM change**: 18ms · **window**: 1258ms
- frames 54 · avg 23.3ms · p95 17ms · worst 375ms · >50ms: 1
- long tasks: 1 (total 390ms, worst 390ms)
- queries subscribed during window: 0 · active data subs after: 457 · dom mutations: 658 · heap: 241MB
- react commits by boundary (worst first):
  - `app-root`: 6 commits, total 370ms, worst 211ms
  - `op-tabs`: 6 commits, total 370ms, worst 211ms
  - `game-body`: 6 commits, total 370ms, worst 211ms
  - `screen:game`: 6 commits, total 370ms, worst 211ms

### modal open: New Thread composer
- kind: `modal-open` · measured at +37968ms into run
- **settle**: 92ms · **first DOM change**: 67ms · **window**: 658ms
- frames 37 · avg 17.8ms · p95 17ms · worst 58ms · >50ms: 1
- long tasks: 1 (total 67ms, worst 67ms)
- queries subscribed during window: 0 · active data subs after: 457 · dom mutations: 38 · heap: 254MB
- react commits by boundary (worst first):
  - `screen:game`: 4 commits, total 16ms, worst 13ms
  - `app-root`: 4 commits, total 16ms, worst 13ms
  - `op-tabs`: 4 commits, total 16ms, worst 13ms
  - `game-body`: 4 commits, total 16ms, worst 13ms

### modal close: New Thread composer
- kind: `modal-close` · measured at +38626ms into run
- **settle**: 184ms · **first DOM change**: 38ms · **window**: 450ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 457 · dom mutations: 29 · heap: 241MB
- react commits by boundary (worst first):
  - `app-root`: 4 commits, total 23ms, worst 20ms
  - `op-tabs`: 4 commits, total 23ms, worst 20ms
  - `game-body`: 4 commits, total 23ms, worst 20ms
  - `screen:game`: 4 commits, total 23ms, worst 20ms

### tab → op:newspaper (warm revisit)
- kind: `tab` · measured at +39076ms into run
- **settle**: 867ms · **first DOM change**: 201ms · **window**: 1050ms
- frames 52 · avg 20.2ms · p95 17ms · worst 199ms · >50ms: 1
- long tasks: 1 (total 206ms, worst 206ms)
- queries subscribed during window: 0 · active data subs after: 457 · dom mutations: 90 · heap: 253MB
- react commits by boundary (worst first):
  - `app-root`: 3 commits, total 190ms, worst 189ms
  - `game-body`: 3 commits, total 189ms, worst 189ms
  - `screen:game`: 3 commits, total 189ms, worst 189ms
  - `op-tabs`: 3 commits, total 186ms, worst 185ms

### scroll: operator newspaper
- kind: `scroll` · measured at +40126ms into run
- **settle**: 30ms · **first DOM change**: 30ms · **window**: 2758ms
- frames 164 · avg 16.8ms · p95 17ms · worst 28ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 457 · dom mutations: 1 · heap: 257MB
- react commits by boundary (worst first):
  - `app-root`: 7 commits, total 9ms, worst 3ms
  - `op-tabs`: 7 commits, total 9ms, worst 3ms
  - `game-body`: 7 commits, total 9ms, worst 3ms
  - `screen:game`: 7 commits, total 9ms, worst 3ms

### tab → op:rulebook (warm revisit)
- kind: `tab` · measured at +42885ms into run
- **settle**: 508ms · **first DOM change**: 194ms · **window**: 691ms
- frames 31 · avg 22.3ms · p95 17ms · worst 191ms · >50ms: 1
- long tasks: 1 (total 199ms, worst 199ms)
- queries subscribed during window: 0 · active data subs after: 457 · dom mutations: 49 · heap: 272MB
- react commits by boundary (worst first):
  - `screen:game`: 5 commits, total 187ms, worst 183ms
  - `app-root`: 5 commits, total 187ms, worst 183ms
  - `game-body`: 5 commits, total 187ms, worst 183ms
  - `op-tabs`: 5 commits, total 185ms, worst 180ms

### scroll: operator config page
- kind: `scroll` · measured at +43576ms into run
- **settle**: 175ms · **first DOM change**: 29ms · **window**: 2358ms
- frames 141 · avg 16.7ms · p95 17ms · worst 24ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 457 · dom mutations: 3 · heap: 274MB
- react commits by boundary (worst first):
  - `app-root`: 2 commits, total 3ms, worst 3ms
  - `op-tabs`: 2 commits, total 3ms, worst 3ms
  - `game-body`: 2 commits, total 3ms, worst 3ms
  - `screen:game`: 2 commits, total 3ms, worst 3ms

### navigate: config → rule book subpage
- kind: `navigate` · measured at +45934ms into run
- **settle**: 7976ms · **first DOM change**: 3ms · **window**: 8016ms
- frames 460 · avg 17.4ms · p95 17ms · worst 333ms · >50ms: 1
- long tasks: 1 (total 349ms, worst 349ms)
- backend writes this window: user_vars:set 0.1ms, user_vars:set 0.0ms
- queries subscribed during window: 4 · active data subs after: 459 · dom mutations: 674 · heap: 279MB
- react commits by boundary (worst first):
  - `app-root`: 16 commits, total 345ms, worst 187ms
  - `screen:game`: 16 commits, total 341ms, worst 186ms
  - `game-body`: 16 commits, total 341ms, worst 186ms
  - `op-tabs`: 16 commits, total 341ms, worst 186ms
- notes: (settle timeout 8000ms)

### scroll: operator rulebook (scroll-linked TOC)
- kind: `scroll` · measured at +53951ms into run
- **settle**: 3051ms · **first DOM change**: 31ms · **window**: 3051ms
- frames 181 · avg 16.8ms · p95 17ms · worst 33ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 459 · dom mutations: 353 · heap: 208MB
- react commits by boundary (worst first):
  - `app-root`: 6 commits, total 8ms, worst 3ms
  - `op-tabs`: 6 commits, total 8ms, worst 3ms
  - `game-body`: 6 commits, total 8ms, worst 3ms
  - `screen:game`: 6 commits, total 8ms, worst 3ms

### modal open: rulebook table of contents
- kind: `modal-open` · measured at +57003ms into run
- **settle**: 81ms · **first DOM change**: 5ms · **window**: 648ms
- frames 36 · avg 18.0ms · p95 17ms · worst 64ms · >50ms: 1
- long tasks: 1 (total 67ms, worst 67ms)
- queries subscribed during window: 0 · active data subs after: 459 · dom mutations: 87 · heap: 212MB
- react commits by boundary (worst first):
  - `app-root`: 5 commits, total 8ms, worst 3ms
  - `op-tabs`: 5 commits, total 8ms, worst 3ms
  - `game-body`: 5 commits, total 8ms, worst 3ms
  - `screen:game`: 5 commits, total 8ms, worst 3ms

### modal close: rulebook TOC
- kind: `modal-close` · measured at +57651ms into run
- **settle**: 168ms · **first DOM change**: 20ms · **window**: 433ms
- frames 26 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 459 · dom mutations: 32 · heap: 210MB
- react commits by boundary (worst first):
  - `op-tabs`: 2 commits, total 5ms, worst 3ms
  - `game-body`: 2 commits, total 5ms, worst 3ms
  - `screen:game`: 2 commits, total 5ms, worst 3ms
  - `app-root`: 2 commits, total 5ms, worst 3ms

### navigate: rule book → config
- kind: `navigate` · measured at +58084ms into run
- **settle**: 516ms · **first DOM change**: 6ms · **window**: 1033ms
- frames 56 · avg 18.4ms · p95 17ms · worst 117ms · >50ms: 1
- long tasks: 1 (total 130ms, worst 130ms)
- queries subscribed during window: 0 · active data subs after: 459 · dom mutations: 153 · heap: 202MB
- react commits by boundary (worst first):
  - `app-root`: 8 commits, total 105ms, worst 69ms
  - `op-tabs`: 8 commits, total 104ms, worst 69ms
  - `game-body`: 8 commits, total 104ms, worst 69ms
  - `screen:game`: 8 commits, total 104ms, worst 69ms

### navigate: config → phone book subpage
- kind: `navigate` · measured at +59118ms into run
- **settle**: 7989ms · **first DOM change**: 4ms · **window**: 8016ms
- frames 462 · avg 17.4ms · p95 17ms · worst 325ms · >50ms: 1
- long tasks: 1 (total 324ms, worst 324ms)
- queries subscribed during window: 25 · active data subs after: 484 · dom mutations: 852 · heap: 237MB
- react commits by boundary (worst first):
  - `app-root`: 16 commits, total 309ms, worst 99ms
  - `screen:game`: 16 commits, total 309ms, worst 99ms
  - `op-tabs`: 16 commits, total 309ms, worst 99ms
  - `game-body`: 16 commits, total 309ms, worst 99ms
- notes: (settle timeout 8000ms)

### scroll: operator phone book
- kind: `scroll` · measured at +67135ms into run
- **settle**: 2375ms · **first DOM change**: 44ms · **window**: 2376ms
- frames 141 · avg 16.8ms · p95 17ms · worst 41ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 484 · dom mutations: 133 · heap: 220MB
- react commits by boundary (worst first):
  - `op-tabs`: 2 commits, total 3ms, worst 3ms
  - `game-body`: 2 commits, total 3ms, worst 3ms
  - `screen:game`: 2 commits, total 3ms, worst 3ms
  - `app-root`: 2 commits, total 3ms, worst 3ms

### navigate: phone book → config
- kind: `navigate` · measured at +69516ms into run
- **settle**: 685ms · **first DOM change**: 15ms · **window**: 1219ms
- frames 54 · avg 22.6ms · p95 31ms · worst 292ms · >50ms: 1
- long tasks: 1 (total 290ms, worst 290ms)
- queries subscribed during window: 0 · active data subs after: 484 · dom mutations: 151 · heap: 231MB
- react commits by boundary (worst first):
  - `app-root`: 9 commits, total 215ms, worst 122ms
  - `op-tabs`: 9 commits, total 215ms, worst 122ms
  - `game-body`: 9 commits, total 215ms, worst 122ms
  - `screen:game`: 9 commits, total 215ms, worst 122ms

### tab → op:config (warm revisit)
- kind: `tab` · measured at +70735ms into run
- **settle**: 483ms · **first DOM change**: 483ms · **window**: 666ms
- frames 10 · avg 66.5ms · p95 483ms · worst 483ms · >50ms: 1
- long tasks: 1 (total 483ms, worst 483ms)
- queries subscribed during window: 0 · active data subs after: 484 · dom mutations: 11 · heap: 243MB
- react commits by boundary (worst first):
  - `app-root`: 4 commits, total 449ms, worst 448ms
  - `game-body`: 4 commits, total 449ms, worst 448ms
  - `screen:game`: 4 commits, total 449ms, worst 448ms
  - `op-tabs`: 4 commits, total 445ms, worst 444ms

### scroll: operator roles table
- kind: `scroll` · measured at +71402ms into run
- **settle**: 47ms · **first DOM change**: 47ms · **window**: 2466ms
- frames 142 · avg 17.4ms · p95 17ms · worst 48ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 484 · dom mutations: 1 · heap: 246MB
- react commits by boundary (worst first):
  - `app-root`: 3 commits, total 4ms, worst 3ms
  - `op-tabs`: 3 commits, total 4ms, worst 3ms
  - `game-body`: 3 commits, total 4ms, worst 3ms
  - `screen:game`: 3 commits, total 4ms, worst 3ms

### navigate → game list
- kind: `navigate` · measured at +73868ms into run
- **settle**: 675ms · **first DOM change**: 3ms · **window**: 1441ms
- frames 76 · avg 19.0ms · p95 17ms · worst 192ms · >50ms: 1
- long tasks: 1 (total 208ms, worst 208ms)
- backend writes this window: user_vars:set 0.0ms
- queries subscribed during window: 0 · active data subs after: 484 · dom mutations: 267 · heap: 259MB
- react commits by boundary (worst first):
  - `app-root`: 10 commits, total 37ms, worst 19ms
  - `screen:allGames`: 3 commits, total 27ms, worst 18ms
  - `op-tabs`: 3 commits, total 2ms, worst 1ms
  - `game-body`: 3 commits, total 2ms, worst 1ms
  - `screen:game`: 3 commits, total 2ms, worst 1ms

### — Phase C — player game
> current user is a player in SIMPLY567

### open game: SIMPLY567 (as player)
- kind: `navigate` · measured at +75309ms into run
- **settle**: 2383ms · **first DOM change**: 3ms · **window**: 3350ms
- frames 173 · avg 19.4ms · p95 17ms · worst 292ms · >50ms: 3
- long tasks: 2 (total 366ms, worst 247ms)
- backend writes this window: user_vars:set 0.1ms, user_lists:set 0.2ms, user_lists:set 0.0ms, user_lists:set 0.1ms, user_lists:set 0.0ms, user_lists:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_lists:set 0.1ms, user_lists:set 0.0ms, user_lists:set 0.1ms, user_lists:set 0.0ms, user_lists:set 0.0ms, user_vars:set 0.0ms
- queries subscribed during window: 67 · active data subs after: 534 · dom mutations: 1742 · heap: 81MB
- react commits by boundary (worst first):
  - `app-root`: 104 commits, total 410ms, worst 121ms
  - `screen:game`: 93 commits, total 374ms, worst 121ms
  - `game-body`: 86 commits, total 363ms, worst 121ms
  - `player-tabs`: 60 commits, total 342ms, worst 121ms
  - `screen:allGames`: 5 commits, total 22ms, worst 6ms

### tab → player:newspaper (cold mount)
- kind: `tab` · measured at +78660ms into run
- **settle**: 380ms · **first DOM change**: 34ms · **window**: 940ms
- frames 47 · avg 20.0ms · p95 25ms · worst 158ms · >50ms: 1
- long tasks: 1 (total 166ms, worst 166ms)
- backend writes this window: user_vars:set 0.1ms
- queries subscribed during window: 11 · active data subs after: 544 · dom mutations: 201 · heap: 96MB
- react commits by boundary (worst first):
  - `app-root`: 28 commits, total 178ms, worst 86ms
  - `screen:game`: 28 commits, total 178ms, worst 86ms
  - `game-body`: 28 commits, total 178ms, worst 86ms
  - `player-tabs`: 28 commits, total 174ms, worst 86ms

### tab → player:eyesOnly (cold mount)
- kind: `tab` · measured at +79601ms into run
- **settle**: 458ms · **first DOM change**: 70ms · **window**: 1025ms
- frames 52 · avg 19.7ms · p95 50ms · worst 92ms · >50ms: 2
- long tasks: 2 (total 121ms, worst 70ms)
- backend writes this window: user_vars:set 0.1ms
- queries subscribed during window: 8 · active data subs after: 551 · dom mutations: 95 · heap: 89MB
- react commits by boundary (worst first):
  - `app-root`: 19 commits, total 151ms, worst 30ms
  - `screen:game`: 19 commits, total 151ms, worst 30ms
  - `game-body`: 19 commits, total 151ms, worst 30ms
  - `player-tabs`: 19 commits, total 149ms, worst 28ms

### tab → player:ruleBook (cold mount)
- kind: `tab` · measured at +80626ms into run
- **settle**: 7834ms · **first DOM change**: 49ms · **window**: 8008ms
- frames 462 · avg 17.3ms · p95 17ms · worst 309ms · >50ms: 1
- long tasks: 2 (total 309ms, worst 242ms)
- queries subscribed during window: 2 · active data subs after: 553 · dom mutations: 668 · heap: 105MB
- react commits by boundary (worst first):
  - `app-root`: 17 commits, total 395ms, worst 128ms
  - `game-body`: 17 commits, total 395ms, worst 128ms
  - `screen:game`: 17 commits, total 395ms, worst 128ms
  - `player-tabs`: 17 commits, total 392ms, worst 128ms
- notes: (settle timeout 8000ms)

### tab → player:phoneBook (cold mount)
- kind: `tab` · measured at +88634ms into run
- **settle**: 8015ms · **first DOM change**: 75ms · **window**: 8015ms
- frames 458 · avg 17.5ms · p95 17ms · worst 333ms · >50ms: 2
- long tasks: 2 (total 408ms, worst 331ms)
- queries subscribed during window: 29 · active data subs after: 578 · dom mutations: 1016 · heap: 123MB
- react commits by boundary (worst first):
  - `app-root`: 27 commits, total 501ms, worst 110ms
  - `screen:game`: 27 commits, total 501ms, worst 110ms
  - `game-body`: 27 commits, total 500ms, worst 110ms
  - `player-tabs`: 27 commits, total 498ms, worst 110ms
- notes: (settle timeout 8000ms)

### tab → player:newspaper (warm revisit)
- kind: `tab` · measured at +96649ms into run
- **settle**: 345ms · **first DOM change**: 31ms · **window**: 526ms
- frames 28 · avg 18.8ms · p95 34ms · worst 58ms · >50ms: 1
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 50 · heap: 123MB
- react commits by boundary (worst first):
  - `app-root`: 16 commits, total 43ms, worst 24ms
  - `game-body`: 16 commits, total 43ms, worst 24ms
  - `screen:game`: 16 commits, total 43ms, worst 24ms
  - `player-tabs`: 16 commits, total 41ms, worst 22ms

### tab → player:eyesOnly (warm revisit)
- kind: `tab` · measured at +97176ms into run
- **settle**: 29ms · **first DOM change**: 25ms · **window**: 308ms
- frames 18 · avg 17.1ms · p95 24ms · worst 24ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 16 · heap: 128MB
- react commits by boundary (worst first):
  - `game-body`: 3 commits, total 20ms, worst 20ms
  - `screen:game`: 3 commits, total 20ms, worst 20ms
  - `app-root`: 3 commits, total 20ms, worst 20ms
  - `player-tabs`: 3 commits, total 17ms, worst 17ms

### tab → player:ruleBook (warm revisit)
- kind: `tab` · measured at +97484ms into run
- **settle**: 375ms · **first DOM change**: 26ms · **window**: 566ms
- frames 33 · avg 17.2ms · p95 17ms · worst 33ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 19 · heap: 116MB
- react commits by boundary (worst first):
  - `screen:game`: 5 commits, total 45ms, worst 21ms
  - `app-root`: 5 commits, total 45ms, worst 21ms
  - `game-body`: 5 commits, total 45ms, worst 21ms
  - `player-tabs`: 5 commits, total 42ms, worst 18ms

### tab → player:phoneBook (warm revisit)
- kind: `tab` · measured at +98051ms into run
- **settle**: 1233ms · **first DOM change**: 25ms · **window**: 1425ms
- frames 72 · avg 19.8ms · p95 17ms · worst 233ms · >50ms: 1
- long tasks: 1 (total 240ms, worst 240ms)
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 602 · heap: 143MB
- react commits by boundary (worst first):
  - `app-root`: 8 commits, total 257ms, worst 130ms
  - `screen:game`: 8 commits, total 257ms, worst 130ms
  - `game-body`: 8 commits, total 257ms, worst 130ms
  - `player-tabs`: 8 commits, total 255ms, worst 130ms

### tab → player:townSquare (warm revisit)
- kind: `tab` · measured at +99476ms into run
- **settle**: 179ms · **first DOM change**: 31ms · **window**: 366ms
- frames 21 · avg 17.4ms · p95 17ms · worst 33ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 37 · heap: 142MB
- react commits by boundary (worst first):
  - `app-root`: 4 commits, total 42ms, worst 25ms
  - `screen:game`: 4 commits, total 41ms, worst 25ms
  - `game-body`: 4 commits, total 41ms, worst 25ms
  - `player-tabs`: 4 commits, total 39ms, worst 22ms

### tab → player:townSquare (warm revisit)
- kind: `tab` · measured at +99842ms into run
- **settle**: 3ms · **first DOM change**: 3ms · **window**: 316ms
- frames 19 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 1 · heap: 143MB

### scroll: player town square
- kind: `scroll` · measured at +100159ms into run
- **settle**: 1490ms · **first DOM change**: 10ms · **window**: 2233ms
- frames 134 · avg 16.7ms · p95 17ms · worst 18ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 11 · heap: 109MB
- react commits by boundary (worst first):
  - `app-root`: 5 commits, total 42ms, worst 15ms
  - `player-tabs`: 5 commits, total 42ms, worst 15ms
  - `game-body`: 5 commits, total 42ms, worst 15ms
  - `screen:game`: 5 commits, total 42ms, worst 15ms

### tab → player:newspaper (warm revisit)
- kind: `tab` · measured at +102393ms into run
- **settle**: 343ms · **first DOM change**: 27ms · **window**: 524ms
- frames 31 · avg 16.9ms · p95 17ms · worst 24ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 26 · heap: 122MB
- react commits by boundary (worst first):
  - `app-root`: 18 commits, total 49ms, worst 21ms
  - `screen:game`: 18 commits, total 48ms, worst 21ms
  - `game-body`: 18 commits, total 48ms, worst 21ms
  - `player-tabs`: 18 commits, total 46ms, worst 19ms

### scroll: player newspaper
- kind: `scroll` · measured at +102917ms into run
- **settle**: 1737ms · **first DOM change**: 12ms · **window**: 2634ms
- frames 158 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 3 · heap: 108MB
- react commits by boundary (worst first):
  - `app-root`: 5 commits, total 44ms, worst 15ms
  - `player-tabs`: 5 commits, total 44ms, worst 15ms
  - `game-body`: 5 commits, total 44ms, worst 15ms
  - `screen:game`: 5 commits, total 44ms, worst 15ms

### tab → player:eyesOnly (warm revisit)
- kind: `tab` · measured at +105552ms into run
- **settle**: 110ms · **first DOM change**: 34ms · **window**: 307ms
- frames 17 · avg 18.0ms · p95 31ms · worst 31ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 17 · heap: 117MB
- react commits by boundary (worst first):
  - `game-body`: 5 commits, total 44ms, worst 26ms
  - `screen:game`: 5 commits, total 44ms, worst 26ms
  - `app-root`: 5 commits, total 44ms, worst 26ms
  - `player-tabs`: 5 commits, total 39ms, worst 21ms

### scroll: player eyes only
- kind: `scroll` · measured at +105859ms into run
- **settle**: 1791ms · **first DOM change**: 12ms · **window**: 2333ms
- frames 140 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 3 · heap: 104MB
- react commits by boundary (worst first):
  - `app-root`: 6 commits, total 53ms, worst 15ms
  - `game-body`: 6 commits, total 53ms, worst 15ms
  - `screen:game`: 6 commits, total 53ms, worst 15ms
  - `player-tabs`: 6 commits, total 53ms, worst 15ms

### tab → player:ruleBook (warm revisit)
- kind: `tab` · measured at +108192ms into run
- **settle**: 466ms · **first DOM change**: 26ms · **window**: 650ms
- frames 38 · avg 17.1ms · p95 17ms · worst 33ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 21 · heap: 114MB
- react commits by boundary (worst first):
  - `game-body`: 4 commits, total 37ms, worst 20ms
  - `screen:game`: 4 commits, total 37ms, worst 20ms
  - `app-root`: 4 commits, total 37ms, worst 20ms
  - `player-tabs`: 4 commits, total 35ms, worst 18ms

### scroll: player rulebook (scroll-linked)
- kind: `scroll` · measured at +108842ms into run
- **settle**: 2835ms · **first DOM change**: 9ms · **window**: 2835ms
- frames 170 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 341 · heap: 104MB
- react commits by boundary (worst first):
  - `app-root`: 8 commits, total 57ms, worst 15ms
  - `game-body`: 8 commits, total 57ms, worst 14ms
  - `screen:game`: 8 commits, total 57ms, worst 14ms
  - `player-tabs`: 8 commits, total 57ms, worst 14ms

### tab → player:phoneBook (warm revisit)
- kind: `tab` · measured at +111677ms into run
- **settle**: 1607ms · **first DOM change**: 25ms · **window**: 1790ms
- frames 93 · avg 19.2ms · p95 17ms · worst 250ms · >50ms: 1
- long tasks: 1 (total 250ms, worst 250ms)
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 623 · heap: 107MB
- react commits by boundary (worst first):
  - `app-root`: 9 commits, total 270ms, worst 133ms
  - `screen:game`: 9 commits, total 270ms, worst 133ms
  - `game-body`: 9 commits, total 270ms, worst 133ms
  - `player-tabs`: 9 commits, total 268ms, worst 133ms

### scroll: player phone book
- kind: `scroll` · measured at +113467ms into run
- **settle**: 2334ms · **first DOM change**: 11ms · **window**: 2334ms
- frames 140 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 136 · heap: 130MB
- react commits by boundary (worst first):
  - `app-root`: 8 commits, total 79ms, worst 15ms
  - `player-tabs`: 8 commits, total 79ms, worst 15ms
  - `game-body`: 8 commits, total 79ms, worst 15ms
  - `screen:game`: 8 commits, total 79ms, worst 15ms

### navigate → game list
- kind: `navigate` · measured at +115802ms into run
- **settle**: 623ms · **first DOM change**: 3ms · **window**: 1390ms
- frames 77 · avg 18.0ms · p95 17ms · worst 92ms · >50ms: 1
- long tasks: 2 (total 164ms, worst 107ms)
- backend writes this window: user_vars:set 0.1ms
- queries subscribed during window: 3 · active data subs after: 581 · dom mutations: 174 · heap: 131MB
- react commits by boundary (worst first):
  - `app-root`: 12 commits, total 70ms, worst 20ms
  - `screen:allGames`: 3 commits, total 38ms, worst 20ms
  - `screen:game`: 6 commits, total 24ms, worst 6ms
  - `game-body`: 6 commits, total 24ms, worst 6ms
  - `player-tabs`: 4 commits, total 23ms, worst 6ms

### — Phase D — newser game
> current user is the newser of SIMNEWS9

### open game: SIMNEWS9 (as newser)
- kind: `navigate` · measured at +117192ms into run
- **settle**: 2400ms · **first DOM change**: 3ms · **window**: 3366ms
- frames 176 · avg 19.1ms · p95 17ms · worst 300ms · >50ms: 3
- long tasks: 2 (total 367ms, worst 251ms)
- backend writes this window: user_vars:set 0.0ms, user_lists:set 0.1ms, user_lists:set 0.1ms, user_lists:set 0.1ms, user_lists:set 0.0ms, user_lists:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms
- queries subscribed during window: 54 · active data subs after: 624 · dom mutations: 1746 · heap: 85MB
- react commits by boundary (worst first):
  - `app-root`: 88 commits, total 391ms, worst 120ms
  - `screen:game`: 77 commits, total 355ms, worst 120ms
  - `game-body`: 70 commits, total 348ms, worst 120ms
  - `newser-tabs`: 60 commits, total 332ms, worst 120ms
  - `screen:allGames`: 5 commits, total 22ms, worst 6ms

### tab → newser:newspaper (cold mount)
- kind: `tab` · measured at +120559ms into run
- **settle**: 288ms · **first DOM change**: 31ms · **window**: 841ms
- frames 39 · avg 21.6ms · p95 83ms · worst 100ms · >50ms: 2
- long tasks: 1 (total 93ms, worst 93ms)
- backend writes this window: user_vars:set 0.1ms, user_vars:set 0.0ms, user_lists:set 0.0ms
- queries subscribed during window: 19 · active data subs after: 638 · dom mutations: 68 · heap: 111MB
- react commits by boundary (worst first):
  - `app-root`: 33 commits, total 169ms, worst 43ms
  - `screen:game`: 33 commits, total 168ms, worst 43ms
  - `game-body`: 33 commits, total 168ms, worst 43ms
  - `newser-tabs`: 33 commits, total 166ms, worst 43ms

### tab → newser:ruleBook (cold mount)
- kind: `tab` · measured at +121400ms into run
- **settle**: 7810ms · **first DOM change**: 20ms · **window**: 8008ms
- frames 467 · avg 17.1ms · p95 17ms · worst 242ms · >50ms: 1
- long tasks: 1 (total 195ms, worst 195ms)
- queries subscribed during window: 2 · active data subs after: 640 · dom mutations: 726 · heap: 93MB
- react commits by boundary (worst first):
  - `app-root`: 10 commits, total 202ms, worst 86ms
  - `game-body`: 10 commits, total 202ms, worst 86ms
  - `screen:game`: 10 commits, total 202ms, worst 86ms
  - `newser-tabs`: 10 commits, total 201ms, worst 86ms
- notes: (settle timeout 8000ms)

### tab → newser:phoneBook (cold mount)
- kind: `tab` · measured at +129409ms into run
- **settle**: 7831ms · **first DOM change**: 58ms · **window**: 8016ms
- frames 461 · avg 17.4ms · p95 17ms · worst 308ms · >50ms: 2
- long tasks: 2 (total 374ms, worst 315ms)
- queries subscribed during window: 31 · active data subs after: 667 · dom mutations: 1016 · heap: 130MB
- react commits by boundary (worst first):
  - `app-root`: 22 commits, total 356ms, worst 96ms
  - `screen:game`: 22 commits, total 355ms, worst 96ms
  - `game-body`: 22 commits, total 355ms, worst 96ms
  - `newser-tabs`: 22 commits, total 353ms, worst 96ms
- notes: (settle timeout 8000ms)

### tab → newser:newspaper (warm revisit)
- kind: `tab` · measured at +137425ms into run
- **settle**: 700ms · **first DOM change**: 12ms · **window**: 883ms
- frames 52 · avg 17.0ms · p95 17ms · worst 33ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 667 · dom mutations: 153 · heap: 119MB
- react commits by boundary (worst first):
  - `game-body`: 3 commits, total 11ms, worst 8ms
  - `screen:game`: 3 commits, total 11ms, worst 8ms
  - `app-root`: 3 commits, total 11ms, worst 8ms
  - `newser-tabs`: 3 commits, total 9ms, worst 6ms

### tab → newser:ruleBook (warm revisit)
- kind: `tab` · measured at +138309ms into run
- **settle**: 702ms · **first DOM change**: 8ms · **window**: 883ms
- frames 53 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 667 · dom mutations: 96 · heap: 121MB
- react commits by boundary (worst first):
  - `game-body`: 3 commits, total 8ms, worst 5ms
  - `screen:game`: 3 commits, total 8ms, worst 5ms
  - `app-root`: 3 commits, total 8ms, worst 5ms
  - `newser-tabs`: 3 commits, total 6ms, worst 3ms

### tab → newser:phoneBook (warm revisit)
- kind: `tab` · measured at +139192ms into run
- **settle**: 1250ms · **first DOM change**: 8ms · **window**: 1442ms
- frames 74 · avg 19.5ms · p95 17ms · worst 225ms · >50ms: 1
- long tasks: 1 (total 231ms, worst 231ms)
- queries subscribed during window: 0 · active data subs after: 667 · dom mutations: 601 · heap: 102MB
- react commits by boundary (worst first):
  - `app-root`: 7 commits, total 221ms, worst 120ms
  - `screen:game`: 7 commits, total 221ms, worst 120ms
  - `game-body`: 7 commits, total 221ms, worst 120ms
  - `newser-tabs`: 7 commits, total 219ms, worst 120ms

### tab → newser:townSquare (warm revisit)
- kind: `tab` · measured at +140634ms into run
- **settle**: 25ms · **first DOM change**: 13ms · **window**: 316ms
- frames 19 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 667 · dom mutations: 36 · heap: 122MB
- react commits by boundary (worst first):
  - `app-root`: 2 commits, total 9ms, worst 9ms
  - `screen:game`: 2 commits, total 9ms, worst 9ms
  - `game-body`: 2 commits, total 9ms, worst 9ms
  - `newser-tabs`: 2 commits, total 7ms, worst 7ms

### tab → newser:newspaper (warm revisit)
- kind: `tab` · measured at +140950ms into run
- **settle**: 667ms · **first DOM change**: 9ms · **window**: 850ms
- frames 51 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 667 · dom mutations: 128 · heap: 124MB
- react commits by boundary (worst first):
  - `app-root`: 3 commits, total 8ms, worst 5ms
  - `game-body`: 3 commits, total 8ms, worst 5ms
  - `screen:game`: 3 commits, total 8ms, worst 5ms
  - `newser-tabs`: 3 commits, total 6ms, worst 3ms

### scroll: newser newspaper editor
- kind: `scroll` · measured at +141800ms into run
- **settle**: 517ms · **first DOM change**: 11ms · **window**: 2733ms
- frames 164 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 667 · dom mutations: 28 · heap: 126MB
- react commits by boundary (worst first):
  - `newser-tabs`: 3 commits, total 6ms, worst 2ms
  - `game-body`: 3 commits, total 6ms, worst 2ms
  - `screen:game`: 3 commits, total 6ms, worst 2ms
  - `app-root`: 3 commits, total 6ms, worst 2ms

### navigate → game list
- kind: `navigate` · measured at +144534ms into run
- **settle**: 608ms · **first DOM change**: 3ms · **window**: 1375ms
- frames 78 · avg 17.6ms · p95 17ms · worst 67ms · >50ms: 1
- long tasks: 2 (total 134ms, worst 83ms)
- backend writes this window: user_vars:set 0.0ms
- queries subscribed during window: 0 · active data subs after: 667 · dom mutations: 176 · heap: 123MB
- react commits by boundary (worst first):
  - `app-root`: 10 commits, total 38ms, worst 19ms
  - `screen:allGames`: 3 commits, total 26ms, worst 18ms
  - `newser-tabs`: 2 commits, total 4ms, worst 2ms
  - `game-body`: 2 commits, total 4ms, worst 2ms
  - `screen:game`: 2 commits, total 4ms, worst 2ms

### — Phase E — modal lab
> every dialog with fixture data, opened/closed/measured

### modal open: MarkdownEditorDialog (heavy editor)
- kind: `modal-open` · measured at +145931ms into run
- **settle**: 346ms · **first DOM change**: 18ms · **window**: 1010ms
- frames 41 · avg 24.6ms · p95 17ms · worst 310ms · >50ms: 2
- long tasks: 2 (total 386ms, worst 326ms)
- backend writes this window: user_vars:set 0.0ms
- queries subscribed during window: 2 · active data subs after: 668 · dom mutations: 459 · heap: 87MB

### modal close: MarkdownEditorDialog (heavy editor)
- kind: `modal-close` · measured at +146942ms into run
- **settle**: 209ms · **first DOM change**: 41ms · **window**: 475ms
- frames 28 · avg 16.9ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 668 · dom mutations: 30 · heap: 100MB

### modal open: markdown-editor (for minimize test)
- kind: `modal-open` · measured at +147417ms into run
- **settle**: 300ms · **first DOM change**: 281ms · **window**: 867ms
- frames 36 · avg 24.1ms · p95 17ms · worst 283ms · >50ms: 1
- long tasks: 1 (total 285ms, worst 285ms)
- queries subscribed during window: 0 · active data subs after: 668 · dom mutations: 434 · heap: 101MB

### modal minimize: markdown-editor
- kind: `action` · measured at +148284ms into run
- **settle**: 287ms · **first DOM change**: 52ms · **window**: 850ms
- frames 50 · avg 17.0ms · p95 17ms · worst 33ms · >50ms: 0
- long tasks: 1 (total 52ms, worst 52ms)
- queries subscribed during window: 0 · active data subs after: 668 · dom mutations: 37 · heap: 107MB
- react commits by boundary (worst first):
  - `screen:allGames`: 1 commits, total 1ms, worst 1ms
  - `app-root`: 1 commits, total 1ms, worst 1ms

### modal restore: markdown-editor
- kind: `action` · measured at +149134ms into run
- **settle**: 192ms · **first DOM change**: 42ms · **window**: 908ms
- frames 54 · avg 16.8ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 668 · dom mutations: 18 · heap: 111MB
- react commits by boundary (worst first):
  - `screen:allGames`: 1 commits, total 1ms, worst 1ms
  - `app-root`: 1 commits, total 1ms, worst 1ms

### modal close: markdown-editor (after restore)
- kind: `modal-close` · measured at +150042ms into run
- **settle**: 200ms · **first DOM change**: 37ms · **window**: 466ms
- frames 28 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 668 · dom mutations: 24 · heap: 124MB

### modal open: TownSquarePostDialog
- kind: `modal-open` · measured at +150509ms into run
- **settle**: 176ms · **first DOM change**: 19ms · **window**: 841ms
- frames 43 · avg 19.6ms · p95 17ms · worst 116ms · >50ms: 1
- long tasks: 2 (total 171ms, worst 117ms)
- queries subscribed during window: 1 · active data subs after: 669 · dom mutations: 126 · heap: 84MB

### modal close: TownSquarePostDialog
- kind: `modal-close` · measured at +151350ms into run
- **settle**: 200ms · **first DOM change**: 37ms · **window**: 466ms
- frames 28 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 104MB

### modal open: PlayerProfileDialogNEW
- kind: `modal-open` · measured at +151817ms into run
- **settle**: 125ms · **first DOM change**: 21ms · **window**: 775ms
- frames 41 · avg 18.9ms · p95 17ms · worst 108ms · >50ms: 1
- long tasks: 1 (total 114ms, worst 114ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 89 · heap: 103MB

### modal close: PlayerProfileDialogNEW
- kind: `modal-close` · measured at +152592ms into run
- **settle**: 200ms · **first DOM change**: 32ms · **window**: 466ms
- frames 28 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 107MB

### modal open: UserEditDialog
- kind: `modal-open` · measured at +153058ms into run
- **settle**: 108ms · **first DOM change**: 21ms · **window**: 775ms
- frames 42 · avg 18.4ms · p95 17ms · worst 91ms · >50ms: 1
- long tasks: 1 (total 97ms, worst 97ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 52 · heap: 102MB

### modal close: UserEditDialog
- kind: `modal-close` · measured at +153834ms into run
- **settle**: 183ms · **first DOM change**: 30ms · **window**: 450ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 106MB

### modal open: UserAddDialog
- kind: `modal-open` · measured at +154283ms into run
- **settle**: 108ms · **first DOM change**: 23ms · **window**: 775ms
- frames 42 · avg 18.4ms · p95 17ms · worst 91ms · >50ms: 1
- long tasks: 1 (total 93ms, worst 93ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 42 · heap: 100MB

### modal close: UserAddDialog
- kind: `modal-close` · measured at +155058ms into run
- **settle**: 184ms · **first DOM change**: 30ms · **window**: 450ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 103MB

### modal open: RoleEditDialog
- kind: `modal-open` · measured at +155508ms into run
- **settle**: 83ms · **first DOM change**: 23ms · **window**: 750ms
- frames 42 · avg 17.8ms · p95 17ms · worst 66ms · >50ms: 1
- long tasks: 1 (total 70ms, worst 70ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 41 · heap: 113MB

### modal close: RoleEditDialog
- kind: `modal-close` · measured at +156258ms into run
- **settle**: 183ms · **first DOM change**: 31ms · **window**: 450ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 117MB

### modal open: RoleAddDialog
- kind: `modal-open` · measured at +156708ms into run
- **settle**: 83ms · **first DOM change**: 24ms · **window**: 750ms
- frames 42 · avg 17.8ms · p95 17ms · worst 66ms · >50ms: 1
- long tasks: 1 (total 72ms, worst 72ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 38 · heap: 102MB

### modal close: RoleAddDialog
- kind: `modal-close` · measured at +157458ms into run
- **settle**: 200ms · **first DOM change**: 32ms · **window**: 466ms
- frames 28 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 82MB

### modal open: VoteEditorDialog
- kind: `modal-open` · measured at +157925ms into run
- **settle**: 109ms · **first DOM change**: 25ms · **window**: 775ms
- frames 42 · avg 18.4ms · p95 17ms · worst 91ms · >50ms: 1
- long tasks: 1 (total 91ms, worst 91ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 41 · heap: 101MB

### modal close: VoteEditorDialog
- kind: `modal-close` · measured at +158700ms into run
- **settle**: 200ms · **first DOM change**: 33ms · **window**: 466ms
- frames 28 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 105MB

### modal open: VoteEnableDialog
- kind: `modal-open` · measured at +159167ms into run
- **settle**: 83ms · **first DOM change**: 26ms · **window**: 750ms
- frames 42 · avg 17.8ms · p95 17ms · worst 66ms · >50ms: 1
- long tasks: 1 (total 73ms, worst 73ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 37 · heap: 89MB

### modal close: VoteEnableDialog
- kind: `modal-close` · measured at +159917ms into run
- **settle**: 183ms · **first DOM change**: 34ms · **window**: 450ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 93MB

### modal open: ActionEditorDialog
- kind: `modal-open` · measured at +160367ms into run
- **settle**: 100ms · **first DOM change**: 26ms · **window**: 766ms
- frames 42 · avg 18.2ms · p95 17ms · worst 83ms · >50ms: 1
- long tasks: 1 (total 91ms, worst 91ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 37 · heap: 92MB

### modal close: ActionEditorDialog
- kind: `modal-close` · measured at +161134ms into run
- **settle**: 183ms · **first DOM change**: 34ms · **window**: 450ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 96MB

### modal open: BioEditorDialog
- kind: `modal-open` · measured at +161583ms into run
- **settle**: 158ms · **first DOM change**: 28ms · **window**: 825ms
- frames 42 · avg 19.6ms · p95 17ms · worst 141ms · >50ms: 1
- long tasks: 1 (total 143ms, worst 143ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 66 · heap: 105MB

### modal close: BioEditorDialog
- kind: `modal-close` · measured at +162409ms into run
- **settle**: 183ms · **first DOM change**: 37ms · **window**: 450ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 98MB

### modal open: TagCellEditor
- kind: `modal-open` · measured at +162858ms into run
- **settle**: 142ms · **first DOM change**: 28ms · **window**: 808ms
- frames 42 · avg 19.2ms · p95 17ms · worst 124ms · >50ms: 1
- long tasks: 1 (total 129ms, worst 129ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 55 · heap: 102MB

### modal close: TagCellEditor
- kind: `modal-close` · measured at +163667ms into run
- **settle**: 200ms · **first DOM change**: 40ms · **window**: 467ms
- frames 28 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 107MB

### modal open: AddTagDialog
- kind: `modal-open` · measured at +164133ms into run
- **settle**: 117ms · **first DOM change**: 32ms · **window**: 784ms
- frames 42 · avg 18.6ms · p95 17ms · worst 100ms · >50ms: 1
- long tasks: 1 (total 100ms, worst 100ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 35 · heap: 86MB

### modal close: AddTagDialog
- kind: `modal-close` · measured at +164918ms into run
- **settle**: 207ms · **first DOM change**: 40ms · **window**: 474ms
- frames 28 · avg 16.9ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 90MB

### modal open: AddTagDialog (edit mode + trigger script)
- kind: `modal-open` · measured at +165392ms into run
- **settle**: 133ms · **first DOM change**: 32ms · **window**: 801ms
- frames 42 · avg 19.0ms · p95 17ms · worst 116ms · >50ms: 1
- long tasks: 1 (total 117ms, worst 117ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 56 · heap: 93MB

### modal close: AddTagDialog (edit mode + trigger script)
- kind: `modal-close` · measured at +166193ms into run
- **settle**: 199ms · **first DOM change**: 48ms · **window**: 465ms
- frames 27 · avg 17.2ms · p95 17ms · worst 33ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 98MB

### modal open: ChooseDayDialog
- kind: `modal-open` · measured at +166658ms into run
- **settle**: 125ms · **first DOM change**: 37ms · **window**: 792ms
- frames 42 · avg 18.8ms · p95 17ms · worst 108ms · >50ms: 1
- long tasks: 1 (total 108ms, worst 108ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 34 · heap: 97MB

### modal close: ChooseDayDialog
- kind: `modal-close` · measured at +167450ms into run
- **settle**: 208ms · **first DOM change**: 44ms · **window**: 475ms
- frames 28 · avg 16.9ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 102MB

### modal open: DaySelectionDialog
- kind: `modal-open` · measured at +167925ms into run
- **settle**: 108ms · **first DOM change**: 37ms · **window**: 776ms
- frames 42 · avg 18.4ms · p95 17ms · worst 91ms · >50ms: 1
- long tasks: 1 (total 92ms, worst 92ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 32 · heap: 113MB

### modal close: DaySelectionDialog
- kind: `modal-close` · measured at +168701ms into run
- **settle**: 207ms · **first DOM change**: 45ms · **window**: 474ms
- frames 28 · avg 16.9ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 100MB

### modal open: DaysPerGameDayDialog
- kind: `modal-open` · measured at +169175ms into run
- **settle**: 108ms · **first DOM change**: 38ms · **window**: 775ms
- frames 42 · avg 18.4ms · p95 17ms · worst 91ms · >50ms: 1
- long tasks: 1 (total 92ms, worst 92ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 34 · heap: 111MB

### modal close: DaysPerGameDayDialog
- kind: `modal-close` · measured at +169950ms into run
- **settle**: 208ms · **first DOM change**: 45ms · **window**: 475ms
- frames 28 · avg 16.9ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 116MB

### modal open: DeleteRoleConfirmationDialog
- kind: `modal-open` · measured at +170425ms into run
- **settle**: 108ms · **first DOM change**: 38ms · **window**: 775ms
- frames 42 · avg 18.4ms · p95 17ms · worst 91ms · >50ms: 1
- long tasks: 1 (total 96ms, worst 96ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 34 · heap: 105MB

### modal close: DeleteRoleConfirmationDialog
- kind: `modal-close` · measured at +171200ms into run
- **settle**: 208ms · **first DOM change**: 47ms · **window**: 475ms
- frames 28 · avg 16.9ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 110MB

### modal open: EditInfoDialog
- kind: `modal-open` · measured at +171675ms into run
- **settle**: 117ms · **first DOM change**: 39ms · **window**: 783ms
- frames 42 · avg 18.6ms · p95 17ms · worst 99ms · >50ms: 1
- long tasks: 1 (total 103ms, worst 103ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 42 · heap: 123MB

### modal close: EditInfoDialog
- kind: `modal-close` · measured at +172458ms into run
- **settle**: 192ms · **first DOM change**: 46ms · **window**: 458ms
- frames 27 · avg 17.0ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 85MB

### modal open: JoinedGameOptionsDialog
- kind: `modal-open` · measured at +172917ms into run
- **settle**: 150ms · **first DOM change**: 40ms · **window**: 816ms
- frames 42 · avg 19.4ms · p95 17ms · worst 133ms · >50ms: 1
- long tasks: 1 (total 138ms, worst 138ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 42 · heap: 94MB

### modal close: JoinedGameOptionsDialog
- kind: `modal-close` · measured at +173733ms into run
- **settle**: 208ms · **first DOM change**: 48ms · **window**: 475ms
- frames 28 · avg 16.9ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 108MB

### modal open: ArchivedGamesDialog
- kind: `modal-open` · measured at +174208ms into run
- **settle**: 150ms · **first DOM change**: 41ms · **window**: 816ms
- frames 42 · avg 19.4ms · p95 17ms · worst 133ms · >50ms: 1
- long tasks: 1 (total 137ms, worst 137ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 32 · heap: 115MB

### modal close: ArchivedGamesDialog
- kind: `modal-close` · measured at +175025ms into run
- **settle**: 192ms · **first DOM change**: 48ms · **window**: 458ms
- frames 27 · avg 17.0ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 106MB

### modal open: MarkdownInputBuilderDialog
- kind: `modal-open` · measured at +175483ms into run
- **settle**: 125ms · **first DOM change**: 42ms · **window**: 792ms
- frames 42 · avg 18.8ms · p95 17ms · worst 108ms · >50ms: 1
- long tasks: 1 (total 111ms, worst 111ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 53 · heap: 103MB

### modal close: MarkdownInputBuilderDialog
- kind: `modal-close` · measured at +176275ms into run
- **settle**: 192ms · **first DOM change**: 48ms · **window**: 458ms
- frames 27 · avg 17.0ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 108MB

### modal open: MarkdownVariableDialog
- kind: `modal-open` · measured at +176733ms into run
- **settle**: 108ms · **first DOM change**: 41ms · **window**: 759ms
- frames 41 · avg 18.5ms · p95 17ms · worst 91ms · >50ms: 1
- long tasks: 1 (total 98ms, worst 98ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 31 · heap: 120MB

### modal close: MarkdownVariableDialog
- kind: `modal-close` · measured at +177493ms into run
- **settle**: 216ms · **first DOM change**: 50ms · **window**: 482ms
- frames 28 · avg 17.2ms · p95 17ms · worst 33ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 106MB

### modal open: NightlyCertificationDialog
- kind: `modal-open` · measured at +177975ms into run
- **settle**: 192ms · **first DOM change**: 43ms · **window**: 858ms
- frames 42 · avg 20.4ms · p95 17ms · worst 175ms · >50ms: 1
- long tasks: 1 (total 177ms, worst 177ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 182 · heap: 88MB

### modal close: NightlyCertificationDialog
- kind: `modal-close` · measured at +178833ms into run
- **settle**: 200ms · **first DOM change**: 53ms · **window**: 466ms
- frames 27 · avg 17.3ms · p95 17ms · worst 33ms · >50ms: 0
- long tasks: 1 (total 53ms, worst 53ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 94MB

### modal open: ScheduleTableUpdateDialog
- kind: `modal-open` · measured at +179300ms into run
- **settle**: 158ms · **first DOM change**: 48ms · **window**: 808ms
- frames 41 · avg 19.7ms · p95 17ms · worst 141ms · >50ms: 1
- long tasks: 1 (total 144ms, worst 144ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 60 · heap: 111MB

### modal close: ScheduleTableUpdateDialog
- kind: `modal-close` · measured at +180108ms into run
- **settle**: 217ms · **first DOM change**: 53ms · **window**: 483ms
- frames 28 · avg 17.2ms · p95 17ms · worst 33ms · >50ms: 0
- long tasks: 1 (total 53ms, worst 53ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 95MB

### modal open: ColumnActionsDialog
- kind: `modal-open` · measured at +180592ms into run
- **settle**: 125ms · **first DOM change**: 45ms · **window**: 793ms
- frames 42 · avg 18.8ms · p95 17ms · worst 108ms · >50ms: 1
- long tasks: 1 (total 113ms, worst 113ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 43 · heap: 110MB

### modal close: ColumnActionsDialog
- kind: `modal-close` · measured at +181384ms into run
- **settle**: 216ms · **first DOM change**: 54ms · **window**: 482ms
- frames 28 · avg 17.2ms · p95 17ms · worst 33ms · >50ms: 0
- long tasks: 1 (total 54ms, worst 54ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 99MB

### modal open: PhoneBookTocDialog
- kind: `modal-open` · measured at +181867ms into run
- **settle**: 150ms · **first DOM change**: 48ms · **window**: 818ms
- frames 42 · avg 19.4ms · p95 17ms · worst 133ms · >50ms: 1
- long tasks: 1 (total 135ms, worst 135ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 42 · heap: 104MB

### modal close: PhoneBookTocDialog
- kind: `modal-close` · measured at +182684ms into run
- **settle**: 216ms · **first DOM change**: 55ms · **window**: 482ms
- frames 28 · avg 17.2ms · p95 17ms · worst 33ms · >50ms: 0
- long tasks: 1 (total 54ms, worst 54ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 120MB

### modal open: TableOfContentsDialog (rulebook)
- kind: `modal-open` · measured at +183167ms into run
- **settle**: 150ms · **first DOM change**: 47ms · **window**: 817ms
- frames 42 · avg 19.4ms · p95 17ms · worst 133ms · >50ms: 1
- long tasks: 1 (total 140ms, worst 140ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 88 · heap: 120MB

### modal close: TableOfContentsDialog (rulebook)
- kind: `modal-close` · measured at +183983ms into run
- **settle**: 217ms · **first DOM change**: 56ms · **window**: 483ms
- frames 28 · avg 17.2ms · p95 17ms · worst 33ms · >50ms: 0
- long tasks: 1 (total 56ms, worst 56ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 126MB

### modal open: ImportDraftDialog
- kind: `modal-open` · measured at +184467ms into run
- **settle**: 196ms · **first DOM change**: 48ms · **window**: 858ms
- frames 43 · avg 19.9ms · p95 17ms · worst 116ms · >50ms: 2
- long tasks: 2 (total 191ms, worst 119ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 120 · heap: 89MB

### modal close: ImportDraftDialog
- kind: `modal-close` · measured at +185325ms into run
- **settle**: 225ms · **first DOM change**: 58ms · **window**: 491ms
- frames 28 · avg 17.5ms · p95 17ms · worst 42ms · >50ms: 0
- long tasks: 1 (total 58ms, worst 58ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 104MB

### modal open: NewspaperSectionOptionsDialog
- kind: `modal-open` · measured at +185817ms into run
- **settle**: 158ms · **first DOM change**: 50ms · **window**: 825ms
- frames 42 · avg 19.6ms · p95 17ms · worst 141ms · >50ms: 1
- long tasks: 1 (total 148ms, worst 148ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 39 · heap: 106MB

### modal close: NewspaperSectionOptionsDialog
- kind: `modal-close` · measured at +186642ms into run
- **settle**: 225ms · **first DOM change**: 58ms · **window**: 491ms
- frames 28 · avg 17.5ms · p95 17ms · worst 42ms · >50ms: 0
- long tasks: 1 (total 57ms, worst 57ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 113MB

### modal open: PlayerPreviewModal
- kind: `modal-open` · measured at +187133ms into run
- **settle**: 217ms · **first DOM change**: 50ms · **window**: 884ms
- frames 42 · avg 21.0ms · p95 17ms · worst 199ms · >50ms: 1
- long tasks: 1 (total 203ms, worst 203ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 93 · heap: 117MB

### modal close: PlayerPreviewModal
- kind: `modal-close` · measured at +188018ms into run
- **settle**: 208ms · **first DOM change**: 61ms · **window**: 474ms
- frames 27 · avg 17.5ms · p95 17ms · worst 42ms · >50ms: 0
- long tasks: 1 (total 60ms, worst 60ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 124MB

### modal open: TownSquareImageDialog
- kind: `modal-open` · measured at +188492ms into run
- **settle**: 142ms · **first DOM change**: 50ms · **window**: 793ms
- frames 41 · avg 19.3ms · p95 17ms · worst 124ms · >50ms: 1
- long tasks: 1 (total 125ms, worst 125ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 36 · heap: 117MB

### modal close: TownSquareImageDialog
- kind: `modal-close` · measured at +189284ms into run
- **settle**: 224ms · **first DOM change**: 63ms · **window**: 490ms
- frames 28 · avg 17.5ms · p95 17ms · worst 42ms · >50ms: 0
- long tasks: 1 (total 63ms, worst 63ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 87MB

### modal open: TownSquareLinkDialog
- kind: `modal-open` · measured at +189775ms into run
- **settle**: 142ms · **first DOM change**: 52ms · **window**: 809ms
- frames 42 · avg 19.2ms · p95 17ms · worst 124ms · >50ms: 1
- long tasks: 1 (total 125ms, worst 125ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 39 · heap: 102MB

### modal close: TownSquareLinkDialog
- kind: `modal-close` · measured at +190584ms into run
- **settle**: 224ms · **first DOM change**: 58ms · **window**: 490ms
- frames 28 · avg 17.5ms · p95 17ms · worst 42ms · >50ms: 0
- long tasks: 1 (total 58ms, worst 58ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 108MB

### modal open: TownSquareMoreOptionsDialog
- kind: `modal-open` · measured at +191075ms into run
- **settle**: 142ms · **first DOM change**: 52ms · **window**: 808ms
- frames 42 · avg 19.2ms · p95 17ms · worst 124ms · >50ms: 1
- long tasks: 1 (total 126ms, worst 126ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 36 · heap: 100MB

### modal close: TownSquareMoreOptionsDialog
- kind: `modal-close` · measured at +191883ms into run
- **settle**: 208ms · **first DOM change**: 60ms · **window**: 475ms
- frames 27 · avg 17.6ms · p95 17ms · worst 42ms · >50ms: 0
- long tasks: 1 (total 60ms, worst 60ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 107MB

### modal open: ConfirmDialog
- kind: `modal-open` · measured at +192358ms into run
- **settle**: 142ms · **first DOM change**: 52ms · **window**: 808ms
- frames 42 · avg 19.2ms · p95 17ms · worst 125ms · >50ms: 1
- long tasks: 1 (total 126ms, worst 126ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 101MB

### modal close: ConfirmDialog
- kind: `modal-close` · measured at +193167ms into run
- **settle**: 225ms · **first DOM change**: 60ms · **window**: 491ms
- frames 28 · avg 17.5ms · p95 17ms · worst 42ms · >50ms: 0
- long tasks: 1 (total 60ms, worst 60ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 108MB

### modal open: ImageUploadDialog
- kind: `modal-open` · measured at +193658ms into run
- **settle**: 142ms · **first DOM change**: 53ms · **window**: 808ms
- frames 41 · avg 19.7ms · p95 22ms · worst 125ms · >50ms: 1
- long tasks: 1 (total 126ms, worst 126ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 44 · heap: 104MB

### modal close: ImageUploadDialog
- kind: `modal-close` · measured at +194467ms into run
- **settle**: 225ms · **first DOM change**: 60ms · **window**: 492ms
- frames 28 · avg 17.5ms · p95 17ms · worst 42ms · >50ms: 0
- long tasks: 1 (total 60ms, worst 60ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 47 · heap: 111MB

### modal open: SaveHistoryDialog
- kind: `modal-open` · measured at +194958ms into run
- **settle**: 142ms · **first DOM change**: 54ms · **window**: 808ms
- frames 42 · avg 19.2ms · p95 17ms · worst 124ms · >50ms: 1
- long tasks: 1 (total 132ms, worst 132ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 40 · heap: 109MB

### modal close: SaveHistoryDialog
- kind: `modal-close` · measured at +195767ms into run
- **settle**: 225ms · **first DOM change**: 61ms · **window**: 491ms
- frames 28 · avg 17.5ms · p95 17ms · worst 42ms · >50ms: 0
- long tasks: 1 (total 61ms, worst 61ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 115MB

### modal open: UnsavedChangesDialog
- kind: `modal-open` · measured at +196258ms into run
- **settle**: 134ms · **first DOM change**: 54ms · **window**: 801ms
- frames 42 · avg 19.0ms · p95 17ms · worst 116ms · >50ms: 1
- long tasks: 1 (total 121ms, worst 121ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 83MB

### modal close: UnsavedChangesDialog
- kind: `modal-close` · measured at +197059ms into run
- **settle**: 207ms · **first DOM change**: 59ms · **window**: 474ms
- frames 27 · avg 17.5ms · p95 17ms · worst 42ms · >50ms: 0
- long tasks: 1 (total 59ms, worst 59ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 89MB

### modal open: ViewOnlyPreviewModal
- kind: `modal-open` · measured at +197533ms into run
- **settle**: 133ms · **first DOM change**: 54ms · **window**: 801ms
- frames 42 · avg 19.0ms · p95 17ms · worst 116ms · >50ms: 1
- long tasks: 1 (total 121ms, worst 121ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 28 · heap: 104MB

### modal close: ViewOnlyPreviewModal
- kind: `modal-close` · measured at +198334ms into run
- **settle**: 224ms · **first DOM change**: 60ms · **window**: 490ms
- frames 28 · avg 17.5ms · p95 17ms · worst 42ms · >50ms: 0
- long tasks: 1 (total 60ms, worst 60ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 91MB

### modal open: DeleteGameConfirmationDialog
- kind: `modal-open` · measured at +198825ms into run
- **settle**: 133ms · **first DOM change**: 54ms · **window**: 801ms
- frames 42 · avg 19.0ms · p95 17ms · worst 116ms · >50ms: 1
- long tasks: 1 (total 124ms, worst 124ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 34 · heap: 106MB

### modal close: DeleteGameConfirmationDialog
- kind: `modal-close` · measured at +199626ms into run
- **settle**: 224ms · **first DOM change**: 61ms · **window**: 490ms
- frames 28 · avg 17.5ms · p95 17ms · worst 42ms · >50ms: 0
- long tasks: 1 (total 60ms, worst 60ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 95MB

### — Tour complete
> 164 steps in 198.2s
