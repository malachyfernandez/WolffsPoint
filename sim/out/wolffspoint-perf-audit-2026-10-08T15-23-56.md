# WolffsPoint Perf Audit — Simulated Run

- **Started**: 2026-10-08T15:23:56.349Z
- **Run duration**: 198.9s
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
| 4 | action: New WolffsPoint dialog open | modal-open | 73ms | 29ms | p95 23ms, 0 slow | 0 | app-root 1ms (2 commits) | 🟢 ok |
| 5 | modal close: New WolffsPoint | modal-close | 167ms | 12ms | p95 17ms, 0 slow | 0 | screen:allGames 1ms (1 commits) | 🟢 ok |
| 6 | Phase B — operator game | note | 0ms | — | — | 0 | — | 🟢 ok |
| 7 | open game: SIMOP1234 (as operator) | navigate | 5425ms | 4ms | p95 142ms, 18 slow | 19 (364ms worst) | app-root 2737ms (529 commits) | 🔴 slow |
| 8 | tab → op:config (cold mount) | tab | 901ms | 509ms | p95 208ms, 5 slow | 2 (510ms worst) | app-root 690ms (143 commits) | 🔴 slow |
| 9 | tab → op:nightly (cold mount) | tab | 1991ms | 712ms | p95 208ms, 6 slow | 7 (713ms worst) | app-root 1353ms (88 commits) | 🔴 slow |
| 10 | tab → op:forum (cold mount) | tab | 766ms | 242ms | p95 67ms, 4 slow | 3 (242ms worst) | app-root 499ms (97 commits) | 🟡 meh |
| 11 | tab → op:newspaper (cold mount) | tab | 917ms | 214ms | p95 17ms, 1 slow | 2 (214ms worst) | app-root 267ms (23 commits) | 🟡 meh |
| 12 | tab → op:rulebook (cold mount) | tab | 873ms | 134ms | p95 33ms, 2 slow | 1 (134ms worst) | app-root 144ms (20 commits) | 🟡 meh |
| 13 | tab → op:players (warm revisit) | tab | 406ms | 154ms | p95 233ms, 2 slow | 2 (230ms worst) | game-body 353ms (4 commits) | 🟡 meh |
| 14 | tab → op:config (warm revisit) | tab | 160ms | 55ms | p95 83ms, 2 slow | 2 (94ms worst) | app-root 119ms (4 commits) | 🟢 ok |
| 15 | tab → op:nightly (warm revisit) | tab | 135ms | 60ms | p95 66ms, 1 slow | 2 (74ms worst) | app-root 91ms (4 commits) | 🟢 ok |
| 16 | tab → op:forum (warm revisit) | tab | 265ms | 201ms | p95 208ms, 1 slow | 2 (212ms worst) | screen:game 233ms (4 commits) | 🟡 meh |
| 17 | tab → op:newspaper (warm revisit) | tab | 750ms | 67ms | p95 17ms, 1 slow | 1 (74ms worst) | app-root 54ms (3 commits) | 🟡 meh |
| 18 | tab → op:rulebook (warm revisit) | tab | 508ms | 190ms | p95 17ms, 1 slow | 1 (194ms worst) | screen:game 179ms (3 commits) | 🟡 meh |
| 19 | tab → op:players (warm revisit) | tab | 208ms | 54ms | p95 92ms, 2 slow | 2 (103ms worst) | app-root 127ms (4 commits) | 🟢 ok |
| 20 | rapid tab cycle (all 6 operator tabs) | action | 1600ms | 3ms | p95 75ms, 6 slow | 9 (195ms worst) | app-root 582ms (15 commits) | 🔴 slow |
| 21 | tab → op:players (warm revisit) | tab | 298ms | 192ms | p95 174ms, 2 slow | 2 (192ms worst) | game-body 255ms (5 commits) | 🟡 meh |
| 22 | scroll: operator players table (vertical) | scroll | 31ms | 31ms | p95 24ms, 0 slow | 0 | — | 🟢 ok |
| 23 | scroll: players table horizontal | scroll | 24ms | 24ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 24 | tab → op:nightly (warm revisit) | tab | 362ms | 198ms | p95 207ms, 2 slow | 2 (212ms worst) | game-body 304ms (5 commits) | 🟡 meh |
| 25 | scroll: operator nightly | scroll | 2433ms | 26ms | p95 17ms, 0 slow | 0 | app-root 850ms (201 commits) | 🔴 slow |
| 26 | modal open: Review/Certify (nightly) | modal-open | 330ms | 309ms | p95 17ms, 1 slow | 1 (312ms worst) | app-root 62ms (4 commits) | 🔴 slow |
| 27 | modal close: Review/Certify | modal-close | 533ms | 164ms | p95 17ms, 1 slow | 1 (164ms worst) | app-root 140ms (4 commits) | 🟡 meh |
| 28 | tab → op:forum (warm revisit) | tab | 258ms | 192ms | p95 199ms, 1 slow | 2 (202ms worst) | app-root 226ms (4 commits) | 🟡 meh |
| 29 | scroll: town square thread list | scroll | 28ms | 28ms | p95 17ms, 0 slow | 0 | app-root 253ms (121 commits) | 🟢 ok |
| 30 | navigate: thread list → thread detail | navigate | 716ms | 6ms | p95 17ms, 2 slow | 1 (422ms worst) | app-root 381ms (17 commits) | 🔴 slow |
| 31 | scroll: thread detail comments | scroll | 30ms | 30ms | p95 17ms, 0 slow | 0 | app-root 105ms (50 commits) | 🟢 ok |
| 32 | navigate: thread detail → thread list | navigate | 783ms | 18ms | p95 17ms, 1 slow | 1 (382ms worst) | app-root 361ms (7 commits) | 🔴 slow |
| 33 | navigate: open second thread (warm) | navigate | 483ms | 54ms | p95 33ms, 1 slow | 2 (85ms worst) | app-root 142ms (14 commits) | 🟢 ok |
| 34 | navigate: back to thread list (warm) | navigate | 775ms | 18ms | p95 17ms, 1 slow | 1 (376ms worst) | app-root 353ms (6 commits) | 🔴 slow |
| 35 | modal open: New Thread composer | modal-open | 83ms | 64ms | p95 17ms, 0 slow | 1 (63ms worst) | op-tabs 16ms (4 commits) | 🟢 ok |
| 36 | modal close: New Thread composer | modal-close | 201ms | 34ms | p95 17ms, 0 slow | 0 | app-root 21ms (4 commits) | 🟢 ok |
| 37 | tab → op:newspaper (warm revisit) | tab | 858ms | 194ms | p95 17ms, 1 slow | 1 (198ms worst) | game-body 183ms (3 commits) | 🟡 meh |
| 38 | scroll: operator newspaper | scroll | 34ms | 34ms | p95 17ms, 0 slow | 0 | app-root 309ms (145 commits) | 🟢 ok |
| 39 | tab → op:rulebook (warm revisit) | tab | 449ms | 132ms | p95 17ms, 1 slow | 1 (137ms worst) | game-body 123ms (4 commits) | 🟡 meh |
| 40 | scroll: operator config page | scroll | 175ms | 29ms | p95 17ms, 0 slow | 0 | app-root 110ms (51 commits) | 🟢 ok |
| 41 | navigate: config → rule book subpage | navigate | 7979ms | 6ms | p95 17ms, 1 slow | 1 (359ms worst) | app-root 347ms (16 commits) | 🔴 slow |
| 42 | scroll: operator rulebook (scroll-linked TOC) | scroll | 3059ms | 30ms | p95 17ms, 0 slow | 0 | app-root 331ms (160 commits) | 🔴 slow |
| 43 | modal open: rulebook table of contents | modal-open | 73ms | 6ms | p95 17ms, 1 slow | 1 (66ms worst) | game-body 15ms (5 commits) | 🟢 ok |
| 44 | modal close: rulebook TOC | modal-close | 183ms | 20ms | p95 17ms, 0 slow | 0 | op-tabs 4ms (2 commits) | 🟢 ok |
| 45 | navigate: rule book → config | navigate | 500ms | 6ms | p95 17ms, 1 slow | 1 (116ms worst) | app-root 95ms (8 commits) | 🟡 meh |
| 46 | navigate: config → phone book subpage | navigate | 7987ms | 3ms | p95 17ms, 1 slow | 1 (305ms worst) | app-root 296ms (15 commits) | 🔴 slow |
| 47 | scroll: operator phone book | scroll | 2351ms | 30ms | p95 17ms, 0 slow | 0 | app-root 113ms (52 commits) | 🔴 slow |
| 48 | navigate: phone book → config | navigate | 507ms | 7ms | p95 17ms, 1 slow | 1 (119ms worst) | app-root 93ms (8 commits) | 🟡 meh |
| 49 | tab → op:config (warm revisit) | tab | 599ms | 145ms | p95 17ms, 1 slow | 1 (145ms worst) | app-root 148ms (4 commits) | 🟡 meh |
| 50 | scroll: operator roles table | scroll | 2433ms | 27ms | p95 17ms, 0 slow | 0 | app-root 279ms (99 commits) | 🔴 slow |
| 51 | navigate → game list | navigate | 674ms | 2ms | p95 17ms, 1 slow | 1 (196ms worst) | app-root 33ms (9 commits) | 🟡 meh |
| 52 | Phase C — player game | note | 0ms | — | — | 0 | — | 🟢 ok |
| 53 | open game: SIMPLY567 (as player) | navigate | 2383ms | 3ms | p95 17ms, 3 slow | 2 (247ms worst) | app-root 408ms (104 commits) | 🔴 slow |
| 54 | tab → player:newspaper (cold mount) | tab | 380ms | 44ms | p95 25ms, 1 slow | 1 (160ms worst) | app-root 188ms (28 commits) | 🟡 meh |
| 55 | tab → player:eyesOnly (cold mount) | tab | 433ms | 52ms | p95 33ms, 1 slow | 1 (52ms worst) | app-root 125ms (19 commits) | 🟢 ok |
| 56 | tab → player:ruleBook (cold mount) | tab | 7834ms | 51ms | p95 17ms, 1 slow | 3 (243ms worst) | app-root 405ms (18 commits) | 🔴 slow |
| 57 | tab → player:phoneBook (cold mount) | tab | 7851ms | 75ms | p95 17ms, 3 slow | 2 (331ms worst) | app-root 533ms (27 commits) | 🔴 slow |
| 58 | tab → player:newspaper (warm revisit) | tab | 343ms | 30ms | p95 33ms, 0 slow | 0 | app-root 43ms (16 commits) | 🟢 ok |
| 59 | tab → player:eyesOnly (warm revisit) | tab | 30ms | 26ms | p95 24ms, 0 slow | 0 | game-body 20ms (3 commits) | 🟢 ok |
| 60 | tab → player:ruleBook (warm revisit) | tab | 377ms | 27ms | p95 17ms, 0 slow | 0 | game-body 37ms (4 commits) | 🟢 ok |
| 61 | tab → player:phoneBook (warm revisit) | tab | 1234ms | 25ms | p95 17ms, 1 slow | 1 (245ms worst) | app-root 251ms (8 commits) | 🔴 slow |
| 62 | tab → player:townSquare (warm revisit) | tab | 212ms | 29ms | p95 17ms, 0 slow | 0 | app-root 40ms (4 commits) | 🟢 ok |
| 63 | tab → player:townSquare (warm revisit) | tab | 3ms | 3ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 64 | scroll: player town square | scroll | 1496ms | 10ms | p95 17ms, 0 slow | 0 | app-root 32ms (4 commits) | 🔴 slow |
| 65 | tab → player:newspaper (warm revisit) | tab | 344ms | 26ms | p95 17ms, 0 slow | 0 | app-root 39ms (17 commits) | 🟢 ok |
| 66 | scroll: player newspaper | scroll | 1732ms | 11ms | p95 17ms, 0 slow | 0 | app-root 51ms (5 commits) | 🔴 slow |
| 67 | tab → player:eyesOnly (warm revisit) | tab | 98ms | 25ms | p95 24ms, 0 slow | 0 | app-root 45ms (6 commits) | 🟢 ok |
| 68 | scroll: player eyes only | scroll | 1796ms | 11ms | p95 17ms, 0 slow | 0 | app-root 41ms (4 commits) | 🔴 slow |
| 69 | tab → player:ruleBook (warm revisit) | tab | 234ms | 25ms | p95 17ms, 0 slow | 0 | game-body 20ms (2 commits) | 🟢 ok |
| 70 | scroll: player rulebook (scroll-linked) | scroll | 2834ms | 9ms | p95 17ms, 0 slow | 0 | app-root 64ms (10 commits) | 🔴 slow |
| 71 | tab → player:phoneBook (warm revisit) | tab | 1599ms | 24ms | p95 17ms, 1 slow | 1 (233ms worst) | app-root 272ms (9 commits) | 🔴 slow |
| 72 | scroll: player phone book | scroll | 2334ms | 11ms | p95 17ms, 0 slow | 0 | game-body 39ms (4 commits) | 🔴 slow |
| 73 | navigate → game list | navigate | 607ms | 3ms | p95 17ms, 1 slow | 2 (101ms worst) | app-root 77ms (15 commits) | 🟡 meh |
| 74 | Phase D — newser game | note | 0ms | — | — | 0 | — | 🟢 ok |
| 75 | open game: SIMNEWS9 (as newser) | navigate | 2375ms | 3ms | p95 17ms, 3 slow | 2 (250ms worst) | app-root 386ms (88 commits) | 🔴 slow |
| 76 | tab → newser:newspaper (cold mount) | tab | 308ms | 44ms | p95 33ms, 2 slow | 1 (87ms worst) | app-root 168ms (33 commits) | 🟢 ok |
| 77 | tab → newser:ruleBook (cold mount) | tab | 8011ms | 25ms | p95 17ms, 1 slow | 1 (195ms worst) | app-root 205ms (10 commits) | 🔴 slow |
| 78 | tab → newser:phoneBook (cold mount) | tab | 7835ms | 61ms | p95 17ms, 2 slow | 2 (321ms worst) | app-root 359ms (22 commits) | 🔴 slow |
| 79 | tab → newser:newspaper (warm revisit) | tab | 691ms | 13ms | p95 17ms, 0 slow | 0 | game-body 11ms (3 commits) | 🟡 meh |
| 80 | tab → newser:ruleBook (warm revisit) | tab | 712ms | 8ms | p95 17ms, 0 slow | 0 | app-root 8ms (3 commits) | 🟡 meh |
| 81 | tab → newser:phoneBook (warm revisit) | tab | 1261ms | 8ms | p95 17ms, 1 slow | 1 (237ms worst) | screen:game 226ms (7 commits) | 🔴 slow |
| 82 | tab → newser:townSquare (warm revisit) | tab | 25ms | 13ms | p95 17ms, 0 slow | 0 | game-body 9ms (2 commits) | 🟢 ok |
| 83 | tab → newser:newspaper (warm revisit) | tab | 666ms | 9ms | p95 17ms, 0 slow | 0 | game-body 8ms (3 commits) | 🟡 meh |
| 84 | scroll: newser newspaper editor | scroll | 517ms | 10ms | p95 17ms, 0 slow | 0 | app-root 6ms (3 commits) | 🟡 meh |
| 85 | navigate → game list | navigate | 608ms | 3ms | p95 17ms, 1 slow | 2 (83ms worst) | app-root 39ms (10 commits) | 🟡 meh |
| 86 | Phase E — modal lab | note | 0ms | — | — | 0 | — | 🟢 ok |
| 87 | modal open: MarkdownEditorDialog (heavy editor) | modal-open | 345ms | 18ms | p95 17ms, 1 slow | 2 (325ms worst) | — | 🔴 slow |
| 88 | modal close: MarkdownEditorDialog (heavy editor) | modal-close | 192ms | 40ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 89 | modal open: markdown-editor (for minimize test) | modal-open | 300ms | 283ms | p95 17ms, 1 slow | 1 (286ms worst) | — | 🟡 meh |
| 90 | modal minimize: markdown-editor | action | 289ms | 49ms | p95 17ms, 0 slow | 0 | screen:allGames 1ms (1 commits) | 🟢 ok |
| 91 | modal restore: markdown-editor | action | 184ms | 38ms | p95 17ms, 0 slow | 0 | app-root 1ms (1 commits) | 🟢 ok |
| 92 | modal close: markdown-editor (after restore) | modal-close | 199ms | 35ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 93 | modal open: TownSquarePostDialog | modal-open | 198ms | 20ms | p95 17ms, 1 slow | 2 (116ms worst) | — | 🟢 ok |
| 94 | modal close: TownSquarePostDialog | modal-close | 208ms | 41ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 95 | modal open: PlayerProfileDialogNEW | modal-open | 125ms | 20ms | p95 17ms, 1 slow | 1 (112ms worst) | — | 🟢 ok |
| 96 | modal close: PlayerProfileDialogNEW | modal-close | 182ms | 28ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 97 | modal open: UserEditDialog | modal-open | 108ms | 21ms | p95 17ms, 1 slow | 1 (96ms worst) | — | 🟢 ok |
| 98 | modal close: UserEditDialog | modal-close | 183ms | 30ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 99 | modal open: UserAddDialog | modal-open | 117ms | 22ms | p95 17ms, 1 slow | 1 (91ms worst) | — | 🟢 ok |
| 100 | modal close: UserAddDialog | modal-close | 182ms | 29ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 101 | modal open: RoleEditDialog | modal-open | 83ms | 23ms | p95 17ms, 1 slow | 1 (68ms worst) | — | 🟢 ok |
| 102 | modal close: RoleEditDialog | modal-close | 199ms | 32ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 103 | modal open: RoleAddDialog | modal-open | 83ms | 24ms | p95 17ms, 1 slow | 1 (71ms worst) | — | 🟢 ok |
| 104 | modal close: RoleAddDialog | modal-close | 183ms | 31ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 105 | modal open: VoteEditorDialog | modal-open | 100ms | 25ms | p95 17ms, 1 slow | 1 (91ms worst) | — | 🟢 ok |
| 106 | modal close: VoteEditorDialog | modal-close | 182ms | 34ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 107 | modal open: VoteEnableDialog | modal-open | 83ms | 26ms | p95 17ms, 1 slow | 1 (68ms worst) | — | 🟢 ok |
| 108 | modal close: VoteEnableDialog | modal-close | 200ms | 33ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 109 | modal open: ActionEditorDialog | modal-open | 100ms | 27ms | p95 17ms, 1 slow | 1 (91ms worst) | — | 🟢 ok |
| 110 | modal close: ActionEditorDialog | modal-close | 200ms | 34ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 111 | modal open: BioEditorDialog | modal-open | 158ms | 27ms | p95 17ms, 1 slow | 1 (143ms worst) | — | 🟡 meh |
| 112 | modal close: BioEditorDialog | modal-close | 200ms | 37ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 113 | modal open: TagCellEditor | modal-open | 150ms | 28ms | p95 17ms, 1 slow | 1 (124ms worst) | — | 🟡 meh |
| 114 | modal close: TagCellEditor | modal-close | 183ms | 39ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 115 | modal open: AddTagDialog | modal-open | 109ms | 31ms | p95 17ms, 1 slow | 1 (98ms worst) | — | 🟢 ok |
| 116 | modal close: AddTagDialog | modal-close | 200ms | 40ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 117 | modal open: AddTagDialog (edit mode + trigger script) | modal-open | 133ms | 31ms | p95 17ms, 1 slow | 1 (116ms worst) | — | 🟢 ok |
| 118 | modal close: AddTagDialog (edit mode + trigger script) | modal-close | 208ms | 46ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 119 | modal open: ChooseDayDialog | modal-open | 117ms | 37ms | p95 17ms, 1 slow | 1 (108ms worst) | — | 🟢 ok |
| 120 | modal close: ChooseDayDialog | modal-close | 207ms | 45ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 121 | modal open: DaySelectionDialog | modal-open | 108ms | 38ms | p95 17ms, 1 slow | 1 (91ms worst) | — | 🟢 ok |
| 122 | modal close: DaySelectionDialog | modal-close | 191ms | 46ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 123 | modal open: DaysPerGameDayDialog | modal-open | 108ms | 38ms | p95 17ms, 1 slow | 1 (93ms worst) | — | 🟢 ok |
| 124 | modal close: DaysPerGameDayDialog | modal-close | 192ms | 46ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 125 | modal open: DeleteRoleConfirmationDialog | modal-open | 108ms | 39ms | p95 17ms, 1 slow | 1 (97ms worst) | — | 🟢 ok |
| 126 | modal close: DeleteRoleConfirmationDialog | modal-close | 208ms | 44ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 127 | modal open: EditInfoDialog | modal-open | 117ms | 40ms | p95 17ms, 1 slow | 1 (101ms worst) | — | 🟢 ok |
| 128 | modal close: EditInfoDialog | modal-close | 192ms | 46ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 129 | modal open: JoinedGameOptionsDialog | modal-open | 150ms | 42ms | p95 17ms, 1 slow | 1 (138ms worst) | — | 🟡 meh |
| 130 | modal close: JoinedGameOptionsDialog | modal-close | 207ms | 47ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 131 | modal open: ArchivedGamesDialog | modal-open | 150ms | 39ms | p95 17ms, 1 slow | 1 (134ms worst) | — | 🟡 meh |
| 132 | modal close: ArchivedGamesDialog | modal-close | 207ms | 46ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 133 | modal open: MarkdownInputBuilderDialog | modal-open | 117ms | 41ms | p95 17ms, 1 slow | 1 (107ms worst) | — | 🟢 ok |
| 134 | modal close: MarkdownInputBuilderDialog | modal-close | 209ms | 49ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 135 | modal open: MarkdownVariableDialog | modal-open | 109ms | 41ms | p95 91ms, 2 slow | 1 (98ms worst) | — | 🟢 ok |
| 136 | modal close: MarkdownVariableDialog | modal-close | 233ms | 68ms | p95 17ms, 1 slow | 1 (68ms worst) | — | 🟢 ok |
| 137 | modal open: NightlyCertificationDialog | modal-open | 192ms | 43ms | p95 17ms, 1 slow | 1 (178ms worst) | — | 🟡 meh |
| 138 | modal close: NightlyCertificationDialog | modal-close | 217ms | 55ms | p95 17ms, 0 slow | 1 (55ms worst) | — | 🟢 ok |
| 139 | modal open: ScheduleTableUpdateDialog | modal-open | 167ms | 45ms | p95 17ms, 1 slow | 1 (139ms worst) | — | 🟡 meh |
| 140 | modal close: ScheduleTableUpdateDialog | modal-close | 217ms | 53ms | p95 17ms, 0 slow | 1 (53ms worst) | — | 🟢 ok |
| 141 | modal open: ColumnActionsDialog | modal-open | 133ms | 45ms | p95 17ms, 1 slow | 1 (116ms worst) | — | 🟢 ok |
| 142 | modal close: ColumnActionsDialog | modal-close | 200ms | 53ms | p95 17ms, 0 slow | 1 (52ms worst) | — | 🟢 ok |
| 143 | modal open: PhoneBookTocDialog | modal-open | 150ms | 46ms | p95 17ms, 1 slow | 1 (139ms worst) | — | 🟡 meh |
| 144 | modal close: PhoneBookTocDialog | modal-close | 207ms | 54ms | p95 25ms, 0 slow | 1 (54ms worst) | — | 🟢 ok |
| 145 | modal open: TableOfContentsDialog (rulebook) | modal-open | 150ms | 47ms | p95 17ms, 1 slow | 1 (136ms worst) | — | 🟡 meh |
| 146 | modal close: TableOfContentsDialog (rulebook) | modal-close | 217ms | 56ms | p95 17ms, 0 slow | 1 (56ms worst) | — | 🟢 ok |
| 147 | modal open: ImportDraftDialog | modal-open | 193ms | 48ms | p95 17ms, 2 slow | 2 (112ms worst) | — | 🟢 ok |
| 148 | modal close: ImportDraftDialog | modal-close | 207ms | 60ms | p95 17ms, 0 slow | 1 (60ms worst) | — | 🟢 ok |
| 149 | modal open: NewspaperSectionOptionsDialog | modal-open | 158ms | 49ms | p95 17ms, 1 slow | 1 (145ms worst) | — | 🟡 meh |
| 150 | modal close: NewspaperSectionOptionsDialog | modal-close | 200ms | 55ms | p95 17ms, 0 slow | 1 (55ms worst) | — | 🟢 ok |
| 151 | modal open: PlayerPreviewModal | modal-open | 217ms | 49ms | p95 17ms, 1 slow | 1 (200ms worst) | — | 🟡 meh |
| 152 | modal close: PlayerPreviewModal | modal-close | 226ms | 59ms | p95 17ms, 0 slow | 1 (59ms worst) | — | 🟢 ok |
| 153 | modal open: TownSquareImageDialog | modal-open | 133ms | 50ms | p95 17ms, 1 slow | 1 (124ms worst) | — | 🟡 meh |
| 154 | modal close: TownSquareImageDialog | modal-close | 225ms | 65ms | p95 17ms, 0 slow | 1 (65ms worst) | — | 🟢 ok |
| 155 | modal open: TownSquareLinkDialog | modal-open | 133ms | 51ms | p95 17ms, 1 slow | 1 (123ms worst) | — | 🟡 meh |
| 156 | modal close: TownSquareLinkDialog | modal-close | 208ms | 58ms | p95 17ms, 0 slow | 1 (57ms worst) | — | 🟢 ok |
| 157 | modal open: TownSquareMoreOptionsDialog | modal-open | 142ms | 52ms | p95 17ms, 1 slow | 1 (125ms worst) | — | 🟡 meh |
| 158 | modal close: TownSquareMoreOptionsDialog | modal-close | 207ms | 58ms | p95 17ms, 0 slow | 1 (58ms worst) | — | 🟢 ok |
| 159 | modal open: ConfirmDialog | modal-open | 142ms | 53ms | p95 17ms, 1 slow | 1 (125ms worst) | — | 🟡 meh |
| 160 | modal close: ConfirmDialog | modal-close | 225ms | 60ms | p95 17ms, 0 slow | 1 (59ms worst) | — | 🟢 ok |
| 161 | modal open: ImageUploadDialog | modal-open | 134ms | 52ms | p95 17ms, 1 slow | 1 (124ms worst) | — | 🟡 meh |
| 162 | modal close: ImageUploadDialog | modal-close | 225ms | 60ms | p95 17ms, 0 slow | 1 (59ms worst) | — | 🟢 ok |
| 163 | modal open: SaveHistoryDialog | modal-open | 142ms | 51ms | p95 17ms, 1 slow | 1 (125ms worst) | — | 🟡 meh |
| 164 | modal close: SaveHistoryDialog | modal-close | 208ms | 61ms | p95 17ms, 0 slow | 1 (60ms worst) | — | 🟢 ok |
| 165 | modal open: UnsavedChangesDialog | modal-open | 133ms | 51ms | p95 17ms, 1 slow | 1 (119ms worst) | — | 🟢 ok |
| 166 | modal close: UnsavedChangesDialog | modal-close | 225ms | 60ms | p95 17ms, 0 slow | 1 (60ms worst) | — | 🟢 ok |
| 167 | modal open: ViewOnlyPreviewModal | modal-open | 133ms | 52ms | p95 17ms, 1 slow | 1 (119ms worst) | — | 🟢 ok |
| 168 | modal close: ViewOnlyPreviewModal | modal-close | 208ms | 60ms | p95 17ms, 0 slow | 1 (60ms worst) | — | 🟢 ok |
| 169 | modal open: DeleteGameConfirmationDialog | modal-open | 133ms | 54ms | p95 17ms, 1 slow | 1 (123ms worst) | — | 🟡 meh |
| 170 | modal close: DeleteGameConfirmationDialog | modal-close | 207ms | 60ms | p95 17ms, 0 slow | 1 (60ms worst) | — | 🟢 ok |
| 171 | Tour complete | note | 0ms | — | — | 0 | — | 🟢 ok |

## Slowest steps

- **8011ms** — tab → newser:ruleBook (cold mount) (longTasks 1/195ms, p95 frame 17ms)
- **7987ms** — navigate: config → phone book subpage (longTasks 1/305ms, p95 frame 17ms)
- **7979ms** — navigate: config → rule book subpage (longTasks 1/359ms, p95 frame 17ms)
- **7851ms** — tab → player:phoneBook (cold mount) (longTasks 2/331ms, p95 frame 17ms)
- **7835ms** — tab → newser:phoneBook (cold mount) (longTasks 2/321ms, p95 frame 17ms)
- **7834ms** — tab → player:ruleBook (cold mount) (longTasks 3/243ms, p95 frame 17ms)
- **5425ms** — open game: SIMOP1234 (as operator) (longTasks 19/364ms, p95 frame 142ms)
- **3059ms** — scroll: operator rulebook (scroll-linked TOC) (longTasks 0/0ms, p95 frame 17ms)
- **2834ms** — scroll: player rulebook (scroll-linked) (longTasks 0/0ms, p95 frame 17ms)
- **2433ms** — scroll: operator nightly (longTasks 0/0ms, p95 frame 17ms)

## Detail log

### — Perf audit tour starting
> UA: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/146.0.0.0 Safari/537.36

### — Phase A — game list

### scroll: game list
- kind: `scroll` · measured at +1984ms into run
- **settle**: 4ms · **first DOM change**: 4ms · **window**: 4ms
- 
- queries subscribed during window: 0 · active data subs after: 18 · dom mutations: 1 · heap: 59MB

### action: New WolffsPoint dialog open
- kind: `modal-open` · measured at +1988ms into run
- **settle**: 73ms · **first DOM change**: 29ms · **window**: 581ms
- frames 33 · avg 17.6ms · p95 23ms · worst 42ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 18 · dom mutations: 32 · heap: 62MB
- react commits by boundary (worst first):
  - `app-root`: 2 commits, total 1ms, worst 1ms
  - `screen:allGames`: 1 commits, total 1ms, worst 1ms

### modal close: New WolffsPoint
- kind: `modal-close` · measured at +2570ms into run
- **settle**: 167ms · **first DOM change**: 12ms · **window**: 433ms
- frames 26 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 18 · dom mutations: 27 · heap: 63MB
- react commits by boundary (worst first):
  - `screen:allGames`: 1 commits, total 1ms, worst 1ms
  - `app-root`: 1 commits, total 1ms, worst 1ms

### — Phase B — operator game
> current user owns SIMOP1234

### open game: SIMOP1234 (as operator)
- kind: `navigate` · measured at +3003ms into run
- **settle**: 5425ms · **first DOM change**: 4ms · **window**: 6391ms
- frames 194 · avg 32.9ms · p95 142ms · worst 392ms · >50ms: 18
- long tasks: 19 (total 2810ms, worst 364ms)
- backend writes this window: user_vars:set 0.3ms, user_vars:set 0.1ms, user_vars:set 0.1ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms
- queries subscribed during window: 528 · active data subs after: 285 · dom mutations: 1722 · heap: 260MB
- react commits by boundary (worst first):
  - `app-root`: 529 commits, total 2737ms, worst 224ms
  - `screen:game`: 517 commits, total 2689ms, worst 224ms
  - `game-body`: 510 commits, total 2674ms, worst 224ms
  - `op-tabs`: 508 commits, total 2669ms, worst 224ms
  - `screen:allGames`: 7 commits, total 29ms, worst 8ms

### tab → op:config (cold mount)
- kind: `tab` · measured at +9395ms into run
- **settle**: 901ms · **first DOM change**: 509ms · **window**: 1459ms
- frames 36 · avg 40.5ms · p95 208ms · worst 500ms · >50ms: 5
- long tasks: 2 (total 625ms, worst 510ms)
- backend writes this window: user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms
- queries subscribed during window: 93 · active data subs after: 331 · dom mutations: 264 · heap: 333MB
- react commits by boundary (worst first):
  - `app-root`: 143 commits, total 690ms, worst 288ms
  - `screen:game`: 143 commits, total 688ms, worst 288ms
  - `game-body`: 143 commits, total 687ms, worst 287ms
  - `op-tabs`: 143 commits, total 685ms, worst 285ms

### tab → op:nightly (cold mount)
- kind: `tab` · measured at +10854ms into run
- **settle**: 1991ms · **first DOM change**: 712ms · **window**: 2549ms
- frames 58 · avg 43.9ms · p95 208ms · worst 700ms · >50ms: 6
- long tasks: 7 (total 1500ms, worst 713ms)
- backend writes this window: user_lists:set 0.1ms, user_lists:set 0.1ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms
- queries subscribed during window: 52 · active data subs after: 357 · dom mutations: 804 · heap: 284MB
- react commits by boundary (worst first):
  - `app-root`: 88 commits, total 1353ms, worst 329ms
  - `screen:game`: 88 commits, total 1351ms, worst 329ms
  - `game-body`: 88 commits, total 1350ms, worst 329ms
  - `op-tabs`: 88 commits, total 1348ms, worst 327ms

### tab → op:forum (cold mount)
- kind: `tab` · measured at +13403ms into run
- **settle**: 766ms · **first DOM change**: 242ms · **window**: 1320ms
- frames 43 · avg 30.6ms · p95 67ms · worst 275ms · >50ms: 4
- long tasks: 3 (total 531ms, worst 242ms)
- backend writes this window: user_vars:set 0.1ms, user_vars:set 0.0ms
- queries subscribed during window: 83 · active data subs after: 437 · dom mutations: 773 · heap: 313MB
- react commits by boundary (worst first):
  - `app-root`: 97 commits, total 499ms, worst 200ms
  - `screen:game`: 97 commits, total 497ms, worst 200ms
  - `game-body`: 97 commits, total 497ms, worst 199ms
  - `op-tabs`: 97 commits, total 494ms, worst 197ms

### tab → op:newspaper (cold mount)
- kind: `tab` · measured at +14724ms into run
- **settle**: 917ms · **first DOM change**: 214ms · **window**: 922ms
- frames 39 · avg 21.2ms · p95 17ms · worst 200ms · >50ms: 1
- long tasks: 2 (total 304ms, worst 214ms)
- queries subscribed during window: 14 · active data subs after: 450 · dom mutations: 205 · heap: 337MB
- react commits by boundary (worst first):
  - `app-root`: 23 commits, total 267ms, worst 189ms
  - `screen:game`: 23 commits, total 267ms, worst 189ms
  - `game-body`: 23 commits, total 267ms, worst 189ms
  - `op-tabs`: 23 commits, total 265ms, worst 187ms

### tab → op:rulebook (cold mount)
- kind: `tab` · measured at +15646ms into run
- **settle**: 873ms · **first DOM change**: 134ms · **window**: 1073ms
- frames 55 · avg 19.5ms · p95 33ms · worst 142ms · >50ms: 2
- long tasks: 1 (total 134ms, worst 134ms)
- backend writes this window: user_vars:set 0.0ms
- queries subscribed during window: 9 · active data subs after: 455 · dom mutations: 173 · heap: 348MB
- react commits by boundary (worst first):
  - `app-root`: 20 commits, total 144ms, worst 74ms
  - `screen:game`: 20 commits, total 143ms, worst 74ms
  - `game-body`: 20 commits, total 143ms, worst 74ms
  - `op-tabs`: 20 commits, total 142ms, worst 74ms

### tab → op:players (warm revisit)
- kind: `tab` · measured at +16720ms into run
- **settle**: 406ms · **first DOM change**: 154ms · **window**: 600ms
- frames 15 · avg 40.0ms · p95 233ms · worst 233ms · >50ms: 2
- long tasks: 2 (total 384ms, worst 230ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 15 · heap: 361MB
- react commits by boundary (worst first):
  - `game-body`: 4 commits, total 353ms, worst 212ms
  - `screen:game`: 4 commits, total 353ms, worst 212ms
  - `app-root`: 4 commits, total 353ms, worst 212ms
  - `op-tabs`: 4 commits, total 351ms, worst 212ms

### tab → op:config (warm revisit)
- kind: `tab` · measured at +17320ms into run
- **settle**: 160ms · **first DOM change**: 55ms · **window**: 341ms
- frames 14 · avg 24.4ms · p95 83ms · worst 83ms · >50ms: 2
- long tasks: 2 (total 158ms, worst 94ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 13 · heap: 387MB
- react commits by boundary (worst first):
  - `app-root`: 4 commits, total 119ms, worst 77ms
  - `game-body`: 4 commits, total 119ms, worst 77ms
  - `screen:game`: 4 commits, total 119ms, worst 77ms
  - `op-tabs`: 4 commits, total 118ms, worst 77ms

### tab → op:nightly (warm revisit)
- kind: `tab` · measured at +17661ms into run
- **settle**: 135ms · **first DOM change**: 60ms · **window**: 325ms
- frames 15 · avg 21.6ms · p95 66ms · worst 66ms · >50ms: 1
- long tasks: 2 (total 125ms, worst 74ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 15 · heap: 387MB
- react commits by boundary (worst first):
  - `app-root`: 4 commits, total 91ms, worst 47ms
  - `game-body`: 4 commits, total 91ms, worst 47ms
  - `screen:game`: 4 commits, total 91ms, worst 47ms
  - `op-tabs`: 4 commits, total 90ms, worst 46ms

### tab → op:forum (warm revisit)
- kind: `tab` · measured at +17987ms into run
- **settle**: 265ms · **first DOM change**: 201ms · **window**: 450ms
- frames 13 · avg 34.5ms · p95 208ms · worst 208ms · >50ms: 1
- long tasks: 2 (total 264ms, worst 212ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 13 · heap: 403MB
- react commits by boundary (worst first):
  - `screen:game`: 4 commits, total 233ms, worst 188ms
  - `app-root`: 4 commits, total 233ms, worst 188ms
  - `game-body`: 4 commits, total 233ms, worst 188ms
  - `op-tabs`: 4 commits, total 230ms, worst 185ms

### tab → op:newspaper (warm revisit)
- kind: `tab` · measured at +18436ms into run
- **settle**: 750ms · **first DOM change**: 67ms · **window**: 933ms
- frames 53 · avg 17.6ms · p95 17ms · worst 66ms · >50ms: 1
- long tasks: 1 (total 74ms, worst 74ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 92 · heap: 420MB
- react commits by boundary (worst first):
  - `app-root`: 3 commits, total 54ms, worst 53ms
  - `game-body`: 3 commits, total 54ms, worst 53ms
  - `screen:game`: 3 commits, total 54ms, worst 53ms
  - `op-tabs`: 3 commits, total 53ms, worst 52ms

### tab → op:rulebook (warm revisit)
- kind: `tab` · measured at +19370ms into run
- **settle**: 508ms · **first DOM change**: 190ms · **window**: 691ms
- frames 31 · avg 22.3ms · p95 17ms · worst 191ms · >50ms: 1
- long tasks: 1 (total 194ms, worst 194ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 48 · heap: 419MB
- react commits by boundary (worst first):
  - `screen:game`: 3 commits, total 179ms, worst 178ms
  - `app-root`: 3 commits, total 179ms, worst 178ms
  - `game-body`: 3 commits, total 179ms, worst 178ms
  - `op-tabs`: 3 commits, total 176ms, worst 176ms

### tab → op:players (warm revisit)
- kind: `tab` · measured at +20061ms into run
- **settle**: 208ms · **first DOM change**: 54ms · **window**: 391ms
- frames 16 · avg 24.4ms · p95 92ms · worst 92ms · >50ms: 2
- long tasks: 2 (total 170ms, worst 103ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 17 · heap: 446MB
- react commits by boundary (worst first):
  - `app-root`: 4 commits, total 127ms, worst 85ms
  - `game-body`: 4 commits, total 127ms, worst 85ms
  - `screen:game`: 4 commits, total 127ms, worst 85ms
  - `op-tabs`: 4 commits, total 127ms, worst 85ms

### rapid tab cycle (all 6 operator tabs)
- kind: `action` · measured at +20453ms into run
- **settle**: 1600ms · **first DOM change**: 3ms · **window**: 2000ms
- frames 84 · avg 23.8ms · p95 75ms · worst 192ms · >50ms: 6
- long tasks: 9 (total 684ms, worst 195ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 111 · heap: 497MB
- react commits by boundary (worst first):
  - `app-root`: 15 commits, total 582ms, worst 183ms
  - `screen:game`: 15 commits, total 582ms, worst 183ms
  - `game-body`: 15 commits, total 582ms, worst 183ms
  - `op-tabs`: 15 commits, total 577ms, worst 181ms

### tab → op:players (warm revisit)
- kind: `tab` · measured at +22453ms into run
- **settle**: 298ms · **first DOM change**: 192ms · **window**: 483ms
- frames 12 · avg 40.2ms · p95 174ms · worst 174ms · >50ms: 2
- long tasks: 2 (total 284ms, worst 192ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 15 · heap: 505MB
- react commits by boundary (worst first):
  - `game-body`: 5 commits, total 255ms, worst 180ms
  - `screen:game`: 5 commits, total 255ms, worst 180ms
  - `app-root`: 5 commits, total 255ms, worst 180ms
  - `op-tabs`: 5 commits, total 253ms, worst 178ms

### scroll: operator players table (vertical)
- kind: `scroll` · measured at +22936ms into run
- **settle**: 31ms · **first DOM change**: 31ms · **window**: 333ms
- frames 19 · avg 17.1ms · p95 24ms · worst 24ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 1 · heap: 506MB

### scroll: players table horizontal
- kind: `scroll` · measured at +23269ms into run
- **settle**: 24ms · **first DOM change**: 24ms · **window**: 1226ms
- frames 74 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 1 · heap: 508MB

### tab → op:nightly (warm revisit)
- kind: `tab` · measured at +24495ms into run
- **settle**: 362ms · **first DOM change**: 198ms · **window**: 549ms
- frames 14 · avg 39.2ms · p95 207ms · worst 207ms · >50ms: 2
- long tasks: 2 (total 361ms, worst 212ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 17 · heap: 532MB
- react commits by boundary (worst first):
  - `game-body`: 5 commits, total 304ms, worst 185ms
  - `screen:game`: 5 commits, total 304ms, worst 185ms
  - `app-root`: 5 commits, total 304ms, worst 185ms
  - `op-tabs`: 5 commits, total 301ms, worst 182ms

### scroll: operator nightly
- kind: `scroll` · measured at +25045ms into run
- **settle**: 2433ms · **first DOM change**: 26ms · **window**: 2442ms
- frames 144 · avg 17.0ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 5721 · heap: 212MB
- react commits by boundary (worst first):
  - `app-root`: 201 commits, total 850ms, worst 17ms
  - `screen:game`: 201 commits, total 846ms, worst 17ms
  - `game-body`: 201 commits, total 844ms, worst 17ms
  - `op-tabs`: 201 commits, total 843ms, worst 17ms

### modal open: Review/Certify (nightly)
- kind: `modal-open` · measured at +27487ms into run
- **settle**: 330ms · **first DOM change**: 309ms · **window**: 891ms
- frames 36 · avg 24.7ms · p95 17ms · worst 307ms · >50ms: 1
- long tasks: 1 (total 312ms, worst 312ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 610 · heap: 226MB
- react commits by boundary (worst first):
  - `app-root`: 4 commits, total 62ms, worst 44ms
  - `op-tabs`: 4 commits, total 62ms, worst 44ms
  - `game-body`: 4 commits, total 62ms, worst 44ms
  - `screen:game`: 4 commits, total 62ms, worst 44ms

### modal close: Review/Certify
- kind: `modal-close` · measured at +28378ms into run
- **settle**: 533ms · **first DOM change**: 164ms · **window**: 800ms
- frames 40 · avg 20.0ms · p95 17ms · worst 150ms · >50ms: 1
- long tasks: 1 (total 164ms, worst 164ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 43 · heap: 231MB
- react commits by boundary (worst first):
  - `app-root`: 4 commits, total 140ms, worst 132ms
  - `op-tabs`: 4 commits, total 140ms, worst 132ms
  - `game-body`: 4 commits, total 140ms, worst 132ms
  - `screen:game`: 4 commits, total 140ms, worst 132ms

### tab → op:forum (warm revisit)
- kind: `tab` · measured at +29178ms into run
- **settle**: 258ms · **first DOM change**: 192ms · **window**: 450ms
- frames 14 · avg 32.1ms · p95 199ms · worst 199ms · >50ms: 1
- long tasks: 2 (total 257ms, worst 202ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 13 · heap: 242MB
- react commits by boundary (worst first):
  - `app-root`: 4 commits, total 226ms, worst 177ms
  - `screen:game`: 4 commits, total 226ms, worst 177ms
  - `game-body`: 4 commits, total 226ms, worst 177ms
  - `op-tabs`: 4 commits, total 223ms, worst 175ms

### scroll: town square thread list
- kind: `scroll` · measured at +29628ms into run
- **settle**: 28ms · **first DOM change**: 28ms · **window**: 2358ms
- frames 141 · avg 16.7ms · p95 17ms · worst 24ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 1 · heap: 252MB
- react commits by boundary (worst first):
  - `app-root`: 121 commits, total 253ms, worst 3ms
  - `screen:game`: 121 commits, total 252ms, worst 3ms
  - `game-body`: 121 commits, total 250ms, worst 2ms
  - `op-tabs`: 121 commits, total 249ms, worst 2ms

### navigate: thread list → thread detail
- kind: `navigate` · measured at +31987ms into run
- **settle**: 716ms · **first DOM change**: 6ms · **window**: 1284ms
- frames 50 · avg 25.6ms · p95 17ms · worst 416ms · >50ms: 2
- long tasks: 1 (total 422ms, worst 422ms)
- backend writes this window: user_vars:set 0.0ms, user_vars:set 0.0ms
- queries subscribed during window: 2 · active data subs after: 456 · dom mutations: 775 · heap: 273MB
- react commits by boundary (worst first):
  - `app-root`: 17 commits, total 381ms, worst 220ms
  - `screen:game`: 17 commits, total 381ms, worst 220ms
  - `op-tabs`: 17 commits, total 381ms, worst 220ms
  - `game-body`: 17 commits, total 381ms, worst 220ms

### scroll: thread detail comments
- kind: `scroll` · measured at +33271ms into run
- **settle**: 30ms · **first DOM change**: 30ms · **window**: 2449ms
- frames 147 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 456 · dom mutations: 1 · heap: 291MB
- react commits by boundary (worst first):
  - `app-root`: 50 commits, total 105ms, worst 3ms
  - `screen:game`: 50 commits, total 104ms, worst 3ms
  - `op-tabs`: 50 commits, total 104ms, worst 3ms
  - `game-body`: 50 commits, total 104ms, worst 3ms

### navigate: thread detail → thread list
- kind: `navigate` · measured at +35720ms into run
- **settle**: 783ms · **first DOM change**: 18ms · **window**: 1300ms
- frames 57 · avg 22.8ms · p95 17ms · worst 367ms · >50ms: 1
- long tasks: 1 (total 382ms, worst 382ms)
- queries subscribed during window: 0 · active data subs after: 456 · dom mutations: 660 · heap: 310MB
- react commits by boundary (worst first):
  - `app-root`: 7 commits, total 361ms, worst 205ms
  - `screen:game`: 7 commits, total 361ms, worst 205ms
  - `op-tabs`: 7 commits, total 361ms, worst 205ms
  - `game-body`: 7 commits, total 361ms, worst 205ms

### navigate: open second thread (warm)
- kind: `navigate` · measured at +37020ms into run
- **settle**: 483ms · **first DOM change**: 54ms · **window**: 1000ms
- frames 54 · avg 18.5ms · p95 33ms · worst 67ms · >50ms: 1
- long tasks: 2 (total 139ms, worst 85ms)
- backend writes this window: user_vars:set 0.1ms, user_vars:set 0.0ms
- queries subscribed during window: 2 · active data subs after: 457 · dom mutations: 144 · heap: 306MB
- react commits by boundary (worst first):
  - `app-root`: 14 commits, total 142ms, worst 32ms
  - `op-tabs`: 14 commits, total 142ms, worst 31ms
  - `game-body`: 14 commits, total 142ms, worst 31ms
  - `screen:game`: 14 commits, total 142ms, worst 31ms

### navigate: back to thread list (warm)
- kind: `navigate` · measured at +38020ms into run
- **settle**: 775ms · **first DOM change**: 18ms · **window**: 1241ms
- frames 54 · avg 23.0ms · p95 17ms · worst 358ms · >50ms: 1
- long tasks: 1 (total 376ms, worst 376ms)
- queries subscribed during window: 0 · active data subs after: 457 · dom mutations: 658 · heap: 325MB
- react commits by boundary (worst first):
  - `app-root`: 6 commits, total 353ms, worst 200ms
  - `screen:game`: 6 commits, total 353ms, worst 200ms
  - `game-body`: 6 commits, total 353ms, worst 200ms
  - `op-tabs`: 6 commits, total 353ms, worst 200ms

### modal open: New Thread composer
- kind: `modal-open` · measured at +39261ms into run
- **settle**: 83ms · **first DOM change**: 64ms · **window**: 650ms
- frames 37 · avg 17.6ms · p95 17ms · worst 50ms · >50ms: 0
- long tasks: 1 (total 63ms, worst 63ms)
- queries subscribed during window: 0 · active data subs after: 457 · dom mutations: 38 · heap: 339MB
- react commits by boundary (worst first):
  - `op-tabs`: 4 commits, total 16ms, worst 13ms
  - `game-body`: 4 commits, total 16ms, worst 13ms
  - `screen:game`: 4 commits, total 16ms, worst 13ms
  - `app-root`: 4 commits, total 16ms, worst 13ms

### modal close: New Thread composer
- kind: `modal-close` · measured at +39911ms into run
- **settle**: 201ms · **first DOM change**: 34ms · **window**: 466ms
- frames 28 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 457 · dom mutations: 29 · heap: 349MB
- react commits by boundary (worst first):
  - `app-root`: 4 commits, total 21ms, worst 18ms
  - `op-tabs`: 4 commits, total 21ms, worst 18ms
  - `game-body`: 4 commits, total 21ms, worst 18ms
  - `screen:game`: 4 commits, total 21ms, worst 18ms

### tab → op:newspaper (warm revisit)
- kind: `tab` · measured at +40378ms into run
- **settle**: 858ms · **first DOM change**: 194ms · **window**: 1041ms
- frames 52 · avg 20.0ms · p95 17ms · worst 191ms · >50ms: 1
- long tasks: 1 (total 198ms, worst 198ms)
- queries subscribed during window: 0 · active data subs after: 457 · dom mutations: 90 · heap: 343MB
- react commits by boundary (worst first):
  - `game-body`: 3 commits, total 183ms, worst 182ms
  - `screen:game`: 3 commits, total 183ms, worst 182ms
  - `app-root`: 3 commits, total 183ms, worst 182ms
  - `op-tabs`: 3 commits, total 179ms, worst 179ms

### scroll: operator newspaper
- kind: `scroll` · measured at +41420ms into run
- **settle**: 34ms · **first DOM change**: 34ms · **window**: 2750ms
- frames 164 · avg 16.8ms · p95 17ms · worst 33ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 457 · dom mutations: 1 · heap: 359MB
- react commits by boundary (worst first):
  - `app-root`: 145 commits, total 309ms, worst 3ms
  - `screen:game`: 145 commits, total 306ms, worst 3ms
  - `game-body`: 145 commits, total 305ms, worst 3ms
  - `op-tabs`: 145 commits, total 305ms, worst 3ms

### tab → op:rulebook (warm revisit)
- kind: `tab` · measured at +44170ms into run
- **settle**: 449ms · **first DOM change**: 132ms · **window**: 632ms
- frames 31 · avg 20.4ms · p95 17ms · worst 132ms · >50ms: 1
- long tasks: 1 (total 137ms, worst 137ms)
- queries subscribed during window: 0 · active data subs after: 457 · dom mutations: 48 · heap: 364MB
- react commits by boundary (worst first):
  - `game-body`: 4 commits, total 123ms, worst 120ms
  - `screen:game`: 4 commits, total 123ms, worst 120ms
  - `app-root`: 4 commits, total 123ms, worst 120ms
  - `op-tabs`: 4 commits, total 121ms, worst 117ms

### scroll: operator config page
- kind: `scroll` · measured at +44803ms into run
- **settle**: 175ms · **first DOM change**: 29ms · **window**: 2350ms
- frames 140 · avg 16.8ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 457 · dom mutations: 3 · heap: 202MB
- react commits by boundary (worst first):
  - `app-root`: 51 commits, total 110ms, worst 3ms
  - `screen:game`: 51 commits, total 109ms, worst 3ms
  - `op-tabs`: 51 commits, total 108ms, worst 3ms
  - `game-body`: 51 commits, total 108ms, worst 3ms

### navigate: config → rule book subpage
- kind: `navigate` · measured at +47153ms into run
- **settle**: 7979ms · **first DOM change**: 6ms · **window**: 8016ms
- frames 460 · avg 17.4ms · p95 17ms · worst 350ms · >50ms: 1
- long tasks: 1 (total 359ms, worst 359ms)
- backend writes this window: user_vars:set 0.0ms, user_vars:set 0.0ms
- queries subscribed during window: 4 · active data subs after: 459 · dom mutations: 678 · heap: 206MB
- react commits by boundary (worst first):
  - `app-root`: 16 commits, total 347ms, worst 188ms
  - `screen:game`: 16 commits, total 347ms, worst 188ms
  - `op-tabs`: 16 commits, total 347ms, worst 188ms
  - `game-body`: 16 commits, total 347ms, worst 188ms
- notes: (settle timeout 8000ms)

### scroll: operator rulebook (scroll-linked TOC)
- kind: `scroll` · measured at +55170ms into run
- **settle**: 3059ms · **first DOM change**: 30ms · **window**: 3059ms
- frames 181 · avg 16.9ms · p95 17ms · worst 45ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 459 · dom mutations: 351 · heap: 222MB
- react commits by boundary (worst first):
  - `app-root`: 160 commits, total 331ms, worst 3ms
  - `screen:game`: 160 commits, total 328ms, worst 3ms
  - `game-body`: 160 commits, total 326ms, worst 3ms
  - `op-tabs`: 160 commits, total 326ms, worst 3ms

### modal open: rulebook table of contents
- kind: `modal-open` · measured at +58229ms into run
- **settle**: 73ms · **first DOM change**: 6ms · **window**: 641ms
- frames 36 · avg 17.8ms · p95 17ms · worst 56ms · >50ms: 1
- long tasks: 1 (total 66ms, worst 66ms)
- queries subscribed during window: 0 · active data subs after: 459 · dom mutations: 87 · heap: 234MB
- react commits by boundary (worst first):
  - `game-body`: 5 commits, total 15ms, worst 9ms
  - `screen:game`: 5 commits, total 15ms, worst 9ms
  - `app-root`: 5 commits, total 15ms, worst 9ms
  - `op-tabs`: 5 commits, total 15ms, worst 9ms

### modal close: rulebook TOC
- kind: `modal-close` · measured at +58870ms into run
- **settle**: 183ms · **first DOM change**: 20ms · **window**: 449ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 459 · dom mutations: 32 · heap: 236MB
- react commits by boundary (worst first):
  - `op-tabs`: 2 commits, total 4ms, worst 2ms
  - `game-body`: 2 commits, total 4ms, worst 2ms
  - `screen:game`: 2 commits, total 4ms, worst 2ms
  - `app-root`: 2 commits, total 4ms, worst 2ms

### navigate: rule book → config
- kind: `navigate` · measured at +59319ms into run
- **settle**: 500ms · **first DOM change**: 6ms · **window**: 1016ms
- frames 56 · avg 18.1ms · p95 17ms · worst 100ms · >50ms: 1
- long tasks: 1 (total 116ms, worst 116ms)
- queries subscribed during window: 0 · active data subs after: 459 · dom mutations: 153 · heap: 224MB
- react commits by boundary (worst first):
  - `app-root`: 8 commits, total 95ms, worst 64ms
  - `op-tabs`: 8 commits, total 94ms, worst 64ms
  - `game-body`: 8 commits, total 94ms, worst 64ms
  - `screen:game`: 8 commits, total 94ms, worst 64ms

### navigate: config → phone book subpage
- kind: `navigate` · measured at +60336ms into run
- **settle**: 7987ms · **first DOM change**: 3ms · **window**: 8016ms
- frames 463 · avg 17.3ms · p95 17ms · worst 300ms · >50ms: 1
- long tasks: 1 (total 305ms, worst 305ms)
- queries subscribed during window: 25 · active data subs after: 484 · dom mutations: 852 · heap: 248MB
- react commits by boundary (worst first):
  - `app-root`: 15 commits, total 296ms, worst 92ms
  - `screen:game`: 15 commits, total 296ms, worst 92ms
  - `op-tabs`: 15 commits, total 296ms, worst 92ms
  - `game-body`: 15 commits, total 296ms, worst 92ms
- notes: (settle timeout 8000ms)

### scroll: operator phone book
- kind: `scroll` · measured at +68353ms into run
- **settle**: 2351ms · **first DOM change**: 30ms · **window**: 2351ms
- frames 139 · avg 16.9ms · p95 17ms · worst 32ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 484 · dom mutations: 129 · heap: 223MB
- react commits by boundary (worst first):
  - `app-root`: 52 commits, total 113ms, worst 3ms
  - `screen:game`: 52 commits, total 112ms, worst 3ms
  - `game-body`: 52 commits, total 111ms, worst 3ms
  - `op-tabs`: 52 commits, total 111ms, worst 3ms

### navigate: phone book → config
- kind: `navigate` · measured at +70704ms into run
- **settle**: 507ms · **first DOM change**: 7ms · **window**: 1024ms
- frames 56 · avg 18.3ms · p95 17ms · worst 108ms · >50ms: 1
- long tasks: 1 (total 119ms, worst 119ms)
- queries subscribed during window: 0 · active data subs after: 484 · dom mutations: 158 · heap: 218MB
- react commits by boundary (worst first):
  - `app-root`: 8 commits, total 93ms, worst 60ms
  - `op-tabs`: 8 commits, total 93ms, worst 60ms
  - `game-body`: 8 commits, total 93ms, worst 60ms
  - `screen:game`: 8 commits, total 93ms, worst 60ms

### tab → op:config (warm revisit)
- kind: `tab` · measured at +71729ms into run
- **settle**: 599ms · **first DOM change**: 145ms · **window**: 787ms
- frames 40 · avg 19.5ms · p95 17ms · worst 133ms · >50ms: 1
- long tasks: 1 (total 145ms, worst 145ms)
- queries subscribed during window: 0 · active data subs after: 484 · dom mutations: 41 · heap: 200MB
- react commits by boundary (worst first):
  - `app-root`: 4 commits, total 148ms, worst 131ms
  - `game-body`: 4 commits, total 148ms, worst 131ms
  - `screen:game`: 4 commits, total 148ms, worst 131ms
  - `op-tabs`: 4 commits, total 145ms, worst 129ms

### scroll: operator roles table
- kind: `scroll` · measured at +72517ms into run
- **settle**: 2433ms · **first DOM change**: 27ms · **window**: 2444ms
- frames 146 · avg 16.7ms · p95 17ms · worst 27ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 484 · dom mutations: 1387 · heap: 225MB
- react commits by boundary (worst first):
  - `app-root`: 99 commits, total 279ms, worst 10ms
  - `screen:game`: 99 commits, total 277ms, worst 10ms
  - `game-body`: 99 commits, total 276ms, worst 10ms
  - `op-tabs`: 99 commits, total 276ms, worst 10ms

### navigate → game list
- kind: `navigate` · measured at +74961ms into run
- **settle**: 674ms · **first DOM change**: 2ms · **window**: 1424ms
- frames 76 · avg 18.7ms · p95 17ms · worst 175ms · >50ms: 1
- long tasks: 1 (total 196ms, worst 196ms)
- backend writes this window: user_vars:set 0.0ms
- queries subscribed during window: 0 · active data subs after: 484 · dom mutations: 271 · heap: 73MB
- react commits by boundary (worst first):
  - `app-root`: 9 commits, total 33ms, worst 19ms
  - `screen:allGames`: 3 commits, total 27ms, worst 19ms
  - `op-tabs`: 3 commits, total 1ms, worst 0ms
  - `game-body`: 3 commits, total 1ms, worst 0ms
  - `screen:game`: 3 commits, total 1ms, worst 0ms

### — Phase C — player game
> current user is a player in SIMPLY567

### open game: SIMPLY567 (as player)
- kind: `navigate` · measured at +76386ms into run
- **settle**: 2383ms · **first DOM change**: 3ms · **window**: 3334ms
- frames 173 · avg 19.3ms · p95 17ms · worst 292ms · >50ms: 3
- long tasks: 2 (total 368ms, worst 247ms)
- backend writes this window: user_vars:set 0.0ms, user_lists:set 0.0ms, user_lists:set 0.0ms, user_lists:set 0.0ms, user_lists:set 0.0ms, user_lists:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_lists:set 0.0ms, user_lists:set 0.1ms, user_lists:set 0.0ms, user_lists:set 0.0ms, user_lists:set 0.0ms, user_vars:set 0.0ms
- queries subscribed during window: 67 · active data subs after: 534 · dom mutations: 1746 · heap: 82MB
- react commits by boundary (worst first):
  - `app-root`: 104 commits, total 408ms, worst 124ms
  - `screen:game`: 93 commits, total 372ms, worst 124ms
  - `game-body`: 86 commits, total 365ms, worst 124ms
  - `player-tabs`: 60 commits, total 343ms, worst 124ms
  - `screen:allGames`: 5 commits, total 22ms, worst 6ms

### tab → player:newspaper (cold mount)
- kind: `tab` · measured at +79720ms into run
- **settle**: 380ms · **first DOM change**: 44ms · **window**: 932ms
- frames 46 · avg 20.3ms · p95 25ms · worst 158ms · >50ms: 1
- long tasks: 1 (total 160ms, worst 160ms)
- backend writes this window: user_vars:set 0.1ms
- queries subscribed during window: 11 · active data subs after: 544 · dom mutations: 200 · heap: 101MB
- react commits by boundary (worst first):
  - `app-root`: 28 commits, total 188ms, worst 84ms
  - `game-body`: 28 commits, total 188ms, worst 84ms
  - `screen:game`: 28 commits, total 188ms, worst 84ms
  - `player-tabs`: 28 commits, total 185ms, worst 84ms

### tab → player:eyesOnly (cold mount)
- kind: `tab` · measured at +80653ms into run
- **settle**: 433ms · **first DOM change**: 52ms · **window**: 983ms
- frames 52 · avg 18.9ms · p95 33ms · worst 92ms · >50ms: 1
- long tasks: 1 (total 52ms, worst 52ms)
- backend writes this window: user_vars:set 0.0ms
- queries subscribed during window: 8 · active data subs after: 551 · dom mutations: 96 · heap: 89MB
- react commits by boundary (worst first):
  - `app-root`: 19 commits, total 125ms, worst 20ms
  - `screen:game`: 19 commits, total 125ms, worst 20ms
  - `game-body`: 19 commits, total 125ms, worst 20ms
  - `player-tabs`: 19 commits, total 122ms, worst 19ms

### tab → player:ruleBook (cold mount)
- kind: `tab` · measured at +81636ms into run
- **settle**: 7834ms · **first DOM change**: 51ms · **window**: 8008ms
- frames 462 · avg 17.3ms · p95 17ms · worst 308ms · >50ms: 1
- long tasks: 3 (total 360ms, worst 243ms)
- queries subscribed during window: 2 · active data subs after: 553 · dom mutations: 669 · heap: 113MB
- react commits by boundary (worst first):
  - `app-root`: 18 commits, total 405ms, worst 127ms
  - `game-body`: 18 commits, total 404ms, worst 127ms
  - `screen:game`: 18 commits, total 404ms, worst 127ms
  - `player-tabs`: 18 commits, total 402ms, worst 127ms
- notes: (settle timeout 8000ms)

### tab → player:phoneBook (cold mount)
- kind: `tab` · measured at +89644ms into run
- **settle**: 7851ms · **first DOM change**: 75ms · **window**: 8016ms
- frames 456 · avg 17.6ms · p95 17ms · worst 333ms · >50ms: 3
- long tasks: 2 (total 408ms, worst 331ms)
- queries subscribed during window: 29 · active data subs after: 578 · dom mutations: 1014 · heap: 116MB
- react commits by boundary (worst first):
  - `app-root`: 27 commits, total 533ms, worst 109ms
  - `screen:game`: 27 commits, total 532ms, worst 109ms
  - `game-body`: 27 commits, total 532ms, worst 109ms
  - `player-tabs`: 27 commits, total 530ms, worst 109ms
- notes: (settle timeout 8000ms)

### tab → player:newspaper (warm revisit)
- kind: `tab` · measured at +97661ms into run
- **settle**: 343ms · **first DOM change**: 30ms · **window**: 525ms
- frames 29 · avg 18.1ms · p95 33ms · worst 42ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 51 · heap: 117MB
- react commits by boundary (worst first):
  - `app-root`: 16 commits, total 43ms, worst 24ms
  - `screen:game`: 16 commits, total 43ms, worst 24ms
  - `game-body`: 16 commits, total 43ms, worst 24ms
  - `player-tabs`: 16 commits, total 41ms, worst 21ms

### tab → player:eyesOnly (warm revisit)
- kind: `tab` · measured at +98186ms into run
- **settle**: 30ms · **first DOM change**: 26ms · **window**: 308ms
- frames 18 · avg 17.1ms · p95 24ms · worst 24ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 16 · heap: 122MB
- react commits by boundary (worst first):
  - `game-body`: 3 commits, total 20ms, worst 20ms
  - `screen:game`: 3 commits, total 20ms, worst 20ms
  - `app-root`: 3 commits, total 20ms, worst 20ms
  - `player-tabs`: 3 commits, total 18ms, worst 18ms

### tab → player:ruleBook (warm revisit)
- kind: `tab` · measured at +98494ms into run
- **settle**: 377ms · **first DOM change**: 27ms · **window**: 566ms
- frames 33 · avg 17.2ms · p95 17ms · worst 33ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 19 · heap: 132MB
- react commits by boundary (worst first):
  - `game-body`: 4 commits, total 37ms, worst 21ms
  - `screen:game`: 4 commits, total 37ms, worst 21ms
  - `app-root`: 4 commits, total 37ms, worst 21ms
  - `player-tabs`: 4 commits, total 34ms, worst 18ms

### tab → player:phoneBook (warm revisit)
- kind: `tab` · measured at +99061ms into run
- **settle**: 1234ms · **first DOM change**: 25ms · **window**: 1425ms
- frames 72 · avg 19.8ms · p95 17ms · worst 233ms · >50ms: 1
- long tasks: 1 (total 245ms, worst 245ms)
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 602 · heap: 133MB
- react commits by boundary (worst first):
  - `app-root`: 8 commits, total 251ms, worst 130ms
  - `game-body`: 8 commits, total 251ms, worst 130ms
  - `screen:game`: 8 commits, total 251ms, worst 130ms
  - `player-tabs`: 8 commits, total 249ms, worst 130ms

### tab → player:townSquare (warm revisit)
- kind: `tab` · measured at +100486ms into run
- **settle**: 212ms · **first DOM change**: 29ms · **window**: 400ms
- frames 23 · avg 17.4ms · p95 17ms · worst 33ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 37 · heap: 134MB
- react commits by boundary (worst first):
  - `app-root`: 4 commits, total 40ms, worst 23ms
  - `game-body`: 4 commits, total 40ms, worst 23ms
  - `screen:game`: 4 commits, total 40ms, worst 23ms
  - `player-tabs`: 4 commits, total 37ms, worst 21ms

### tab → player:townSquare (warm revisit)
- kind: `tab` · measured at +100886ms into run
- **settle**: 3ms · **first DOM change**: 3ms · **window**: 316ms
- frames 19 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 1 · heap: 135MB

### scroll: player town square
- kind: `scroll` · measured at +101202ms into run
- **settle**: 1496ms · **first DOM change**: 10ms · **window**: 2233ms
- frames 134 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 11 · heap: 105MB
- react commits by boundary (worst first):
  - `app-root`: 4 commits, total 32ms, worst 15ms
  - `player-tabs`: 4 commits, total 32ms, worst 15ms
  - `game-body`: 4 commits, total 32ms, worst 15ms
  - `screen:game`: 4 commits, total 32ms, worst 15ms

### tab → player:newspaper (warm revisit)
- kind: `tab` · measured at +103436ms into run
- **settle**: 344ms · **first DOM change**: 26ms · **window**: 524ms
- frames 31 · avg 16.9ms · p95 17ms · worst 24ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 26 · heap: 116MB
- react commits by boundary (worst first):
  - `app-root`: 17 commits, total 39ms, worst 20ms
  - `screen:game`: 17 commits, total 39ms, worst 20ms
  - `game-body`: 17 commits, total 39ms, worst 20ms
  - `player-tabs`: 17 commits, total 36ms, worst 18ms

### scroll: player newspaper
- kind: `scroll` · measured at +103961ms into run
- **settle**: 1732ms · **first DOM change**: 11ms · **window**: 2633ms
- frames 158 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 3 · heap: 103MB
- react commits by boundary (worst first):
  - `app-root`: 5 commits, total 51ms, worst 16ms
  - `game-body`: 5 commits, total 50ms, worst 16ms
  - `screen:game`: 5 commits, total 50ms, worst 16ms
  - `player-tabs`: 5 commits, total 50ms, worst 16ms

### tab → player:eyesOnly (warm revisit)
- kind: `tab` · measured at +106594ms into run
- **settle**: 98ms · **first DOM change**: 25ms · **window**: 308ms
- frames 18 · avg 17.1ms · p95 24ms · worst 24ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 17 · heap: 116MB
- react commits by boundary (worst first):
  - `app-root`: 6 commits, total 45ms, worst 20ms
  - `screen:game`: 6 commits, total 45ms, worst 19ms
  - `game-body`: 6 commits, total 45ms, worst 19ms
  - `player-tabs`: 6 commits, total 42ms, worst 17ms

### scroll: player eyes only
- kind: `scroll` · measured at +106902ms into run
- **settle**: 1796ms · **first DOM change**: 11ms · **window**: 2333ms
- frames 140 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 3 · heap: 104MB
- react commits by boundary (worst first):
  - `app-root`: 4 commits, total 41ms, worst 16ms
  - `player-tabs`: 4 commits, total 41ms, worst 16ms
  - `game-body`: 4 commits, total 41ms, worst 16ms
  - `screen:game`: 4 commits, total 41ms, worst 16ms

### tab → player:ruleBook (warm revisit)
- kind: `tab` · measured at +109236ms into run
- **settle**: 234ms · **first DOM change**: 25ms · **window**: 425ms
- frames 25 · avg 17.0ms · p95 17ms · worst 24ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 18 · heap: 109MB
- react commits by boundary (worst first):
  - `game-body`: 2 commits, total 20ms, worst 20ms
  - `screen:game`: 2 commits, total 20ms, worst 20ms
  - `app-root`: 2 commits, total 20ms, worst 20ms
  - `player-tabs`: 2 commits, total 18ms, worst 18ms

### scroll: player rulebook (scroll-linked)
- kind: `scroll` · measured at +109661ms into run
- **settle**: 2834ms · **first DOM change**: 9ms · **window**: 2835ms
- frames 170 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 341 · heap: 105MB
- react commits by boundary (worst first):
  - `app-root`: 10 commits, total 64ms, worst 14ms
  - `game-body`: 10 commits, total 64ms, worst 14ms
  - `screen:game`: 10 commits, total 64ms, worst 14ms
  - `player-tabs`: 10 commits, total 64ms, worst 14ms

### tab → player:phoneBook (warm revisit)
- kind: `tab` · measured at +112495ms into run
- **settle**: 1599ms · **first DOM change**: 24ms · **window**: 1782ms
- frames 93 · avg 19.2ms · p95 17ms · worst 233ms · >50ms: 1
- long tasks: 1 (total 233ms, worst 233ms)
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 622 · heap: 116MB
- react commits by boundary (worst first):
  - `app-root`: 9 commits, total 272ms, worst 122ms
  - `screen:game`: 9 commits, total 272ms, worst 122ms
  - `game-body`: 9 commits, total 272ms, worst 122ms
  - `player-tabs`: 9 commits, total 270ms, worst 122ms

### scroll: player phone book
- kind: `scroll` · measured at +114277ms into run
- **settle**: 2334ms · **first DOM change**: 11ms · **window**: 2334ms
- frames 140 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 135 · heap: 127MB
- react commits by boundary (worst first):
  - `game-body`: 4 commits, total 39ms, worst 14ms
  - `screen:game`: 4 commits, total 39ms, worst 14ms
  - `app-root`: 4 commits, total 39ms, worst 14ms
  - `player-tabs`: 4 commits, total 39ms, worst 14ms

### navigate → game list
- kind: `navigate` · measured at +116612ms into run
- **settle**: 607ms · **first DOM change**: 3ms · **window**: 1374ms
- frames 75 · avg 18.3ms · p95 17ms · worst 100ms · >50ms: 1
- long tasks: 2 (total 154ms, worst 101ms)
- backend writes this window: user_vars:set 0.0ms
- queries subscribed during window: 3 · active data subs after: 581 · dom mutations: 173 · heap: 134MB
- react commits by boundary (worst first):
  - `app-root`: 15 commits, total 77ms, worst 19ms
  - `game-body`: 8 commits, total 41ms, worst 14ms
  - `screen:game`: 8 commits, total 41ms, worst 14ms
  - `player-tabs`: 6 commits, total 41ms, worst 14ms
  - `screen:allGames`: 3 commits, total 28ms, worst 19ms

### — Phase D — newser game
> current user is the newser of SIMNEWS9

### open game: SIMNEWS9 (as newser)
- kind: `navigate` · measured at +117986ms into run
- **settle**: 2375ms · **first DOM change**: 3ms · **window**: 3341ms
- frames 175 · avg 19.1ms · p95 17ms · worst 292ms · >50ms: 3
- long tasks: 2 (total 363ms, worst 250ms)
- backend writes this window: user_vars:set 0.0ms, user_lists:set 0.1ms, user_lists:set 0.0ms, user_lists:set 0.0ms, user_lists:set 0.0ms, user_lists:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms
- queries subscribed during window: 54 · active data subs after: 624 · dom mutations: 1742 · heap: 85MB
- react commits by boundary (worst first):
  - `app-root`: 88 commits, total 386ms, worst 122ms
  - `screen:game`: 77 commits, total 352ms, worst 122ms
  - `game-body`: 70 commits, total 344ms, worst 122ms
  - `newser-tabs`: 60 commits, total 328ms, worst 122ms
  - `screen:allGames`: 5 commits, total 22ms, worst 6ms

### tab → newser:newspaper (cold mount)
- kind: `tab` · measured at +121327ms into run
- **settle**: 308ms · **first DOM change**: 44ms · **window**: 866ms
- frames 41 · avg 21.1ms · p95 33ms · worst 100ms · >50ms: 2
- long tasks: 1 (total 87ms, worst 87ms)
- backend writes this window: user_vars:set 0.0ms, user_vars:set 0.0ms, user_lists:set 0.0ms
- queries subscribed during window: 19 · active data subs after: 638 · dom mutations: 68 · heap: 115MB
- react commits by boundary (worst first):
  - `app-root`: 33 commits, total 168ms, worst 40ms
  - `screen:game`: 33 commits, total 167ms, worst 40ms
  - `game-body`: 33 commits, total 167ms, worst 40ms
  - `newser-tabs`: 33 commits, total 165ms, worst 40ms

### tab → newser:ruleBook (cold mount)
- kind: `tab` · measured at +122194ms into run
- **settle**: 8011ms · **first DOM change**: 25ms · **window**: 8016ms
- frames 467 · avg 17.2ms · p95 17ms · worst 250ms · >50ms: 1
- long tasks: 1 (total 195ms, worst 195ms)
- queries subscribed during window: 2 · active data subs after: 640 · dom mutations: 728 · heap: 93MB
- react commits by boundary (worst first):
  - `app-root`: 10 commits, total 205ms, worst 88ms
  - `screen:game`: 10 commits, total 205ms, worst 88ms
  - `game-body`: 10 commits, total 204ms, worst 88ms
  - `newser-tabs`: 10 commits, total 204ms, worst 88ms
- notes: (settle timeout 8000ms)

### tab → newser:phoneBook (cold mount)
- kind: `tab` · measured at +130211ms into run
- **settle**: 7835ms · **first DOM change**: 61ms · **window**: 8008ms
- frames 458 · avg 17.5ms · p95 17ms · worst 317ms · >50ms: 2
- long tasks: 2 (total 383ms, worst 321ms)
- queries subscribed during window: 31 · active data subs after: 667 · dom mutations: 1016 · heap: 132MB
- react commits by boundary (worst first):
  - `app-root`: 22 commits, total 359ms, worst 97ms
  - `screen:game`: 22 commits, total 359ms, worst 97ms
  - `game-body`: 22 commits, total 359ms, worst 97ms
  - `newser-tabs`: 22 commits, total 357ms, worst 97ms
- notes: (settle timeout 8000ms)

### tab → newser:newspaper (warm revisit)
- kind: `tab` · measured at +138219ms into run
- **settle**: 691ms · **first DOM change**: 13ms · **window**: 875ms
- frames 52 · avg 16.8ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 667 · dom mutations: 153 · heap: 121MB
- react commits by boundary (worst first):
  - `game-body`: 3 commits, total 11ms, worst 8ms
  - `screen:game`: 3 commits, total 11ms, worst 8ms
  - `app-root`: 3 commits, total 11ms, worst 8ms
  - `newser-tabs`: 3 commits, total 10ms, worst 6ms

### tab → newser:ruleBook (warm revisit)
- kind: `tab` · measured at +139094ms into run
- **settle**: 712ms · **first DOM change**: 8ms · **window**: 892ms
- frames 53 · avg 16.8ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 667 · dom mutations: 97 · heap: 123MB
- react commits by boundary (worst first):
  - `app-root`: 3 commits, total 8ms, worst 5ms
  - `screen:game`: 3 commits, total 8ms, worst 5ms
  - `game-body`: 3 commits, total 8ms, worst 4ms
  - `newser-tabs`: 3 commits, total 6ms, worst 3ms

### tab → newser:phoneBook (warm revisit)
- kind: `tab` · measured at +139985ms into run
- **settle**: 1261ms · **first DOM change**: 8ms · **window**: 1450ms
- frames 74 · avg 19.6ms · p95 17ms · worst 233ms · >50ms: 1
- long tasks: 1 (total 237ms, worst 237ms)
- queries subscribed during window: 0 · active data subs after: 667 · dom mutations: 601 · heap: 103MB
- react commits by boundary (worst first):
  - `screen:game`: 7 commits, total 226ms, worst 125ms
  - `app-root`: 7 commits, total 226ms, worst 125ms
  - `game-body`: 7 commits, total 226ms, worst 125ms
  - `newser-tabs`: 7 commits, total 224ms, worst 125ms

### tab → newser:townSquare (warm revisit)
- kind: `tab` · measured at +141436ms into run
- **settle**: 25ms · **first DOM change**: 13ms · **window**: 317ms
- frames 19 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 667 · dom mutations: 36 · heap: 123MB
- react commits by boundary (worst first):
  - `game-body`: 2 commits, total 9ms, worst 9ms
  - `screen:game`: 2 commits, total 9ms, worst 9ms
  - `app-root`: 2 commits, total 9ms, worst 9ms
  - `newser-tabs`: 2 commits, total 7ms, worst 7ms

### tab → newser:newspaper (warm revisit)
- kind: `tab` · measured at +141753ms into run
- **settle**: 666ms · **first DOM change**: 9ms · **window**: 849ms
- frames 51 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 667 · dom mutations: 128 · heap: 125MB
- react commits by boundary (worst first):
  - `game-body`: 3 commits, total 8ms, worst 5ms
  - `screen:game`: 3 commits, total 8ms, worst 5ms
  - `app-root`: 3 commits, total 8ms, worst 5ms
  - `newser-tabs`: 3 commits, total 6ms, worst 3ms

### scroll: newser newspaper editor
- kind: `scroll` · measured at +142602ms into run
- **settle**: 517ms · **first DOM change**: 10ms · **window**: 2733ms
- frames 164 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 667 · dom mutations: 28 · heap: 127MB
- react commits by boundary (worst first):
  - `app-root`: 3 commits, total 6ms, worst 2ms
  - `newser-tabs`: 3 commits, total 6ms, worst 2ms
  - `game-body`: 3 commits, total 6ms, worst 2ms
  - `screen:game`: 3 commits, total 6ms, worst 2ms

### navigate → game list
- kind: `navigate` · measured at +145335ms into run
- **settle**: 608ms · **first DOM change**: 3ms · **window**: 1375ms
- frames 78 · avg 17.6ms · p95 17ms · worst 67ms · >50ms: 1
- long tasks: 2 (total 134ms, worst 83ms)
- backend writes this window: user_vars:set 0.0ms
- queries subscribed during window: 0 · active data subs after: 667 · dom mutations: 175 · heap: 123MB
- react commits by boundary (worst first):
  - `app-root`: 10 commits, total 39ms, worst 19ms
  - `screen:allGames`: 3 commits, total 26ms, worst 18ms
  - `game-body`: 2 commits, total 4ms, worst 2ms
  - `screen:game`: 2 commits, total 4ms, worst 2ms
  - `newser-tabs`: 2 commits, total 4ms, worst 2ms

### — Phase E — modal lab
> every dialog with fixture data, opened/closed/measured

### modal open: MarkdownEditorDialog (heavy editor)
- kind: `modal-open` · measured at +146733ms into run
- **settle**: 345ms · **first DOM change**: 18ms · **window**: 1011ms
- frames 41 · avg 24.7ms · p95 17ms · worst 311ms · >50ms: 1
- long tasks: 2 (total 386ms, worst 325ms)
- backend writes this window: user_vars:set 0.0ms
- queries subscribed during window: 2 · active data subs after: 668 · dom mutations: 459 · heap: 87MB

### modal close: MarkdownEditorDialog (heavy editor)
- kind: `modal-close` · measured at +147744ms into run
- **settle**: 192ms · **first DOM change**: 40ms · **window**: 458ms
- frames 27 · avg 17.0ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 668 · dom mutations: 30 · heap: 101MB

### modal open: markdown-editor (for minimize test)
- kind: `modal-open` · measured at +148202ms into run
- **settle**: 300ms · **first DOM change**: 283ms · **window**: 867ms
- frames 36 · avg 24.1ms · p95 17ms · worst 283ms · >50ms: 1
- long tasks: 1 (total 286ms, worst 286ms)
- queries subscribed during window: 0 · active data subs after: 668 · dom mutations: 434 · heap: 102MB

### modal minimize: markdown-editor
- kind: `action` · measured at +149069ms into run
- **settle**: 289ms · **first DOM change**: 49ms · **window**: 850ms
- frames 50 · avg 17.0ms · p95 17ms · worst 33ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 668 · dom mutations: 37 · heap: 107MB
- react commits by boundary (worst first):
  - `screen:allGames`: 1 commits, total 1ms, worst 1ms
  - `app-root`: 1 commits, total 1ms, worst 1ms

### modal restore: markdown-editor
- kind: `action` · measured at +149919ms into run
- **settle**: 184ms · **first DOM change**: 38ms · **window**: 901ms
- frames 54 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 668 · dom mutations: 18 · heap: 111MB
- react commits by boundary (worst first):
  - `app-root`: 1 commits, total 1ms, worst 1ms
  - `screen:allGames`: 1 commits, total 1ms, worst 1ms

### modal close: markdown-editor (after restore)
- kind: `modal-close` · measured at +150820ms into run
- **settle**: 199ms · **first DOM change**: 35ms · **window**: 465ms
- frames 28 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 668 · dom mutations: 24 · heap: 124MB

### modal open: TownSquarePostDialog
- kind: `modal-open` · measured at +151285ms into run
- **settle**: 198ms · **first DOM change**: 20ms · **window**: 858ms
- frames 44 · avg 19.5ms · p95 17ms · worst 108ms · >50ms: 1
- long tasks: 2 (total 169ms, worst 116ms)
- queries subscribed during window: 1 · active data subs after: 669 · dom mutations: 126 · heap: 85MB

### modal close: TownSquarePostDialog
- kind: `modal-close` · measured at +152144ms into run
- **settle**: 208ms · **first DOM change**: 41ms · **window**: 475ms
- frames 28 · avg 16.9ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 105MB

### modal open: PlayerProfileDialogNEW
- kind: `modal-open` · measured at +152619ms into run
- **settle**: 125ms · **first DOM change**: 20ms · **window**: 793ms
- frames 42 · avg 18.8ms · p95 17ms · worst 108ms · >50ms: 1
- long tasks: 1 (total 112ms, worst 112ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 89 · heap: 105MB

### modal close: PlayerProfileDialogNEW
- kind: `modal-close` · measured at +153411ms into run
- **settle**: 182ms · **first DOM change**: 28ms · **window**: 449ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 108MB

### modal open: UserEditDialog
- kind: `modal-open` · measured at +153860ms into run
- **settle**: 108ms · **first DOM change**: 21ms · **window**: 775ms
- frames 42 · avg 18.4ms · p95 17ms · worst 91ms · >50ms: 1
- long tasks: 1 (total 96ms, worst 96ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 52 · heap: 103MB

### modal close: UserEditDialog
- kind: `modal-close` · measured at +154635ms into run
- **settle**: 183ms · **first DOM change**: 30ms · **window**: 450ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 107MB

### modal open: UserAddDialog
- kind: `modal-open` · measured at +155085ms into run
- **settle**: 117ms · **first DOM change**: 22ms · **window**: 768ms
- frames 42 · avg 18.2ms · p95 17ms · worst 83ms · >50ms: 1
- long tasks: 1 (total 91ms, worst 91ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 42 · heap: 101MB

### modal close: UserAddDialog
- kind: `modal-close` · measured at +155853ms into run
- **settle**: 182ms · **first DOM change**: 29ms · **window**: 449ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 105MB

### modal open: RoleEditDialog
- kind: `modal-open` · measured at +156302ms into run
- **settle**: 83ms · **first DOM change**: 23ms · **window**: 751ms
- frames 42 · avg 17.8ms · p95 17ms · worst 66ms · >50ms: 1
- long tasks: 1 (total 68ms, worst 68ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 41 · heap: 114MB

### modal close: RoleEditDialog
- kind: `modal-close` · measured at +157053ms into run
- **settle**: 199ms · **first DOM change**: 32ms · **window**: 465ms
- frames 28 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 118MB

### modal open: RoleAddDialog
- kind: `modal-open` · measured at +157519ms into run
- **settle**: 83ms · **first DOM change**: 24ms · **window**: 750ms
- frames 42 · avg 17.8ms · p95 17ms · worst 66ms · >50ms: 1
- long tasks: 1 (total 71ms, worst 71ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 38 · heap: 103MB

### modal close: RoleAddDialog
- kind: `modal-close` · measured at +158269ms into run
- **settle**: 183ms · **first DOM change**: 31ms · **window**: 450ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 83MB

### modal open: VoteEditorDialog
- kind: `modal-open` · measured at +158719ms into run
- **settle**: 100ms · **first DOM change**: 25ms · **window**: 768ms
- frames 42 · avg 18.2ms · p95 17ms · worst 83ms · >50ms: 1
- long tasks: 1 (total 91ms, worst 91ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 41 · heap: 102MB

### modal close: VoteEditorDialog
- kind: `modal-close` · measured at +159487ms into run
- **settle**: 182ms · **first DOM change**: 34ms · **window**: 449ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 106MB

### modal open: VoteEnableDialog
- kind: `modal-open` · measured at +159935ms into run
- **settle**: 83ms · **first DOM change**: 26ms · **window**: 750ms
- frames 42 · avg 17.8ms · p95 17ms · worst 66ms · >50ms: 1
- long tasks: 1 (total 68ms, worst 68ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 37 · heap: 90MB

### modal close: VoteEnableDialog
- kind: `modal-close` · measured at +160685ms into run
- **settle**: 200ms · **first DOM change**: 33ms · **window**: 466ms
- frames 28 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 94MB

### modal open: ActionEditorDialog
- kind: `modal-open` · measured at +161152ms into run
- **settle**: 100ms · **first DOM change**: 27ms · **window**: 766ms
- frames 42 · avg 18.2ms · p95 17ms · worst 83ms · >50ms: 1
- long tasks: 1 (total 91ms, worst 91ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 37 · heap: 93MB

### modal close: ActionEditorDialog
- kind: `modal-close` · measured at +161919ms into run
- **settle**: 200ms · **first DOM change**: 34ms · **window**: 466ms
- frames 28 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 97MB

### modal open: BioEditorDialog
- kind: `modal-open` · measured at +162385ms into run
- **settle**: 158ms · **first DOM change**: 27ms · **window**: 825ms
- frames 42 · avg 19.6ms · p95 17ms · worst 141ms · >50ms: 1
- long tasks: 1 (total 143ms, worst 143ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 66 · heap: 106MB

### modal close: BioEditorDialog
- kind: `modal-close` · measured at +163210ms into run
- **settle**: 200ms · **first DOM change**: 37ms · **window**: 466ms
- frames 28 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 99MB

### modal open: TagCellEditor
- kind: `modal-open` · measured at +163677ms into run
- **settle**: 150ms · **first DOM change**: 28ms · **window**: 817ms
- frames 43 · avg 19.0ms · p95 17ms · worst 116ms · >50ms: 1
- long tasks: 1 (total 124ms, worst 124ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 55 · heap: 103MB

### modal close: TagCellEditor
- kind: `modal-close` · measured at +164494ms into run
- **settle**: 183ms · **first DOM change**: 39ms · **window**: 450ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 107MB

### modal open: AddTagDialog
- kind: `modal-open` · measured at +164944ms into run
- **settle**: 109ms · **first DOM change**: 31ms · **window**: 775ms
- frames 42 · avg 18.4ms · p95 17ms · worst 91ms · >50ms: 1
- long tasks: 1 (total 98ms, worst 98ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 35 · heap: 86MB

### modal close: AddTagDialog
- kind: `modal-close` · measured at +165719ms into run
- **settle**: 200ms · **first DOM change**: 40ms · **window**: 466ms
- frames 28 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 91MB

### modal open: AddTagDialog (edit mode + trigger script)
- kind: `modal-open` · measured at +166185ms into run
- **settle**: 133ms · **first DOM change**: 31ms · **window**: 800ms
- frames 42 · avg 19.0ms · p95 17ms · worst 116ms · >50ms: 1
- long tasks: 1 (total 116ms, worst 116ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 56 · heap: 94MB

### modal close: AddTagDialog (edit mode + trigger script)
- kind: `modal-close` · measured at +166985ms into run
- **settle**: 208ms · **first DOM change**: 46ms · **window**: 475ms
- frames 28 · avg 16.9ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 99MB

### modal open: ChooseDayDialog
- kind: `modal-open` · measured at +167460ms into run
- **settle**: 117ms · **first DOM change**: 37ms · **window**: 784ms
- frames 42 · avg 18.6ms · p95 17ms · worst 99ms · >50ms: 1
- long tasks: 1 (total 108ms, worst 108ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 34 · heap: 98MB

### modal close: ChooseDayDialog
- kind: `modal-close` · measured at +168245ms into run
- **settle**: 207ms · **first DOM change**: 45ms · **window**: 474ms
- frames 28 · avg 16.9ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 103MB

### modal open: DaySelectionDialog
- kind: `modal-open` · measured at +168719ms into run
- **settle**: 108ms · **first DOM change**: 38ms · **window**: 759ms
- frames 41 · avg 18.5ms · p95 17ms · worst 91ms · >50ms: 1
- long tasks: 1 (total 91ms, worst 91ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 32 · heap: 114MB

### modal close: DaySelectionDialog
- kind: `modal-close` · measured at +169478ms into run
- **settle**: 191ms · **first DOM change**: 46ms · **window**: 457ms
- frames 27 · avg 16.9ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 101MB

### modal open: DaysPerGameDayDialog
- kind: `modal-open` · measured at +169935ms into run
- **settle**: 108ms · **first DOM change**: 38ms · **window**: 775ms
- frames 42 · avg 18.4ms · p95 17ms · worst 91ms · >50ms: 1
- long tasks: 1 (total 93ms, worst 93ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 34 · heap: 112MB

### modal close: DaysPerGameDayDialog
- kind: `modal-close` · measured at +170710ms into run
- **settle**: 192ms · **first DOM change**: 46ms · **window**: 458ms
- frames 27 · avg 17.0ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 118MB

### modal open: DeleteRoleConfirmationDialog
- kind: `modal-open` · measured at +171169ms into run
- **settle**: 108ms · **first DOM change**: 39ms · **window**: 775ms
- frames 42 · avg 18.4ms · p95 17ms · worst 91ms · >50ms: 1
- long tasks: 1 (total 97ms, worst 97ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 34 · heap: 106MB

### modal close: DeleteRoleConfirmationDialog
- kind: `modal-close` · measured at +171944ms into run
- **settle**: 208ms · **first DOM change**: 44ms · **window**: 475ms
- frames 28 · avg 16.9ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 111MB

### modal open: EditInfoDialog
- kind: `modal-open` · measured at +172419ms into run
- **settle**: 117ms · **first DOM change**: 40ms · **window**: 783ms
- frames 42 · avg 18.6ms · p95 17ms · worst 100ms · >50ms: 1
- long tasks: 1 (total 101ms, worst 101ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 42 · heap: 124MB

### modal close: EditInfoDialog
- kind: `modal-close` · measured at +173202ms into run
- **settle**: 192ms · **first DOM change**: 46ms · **window**: 458ms
- frames 27 · avg 17.0ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 86MB

### modal open: JoinedGameOptionsDialog
- kind: `modal-open` · measured at +173660ms into run
- **settle**: 150ms · **first DOM change**: 42ms · **window**: 818ms
- frames 42 · avg 19.4ms · p95 17ms · worst 133ms · >50ms: 1
- long tasks: 1 (total 138ms, worst 138ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 42 · heap: 95MB

### modal close: JoinedGameOptionsDialog
- kind: `modal-close` · measured at +174478ms into run
- **settle**: 207ms · **first DOM change**: 47ms · **window**: 474ms
- frames 28 · avg 16.9ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 109MB

### modal open: ArchivedGamesDialog
- kind: `modal-open` · measured at +174952ms into run
- **settle**: 150ms · **first DOM change**: 39ms · **window**: 818ms
- frames 42 · avg 19.4ms · p95 17ms · worst 133ms · >50ms: 1
- long tasks: 1 (total 134ms, worst 134ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 32 · heap: 116MB

### modal close: ArchivedGamesDialog
- kind: `modal-close` · measured at +175770ms into run
- **settle**: 207ms · **first DOM change**: 46ms · **window**: 474ms
- frames 28 · avg 16.9ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 106MB

### modal open: MarkdownInputBuilderDialog
- kind: `modal-open` · measured at +176244ms into run
- **settle**: 117ms · **first DOM change**: 41ms · **window**: 783ms
- frames 42 · avg 18.6ms · p95 17ms · worst 100ms · >50ms: 1
- long tasks: 1 (total 107ms, worst 107ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 53 · heap: 103MB

### modal close: MarkdownInputBuilderDialog
- kind: `modal-close` · measured at +177027ms into run
- **settle**: 209ms · **first DOM change**: 49ms · **window**: 475ms
- frames 28 · avg 17.0ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 109MB

### modal open: MarkdownVariableDialog
- kind: `modal-open` · measured at +177502ms into run
- **settle**: 109ms · **first DOM change**: 41ms · **window**: 767ms
- frames 36 · avg 21.1ms · p95 91ms · worst 92ms · >50ms: 2
- long tasks: 1 (total 98ms, worst 98ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 31 · heap: 121MB

### modal close: MarkdownVariableDialog
- kind: `modal-close` · measured at +178269ms into run
- **settle**: 233ms · **first DOM change**: 68ms · **window**: 499ms
- frames 28 · avg 17.8ms · p95 17ms · worst 58ms · >50ms: 1
- long tasks: 1 (total 68ms, worst 68ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 106MB

### modal open: NightlyCertificationDialog
- kind: `modal-open` · measured at +178769ms into run
- **settle**: 192ms · **first DOM change**: 43ms · **window**: 858ms
- frames 42 · avg 20.4ms · p95 17ms · worst 174ms · >50ms: 1
- long tasks: 1 (total 178ms, worst 178ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 182 · heap: 113MB

### modal close: NightlyCertificationDialog
- kind: `modal-close` · measured at +179627ms into run
- **settle**: 217ms · **first DOM change**: 55ms · **window**: 483ms
- frames 28 · avg 17.2ms · p95 17ms · worst 33ms · >50ms: 0
- long tasks: 1 (total 55ms, worst 55ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 87MB

### modal open: ScheduleTableUpdateDialog
- kind: `modal-open` · measured at +180110ms into run
- **settle**: 167ms · **first DOM change**: 45ms · **window**: 833ms
- frames 43 · avg 19.4ms · p95 17ms · worst 133ms · >50ms: 1
- long tasks: 1 (total 139ms, worst 139ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 60 · heap: 104MB

### modal close: ScheduleTableUpdateDialog
- kind: `modal-close` · measured at +180944ms into run
- **settle**: 217ms · **first DOM change**: 53ms · **window**: 483ms
- frames 28 · avg 17.2ms · p95 17ms · worst 33ms · >50ms: 0
- long tasks: 1 (total 53ms, worst 53ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 110MB

### modal open: ColumnActionsDialog
- kind: `modal-open` · measured at +181427ms into run
- **settle**: 133ms · **first DOM change**: 45ms · **window**: 783ms
- frames 41 · avg 19.1ms · p95 17ms · worst 116ms · >50ms: 1
- long tasks: 1 (total 116ms, worst 116ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 43 · heap: 101MB

### modal close: ColumnActionsDialog
- kind: `modal-close` · measured at +182210ms into run
- **settle**: 200ms · **first DOM change**: 53ms · **window**: 466ms
- frames 27 · avg 17.3ms · p95 17ms · worst 33ms · >50ms: 0
- long tasks: 1 (total 52ms, worst 52ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 106MB

### modal open: PhoneBookTocDialog
- kind: `modal-open` · measured at +182677ms into run
- **settle**: 150ms · **first DOM change**: 46ms · **window**: 818ms
- frames 42 · avg 19.4ms · p95 17ms · worst 133ms · >50ms: 1
- long tasks: 1 (total 139ms, worst 139ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 42 · heap: 111MB

### modal close: PhoneBookTocDialog
- kind: `modal-close` · measured at +183495ms into run
- **settle**: 207ms · **first DOM change**: 54ms · **window**: 474ms
- frames 27 · avg 17.5ms · p95 25ms · worst 33ms · >50ms: 0
- long tasks: 1 (total 54ms, worst 54ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 107MB

### modal open: TableOfContentsDialog (rulebook)
- kind: `modal-open` · measured at +183969ms into run
- **settle**: 150ms · **first DOM change**: 47ms · **window**: 817ms
- frames 42 · avg 19.4ms · p95 17ms · worst 133ms · >50ms: 1
- long tasks: 1 (total 136ms, worst 136ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 88 · heap: 109MB

### modal close: TableOfContentsDialog (rulebook)
- kind: `modal-close` · measured at +184785ms into run
- **settle**: 217ms · **first DOM change**: 56ms · **window**: 483ms
- frames 28 · avg 17.2ms · p95 17ms · worst 33ms · >50ms: 0
- long tasks: 1 (total 56ms, worst 56ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 115MB

### modal open: ImportDraftDialog
- kind: `modal-open` · measured at +185269ms into run
- **settle**: 193ms · **first DOM change**: 48ms · **window**: 859ms
- frames 43 · avg 19.9ms · p95 17ms · worst 108ms · >50ms: 2
- long tasks: 2 (total 188ms, worst 112ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 120 · heap: 90MB

### modal close: ImportDraftDialog
- kind: `modal-close` · measured at +186128ms into run
- **settle**: 207ms · **first DOM change**: 60ms · **window**: 474ms
- frames 27 · avg 17.5ms · p95 17ms · worst 42ms · >50ms: 0
- long tasks: 1 (total 60ms, worst 60ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 105MB

### modal open: NewspaperSectionOptionsDialog
- kind: `modal-open` · measured at +186602ms into run
- **settle**: 158ms · **first DOM change**: 49ms · **window**: 825ms
- frames 42 · avg 19.6ms · p95 17ms · worst 141ms · >50ms: 1
- long tasks: 1 (total 145ms, worst 145ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 39 · heap: 107MB

### modal close: NewspaperSectionOptionsDialog
- kind: `modal-close` · measured at +187427ms into run
- **settle**: 200ms · **first DOM change**: 55ms · **window**: 467ms
- frames 27 · avg 17.3ms · p95 17ms · worst 33ms · >50ms: 0
- long tasks: 1 (total 55ms, worst 55ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 113MB

### modal open: PlayerPreviewModal
- kind: `modal-open` · measured at +187894ms into run
- **settle**: 217ms · **first DOM change**: 49ms · **window**: 883ms
- frames 42 · avg 21.0ms · p95 17ms · worst 200ms · >50ms: 1
- long tasks: 1 (total 200ms, worst 200ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 93 · heap: 118MB

### modal close: PlayerPreviewModal
- kind: `modal-close` · measured at +188777ms into run
- **settle**: 226ms · **first DOM change**: 59ms · **window**: 491ms
- frames 28 · avg 17.5ms · p95 17ms · worst 42ms · >50ms: 0
- long tasks: 1 (total 59ms, worst 59ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 124MB

### modal open: TownSquareImageDialog
- kind: `modal-open` · measured at +189269ms into run
- **settle**: 133ms · **first DOM change**: 50ms · **window**: 800ms
- frames 42 · avg 19.0ms · p95 17ms · worst 116ms · >50ms: 1
- long tasks: 1 (total 124ms, worst 124ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 36 · heap: 118MB

### modal close: TownSquareImageDialog
- kind: `modal-close` · measured at +190069ms into run
- **settle**: 225ms · **first DOM change**: 65ms · **window**: 491ms
- frames 28 · avg 17.5ms · p95 17ms · worst 42ms · >50ms: 0
- long tasks: 1 (total 65ms, worst 65ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 87MB

### modal open: TownSquareLinkDialog
- kind: `modal-open` · measured at +190560ms into run
- **settle**: 133ms · **first DOM change**: 51ms · **window**: 800ms
- frames 42 · avg 19.0ms · p95 17ms · worst 116ms · >50ms: 1
- long tasks: 1 (total 123ms, worst 123ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 39 · heap: 103MB

### modal close: TownSquareLinkDialog
- kind: `modal-close` · measured at +191360ms into run
- **settle**: 208ms · **first DOM change**: 58ms · **window**: 475ms
- frames 27 · avg 17.6ms · p95 17ms · worst 42ms · >50ms: 0
- long tasks: 1 (total 57ms, worst 57ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 109MB

### modal open: TownSquareMoreOptionsDialog
- kind: `modal-open` · measured at +191835ms into run
- **settle**: 142ms · **first DOM change**: 52ms · **window**: 809ms
- frames 42 · avg 19.2ms · p95 17ms · worst 125ms · >50ms: 1
- long tasks: 1 (total 125ms, worst 125ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 36 · heap: 101MB

### modal close: TownSquareMoreOptionsDialog
- kind: `modal-close` · measured at +192645ms into run
- **settle**: 207ms · **first DOM change**: 58ms · **window**: 474ms
- frames 27 · avg 17.5ms · p95 17ms · worst 42ms · >50ms: 0
- long tasks: 1 (total 58ms, worst 58ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 107MB

### modal open: ConfirmDialog
- kind: `modal-open` · measured at +193118ms into run
- **settle**: 142ms · **first DOM change**: 53ms · **window**: 808ms
- frames 42 · avg 19.2ms · p95 17ms · worst 125ms · >50ms: 1
- long tasks: 1 (total 125ms, worst 125ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 102MB

### modal close: ConfirmDialog
- kind: `modal-close` · measured at +193927ms into run
- **settle**: 225ms · **first DOM change**: 60ms · **window**: 492ms
- frames 28 · avg 17.5ms · p95 17ms · worst 42ms · >50ms: 0
- long tasks: 1 (total 59ms, worst 59ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 109MB

### modal open: ImageUploadDialog
- kind: `modal-open` · measured at +194418ms into run
- **settle**: 134ms · **first DOM change**: 52ms · **window**: 800ms
- frames 42 · avg 19.0ms · p95 17ms · worst 116ms · >50ms: 1
- long tasks: 1 (total 124ms, worst 124ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 44 · heap: 105MB

### modal close: ImageUploadDialog
- kind: `modal-close` · measured at +195218ms into run
- **settle**: 225ms · **first DOM change**: 60ms · **window**: 491ms
- frames 28 · avg 17.5ms · p95 17ms · worst 42ms · >50ms: 0
- long tasks: 1 (total 59ms, worst 59ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 47 · heap: 112MB

### modal open: SaveHistoryDialog
- kind: `modal-open` · measured at +195710ms into run
- **settle**: 142ms · **first DOM change**: 51ms · **window**: 808ms
- frames 42 · avg 19.2ms · p95 17ms · worst 125ms · >50ms: 1
- long tasks: 1 (total 125ms, worst 125ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 40 · heap: 109MB

### modal close: SaveHistoryDialog
- kind: `modal-close` · measured at +196518ms into run
- **settle**: 208ms · **first DOM change**: 61ms · **window**: 475ms
- frames 27 · avg 17.6ms · p95 17ms · worst 42ms · >50ms: 0
- long tasks: 1 (total 60ms, worst 60ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 116MB

### modal open: UnsavedChangesDialog
- kind: `modal-open` · measured at +196993ms into run
- **settle**: 133ms · **first DOM change**: 51ms · **window**: 800ms
- frames 42 · avg 19.0ms · p95 17ms · worst 116ms · >50ms: 1
- long tasks: 1 (total 119ms, worst 119ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 88MB

### modal close: UnsavedChangesDialog
- kind: `modal-close` · measured at +197793ms into run
- **settle**: 225ms · **first DOM change**: 60ms · **window**: 492ms
- frames 28 · avg 17.5ms · p95 17ms · worst 42ms · >50ms: 0
- long tasks: 1 (total 60ms, worst 60ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 95MB

### modal open: ViewOnlyPreviewModal
- kind: `modal-open` · measured at +198285ms into run
- **settle**: 133ms · **first DOM change**: 52ms · **window**: 800ms
- frames 42 · avg 19.0ms · p95 17ms · worst 116ms · >50ms: 1
- long tasks: 1 (total 119ms, worst 119ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 28 · heap: 110MB

### modal close: ViewOnlyPreviewModal
- kind: `modal-close` · measured at +199085ms into run
- **settle**: 208ms · **first DOM change**: 60ms · **window**: 475ms
- frames 27 · avg 17.6ms · p95 17ms · worst 42ms · >50ms: 0
- long tasks: 1 (total 60ms, worst 60ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 97MB

### modal open: DeleteGameConfirmationDialog
- kind: `modal-open` · measured at +199560ms into run
- **settle**: 133ms · **first DOM change**: 54ms · **window**: 801ms
- frames 42 · avg 19.0ms · p95 17ms · worst 116ms · >50ms: 1
- long tasks: 1 (total 123ms, worst 123ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 34 · heap: 112MB

### modal close: DeleteGameConfirmationDialog
- kind: `modal-close` · measured at +200361ms into run
- **settle**: 207ms · **first DOM change**: 60ms · **window**: 474ms
- frames 27 · avg 17.5ms · p95 17ms · worst 42ms · >50ms: 0
- long tasks: 1 (total 60ms, worst 60ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 101MB

### — Tour complete
> 164 steps in 198.9s
