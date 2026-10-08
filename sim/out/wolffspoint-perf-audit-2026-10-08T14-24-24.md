# WolffsPoint Perf Audit — Simulated Run

- **Started**: 2026-10-08T14:24:24.770Z
- **Run duration**: 193.0s
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
| 4 | action: New WolffsPoint dialog open | modal-open | 47ms | 22ms | p95 17ms, 0 slow | 0 | screen:allGames 0ms (1 commits) | 🟢 ok |
| 5 | modal close: New WolffsPoint | modal-close | 3ms | 3ms | p95 46ms, 0 slow | 0 | — | 🟢 ok |
| 6 | Phase B — operator game | note | 0ms | — | — | 0 | — | 🟢 ok |
| 7 | open game: SIMOP1234 (as operator) | navigate | 4300ms | 3ms | p95 108ms, 15 slow | 17 (243ms worst) | app-root 1832ms (529 commits) | 🔴 slow |
| 8 | tab → op:config (cold mount) | tab | 735ms | 383ms | p95 150ms, 4 slow | 2 (385ms worst) | app-root 515ms (142 commits) | 🔴 slow |
| 9 | tab → op:nightly (cold mount) | tab | 1768ms | 592ms | p95 117ms, 6 slow | 4 (592ms worst) | app-root 1059ms (88 commits) | 🔴 slow |
| 10 | tab → op:forum (cold mount) | tab | 640ms | 167ms | p95 58ms, 3 slow | 2 (173ms worst) | app-root 348ms (97 commits) | 🟡 meh |
| 11 | tab → op:newspaper (cold mount) | tab | 792ms | 146ms | p95 29ms, 1 slow | 2 (146ms worst) | app-root 183ms (23 commits) | 🟡 meh |
| 12 | tab → op:rulebook (cold mount) | tab | 762ms | 88ms | p95 21ms, 1 slow | 1 (88ms worst) | app-root 72ms (20 commits) | 🟡 meh |
| 13 | tab → op:players (warm revisit) | tab | 223ms | 134ms | p95 125ms, 2 slow | 2 (134ms worst) | game-body 184ms (4 commits) | 🟡 meh |
| 14 | tab → op:config (warm revisit) | tab | 128ms | 48ms | p95 58ms, 1 slow | 2 (72ms worst) | game-body 92ms (4 commits) | 🟢 ok |
| 15 | tab → op:nightly (warm revisit) | tab | 95ms | 38ms | p95 41ms, 0 slow | 0 | screen:game 62ms (4 commits) | 🟢 ok |
| 16 | tab → op:forum (warm revisit) | tab | 177ms | 132ms | p95 133ms, 1 slow | 1 (139ms worst) | game-body 153ms (4 commits) | 🟡 meh |
| 17 | tab → op:newspaper (warm revisit) | tab | 700ms | 36ms | p95 17ms, 0 slow | 0 | app-root 28ms (3 commits) | 🟡 meh |
| 18 | tab → op:rulebook (warm revisit) | tab | 450ms | 131ms | p95 17ms, 1 slow | 1 (134ms worst) | screen:game 123ms (3 commits) | 🟡 meh |
| 19 | tab → op:players (warm revisit) | tab | 167ms | 37ms | p95 58ms, 1 slow | 1 (74ms worst) | app-root 88ms (4 commits) | 🟢 ok |
| 20 | rapid tab cycle (all 6 operator tabs) | action | 1358ms | 1ms | p95 33ms, 4 slow | 2 (128ms worst) | app-root 349ms (15 commits) | 🔴 slow |
| 21 | tab → op:players (warm revisit) | tab | 208ms | 129ms | p95 117ms, 2 slow | 2 (129ms worst) | game-body 175ms (4 commits) | 🟡 meh |
| 22 | scroll: operator players table (vertical) | scroll | 21ms | 21ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 23 | scroll: players table horizontal | scroll | 16ms | 16ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 24 | tab → op:nightly (warm revisit) | tab | 258ms | 135ms | p95 141ms, 2 slow | 2 (145ms worst) | game-body 212ms (5 commits) | 🟡 meh |
| 25 | scroll: operator nightly | scroll | 2406ms | 17ms | p95 17ms, 0 slow | 0 | app-root 558ms (241 commits) | 🔴 slow |
| 26 | modal open: Review/Certify (nightly) | modal-open | 192ms | 178ms | p95 17ms, 1 slow | 1 (180ms worst) | op-tabs 39ms (4 commits) | 🟡 meh |
| 27 | modal close: Review/Certify | modal-close | 3ms | 3ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 28 | tab → op:forum (warm revisit) | tab | 258ms | 156ms | p95 158ms, 2 slow | 2 (158ms worst) | screen:game 196ms (4 commits) | 🟡 meh |
| 29 | scroll: town square thread list | scroll | 21ms | 21ms | p95 17ms, 0 slow | 0 | app-root 137ms (121 commits) | 🟢 ok |
| 30 | navigate: thread list → thread detail | navigate | 533ms | 4ms | p95 17ms, 1 slow | 1 (259ms worst) | app-root 228ms (15 commits) | 🟡 meh |
| 31 | scroll: thread detail comments | scroll | 25ms | 25ms | p95 17ms, 0 slow | 0 | app-root 180ms (125 commits) | 🟢 ok |
| 32 | navigate: thread detail → thread list | navigate | 641ms | 14ms | p95 17ms, 1 slow | 1 (249ms worst) | app-root 237ms (8 commits) | 🟡 meh |
| 33 | navigate: open second thread (warm) | navigate | 458ms | 35ms | p95 17ms, 1 slow | 1 (65ms worst) | screen:game 95ms (14 commits) | 🟢 ok |
| 34 | navigate: back to thread list (warm) | navigate | 658ms | 13ms | p95 17ms, 1 slow | 1 (260ms worst) | app-root 244ms (7 commits) | 🟡 meh |
| 35 | modal open: New Thread composer | modal-open | 67ms | 50ms | p95 17ms, 0 slow | 0 | screen:game 8ms (2 commits) | 🟢 ok |
| 36 | modal close: New Thread composer | modal-close | 192ms | 24ms | p95 17ms, 0 slow | 0 | app-root 9ms (1 commits) | 🟢 ok |
| 37 | tab → op:newspaper (warm revisit) | tab | 800ms | 138ms | p95 17ms, 1 slow | 1 (139ms worst) | app-root 114ms (4 commits) | 🟡 meh |
| 38 | scroll: operator newspaper | scroll | 27ms | 27ms | p95 17ms, 0 slow | 0 | app-root 211ms (145 commits) | 🟢 ok |
| 39 | tab → op:rulebook (warm revisit) | tab | 409ms | 104ms | p95 25ms, 1 slow | 1 (106ms worst) | app-root 84ms (5 commits) | 🟢 ok |
| 40 | scroll: operator config page | scroll | 183ms | 21ms | p95 25ms, 2 slow | 0 | app-root 174ms (110 commits) | 🟢 ok |
| 41 | navigate: config → rule book subpage | navigate | 7886ms | 6ms | p95 17ms, 2 slow | 1 (401ms worst) | app-root 293ms (17 commits) | 🔴 slow |
| 42 | scroll: operator rulebook (scroll-linked TOC) | scroll | 3158ms | 29ms | p95 67ms, 12 slow | 0 | app-root 126ms (73 commits) | 🔴 slow |
| 43 | modal open: rulebook table of contents | modal-open | 94ms | 10ms | p95 17ms, 1 slow | 0 | op-tabs 13ms (6 commits) | 🟢 ok |
| 44 | modal close: rulebook TOC | modal-close | 2ms | 2ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 45 | navigate: rule book → config | navigate | 500ms | 6ms | p95 17ms, 1 slow | 1 (108ms worst) | screen:game 78ms (9 commits) | 🟢 ok |
| 46 | navigate: config → phone book subpage | navigate | 8038ms | 4ms | p95 17ms, 2 slow | 2 (202ms worst) | app-root 198ms (16 commits) | 🔴 slow |
| 47 | scroll: operator phone book | scroll | 2443ms | 31ms | p95 42ms, 3 slow | 0 | app-root 129ms (81 commits) | 🔴 slow |
| 48 | navigate: phone book → config | navigate | 467ms | 7ms | p95 17ms, 1 slow | 1 (82ms worst) | app-root 68ms (9 commits) | 🟢 ok |
| 49 | tab → op:config (warm revisit) | tab | 161ms | 151ms | p95 133ms, 1 slow | 1 (151ms worst) | app-root 129ms (4 commits) | 🟡 meh |
| 50 | scroll: operator roles table | scroll | 23ms | 23ms | p95 17ms, 0 slow | 0 | app-root 333ms (126 commits) | 🟢 ok |
| 51 | navigate → game list | navigate | 616ms | 3ms | p95 17ms, 1 slow | 1 (135ms worst) | app-root 16ms (11 commits) | 🟡 meh |
| 52 | Phase C — player game | note | 0ms | — | — | 0 | — | 🟢 ok |
| 53 | open game: SIMPLY567 (as player) | navigate | 2258ms | 2ms | p95 17ms, 2 slow | 2 (158ms worst) | app-root 265ms (104 commits) | 🔴 slow |
| 54 | tab → player:newspaper (cold mount) | tab | 342ms | 30ms | p95 17ms, 1 slow | 1 (104ms worst) | app-root 120ms (31 commits) | 🟢 ok |
| 55 | tab → player:eyesOnly (cold mount) | tab | 392ms | 37ms | p95 17ms, 0 slow | 0 | app-root 60ms (18 commits) | 🟢 ok |
| 56 | tab → player:ruleBook (cold mount) | tab | 7825ms | 35ms | p95 17ms, 1 slow | 1 (156ms worst) | app-root 258ms (18 commits) | 🔴 slow |
| 57 | tab → player:phoneBook (cold mount) | tab | 7837ms | 53ms | p95 17ms, 1 slow | 2 (225ms worst) | app-root 345ms (28 commits) | 🔴 slow |
| 58 | tab → player:newspaper (warm revisit) | tab | 326ms | 20ms | p95 17ms, 0 slow | 0 | app-root 29ms (18 commits) | 🟢 ok |
| 59 | tab → player:eyesOnly (warm revisit) | tab | 21ms | 17ms | p95 17ms, 0 slow | 0 | screen:game 14ms (3 commits) | 🟢 ok |
| 60 | tab → player:ruleBook (warm revisit) | tab | 378ms | 18ms | p95 17ms, 0 slow | 0 | app-root 25ms (4 commits) | 🟢 ok |
| 61 | tab → player:phoneBook (warm revisit) | tab | 1241ms | 18ms | p95 17ms, 1 slow | 1 (160ms worst) | screen:game 170ms (8 commits) | 🔴 slow |
| 62 | tab → player:townSquare (warm revisit) | tab | 223ms | 21ms | p95 17ms, 0 slow | 0 | app-root 33ms (5 commits) | 🟢 ok |
| 63 | tab → player:townSquare (warm revisit) | tab | 2ms | 2ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 64 | scroll: player town square | scroll | 1503ms | 7ms | p95 17ms, 0 slow | 0 | app-root 22ms (4 commits) | 🔴 slow |
| 65 | tab → player:newspaper (warm revisit) | tab | 318ms | 17ms | p95 17ms, 0 slow | 0 | screen:game 31ms (17 commits) | 🟢 ok |
| 66 | scroll: player newspaper | scroll | 1769ms | 7ms | p95 17ms, 0 slow | 0 | screen:game 21ms (4 commits) | 🔴 slow |
| 67 | tab → player:eyesOnly (warm revisit) | tab | 132ms | 17ms | p95 28ms, 0 slow | 0 | app-root 31ms (6 commits) | 🟢 ok |
| 68 | scroll: player eyes only | scroll | 1819ms | 7ms | p95 17ms, 0 slow | 0 | player-tabs 22ms (4 commits) | 🔴 slow |
| 69 | tab → player:ruleBook (warm revisit) | tab | 236ms | 17ms | p95 17ms, 0 slow | 0 | screen:game 14ms (2 commits) | 🟢 ok |
| 70 | scroll: player rulebook (scroll-linked) | scroll | 2834ms | 6ms | p95 17ms, 0 slow | 0 | app-root 33ms (8 commits) | 🔴 slow |
| 71 | tab → player:phoneBook (warm revisit) | tab | 1415ms | 17ms | p95 17ms, 1 slow | 1 (155ms worst) | app-root 176ms (12 commits) | 🔴 slow |
| 72 | scroll: player phone book | scroll | 2334ms | 8ms | p95 17ms, 0 slow | 0 | player-tabs 32ms (5 commits) | 🔴 slow |
| 73 | navigate → game list | navigate | 566ms | 2ms | p95 17ms, 1 slow | 1 (66ms worst) | app-root 39ms (13 commits) | 🟡 meh |
| 74 | Phase D — newser game | note | 0ms | — | — | 0 | — | 🟢 ok |
| 75 | open game: SIMNEWS9 (as newser) | navigate | 2250ms | 2ms | p95 17ms, 2 slow | 2 (163ms worst) | app-root 261ms (88 commits) | 🔴 slow |
| 76 | tab → newser:newspaper (cold mount) | tab | 167ms | 31ms | p95 17ms, 1 slow | 1 (57ms worst) | app-root 109ms (33 commits) | 🟢 ok |
| 77 | tab → newser:ruleBook (cold mount) | tab | 8008ms | 16ms | p95 17ms, 1 slow | 1 (111ms worst) | app-root 123ms (10 commits) | 🔴 slow |
| 78 | tab → newser:phoneBook (cold mount) | tab | 7829ms | 47ms | p95 17ms, 1 slow | 1 (212ms worst) | app-root 242ms (22 commits) | 🔴 slow |
| 79 | tab → newser:newspaper (warm revisit) | tab | 700ms | 12ms | p95 17ms, 0 slow | 0 | screen:game 10ms (2 commits) | 🟡 meh |
| 80 | tab → newser:ruleBook (warm revisit) | tab | 701ms | 6ms | p95 17ms, 0 slow | 0 | app-root 6ms (3 commits) | 🟡 meh |
| 81 | tab → newser:phoneBook (warm revisit) | tab | 1247ms | 6ms | p95 17ms, 1 slow | 1 (169ms worst) | app-root 161ms (8 commits) | 🔴 slow |
| 82 | tab → newser:townSquare (warm revisit) | tab | 19ms | 11ms | p95 17ms, 0 slow | 0 | game-body 6ms (2 commits) | 🟢 ok |
| 83 | tab → newser:newspaper (warm revisit) | tab | 666ms | 6ms | p95 17ms, 0 slow | 0 | game-body 5ms (3 commits) | 🟡 meh |
| 84 | scroll: newser newspaper editor | scroll | 517ms | 7ms | p95 17ms, 0 slow | 0 | newser-tabs 4ms (3 commits) | 🟡 meh |
| 85 | navigate → game list | navigate | 567ms | 2ms | p95 17ms, 0 slow | 1 (61ms worst) | app-root 27ms (10 commits) | 🟡 meh |
| 86 | Phase E — modal lab | note | 0ms | — | — | 0 | — | 🟢 ok |
| 87 | modal open: MarkdownEditorDialog (heavy editor) | modal-open | 243ms | 12ms | p95 83ms, 2 slow | 1 (225ms worst) | — | 🟡 meh |
| 88 | modal close: MarkdownEditorDialog (heavy editor) | modal-close | 183ms | 17ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 89 | modal open: markdown-editor (for minimize test) | modal-open | 200ms | 181ms | p95 17ms, 1 slow | 1 (184ms worst) | — | 🟡 meh |
| 90 | modal minimize: markdown-editor | action | 332ms | 34ms | p95 17ms, 0 slow | 0 | screen:allGames 0ms (1 commits) | 🟢 ok |
| 91 | modal restore: markdown-editor | action | 166ms | 28ms | p95 17ms, 0 slow | 0 | screen:allGames 0ms (1 commits) | 🟢 ok |
| 92 | modal close: markdown-editor (after restore) | modal-close | 184ms | 24ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 93 | modal open: TownSquarePostDialog | modal-open | 27ms | 13ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 94 | modal close: TownSquarePostDialog | modal-close | 13ms | 13ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 95 | modal open: PlayerProfileDialogNEW | modal-open | 92ms | 13ms | p95 17ms, 1 slow | 1 (80ms worst) | — | 🟢 ok |
| 96 | modal close: PlayerProfileDialogNEW | modal-close | 166ms | 20ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 97 | modal open: UserEditDialog | modal-open | 83ms | 14ms | p95 17ms, 1 slow | 1 (68ms worst) | — | 🟢 ok |
| 98 | modal close: UserEditDialog | modal-close | 166ms | 20ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 99 | modal open: UserAddDialog | modal-open | 75ms | 15ms | p95 17ms, 1 slow | 1 (60ms worst) | — | 🟢 ok |
| 100 | modal close: UserAddDialog | modal-close | 182ms | 19ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 101 | modal open: RoleEditDialog | modal-open | 58ms | 15ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 102 | modal close: RoleEditDialog | modal-close | 167ms | 21ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 103 | modal open: RoleAddDialog | modal-open | 58ms | 16ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 104 | modal close: RoleAddDialog | modal-close | 166ms | 21ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 105 | modal open: VoteEditorDialog | modal-open | 75ms | 16ms | p95 17ms, 1 slow | 1 (63ms worst) | — | 🟢 ok |
| 106 | modal close: VoteEditorDialog | modal-close | 183ms | 22ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 107 | modal open: VoteEnableDialog | modal-open | 58ms | 17ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 108 | modal close: VoteEnableDialog | modal-close | 183ms | 22ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 109 | modal open: ActionEditorDialog | modal-open | 75ms | 18ms | p95 17ms, 1 slow | 1 (62ms worst) | — | 🟢 ok |
| 110 | modal close: ActionEditorDialog | modal-close | 183ms | 24ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 111 | modal open: BioEditorDialog | modal-open | 117ms | 22ms | p95 17ms, 1 slow | 1 (100ms worst) | — | 🟢 ok |
| 112 | modal close: BioEditorDialog | modal-close | 287ms | 22ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 113 | modal open: TagCellEditor | modal-open | 282ms | 25ms | p95 17ms, 2 slow | 1 (113ms worst) | — | 🟢 ok |
| 114 | modal close: TagCellEditor | modal-close | 183ms | 26ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 115 | modal open: AddTagDialog | modal-open | 83ms | 20ms | p95 17ms, 1 slow | 1 (69ms worst) | — | 🟢 ok |
| 116 | modal close: AddTagDialog | modal-close | 182ms | 26ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 117 | modal open: AddTagDialog (edit mode + trigger script) | modal-open | 100ms | 22ms | p95 17ms, 1 slow | 1 (85ms worst) | — | 🟢 ok |
| 118 | modal close: AddTagDialog (edit mode + trigger script) | modal-close | 183ms | 30ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 119 | modal open: ChooseDayDialog | modal-open | 92ms | 25ms | p95 21ms, 1 slow | 1 (76ms worst) | — | 🟢 ok |
| 120 | modal close: ChooseDayDialog | modal-close | 28ms | 28ms | p95 52ms, 1 slow | 0 | — | 🟢 ok |
| 121 | modal open: DaySelectionDialog | modal-open | 233ms | 29ms | p95 20ms, 1 slow | 1 (67ms worst) | — | 🟢 ok |
| 122 | modal close: DaySelectionDialog | modal-close | 185ms | 29ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 123 | modal open: DaysPerGameDayDialog | modal-open | 75ms | 26ms | p95 17ms, 1 slow | 1 (63ms worst) | — | 🟢 ok |
| 124 | modal close: DaysPerGameDayDialog | modal-close | 28ms | 28ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 125 | modal open: DeleteRoleConfirmationDialog | modal-open | 217ms | 30ms | p95 17ms, 1 slow | 1 (67ms worst) | — | 🟢 ok |
| 126 | modal close: DeleteRoleConfirmationDialog | modal-close | 185ms | 30ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 127 | modal open: EditInfoDialog | modal-open | 83ms | 26ms | p95 17ms, 1 slow | 1 (68ms worst) | — | 🟢 ok |
| 128 | modal close: EditInfoDialog | modal-close | 199ms | 34ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 129 | modal open: JoinedGameOptionsDialog | modal-open | 108ms | 28ms | p95 17ms, 1 slow | 1 (98ms worst) | — | 🟢 ok |
| 130 | modal close: JoinedGameOptionsDialog | modal-close | 300ms | 28ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 131 | modal open: ArchivedGamesDialog | modal-open | 250ms | 30ms | p95 17ms, 1 slow | 1 (106ms worst) | — | 🟢 ok |
| 132 | modal close: ArchivedGamesDialog | modal-close | 169ms | 30ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 133 | modal open: MarkdownInputBuilderDialog | modal-open | 250ms | 31ms | p95 17ms, 1 slow | 1 (88ms worst) | — | 🟢 ok |
| 134 | modal close: MarkdownInputBuilderDialog | modal-close | 162ms | 29ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 135 | modal open: MarkdownVariableDialog | modal-open | 217ms | 32ms | p95 17ms, 1 slow | 1 (70ms worst) | — | 🟢 ok |
| 136 | modal close: MarkdownVariableDialog | modal-close | 183ms | 31ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 137 | modal open: NightlyCertificationDialog | modal-open | 283ms | 33ms | p95 22ms, 1 slow | 1 (121ms worst) | — | 🟡 meh |
| 138 | modal close: NightlyCertificationDialog | modal-close | 146ms | 40ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 139 | modal open: ScheduleTableUpdateDialog | modal-open | 250ms | 35ms | p95 17ms, 1 slow | 1 (101ms worst) | — | 🟢 ok |
| 140 | modal close: ScheduleTableUpdateDialog | modal-close | 168ms | 33ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 141 | modal open: ColumnActionsDialog | modal-open | 225ms | 35ms | p95 17ms, 1 slow | 1 (82ms worst) | — | 🟢 ok |
| 142 | modal close: ColumnActionsDialog | modal-close | 183ms | 35ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 143 | modal open: PhoneBookTocDialog | modal-open | 258ms | 36ms | p95 17ms, 1 slow | 1 (97ms worst) | — | 🟢 ok |
| 144 | modal close: PhoneBookTocDialog | modal-close | 150ms | 35ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 145 | modal open: TableOfContentsDialog (rulebook) | modal-open | 275ms | 36ms | p95 17ms, 1 slow | 1 (115ms worst) | — | 🟢 ok |
| 146 | modal close: TableOfContentsDialog (rulebook) | modal-close | 161ms | 37ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 147 | modal open: ImportDraftDialog | modal-open | 250ms | 37ms | p95 17ms, 1 slow | 2 (87ms worst) | — | 🟢 ok |
| 148 | modal close: ImportDraftDialog | modal-close | 183ms | 39ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 149 | modal open: NewspaperSectionOptionsDialog | modal-open | 108ms | 32ms | p95 17ms, 1 slow | 1 (99ms worst) | — | 🟢 ok |
| 150 | modal close: NewspaperSectionOptionsDialog | modal-close | 315ms | 35ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 151 | modal open: PlayerPreviewModal | modal-open | 317ms | 37ms | p95 17ms, 1 slow | 1 (153ms worst) | — | 🟡 meh |
| 152 | modal close: PlayerPreviewModal | modal-close | 107ms | 32ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 153 | modal open: TownSquareImageDialog | modal-open | 233ms | 40ms | p95 17ms, 1 slow | 1 (89ms worst) | — | 🟢 ok |
| 154 | modal close: TownSquareImageDialog | modal-close | 183ms | 36ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 155 | modal open: TownSquareLinkDialog | modal-open | 250ms | 42ms | p95 17ms, 1 slow | 1 (90ms worst) | — | 🟢 ok |
| 156 | modal close: TownSquareLinkDialog | modal-close | 167ms | 37ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 157 | modal open: TownSquareMoreOptionsDialog | modal-open | 250ms | 40ms | p95 17ms, 1 slow | 1 (87ms worst) | — | 🟢 ok |
| 158 | modal close: TownSquareMoreOptionsDialog | modal-close | 166ms | 38ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 159 | modal open: ConfirmDialog | modal-open | 250ms | 41ms | p95 17ms, 1 slow | 1 (87ms worst) | — | 🟢 ok |
| 160 | modal close: ConfirmDialog | modal-close | 200ms | 40ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 161 | modal open: ImageUploadDialog | modal-open | 100ms | 35ms | p95 17ms, 1 slow | 1 (84ms worst) | — | 🟢 ok |
| 162 | modal close: ImageUploadDialog | modal-close | 313ms | 40ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 163 | modal open: SaveHistoryDialog | modal-open | 258ms | 41ms | p95 17ms, 1 slow | 1 (98ms worst) | — | 🟢 ok |
| 164 | modal close: SaveHistoryDialog | modal-close | 207ms | 41ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 165 | modal open: UnsavedChangesDialog | modal-open | 100ms | 36ms | p95 17ms, 1 slow | 1 (86ms worst) | — | 🟢 ok |
| 166 | modal close: UnsavedChangesDialog | modal-close | 192ms | 41ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 167 | modal open: ViewOnlyPreviewModal | modal-open | 100ms | 37ms | p95 17ms, 1 slow | 1 (83ms worst) | — | 🟢 ok |
| 168 | modal close: ViewOnlyPreviewModal | modal-close | 192ms | 41ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 169 | modal open: DeleteGameConfirmationDialog | modal-open | 100ms | 36ms | p95 17ms, 1 slow | 1 (84ms worst) | — | 🟢 ok |
| 170 | modal close: DeleteGameConfirmationDialog | modal-close | 207ms | 44ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 171 | Tour complete | note | 0ms | — | — | 0 | — | 🟢 ok |

## Slowest steps

- **8038ms** — navigate: config → phone book subpage (longTasks 2/202ms, p95 frame 17ms)
- **8008ms** — tab → newser:ruleBook (cold mount) (longTasks 1/111ms, p95 frame 17ms)
- **7886ms** — navigate: config → rule book subpage (longTasks 1/401ms, p95 frame 17ms)
- **7837ms** — tab → player:phoneBook (cold mount) (longTasks 2/225ms, p95 frame 17ms)
- **7829ms** — tab → newser:phoneBook (cold mount) (longTasks 1/212ms, p95 frame 17ms)
- **7825ms** — tab → player:ruleBook (cold mount) (longTasks 1/156ms, p95 frame 17ms)
- **4300ms** — open game: SIMOP1234 (as operator) (longTasks 17/243ms, p95 frame 108ms)
- **3158ms** — scroll: operator rulebook (scroll-linked TOC) (longTasks 0/0ms, p95 frame 67ms)
- **2834ms** — scroll: player rulebook (scroll-linked) (longTasks 0/0ms, p95 frame 17ms)
- **2443ms** — scroll: operator phone book (longTasks 0/0ms, p95 frame 42ms)

## Detail log

### — Perf audit tour starting
> UA: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/146.0.0.0 Safari/537.36

### — Phase A — game list

### scroll: game list
- kind: `scroll` · measured at +1735ms into run
- **settle**: 4ms · **first DOM change**: 4ms · **window**: 4ms
- 
- queries subscribed during window: 0 · active data subs after: 18 · dom mutations: 1 · heap: 59MB

### action: New WolffsPoint dialog open
- kind: `modal-open` · measured at +1739ms into run
- **settle**: 47ms · **first DOM change**: 22ms · **window**: 557ms
- frames 33 · avg 16.9ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 18 · dom mutations: 30 · heap: 62MB
- react commits by boundary (worst first):
  - `screen:allGames`: 1 commits, total 0ms, worst 0ms
  - `app-root`: 1 commits, total 0ms, worst 0ms

### modal close: New WolffsPoint
- kind: `modal-close` · measured at +2296ms into run
- **settle**: 3ms · **first DOM change**: 3ms · **window**: 316ms
- frames 17 · avg 18.6ms · p95 46ms · worst 46ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 18 · dom mutations: 1 · heap: 62MB

### — Phase B — operator game
> current user owns SIMOP1234

### open game: SIMOP1234 (as operator)
- kind: `navigate` · measured at +2612ms into run
- **settle**: 4300ms · **first DOM change**: 3ms · **window**: 5268ms
- frames 189 · avg 27.9ms · p95 108ms · worst 292ms · >50ms: 15
- long tasks: 17 (total 1850ms, worst 243ms)
- backend writes this window: user_vars:set 0.1ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.2ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms
- queries subscribed during window: 528 · active data subs after: 285 · dom mutations: 1762 · heap: 270MB
- react commits by boundary (worst first):
  - `app-root`: 529 commits, total 1832ms, worst 167ms
  - `screen:game`: 517 commits, total 1799ms, worst 167ms
  - `game-body`: 510 commits, total 1787ms, worst 167ms
  - `op-tabs`: 508 commits, total 1784ms, worst 167ms
  - `screen:allGames`: 7 commits, total 20ms, worst 6ms

### tab → op:config (cold mount)
- kind: `tab` · measured at +7881ms into run
- **settle**: 735ms · **first DOM change**: 383ms · **window**: 1305ms
- frames 29 · avg 44.7ms · p95 150ms · worst 371ms · >50ms: 4
- long tasks: 2 (total 468ms, worst 385ms)
- backend writes this window: user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms
- queries subscribed during window: 93 · active data subs after: 331 · dom mutations: 264 · heap: 341MB
- react commits by boundary (worst first):
  - `app-root`: 142 commits, total 515ms, worst 215ms
  - `screen:game`: 142 commits, total 513ms, worst 215ms
  - `game-body`: 142 commits, total 512ms, worst 215ms
  - `op-tabs`: 142 commits, total 510ms, worst 213ms

### tab → op:nightly (cold mount)
- kind: `tab` · measured at +9186ms into run
- **settle**: 1768ms · **first DOM change**: 592ms · **window**: 2318ms
- frames 64 · avg 36.2ms · p95 117ms · worst 602ms · >50ms: 6
- long tasks: 4 (total 1023ms, worst 592ms)
- backend writes this window: user_lists:set 0.2ms, user_lists:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms
- queries subscribed during window: 52 · active data subs after: 357 · dom mutations: 805 · heap: 261MB
- react commits by boundary (worst first):
  - `app-root`: 88 commits, total 1059ms, worst 255ms
  - `screen:game`: 88 commits, total 1058ms, worst 255ms
  - `game-body`: 88 commits, total 1058ms, worst 255ms
  - `op-tabs`: 88 commits, total 1056ms, worst 253ms

### tab → op:forum (cold mount)
- kind: `tab` · measured at +11505ms into run
- **settle**: 640ms · **first DOM change**: 167ms · **window**: 1207ms
- frames 49 · avg 24.6ms · p95 58ms · worst 192ms · >50ms: 3
- long tasks: 2 (total 340ms, worst 173ms)
- backend writes this window: user_vars:set 0.0ms, user_vars:set 0.0ms
- queries subscribed during window: 83 · active data subs after: 437 · dom mutations: 781 · heap: 290MB
- react commits by boundary (worst first):
  - `app-root`: 97 commits, total 348ms, worst 136ms
  - `screen:game`: 97 commits, total 343ms, worst 136ms
  - `game-body`: 97 commits, total 343ms, worst 136ms
  - `op-tabs`: 97 commits, total 342ms, worst 134ms

### tab → op:newspaper (cold mount)
- kind: `tab` · measured at +12712ms into run
- **settle**: 792ms · **first DOM change**: 146ms · **window**: 796ms
- frames 37 · avg 19.9ms · p95 29ms · worst 125ms · >50ms: 1
- long tasks: 2 (total 209ms, worst 146ms)
- queries subscribed during window: 14 · active data subs after: 450 · dom mutations: 205 · heap: 316MB
- react commits by boundary (worst first):
  - `app-root`: 23 commits, total 183ms, worst 128ms
  - `screen:game`: 23 commits, total 183ms, worst 128ms
  - `game-body`: 23 commits, total 183ms, worst 128ms
  - `op-tabs`: 23 commits, total 181ms, worst 126ms

### tab → op:rulebook (cold mount)
- kind: `tab` · measured at +13509ms into run
- **settle**: 762ms · **first DOM change**: 88ms · **window**: 945ms
- frames 53 · avg 17.8ms · p95 21ms · worst 96ms · >50ms: 1
- long tasks: 1 (total 88ms, worst 88ms)
- backend writes this window: user_vars:set 0.1ms
- queries subscribed during window: 9 · active data subs after: 455 · dom mutations: 173 · heap: 325MB
- react commits by boundary (worst first):
  - `app-root`: 20 commits, total 72ms, worst 54ms
  - `screen:game`: 20 commits, total 71ms, worst 54ms
  - `game-body`: 20 commits, total 71ms, worst 54ms
  - `op-tabs`: 20 commits, total 71ms, worst 54ms

### tab → op:players (warm revisit)
- kind: `tab` · measured at +14454ms into run
- **settle**: 223ms · **first DOM change**: 134ms · **window**: 408ms
- frames 15 · avg 27.2ms · p95 125ms · worst 125ms · >50ms: 2
- long tasks: 2 (total 206ms, worst 134ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 15 · heap: 344MB
- react commits by boundary (worst first):
  - `game-body`: 4 commits, total 184ms, worst 125ms
  - `screen:game`: 4 commits, total 184ms, worst 125ms
  - `app-root`: 4 commits, total 184ms, worst 125ms
  - `op-tabs`: 4 commits, total 183ms, worst 123ms

### tab → op:config (warm revisit)
- kind: `tab` · measured at +14862ms into run
- **settle**: 128ms · **first DOM change**: 48ms · **window**: 325ms
- frames 15 · avg 21.6ms · p95 58ms · worst 58ms · >50ms: 1
- long tasks: 2 (total 127ms, worst 72ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 13 · heap: 354MB
- react commits by boundary (worst first):
  - `game-body`: 4 commits, total 92ms, worst 58ms
  - `screen:game`: 4 commits, total 92ms, worst 58ms
  - `app-root`: 4 commits, total 92ms, worst 58ms
  - `op-tabs`: 4 commits, total 91ms, worst 58ms

### tab → op:nightly (warm revisit)
- kind: `tab` · measured at +15187ms into run
- **settle**: 95ms · **first DOM change**: 38ms · **window**: 300ms
- frames 16 · avg 18.7ms · p95 41ms · worst 41ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 15 · heap: 370MB
- react commits by boundary (worst first):
  - `screen:game`: 4 commits, total 62ms, worst 34ms
  - `app-root`: 4 commits, total 62ms, worst 34ms
  - `game-body`: 4 commits, total 62ms, worst 34ms
  - `op-tabs`: 4 commits, total 62ms, worst 34ms

### tab → op:forum (warm revisit)
- kind: `tab` · measured at +15487ms into run
- **settle**: 177ms · **first DOM change**: 132ms · **window**: 358ms
- frames 14 · avg 25.6ms · p95 133ms · worst 133ms · >50ms: 1
- long tasks: 1 (total 139ms, worst 139ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 13 · heap: 382MB
- react commits by boundary (worst first):
  - `game-body`: 4 commits, total 153ms, worst 122ms
  - `screen:game`: 4 commits, total 153ms, worst 122ms
  - `app-root`: 4 commits, total 153ms, worst 122ms
  - `op-tabs`: 4 commits, total 151ms, worst 120ms

### tab → op:newspaper (warm revisit)
- kind: `tab` · measured at +15845ms into run
- **settle**: 700ms · **first DOM change**: 36ms · **window**: 883ms
- frames 52 · avg 17.0ms · p95 17ms · worst 33ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 90 · heap: 380MB
- react commits by boundary (worst first):
  - `app-root`: 3 commits, total 28ms, worst 27ms
  - `game-body`: 3 commits, total 28ms, worst 27ms
  - `screen:game`: 3 commits, total 28ms, worst 27ms
  - `op-tabs`: 3 commits, total 27ms, worst 26ms

### tab → op:rulebook (warm revisit)
- kind: `tab` · measured at +16729ms into run
- **settle**: 450ms · **first DOM change**: 131ms · **window**: 633ms
- frames 31 · avg 20.4ms · p95 17ms · worst 133ms · >50ms: 1
- long tasks: 1 (total 134ms, worst 134ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 48 · heap: 391MB
- react commits by boundary (worst first):
  - `screen:game`: 3 commits, total 123ms, worst 123ms
  - `app-root`: 3 commits, total 123ms, worst 123ms
  - `game-body`: 3 commits, total 123ms, worst 123ms
  - `op-tabs`: 3 commits, total 122ms, worst 121ms

### tab → op:players (warm revisit)
- kind: `tab` · measured at +17362ms into run
- **settle**: 167ms · **first DOM change**: 37ms · **window**: 350ms
- frames 17 · avg 20.6ms · p95 58ms · worst 58ms · >50ms: 1
- long tasks: 1 (total 74ms, worst 74ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 17 · heap: 405MB
- react commits by boundary (worst first):
  - `app-root`: 4 commits, total 88ms, worst 59ms
  - `game-body`: 4 commits, total 88ms, worst 59ms
  - `screen:game`: 4 commits, total 88ms, worst 59ms
  - `op-tabs`: 4 commits, total 87ms, worst 59ms

### rapid tab cycle (all 6 operator tabs)
- kind: `action` · measured at +17712ms into run
- **settle**: 1358ms · **first DOM change**: 1ms · **window**: 1758ms
- frames 89 · avg 19.8ms · p95 33ms · worst 125ms · >50ms: 4
- long tasks: 2 (total 192ms, worst 128ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 113 · heap: 456MB
- react commits by boundary (worst first):
  - `app-root`: 15 commits, total 349ms, worst 119ms
  - `game-body`: 15 commits, total 349ms, worst 119ms
  - `screen:game`: 15 commits, total 349ms, worst 119ms
  - `op-tabs`: 15 commits, total 345ms, worst 117ms

### tab → op:players (warm revisit)
- kind: `tab` · measured at +19471ms into run
- **settle**: 208ms · **first DOM change**: 129ms · **window**: 392ms
- frames 15 · avg 26.1ms · p95 117ms · worst 117ms · >50ms: 2
- long tasks: 2 (total 199ms, worst 129ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 15 · heap: 481MB
- react commits by boundary (worst first):
  - `game-body`: 4 commits, total 175ms, worst 120ms
  - `screen:game`: 4 commits, total 175ms, worst 120ms
  - `app-root`: 4 commits, total 175ms, worst 120ms
  - `op-tabs`: 4 commits, total 173ms, worst 118ms

### scroll: operator players table (vertical)
- kind: `scroll` · measured at +19862ms into run
- **settle**: 21ms · **first DOM change**: 21ms · **window**: 322ms
- frames 19 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 1 · heap: 482MB

### scroll: players table horizontal
- kind: `scroll` · measured at +20184ms into run
- **settle**: 16ms · **first DOM change**: 16ms · **window**: 1228ms
- frames 74 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 1 · heap: 483MB

### tab → op:nightly (warm revisit)
- kind: `tab` · measured at +21413ms into run
- **settle**: 258ms · **first DOM change**: 135ms · **window**: 441ms
- frames 14 · avg 31.5ms · p95 141ms · worst 141ms · >50ms: 2
- long tasks: 2 (total 256ms, worst 145ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 17 · heap: 507MB
- react commits by boundary (worst first):
  - `game-body`: 5 commits, total 212ms, worst 123ms
  - `screen:game`: 5 commits, total 212ms, worst 123ms
  - `app-root`: 5 commits, total 212ms, worst 123ms
  - `op-tabs`: 5 commits, total 211ms, worst 121ms

### scroll: operator nightly
- kind: `scroll` · measured at +21854ms into run
- **settle**: 2406ms · **first DOM change**: 17ms · **window**: 2433ms
- frames 146 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 5769 · heap: 535MB
- react commits by boundary (worst first):
  - `app-root`: 241 commits, total 558ms, worst 9ms
  - `screen:game`: 241 commits, total 556ms, worst 9ms
  - `game-body`: 241 commits, total 554ms, worst 9ms
  - `op-tabs`: 241 commits, total 554ms, worst 9ms

### modal open: Review/Certify (nightly)
- kind: `modal-open` · measured at +24287ms into run
- **settle**: 192ms · **first DOM change**: 178ms · **window**: 762ms
- frames 36 · avg 21.0ms · p95 17ms · worst 174ms · >50ms: 1
- long tasks: 1 (total 180ms, worst 180ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 610 · heap: 547MB
- react commits by boundary (worst first):
  - `op-tabs`: 4 commits, total 39ms, worst 28ms
  - `game-body`: 4 commits, total 39ms, worst 28ms
  - `screen:game`: 4 commits, total 39ms, worst 28ms
  - `app-root`: 4 commits, total 39ms, worst 28ms

### modal close: Review/Certify
- kind: `modal-close` · measured at +25049ms into run
- **settle**: 3ms · **first DOM change**: 3ms · **window**: 313ms
- frames 19 · avg 16.5ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 1 · heap: 547MB

### tab → op:forum (warm revisit)
- kind: `tab` · measured at +25362ms into run
- **settle**: 258ms · **first DOM change**: 156ms · **window**: 442ms
- frames 14 · avg 31.5ms · p95 158ms · worst 158ms · >50ms: 2
- long tasks: 2 (total 255ms, worst 158ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 21 · heap: 196MB
- react commits by boundary (worst first):
  - `screen:game`: 4 commits, total 196ms, worst 104ms
  - `app-root`: 4 commits, total 196ms, worst 104ms
  - `game-body`: 4 commits, total 196ms, worst 104ms
  - `op-tabs`: 4 commits, total 194ms, worst 102ms

### scroll: town square thread list
- kind: `scroll` · measured at +25804ms into run
- **settle**: 21ms · **first DOM change**: 21ms · **window**: 2350ms
- frames 141 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 1 · heap: 212MB
- react commits by boundary (worst first):
  - `app-root`: 121 commits, total 137ms, worst 2ms
  - `screen:game`: 121 commits, total 135ms, worst 2ms
  - `game-body`: 121 commits, total 135ms, worst 2ms
  - `op-tabs`: 121 commits, total 135ms, worst 2ms

### navigate: thread list → thread detail
- kind: `navigate` · measured at +28154ms into run
- **settle**: 533ms · **first DOM change**: 4ms · **window**: 1083ms
- frames 50 · avg 21.6ms · p95 17ms · worst 258ms · >50ms: 1
- long tasks: 1 (total 259ms, worst 259ms)
- backend writes this window: user_vars:set 0.0ms, user_vars:set 0.0ms
- queries subscribed during window: 2 · active data subs after: 456 · dom mutations: 776 · heap: 229MB
- react commits by boundary (worst first):
  - `app-root`: 15 commits, total 228ms, worst 128ms
  - `op-tabs`: 15 commits, total 227ms, worst 128ms
  - `game-body`: 15 commits, total 227ms, worst 128ms
  - `screen:game`: 15 commits, total 227ms, worst 128ms

### scroll: thread detail comments
- kind: `scroll` · measured at +29238ms into run
- **settle**: 25ms · **first DOM change**: 25ms · **window**: 2450ms
- frames 147 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 456 · dom mutations: 1 · heap: 236MB
- react commits by boundary (worst first):
  - `app-root`: 125 commits, total 180ms, worst 2ms
  - `screen:game`: 125 commits, total 178ms, worst 2ms
  - `op-tabs`: 125 commits, total 177ms, worst 2ms
  - `game-body`: 125 commits, total 177ms, worst 2ms

### navigate: thread detail → thread list
- kind: `navigate` · measured at +31687ms into run
- **settle**: 641ms · **first DOM change**: 14ms · **window**: 1158ms
- frames 56 · avg 20.7ms · p95 17ms · worst 242ms · >50ms: 1
- long tasks: 1 (total 249ms, worst 249ms)
- queries subscribed during window: 0 · active data subs after: 456 · dom mutations: 662 · heap: 255MB
- react commits by boundary (worst first):
  - `app-root`: 8 commits, total 237ms, worst 131ms
  - `screen:game`: 8 commits, total 237ms, worst 131ms
  - `op-tabs`: 8 commits, total 237ms, worst 131ms
  - `game-body`: 8 commits, total 237ms, worst 131ms

### navigate: open second thread (warm)
- kind: `navigate` · measured at +32846ms into run
- **settle**: 458ms · **first DOM change**: 35ms · **window**: 958ms
- frames 54 · avg 17.7ms · p95 17ms · worst 58ms · >50ms: 1
- long tasks: 1 (total 65ms, worst 65ms)
- backend writes this window: user_vars:set 0.1ms, user_vars:set 0.0ms
- queries subscribed during window: 2 · active data subs after: 457 · dom mutations: 150 · heap: 274MB
- react commits by boundary (worst first):
  - `screen:game`: 14 commits, total 95ms, worst 21ms
  - `app-root`: 14 commits, total 95ms, worst 21ms
  - `op-tabs`: 14 commits, total 95ms, worst 21ms
  - `game-body`: 14 commits, total 95ms, worst 21ms

### navigate: back to thread list (warm)
- kind: `navigate` · measured at +33804ms into run
- **settle**: 658ms · **first DOM change**: 13ms · **window**: 1125ms
- frames 53 · avg 21.2ms · p95 17ms · worst 258ms · >50ms: 1
- long tasks: 1 (total 260ms, worst 260ms)
- queries subscribed during window: 0 · active data subs after: 457 · dom mutations: 660 · heap: 294MB
- react commits by boundary (worst first):
  - `app-root`: 7 commits, total 244ms, worst 139ms
  - `screen:game`: 7 commits, total 244ms, worst 139ms
  - `game-body`: 7 commits, total 244ms, worst 139ms
  - `op-tabs`: 7 commits, total 244ms, worst 139ms

### modal open: New Thread composer
- kind: `modal-open` · measured at +34929ms into run
- **settle**: 67ms · **first DOM change**: 50ms · **window**: 633ms
- frames 37 · avg 17.1ms · p95 17ms · worst 33ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 457 · dom mutations: 38 · heap: 307MB
- react commits by boundary (worst first):
  - `screen:game`: 2 commits, total 8ms, worst 8ms
  - `app-root`: 2 commits, total 8ms, worst 8ms
  - `op-tabs`: 2 commits, total 8ms, worst 8ms
  - `game-body`: 2 commits, total 8ms, worst 8ms

### modal close: New Thread composer
- kind: `modal-close` · measured at +35562ms into run
- **settle**: 192ms · **first DOM change**: 24ms · **window**: 458ms
- frames 27 · avg 17.0ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 457 · dom mutations: 29 · heap: 293MB
- react commits by boundary (worst first):
  - `app-root`: 1 commits, total 9ms, worst 9ms
  - `op-tabs`: 1 commits, total 8ms, worst 8ms
  - `game-body`: 1 commits, total 8ms, worst 8ms
  - `screen:game`: 1 commits, total 8ms, worst 8ms

### tab → op:newspaper (warm revisit)
- kind: `tab` · measured at +36020ms into run
- **settle**: 800ms · **first DOM change**: 138ms · **window**: 983ms
- frames 52 · avg 18.9ms · p95 17ms · worst 133ms · >50ms: 1
- long tasks: 1 (total 139ms, worst 139ms)
- queries subscribed during window: 0 · active data subs after: 457 · dom mutations: 90 · heap: 307MB
- react commits by boundary (worst first):
  - `app-root`: 4 commits, total 114ms, worst 113ms
  - `game-body`: 4 commits, total 114ms, worst 113ms
  - `screen:game`: 4 commits, total 114ms, worst 113ms
  - `op-tabs`: 4 commits, total 112ms, worst 111ms

### scroll: operator newspaper
- kind: `scroll` · measured at +37004ms into run
- **settle**: 27ms · **first DOM change**: 27ms · **window**: 2759ms
- frames 165 · avg 16.7ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 457 · dom mutations: 1 · heap: 325MB
- react commits by boundary (worst first):
  - `app-root`: 145 commits, total 211ms, worst 2ms
  - `screen:game`: 145 commits, total 208ms, worst 2ms
  - `game-body`: 145 commits, total 207ms, worst 2ms
  - `op-tabs`: 145 commits, total 206ms, worst 2ms

### tab → op:rulebook (warm revisit)
- kind: `tab` · measured at +39762ms into run
- **settle**: 409ms · **first DOM change**: 104ms · **window**: 591ms
- frames 30 · avg 19.7ms · p95 25ms · worst 99ms · >50ms: 1
- long tasks: 1 (total 106ms, worst 106ms)
- queries subscribed during window: 0 · active data subs after: 457 · dom mutations: 46 · heap: 332MB
- react commits by boundary (worst first):
  - `app-root`: 5 commits, total 84ms, worst 82ms
  - `game-body`: 5 commits, total 84ms, worst 82ms
  - `screen:game`: 5 commits, total 84ms, worst 82ms
  - `op-tabs`: 5 commits, total 82ms, worst 81ms

### scroll: operator config page
- kind: `scroll` · measured at +40354ms into run
- **settle**: 183ms · **first DOM change**: 21ms · **window**: 2338ms
- frames 130 · avg 18.0ms · p95 25ms · worst 62ms · >50ms: 2
- queries subscribed during window: 0 · active data subs after: 457 · dom mutations: 3 · heap: 339MB
- react commits by boundary (worst first):
  - `app-root`: 110 commits, total 174ms, worst 3ms
  - `screen:game`: 110 commits, total 173ms, worst 3ms
  - `op-tabs`: 110 commits, total 172ms, worst 3ms
  - `game-body`: 110 commits, total 172ms, worst 3ms

### navigate: config → rule book subpage
- kind: `navigate` · measured at +42692ms into run
- **settle**: 7886ms · **first DOM change**: 6ms · **window**: 8003ms
- frames 448 · avg 17.9ms · p95 17ms · worst 404ms · >50ms: 2
- long tasks: 1 (total 401ms, worst 401ms)
- backend writes this window: user_vars:set 0.1ms, user_vars:set 0.0ms
- queries subscribed during window: 4 · active data subs after: 459 · dom mutations: 675 · heap: 209MB
- react commits by boundary (worst first):
  - `app-root`: 17 commits, total 293ms, worst 194ms
  - `op-tabs`: 17 commits, total 293ms, worst 194ms
  - `game-body`: 17 commits, total 293ms, worst 194ms
  - `screen:game`: 17 commits, total 293ms, worst 194ms
- notes: (settle timeout 8000ms)

### scroll: operator rulebook (scroll-linked TOC)
- kind: `scroll` · measured at +50696ms into run
- **settle**: 3158ms · **first DOM change**: 29ms · **window**: 3158ms
- frames 92 · avg 33.6ms · p95 67ms · worst 67ms · >50ms: 12
- queries subscribed during window: 0 · active data subs after: 459 · dom mutations: 179 · heap: 218MB
- react commits by boundary (worst first):
  - `app-root`: 73 commits, total 126ms, worst 5ms
  - `screen:game`: 73 commits, total 125ms, worst 5ms
  - `op-tabs`: 73 commits, total 124ms, worst 5ms
  - `game-body`: 73 commits, total 124ms, worst 5ms

### modal open: rulebook table of contents
- kind: `modal-open` · measured at +53854ms into run
- **settle**: 94ms · **first DOM change**: 10ms · **window**: 657ms
- frames 36 · avg 18.3ms · p95 17ms · worst 74ms · >50ms: 1
- queries subscribed during window: 0 · active data subs after: 459 · dom mutations: 87 · heap: 211MB
- react commits by boundary (worst first):
  - `op-tabs`: 6 commits, total 13ms, worst 8ms
  - `game-body`: 6 commits, total 13ms, worst 8ms
  - `screen:game`: 6 commits, total 13ms, worst 8ms
  - `app-root`: 6 commits, total 13ms, worst 8ms

### modal close: rulebook TOC
- kind: `modal-close` · measured at +54512ms into run
- **settle**: 2ms · **first DOM change**: 2ms · **window**: 316ms
- frames 19 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 459 · dom mutations: 1 · heap: 211MB

### navigate: rule book → config
- kind: `navigate` · measured at +54829ms into run
- **settle**: 500ms · **first DOM change**: 6ms · **window**: 1018ms
- frames 56 · avg 18.1ms · p95 17ms · worst 100ms · >50ms: 1
- long tasks: 1 (total 108ms, worst 108ms)
- queries subscribed during window: 0 · active data subs after: 459 · dom mutations: 181 · heap: 226MB
- react commits by boundary (worst first):
  - `screen:game`: 9 commits, total 78ms, worst 56ms
  - `app-root`: 9 commits, total 78ms, worst 56ms
  - `game-body`: 9 commits, total 78ms, worst 56ms
  - `op-tabs`: 9 commits, total 78ms, worst 56ms

### navigate: config → phone book subpage
- kind: `navigate` · measured at +55846ms into run
- **settle**: 8038ms · **first DOM change**: 4ms · **window**: 8038ms
- frames 463 · avg 17.3ms · p95 17ms · worst 192ms · >50ms: 2
- long tasks: 2 (total 261ms, worst 202ms)
- queries subscribed during window: 25 · active data subs after: 484 · dom mutations: 854 · heap: 235MB
- react commits by boundary (worst first):
  - `app-root`: 16 commits, total 198ms, worst 60ms
  - `screen:game`: 16 commits, total 198ms, worst 60ms
  - `op-tabs`: 16 commits, total 198ms, worst 60ms
  - `game-body`: 16 commits, total 198ms, worst 60ms
- notes: (settle timeout 8000ms)

### scroll: operator phone book
- kind: `scroll` · measured at +63885ms into run
- **settle**: 2443ms · **first DOM change**: 31ms · **window**: 2443ms
- frames 103 · avg 23.1ms · p95 42ms · worst 58ms · >50ms: 3
- queries subscribed during window: 0 · active data subs after: 484 · dom mutations: 187 · heap: 239MB
- react commits by boundary (worst first):
  - `app-root`: 81 commits, total 129ms, worst 7ms
  - `screen:game`: 81 commits, total 128ms, worst 7ms
  - `game-body`: 81 commits, total 127ms, worst 7ms
  - `op-tabs`: 81 commits, total 127ms, worst 7ms

### navigate: phone book → config
- kind: `navigate` · measured at +66328ms into run
- **settle**: 467ms · **first DOM change**: 7ms · **window**: 984ms
- frames 56 · avg 17.6ms · p95 17ms · worst 67ms · >50ms: 1
- long tasks: 1 (total 82ms, worst 82ms)
- queries subscribed during window: 0 · active data subs after: 484 · dom mutations: 156 · heap: 222MB
- react commits by boundary (worst first):
  - `app-root`: 9 commits, total 68ms, worst 38ms
  - `screen:game`: 9 commits, total 67ms, worst 38ms
  - `op-tabs`: 9 commits, total 67ms, worst 38ms
  - `game-body`: 9 commits, total 67ms, worst 38ms

### tab → op:config (warm revisit)
- kind: `tab` · measured at +67312ms into run
- **settle**: 161ms · **first DOM change**: 151ms · **window**: 350ms
- frames 14 · avg 25.0ms · p95 133ms · worst 133ms · >50ms: 1
- long tasks: 1 (total 151ms, worst 151ms)
- queries subscribed during window: 0 · active data subs after: 484 · dom mutations: 14 · heap: 240MB
- react commits by boundary (worst first):
  - `app-root`: 4 commits, total 129ms, worst 126ms
  - `screen:game`: 4 commits, total 129ms, worst 126ms
  - `game-body`: 4 commits, total 128ms, worst 126ms
  - `op-tabs`: 4 commits, total 127ms, worst 124ms

### scroll: operator roles table
- kind: `scroll` · measured at +67662ms into run
- **settle**: 23ms · **first DOM change**: 23ms · **window**: 2450ms
- frames 147 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 484 · dom mutations: 1 · heap: 240MB
- react commits by boundary (worst first):
  - `app-root`: 126 commits, total 333ms, worst 4ms
  - `screen:game`: 126 commits, total 331ms, worst 4ms
  - `game-body`: 126 commits, total 329ms, worst 4ms
  - `op-tabs`: 126 commits, total 329ms, worst 4ms

### navigate → game list
- kind: `navigate` · measured at +70112ms into run
- **settle**: 616ms · **first DOM change**: 3ms · **window**: 1383ms
- frames 76 · avg 18.2ms · p95 17ms · worst 133ms · >50ms: 1
- long tasks: 1 (total 135ms, worst 135ms)
- backend writes this window: user_vars:set 0.0ms
- queries subscribed during window: 0 · active data subs after: 484 · dom mutations: 293 · heap: 73MB
- react commits by boundary (worst first):
  - `app-root`: 11 commits, total 16ms, worst 6ms
  - `screen:allGames`: 3 commits, total 12ms, worst 6ms
  - `op-tabs`: 5 commits, total 1ms, worst 1ms
  - `game-body`: 5 commits, total 1ms, worst 1ms
  - `screen:game`: 5 commits, total 1ms, worst 1ms

### — Phase C — player game
> current user is a player in SIMPLY567

### open game: SIMPLY567 (as player)
- kind: `navigate` · measured at +71495ms into run
- **settle**: 2258ms · **first DOM change**: 2ms · **window**: 3226ms
- frames 179 · avg 18.0ms · p95 17ms · worst 175ms · >50ms: 2
- long tasks: 2 (total 240ms, worst 158ms)
- backend writes this window: user_vars:set 0.0ms, user_lists:set 0.1ms, user_lists:set 0.0ms, user_lists:set 0.0ms, user_lists:set 0.0ms, user_lists:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_lists:set 0.0ms, user_lists:set 0.0ms, user_lists:set 0.0ms, user_lists:set 0.0ms, user_lists:set 0.0ms, user_vars:set 0.0ms
- queries subscribed during window: 67 · active data subs after: 534 · dom mutations: 1774 · heap: 82MB
- react commits by boundary (worst first):
  - `app-root`: 104 commits, total 265ms, worst 79ms
  - `screen:game`: 94 commits, total 241ms, worst 79ms
  - `game-body`: 87 commits, total 236ms, worst 79ms
  - `player-tabs`: 60 commits, total 220ms, worst 79ms
  - `screen:allGames`: 5 commits, total 15ms, worst 4ms

### tab → player:newspaper (cold mount)
- kind: `tab` · measured at +74721ms into run
- **settle**: 342ms · **first DOM change**: 30ms · **window**: 907ms
- frames 49 · avg 18.5ms · p95 17ms · worst 108ms · >50ms: 1
- long tasks: 1 (total 104ms, worst 104ms)
- backend writes this window: user_vars:set 0.1ms
- queries subscribed during window: 11 · active data subs after: 544 · dom mutations: 204 · heap: 108MB
- react commits by boundary (worst first):
  - `app-root`: 31 commits, total 120ms, worst 52ms
  - `screen:game`: 31 commits, total 120ms, worst 52ms
  - `game-body`: 31 commits, total 120ms, worst 52ms
  - `player-tabs`: 31 commits, total 118ms, worst 52ms

### tab → player:eyesOnly (cold mount)
- kind: `tab` · measured at +75628ms into run
- **settle**: 392ms · **first DOM change**: 37ms · **window**: 958ms
- frames 56 · avg 17.1ms · p95 17ms · worst 33ms · >50ms: 0
- backend writes this window: user_vars:set 0.0ms
- queries subscribed during window: 8 · active data subs after: 551 · dom mutations: 99 · heap: 93MB
- react commits by boundary (worst first):
  - `app-root`: 18 commits, total 60ms, worst 14ms
  - `screen:game`: 18 commits, total 60ms, worst 14ms
  - `game-body`: 18 commits, total 59ms, worst 14ms
  - `player-tabs`: 18 commits, total 58ms, worst 12ms

### tab → player:ruleBook (cold mount)
- kind: `tab` · measured at +76587ms into run
- **settle**: 7825ms · **first DOM change**: 35ms · **window**: 8016ms
- frames 470 · avg 17.1ms · p95 17ms · worst 200ms · >50ms: 1
- long tasks: 1 (total 156ms, worst 156ms)
- queries subscribed during window: 2 · active data subs after: 553 · dom mutations: 671 · heap: 109MB
- react commits by boundary (worst first):
  - `app-root`: 18 commits, total 258ms, worst 81ms
  - `screen:game`: 18 commits, total 258ms, worst 81ms
  - `game-body`: 18 commits, total 258ms, worst 81ms
  - `player-tabs`: 18 commits, total 256ms, worst 81ms
- notes: (settle timeout 8000ms)

### tab → player:phoneBook (cold mount)
- kind: `tab` · measured at +84604ms into run
- **settle**: 7837ms · **first DOM change**: 53ms · **window**: 8004ms
- frames 463 · avg 17.3ms · p95 17ms · worst 225ms · >50ms: 1
- long tasks: 2 (total 280ms, worst 225ms)
- queries subscribed during window: 29 · active data subs after: 578 · dom mutations: 1018 · heap: 127MB
- react commits by boundary (worst first):
  - `app-root`: 28 commits, total 345ms, worst 80ms
  - `screen:game`: 28 commits, total 344ms, worst 80ms
  - `game-body`: 28 commits, total 344ms, worst 80ms
  - `player-tabs`: 28 commits, total 342ms, worst 80ms
- notes: (settle timeout 8000ms)

### tab → player:newspaper (warm revisit)
- kind: `tab` · measured at +92608ms into run
- **settle**: 326ms · **first DOM change**: 20ms · **window**: 508ms
- frames 30 · avg 16.9ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 51 · heap: 126MB
- react commits by boundary (worst first):
  - `app-root`: 18 commits, total 29ms, worst 16ms
  - `game-body`: 18 commits, total 29ms, worst 16ms
  - `screen:game`: 18 commits, total 29ms, worst 16ms
  - `player-tabs`: 18 commits, total 28ms, worst 14ms

### tab → player:eyesOnly (warm revisit)
- kind: `tab` · measured at +93116ms into run
- **settle**: 21ms · **first DOM change**: 17ms · **window**: 317ms
- frames 19 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 16 · heap: 132MB
- react commits by boundary (worst first):
  - `screen:game`: 3 commits, total 14ms, worst 14ms
  - `app-root`: 3 commits, total 14ms, worst 14ms
  - `game-body`: 3 commits, total 14ms, worst 14ms
  - `player-tabs`: 3 commits, total 12ms, worst 12ms

### tab → player:ruleBook (warm revisit)
- kind: `tab` · measured at +93433ms into run
- **settle**: 378ms · **first DOM change**: 18ms · **window**: 566ms
- frames 34 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 19 · heap: 119MB
- react commits by boundary (worst first):
  - `app-root`: 4 commits, total 25ms, worst 14ms
  - `screen:game`: 4 commits, total 25ms, worst 14ms
  - `game-body`: 4 commits, total 25ms, worst 14ms
  - `player-tabs`: 4 commits, total 23ms, worst 12ms

### tab → player:phoneBook (warm revisit)
- kind: `tab` · measured at +93999ms into run
- **settle**: 1241ms · **first DOM change**: 18ms · **window**: 1433ms
- frames 78 · avg 18.4ms · p95 17ms · worst 150ms · >50ms: 1
- long tasks: 1 (total 160ms, worst 160ms)
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 604 · heap: 126MB
- react commits by boundary (worst first):
  - `screen:game`: 8 commits, total 170ms, worst 86ms
  - `app-root`: 8 commits, total 170ms, worst 86ms
  - `game-body`: 8 commits, total 170ms, worst 86ms
  - `player-tabs`: 8 commits, total 168ms, worst 86ms

### tab → player:townSquare (warm revisit)
- kind: `tab` · measured at +95433ms into run
- **settle**: 223ms · **first DOM change**: 21ms · **window**: 408ms
- frames 24 · avg 17.0ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 37 · heap: 130MB
- react commits by boundary (worst first):
  - `app-root`: 5 commits, total 33ms, worst 16ms
  - `screen:game`: 5 commits, total 33ms, worst 16ms
  - `game-body`: 5 commits, total 32ms, worst 16ms
  - `player-tabs`: 5 commits, total 31ms, worst 14ms

### tab → player:townSquare (warm revisit)
- kind: `tab` · measured at +95841ms into run
- **settle**: 2ms · **first DOM change**: 2ms · **window**: 317ms
- frames 19 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 1 · heap: 130MB

### scroll: player town square
- kind: `scroll` · measured at +96157ms into run
- **settle**: 1503ms · **first DOM change**: 7ms · **window**: 2234ms
- frames 134 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 11 · heap: 105MB
- react commits by boundary (worst first):
  - `app-root`: 4 commits, total 22ms, worst 10ms
  - `player-tabs`: 4 commits, total 22ms, worst 10ms
  - `game-body`: 4 commits, total 22ms, worst 10ms
  - `screen:game`: 4 commits, total 22ms, worst 10ms

### tab → player:newspaper (warm revisit)
- kind: `tab` · measured at +98391ms into run
- **settle**: 318ms · **first DOM change**: 17ms · **window**: 500ms
- frames 30 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 25 · heap: 119MB
- react commits by boundary (worst first):
  - `screen:game`: 17 commits, total 31ms, worst 13ms
  - `app-root`: 17 commits, total 31ms, worst 13ms
  - `game-body`: 17 commits, total 31ms, worst 13ms
  - `player-tabs`: 17 commits, total 30ms, worst 12ms

### scroll: player newspaper
- kind: `scroll` · measured at +98891ms into run
- **settle**: 1769ms · **first DOM change**: 7ms · **window**: 2633ms
- frames 158 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 3 · heap: 103MB
- react commits by boundary (worst first):
  - `screen:game`: 4 commits, total 21ms, worst 9ms
  - `app-root`: 4 commits, total 21ms, worst 9ms
  - `player-tabs`: 4 commits, total 21ms, worst 9ms
  - `game-body`: 4 commits, total 21ms, worst 9ms

### tab → player:eyesOnly (warm revisit)
- kind: `tab` · measured at +101524ms into run
- **settle**: 132ms · **first DOM change**: 17ms · **window**: 316ms
- frames 18 · avg 17.6ms · p95 28ms · worst 28ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 17 · heap: 116MB
- react commits by boundary (worst first):
  - `app-root`: 6 commits, total 31ms, worst 13ms
  - `game-body`: 6 commits, total 31ms, worst 13ms
  - `screen:game`: 6 commits, total 31ms, worst 13ms
  - `player-tabs`: 6 commits, total 29ms, worst 11ms

### scroll: player eyes only
- kind: `scroll` · measured at +101841ms into run
- **settle**: 1819ms · **first DOM change**: 7ms · **window**: 2333ms
- frames 139 · avg 16.8ms · p95 17ms · worst 27ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 3 · heap: 126MB
- react commits by boundary (worst first):
  - `player-tabs`: 4 commits, total 22ms, worst 10ms
  - `game-body`: 4 commits, total 22ms, worst 10ms
  - `screen:game`: 4 commits, total 22ms, worst 10ms
  - `app-root`: 4 commits, total 22ms, worst 10ms

### tab → player:ruleBook (warm revisit)
- kind: `tab` · measured at +104174ms into run
- **settle**: 236ms · **first DOM change**: 17ms · **window**: 416ms
- frames 25 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 18 · heap: 104MB
- react commits by boundary (worst first):
  - `screen:game`: 2 commits, total 14ms, worst 13ms
  - `app-root`: 2 commits, total 14ms, worst 13ms
  - `game-body`: 2 commits, total 13ms, worst 13ms
  - `player-tabs`: 2 commits, total 12ms, worst 12ms

### scroll: player rulebook (scroll-linked)
- kind: `scroll` · measured at +104591ms into run
- **settle**: 2834ms · **first DOM change**: 6ms · **window**: 2834ms
- frames 170 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 339 · heap: 118MB
- react commits by boundary (worst first):
  - `app-root`: 8 commits, total 33ms, worst 10ms
  - `screen:game`: 8 commits, total 33ms, worst 10ms
  - `player-tabs`: 8 commits, total 33ms, worst 10ms
  - `game-body`: 8 commits, total 33ms, worst 10ms

### tab → player:phoneBook (warm revisit)
- kind: `tab` · measured at +107425ms into run
- **settle**: 1415ms · **first DOM change**: 17ms · **window**: 1599ms
- frames 88 · avg 18.2ms · p95 17ms · worst 150ms · >50ms: 1
- long tasks: 1 (total 155ms, worst 155ms)
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 622 · heap: 118MB
- react commits by boundary (worst first):
  - `app-root`: 12 commits, total 176ms, worst 82ms
  - `screen:game`: 12 commits, total 176ms, worst 82ms
  - `game-body`: 12 commits, total 175ms, worst 82ms
  - `player-tabs`: 12 commits, total 173ms, worst 82ms

### scroll: player phone book
- kind: `scroll` · measured at +109024ms into run
- **settle**: 2334ms · **first DOM change**: 8ms · **window**: 2334ms
- frames 140 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 136 · heap: 132MB
- react commits by boundary (worst first):
  - `player-tabs`: 5 commits, total 32ms, worst 9ms
  - `game-body`: 5 commits, total 32ms, worst 9ms
  - `screen:game`: 5 commits, total 32ms, worst 9ms
  - `app-root`: 5 commits, total 32ms, worst 9ms

### navigate → game list
- kind: `navigate` · measured at +111358ms into run
- **settle**: 566ms · **first DOM change**: 2ms · **window**: 1332ms
- frames 77 · avg 17.3ms · p95 17ms · worst 58ms · >50ms: 1
- long tasks: 1 (total 66ms, worst 66ms)
- backend writes this window: user_vars:set 0.0ms
- queries subscribed during window: 3 · active data subs after: 581 · dom mutations: 179 · heap: 139MB
- react commits by boundary (worst first):
  - `app-root`: 13 commits, total 39ms, worst 12ms
  - `screen:allGames`: 3 commits, total 18ms, worst 12ms
  - `screen:game`: 6 commits, total 16ms, worst 4ms
  - `game-body`: 6 commits, total 16ms, worst 4ms
  - `player-tabs`: 4 commits, total 15ms, worst 4ms

### — Phase D — newser game
> current user is the newser of SIMNEWS9

### open game: SIMNEWS9 (as newser)
- kind: `navigate` · measured at +112691ms into run
- **settle**: 2250ms · **first DOM change**: 2ms · **window**: 3217ms
- frames 179 · avg 18.0ms · p95 17ms · worst 167ms · >50ms: 2
- long tasks: 2 (total 242ms, worst 163ms)
- backend writes this window: user_vars:set 0.0ms, user_lists:set 0.1ms, user_lists:set 0.1ms, user_lists:set 0.0ms, user_lists:set 0.0ms, user_lists:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms
- queries subscribed during window: 54 · active data subs after: 624 · dom mutations: 1776 · heap: 85MB
- react commits by boundary (worst first):
  - `app-root`: 88 commits, total 261ms, worst 82ms
  - `screen:game`: 77 commits, total 236ms, worst 82ms
  - `game-body`: 70 commits, total 231ms, worst 82ms
  - `newser-tabs`: 61 commits, total 221ms, worst 82ms
  - `screen:allGames`: 5 commits, total 15ms, worst 4ms

### tab → newser:newspaper (cold mount)
- kind: `tab` · measured at +115908ms into run
- **settle**: 167ms · **first DOM change**: 31ms · **window**: 733ms
- frames 40 · avg 18.3ms · p95 17ms · worst 67ms · >50ms: 1
- long tasks: 1 (total 57ms, worst 57ms)
- backend writes this window: user_vars:set 0.0ms, user_vars:set 0.0ms, user_lists:set 0.1ms
- queries subscribed during window: 19 · active data subs after: 638 · dom mutations: 68 · heap: 95MB
- react commits by boundary (worst first):
  - `app-root`: 33 commits, total 109ms, worst 27ms
  - `game-body`: 33 commits, total 108ms, worst 27ms
  - `screen:game`: 33 commits, total 108ms, worst 27ms
  - `newser-tabs`: 33 commits, total 107ms, worst 27ms

### tab → newser:ruleBook (cold mount)
- kind: `tab` · measured at +116641ms into run
- **settle**: 8008ms · **first DOM change**: 16ms · **window**: 8009ms
- frames 473 · avg 16.9ms · p95 17ms · worst 142ms · >50ms: 1
- long tasks: 1 (total 111ms, worst 111ms)
- queries subscribed during window: 2 · active data subs after: 640 · dom mutations: 732 · heap: 107MB
- react commits by boundary (worst first):
  - `app-root`: 10 commits, total 123ms, worst 52ms
  - `game-body`: 10 commits, total 123ms, worst 52ms
  - `screen:game`: 10 commits, total 123ms, worst 52ms
  - `newser-tabs`: 10 commits, total 123ms, worst 52ms
- notes: (settle timeout 8000ms)

### tab → newser:phoneBook (cold mount)
- kind: `tab` · measured at +124650ms into run
- **settle**: 7829ms · **first DOM change**: 47ms · **window**: 8015ms
- frames 466 · avg 17.2ms · p95 17ms · worst 208ms · >50ms: 1
- long tasks: 1 (total 212ms, worst 212ms)
- queries subscribed during window: 31 · active data subs after: 667 · dom mutations: 1021 · heap: 109MB
- react commits by boundary (worst first):
  - `app-root`: 22 commits, total 242ms, worst 66ms
  - `screen:game`: 22 commits, total 242ms, worst 66ms
  - `game-body`: 22 commits, total 242ms, worst 66ms
  - `newser-tabs`: 22 commits, total 239ms, worst 66ms
- notes: (settle timeout 8000ms)

### tab → newser:newspaper (warm revisit)
- kind: `tab` · measured at +132666ms into run
- **settle**: 700ms · **first DOM change**: 12ms · **window**: 883ms
- frames 52 · avg 17.0ms · p95 17ms · worst 33ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 667 · dom mutations: 153 · heap: 108MB
- react commits by boundary (worst first):
  - `screen:game`: 2 commits, total 10ms, worst 7ms
  - `app-root`: 2 commits, total 10ms, worst 7ms
  - `game-body`: 2 commits, total 10ms, worst 7ms
  - `newser-tabs`: 2 commits, total 8ms, worst 5ms

### tab → newser:ruleBook (warm revisit)
- kind: `tab` · measured at +133549ms into run
- **settle**: 701ms · **first DOM change**: 6ms · **window**: 883ms
- frames 53 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 667 · dom mutations: 96 · heap: 109MB
- react commits by boundary (worst first):
  - `app-root`: 3 commits, total 6ms, worst 3ms
  - `game-body`: 3 commits, total 6ms, worst 3ms
  - `screen:game`: 3 commits, total 6ms, worst 3ms
  - `newser-tabs`: 3 commits, total 4ms, worst 2ms

### tab → newser:phoneBook (warm revisit)
- kind: `tab` · measured at +134432ms into run
- **settle**: 1247ms · **first DOM change**: 6ms · **window**: 1433ms
- frames 77 · avg 18.6ms · p95 17ms · worst 167ms · >50ms: 1
- long tasks: 1 (total 169ms, worst 169ms)
- queries subscribed during window: 0 · active data subs after: 667 · dom mutations: 603 · heap: 132MB
- react commits by boundary (worst first):
  - `app-root`: 8 commits, total 161ms, worst 89ms
  - `game-body`: 8 commits, total 161ms, worst 89ms
  - `screen:game`: 8 commits, total 161ms, worst 89ms
  - `newser-tabs`: 8 commits, total 159ms, worst 89ms

### tab → newser:townSquare (warm revisit)
- kind: `tab` · measured at +135866ms into run
- **settle**: 19ms · **first DOM change**: 11ms · **window**: 317ms
- frames 19 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 667 · dom mutations: 36 · heap: 125MB
- react commits by boundary (worst first):
  - `game-body`: 2 commits, total 6ms, worst 6ms
  - `screen:game`: 2 commits, total 6ms, worst 6ms
  - `app-root`: 2 commits, total 6ms, worst 6ms
  - `newser-tabs`: 2 commits, total 5ms, worst 4ms

### tab → newser:newspaper (warm revisit)
- kind: `tab` · measured at +136183ms into run
- **settle**: 666ms · **first DOM change**: 6ms · **window**: 849ms
- frames 51 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 667 · dom mutations: 128 · heap: 127MB
- react commits by boundary (worst first):
  - `game-body`: 3 commits, total 5ms, worst 3ms
  - `screen:game`: 3 commits, total 5ms, worst 3ms
  - `app-root`: 3 commits, total 5ms, worst 3ms
  - `newser-tabs`: 3 commits, total 4ms, worst 2ms

### scroll: newser newspaper editor
- kind: `scroll` · measured at +137032ms into run
- **settle**: 517ms · **first DOM change**: 7ms · **window**: 2733ms
- frames 164 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 667 · dom mutations: 29 · heap: 96MB
- react commits by boundary (worst first):
  - `newser-tabs`: 3 commits, total 4ms, worst 2ms
  - `game-body`: 3 commits, total 4ms, worst 2ms
  - `screen:game`: 3 commits, total 4ms, worst 2ms
  - `app-root`: 3 commits, total 4ms, worst 2ms

### navigate → game list
- kind: `navigate` · measured at +139766ms into run
- **settle**: 567ms · **first DOM change**: 2ms · **window**: 1333ms
- frames 78 · avg 17.1ms · p95 17ms · worst 42ms · >50ms: 0
- long tasks: 1 (total 61ms, worst 61ms)
- backend writes this window: user_vars:set 0.0ms
- queries subscribed during window: 0 · active data subs after: 667 · dom mutations: 176 · heap: 76MB
- react commits by boundary (worst first):
  - `app-root`: 10 commits, total 27ms, worst 13ms
  - `screen:allGames`: 3 commits, total 19ms, worst 13ms
  - `newser-tabs`: 2 commits, total 3ms, worst 1ms
  - `game-body`: 2 commits, total 3ms, worst 1ms
  - `screen:game`: 2 commits, total 3ms, worst 1ms

### — Phase E — modal lab
> every dialog with fixture data, opened/closed/measured

### modal open: MarkdownEditorDialog (heavy editor)
- kind: `modal-open` · measured at +141119ms into run
- **settle**: 243ms · **first DOM change**: 12ms · **window**: 904ms
- frames 39 · avg 23.2ms · p95 83ms · worst 212ms · >50ms: 2
- long tasks: 1 (total 225ms, worst 225ms)
- backend writes this window: user_vars:set 0.0ms
- queries subscribed during window: 2 · active data subs after: 668 · dom mutations: 459 · heap: 110MB

### modal close: MarkdownEditorDialog (heavy editor)
- kind: `modal-close` · measured at +142024ms into run
- **settle**: 183ms · **first DOM change**: 17ms · **window**: 450ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 668 · dom mutations: 30 · heap: 93MB

### modal open: markdown-editor (for minimize test)
- kind: `modal-open` · measured at +142474ms into run
- **settle**: 200ms · **first DOM change**: 181ms · **window**: 767ms
- frames 36 · avg 21.3ms · p95 17ms · worst 183ms · >50ms: 1
- long tasks: 1 (total 184ms, worst 184ms)
- queries subscribed during window: 0 · active data subs after: 668 · dom mutations: 434 · heap: 86MB

### modal minimize: markdown-editor
- kind: `action` · measured at +143241ms into run
- **settle**: 332ms · **first DOM change**: 34ms · **window**: 618ms
- frames 37 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 668 · dom mutations: 37 · heap: 92MB
- react commits by boundary (worst first):
  - `screen:allGames`: 1 commits, total 0ms, worst 0ms
  - `app-root`: 1 commits, total 0ms, worst 0ms

### modal restore: markdown-editor
- kind: `action` · measured at +143858ms into run
- **settle**: 166ms · **first DOM change**: 28ms · **window**: 882ms
- frames 53 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 668 · dom mutations: 18 · heap: 96MB
- react commits by boundary (worst first):
  - `screen:allGames`: 1 commits, total 0ms, worst 0ms
  - `app-root`: 1 commits, total 0ms, worst 0ms

### modal close: markdown-editor (after restore)
- kind: `modal-close` · measured at +144741ms into run
- **settle**: 184ms · **first DOM change**: 24ms · **window**: 450ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 668 · dom mutations: 24 · heap: 108MB

### modal open: TownSquarePostDialog
- kind: `modal-open` · measured at +145191ms into run
- **settle**: 27ms · **first DOM change**: 13ms · **window**: 691ms
- frames 41 · avg 16.9ms · p95 17ms · worst 24ms · >50ms: 0
- queries subscribed during window: 1 · active data subs after: 669 · dom mutations: 4 · heap: 98MB

### modal close: TownSquarePostDialog
- kind: `modal-close` · measured at +145882ms into run
- **settle**: 13ms · **first DOM change**: 13ms · **window**: 316ms
- frames 19 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 1 · heap: 101MB

### modal open: PlayerProfileDialogNEW
- kind: `modal-open` · measured at +146199ms into run
- **settle**: 92ms · **first DOM change**: 13ms · **window**: 759ms
- frames 42 · avg 18.0ms · p95 17ms · worst 75ms · >50ms: 1
- long tasks: 1 (total 80ms, worst 80ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 90 · heap: 102MB

### modal close: PlayerProfileDialogNEW
- kind: `modal-close` · measured at +146958ms into run
- **settle**: 166ms · **first DOM change**: 20ms · **window**: 432ms
- frames 26 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 105MB

### modal open: UserEditDialog
- kind: `modal-open` · measured at +147391ms into run
- **settle**: 83ms · **first DOM change**: 14ms · **window**: 751ms
- frames 42 · avg 17.8ms · p95 17ms · worst 66ms · >50ms: 1
- long tasks: 1 (total 68ms, worst 68ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 52 · heap: 100MB

### modal close: UserEditDialog
- kind: `modal-close` · measured at +148142ms into run
- **settle**: 166ms · **first DOM change**: 20ms · **window**: 432ms
- frames 26 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 103MB

### modal open: UserAddDialog
- kind: `modal-open` · measured at +148574ms into run
- **settle**: 75ms · **first DOM change**: 15ms · **window**: 743ms
- frames 42 · avg 17.6ms · p95 17ms · worst 58ms · >50ms: 1
- long tasks: 1 (total 60ms, worst 60ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 42 · heap: 102MB

### modal close: UserAddDialog
- kind: `modal-close` · measured at +149317ms into run
- **settle**: 182ms · **first DOM change**: 19ms · **window**: 449ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 105MB

### modal open: RoleEditDialog
- kind: `modal-open` · measured at +149766ms into run
- **settle**: 58ms · **first DOM change**: 15ms · **window**: 725ms
- frames 42 · avg 17.3ms · p95 17ms · worst 41ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 41 · heap: 115MB

### modal close: RoleEditDialog
- kind: `modal-close` · measured at +150491ms into run
- **settle**: 167ms · **first DOM change**: 21ms · **window**: 433ms
- frames 26 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 81MB

### modal open: RoleAddDialog
- kind: `modal-open` · measured at +150924ms into run
- **settle**: 58ms · **first DOM change**: 16ms · **window**: 726ms
- frames 42 · avg 17.2ms · p95 17ms · worst 41ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 38 · heap: 91MB

### modal close: RoleAddDialog
- kind: `modal-close` · measured at +151650ms into run
- **settle**: 166ms · **first DOM change**: 21ms · **window**: 432ms
- frames 26 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 94MB

### modal open: VoteEditorDialog
- kind: `modal-open` · measured at +152082ms into run
- **settle**: 75ms · **first DOM change**: 16ms · **window**: 741ms
- frames 42 · avg 17.6ms · p95 17ms · worst 58ms · >50ms: 1
- long tasks: 1 (total 63ms, worst 63ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 41 · heap: 88MB

### modal close: VoteEditorDialog
- kind: `modal-close` · measured at +152824ms into run
- **settle**: 183ms · **first DOM change**: 22ms · **window**: 450ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 91MB

### modal open: VoteEnableDialog
- kind: `modal-open` · measured at +153274ms into run
- **settle**: 58ms · **first DOM change**: 17ms · **window**: 725ms
- frames 42 · avg 17.3ms · p95 17ms · worst 41ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 37 · heap: 101MB

### modal close: VoteEnableDialog
- kind: `modal-close` · measured at +153999ms into run
- **settle**: 183ms · **first DOM change**: 22ms · **window**: 450ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 82MB

### modal open: ActionEditorDialog
- kind: `modal-open` · measured at +154449ms into run
- **settle**: 75ms · **first DOM change**: 18ms · **window**: 742ms
- frames 42 · avg 17.6ms · p95 17ms · worst 58ms · >50ms: 1
- long tasks: 1 (total 62ms, worst 62ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 37 · heap: 100MB

### modal close: ActionEditorDialog
- kind: `modal-close` · measured at +155191ms into run
- **settle**: 183ms · **first DOM change**: 24ms · **window**: 450ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 104MB

### modal open: BioEditorDialog
- kind: `modal-open` · measured at +155641ms into run
- **settle**: 117ms · **first DOM change**: 22ms · **window**: 783ms
- frames 42 · avg 18.6ms · p95 17ms · worst 99ms · >50ms: 1
- long tasks: 1 (total 100ms, worst 100ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 66 · heap: 85MB

### modal close: BioEditorDialog
- kind: `modal-close` · measured at +156424ms into run
- **settle**: 287ms · **first DOM change**: 22ms · **window**: 550ms
- frames 33 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 7 · heap: 89MB

### modal open: TagCellEditor
- kind: `modal-open` · measured at +156974ms into run
- **settle**: 282ms · **first DOM change**: 25ms · **window**: 942ms
- frames 48 · avg 19.6ms · p95 17ms · worst 108ms · >50ms: 2
- long tasks: 1 (total 113ms, worst 113ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 78 · heap: 97MB

### modal close: TagCellEditor
- kind: `modal-close` · measured at +157916ms into run
- **settle**: 183ms · **first DOM change**: 26ms · **window**: 450ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 101MB

### modal open: AddTagDialog
- kind: `modal-open` · measured at +158365ms into run
- **settle**: 83ms · **first DOM change**: 20ms · **window**: 751ms
- frames 42 · avg 17.8ms · p95 17ms · worst 66ms · >50ms: 1
- long tasks: 1 (total 69ms, worst 69ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 35 · heap: 99MB

### modal close: AddTagDialog
- kind: `modal-close` · measured at +159117ms into run
- **settle**: 182ms · **first DOM change**: 26ms · **window**: 432ms
- frames 26 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 103MB

### modal open: AddTagDialog (edit mode + trigger script)
- kind: `modal-open` · measured at +159549ms into run
- **settle**: 100ms · **first DOM change**: 22ms · **window**: 766ms
- frames 42 · avg 18.2ms · p95 17ms · worst 82ms · >50ms: 1
- long tasks: 1 (total 85ms, worst 85ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 56 · heap: 103MB

### modal close: AddTagDialog (edit mode + trigger script)
- kind: `modal-close` · measured at +160315ms into run
- **settle**: 183ms · **first DOM change**: 30ms · **window**: 450ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 108MB

### modal open: ChooseDayDialog
- kind: `modal-open` · measured at +160765ms into run
- **settle**: 92ms · **first DOM change**: 25ms · **window**: 742ms
- frames 39 · avg 18.3ms · p95 21ms · worst 75ms · >50ms: 1
- long tasks: 1 (total 76ms, worst 76ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 34 · heap: 107MB

### modal close: ChooseDayDialog
- kind: `modal-close` · measured at +161508ms into run
- **settle**: 28ms · **first DOM change**: 28ms · **window**: 316ms
- frames 15 · avg 21.0ms · p95 52ms · worst 52ms · >50ms: 1
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 3 · heap: 111MB

### modal open: DaySelectionDialog
- kind: `modal-open` · measured at +161824ms into run
- **settle**: 233ms · **first DOM change**: 29ms · **window**: 892ms
- frames 50 · avg 17.8ms · p95 20ms · worst 66ms · >50ms: 1
- long tasks: 1 (total 67ms, worst 67ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 61 · heap: 123MB

### modal close: DaySelectionDialog
- kind: `modal-close` · measured at +162716ms into run
- **settle**: 185ms · **first DOM change**: 29ms · **window**: 450ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 84MB

### modal open: DaysPerGameDayDialog
- kind: `modal-open` · measured at +163165ms into run
- **settle**: 75ms · **first DOM change**: 26ms · **window**: 742ms
- frames 42 · avg 17.6ms · p95 17ms · worst 58ms · >50ms: 1
- long tasks: 1 (total 63ms, worst 63ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 34 · heap: 96MB

### modal close: DaysPerGameDayDialog
- kind: `modal-close` · measured at +163907ms into run
- **settle**: 28ms · **first DOM change**: 28ms · **window**: 316ms
- frames 19 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 3 · heap: 101MB

### modal open: DeleteRoleConfirmationDialog
- kind: `modal-open` · measured at +164224ms into run
- **settle**: 217ms · **first DOM change**: 30ms · **window**: 883ms
- frames 50 · avg 17.7ms · p95 17ms · worst 66ms · >50ms: 1
- long tasks: 1 (total 67ms, worst 67ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 63 · heap: 90MB

### modal close: DeleteRoleConfirmationDialog
- kind: `modal-close` · measured at +165107ms into run
- **settle**: 185ms · **first DOM change**: 30ms · **window**: 450ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 95MB

### modal open: EditInfoDialog
- kind: `modal-open` · measured at +165557ms into run
- **settle**: 83ms · **first DOM change**: 26ms · **window**: 751ms
- frames 42 · avg 17.8ms · p95 17ms · worst 66ms · >50ms: 1
- long tasks: 1 (total 68ms, worst 68ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 42 · heap: 108MB

### modal close: EditInfoDialog
- kind: `modal-close` · measured at +166308ms into run
- **settle**: 199ms · **first DOM change**: 34ms · **window**: 465ms
- frames 28 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 93MB

### modal open: JoinedGameOptionsDialog
- kind: `modal-open` · measured at +166774ms into run
- **settle**: 108ms · **first DOM change**: 28ms · **window**: 775ms
- frames 42 · avg 18.4ms · p95 17ms · worst 91ms · >50ms: 1
- long tasks: 1 (total 98ms, worst 98ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 42 · heap: 103MB

### modal close: JoinedGameOptionsDialog
- kind: `modal-close` · measured at +167549ms into run
- **settle**: 300ms · **first DOM change**: 28ms · **window**: 567ms
- frames 34 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 9 · heap: 108MB

### modal open: ArchivedGamesDialog
- kind: `modal-open` · measured at +168115ms into run
- **settle**: 250ms · **first DOM change**: 30ms · **window**: 918ms
- frames 50 · avg 18.3ms · p95 17ms · worst 100ms · >50ms: 1
- long tasks: 1 (total 106ms, worst 106ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 55 · heap: 106MB

### modal close: ArchivedGamesDialog
- kind: `modal-close` · measured at +169033ms into run
- **settle**: 169ms · **first DOM change**: 30ms · **window**: 432ms
- frames 26 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 9 · heap: 111MB

### modal open: MarkdownInputBuilderDialog
- kind: `modal-open` · measured at +169465ms into run
- **settle**: 250ms · **first DOM change**: 31ms · **window**: 918ms
- frames 51 · avg 18.0ms · p95 17ms · worst 83ms · >50ms: 1
- long tasks: 1 (total 88ms, worst 88ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 76 · heap: 85MB

### modal close: MarkdownInputBuilderDialog
- kind: `modal-close` · measured at +170383ms into run
- **settle**: 162ms · **first DOM change**: 29ms · **window**: 415ms
- frames 25 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 7 · heap: 91MB

### modal open: MarkdownVariableDialog
- kind: `modal-open` · measured at +170799ms into run
- **settle**: 217ms · **first DOM change**: 32ms · **window**: 883ms
- frames 50 · avg 17.7ms · p95 17ms · worst 66ms · >50ms: 1
- long tasks: 1 (total 70ms, worst 70ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 54 · heap: 103MB

### modal close: MarkdownVariableDialog
- kind: `modal-close` · measured at +171682ms into run
- **settle**: 183ms · **first DOM change**: 31ms · **window**: 433ms
- frames 26 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 11 · heap: 108MB

### modal open: NightlyCertificationDialog
- kind: `modal-open` · measured at +172116ms into run
- **settle**: 283ms · **first DOM change**: 33ms · **window**: 951ms
- frames 50 · avg 19.0ms · p95 22ms · worst 116ms · >50ms: 1
- long tasks: 1 (total 121ms, worst 121ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 205 · heap: 95MB

### modal close: NightlyCertificationDialog
- kind: `modal-close` · measured at +173067ms into run
- **settle**: 146ms · **first DOM change**: 40ms · **window**: 407ms
- frames 24 · avg 16.9ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 9 · heap: 102MB

### modal open: ScheduleTableUpdateDialog
- kind: `modal-open` · measured at +173474ms into run
- **settle**: 250ms · **first DOM change**: 35ms · **window**: 918ms
- frames 50 · avg 18.3ms · p95 17ms · worst 99ms · >50ms: 1
- long tasks: 1 (total 101ms, worst 101ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 82 · heap: 100MB

### modal close: ScheduleTableUpdateDialog
- kind: `modal-close` · measured at +174392ms into run
- **settle**: 168ms · **first DOM change**: 33ms · **window**: 432ms
- frames 26 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 9 · heap: 106MB

### modal open: ColumnActionsDialog
- kind: `modal-open` · measured at +174824ms into run
- **settle**: 225ms · **first DOM change**: 35ms · **window**: 892ms
- frames 50 · avg 17.8ms · p95 17ms · worst 74ms · >50ms: 1
- long tasks: 1 (total 82ms, worst 82ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 66 · heap: 103MB

### modal close: ColumnActionsDialog
- kind: `modal-close` · measured at +175715ms into run
- **settle**: 183ms · **first DOM change**: 35ms · **window**: 450ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 9 · heap: 109MB

### modal open: PhoneBookTocDialog
- kind: `modal-open` · measured at +176165ms into run
- **settle**: 258ms · **first DOM change**: 36ms · **window**: 925ms
- frames 51 · avg 18.1ms · p95 17ms · worst 91ms · >50ms: 1
- long tasks: 1 (total 97ms, worst 97ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 65 · heap: 87MB

### modal close: PhoneBookTocDialog
- kind: `modal-close` · measured at +177091ms into run
- **settle**: 150ms · **first DOM change**: 35ms · **window**: 416ms
- frames 25 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 9 · heap: 94MB

### modal open: TableOfContentsDialog (rulebook)
- kind: `modal-open` · measured at +177507ms into run
- **settle**: 275ms · **first DOM change**: 36ms · **window**: 943ms
- frames 51 · avg 18.5ms · p95 17ms · worst 108ms · >50ms: 1
- long tasks: 1 (total 115ms, worst 115ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 111 · heap: 101MB

### modal close: TableOfContentsDialog (rulebook)
- kind: `modal-close` · measured at +178450ms into run
- **settle**: 161ms · **first DOM change**: 37ms · **window**: 415ms
- frames 25 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 9 · heap: 108MB

### modal open: ImportDraftDialog
- kind: `modal-open` · measured at +178865ms into run
- **settle**: 250ms · **first DOM change**: 37ms · **window**: 917ms
- frames 50 · avg 18.3ms · p95 17ms · worst 83ms · >50ms: 1
- long tasks: 2 (total 137ms, worst 87ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 143 · heap: 104MB

### modal close: ImportDraftDialog
- kind: `modal-close` · measured at +179782ms into run
- **settle**: 183ms · **first DOM change**: 39ms · **window**: 450ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 119MB

### modal open: NewspaperSectionOptionsDialog
- kind: `modal-open` · measured at +180232ms into run
- **settle**: 108ms · **first DOM change**: 32ms · **window**: 776ms
- frames 42 · avg 18.4ms · p95 17ms · worst 91ms · >50ms: 1
- long tasks: 1 (total 99ms, worst 99ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 39 · heap: 120MB

### modal close: NewspaperSectionOptionsDialog
- kind: `modal-close` · measured at +181008ms into run
- **settle**: 315ms · **first DOM change**: 35ms · **window**: 565ms
- frames 34 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 9 · heap: 126MB

### modal open: PlayerPreviewModal
- kind: `modal-open` · measured at +181574ms into run
- **settle**: 317ms · **first DOM change**: 37ms · **window**: 983ms
- frames 51 · avg 19.3ms · p95 17ms · worst 150ms · >50ms: 1
- long tasks: 1 (total 153ms, worst 153ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 116 · heap: 89MB

### modal close: PlayerPreviewModal
- kind: `modal-close` · measured at +182557ms into run
- **settle**: 107ms · **first DOM change**: 32ms · **window**: 366ms
- frames 22 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 7 · heap: 96MB

### modal open: TownSquareImageDialog
- kind: `modal-open` · measured at +182924ms into run
- **settle**: 233ms · **first DOM change**: 40ms · **window**: 900ms
- frames 50 · avg 18.0ms · p95 17ms · worst 83ms · >50ms: 1
- long tasks: 1 (total 89ms, worst 89ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 59 · heap: 110MB

### modal close: TownSquareImageDialog
- kind: `modal-close` · measured at +183824ms into run
- **settle**: 183ms · **first DOM change**: 36ms · **window**: 450ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 9 · heap: 97MB

### modal open: TownSquareLinkDialog
- kind: `modal-open` · measured at +184274ms into run
- **settle**: 250ms · **first DOM change**: 42ms · **window**: 917ms
- frames 51 · avg 18.0ms · p95 17ms · worst 83ms · >50ms: 1
- long tasks: 1 (total 90ms, worst 90ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 62 · heap: 112MB

### modal close: TownSquareLinkDialog
- kind: `modal-close` · measured at +185190ms into run
- **settle**: 167ms · **first DOM change**: 37ms · **window**: 433ms
- frames 26 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 7 · heap: 101MB

### modal open: TownSquareMoreOptionsDialog
- kind: `modal-open` · measured at +185624ms into run
- **settle**: 250ms · **first DOM change**: 40ms · **window**: 917ms
- frames 51 · avg 18.0ms · p95 17ms · worst 83ms · >50ms: 1
- long tasks: 1 (total 87ms, worst 87ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 59 · heap: 116MB

### modal close: TownSquareMoreOptionsDialog
- kind: `modal-close` · measured at +186540ms into run
- **settle**: 166ms · **first DOM change**: 38ms · **window**: 416ms
- frames 25 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 9 · heap: 105MB

### modal open: ConfirmDialog
- kind: `modal-open` · measured at +186957ms into run
- **settle**: 250ms · **first DOM change**: 41ms · **window**: 917ms
- frames 51 · avg 18.0ms · p95 17ms · worst 83ms · >50ms: 1
- long tasks: 1 (total 87ms, worst 87ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 53 · heap: 120MB

### modal close: ConfirmDialog
- kind: `modal-close` · measured at +187874ms into run
- **settle**: 200ms · **first DOM change**: 40ms · **window**: 466ms
- frames 28 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 87MB

### modal open: ImageUploadDialog
- kind: `modal-open` · measured at +188340ms into run
- **settle**: 100ms · **first DOM change**: 35ms · **window**: 768ms
- frames 42 · avg 18.2ms · p95 17ms · worst 83ms · >50ms: 1
- long tasks: 1 (total 84ms, worst 84ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 44 · heap: 102MB

### modal close: ImageUploadDialog
- kind: `modal-close` · measured at +189108ms into run
- **settle**: 313ms · **first DOM change**: 40ms · **window**: 566ms
- frames 34 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 10 · heap: 109MB

### modal open: SaveHistoryDialog
- kind: `modal-open` · measured at +189674ms into run
- **settle**: 258ms · **first DOM change**: 41ms · **window**: 926ms
- frames 51 · avg 18.1ms · p95 17ms · worst 91ms · >50ms: 1
- long tasks: 1 (total 98ms, worst 98ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 80 · heap: 102MB

### modal close: SaveHistoryDialog
- kind: `modal-close` · measured at +190600ms into run
- **settle**: 207ms · **first DOM change**: 41ms · **window**: 474ms
- frames 28 · avg 16.9ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 109MB

### modal open: UnsavedChangesDialog
- kind: `modal-open` · measured at +191074ms into run
- **settle**: 100ms · **first DOM change**: 36ms · **window**: 766ms
- frames 42 · avg 18.2ms · p95 17ms · worst 83ms · >50ms: 1
- long tasks: 1 (total 86ms, worst 86ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 105MB

### modal close: UnsavedChangesDialog
- kind: `modal-close` · measured at +191840ms into run
- **settle**: 192ms · **first DOM change**: 41ms · **window**: 458ms
- frames 27 · avg 17.0ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 111MB

### modal open: ViewOnlyPreviewModal
- kind: `modal-open` · measured at +192299ms into run
- **settle**: 100ms · **first DOM change**: 37ms · **window**: 767ms
- frames 42 · avg 18.2ms · p95 17ms · worst 83ms · >50ms: 1
- long tasks: 1 (total 83ms, worst 83ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 28 · heap: 105MB

### modal close: ViewOnlyPreviewModal
- kind: `modal-close` · measured at +193065ms into run
- **settle**: 192ms · **first DOM change**: 41ms · **window**: 458ms
- frames 27 · avg 17.0ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 112MB

### modal open: DeleteGameConfirmationDialog
- kind: `modal-open` · measured at +193524ms into run
- **settle**: 100ms · **first DOM change**: 36ms · **window**: 767ms
- frames 40 · avg 18.9ms · p95 17ms · worst 83ms · >50ms: 1
- long tasks: 1 (total 84ms, worst 84ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 34 · heap: 110MB

### modal close: DeleteGameConfirmationDialog
- kind: `modal-close` · measured at +194291ms into run
- **settle**: 207ms · **first DOM change**: 44ms · **window**: 474ms
- frames 28 · avg 16.9ms · p95 17ms · worst 33ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 116MB

### — Tour complete
> 164 steps in 193.0s
