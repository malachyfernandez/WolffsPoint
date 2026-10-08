# WolffsPoint Perf Audit — Simulated Run

- **Started**: 2026-10-08T16:25:13.748Z
- **Run duration**: 190.7s
- **UA**: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/146.0.0.0 Safari/537.36`
- **Viewport**: 1280x900 @ 1x
- **CPU cores**: 12 · **Memory**: 8GB
- **Simulated backend latency**: 20ms

## Summary

| # | Step | Kind | Settle | First paint | Frames | Long tasks | Slowest subtree | Rating |
|---|------|------|--------|-------------|--------|------------|-----------------|--------|
| 1 | Perf audit tour starting | note | 0ms | — | — | 0 | — | 🟢 ok |
| 2 | Phase A — game list | note | 0ms | — | — | 0 | — | 🟢 ok |
| 3 | scroll: game list | scroll | 3ms | 3ms | p95 0ms, 0 slow | 0 | — | 🟢 ok |
| 4 | action: New WolffsPoint dialog open | modal-open | 56ms | 23ms | p95 17ms, 0 slow | 0 | screen:allGames 0ms (1 commits) | 🟢 ok |
| 5 | modal close: New WolffsPoint | modal-close | 167ms | 9ms | p95 17ms, 0 slow | 0 | screen:allGames 0ms (1 commits) | 🟢 ok |
| 6 | Phase B — operator game | note | 0ms | — | — | 0 | — | 🟢 ok |
| 7 | open game: SIMOP1234 (as operator) | navigate | 4208ms | 3ms | p95 117ms, 16 slow | 16 (215ms worst) | app-root 1799ms (527 commits) | 🔴 slow |
| 8 | tab → op:config (cold mount) | tab | 673ms | 363ms | p95 133ms, 4 slow | 2 (363ms worst) | app-root 486ms (141 commits) | 🔴 slow |
| 9 | tab → op:nightly (cold mount) | tab | 1642ms | 492ms | p95 108ms, 5 slow | 4 (493ms worst) | app-root 918ms (88 commits) | 🔴 slow |
| 10 | tab → op:forum (cold mount) | tab | 616ms | 162ms | p95 50ms, 2 slow | 2 (162ms worst) | app-root 339ms (97 commits) | 🟡 meh |
| 11 | tab → op:newspaper (cold mount) | tab | 665ms | 141ms | p95 58ms, 2 slow | 2 (141ms worst) | app-root 180ms (27 commits) | 🟡 meh |
| 12 | tab → op:rulebook (cold mount) | tab | 748ms | 80ms | p95 17ms, 1 slow | 1 (80ms worst) | app-root 67ms (16 commits) | 🟡 meh |
| 13 | tab → op:players (warm revisit) | tab | 216ms | 134ms | p95 125ms, 2 slow | 2 (134ms worst) | game-body 174ms (4 commits) | 🟡 meh |
| 14 | tab → op:config (warm revisit) | tab | 113ms | 38ms | p95 50ms, 0 slow | 1 (66ms worst) | app-root 82ms (4 commits) | 🟢 ok |
| 15 | tab → op:nightly (warm revisit) | tab | 82ms | 37ms | p95 41ms, 0 slow | 0 | app-root 58ms (4 commits) | 🟢 ok |
| 16 | tab → op:forum (warm revisit) | tab | 178ms | 132ms | p95 133ms, 1 slow | 1 (140ms worst) | app-root 155ms (4 commits) | 🟡 meh |
| 17 | tab → op:newspaper (warm revisit) | tab | 708ms | 38ms | p95 17ms, 0 slow | 0 | app-root 29ms (3 commits) | 🟡 meh |
| 18 | tab → op:rulebook (warm revisit) | tab | 450ms | 132ms | p95 17ms, 1 slow | 1 (136ms worst) | app-root 123ms (3 commits) | 🟡 meh |
| 19 | tab → op:players (warm revisit) | tab | 166ms | 44ms | p95 50ms, 0 slow | 2 (67ms worst) | game-body 87ms (4 commits) | 🟢 ok |
| 20 | rapid tab cycle (all 6 operator tabs) | action | 1383ms | 1ms | p95 42ms, 3 slow | 2 (134ms worst) | app-root 387ms (16 commits) | 🔴 slow |
| 21 | tab → op:players (warm revisit) | tab | 203ms | 130ms | p95 117ms, 1 slow | 2 (130ms worst) | app-root 173ms (4 commits) | 🟡 meh |
| 22 | scroll: operator players table (vertical) | scroll | 20ms | 20ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 23 | scroll: players table horizontal | scroll | 15ms | 15ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 24 | tab → op:nightly (warm revisit) | tab | 249ms | 132ms | p95 133ms, 2 slow | 2 (141ms worst) | app-root 209ms (5 commits) | 🟡 meh |
| 25 | scroll: operator nightly | scroll | 367ms | 17ms | p95 17ms, 0 slow | 0 | op-tabs 4ms (7 commits) | 🟢 ok |
| 26 | modal open: Review/Certify (nightly) | modal-open | 342ms | 327ms | p95 17ms, 1 slow | 1 (329ms worst) | app-root 123ms (5 commits) | 🔴 slow |
| 27 | modal close: Review/Certify | modal-close | 243ms | 91ms | p95 17ms, 1 slow | 1 (91ms worst) | app-root 66ms (4 commits) | 🟢 ok |
| 28 | tab → op:forum (warm revisit) | tab | 173ms | 133ms | p95 133ms, 1 slow | 1 (140ms worst) | game-body 151ms (4 commits) | 🟡 meh |
| 29 | scroll: town square thread list | scroll | 21ms | 21ms | p95 17ms, 0 slow | 0 | app-root 5ms (6 commits) | 🟢 ok |
| 30 | navigate: thread list → thread detail | navigate | 575ms | 3ms | p95 17ms, 1 slow | 1 (297ms worst) | app-root 268ms (17 commits) | 🟡 meh |
| 31 | scroll: thread detail comments | scroll | 20ms | 20ms | p95 17ms, 0 slow | 0 | app-root 2ms (2 commits) | 🟢 ok |
| 32 | navigate: thread detail → thread list | navigate | 650ms | 13ms | p95 17ms, 1 slow | 1 (255ms worst) | op-tabs 237ms (8 commits) | 🟡 meh |
| 33 | navigate: open second thread (warm) | navigate | 450ms | 35ms | p95 17ms, 0 slow | 1 (59ms worst) | app-root 95ms (14 commits) | 🟢 ok |
| 34 | navigate: back to thread list (warm) | navigate | 657ms | 12ms | p95 17ms, 1 slow | 1 (266ms worst) | game-body 249ms (7 commits) | 🟡 meh |
| 35 | modal open: New Thread composer | modal-open | 57ms | 43ms | p95 17ms, 0 slow | 0 | app-root 9ms (4 commits) | 🟢 ok |
| 36 | modal close: New Thread composer | modal-close | 201ms | 24ms | p95 17ms, 0 slow | 0 | app-root 14ms (4 commits) | 🟢 ok |
| 37 | tab → op:newspaper (warm revisit) | tab | 783ms | 115ms | p95 17ms, 1 slow | 1 (119ms worst) | screen:game 107ms (3 commits) | 🟡 meh |
| 38 | scroll: operator newspaper | scroll | 20ms | 20ms | p95 17ms, 0 slow | 0 | app-root 6ms (7 commits) | 🟢 ok |
| 39 | tab → op:rulebook (warm revisit) | tab | 441ms | 133ms | p95 23ms, 1 slow | 1 (137ms worst) | app-root 129ms (5 commits) | 🟡 meh |
| 40 | scroll: operator config page | scroll | 183ms | 20ms | p95 17ms, 0 slow | 0 | screen:game 2ms (2 commits) | 🟢 ok |
| 41 | navigate: config → rule book subpage | navigate | 7903ms | 2ms | p95 17ms, 1 slow | 1 (231ms worst) | app-root 222ms (16 commits) | 🔴 slow |
| 42 | scroll: operator rulebook (scroll-linked TOC) | scroll | 3051ms | 23ms | p95 17ms, 0 slow | 0 | screen:game 6ms (6 commits) | 🔴 slow |
| 43 | modal open: rulebook table of contents | modal-open | 49ms | 2ms | p95 17ms, 0 slow | 0 | app-root 5ms (5 commits) | 🟢 ok |
| 44 | modal close: rulebook TOC | modal-close | 167ms | 12ms | p95 17ms, 0 slow | 0 | op-tabs 3ms (2 commits) | 🟢 ok |
| 45 | navigate: rule book → config | navigate | 466ms | 4ms | p95 17ms, 1 slow | 1 (85ms worst) | app-root 69ms (8 commits) | 🟢 ok |
| 46 | navigate: config → phone book subpage | navigate | 7985ms | 3ms | p95 17ms, 1 slow | 1 (213ms worst) | app-root 204ms (16 commits) | 🔴 slow |
| 47 | scroll: operator phone book | scroll | 2350ms | 21ms | p95 17ms, 0 slow | 0 | op-tabs 2ms (2 commits) | 🔴 slow |
| 48 | navigate: phone book → config | navigate | 457ms | 4ms | p95 17ms, 1 slow | 1 (78ms worst) | app-root 59ms (9 commits) | 🟢 ok |
| 49 | tab → op:config (warm revisit) | tab | 117ms | 117ms | p95 101ms, 1 slow | 1 (117ms worst) | app-root 104ms (4 commits) | 🟢 ok |
| 50 | scroll: operator roles table | scroll | 18ms | 18ms | p95 17ms, 0 slow | 0 | op-tabs 4ms (3 commits) | 🟢 ok |
| 51 | navigate → game list | navigate | 650ms | 2ms | p95 17ms, 1 slow | 1 (167ms worst) | app-root 25ms (9 commits) | 🟡 meh |
| 52 | Phase C — player game | note | 0ms | — | — | 0 | — | 🟢 ok |
| 53 | open game: SIMPLY567 (as player) | navigate | 2250ms | 2ms | p95 17ms, 2 slow | 2 (166ms worst) | app-root 271ms (104 commits) | 🔴 slow |
| 54 | tab → player:newspaper (cold mount) | tab | 326ms | 20ms | p95 17ms, 1 slow | 1 (103ms worst) | app-root 111ms (31 commits) | 🟢 ok |
| 55 | tab → player:eyesOnly (cold mount) | tab | 399ms | 47ms | p95 17ms, 0 slow | 0 | app-root 59ms (18 commits) | 🟢 ok |
| 56 | tab → player:ruleBook (cold mount) | tab | 7824ms | 35ms | p95 17ms, 1 slow | 1 (160ms worst) | app-root 263ms (18 commits) | 🔴 slow |
| 57 | tab → player:phoneBook (cold mount) | tab | 7840ms | 59ms | p95 17ms, 3 slow | 2 (232ms worst) | app-root 334ms (25 commits) | 🔴 slow |
| 58 | tab → player:newspaper (warm revisit) | tab | 326ms | 21ms | p95 17ms, 1 slow | 0 | app-root 36ms (19 commits) | 🟢 ok |
| 59 | tab → player:eyesOnly (warm revisit) | tab | 23ms | 19ms | p95 17ms, 0 slow | 0 | game-body 15ms (3 commits) | 🟢 ok |
| 60 | tab → player:ruleBook (warm revisit) | tab | 375ms | 20ms | p95 17ms, 0 slow | 0 | app-root 27ms (4 commits) | 🟢 ok |
| 61 | tab → player:phoneBook (warm revisit) | tab | 1247ms | 18ms | p95 17ms, 1 slow | 1 (156ms worst) | app-root 166ms (8 commits) | 🔴 slow |
| 62 | tab → player:townSquare (warm revisit) | tab | 236ms | 21ms | p95 17ms, 0 slow | 0 | app-root 28ms (4 commits) | 🟢 ok |
| 63 | tab → player:townSquare (warm revisit) | tab | 2ms | 2ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 64 | scroll: player town square | scroll | 1491ms | 7ms | p95 17ms, 0 slow | 0 | screen:game 35ms (6 commits) | 🔴 slow |
| 65 | tab → player:newspaper (warm revisit) | tab | 317ms | 17ms | p95 17ms, 0 slow | 0 | screen:game 33ms (17 commits) | 🟢 ok |
| 66 | scroll: player newspaper | scroll | 1758ms | 8ms | p95 17ms, 0 slow | 0 | app-root 35ms (6 commits) | 🔴 slow |
| 67 | tab → player:eyesOnly (warm revisit) | tab | 128ms | 18ms | p95 17ms, 0 slow | 0 | game-body 25ms (5 commits) | 🟢 ok |
| 68 | scroll: player eyes only | scroll | 1807ms | 7ms | p95 17ms, 0 slow | 0 | app-root 28ms (5 commits) | 🔴 slow |
| 69 | tab → player:ruleBook (warm revisit) | tab | 216ms | 17ms | p95 17ms, 0 slow | 0 | game-body 14ms (2 commits) | 🟢 ok |
| 70 | scroll: player rulebook (scroll-linked) | scroll | 2834ms | 6ms | p95 17ms, 0 slow | 0 | app-root 34ms (8 commits) | 🔴 slow |
| 71 | tab → player:phoneBook (warm revisit) | tab | 1414ms | 17ms | p95 17ms, 1 slow | 1 (157ms worst) | app-root 180ms (11 commits) | 🔴 slow |
| 72 | scroll: player phone book | scroll | 2334ms | 8ms | p95 17ms, 0 slow | 0 | app-root 26ms (4 commits) | 🔴 slow |
| 73 | navigate → game list | navigate | 574ms | 2ms | p95 17ms, 1 slow | 1 (71ms worst) | app-root 48ms (13 commits) | 🟡 meh |
| 74 | Phase D — newser game | note | 0ms | — | — | 0 | — | 🟢 ok |
| 75 | open game: SIMNEWS9 (as newser) | navigate | 2282ms | 2ms | p95 17ms, 2 slow | 2 (167ms worst) | app-root 283ms (89 commits) | 🔴 slow |
| 76 | tab → newser:newspaper (cold mount) | tab | 226ms | 21ms | p95 17ms, 2 slow | 1 (62ms worst) | app-root 112ms (33 commits) | 🟢 ok |
| 77 | tab → newser:ruleBook (cold mount) | tab | 8007ms | 14ms | p95 17ms, 1 slow | 1 (113ms worst) | app-root 123ms (10 commits) | 🔴 slow |
| 78 | tab → newser:phoneBook (cold mount) | tab | 7822ms | 41ms | p95 17ms, 1 slow | 1 (211ms worst) | app-root 237ms (22 commits) | 🔴 slow |
| 79 | tab → newser:newspaper (warm revisit) | tab | 683ms | 9ms | p95 17ms, 0 slow | 0 | game-body 8ms (2 commits) | 🟡 meh |
| 80 | tab → newser:ruleBook (warm revisit) | tab | 707ms | 7ms | p95 17ms, 0 slow | 0 | app-root 6ms (3 commits) | 🟡 meh |
| 81 | tab → newser:phoneBook (warm revisit) | tab | 1240ms | 6ms | p95 17ms, 1 slow | 1 (159ms worst) | screen:game 151ms (8 commits) | 🔴 slow |
| 82 | tab → newser:townSquare (warm revisit) | tab | 19ms | 9ms | p95 17ms, 0 slow | 0 | app-root 6ms (2 commits) | 🟢 ok |
| 83 | tab → newser:newspaper (warm revisit) | tab | 667ms | 7ms | p95 17ms, 0 slow | 0 | game-body 6ms (3 commits) | 🟡 meh |
| 84 | scroll: newser newspaper editor | scroll | 517ms | 7ms | p95 17ms, 0 slow | 0 | screen:game 4ms (3 commits) | 🟡 meh |
| 85 | navigate → game list | navigate | 558ms | 2ms | p95 17ms, 0 slow | 1 (57ms worst) | app-root 27ms (11 commits) | 🟡 meh |
| 86 | Phase E — modal lab | note | 0ms | — | — | 0 | — | 🟢 ok |
| 87 | modal open: MarkdownEditorDialog (heavy editor) | modal-open | 246ms | 12ms | p95 17ms, 1 slow | 1 (220ms worst) | — | 🟡 meh |
| 88 | modal close: MarkdownEditorDialog (heavy editor) | modal-close | 167ms | 16ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 89 | modal open: markdown-editor (for minimize test) | modal-open | 208ms | 189ms | p95 17ms, 1 slow | 1 (192ms worst) | — | 🟡 meh |
| 90 | modal minimize: markdown-editor | action | 327ms | 37ms | p95 17ms, 0 slow | 0 | screen:allGames 0ms (1 commits) | 🟢 ok |
| 91 | modal restore: markdown-editor | action | 182ms | 30ms | p95 17ms, 0 slow | 0 | screen:allGames 0ms (1 commits) | 🟢 ok |
| 92 | modal close: markdown-editor (after restore) | modal-close | 184ms | 26ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 93 | modal open: TownSquarePostDialog | modal-open | 119ms | 14ms | p95 17ms, 1 slow | 1 (79ms worst) | — | 🟢 ok |
| 94 | modal close: TownSquarePostDialog | modal-close | 183ms | 26ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 95 | modal open: PlayerProfileDialogNEW | modal-open | 95ms | 15ms | p95 17ms, 1 slow | 1 (78ms worst) | — | 🟢 ok |
| 96 | modal close: PlayerProfileDialogNEW | modal-close | 167ms | 22ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 97 | modal open: UserEditDialog | modal-open | 92ms | 15ms | p95 17ms, 1 slow | 1 (66ms worst) | — | 🟢 ok |
| 98 | modal close: UserEditDialog | modal-close | 167ms | 22ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 99 | modal open: UserAddDialog | modal-open | 75ms | 16ms | p95 17ms, 1 slow | 1 (64ms worst) | — | 🟢 ok |
| 100 | modal close: UserAddDialog | modal-close | 167ms | 21ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 101 | modal open: RoleEditDialog | modal-open | 58ms | 17ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 102 | modal close: RoleEditDialog | modal-close | 167ms | 22ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 103 | modal open: RoleAddDialog | modal-open | 58ms | 17ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 104 | modal close: RoleAddDialog | modal-close | 183ms | 22ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 105 | modal open: VoteEditorDialog | modal-open | 75ms | 17ms | p95 17ms, 1 slow | 1 (62ms worst) | — | 🟢 ok |
| 106 | modal close: VoteEditorDialog | modal-close | 182ms | 23ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 107 | modal open: VoteEnableDialog | modal-open | 58ms | 18ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 108 | modal close: VoteEnableDialog | modal-close | 167ms | 22ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 109 | modal open: ActionEditorDialog | modal-open | 75ms | 18ms | p95 17ms, 1 slow | 1 (65ms worst) | — | 🟢 ok |
| 110 | modal close: ActionEditorDialog | modal-close | 183ms | 29ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 111 | modal open: BioEditorDialog | modal-open | 109ms | 19ms | p95 17ms, 1 slow | 1 (97ms worst) | — | 🟢 ok |
| 112 | modal close: BioEditorDialog | modal-close | 183ms | 25ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 113 | modal open: TagCellEditor | modal-open | 109ms | 20ms | p95 17ms, 1 slow | 1 (93ms worst) | — | 🟢 ok |
| 114 | modal close: TagCellEditor | modal-close | 183ms | 27ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 115 | modal open: AddTagDialog | modal-open | 83ms | 22ms | p95 17ms, 1 slow | 1 (69ms worst) | — | 🟢 ok |
| 116 | modal close: AddTagDialog | modal-close | 182ms | 28ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 117 | modal open: AddTagDialog (edit mode + trigger script) | modal-open | 92ms | 22ms | p95 17ms, 1 slow | 1 (79ms worst) | — | 🟢 ok |
| 118 | modal close: AddTagDialog (edit mode + trigger script) | modal-close | 200ms | 32ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 119 | modal open: ChooseDayDialog | modal-open | 84ms | 25ms | p95 17ms, 1 slow | 1 (73ms worst) | — | 🟢 ok |
| 120 | modal close: ChooseDayDialog | modal-close | 183ms | 31ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 121 | modal open: DaySelectionDialog | modal-open | 75ms | 26ms | p95 17ms, 1 slow | 1 (63ms worst) | — | 🟢 ok |
| 122 | modal close: DaySelectionDialog | modal-close | 183ms | 30ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 123 | modal open: DaysPerGameDayDialog | modal-open | 75ms | 26ms | p95 17ms, 1 slow | 1 (63ms worst) | — | 🟢 ok |
| 124 | modal close: DaysPerGameDayDialog | modal-close | 183ms | 31ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 125 | modal open: DeleteRoleConfirmationDialog | modal-open | 75ms | 26ms | p95 17ms, 1 slow | 1 (65ms worst) | — | 🟢 ok |
| 126 | modal close: DeleteRoleConfirmationDialog | modal-close | 200ms | 32ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 127 | modal open: EditInfoDialog | modal-open | 83ms | 28ms | p95 17ms, 1 slow | 1 (70ms worst) | — | 🟢 ok |
| 128 | modal close: EditInfoDialog | modal-close | 200ms | 33ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 129 | modal open: JoinedGameOptionsDialog | modal-open | 108ms | 27ms | p95 17ms, 1 slow | 1 (97ms worst) | — | 🟢 ok |
| 130 | modal close: JoinedGameOptionsDialog | modal-close | 183ms | 31ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 131 | modal open: ArchivedGamesDialog | modal-open | 108ms | 27ms | p95 17ms, 1 slow | 1 (93ms worst) | — | 🟢 ok |
| 132 | modal close: ArchivedGamesDialog | modal-close | 183ms | 32ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 133 | modal open: MarkdownInputBuilderDialog | modal-open | 92ms | 28ms | p95 17ms, 1 slow | 1 (75ms worst) | — | 🟢 ok |
| 134 | modal close: MarkdownInputBuilderDialog | modal-close | 199ms | 35ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 135 | modal open: MarkdownVariableDialog | modal-open | 83ms | 28ms | p95 17ms, 1 slow | 1 (68ms worst) | — | 🟢 ok |
| 136 | modal close: MarkdownVariableDialog | modal-close | 182ms | 33ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 137 | modal open: NightlyCertificationDialog | modal-open | 125ms | 29ms | p95 17ms, 1 slow | 1 (115ms worst) | — | 🟢 ok |
| 138 | modal close: NightlyCertificationDialog | modal-close | 183ms | 37ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 139 | modal open: ScheduleTableUpdateDialog | modal-open | 109ms | 31ms | p95 17ms, 1 slow | 1 (94ms worst) | — | 🟢 ok |
| 140 | modal close: ScheduleTableUpdateDialog | modal-close | 182ms | 35ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 141 | modal open: ColumnActionsDialog | modal-open | 83ms | 31ms | p95 17ms, 1 slow | 1 (73ms worst) | — | 🟢 ok |
| 142 | modal close: ColumnActionsDialog | modal-close | 200ms | 36ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 143 | modal open: PhoneBookTocDialog | modal-open | 100ms | 31ms | p95 17ms, 1 slow | 1 (91ms worst) | — | 🟢 ok |
| 144 | modal close: PhoneBookTocDialog | modal-close | 183ms | 37ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 145 | modal open: TableOfContentsDialog (rulebook) | modal-open | 108ms | 32ms | p95 17ms, 1 slow | 1 (95ms worst) | — | 🟢 ok |
| 146 | modal close: TableOfContentsDialog (rulebook) | modal-close | 183ms | 39ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 147 | modal open: ImportDraftDialog | modal-open | 134ms | 33ms | p95 17ms, 1 slow | 2 (77ms worst) | — | 🟢 ok |
| 148 | modal close: ImportDraftDialog | modal-close | 192ms | 42ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 149 | modal open: NewspaperSectionOptionsDialog | modal-open | 108ms | 33ms | p95 17ms, 1 slow | 1 (97ms worst) | — | 🟢 ok |
| 150 | modal close: NewspaperSectionOptionsDialog | modal-close | 199ms | 38ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 151 | modal open: PlayerPreviewModal | modal-open | 167ms | 35ms | p95 17ms, 1 slow | 1 (152ms worst) | — | 🟡 meh |
| 152 | modal close: PlayerPreviewModal | modal-close | 183ms | 28ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 153 | modal open: TownSquareImageDialog | modal-open | 100ms | 35ms | p95 17ms, 1 slow | 1 (84ms worst) | — | 🟢 ok |
| 154 | modal close: TownSquareImageDialog | modal-close | 191ms | 41ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 155 | modal open: TownSquareLinkDialog | modal-open | 92ms | 33ms | p95 17ms, 1 slow | 1 (82ms worst) | — | 🟢 ok |
| 156 | modal close: TownSquareLinkDialog | modal-close | 183ms | 39ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 157 | modal open: TownSquareMoreOptionsDialog | modal-open | 92ms | 34ms | p95 17ms, 1 slow | 1 (79ms worst) | — | 🟢 ok |
| 158 | modal close: TownSquareMoreOptionsDialog | modal-close | 197ms | 41ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 159 | modal open: ConfirmDialog | modal-open | 92ms | 36ms | p95 17ms, 1 slow | 1 (82ms worst) | — | 🟢 ok |
| 160 | modal close: ConfirmDialog | modal-close | 200ms | 41ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 161 | modal open: ImageUploadDialog | modal-open | 109ms | 35ms | p95 19ms, 1 slow | 1 (87ms worst) | — | 🟢 ok |
| 162 | modal close: ImageUploadDialog | modal-close | 208ms | 43ms | p95 25ms, 0 slow | 0 | — | 🟢 ok |
| 163 | modal open: SaveHistoryDialog | modal-open | 100ms | 35ms | p95 17ms, 1 slow | 1 (86ms worst) | — | 🟢 ok |
| 164 | modal close: SaveHistoryDialog | modal-close | 200ms | 41ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 165 | modal open: UnsavedChangesDialog | modal-open | 100ms | 37ms | p95 17ms, 1 slow | 1 (83ms worst) | — | 🟢 ok |
| 166 | modal close: UnsavedChangesDialog | modal-close | 192ms | 42ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 167 | modal open: ViewOnlyPreviewModal | modal-open | 100ms | 36ms | p95 17ms, 1 slow | 1 (83ms worst) | — | 🟢 ok |
| 168 | modal close: ViewOnlyPreviewModal | modal-close | 192ms | 41ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 169 | modal open: DeleteGameConfirmationDialog | modal-open | 100ms | 36ms | p95 17ms, 1 slow | 1 (87ms worst) | — | 🟢 ok |
| 170 | modal close: DeleteGameConfirmationDialog | modal-close | 192ms | 43ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 171 | Tour complete | note | 0ms | — | — | 0 | — | 🟢 ok |

## Slowest steps

- **8007ms** — tab → newser:ruleBook (cold mount) (longTasks 1/113ms, p95 frame 17ms)
- **7985ms** — navigate: config → phone book subpage (longTasks 1/213ms, p95 frame 17ms)
- **7903ms** — navigate: config → rule book subpage (longTasks 1/231ms, p95 frame 17ms)
- **7840ms** — tab → player:phoneBook (cold mount) (longTasks 2/232ms, p95 frame 17ms)
- **7824ms** — tab → player:ruleBook (cold mount) (longTasks 1/160ms, p95 frame 17ms)
- **7822ms** — tab → newser:phoneBook (cold mount) (longTasks 1/211ms, p95 frame 17ms)
- **4208ms** — open game: SIMOP1234 (as operator) (longTasks 16/215ms, p95 frame 117ms)
- **3051ms** — scroll: operator rulebook (scroll-linked TOC) (longTasks 0/0ms, p95 frame 17ms)
- **2834ms** — scroll: player rulebook (scroll-linked) (longTasks 0/0ms, p95 frame 17ms)
- **2350ms** — scroll: operator phone book (longTasks 0/0ms, p95 frame 17ms)

## Detail log

### — Perf audit tour starting
> UA: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/146.0.0.0 Safari/537.36

### — Phase A — game list

### scroll: game list
- kind: `scroll` · measured at +1707ms into run
- **settle**: 3ms · **first DOM change**: 3ms · **window**: 3ms
- 
- queries subscribed during window: 0 · active data subs after: 18 · dom mutations: 1 · heap: 59MB

### action: New WolffsPoint dialog open
- kind: `modal-open` · measured at +1711ms into run
- **settle**: 56ms · **first DOM change**: 23ms · **window**: 565ms
- frames 33 · avg 17.1ms · p95 17ms · worst 33ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 18 · dom mutations: 30 · heap: 62MB
- react commits by boundary (worst first):
  - `screen:allGames`: 1 commits, total 0ms, worst 0ms
  - `app-root`: 1 commits, total 0ms, worst 0ms

### modal close: New WolffsPoint
- kind: `modal-close` · measured at +2276ms into run
- **settle**: 167ms · **first DOM change**: 9ms · **window**: 433ms
- frames 26 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 18 · dom mutations: 27 · heap: 63MB
- react commits by boundary (worst first):
  - `screen:allGames`: 1 commits, total 0ms, worst 0ms
  - `app-root`: 1 commits, total 0ms, worst 0ms

### — Phase B — operator game
> current user owns SIMOP1234

### open game: SIMOP1234 (as operator)
- kind: `navigate` · measured at +2709ms into run
- **settle**: 4208ms · **first DOM change**: 3ms · **window**: 5177ms
- frames 189 · avg 27.3ms · p95 117ms · worst 233ms · >50ms: 16
- long tasks: 16 (total 1834ms, worst 215ms)
- backend writes this window: user_vars:set 0.1ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms
- queries subscribed during window: 528 · active data subs after: 285 · dom mutations: 1733 · heap: 263MB
- react commits by boundary (worst first):
  - `app-root`: 527 commits, total 1799ms, worst 147ms
  - `screen:game`: 515 commits, total 1757ms, worst 147ms
  - `game-body`: 509 commits, total 1748ms, worst 147ms
  - `op-tabs`: 507 commits, total 1745ms, worst 147ms
  - `screen:allGames`: 7 commits, total 20ms, worst 5ms

### tab → op:config (cold mount)
- kind: `tab` · measured at +7887ms into run
- **settle**: 673ms · **first DOM change**: 363ms · **window**: 1239ms
- frames 39 · avg 31.8ms · p95 133ms · worst 358ms · >50ms: 4
- long tasks: 2 (total 452ms, worst 363ms)
- backend writes this window: user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms
- queries subscribed during window: 93 · active data subs after: 331 · dom mutations: 261 · heap: 335MB
- react commits by boundary (worst first):
  - `app-root`: 141 commits, total 486ms, worst 209ms
  - `screen:game`: 141 commits, total 484ms, worst 209ms
  - `game-body`: 141 commits, total 483ms, worst 209ms
  - `op-tabs`: 141 commits, total 482ms, worst 207ms

### tab → op:nightly (cold mount)
- kind: `tab` · measured at +9126ms into run
- **settle**: 1642ms · **first DOM change**: 492ms · **window**: 2208ms
- frames 68 · avg 32.5ms · p95 108ms · worst 475ms · >50ms: 5
- long tasks: 4 (total 964ms, worst 493ms)
- backend writes this window: user_lists:set 0.0ms, user_lists:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms
- queries subscribed during window: 52 · active data subs after: 357 · dom mutations: 802 · heap: 277MB
- react commits by boundary (worst first):
  - `app-root`: 88 commits, total 918ms, worst 212ms
  - `screen:game`: 88 commits, total 916ms, worst 212ms
  - `game-body`: 88 commits, total 916ms, worst 212ms
  - `op-tabs`: 88 commits, total 915ms, worst 211ms

### tab → op:forum (cold mount)
- kind: `tab` · measured at +11334ms into run
- **settle**: 616ms · **first DOM change**: 162ms · **window**: 1167ms
- frames 49 · avg 23.8ms · p95 50ms · worst 175ms · >50ms: 2
- long tasks: 2 (total 322ms, worst 162ms)
- backend writes this window: user_vars:set 0.0ms, user_vars:set 0.1ms
- queries subscribed during window: 83 · active data subs after: 437 · dom mutations: 779 · heap: 307MB
- react commits by boundary (worst first):
  - `app-root`: 97 commits, total 339ms, worst 131ms
  - `screen:game`: 97 commits, total 338ms, worst 131ms
  - `game-body`: 97 commits, total 337ms, worst 131ms
  - `op-tabs`: 97 commits, total 336ms, worst 130ms

### tab → op:newspaper (cold mount)
- kind: `tab` · measured at +12502ms into run
- **settle**: 665ms · **first DOM change**: 141ms · **window**: 775ms
- frames 37 · avg 20.7ms · p95 58ms · worst 125ms · >50ms: 2
- long tasks: 2 (total 202ms, worst 141ms)
- backend writes this window: user_vars:set 0.0ms
- queries subscribed during window: 14 · active data subs after: 450 · dom mutations: 204 · heap: 341MB
- react commits by boundary (worst first):
  - `app-root`: 27 commits, total 180ms, worst 121ms
  - `game-body`: 27 commits, total 179ms, worst 121ms
  - `screen:game`: 27 commits, total 179ms, worst 121ms
  - `op-tabs`: 27 commits, total 178ms, worst 120ms

### tab → op:rulebook (cold mount)
- kind: `tab` · measured at +13277ms into run
- **settle**: 748ms · **first DOM change**: 80ms · **window**: 948ms
- frames 54 · avg 17.6ms · p95 17ms · worst 75ms · >50ms: 1
- long tasks: 1 (total 80ms, worst 80ms)
- queries subscribed during window: 9 · active data subs after: 455 · dom mutations: 173 · heap: 341MB
- react commits by boundary (worst first):
  - `app-root`: 16 commits, total 67ms, worst 50ms
  - `screen:game`: 16 commits, total 66ms, worst 50ms
  - `game-body`: 16 commits, total 66ms, worst 50ms
  - `op-tabs`: 16 commits, total 66ms, worst 50ms

### tab → op:players (warm revisit)
- kind: `tab` · measured at +14226ms into run
- **settle**: 216ms · **first DOM change**: 134ms · **window**: 408ms
- frames 15 · avg 27.2ms · p95 125ms · worst 125ms · >50ms: 2
- long tasks: 2 (total 201ms, worst 134ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 12 · heap: 364MB
- react commits by boundary (worst first):
  - `game-body`: 4 commits, total 174ms, worst 120ms
  - `screen:game`: 4 commits, total 174ms, worst 120ms
  - `app-root`: 4 commits, total 174ms, worst 120ms
  - `op-tabs`: 4 commits, total 172ms, worst 118ms

### tab → op:config (warm revisit)
- kind: `tab` · measured at +14634ms into run
- **settle**: 113ms · **first DOM change**: 38ms · **window**: 308ms
- frames 15 · avg 20.5ms · p95 50ms · worst 50ms · >50ms: 0
- long tasks: 1 (total 66ms, worst 66ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 12 · heap: 373MB
- react commits by boundary (worst first):
  - `app-root`: 4 commits, total 82ms, worst 54ms
  - `game-body`: 4 commits, total 82ms, worst 54ms
  - `screen:game`: 4 commits, total 82ms, worst 54ms
  - `op-tabs`: 4 commits, total 82ms, worst 54ms

### tab → op:nightly (warm revisit)
- kind: `tab` · measured at +14943ms into run
- **settle**: 82ms · **first DOM change**: 37ms · **window**: 316ms
- frames 17 · avg 18.6ms · p95 41ms · worst 41ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 12 · heap: 388MB
- react commits by boundary (worst first):
  - `app-root`: 4 commits, total 58ms, worst 31ms
  - `game-body`: 4 commits, total 58ms, worst 30ms
  - `screen:game`: 4 commits, total 58ms, worst 30ms
  - `op-tabs`: 4 commits, total 58ms, worst 30ms

### tab → op:forum (warm revisit)
- kind: `tab` · measured at +15259ms into run
- **settle**: 178ms · **first DOM change**: 132ms · **window**: 375ms
- frames 14 · avg 26.7ms · p95 133ms · worst 133ms · >50ms: 1
- long tasks: 1 (total 140ms, worst 140ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 12 · heap: 400MB
- react commits by boundary (worst first):
  - `app-root`: 4 commits, total 155ms, worst 122ms
  - `game-body`: 4 commits, total 155ms, worst 122ms
  - `screen:game`: 4 commits, total 155ms, worst 122ms
  - `op-tabs`: 4 commits, total 153ms, worst 120ms

### tab → op:newspaper (warm revisit)
- kind: `tab` · measured at +15634ms into run
- **settle**: 708ms · **first DOM change**: 38ms · **window**: 891ms
- frames 52 · avg 17.1ms · p95 17ms · worst 41ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 91 · heap: 416MB
- react commits by boundary (worst first):
  - `app-root`: 3 commits, total 29ms, worst 28ms
  - `game-body`: 3 commits, total 28ms, worst 28ms
  - `screen:game`: 3 commits, total 28ms, worst 28ms
  - `op-tabs`: 3 commits, total 28ms, worst 27ms

### tab → op:rulebook (warm revisit)
- kind: `tab` · measured at +16526ms into run
- **settle**: 450ms · **first DOM change**: 132ms · **window**: 633ms
- frames 31 · avg 20.4ms · p95 17ms · worst 132ms · >50ms: 1
- long tasks: 1 (total 136ms, worst 136ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 48 · heap: 413MB
- react commits by boundary (worst first):
  - `app-root`: 3 commits, total 123ms, worst 122ms
  - `screen:game`: 3 commits, total 123ms, worst 122ms
  - `game-body`: 3 commits, total 123ms, worst 122ms
  - `op-tabs`: 3 commits, total 121ms, worst 121ms

### tab → op:players (warm revisit)
- kind: `tab` · measured at +17159ms into run
- **settle**: 166ms · **first DOM change**: 44ms · **window**: 350ms
- frames 17 · avg 20.5ms · p95 50ms · worst 50ms · >50ms: 0
- long tasks: 2 (total 120ms, worst 67ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 14 · heap: 440MB
- react commits by boundary (worst first):
  - `game-body`: 4 commits, total 87ms, worst 54ms
  - `screen:game`: 4 commits, total 87ms, worst 54ms
  - `app-root`: 4 commits, total 87ms, worst 54ms
  - `op-tabs`: 4 commits, total 86ms, worst 54ms

### rapid tab cycle (all 6 operator tabs)
- kind: `action` · measured at +17509ms into run
- **settle**: 1383ms · **first DOM change**: 1ms · **window**: 1766ms
- frames 85 · avg 20.8ms · p95 42ms · worst 133ms · >50ms: 3
- long tasks: 2 (total 199ms, worst 134ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 108 · heap: 483MB
- react commits by boundary (worst first):
  - `app-root`: 16 commits, total 387ms, worst 124ms
  - `screen:game`: 16 commits, total 387ms, worst 124ms
  - `game-body`: 16 commits, total 386ms, worst 124ms
  - `op-tabs`: 16 commits, total 383ms, worst 123ms

### tab → op:players (warm revisit)
- kind: `tab` · measured at +19276ms into run
- **settle**: 203ms · **first DOM change**: 130ms · **window**: 400ms
- frames 16 · avg 25.0ms · p95 117ms · worst 117ms · >50ms: 1
- long tasks: 2 (total 194ms, worst 130ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 12 · heap: 506MB
- react commits by boundary (worst first):
  - `app-root`: 4 commits, total 173ms, worst 121ms
  - `game-body`: 4 commits, total 173ms, worst 121ms
  - `screen:game`: 4 commits, total 173ms, worst 121ms
  - `op-tabs`: 4 commits, total 172ms, worst 119ms

### scroll: operator players table (vertical)
- kind: `scroll` · measured at +19676ms into run
- **settle**: 20ms · **first DOM change**: 20ms · **window**: 322ms
- frames 19 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 1 · heap: 507MB

### scroll: players table horizontal
- kind: `scroll` · measured at +19998ms into run
- **settle**: 15ms · **first DOM change**: 15ms · **window**: 1228ms
- frames 74 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 1 · heap: 508MB

### tab → op:nightly (warm revisit)
- kind: `tab` · measured at +21226ms into run
- **settle**: 249ms · **first DOM change**: 132ms · **window**: 433ms
- frames 14 · avg 30.9ms · p95 133ms · worst 133ms · >50ms: 2
- long tasks: 2 (total 247ms, worst 141ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 13 · heap: 531MB
- react commits by boundary (worst first):
  - `app-root`: 5 commits, total 209ms, worst 123ms
  - `screen:game`: 5 commits, total 209ms, worst 122ms
  - `game-body`: 5 commits, total 209ms, worst 122ms
  - `op-tabs`: 5 commits, total 207ms, worst 121ms

### scroll: operator nightly
- kind: `scroll` · measured at +21659ms into run
- **settle**: 367ms · **first DOM change**: 17ms · **window**: 2433ms
- frames 146 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 20 · heap: 534MB
- react commits by boundary (worst first):
  - `op-tabs`: 7 commits, total 4ms, worst 2ms
  - `game-body`: 7 commits, total 4ms, worst 2ms
  - `screen:game`: 7 commits, total 4ms, worst 2ms
  - `app-root`: 7 commits, total 4ms, worst 2ms

### modal open: Review/Certify (nightly)
- kind: `modal-open` · measured at +24092ms into run
- **settle**: 342ms · **first DOM change**: 327ms · **window**: 908ms
- frames 36 · avg 25.2ms · p95 17ms · worst 325ms · >50ms: 1
- long tasks: 1 (total 329ms, worst 329ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 610 · heap: 552MB
- react commits by boundary (worst first):
  - `app-root`: 5 commits, total 123ms, worst 119ms
  - `op-tabs`: 5 commits, total 123ms, worst 119ms
  - `game-body`: 5 commits, total 123ms, worst 119ms
  - `screen:game`: 5 commits, total 123ms, worst 119ms

### modal close: Review/Certify
- kind: `modal-close` · measured at +25001ms into run
- **settle**: 243ms · **first DOM change**: 91ms · **window**: 508ms
- frames 27 · avg 18.8ms · p95 17ms · worst 75ms · >50ms: 1
- long tasks: 1 (total 91ms, worst 91ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 29 · heap: 553MB
- react commits by boundary (worst first):
  - `app-root`: 4 commits, total 66ms, worst 64ms
  - `screen:game`: 4 commits, total 66ms, worst 64ms
  - `op-tabs`: 4 commits, total 66ms, worst 64ms
  - `game-body`: 4 commits, total 66ms, worst 64ms

### tab → op:forum (warm revisit)
- kind: `tab` · measured at +25509ms into run
- **settle**: 173ms · **first DOM change**: 133ms · **window**: 358ms
- frames 14 · avg 25.6ms · p95 133ms · worst 133ms · >50ms: 1
- long tasks: 1 (total 140ms, worst 140ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 12 · heap: 568MB
- react commits by boundary (worst first):
  - `game-body`: 4 commits, total 151ms, worst 123ms
  - `screen:game`: 4 commits, total 151ms, worst 123ms
  - `app-root`: 4 commits, total 151ms, worst 123ms
  - `op-tabs`: 4 commits, total 149ms, worst 121ms

### scroll: town square thread list
- kind: `scroll` · measured at +25868ms into run
- **settle**: 21ms · **first DOM change**: 21ms · **window**: 2350ms
- frames 141 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 1 · heap: 571MB
- react commits by boundary (worst first):
  - `app-root`: 6 commits, total 5ms, worst 2ms
  - `screen:game`: 6 commits, total 5ms, worst 2ms
  - `op-tabs`: 6 commits, total 5ms, worst 2ms
  - `game-body`: 6 commits, total 5ms, worst 2ms

### navigate: thread list → thread detail
- kind: `navigate` · measured at +28218ms into run
- **settle**: 575ms · **first DOM change**: 3ms · **window**: 1141ms
- frames 50 · avg 22.8ms · p95 17ms · worst 291ms · >50ms: 1
- long tasks: 1 (total 297ms, worst 297ms)
- backend writes this window: user_vars:set 0.0ms, user_vars:set 0.0ms
- queries subscribed during window: 2 · active data subs after: 456 · dom mutations: 775 · heap: 189MB
- react commits by boundary (worst first):
  - `app-root`: 17 commits, total 268ms, worst 148ms
  - `screen:game`: 17 commits, total 268ms, worst 148ms
  - `op-tabs`: 17 commits, total 268ms, worst 148ms
  - `game-body`: 17 commits, total 268ms, worst 148ms

### scroll: thread detail comments
- kind: `scroll` · measured at +29359ms into run
- **settle**: 20ms · **first DOM change**: 20ms · **window**: 2450ms
- frames 147 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 456 · dom mutations: 1 · heap: 191MB
- react commits by boundary (worst first):
  - `app-root`: 2 commits, total 2ms, worst 2ms
  - `screen:game`: 2 commits, total 2ms, worst 2ms
  - `op-tabs`: 2 commits, total 2ms, worst 2ms
  - `game-body`: 2 commits, total 2ms, worst 2ms

### navigate: thread detail → thread list
- kind: `navigate` · measured at +31809ms into run
- **settle**: 650ms · **first DOM change**: 13ms · **window**: 1166ms
- frames 56 · avg 20.8ms · p95 17ms · worst 250ms · >50ms: 1
- long tasks: 1 (total 255ms, worst 255ms)
- queries subscribed during window: 0 · active data subs after: 456 · dom mutations: 662 · heap: 208MB
- react commits by boundary (worst first):
  - `op-tabs`: 8 commits, total 237ms, worst 136ms
  - `game-body`: 8 commits, total 237ms, worst 136ms
  - `screen:game`: 8 commits, total 237ms, worst 136ms
  - `app-root`: 8 commits, total 237ms, worst 136ms

### navigate: open second thread (warm)
- kind: `navigate` · measured at +32976ms into run
- **settle**: 450ms · **first DOM change**: 35ms · **window**: 967ms
- frames 55 · avg 17.6ms · p95 17ms · worst 50ms · >50ms: 0
- long tasks: 1 (total 59ms, worst 59ms)
- backend writes this window: user_vars:set 0.1ms, user_vars:set 0.0ms
- queries subscribed during window: 2 · active data subs after: 457 · dom mutations: 150 · heap: 227MB
- react commits by boundary (worst first):
  - `app-root`: 14 commits, total 95ms, worst 21ms
  - `screen:game`: 14 commits, total 95ms, worst 21ms
  - `op-tabs`: 14 commits, total 94ms, worst 21ms
  - `game-body`: 14 commits, total 94ms, worst 21ms

### navigate: back to thread list (warm)
- kind: `navigate` · measured at +33943ms into run
- **settle**: 657ms · **first DOM change**: 12ms · **window**: 1125ms
- frames 53 · avg 21.2ms · p95 17ms · worst 258ms · >50ms: 1
- long tasks: 1 (total 266ms, worst 266ms)
- queries subscribed during window: 0 · active data subs after: 457 · dom mutations: 660 · heap: 200MB
- react commits by boundary (worst first):
  - `game-body`: 7 commits, total 249ms, worst 142ms
  - `screen:game`: 7 commits, total 249ms, worst 142ms
  - `app-root`: 7 commits, total 249ms, worst 142ms
  - `op-tabs`: 7 commits, total 248ms, worst 142ms

### modal open: New Thread composer
- kind: `modal-open` · measured at +35068ms into run
- **settle**: 57ms · **first DOM change**: 43ms · **window**: 624ms
- frames 37 · avg 16.9ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 457 · dom mutations: 38 · heap: 213MB
- react commits by boundary (worst first):
  - `app-root`: 4 commits, total 9ms, worst 8ms
  - `op-tabs`: 4 commits, total 9ms, worst 8ms
  - `game-body`: 4 commits, total 9ms, worst 8ms
  - `screen:game`: 4 commits, total 9ms, worst 8ms

### modal close: New Thread composer
- kind: `modal-close` · measured at +35692ms into run
- **settle**: 201ms · **first DOM change**: 24ms · **window**: 466ms
- frames 28 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 457 · dom mutations: 29 · heap: 224MB
- react commits by boundary (worst first):
  - `app-root`: 4 commits, total 14ms, worst 12ms
  - `game-body`: 4 commits, total 14ms, worst 12ms
  - `screen:game`: 4 commits, total 14ms, worst 12ms
  - `op-tabs`: 4 commits, total 14ms, worst 12ms

### tab → op:newspaper (warm revisit)
- kind: `tab` · measured at +36159ms into run
- **settle**: 783ms · **first DOM change**: 115ms · **window**: 966ms
- frames 52 · avg 18.6ms · p95 17ms · worst 116ms · >50ms: 1
- long tasks: 1 (total 119ms, worst 119ms)
- queries subscribed during window: 0 · active data subs after: 457 · dom mutations: 92 · heap: 216MB
- react commits by boundary (worst first):
  - `screen:game`: 3 commits, total 107ms, worst 106ms
  - `app-root`: 3 commits, total 107ms, worst 106ms
  - `game-body`: 3 commits, total 107ms, worst 106ms
  - `op-tabs`: 3 commits, total 105ms, worst 104ms

### scroll: operator newspaper
- kind: `scroll` · measured at +37126ms into run
- **settle**: 20ms · **first DOM change**: 20ms · **window**: 2738ms
- frames 164 · avg 16.7ms · p95 17ms · worst 21ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 457 · dom mutations: 1 · heap: 220MB
- react commits by boundary (worst first):
  - `app-root`: 7 commits, total 6ms, worst 2ms
  - `game-body`: 7 commits, total 6ms, worst 2ms
  - `screen:game`: 7 commits, total 6ms, worst 2ms
  - `op-tabs`: 7 commits, total 6ms, worst 2ms

### tab → op:rulebook (warm revisit)
- kind: `tab` · measured at +39864ms into run
- **settle**: 441ms · **first DOM change**: 133ms · **window**: 624ms
- frames 30 · avg 20.8ms · p95 23ms · worst 132ms · >50ms: 1
- long tasks: 1 (total 137ms, worst 137ms)
- queries subscribed during window: 0 · active data subs after: 457 · dom mutations: 46 · heap: 232MB
- react commits by boundary (worst first):
  - `app-root`: 5 commits, total 129ms, worst 125ms
  - `game-body`: 5 commits, total 129ms, worst 125ms
  - `screen:game`: 5 commits, total 129ms, worst 125ms
  - `op-tabs`: 5 commits, total 127ms, worst 123ms

### scroll: operator config page
- kind: `scroll` · measured at +40488ms into run
- **settle**: 183ms · **first DOM change**: 20ms · **window**: 2350ms
- frames 141 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 457 · dom mutations: 3 · heap: 234MB
- react commits by boundary (worst first):
  - `screen:game`: 2 commits, total 2ms, worst 2ms
  - `app-root`: 2 commits, total 2ms, worst 2ms
  - `op-tabs`: 2 commits, total 2ms, worst 2ms
  - `game-body`: 2 commits, total 2ms, worst 2ms

### navigate: config → rule book subpage
- kind: `navigate` · measured at +42838ms into run
- **settle**: 7903ms · **first DOM change**: 2ms · **window**: 8016ms
- frames 469 · avg 17.1ms · p95 17ms · worst 217ms · >50ms: 1
- long tasks: 1 (total 231ms, worst 231ms)
- backend writes this window: user_vars:set 0.0ms, user_vars:set 0.0ms
- queries subscribed during window: 4 · active data subs after: 459 · dom mutations: 678 · heap: 212MB
- react commits by boundary (worst first):
  - `app-root`: 16 commits, total 222ms, worst 120ms
  - `op-tabs`: 16 commits, total 221ms, worst 120ms
  - `game-body`: 16 commits, total 221ms, worst 120ms
  - `screen:game`: 16 commits, total 221ms, worst 120ms
- notes: (settle timeout 8000ms)

### scroll: operator rulebook (scroll-linked TOC)
- kind: `scroll` · measured at +50855ms into run
- **settle**: 3051ms · **first DOM change**: 23ms · **window**: 3051ms
- frames 183 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 459 · dom mutations: 355 · heap: 213MB
- react commits by boundary (worst first):
  - `screen:game`: 6 commits, total 6ms, worst 2ms
  - `app-root`: 6 commits, total 6ms, worst 2ms
  - `op-tabs`: 6 commits, total 6ms, worst 2ms
  - `game-body`: 6 commits, total 6ms, worst 2ms

### modal open: rulebook table of contents
- kind: `modal-open` · measured at +53906ms into run
- **settle**: 49ms · **first DOM change**: 2ms · **window**: 616ms
- frames 36 · avg 17.1ms · p95 17ms · worst 32ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 459 · dom mutations: 87 · heap: 215MB
- react commits by boundary (worst first):
  - `app-root`: 5 commits, total 5ms, worst 2ms
  - `screen:game`: 5 commits, total 5ms, worst 2ms
  - `op-tabs`: 5 commits, total 5ms, worst 2ms
  - `game-body`: 5 commits, total 5ms, worst 2ms

### modal close: rulebook TOC
- kind: `modal-close` · measured at +54521ms into run
- **settle**: 167ms · **first DOM change**: 12ms · **window**: 417ms
- frames 25 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 459 · dom mutations: 32 · heap: 217MB
- react commits by boundary (worst first):
  - `op-tabs`: 2 commits, total 3ms, worst 2ms
  - `game-body`: 2 commits, total 3ms, worst 2ms
  - `screen:game`: 2 commits, total 3ms, worst 2ms
  - `app-root`: 2 commits, total 3ms, worst 2ms

### navigate: rule book → config
- kind: `navigate` · measured at +54939ms into run
- **settle**: 466ms · **first DOM change**: 4ms · **window**: 983ms
- frames 56 · avg 17.5ms · p95 17ms · worst 67ms · >50ms: 1
- long tasks: 1 (total 85ms, worst 85ms)
- queries subscribed during window: 0 · active data subs after: 459 · dom mutations: 153 · heap: 208MB
- react commits by boundary (worst first):
  - `app-root`: 8 commits, total 69ms, worst 46ms
  - `screen:game`: 8 commits, total 69ms, worst 46ms
  - `op-tabs`: 8 commits, total 69ms, worst 46ms
  - `game-body`: 8 commits, total 69ms, worst 46ms

### navigate: config → phone book subpage
- kind: `navigate` · measured at +55923ms into run
- **settle**: 7985ms · **first DOM change**: 3ms · **window**: 8007ms
- frames 469 · avg 17.1ms · p95 17ms · worst 208ms · >50ms: 1
- long tasks: 1 (total 213ms, worst 213ms)
- queries subscribed during window: 25 · active data subs after: 484 · dom mutations: 857 · heap: 231MB
- react commits by boundary (worst first):
  - `app-root`: 16 commits, total 204ms, worst 64ms
  - `op-tabs`: 16 commits, total 204ms, worst 64ms
  - `game-body`: 16 commits, total 204ms, worst 64ms
  - `screen:game`: 16 commits, total 204ms, worst 64ms
- notes: (settle timeout 8000ms)

### scroll: operator phone book
- kind: `scroll` · measured at +63930ms into run
- **settle**: 2350ms · **first DOM change**: 21ms · **window**: 2351ms
- frames 141 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 484 · dom mutations: 131 · heap: 233MB
- react commits by boundary (worst first):
  - `op-tabs`: 2 commits, total 2ms, worst 2ms
  - `game-body`: 2 commits, total 2ms, worst 2ms
  - `screen:game`: 2 commits, total 2ms, worst 2ms
  - `app-root`: 2 commits, total 2ms, worst 2ms

### navigate: phone book → config
- kind: `navigate` · measured at +66281ms into run
- **settle**: 457ms · **first DOM change**: 4ms · **window**: 974ms
- frames 55 · avg 17.7ms · p95 17ms · worst 75ms · >50ms: 1
- long tasks: 1 (total 78ms, worst 78ms)
- queries subscribed during window: 0 · active data subs after: 484 · dom mutations: 156 · heap: 243MB
- react commits by boundary (worst first):
  - `app-root`: 9 commits, total 59ms, worst 40ms
  - `screen:game`: 9 commits, total 59ms, worst 40ms
  - `op-tabs`: 9 commits, total 59ms, worst 40ms
  - `game-body`: 9 commits, total 59ms, worst 40ms

### tab → op:config (warm revisit)
- kind: `tab` · measured at +67255ms into run
- **settle**: 117ms · **first DOM change**: 117ms · **window**: 316ms
- frames 14 · avg 22.6ms · p95 101ms · worst 101ms · >50ms: 1
- long tasks: 1 (total 117ms, worst 117ms)
- queries subscribed during window: 0 · active data subs after: 484 · dom mutations: 11 · heap: 248MB
- react commits by boundary (worst first):
  - `app-root`: 4 commits, total 104ms, worst 103ms
  - `screen:game`: 4 commits, total 104ms, worst 103ms
  - `game-body`: 4 commits, total 104ms, worst 103ms
  - `op-tabs`: 4 commits, total 102ms, worst 102ms

### scroll: operator roles table
- kind: `scroll` · measured at +67571ms into run
- **settle**: 18ms · **first DOM change**: 18ms · **window**: 2433ms
- frames 146 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 484 · dom mutations: 1 · heap: 251MB
- react commits by boundary (worst first):
  - `op-tabs`: 3 commits, total 4ms, worst 2ms
  - `game-body`: 3 commits, total 4ms, worst 2ms
  - `screen:game`: 3 commits, total 4ms, worst 2ms
  - `app-root`: 3 commits, total 4ms, worst 2ms

### navigate → game list
- kind: `navigate` · measured at +70005ms into run
- **settle**: 650ms · **first DOM change**: 2ms · **window**: 1400ms
- frames 76 · avg 18.4ms · p95 17ms · worst 150ms · >50ms: 1
- long tasks: 1 (total 167ms, worst 167ms)
- backend writes this window: user_vars:set 0.0ms
- queries subscribed during window: 0 · active data subs after: 484 · dom mutations: 269 · heap: 165MB
- react commits by boundary (worst first):
  - `app-root`: 9 commits, total 25ms, worst 13ms
  - `screen:allGames`: 3 commits, total 19ms, worst 13ms
  - `op-tabs`: 3 commits, total 1ms, worst 0ms
  - `game-body`: 3 commits, total 1ms, worst 0ms
  - `screen:game`: 3 commits, total 1ms, worst 0ms

### — Phase C — player game
> current user is a player in SIMPLY567

### open game: SIMPLY567 (as player)
- kind: `navigate` · measured at +71405ms into run
- **settle**: 2250ms · **first DOM change**: 2ms · **window**: 3217ms
- frames 178 · avg 18.1ms · p95 17ms · worst 183ms · >50ms: 2
- long tasks: 2 (total 246ms, worst 166ms)
- backend writes this window: user_vars:set 0.1ms, user_lists:set 0.2ms, user_lists:set 0.1ms, user_lists:set 0.0ms, user_lists:set 0.0ms, user_lists:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_lists:set 0.0ms, user_lists:set 0.1ms, user_lists:set 0.0ms, user_lists:set 0.0ms, user_lists:set 0.0ms, user_vars:set 0.0ms
- queries subscribed during window: 67 · active data subs after: 534 · dom mutations: 1772 · heap: 186MB
- react commits by boundary (worst first):
  - `app-root`: 104 commits, total 271ms, worst 82ms
  - `screen:game`: 94 commits, total 247ms, worst 81ms
  - `game-body`: 87 commits, total 242ms, worst 81ms
  - `player-tabs`: 60 commits, total 227ms, worst 81ms
  - `screen:allGames`: 5 commits, total 15ms, worst 4ms

### tab → player:newspaper (cold mount)
- kind: `tab` · measured at +74622ms into run
- **settle**: 326ms · **first DOM change**: 20ms · **window**: 892ms
- frames 47 · avg 18.6ms · p95 17ms · worst 108ms · >50ms: 1
- long tasks: 1 (total 103ms, worst 103ms)
- backend writes this window: user_vars:set 0.1ms
- queries subscribed during window: 11 · active data subs after: 544 · dom mutations: 204 · heap: 206MB
- react commits by boundary (worst first):
  - `app-root`: 31 commits, total 111ms, worst 53ms
  - `screen:game`: 31 commits, total 111ms, worst 53ms
  - `game-body`: 31 commits, total 111ms, worst 53ms
  - `player-tabs`: 31 commits, total 109ms, worst 53ms

### tab → player:eyesOnly (cold mount)
- kind: `tab` · measured at +75514ms into run
- **settle**: 399ms · **first DOM change**: 47ms · **window**: 950ms
- frames 56 · avg 16.9ms · p95 17ms · worst 42ms · >50ms: 0
- backend writes this window: user_vars:set 0.0ms
- queries subscribed during window: 8 · active data subs after: 551 · dom mutations: 100 · heap: 215MB
- react commits by boundary (worst first):
  - `app-root`: 18 commits, total 59ms, worst 20ms
  - `screen:game`: 18 commits, total 59ms, worst 20ms
  - `game-body`: 18 commits, total 59ms, worst 20ms
  - `player-tabs`: 18 commits, total 57ms, worst 18ms

### tab → player:ruleBook (cold mount)
- kind: `tab` · measured at +76464ms into run
- **settle**: 7824ms · **first DOM change**: 35ms · **window**: 8015ms
- frames 470 · avg 17.1ms · p95 17ms · worst 200ms · >50ms: 1
- long tasks: 1 (total 160ms, worst 160ms)
- queries subscribed during window: 2 · active data subs after: 553 · dom mutations: 670 · heap: 97MB
- react commits by boundary (worst first):
  - `app-root`: 18 commits, total 263ms, worst 82ms
  - `screen:game`: 18 commits, total 263ms, worst 82ms
  - `game-body`: 18 commits, total 263ms, worst 82ms
  - `player-tabs`: 18 commits, total 261ms, worst 82ms
- notes: (settle timeout 8000ms)

### tab → player:phoneBook (cold mount)
- kind: `tab` · measured at +84480ms into run
- **settle**: 7840ms · **first DOM change**: 59ms · **window**: 8008ms
- frames 460 · avg 17.4ms · p95 17ms · worst 233ms · >50ms: 3
- long tasks: 2 (total 293ms, worst 232ms)
- queries subscribed during window: 29 · active data subs after: 578 · dom mutations: 1012 · heap: 119MB
- react commits by boundary (worst first):
  - `app-root`: 25 commits, total 334ms, worst 77ms
  - `screen:game`: 25 commits, total 333ms, worst 77ms
  - `game-body`: 25 commits, total 333ms, worst 77ms
  - `player-tabs`: 25 commits, total 332ms, worst 77ms
- notes: (settle timeout 8000ms)

### tab → player:newspaper (warm revisit)
- kind: `tab` · measured at +92488ms into run
- **settle**: 326ms · **first DOM change**: 21ms · **window**: 508ms
- frames 28 · avg 18.1ms · p95 17ms · worst 58ms · >50ms: 1
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 51 · heap: 125MB
- react commits by boundary (worst first):
  - `app-root`: 19 commits, total 36ms, worst 16ms
  - `screen:game`: 19 commits, total 36ms, worst 16ms
  - `game-body`: 19 commits, total 36ms, worst 16ms
  - `player-tabs`: 19 commits, total 35ms, worst 15ms

### tab → player:eyesOnly (warm revisit)
- kind: `tab` · measured at +92996ms into run
- **settle**: 23ms · **first DOM change**: 19ms · **window**: 317ms
- frames 19 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 16 · heap: 130MB
- react commits by boundary (worst first):
  - `game-body`: 3 commits, total 15ms, worst 15ms
  - `screen:game`: 3 commits, total 15ms, worst 15ms
  - `app-root`: 3 commits, total 15ms, worst 15ms
  - `player-tabs`: 3 commits, total 13ms, worst 13ms

### tab → player:ruleBook (warm revisit)
- kind: `tab` · measured at +93313ms into run
- **settle**: 375ms · **first DOM change**: 20ms · **window**: 558ms
- frames 33 · avg 16.9ms · p95 17ms · worst 24ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 19 · heap: 119MB
- react commits by boundary (worst first):
  - `app-root`: 4 commits, total 27ms, worst 15ms
  - `game-body`: 4 commits, total 27ms, worst 15ms
  - `screen:game`: 4 commits, total 27ms, worst 15ms
  - `player-tabs`: 4 commits, total 25ms, worst 14ms

### tab → player:phoneBook (warm revisit)
- kind: `tab` · measured at +93871ms into run
- **settle**: 1247ms · **first DOM change**: 18ms · **window**: 1442ms
- frames 79 · avg 18.2ms · p95 17ms · worst 142ms · >50ms: 1
- long tasks: 1 (total 156ms, worst 156ms)
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 604 · heap: 127MB
- react commits by boundary (worst first):
  - `app-root`: 8 commits, total 166ms, worst 83ms
  - `game-body`: 8 commits, total 166ms, worst 83ms
  - `screen:game`: 8 commits, total 166ms, worst 83ms
  - `player-tabs`: 8 commits, total 164ms, worst 83ms

### tab → player:townSquare (warm revisit)
- kind: `tab` · measured at +95313ms into run
- **settle**: 236ms · **first DOM change**: 21ms · **window**: 425ms
- frames 25 · avg 17.0ms · p95 17ms · worst 24ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 37 · heap: 99MB
- react commits by boundary (worst first):
  - `app-root`: 4 commits, total 28ms, worst 17ms
  - `screen:game`: 4 commits, total 28ms, worst 17ms
  - `game-body`: 4 commits, total 28ms, worst 17ms
  - `player-tabs`: 4 commits, total 27ms, worst 15ms

### tab → player:townSquare (warm revisit)
- kind: `tab` · measured at +95738ms into run
- **settle**: 2ms · **first DOM change**: 2ms · **window**: 316ms
- frames 19 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 1 · heap: 99MB

### scroll: player town square
- kind: `scroll` · measured at +96055ms into run
- **settle**: 1491ms · **first DOM change**: 7ms · **window**: 2233ms
- frames 134 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 10 · heap: 117MB
- react commits by boundary (worst first):
  - `screen:game`: 6 commits, total 35ms, worst 9ms
  - `app-root`: 6 commits, total 35ms, worst 9ms
  - `player-tabs`: 6 commits, total 34ms, worst 9ms
  - `game-body`: 6 commits, total 34ms, worst 9ms

### tab → player:newspaper (warm revisit)
- kind: `tab` · measured at +98288ms into run
- **settle**: 317ms · **first DOM change**: 17ms · **window**: 499ms
- frames 30 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 25 · heap: 103MB
- react commits by boundary (worst first):
  - `screen:game`: 17 commits, total 33ms, worst 14ms
  - `app-root`: 17 commits, total 33ms, worst 14ms
  - `game-body`: 17 commits, total 33ms, worst 14ms
  - `player-tabs`: 17 commits, total 31ms, worst 12ms

### scroll: player newspaper
- kind: `scroll` · measured at +98788ms into run
- **settle**: 1758ms · **first DOM change**: 8ms · **window**: 2633ms
- frames 158 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 3 · heap: 120MB
- react commits by boundary (worst first):
  - `app-root`: 6 commits, total 35ms, worst 9ms
  - `player-tabs`: 6 commits, total 35ms, worst 9ms
  - `game-body`: 6 commits, total 35ms, worst 9ms
  - `screen:game`: 6 commits, total 35ms, worst 9ms

### tab → player:eyesOnly (warm revisit)
- kind: `tab` · measured at +101421ms into run
- **settle**: 128ms · **first DOM change**: 18ms · **window**: 317ms
- frames 19 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 17 · heap: 108MB
- react commits by boundary (worst first):
  - `game-body`: 5 commits, total 25ms, worst 14ms
  - `screen:game`: 5 commits, total 25ms, worst 14ms
  - `app-root`: 5 commits, total 25ms, worst 14ms
  - `player-tabs`: 5 commits, total 23ms, worst 12ms

### scroll: player eyes only
- kind: `scroll` · measured at +101738ms into run
- **settle**: 1807ms · **first DOM change**: 7ms · **window**: 2333ms
- frames 140 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 3 · heap: 122MB
- react commits by boundary (worst first):
  - `app-root`: 5 commits, total 28ms, worst 9ms
  - `game-body`: 5 commits, total 28ms, worst 9ms
  - `screen:game`: 5 commits, total 28ms, worst 9ms
  - `player-tabs`: 5 commits, total 28ms, worst 9ms

### tab → player:ruleBook (warm revisit)
- kind: `tab` · measured at +104071ms into run
- **settle**: 216ms · **first DOM change**: 17ms · **window**: 400ms
- frames 24 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 18 · heap: 105MB
- react commits by boundary (worst first):
  - `game-body`: 2 commits, total 14ms, worst 14ms
  - `screen:game`: 2 commits, total 14ms, worst 14ms
  - `app-root`: 2 commits, total 14ms, worst 14ms
  - `player-tabs`: 2 commits, total 12ms, worst 12ms

### scroll: player rulebook (scroll-linked)
- kind: `scroll` · measured at +104471ms into run
- **settle**: 2834ms · **first DOM change**: 6ms · **window**: 2834ms
- frames 170 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 339 · heap: 120MB
- react commits by boundary (worst first):
  - `app-root`: 8 commits, total 34ms, worst 10ms
  - `player-tabs`: 8 commits, total 34ms, worst 10ms
  - `game-body`: 8 commits, total 34ms, worst 10ms
  - `screen:game`: 8 commits, total 34ms, worst 10ms

### tab → player:phoneBook (warm revisit)
- kind: `tab` · measured at +107305ms into run
- **settle**: 1414ms · **first DOM change**: 17ms · **window**: 1599ms
- frames 88 · avg 18.2ms · p95 17ms · worst 150ms · >50ms: 1
- long tasks: 1 (total 157ms, worst 157ms)
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 622 · heap: 116MB
- react commits by boundary (worst first):
  - `app-root`: 11 commits, total 180ms, worst 83ms
  - `screen:game`: 11 commits, total 180ms, worst 83ms
  - `game-body`: 11 commits, total 180ms, worst 83ms
  - `player-tabs`: 11 commits, total 178ms, worst 83ms

### scroll: player phone book
- kind: `scroll` · measured at +108904ms into run
- **settle**: 2334ms · **first DOM change**: 8ms · **window**: 2334ms
- frames 140 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 135 · heap: 128MB
- react commits by boundary (worst first):
  - `app-root`: 4 commits, total 26ms, worst 9ms
  - `player-tabs`: 4 commits, total 26ms, worst 9ms
  - `game-body`: 4 commits, total 26ms, worst 9ms
  - `screen:game`: 4 commits, total 26ms, worst 9ms

### navigate → game list
- kind: `navigate` · measured at +111239ms into run
- **settle**: 574ms · **first DOM change**: 2ms · **window**: 1325ms
- frames 76 · avg 17.4ms · p95 17ms · worst 67ms · >50ms: 1
- long tasks: 1 (total 71ms, worst 71ms)
- backend writes this window: user_vars:set 0.0ms
- queries subscribed during window: 3 · active data subs after: 581 · dom mutations: 179 · heap: 131MB
- react commits by boundary (worst first):
  - `app-root`: 13 commits, total 48ms, worst 13ms
  - `screen:allGames`: 3 commits, total 25ms, worst 13ms
  - `game-body`: 6 commits, total 18ms, worst 7ms
  - `screen:game`: 6 commits, total 18ms, worst 7ms
  - `player-tabs`: 4 commits, total 18ms, worst 7ms

### — Phase D — newser game
> current user is the newser of SIMNEWS9

### open game: SIMNEWS9 (as newser)
- kind: `navigate` · measured at +112564ms into run
- **settle**: 2282ms · **first DOM change**: 2ms · **window**: 3249ms
- frames 179 · avg 18.1ms · p95 17ms · worst 208ms · >50ms: 2
- long tasks: 2 (total 248ms, worst 167ms)
- backend writes this window: user_vars:set 0.0ms, user_lists:set 0.1ms, user_lists:set 0.0ms, user_lists:set 0.0ms, user_lists:set 0.0ms, user_lists:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms
- queries subscribed during window: 54 · active data subs after: 624 · dom mutations: 1769 · heap: 84MB
- react commits by boundary (worst first):
  - `app-root`: 89 commits, total 283ms, worst 82ms
  - `screen:game`: 78 commits, total 260ms, worst 82ms
  - `game-body`: 71 commits, total 255ms, worst 82ms
  - `newser-tabs`: 61 commits, total 244ms, worst 82ms
  - `screen:allGames`: 5 commits, total 15ms, worst 4ms

### tab → newser:newspaper (cold mount)
- kind: `tab` · measured at +115813ms into run
- **settle**: 226ms · **first DOM change**: 21ms · **window**: 783ms
- frames 41 · avg 19.1ms · p95 17ms · worst 67ms · >50ms: 2
- long tasks: 1 (total 62ms, worst 62ms)
- backend writes this window: user_vars:set 0.1ms, user_vars:set 0.0ms, user_lists:set 0.0ms
- queries subscribed during window: 19 · active data subs after: 638 · dom mutations: 68 · heap: 110MB
- react commits by boundary (worst first):
  - `app-root`: 33 commits, total 112ms, worst 27ms
  - `screen:game`: 33 commits, total 111ms, worst 27ms
  - `game-body`: 33 commits, total 111ms, worst 27ms
  - `newser-tabs`: 33 commits, total 110ms, worst 27ms

### tab → newser:ruleBook (cold mount)
- kind: `tab` · measured at +116596ms into run
- **settle**: 8007ms · **first DOM change**: 14ms · **window**: 8016ms
- frames 474 · avg 16.9ms · p95 17ms · worst 133ms · >50ms: 1
- long tasks: 1 (total 113ms, worst 113ms)
- queries subscribed during window: 2 · active data subs after: 640 · dom mutations: 732 · heap: 121MB
- react commits by boundary (worst first):
  - `app-root`: 10 commits, total 123ms, worst 54ms
  - `game-body`: 10 commits, total 123ms, worst 54ms
  - `screen:game`: 10 commits, total 123ms, worst 54ms
  - `newser-tabs`: 10 commits, total 122ms, worst 54ms
- notes: (settle timeout 8000ms)

### tab → newser:phoneBook (cold mount)
- kind: `tab` · measured at +124613ms into run
- **settle**: 7822ms · **first DOM change**: 41ms · **window**: 8016ms
- frames 466 · avg 17.2ms · p95 17ms · worst 208ms · >50ms: 1
- long tasks: 1 (total 211ms, worst 211ms)
- queries subscribed during window: 31 · active data subs after: 667 · dom mutations: 1022 · heap: 114MB
- react commits by boundary (worst first):
  - `app-root`: 22 commits, total 237ms, worst 63ms
  - `screen:game`: 22 commits, total 236ms, worst 63ms
  - `game-body`: 22 commits, total 236ms, worst 63ms
  - `newser-tabs`: 22 commits, total 235ms, worst 63ms
- notes: (settle timeout 8000ms)

### tab → newser:newspaper (warm revisit)
- kind: `tab` · measured at +132629ms into run
- **settle**: 683ms · **first DOM change**: 9ms · **window**: 866ms
- frames 51 · avg 17.0ms · p95 17ms · worst 33ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 667 · dom mutations: 154 · heap: 110MB
- react commits by boundary (worst first):
  - `game-body`: 2 commits, total 8ms, worst 6ms
  - `screen:game`: 2 commits, total 8ms, worst 6ms
  - `app-root`: 2 commits, total 8ms, worst 6ms
  - `newser-tabs`: 2 commits, total 7ms, worst 4ms

### tab → newser:ruleBook (warm revisit)
- kind: `tab` · measured at +133496ms into run
- **settle**: 707ms · **first DOM change**: 7ms · **window**: 900ms
- frames 54 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 667 · dom mutations: 96 · heap: 112MB
- react commits by boundary (worst first):
  - `app-root`: 3 commits, total 6ms, worst 4ms
  - `game-body`: 3 commits, total 6ms, worst 3ms
  - `screen:game`: 3 commits, total 6ms, worst 3ms
  - `newser-tabs`: 3 commits, total 5ms, worst 2ms

### tab → newser:phoneBook (warm revisit)
- kind: `tab` · measured at +134396ms into run
- **settle**: 1240ms · **first DOM change**: 6ms · **window**: 1433ms
- frames 78 · avg 18.4ms · p95 17ms · worst 150ms · >50ms: 1
- long tasks: 1 (total 159ms, worst 159ms)
- queries subscribed during window: 0 · active data subs after: 667 · dom mutations: 603 · heap: 103MB
- react commits by boundary (worst first):
  - `screen:game`: 8 commits, total 151ms, worst 83ms
  - `app-root`: 8 commits, total 151ms, worst 83ms
  - `game-body`: 8 commits, total 151ms, worst 83ms
  - `newser-tabs`: 8 commits, total 150ms, worst 83ms

### tab → newser:townSquare (warm revisit)
- kind: `tab` · measured at +135829ms into run
- **settle**: 19ms · **first DOM change**: 9ms · **window**: 316ms
- frames 19 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 667 · dom mutations: 36 · heap: 123MB
- react commits by boundary (worst first):
  - `app-root`: 2 commits, total 6ms, worst 6ms
  - `game-body`: 2 commits, total 6ms, worst 6ms
  - `screen:game`: 2 commits, total 6ms, worst 6ms
  - `newser-tabs`: 2 commits, total 5ms, worst 5ms

### tab → newser:newspaper (warm revisit)
- kind: `tab` · measured at +136146ms into run
- **settle**: 667ms · **first DOM change**: 7ms · **window**: 850ms
- frames 51 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 667 · dom mutations: 128 · heap: 124MB
- react commits by boundary (worst first):
  - `game-body`: 3 commits, total 6ms, worst 3ms
  - `screen:game`: 3 commits, total 6ms, worst 3ms
  - `app-root`: 3 commits, total 6ms, worst 3ms
  - `newser-tabs`: 3 commits, total 5ms, worst 2ms

### scroll: newser newspaper editor
- kind: `scroll` · measured at +136996ms into run
- **settle**: 517ms · **first DOM change**: 7ms · **window**: 2733ms
- frames 164 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 667 · dom mutations: 29 · heap: 126MB
- react commits by boundary (worst first):
  - `screen:game`: 3 commits, total 4ms, worst 1ms
  - `app-root`: 3 commits, total 4ms, worst 1ms
  - `newser-tabs`: 3 commits, total 4ms, worst 1ms
  - `game-body`: 3 commits, total 4ms, worst 1ms

### navigate → game list
- kind: `navigate` · measured at +139729ms into run
- **settle**: 558ms · **first DOM change**: 2ms · **window**: 1325ms
- frames 78 · avg 17.0ms · p95 17ms · worst 42ms · >50ms: 0
- long tasks: 1 (total 57ms, worst 57ms)
- backend writes this window: user_vars:set 0.0ms
- queries subscribed during window: 0 · active data subs after: 667 · dom mutations: 176 · heap: 122MB
- react commits by boundary (worst first):
  - `app-root`: 11 commits, total 27ms, worst 12ms
  - `screen:allGames`: 3 commits, total 18ms, worst 12ms
  - `newser-tabs`: 2 commits, total 3ms, worst 1ms
  - `game-body`: 2 commits, total 3ms, worst 1ms
  - `screen:game`: 2 commits, total 3ms, worst 1ms

### — Phase E — modal lab
> every dialog with fixture data, opened/closed/measured

### modal open: MarkdownEditorDialog (heavy editor)
- kind: `modal-open` · measured at +141074ms into run
- **settle**: 246ms · **first DOM change**: 12ms · **window**: 897ms
- frames 42 · avg 21.3ms · p95 17ms · worst 213ms · >50ms: 1
- long tasks: 1 (total 220ms, worst 220ms)
- backend writes this window: user_vars:set 0.0ms
- queries subscribed during window: 2 · active data subs after: 668 · dom mutations: 459 · heap: 86MB

### modal close: MarkdownEditorDialog (heavy editor)
- kind: `modal-close` · measured at +141971ms into run
- **settle**: 167ms · **first DOM change**: 16ms · **window**: 433ms
- frames 26 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 668 · dom mutations: 30 · heap: 97MB

### modal open: markdown-editor (for minimize test)
- kind: `modal-open` · measured at +142404ms into run
- **settle**: 208ms · **first DOM change**: 189ms · **window**: 775ms
- frames 36 · avg 21.5ms · p95 17ms · worst 191ms · >50ms: 1
- long tasks: 1 (total 192ms, worst 192ms)
- queries subscribed during window: 0 · active data subs after: 668 · dom mutations: 434 · heap: 117MB

### modal minimize: markdown-editor
- kind: `action` · measured at +143179ms into run
- **settle**: 327ms · **first DOM change**: 37ms · **window**: 617ms
- frames 37 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 668 · dom mutations: 37 · heap: 101MB
- react commits by boundary (worst first):
  - `screen:allGames`: 1 commits, total 0ms, worst 0ms
  - `app-root`: 1 commits, total 0ms, worst 0ms

### modal restore: markdown-editor
- kind: `action` · measured at +143797ms into run
- **settle**: 182ms · **first DOM change**: 30ms · **window**: 899ms
- frames 54 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 668 · dom mutations: 18 · heap: 105MB
- react commits by boundary (worst first):
  - `screen:allGames`: 1 commits, total 0ms, worst 0ms
  - `app-root`: 1 commits, total 0ms, worst 0ms

### modal close: markdown-editor (after restore)
- kind: `modal-close` · measured at +144696ms into run
- **settle**: 184ms · **first DOM change**: 26ms · **window**: 450ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 668 · dom mutations: 24 · heap: 118MB

### modal open: TownSquarePostDialog
- kind: `modal-open` · measured at +145146ms into run
- **settle**: 119ms · **first DOM change**: 14ms · **window**: 783ms
- frames 43 · avg 18.2ms · p95 17ms · worst 74ms · >50ms: 1
- long tasks: 1 (total 79ms, worst 79ms)
- queries subscribed during window: 1 · active data subs after: 669 · dom mutations: 126 · heap: 83MB

### modal close: TownSquarePostDialog
- kind: `modal-close` · measured at +145929ms into run
- **settle**: 183ms · **first DOM change**: 26ms · **window**: 438ms
- frames 26 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 102MB

### modal open: PlayerProfileDialogNEW
- kind: `modal-open` · measured at +146368ms into run
- **settle**: 95ms · **first DOM change**: 15ms · **window**: 761ms
- frames 42 · avg 18.1ms · p95 17ms · worst 77ms · >50ms: 1
- long tasks: 1 (total 78ms, worst 78ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 89 · heap: 102MB

### modal close: PlayerProfileDialogNEW
- kind: `modal-close` · measured at +147129ms into run
- **settle**: 167ms · **first DOM change**: 22ms · **window**: 433ms
- frames 26 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 105MB

### modal open: UserEditDialog
- kind: `modal-open` · measured at +147562ms into run
- **settle**: 92ms · **first DOM change**: 15ms · **window**: 742ms
- frames 42 · avg 17.6ms · p95 17ms · worst 58ms · >50ms: 1
- long tasks: 1 (total 66ms, worst 66ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 52 · heap: 101MB

### modal close: UserEditDialog
- kind: `modal-close` · measured at +148304ms into run
- **settle**: 167ms · **first DOM change**: 22ms · **window**: 433ms
- frames 26 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 104MB

### modal open: UserAddDialog
- kind: `modal-open` · measured at +148737ms into run
- **settle**: 75ms · **first DOM change**: 16ms · **window**: 742ms
- frames 42 · avg 17.6ms · p95 17ms · worst 58ms · >50ms: 1
- long tasks: 1 (total 64ms, worst 64ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 42 · heap: 99MB

### modal close: UserAddDialog
- kind: `modal-close` · measured at +149479ms into run
- **settle**: 167ms · **first DOM change**: 21ms · **window**: 433ms
- frames 26 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 102MB

### modal open: RoleEditDialog
- kind: `modal-open` · measured at +149912ms into run
- **settle**: 58ms · **first DOM change**: 17ms · **window**: 725ms
- frames 42 · avg 17.3ms · p95 17ms · worst 41ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 41 · heap: 112MB

### modal close: RoleEditDialog
- kind: `modal-close` · measured at +150637ms into run
- **settle**: 167ms · **first DOM change**: 22ms · **window**: 433ms
- frames 26 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 116MB

### modal open: RoleAddDialog
- kind: `modal-open` · measured at +151071ms into run
- **settle**: 58ms · **first DOM change**: 17ms · **window**: 725ms
- frames 42 · avg 17.2ms · p95 17ms · worst 41ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 38 · heap: 82MB

### modal close: RoleAddDialog
- kind: `modal-close` · measured at +151796ms into run
- **settle**: 183ms · **first DOM change**: 22ms · **window**: 450ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 85MB

### modal open: VoteEditorDialog
- kind: `modal-open` · measured at +152246ms into run
- **settle**: 75ms · **first DOM change**: 17ms · **window**: 743ms
- frames 42 · avg 17.6ms · p95 17ms · worst 58ms · >50ms: 1
- long tasks: 1 (total 62ms, worst 62ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 41 · heap: 104MB

### modal close: VoteEditorDialog
- kind: `modal-close` · measured at +152989ms into run
- **settle**: 182ms · **first DOM change**: 23ms · **window**: 449ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 87MB

### modal open: VoteEnableDialog
- kind: `modal-open` · measured at +153437ms into run
- **settle**: 58ms · **first DOM change**: 18ms · **window**: 725ms
- frames 42 · avg 17.3ms · p95 17ms · worst 41ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 37 · heap: 97MB

### modal close: VoteEnableDialog
- kind: `modal-close` · measured at +154162ms into run
- **settle**: 167ms · **first DOM change**: 22ms · **window**: 433ms
- frames 26 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 101MB

### modal open: ActionEditorDialog
- kind: `modal-open` · measured at +154596ms into run
- **settle**: 75ms · **first DOM change**: 18ms · **window**: 742ms
- frames 42 · avg 17.6ms · p95 17ms · worst 58ms · >50ms: 1
- long tasks: 1 (total 65ms, worst 65ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 37 · heap: 96MB

### modal close: ActionEditorDialog
- kind: `modal-close` · measured at +155337ms into run
- **settle**: 183ms · **first DOM change**: 29ms · **window**: 450ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 100MB

### modal open: BioEditorDialog
- kind: `modal-open` · measured at +155787ms into run
- **settle**: 109ms · **first DOM change**: 19ms · **window**: 775ms
- frames 42 · avg 18.4ms · p95 17ms · worst 91ms · >50ms: 1
- long tasks: 1 (total 97ms, worst 97ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 66 · heap: 110MB

### modal close: BioEditorDialog
- kind: `modal-close` · measured at +156562ms into run
- **settle**: 183ms · **first DOM change**: 25ms · **window**: 450ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 100MB

### modal open: TagCellEditor
- kind: `modal-open` · measured at +157012ms into run
- **settle**: 109ms · **first DOM change**: 20ms · **window**: 775ms
- frames 42 · avg 18.4ms · p95 17ms · worst 91ms · >50ms: 1
- long tasks: 1 (total 93ms, worst 93ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 55 · heap: 84MB

### modal close: TagCellEditor
- kind: `modal-close` · measured at +157787ms into run
- **settle**: 183ms · **first DOM change**: 27ms · **window**: 450ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 89MB

### modal open: AddTagDialog
- kind: `modal-open` · measured at +158237ms into run
- **settle**: 83ms · **first DOM change**: 22ms · **window**: 751ms
- frames 42 · avg 17.8ms · p95 17ms · worst 66ms · >50ms: 1
- long tasks: 1 (total 69ms, worst 69ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 35 · heap: 109MB

### modal close: AddTagDialog
- kind: `modal-close` · measured at +158989ms into run
- **settle**: 182ms · **first DOM change**: 28ms · **window**: 449ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 91MB

### modal open: AddTagDialog (edit mode + trigger script)
- kind: `modal-open` · measured at +159437ms into run
- **settle**: 92ms · **first DOM change**: 22ms · **window**: 758ms
- frames 42 · avg 18.0ms · p95 17ms · worst 74ms · >50ms: 1
- long tasks: 1 (total 79ms, worst 79ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 56 · heap: 96MB

### modal close: AddTagDialog (edit mode + trigger script)
- kind: `modal-close` · measured at +160196ms into run
- **settle**: 200ms · **first DOM change**: 32ms · **window**: 466ms
- frames 28 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 101MB

### modal open: ChooseDayDialog
- kind: `modal-open` · measured at +160662ms into run
- **settle**: 84ms · **first DOM change**: 25ms · **window**: 750ms
- frames 42 · avg 17.8ms · p95 17ms · worst 66ms · >50ms: 1
- long tasks: 1 (total 73ms, worst 73ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 34 · heap: 100MB

### modal close: ChooseDayDialog
- kind: `modal-close` · measured at +161412ms into run
- **settle**: 183ms · **first DOM change**: 31ms · **window**: 450ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 105MB

### modal open: DaySelectionDialog
- kind: `modal-open` · measured at +161862ms into run
- **settle**: 75ms · **first DOM change**: 26ms · **window**: 742ms
- frames 42 · avg 17.6ms · p95 17ms · worst 58ms · >50ms: 1
- long tasks: 1 (total 63ms, worst 63ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 32 · heap: 116MB

### modal close: DaySelectionDialog
- kind: `modal-close` · measured at +162604ms into run
- **settle**: 183ms · **first DOM change**: 30ms · **window**: 450ms
- frames 27 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 103MB

### modal open: DaysPerGameDayDialog
- kind: `modal-open` · measured at +163054ms into run
- **settle**: 75ms · **first DOM change**: 26ms · **window**: 742ms
- frames 42 · avg 17.7ms · p95 17ms · worst 58ms · >50ms: 1
- long tasks: 1 (total 63ms, worst 63ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 34 · heap: 114MB

### modal close: DaysPerGameDayDialog
- kind: `modal-close` · measured at +163796ms into run
- **settle**: 183ms · **first DOM change**: 31ms · **window**: 450ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 119MB

### modal open: DeleteRoleConfirmationDialog
- kind: `modal-open` · measured at +164246ms into run
- **settle**: 75ms · **first DOM change**: 26ms · **window**: 742ms
- frames 42 · avg 17.6ms · p95 17ms · worst 58ms · >50ms: 1
- long tasks: 1 (total 65ms, worst 65ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 34 · heap: 84MB

### modal close: DeleteRoleConfirmationDialog
- kind: `modal-close` · measured at +164988ms into run
- **settle**: 200ms · **first DOM change**: 32ms · **window**: 466ms
- frames 28 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 89MB

### modal open: EditInfoDialog
- kind: `modal-open` · measured at +165454ms into run
- **settle**: 83ms · **first DOM change**: 28ms · **window**: 750ms
- frames 42 · avg 17.8ms · p95 17ms · worst 66ms · >50ms: 1
- long tasks: 1 (total 70ms, worst 70ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 42 · heap: 103MB

### modal close: EditInfoDialog
- kind: `modal-close` · measured at +166204ms into run
- **settle**: 200ms · **first DOM change**: 33ms · **window**: 466ms
- frames 28 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 108MB

### modal open: JoinedGameOptionsDialog
- kind: `modal-open` · measured at +166671ms into run
- **settle**: 108ms · **first DOM change**: 27ms · **window**: 775ms
- frames 42 · avg 18.4ms · p95 17ms · worst 91ms · >50ms: 1
- long tasks: 1 (total 97ms, worst 97ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 42 · heap: 97MB

### modal close: JoinedGameOptionsDialog
- kind: `modal-close` · measured at +167446ms into run
- **settle**: 183ms · **first DOM change**: 31ms · **window**: 450ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 111MB

### modal open: ArchivedGamesDialog
- kind: `modal-open` · measured at +167896ms into run
- **settle**: 108ms · **first DOM change**: 27ms · **window**: 758ms
- frames 41 · avg 18.5ms · p95 17ms · worst 91ms · >50ms: 1
- long tasks: 1 (total 93ms, worst 93ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 32 · heap: 116MB

### modal close: ArchivedGamesDialog
- kind: `modal-close` · measured at +168654ms into run
- **settle**: 183ms · **first DOM change**: 32ms · **window**: 450ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 107MB

### modal open: MarkdownInputBuilderDialog
- kind: `modal-open` · measured at +169104ms into run
- **settle**: 92ms · **first DOM change**: 28ms · **window**: 759ms
- frames 42 · avg 18.0ms · p95 17ms · worst 75ms · >50ms: 1
- long tasks: 1 (total 75ms, worst 75ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 53 · heap: 121MB

### modal close: MarkdownInputBuilderDialog
- kind: `modal-close` · measured at +169863ms into run
- **settle**: 199ms · **first DOM change**: 35ms · **window**: 465ms
- frames 28 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 106MB

### modal open: MarkdownVariableDialog
- kind: `modal-open` · measured at +170329ms into run
- **settle**: 83ms · **first DOM change**: 28ms · **window**: 751ms
- frames 42 · avg 17.8ms · p95 17ms · worst 66ms · >50ms: 1
- long tasks: 1 (total 68ms, worst 68ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 31 · heap: 118MB

### modal close: MarkdownVariableDialog
- kind: `modal-close` · measured at +171080ms into run
- **settle**: 182ms · **first DOM change**: 33ms · **window**: 449ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 84MB

### modal open: NightlyCertificationDialog
- kind: `modal-open` · measured at +171529ms into run
- **settle**: 125ms · **first DOM change**: 29ms · **window**: 792ms
- frames 42 · avg 18.8ms · p95 17ms · worst 108ms · >50ms: 1
- long tasks: 1 (total 115ms, worst 115ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 182 · heap: 91MB

### modal close: NightlyCertificationDialog
- kind: `modal-close` · measured at +172321ms into run
- **settle**: 183ms · **first DOM change**: 37ms · **window**: 450ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 97MB

### modal open: ScheduleTableUpdateDialog
- kind: `modal-open` · measured at +172771ms into run
- **settle**: 109ms · **first DOM change**: 31ms · **window**: 776ms
- frames 42 · avg 18.4ms · p95 17ms · worst 91ms · >50ms: 1
- long tasks: 1 (total 94ms, worst 94ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 60 · heap: 94MB

### modal close: ScheduleTableUpdateDialog
- kind: `modal-close` · measured at +173547ms into run
- **settle**: 182ms · **first DOM change**: 35ms · **window**: 449ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 100MB

### modal open: ColumnActionsDialog
- kind: `modal-open` · measured at +173996ms into run
- **settle**: 83ms · **first DOM change**: 31ms · **window**: 750ms
- frames 42 · avg 17.8ms · p95 17ms · worst 66ms · >50ms: 1
- long tasks: 1 (total 73ms, worst 73ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 43 · heap: 86MB

### modal close: ColumnActionsDialog
- kind: `modal-close` · measured at +174746ms into run
- **settle**: 200ms · **first DOM change**: 36ms · **window**: 466ms
- frames 28 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 92MB

### modal open: PhoneBookTocDialog
- kind: `modal-open` · measured at +175212ms into run
- **settle**: 100ms · **first DOM change**: 31ms · **window**: 766ms
- frames 42 · avg 18.2ms · p95 17ms · worst 83ms · >50ms: 1
- long tasks: 1 (total 91ms, worst 91ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 42 · heap: 95MB

### modal close: PhoneBookTocDialog
- kind: `modal-close` · measured at +175979ms into run
- **settle**: 183ms · **first DOM change**: 37ms · **window**: 450ms
- frames 27 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 111MB

### modal open: TableOfContentsDialog (rulebook)
- kind: `modal-open` · measured at +176429ms into run
- **settle**: 108ms · **first DOM change**: 32ms · **window**: 775ms
- frames 42 · avg 18.4ms · p95 17ms · worst 91ms · >50ms: 1
- long tasks: 1 (total 95ms, worst 95ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 88 · heap: 111MB

### modal close: TableOfContentsDialog (rulebook)
- kind: `modal-close` · measured at +177204ms into run
- **settle**: 183ms · **first DOM change**: 39ms · **window**: 450ms
- frames 27 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 101MB

### modal open: ImportDraftDialog
- kind: `modal-open` · measured at +177654ms into run
- **settle**: 134ms · **first DOM change**: 33ms · **window**: 800ms
- frames 43 · avg 18.6ms · p95 17ms · worst 75ms · >50ms: 1
- long tasks: 2 (total 130ms, worst 77ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 120 · heap: 113MB

### modal close: ImportDraftDialog
- kind: `modal-close` · measured at +178454ms into run
- **settle**: 192ms · **first DOM change**: 42ms · **window**: 458ms
- frames 27 · avg 17.0ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 86MB

### modal open: NewspaperSectionOptionsDialog
- kind: `modal-open` · measured at +178912ms into run
- **settle**: 108ms · **first DOM change**: 33ms · **window**: 759ms
- frames 41 · avg 18.5ms · p95 17ms · worst 91ms · >50ms: 1
- long tasks: 1 (total 97ms, worst 97ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 39 · heap: 110MB

### modal close: NewspaperSectionOptionsDialog
- kind: `modal-close` · measured at +179672ms into run
- **settle**: 199ms · **first DOM change**: 38ms · **window**: 466ms
- frames 28 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 95MB

### modal open: PlayerPreviewModal
- kind: `modal-open` · measured at +180137ms into run
- **settle**: 167ms · **first DOM change**: 35ms · **window**: 833ms
- frames 42 · avg 19.8ms · p95 17ms · worst 149ms · >50ms: 1
- long tasks: 1 (total 152ms, worst 152ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 93 · heap: 105MB

### modal close: PlayerPreviewModal
- kind: `modal-close` · measured at +180971ms into run
- **settle**: 183ms · **first DOM change**: 28ms · **window**: 450ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 110MB

### modal open: TownSquareImageDialog
- kind: `modal-open` · measured at +181421ms into run
- **settle**: 100ms · **first DOM change**: 35ms · **window**: 768ms
- frames 42 · avg 18.2ms · p95 17ms · worst 83ms · >50ms: 1
- long tasks: 1 (total 84ms, worst 84ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 36 · heap: 124MB

### modal close: TownSquareImageDialog
- kind: `modal-close` · measured at +182188ms into run
- **settle**: 191ms · **first DOM change**: 41ms · **window**: 457ms
- frames 27 · avg 16.9ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 111MB

### modal open: TownSquareLinkDialog
- kind: `modal-open` · measured at +182646ms into run
- **settle**: 92ms · **first DOM change**: 33ms · **window**: 758ms
- frames 42 · avg 18.0ms · p95 17ms · worst 74ms · >50ms: 1
- long tasks: 1 (total 82ms, worst 82ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 39 · heap: 87MB

### modal close: TownSquareLinkDialog
- kind: `modal-close` · measured at +183404ms into run
- **settle**: 183ms · **first DOM change**: 39ms · **window**: 450ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 93MB

### modal open: TownSquareMoreOptionsDialog
- kind: `modal-open` · measured at +183854ms into run
- **settle**: 92ms · **first DOM change**: 34ms · **window**: 758ms
- frames 42 · avg 18.0ms · p95 17ms · worst 75ms · >50ms: 1
- long tasks: 1 (total 79ms, worst 79ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 36 · heap: 108MB

### modal close: TownSquareMoreOptionsDialog
- kind: `modal-close` · measured at +184612ms into run
- **settle**: 197ms · **first DOM change**: 41ms · **window**: 458ms
- frames 27 · avg 17.0ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 95MB

### modal open: ConfirmDialog
- kind: `modal-open` · measured at +185071ms into run
- **settle**: 92ms · **first DOM change**: 36ms · **window**: 758ms
- frames 42 · avg 18.0ms · p95 17ms · worst 74ms · >50ms: 1
- long tasks: 1 (total 82ms, worst 82ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 109MB

### modal close: ConfirmDialog
- kind: `modal-close` · measured at +185829ms into run
- **settle**: 200ms · **first DOM change**: 41ms · **window**: 467ms
- frames 28 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 99MB

### modal open: ImageUploadDialog
- kind: `modal-open` · measured at +186295ms into run
- **settle**: 109ms · **first DOM change**: 35ms · **window**: 775ms
- frames 42 · avg 18.4ms · p95 19ms · worst 83ms · >50ms: 1
- long tasks: 1 (total 87ms, worst 87ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 44 · heap: 114MB

### modal close: ImageUploadDialog
- kind: `modal-close` · measured at +187070ms into run
- **settle**: 208ms · **first DOM change**: 43ms · **window**: 475ms
- frames 27 · avg 17.6ms · p95 25ms · worst 32ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 47 · heap: 103MB

### modal open: SaveHistoryDialog
- kind: `modal-open` · measured at +187545ms into run
- **settle**: 100ms · **first DOM change**: 35ms · **window**: 767ms
- frames 42 · avg 18.2ms · p95 17ms · worst 83ms · >50ms: 1
- long tasks: 1 (total 86ms, worst 86ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 40 · heap: 119MB

### modal close: SaveHistoryDialog
- kind: `modal-close` · measured at +188312ms into run
- **settle**: 200ms · **first DOM change**: 41ms · **window**: 467ms
- frames 28 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 107MB

### modal open: UnsavedChangesDialog
- kind: `modal-open` · measured at +188779ms into run
- **settle**: 100ms · **first DOM change**: 37ms · **window**: 767ms
- frames 42 · avg 18.2ms · p95 17ms · worst 83ms · >50ms: 1
- long tasks: 1 (total 83ms, worst 83ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 122MB

### modal close: UnsavedChangesDialog
- kind: `modal-close` · measured at +189546ms into run
- **settle**: 192ms · **first DOM change**: 42ms · **window**: 458ms
- frames 27 · avg 17.0ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 87MB

### modal open: ViewOnlyPreviewModal
- kind: `modal-open` · measured at +190004ms into run
- **settle**: 100ms · **first DOM change**: 36ms · **window**: 766ms
- frames 42 · avg 18.2ms · p95 17ms · worst 83ms · >50ms: 1
- long tasks: 1 (total 83ms, worst 83ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 28 · heap: 102MB

### modal close: ViewOnlyPreviewModal
- kind: `modal-close` · measured at +190771ms into run
- **settle**: 192ms · **first DOM change**: 41ms · **window**: 458ms
- frames 27 · avg 17.0ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 109MB

### modal open: DeleteGameConfirmationDialog
- kind: `modal-open` · measured at +191229ms into run
- **settle**: 100ms · **first DOM change**: 36ms · **window**: 766ms
- frames 42 · avg 18.2ms · p95 17ms · worst 83ms · >50ms: 1
- long tasks: 1 (total 87ms, worst 87ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 34 · heap: 101MB

### modal close: DeleteGameConfirmationDialog
- kind: `modal-close` · measured at +191996ms into run
- **settle**: 192ms · **first DOM change**: 43ms · **window**: 458ms
- frames 27 · avg 17.0ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 108MB

### — Tour complete
> 164 steps in 190.7s
