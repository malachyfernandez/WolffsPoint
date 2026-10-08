# WolffsPoint Perf Audit — Simulated Run

- **Started**: 2026-10-08T15:16:06.191Z
- **Run duration**: 199.7s
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
| 4 | action: New WolffsPoint dialog open | modal-open | 60ms | 27ms | p95 17ms, 0 slow | 0 | app-root 1ms (2 commits) | 🟢 ok |
| 5 | modal close: New WolffsPoint | modal-close | 183ms | 12ms | p95 17ms, 0 slow | 0 | screen:allGames 1ms (1 commits) | 🟢 ok |
| 6 | Phase B — operator game | note | 0ms | — | — | 0 | — | 🟢 ok |
| 7 | open game: SIMOP1234 (as operator) | navigate | 3572ms | 4ms | p95 400ms, 15 slow | 16 (442ms worst) | app-root 2680ms (523 commits) | 🔴 slow |
| 8 | tab → op:config (cold mount) | tab | 2098ms | 381ms | p95 83ms, 7 slow | 4 (382ms worst) | app-root 821ms (143 commits) | 🔴 slow |
| 9 | tab → op:nightly (cold mount) | tab | 1891ms | 682ms | p95 217ms, 6 slow | 5 (684ms worst) | app-root 1294ms (88 commits) | 🔴 slow |
| 10 | tab → op:forum (cold mount) | tab | 748ms | 234ms | p95 67ms, 4 slow | 2 (235ms worst) | app-root 483ms (97 commits) | 🟡 meh |
| 11 | tab → op:newspaper (cold mount) | tab | 769ms | 212ms | p95 83ms, 2 slow | 2 (213ms worst) | app-root 267ms (27 commits) | 🟡 meh |
| 12 | tab → op:rulebook (cold mount) | tab | 803ms | 114ms | p95 17ms, 1 slow | 1 (114ms worst) | app-root 93ms (16 commits) | 🟡 meh |
| 13 | tab → op:players (warm revisit) | tab | 434ms | 188ms | p95 192ms, 3 slow | 2 (225ms worst) | app-root 381ms (4 commits) | 🟡 meh |
| 14 | tab → op:config (warm revisit) | tab | 154ms | 53ms | p95 75ms, 2 slow | 2 (90ms worst) | app-root 111ms (4 commits) | 🟢 ok |
| 15 | tab → op:nightly (warm revisit) | tab | 124ms | 50ms | p95 58ms, 1 slow | 2 (63ms worst) | app-root 85ms (4 commits) | 🟢 ok |
| 16 | tab → op:forum (warm revisit) | tab | 257ms | 195ms | p95 199ms, 1 slow | 2 (206ms worst) | game-body 226ms (4 commits) | 🟡 meh |
| 17 | tab → op:newspaper (warm revisit) | tab | 726ms | 54ms | p95 17ms, 1 slow | 1 (60ms worst) | game-body 42ms (3 commits) | 🟡 meh |
| 18 | tab → op:rulebook (warm revisit) | tab | 500ms | 185ms | p95 17ms, 1 slow | 1 (189ms worst) | app-root 170ms (3 commits) | 🟡 meh |
| 19 | tab → op:players (warm revisit) | tab | 191ms | 52ms | p95 83ms, 2 slow | 2 (94ms worst) | game-body 117ms (4 commits) | 🟢 ok |
| 20 | rapid tab cycle (all 6 operator tabs) | action | 1542ms | 3ms | p95 67ms, 5 slow | 6 (183ms worst) | app-root 539ms (15 commits) | 🔴 slow |
| 21 | tab → op:players (warm revisit) | tab | 305ms | 193ms | p95 183ms, 2 slow | 2 (194ms worst) | game-body 257ms (5 commits) | 🟡 meh |
| 22 | scroll: operator players table (vertical) | scroll | 30ms | 30ms | p95 24ms, 0 slow | 0 | — | 🟢 ok |
| 23 | scroll: players table horizontal | scroll | 23ms | 23ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 24 | tab → op:nightly (warm revisit) | tab | 346ms | 187ms | p95 199ms, 2 slow | 2 (200ms worst) | app-root 293ms (5 commits) | 🟡 meh |
| 25 | scroll: operator nightly | scroll | 2420ms | 25ms | p95 17ms, 0 slow | 0 | app-root 810ms (210 commits) | 🔴 slow |
| 26 | modal open: Review/Certify (nightly) | modal-open | 324ms | 302ms | p95 17ms, 1 slow | 1 (304ms worst) | app-root 58ms (4 commits) | 🔴 slow |
| 27 | modal close: Review/Certify | modal-close | 541ms | 156ms | p95 17ms, 1 slow | 1 (156ms worst) | op-tabs 134ms (4 commits) | 🟡 meh |
| 28 | tab → op:forum (warm revisit) | tab | 239ms | 182ms | p95 191ms, 1 slow | 1 (192ms worst) | app-root 209ms (4 commits) | 🟡 meh |
| 29 | scroll: town square thread list | scroll | 29ms | 29ms | p95 17ms, 0 slow | 0 | app-root 223ms (121 commits) | 🟢 ok |
| 30 | navigate: thread list → thread detail | navigate | 699ms | 6ms | p95 17ms, 2 slow | 1 (411ms worst) | app-root 373ms (17 commits) | 🔴 slow |
| 31 | scroll: thread detail comments | scroll | 33ms | 33ms | p95 17ms, 0 slow | 0 | app-root 94ms (50 commits) | 🟢 ok |
| 32 | navigate: thread detail → thread list | navigate | 775ms | 18ms | p95 17ms, 1 slow | 1 (371ms worst) | app-root 356ms (7 commits) | 🔴 slow |
| 33 | navigate: open second thread (warm) | navigate | 483ms | 52ms | p95 33ms, 1 slow | 2 (85ms worst) | app-root 136ms (14 commits) | 🟢 ok |
| 34 | navigate: back to thread list (warm) | navigate | 766ms | 22ms | p95 17ms, 1 slow | 1 (366ms worst) | app-root 348ms (6 commits) | 🔴 slow |
| 35 | modal open: New Thread composer | modal-open | 104ms | 77ms | p95 61ms, 2 slow | 1 (77ms worst) | screen:game 18ms (4 commits) | 🟢 ok |
| 36 | modal close: New Thread composer | modal-close | 199ms | 38ms | p95 17ms, 0 slow | 0 | app-root 24ms (4 commits) | 🟢 ok |
| 37 | tab → op:newspaper (warm revisit) | tab | 866ms | 197ms | p95 17ms, 1 slow | 1 (202ms worst) | app-root 187ms (3 commits) | 🟡 meh |
| 38 | scroll: operator newspaper | scroll | 35ms | 35ms | p95 17ms, 2 slow | 0 | app-root 280ms (131 commits) | 🟢 ok |
| 39 | tab → op:rulebook (warm revisit) | tab | 1067ms | 704ms | p95 43ms, 1 slow | 1 (741ms worst) | app-root 668ms (4 commits) | 🔴 slow |
| 40 | scroll: operator config page | scroll | 198ms | 39ms | p95 148ms, 10 slow | 0 | app-root 93ms (21 commits) | 🟢 ok |
| 41 | navigate: config → rule book subpage | navigate | 7955ms | 15ms | p95 17ms, 2 slow | 1 (644ms worst) | app-root 578ms (16 commits) | 🔴 slow |
| 42 | scroll: operator rulebook (scroll-linked TOC) | scroll | 3058ms | 43ms | p95 17ms, 0 slow | 0 | app-root 345ms (161 commits) | 🔴 slow |
| 43 | modal open: rulebook table of contents | modal-open | 96ms | 10ms | p95 17ms, 1 slow | 1 (87ms worst) | op-tabs 17ms (5 commits) | 🟢 ok |
| 44 | modal close: rulebook TOC | modal-close | 184ms | 23ms | p95 17ms, 0 slow | 0 | app-root 4ms (2 commits) | 🟢 ok |
| 45 | navigate: rule book → config | navigate | 525ms | 6ms | p95 17ms, 1 slow | 1 (136ms worst) | op-tabs 107ms (8 commits) | 🟡 meh |
| 46 | navigate: config → phone book subpage | navigate | 7988ms | 3ms | p95 17ms, 1 slow | 1 (306ms worst) | app-root 303ms (15 commits) | 🔴 slow |
| 47 | scroll: operator phone book | scroll | 2367ms | 36ms | p95 17ms, 0 slow | 0 | app-root 119ms (53 commits) | 🔴 slow |
| 48 | navigate: phone book → config | navigate | 515ms | 7ms | p95 17ms, 1 slow | 1 (130ms worst) | app-root 100ms (8 commits) | 🟡 meh |
| 49 | tab → op:config (warm revisit) | tab | 600ms | 152ms | p95 25ms, 1 slow | 1 (152ms worst) | app-root 160ms (4 commits) | 🟡 meh |
| 50 | scroll: operator roles table | scroll | 2429ms | 27ms | p95 17ms, 0 slow | 0 | app-root 287ms (99 commits) | 🔴 slow |
| 51 | navigate → game list | navigate | 674ms | 2ms | p95 17ms, 1 slow | 1 (194ms worst) | app-root 32ms (10 commits) | 🟡 meh |
| 52 | Phase C — player game | note | 0ms | — | — | 0 | — | 🟢 ok |
| 53 | open game: SIMPLY567 (as player) | navigate | 2383ms | 4ms | p95 17ms, 3 slow | 2 (245ms worst) | app-root 408ms (104 commits) | 🔴 slow |
| 54 | tab → player:newspaper (cold mount) | tab | 384ms | 45ms | p95 25ms, 1 slow | 1 (161ms worst) | app-root 189ms (28 commits) | 🟡 meh |
| 55 | tab → player:eyesOnly (cold mount) | tab | 442ms | 59ms | p95 42ms, 1 slow | 1 (59ms worst) | app-root 134ms (18 commits) | 🟢 ok |
| 56 | tab → player:ruleBook (cold mount) | tab | 7834ms | 51ms | p95 17ms, 1 slow | 3 (244ms worst) | app-root 433ms (21 commits) | 🔴 slow |
| 57 | tab → player:phoneBook (cold mount) | tab | 7851ms | 78ms | p95 17ms, 2 slow | 2 (327ms worst) | app-root 511ms (29 commits) | 🔴 slow |
| 58 | tab → player:newspaper (warm revisit) | tab | 335ms | 29ms | p95 33ms, 0 slow | 0 | app-root 42ms (17 commits) | 🟢 ok |
| 59 | tab → player:eyesOnly (warm revisit) | tab | 29ms | 25ms | p95 24ms, 0 slow | 0 | game-body 20ms (3 commits) | 🟢 ok |
| 60 | tab → player:ruleBook (warm revisit) | tab | 201ms | 25ms | p95 17ms, 0 slow | 0 | app-root 36ms (4 commits) | 🟢 ok |
| 61 | tab → player:phoneBook (warm revisit) | tab | 1226ms | 24ms | p95 17ms, 1 slow | 1 (240ms worst) | app-root 253ms (8 commits) | 🔴 slow |
| 62 | tab → player:townSquare (warm revisit) | tab | 41ms | 29ms | p95 33ms, 0 slow | 0 | game-body 24ms (2 commits) | 🟢 ok |
| 63 | tab → player:townSquare (warm revisit) | tab | 73ms | 3ms | p95 17ms, 0 slow | 0 | player-tabs 16ms (2 commits) | 🟢 ok |
| 64 | scroll: player town square | scroll | 1756ms | 10ms | p95 17ms, 0 slow | 0 | app-root 41ms (5 commits) | 🔴 slow |
| 65 | tab → player:newspaper (warm revisit) | tab | 522ms | 25ms | p95 17ms, 0 slow | 0 | app-root 39ms (17 commits) | 🟡 meh |
| 66 | scroll: player newspaper | scroll | 1816ms | 11ms | p95 17ms, 0 slow | 0 | app-root 32ms (4 commits) | 🔴 slow |
| 67 | tab → player:eyesOnly (warm revisit) | tab | 176ms | 25ms | p95 17ms, 0 slow | 0 | app-root 46ms (6 commits) | 🟢 ok |
| 68 | scroll: player eyes only | scroll | 1822ms | 10ms | p95 17ms, 0 slow | 0 | app-root 33ms (4 commits) | 🔴 slow |
| 69 | tab → player:ruleBook (warm revisit) | tab | 492ms | 25ms | p95 17ms, 0 slow | 0 | app-root 36ms (4 commits) | 🟢 ok |
| 70 | scroll: player rulebook (scroll-linked) | scroll | 2834ms | 9ms | p95 17ms, 0 slow | 0 | app-root 47ms (7 commits) | 🔴 slow |
| 71 | tab → player:phoneBook (warm revisit) | tab | 1600ms | 25ms | p95 17ms, 1 slow | 1 (252ms worst) | app-root 268ms (9 commits) | 🔴 slow |
| 72 | scroll: player phone book | scroll | 2334ms | 11ms | p95 17ms, 0 slow | 0 | app-root 67ms (7 commits) | 🔴 slow |
| 73 | navigate → game list | navigate | 623ms | 3ms | p95 17ms, 1 slow | 2 (97ms worst) | app-root 61ms (12 commits) | 🟡 meh |
| 74 | Phase D — newser game | note | 0ms | — | — | 0 | — | 🟢 ok |
| 75 | open game: SIMNEWS9 (as newser) | navigate | 2392ms | 3ms | p95 17ms, 3 slow | 2 (249ms worst) | app-root 388ms (87 commits) | 🔴 slow |
| 76 | tab → newser:newspaper (cold mount) | tab | 304ms | 45ms | p95 33ms, 2 slow | 1 (87ms worst) | app-root 172ms (33 commits) | 🟢 ok |
| 77 | tab → newser:ruleBook (cold mount) | tab | 8011ms | 25ms | p95 17ms, 1 slow | 1 (195ms worst) | app-root 202ms (10 commits) | 🔴 slow |
| 78 | tab → newser:phoneBook (cold mount) | tab | 7836ms | 61ms | p95 17ms, 2 slow | 2 (319ms worst) | app-root 359ms (22 commits) | 🔴 slow |
| 79 | tab → newser:newspaper (warm revisit) | tab | 691ms | 13ms | p95 17ms, 0 slow | 0 | game-body 12ms (3 commits) | 🟡 meh |
| 80 | tab → newser:ruleBook (warm revisit) | tab | 713ms | 8ms | p95 17ms, 0 slow | 0 | app-root 8ms (3 commits) | 🟡 meh |
| 81 | tab → newser:phoneBook (warm revisit) | tab | 1252ms | 8ms | p95 17ms, 1 slow | 1 (239ms worst) | app-root 224ms (7 commits) | 🔴 slow |
| 82 | tab → newser:townSquare (warm revisit) | tab | 24ms | 13ms | p95 17ms, 0 slow | 0 | screen:game 9ms (2 commits) | 🟢 ok |
| 83 | tab → newser:newspaper (warm revisit) | tab | 667ms | 9ms | p95 17ms, 0 slow | 0 | app-root 8ms (3 commits) | 🟡 meh |
| 84 | scroll: newser newspaper editor | scroll | 517ms | 10ms | p95 17ms, 0 slow | 0 | app-root 6ms (3 commits) | 🟡 meh |
| 85 | navigate → game list | navigate | 600ms | 3ms | p95 17ms, 1 slow | 1 (82ms worst) | app-root 38ms (10 commits) | 🟡 meh |
| 86 | Phase E — modal lab | note | 0ms | — | — | 0 | — | 🟢 ok |
| 87 | modal open: MarkdownEditorDialog (heavy editor) | modal-open | 347ms | 18ms | p95 17ms, 1 slow | 2 (324ms worst) | — | 🔴 slow |
| 88 | modal close: MarkdownEditorDialog (heavy editor) | modal-close | 192ms | 42ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 89 | modal open: markdown-editor (for minimize test) | modal-open | 300ms | 282ms | p95 17ms, 1 slow | 1 (286ms worst) | — | 🟡 meh |
| 90 | modal minimize: markdown-editor | action | 288ms | 49ms | p95 17ms, 0 slow | 0 | screen:allGames 1ms (1 commits) | 🟢 ok |
| 91 | modal restore: markdown-editor | action | 192ms | 41ms | p95 17ms, 0 slow | 0 | screen:allGames 1ms (1 commits) | 🟢 ok |
| 92 | modal close: markdown-editor (after restore) | modal-close | 183ms | 36ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 93 | modal open: TownSquarePostDialog | modal-open | 0ms | — | — | 0 | — | ⚠️ error |
| 94 | modal close: TownSquarePostDialog | modal-close | 19ms | 19ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 95 | modal open: PlayerProfileDialogNEW | modal-open | 125ms | 19ms | p95 17ms, 1 slow | 1 (111ms worst) | — | 🟢 ok |
| 96 | modal close: PlayerProfileDialogNEW | modal-close | 183ms | 29ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 97 | modal open: UserEditDialog | modal-open | 108ms | 21ms | p95 17ms, 1 slow | 1 (94ms worst) | — | 🟢 ok |
| 98 | modal close: UserEditDialog | modal-close | 183ms | 30ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 99 | modal open: UserAddDialog | modal-open | 108ms | 21ms | p95 17ms, 1 slow | 1 (92ms worst) | — | 🟢 ok |
| 100 | modal close: UserAddDialog | modal-close | 183ms | 29ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 101 | modal open: RoleEditDialog | modal-open | 75ms | 21ms | p95 17ms, 1 slow | 1 (66ms worst) | — | 🟢 ok |
| 102 | modal close: RoleEditDialog | modal-close | 183ms | 31ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 103 | modal open: RoleAddDialog | modal-open | 83ms | 24ms | p95 17ms, 1 slow | 1 (67ms worst) | — | 🟢 ok |
| 104 | modal close: RoleAddDialog | modal-close | 183ms | 31ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 105 | modal open: VoteEditorDialog | modal-open | 108ms | 23ms | p95 17ms, 1 slow | 1 (94ms worst) | — | 🟢 ok |
| 106 | modal close: VoteEditorDialog | modal-close | 200ms | 33ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 107 | modal open: VoteEnableDialog | modal-open | 83ms | 25ms | p95 17ms, 1 slow | 1 (67ms worst) | — | 🟢 ok |
| 108 | modal close: VoteEnableDialog | modal-close | 200ms | 33ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 109 | modal open: ActionEditorDialog | modal-open | 100ms | 26ms | p95 17ms, 1 slow | 1 (89ms worst) | — | 🟢 ok |
| 110 | modal close: ActionEditorDialog | modal-close | 200ms | 34ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 111 | modal open: BioEditorDialog | modal-open | 158ms | 27ms | p95 17ms, 1 slow | 1 (142ms worst) | — | 🟡 meh |
| 112 | modal close: BioEditorDialog | modal-close | 184ms | 36ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 113 | modal open: TagCellEditor | modal-open | 150ms | 27ms | p95 17ms, 1 slow | 1 (136ms worst) | — | 🟡 meh |
| 114 | modal close: TagCellEditor | modal-close | 200ms | 38ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 115 | modal open: AddTagDialog | modal-open | 117ms | 29ms | p95 17ms, 1 slow | 1 (101ms worst) | — | 🟢 ok |
| 116 | modal close: AddTagDialog | modal-close | 183ms | 38ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 117 | modal open: AddTagDialog (edit mode + trigger script) | modal-open | 142ms | 31ms | p95 17ms, 1 slow | 1 (116ms worst) | — | 🟢 ok |
| 118 | modal close: AddTagDialog (edit mode + trigger script) | modal-close | 207ms | 46ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 119 | modal open: ChooseDayDialog | modal-open | 125ms | 36ms | p95 17ms, 1 slow | 1 (110ms worst) | — | 🟢 ok |
| 120 | modal close: ChooseDayDialog | modal-close | 207ms | 44ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 121 | modal open: DaySelectionDialog | modal-open | 100ms | 36ms | p95 17ms, 1 slow | 1 (90ms worst) | — | 🟢 ok |
| 122 | modal close: DaySelectionDialog | modal-close | 191ms | 43ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 123 | modal open: DaysPerGameDayDialog | modal-open | 109ms | 38ms | p95 17ms, 1 slow | 1 (91ms worst) | — | 🟢 ok |
| 124 | modal close: DaysPerGameDayDialog | modal-close | 192ms | 44ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 125 | modal open: DeleteRoleConfirmationDialog | modal-open | 108ms | 37ms | p95 17ms, 1 slow | 1 (91ms worst) | — | 🟢 ok |
| 126 | modal close: DeleteRoleConfirmationDialog | modal-close | 208ms | 44ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 127 | modal open: EditInfoDialog | modal-open | 108ms | 38ms | p95 17ms, 1 slow | 1 (99ms worst) | — | 🟢 ok |
| 128 | modal close: EditInfoDialog | modal-close | 207ms | 45ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 129 | modal open: JoinedGameOptionsDialog | modal-open | 150ms | 38ms | p95 17ms, 1 slow | 1 (136ms worst) | — | 🟡 meh |
| 130 | modal close: JoinedGameOptionsDialog | modal-close | 209ms | 46ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 131 | modal open: ArchivedGamesDialog | modal-open | 150ms | 40ms | p95 17ms, 1 slow | 1 (134ms worst) | — | 🟡 meh |
| 132 | modal close: ArchivedGamesDialog | modal-close | 208ms | 45ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 133 | modal open: MarkdownInputBuilderDialog | modal-open | 117ms | 40ms | p95 17ms, 1 slow | 1 (105ms worst) | — | 🟢 ok |
| 134 | modal close: MarkdownInputBuilderDialog | modal-close | 208ms | 47ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 135 | modal open: MarkdownVariableDialog | modal-open | 108ms | 40ms | p95 17ms, 1 slow | 1 (97ms worst) | — | 🟢 ok |
| 136 | modal close: MarkdownVariableDialog | modal-close | 207ms | 47ms | p95 17ms, 0 slow | 0 | — | 🟢 ok |
| 137 | modal open: NightlyCertificationDialog | modal-open | 183ms | 41ms | p95 17ms, 1 slow | 1 (172ms worst) | — | 🟡 meh |
| 138 | modal close: NightlyCertificationDialog | modal-close | 216ms | 53ms | p95 17ms, 0 slow | 1 (53ms worst) | — | 🟢 ok |
| 139 | modal open: ScheduleTableUpdateDialog | modal-open | 152ms | 43ms | p95 17ms, 1 slow | 1 (137ms worst) | — | 🟡 meh |
| 140 | modal close: ScheduleTableUpdateDialog | modal-close | 217ms | 52ms | p95 17ms, 0 slow | 1 (52ms worst) | — | 🟢 ok |
| 141 | modal open: ColumnActionsDialog | modal-open | 125ms | 44ms | p95 17ms, 1 slow | 1 (110ms worst) | — | 🟢 ok |
| 142 | modal close: ColumnActionsDialog | modal-close | 200ms | 51ms | p95 17ms, 0 slow | 1 (51ms worst) | — | 🟢 ok |
| 143 | modal open: PhoneBookTocDialog | modal-open | 150ms | 45ms | p95 17ms, 1 slow | 1 (135ms worst) | — | 🟡 meh |
| 144 | modal close: PhoneBookTocDialog | modal-close | 199ms | 53ms | p95 17ms, 0 slow | 1 (53ms worst) | — | 🟢 ok |
| 145 | modal open: TableOfContentsDialog (rulebook) | modal-open | 150ms | 46ms | p95 17ms, 1 slow | 1 (136ms worst) | — | 🟡 meh |
| 146 | modal close: TableOfContentsDialog (rulebook) | modal-close | 217ms | 55ms | p95 17ms, 0 slow | 1 (55ms worst) | — | 🟢 ok |
| 147 | modal open: ImportDraftDialog | modal-open | 198ms | 48ms | p95 17ms, 2 slow | 2 (114ms worst) | — | 🟢 ok |
| 148 | modal close: ImportDraftDialog | modal-close | 208ms | 59ms | p95 17ms, 0 slow | 1 (59ms worst) | — | 🟢 ok |
| 149 | modal open: NewspaperSectionOptionsDialog | modal-open | 158ms | 49ms | p95 17ms, 1 slow | 1 (142ms worst) | — | 🟡 meh |
| 150 | modal close: NewspaperSectionOptionsDialog | modal-close | 217ms | 55ms | p95 17ms, 0 slow | 1 (55ms worst) | — | 🟢 ok |
| 151 | modal open: PlayerPreviewModal | modal-open | 208ms | 49ms | p95 17ms, 1 slow | 1 (195ms worst) | — | 🟡 meh |
| 152 | modal close: PlayerPreviewModal | modal-close | 225ms | 59ms | p95 17ms, 0 slow | 1 (59ms worst) | — | 🟢 ok |
| 153 | modal open: TownSquareImageDialog | modal-open | 133ms | 49ms | p95 17ms, 1 slow | 1 (121ms worst) | — | 🟡 meh |
| 154 | modal close: TownSquareImageDialog | modal-close | 208ms | 61ms | p95 17ms, 0 slow | 1 (60ms worst) | — | 🟢 ok |
| 155 | modal open: TownSquareLinkDialog | modal-open | 133ms | 52ms | p95 17ms, 1 slow | 1 (121ms worst) | — | 🟡 meh |
| 156 | modal close: TownSquareLinkDialog | modal-close | 225ms | 58ms | p95 17ms, 0 slow | 1 (57ms worst) | — | 🟢 ok |
| 157 | modal open: TownSquareMoreOptionsDialog | modal-open | 133ms | 51ms | p95 17ms, 1 slow | 1 (120ms worst) | — | 🟢 ok |
| 158 | modal close: TownSquareMoreOptionsDialog | modal-close | 200ms | 57ms | p95 17ms, 0 slow | 1 (56ms worst) | — | 🟢 ok |
| 159 | modal open: ConfirmDialog | modal-open | 133ms | 51ms | p95 17ms, 1 slow | 1 (118ms worst) | — | 🟢 ok |
| 160 | modal close: ConfirmDialog | modal-close | 217ms | 56ms | p95 17ms, 0 slow | 1 (56ms worst) | — | 🟢 ok |
| 161 | modal open: ImageUploadDialog | modal-open | 133ms | 50ms | p95 17ms, 1 slow | 1 (121ms worst) | — | 🟡 meh |
| 162 | modal close: ImageUploadDialog | modal-close | 225ms | 60ms | p95 17ms, 0 slow | 1 (59ms worst) | — | 🟢 ok |
| 163 | modal open: SaveHistoryDialog | modal-open | 142ms | 52ms | p95 17ms, 1 slow | 1 (128ms worst) | — | 🟡 meh |
| 164 | modal close: SaveHistoryDialog | modal-close | 208ms | 58ms | p95 17ms, 0 slow | 1 (58ms worst) | — | 🟢 ok |
| 165 | modal open: UnsavedChangesDialog | modal-open | 133ms | 52ms | p95 17ms, 1 slow | 1 (118ms worst) | — | 🟢 ok |
| 166 | modal close: UnsavedChangesDialog | modal-close | 208ms | 60ms | p95 17ms, 0 slow | 1 (60ms worst) | — | 🟢 ok |
| 167 | modal open: ViewOnlyPreviewModal | modal-open | 133ms | 53ms | p95 17ms, 1 slow | 1 (118ms worst) | — | 🟢 ok |
| 168 | modal close: ViewOnlyPreviewModal | modal-close | 225ms | 59ms | p95 17ms, 0 slow | 1 (58ms worst) | — | 🟢 ok |
| 169 | modal open: DeleteGameConfirmationDialog | modal-open | 133ms | 53ms | p95 17ms, 1 slow | 1 (122ms worst) | — | 🟡 meh |
| 170 | modal close: DeleteGameConfirmationDialog | modal-close | 225ms | 58ms | p95 17ms, 0 slow | 1 (58ms worst) | — | 🟢 ok |
| 171 | Tour complete | note | 0ms | — | — | 0 | — | 🟢 ok |

## Slowest steps

- **8011ms** — tab → newser:ruleBook (cold mount) (longTasks 1/195ms, p95 frame 17ms)
- **7988ms** — navigate: config → phone book subpage (longTasks 1/306ms, p95 frame 17ms)
- **7955ms** — navigate: config → rule book subpage (longTasks 1/644ms, p95 frame 17ms)
- **7851ms** — tab → player:phoneBook (cold mount) (longTasks 2/327ms, p95 frame 17ms)
- **7836ms** — tab → newser:phoneBook (cold mount) (longTasks 2/319ms, p95 frame 17ms)
- **7834ms** — tab → player:ruleBook (cold mount) (longTasks 3/244ms, p95 frame 17ms)
- **3572ms** — open game: SIMOP1234 (as operator) (longTasks 16/442ms, p95 frame 400ms)
- **3058ms** — scroll: operator rulebook (scroll-linked TOC) (longTasks 0/0ms, p95 frame 17ms)
- **2834ms** — scroll: player rulebook (scroll-linked) (longTasks 0/0ms, p95 frame 17ms)
- **2429ms** — scroll: operator roles table (longTasks 0/0ms, p95 frame 17ms)

## Detail log

### — Perf audit tour starting
> UA: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/146.0.0.0 Safari/537.36

### — Phase A — game list

### scroll: game list
- kind: `scroll` · measured at +1891ms into run
- **settle**: 4ms · **first DOM change**: 4ms · **window**: 4ms
- 
- queries subscribed during window: 0 · active data subs after: 18 · dom mutations: 1 · heap: 59MB

### action: New WolffsPoint dialog open
- kind: `modal-open` · measured at +1895ms into run
- **settle**: 60ms · **first DOM change**: 27ms · **window**: 566ms
- frames 33 · avg 17.2ms · p95 17ms · worst 33ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 18 · dom mutations: 32 · heap: 62MB
- react commits by boundary (worst first):
  - `app-root`: 2 commits, total 1ms, worst 1ms
  - `screen:allGames`: 1 commits, total 1ms, worst 1ms

### modal close: New WolffsPoint
- kind: `modal-close` · measured at +2462ms into run
- **settle**: 183ms · **first DOM change**: 12ms · **window**: 450ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 18 · dom mutations: 27 · heap: 63MB
- react commits by boundary (worst first):
  - `screen:allGames`: 1 commits, total 1ms, worst 1ms
  - `app-root`: 1 commits, total 1ms, worst 1ms

### — Phase B — operator game
> current user owns SIMOP1234

### open game: SIMOP1234 (as operator)
- kind: `navigate` · measured at +2912ms into run
- **settle**: 3572ms · **first DOM change**: 4ms · **window**: 3835ms
- frames 48 · avg 79.3ms · p95 400ms · worst 475ms · >50ms: 15
- long tasks: 16 (total 2604ms, worst 442ms)
- backend writes this window: user_vars:set 0.2ms, user_vars:set 0.1ms, user_vars:set 0.1ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms
- queries subscribed during window: 528 · active data subs after: 285 · dom mutations: 843 · heap: 271MB
- react commits by boundary (worst first):
  - `app-root`: 523 commits, total 2680ms, worst 211ms
  - `screen:game`: 514 commits, total 2641ms, worst 211ms
  - `game-body`: 508 commits, total 2628ms, worst 211ms
  - `op-tabs`: 506 commits, total 2623ms, worst 211ms
  - `screen:allGames`: 7 commits, total 27ms, worst 7ms

### tab → op:config (cold mount)
- kind: `tab` · measured at +6748ms into run
- **settle**: 2098ms · **first DOM change**: 381ms · **window**: 2664ms
- frames 104 · avg 25.6ms · p95 83ms · worst 392ms · >50ms: 7
- long tasks: 4 (total 743ms, worst 382ms)
- backend writes this window: user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms
- queries subscribed during window: 93 · active data subs after: 331 · dom mutations: 1076 · heap: 345MB
- react commits by boundary (worst first):
  - `app-root`: 143 commits, total 821ms, worst 172ms
  - `screen:game`: 142 commits, total 811ms, worst 172ms
  - `game-body`: 142 commits, total 809ms, worst 172ms
  - `op-tabs`: 142 commits, total 807ms, worst 170ms

### tab → op:nightly (cold mount)
- kind: `tab` · measured at +9413ms into run
- **settle**: 1891ms · **first DOM change**: 682ms · **window**: 2457ms
- frames 57 · avg 43.1ms · p95 217ms · worst 667ms · >50ms: 6
- long tasks: 5 (total 1314ms, worst 684ms)
- backend writes this window: user_lists:set 0.0ms, user_lists:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms
- queries subscribed during window: 52 · active data subs after: 357 · dom mutations: 804 · heap: 264MB
- react commits by boundary (worst first):
  - `app-root`: 88 commits, total 1294ms, worst 313ms
  - `screen:game`: 88 commits, total 1293ms, worst 313ms
  - `game-body`: 88 commits, total 1292ms, worst 313ms
  - `op-tabs`: 88 commits, total 1289ms, worst 310ms

### tab → op:forum (cold mount)
- kind: `tab` · measured at +11872ms into run
- **settle**: 748ms · **first DOM change**: 234ms · **window**: 1298ms
- frames 43 · avg 30.2ms · p95 67ms · worst 267ms · >50ms: 4
- long tasks: 2 (total 469ms, worst 235ms)
- backend writes this window: user_vars:set 0.0ms, user_vars:set 0.0ms
- queries subscribed during window: 83 · active data subs after: 437 · dom mutations: 773 · heap: 296MB
- react commits by boundary (worst first):
  - `app-root`: 97 commits, total 483ms, worst 191ms
  - `screen:game`: 97 commits, total 482ms, worst 191ms
  - `game-body`: 97 commits, total 481ms, worst 191ms
  - `op-tabs`: 97 commits, total 477ms, worst 187ms

### tab → op:newspaper (cold mount)
- kind: `tab` · measured at +13172ms into run
- **settle**: 769ms · **first DOM change**: 212ms · **window**: 853ms
- frames 36 · avg 23.7ms · p95 83ms · worst 192ms · >50ms: 2
- long tasks: 2 (total 300ms, worst 213ms)
- backend writes this window: user_vars:set 0.0ms
- queries subscribed during window: 14 · active data subs after: 450 · dom mutations: 204 · heap: 307MB
- react commits by boundary (worst first):
  - `app-root`: 27 commits, total 267ms, worst 189ms
  - `screen:game`: 27 commits, total 267ms, worst 189ms
  - `game-body`: 27 commits, total 266ms, worst 189ms
  - `op-tabs`: 27 commits, total 262ms, worst 185ms

### tab → op:rulebook (cold mount)
- kind: `tab` · measured at +14025ms into run
- **settle**: 803ms · **first DOM change**: 114ms · **window**: 1003ms
- frames 55 · avg 18.2ms · p95 17ms · worst 100ms · >50ms: 1
- long tasks: 1 (total 114ms, worst 114ms)
- queries subscribed during window: 9 · active data subs after: 455 · dom mutations: 174 · heap: 325MB
- react commits by boundary (worst first):
  - `app-root`: 16 commits, total 93ms, worst 67ms
  - `screen:game`: 16 commits, total 93ms, worst 67ms
  - `game-body`: 16 commits, total 92ms, worst 67ms
  - `op-tabs`: 16 commits, total 92ms, worst 66ms

### tab → op:players (warm revisit)
- kind: `tab` · measured at +15029ms into run
- **settle**: 434ms · **first DOM change**: 188ms · **window**: 624ms
- frames 14 · avg 44.6ms · p95 192ms · worst 192ms · >50ms: 3
- long tasks: 2 (total 413ms, worst 225ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 15 · heap: 346MB
- react commits by boundary (worst first):
  - `app-root`: 4 commits, total 381ms, worst 206ms
  - `screen:game`: 4 commits, total 381ms, worst 206ms
  - `game-body`: 4 commits, total 381ms, worst 206ms
  - `op-tabs`: 4 commits, total 379ms, worst 206ms

### tab → op:config (warm revisit)
- kind: `tab` · measured at +15654ms into run
- **settle**: 154ms · **first DOM change**: 53ms · **window**: 349ms
- frames 15 · avg 23.3ms · p95 75ms · worst 75ms · >50ms: 2
- long tasks: 2 (total 153ms, worst 90ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 13 · heap: 359MB
- react commits by boundary (worst first):
  - `app-root`: 4 commits, total 111ms, worst 72ms
  - `game-body`: 4 commits, total 110ms, worst 72ms
  - `screen:game`: 4 commits, total 110ms, worst 72ms
  - `op-tabs`: 4 commits, total 110ms, worst 72ms

### tab → op:nightly (warm revisit)
- kind: `tab` · measured at +16004ms into run
- **settle**: 124ms · **first DOM change**: 50ms · **window**: 321ms
- frames 15 · avg 21.3ms · p95 58ms · worst 58ms · >50ms: 1
- long tasks: 2 (total 115ms, worst 63ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 15 · heap: 374MB
- react commits by boundary (worst first):
  - `app-root`: 4 commits, total 85ms, worst 46ms
  - `screen:game`: 4 commits, total 85ms, worst 46ms
  - `game-body`: 4 commits, total 85ms, worst 46ms
  - `op-tabs`: 4 commits, total 84ms, worst 46ms

### tab → op:forum (warm revisit)
- kind: `tab` · measured at +16325ms into run
- **settle**: 257ms · **first DOM change**: 195ms · **window**: 441ms
- frames 14 · avg 31.5ms · p95 199ms · worst 199ms · >50ms: 1
- long tasks: 2 (total 256ms, worst 206ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 13 · heap: 387MB
- react commits by boundary (worst first):
  - `game-body`: 4 commits, total 226ms, worst 182ms
  - `screen:game`: 4 commits, total 226ms, worst 182ms
  - `app-root`: 4 commits, total 226ms, worst 182ms
  - `op-tabs`: 4 commits, total 224ms, worst 180ms

### tab → op:newspaper (warm revisit)
- kind: `tab` · measured at +16766ms into run
- **settle**: 726ms · **first DOM change**: 54ms · **window**: 908ms
- frames 52 · avg 17.5ms · p95 17ms · worst 57ms · >50ms: 1
- long tasks: 1 (total 60ms, worst 60ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 90 · heap: 389MB
- react commits by boundary (worst first):
  - `game-body`: 3 commits, total 42ms, worst 41ms
  - `screen:game`: 3 commits, total 42ms, worst 41ms
  - `app-root`: 3 commits, total 42ms, worst 41ms
  - `op-tabs`: 3 commits, total 41ms, worst 40ms

### tab → op:rulebook (warm revisit)
- kind: `tab` · measured at +17675ms into run
- **settle**: 500ms · **first DOM change**: 185ms · **window**: 683ms
- frames 31 · avg 22.0ms · p95 17ms · worst 183ms · >50ms: 1
- long tasks: 1 (total 189ms, worst 189ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 49 · heap: 401MB
- react commits by boundary (worst first):
  - `app-root`: 3 commits, total 170ms, worst 169ms
  - `game-body`: 3 commits, total 170ms, worst 169ms
  - `screen:game`: 3 commits, total 170ms, worst 169ms
  - `op-tabs`: 3 commits, total 167ms, worst 166ms

### tab → op:players (warm revisit)
- kind: `tab` · measured at +18358ms into run
- **settle**: 191ms · **first DOM change**: 52ms · **window**: 374ms
- frames 16 · avg 23.4ms · p95 83ms · worst 83ms · >50ms: 2
- long tasks: 2 (total 158ms, worst 94ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 17 · heap: 415MB
- react commits by boundary (worst first):
  - `game-body`: 4 commits, total 117ms, worst 78ms
  - `screen:game`: 4 commits, total 117ms, worst 78ms
  - `app-root`: 4 commits, total 117ms, worst 78ms
  - `op-tabs`: 4 commits, total 116ms, worst 78ms

### rapid tab cycle (all 6 operator tabs)
- kind: `action` · measured at +18733ms into run
- **settle**: 1542ms · **first DOM change**: 3ms · **window**: 1925ms
- frames 83 · avg 23.2ms · p95 67ms · worst 183ms · >50ms: 5
- long tasks: 6 (total 487ms, worst 183ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 111 · heap: 478MB
- react commits by boundary (worst first):
  - `app-root`: 15 commits, total 539ms, worst 172ms
  - `screen:game`: 15 commits, total 539ms, worst 171ms
  - `game-body`: 15 commits, total 538ms, worst 171ms
  - `op-tabs`: 15 commits, total 534ms, worst 169ms

### tab → op:players (warm revisit)
- kind: `tab` · measured at +20660ms into run
- **settle**: 305ms · **first DOM change**: 193ms · **window**: 489ms
- frames 15 · avg 32.6ms · p95 183ms · worst 183ms · >50ms: 2
- long tasks: 2 (total 293ms, worst 194ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 15 · heap: 485MB
- react commits by boundary (worst first):
  - `game-body`: 5 commits, total 257ms, worst 180ms
  - `screen:game`: 5 commits, total 257ms, worst 180ms
  - `app-root`: 5 commits, total 257ms, worst 180ms
  - `op-tabs`: 5 commits, total 253ms, worst 175ms

### scroll: operator players table (vertical)
- kind: `scroll` · measured at +21149ms into run
- **settle**: 30ms · **first DOM change**: 30ms · **window**: 330ms
- frames 19 · avg 17.1ms · p95 24ms · worst 24ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 1 · heap: 486MB

### scroll: players table horizontal
- kind: `scroll` · measured at +21480ms into run
- **settle**: 23ms · **first DOM change**: 23ms · **window**: 1228ms
- frames 74 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 1 · heap: 487MB

### tab → op:nightly (warm revisit)
- kind: `tab` · measured at +22708ms into run
- **settle**: 346ms · **first DOM change**: 187ms · **window**: 541ms
- frames 15 · avg 36.0ms · p95 199ms · worst 199ms · >50ms: 2
- long tasks: 2 (total 344ms, worst 200ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 17 · heap: 511MB
- react commits by boundary (worst first):
  - `app-root`: 5 commits, total 293ms, worst 177ms
  - `game-body`: 5 commits, total 293ms, worst 177ms
  - `screen:game`: 5 commits, total 293ms, worst 177ms
  - `op-tabs`: 5 commits, total 291ms, worst 174ms

### scroll: operator nightly
- kind: `scroll` · measured at +23250ms into run
- **settle**: 2420ms · **first DOM change**: 25ms · **window**: 2441ms
- frames 146 · avg 16.7ms · p95 17ms · worst 24ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 5770 · heap: 192MB
- react commits by boundary (worst first):
  - `app-root`: 210 commits, total 810ms, worst 16ms
  - `screen:game`: 210 commits, total 807ms, worst 16ms
  - `game-body`: 210 commits, total 805ms, worst 16ms
  - `op-tabs`: 210 commits, total 805ms, worst 16ms

### modal open: Review/Certify (nightly)
- kind: `modal-open` · measured at +25691ms into run
- **settle**: 324ms · **first DOM change**: 302ms · **window**: 883ms
- frames 36 · avg 24.5ms · p95 17ms · worst 299ms · >50ms: 1
- long tasks: 1 (total 304ms, worst 304ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 610 · heap: 202MB
- react commits by boundary (worst first):
  - `app-root`: 4 commits, total 58ms, worst 39ms
  - `screen:game`: 4 commits, total 58ms, worst 39ms
  - `op-tabs`: 4 commits, total 58ms, worst 39ms
  - `game-body`: 4 commits, total 58ms, worst 39ms

### modal close: Review/Certify
- kind: `modal-close` · measured at +26575ms into run
- **settle**: 541ms · **first DOM change**: 156ms · **window**: 791ms
- frames 40 · avg 19.8ms · p95 17ms · worst 142ms · >50ms: 1
- long tasks: 1 (total 156ms, worst 156ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 43 · heap: 210MB
- react commits by boundary (worst first):
  - `op-tabs`: 4 commits, total 134ms, worst 125ms
  - `game-body`: 4 commits, total 134ms, worst 125ms
  - `screen:game`: 4 commits, total 134ms, worst 125ms
  - `app-root`: 4 commits, total 134ms, worst 125ms

### tab → op:forum (warm revisit)
- kind: `tab` · measured at +27366ms into run
- **settle**: 239ms · **first DOM change**: 182ms · **window**: 424ms
- frames 14 · avg 30.3ms · p95 191ms · worst 191ms · >50ms: 1
- long tasks: 1 (total 192ms, worst 192ms)
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 13 · heap: 225MB
- react commits by boundary (worst first):
  - `app-root`: 4 commits, total 209ms, worst 170ms
  - `game-body`: 4 commits, total 209ms, worst 170ms
  - `screen:game`: 4 commits, total 209ms, worst 170ms
  - `op-tabs`: 4 commits, total 206ms, worst 167ms

### scroll: town square thread list
- kind: `scroll` · measured at +27791ms into run
- **settle**: 29ms · **first DOM change**: 29ms · **window**: 2358ms
- frames 141 · avg 16.7ms · p95 17ms · worst 24ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 455 · dom mutations: 1 · heap: 250MB
- react commits by boundary (worst first):
  - `app-root`: 121 commits, total 223ms, worst 3ms
  - `screen:game`: 121 commits, total 221ms, worst 3ms
  - `game-body`: 121 commits, total 219ms, worst 3ms
  - `op-tabs`: 121 commits, total 219ms, worst 3ms

### navigate: thread list → thread detail
- kind: `navigate` · measured at +30150ms into run
- **settle**: 699ms · **first DOM change**: 6ms · **window**: 1266ms
- frames 50 · avg 25.3ms · p95 17ms · worst 407ms · >50ms: 2
- long tasks: 1 (total 411ms, worst 411ms)
- backend writes this window: user_vars:set 0.0ms, user_vars:set 0.0ms
- queries subscribed during window: 2 · active data subs after: 456 · dom mutations: 775 · heap: 274MB
- react commits by boundary (worst first):
  - `app-root`: 17 commits, total 373ms, worst 213ms
  - `screen:game`: 17 commits, total 372ms, worst 213ms
  - `op-tabs`: 17 commits, total 372ms, worst 213ms
  - `game-body`: 17 commits, total 372ms, worst 213ms

### scroll: thread detail comments
- kind: `scroll` · measured at +31417ms into run
- **settle**: 33ms · **first DOM change**: 33ms · **window**: 2449ms
- frames 147 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 456 · dom mutations: 1 · heap: 271MB
- react commits by boundary (worst first):
  - `app-root`: 50 commits, total 94ms, worst 3ms
  - `screen:game`: 50 commits, total 93ms, worst 3ms
  - `game-body`: 50 commits, total 93ms, worst 3ms
  - `op-tabs`: 50 commits, total 93ms, worst 3ms

### navigate: thread detail → thread list
- kind: `navigate` · measured at +33866ms into run
- **settle**: 775ms · **first DOM change**: 18ms · **window**: 1292ms
- frames 57 · avg 22.7ms · p95 17ms · worst 358ms · >50ms: 1
- long tasks: 1 (total 371ms, worst 371ms)
- queries subscribed during window: 0 · active data subs after: 456 · dom mutations: 660 · heap: 288MB
- react commits by boundary (worst first):
  - `app-root`: 7 commits, total 356ms, worst 197ms
  - `screen:game`: 7 commits, total 355ms, worst 197ms
  - `op-tabs`: 7 commits, total 355ms, worst 197ms
  - `game-body`: 7 commits, total 355ms, worst 197ms

### navigate: open second thread (warm)
- kind: `navigate` · measured at +35158ms into run
- **settle**: 483ms · **first DOM change**: 52ms · **window**: 999ms
- frames 54 · avg 18.5ms · p95 33ms · worst 75ms · >50ms: 1
- long tasks: 2 (total 138ms, worst 85ms)
- backend writes this window: user_vars:set 0.1ms, user_vars:set 0.0ms
- queries subscribed during window: 2 · active data subs after: 457 · dom mutations: 146 · heap: 305MB
- react commits by boundary (worst first):
  - `app-root`: 14 commits, total 136ms, worst 31ms
  - `op-tabs`: 14 commits, total 136ms, worst 31ms
  - `game-body`: 14 commits, total 136ms, worst 31ms
  - `screen:game`: 14 commits, total 136ms, worst 31ms

### navigate: back to thread list (warm)
- kind: `navigate` · measured at +36158ms into run
- **settle**: 766ms · **first DOM change**: 22ms · **window**: 1217ms
- frames 53 · avg 22.9ms · p95 17ms · worst 350ms · >50ms: 1
- long tasks: 1 (total 366ms, worst 366ms)
- queries subscribed during window: 0 · active data subs after: 457 · dom mutations: 658 · heap: 329MB
- react commits by boundary (worst first):
  - `app-root`: 6 commits, total 348ms, worst 192ms
  - `op-tabs`: 6 commits, total 348ms, worst 192ms
  - `game-body`: 6 commits, total 348ms, worst 192ms
  - `screen:game`: 6 commits, total 348ms, worst 192ms

### modal open: New Thread composer
- kind: `modal-open` · measured at +37376ms into run
- **settle**: 104ms · **first DOM change**: 77ms · **window**: 666ms
- frames 33 · avg 20.1ms · p95 61ms · worst 79ms · >50ms: 2
- long tasks: 1 (total 77ms, worst 77ms)
- queries subscribed during window: 0 · active data subs after: 457 · dom mutations: 38 · heap: 318MB
- react commits by boundary (worst first):
  - `screen:game`: 4 commits, total 18ms, worst 15ms
  - `app-root`: 4 commits, total 18ms, worst 15ms
  - `op-tabs`: 4 commits, total 18ms, worst 15ms
  - `game-body`: 4 commits, total 18ms, worst 15ms

### modal close: New Thread composer
- kind: `modal-close` · measured at +38043ms into run
- **settle**: 199ms · **first DOM change**: 38ms · **window**: 465ms
- frames 28 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 457 · dom mutations: 29 · heap: 329MB
- react commits by boundary (worst first):
  - `app-root`: 4 commits, total 24ms, worst 21ms
  - `op-tabs`: 4 commits, total 23ms, worst 21ms
  - `game-body`: 4 commits, total 23ms, worst 21ms
  - `screen:game`: 4 commits, total 23ms, worst 21ms

### tab → op:newspaper (warm revisit)
- kind: `tab` · measured at +38508ms into run
- **settle**: 866ms · **first DOM change**: 197ms · **window**: 1050ms
- frames 52 · avg 20.2ms · p95 17ms · worst 199ms · >50ms: 1
- long tasks: 1 (total 202ms, worst 202ms)
- queries subscribed during window: 0 · active data subs after: 457 · dom mutations: 90 · heap: 338MB
- react commits by boundary (worst first):
  - `app-root`: 3 commits, total 187ms, worst 186ms
  - `screen:game`: 3 commits, total 187ms, worst 186ms
  - `game-body`: 3 commits, total 187ms, worst 186ms
  - `op-tabs`: 3 commits, total 183ms, worst 182ms

### scroll: operator newspaper
- kind: `scroll` · measured at +39558ms into run
- **settle**: 35ms · **first DOM change**: 35ms · **window**: 2773ms
- frames 151 · avg 18.3ms · p95 17ms · worst 166ms · >50ms: 2
- queries subscribed during window: 0 · active data subs after: 457 · dom mutations: 1 · heap: 355MB
- react commits by boundary (worst first):
  - `app-root`: 131 commits, total 280ms, worst 6ms
  - `screen:game`: 131 commits, total 278ms, worst 6ms
  - `game-body`: 131 commits, total 277ms, worst 6ms
  - `op-tabs`: 131 commits, total 276ms, worst 6ms

### tab → op:rulebook (warm revisit)
- kind: `tab` · measured at +42333ms into run
- **settle**: 1067ms · **first DOM change**: 704ms · **window**: 1258ms
- frames 31 · avg 40.6ms · p95 43ms · worst 733ms · >50ms: 1
- long tasks: 1 (total 741ms, worst 741ms)
- queries subscribed during window: 0 · active data subs after: 457 · dom mutations: 48 · heap: 359MB
- react commits by boundary (worst first):
  - `app-root`: 4 commits, total 668ms, worst 655ms
  - `screen:game`: 4 commits, total 667ms, worst 655ms
  - `game-body`: 4 commits, total 667ms, worst 655ms
  - `op-tabs`: 4 commits, total 660ms, worst 648ms

### scroll: operator config page
- kind: `scroll` · measured at +43591ms into run
- **settle**: 198ms · **first DOM change**: 39ms · **window**: 2484ms
- frames 60 · avg 41.4ms · p95 148ms · worst 406ms · >50ms: 10
- queries subscribed during window: 0 · active data subs after: 457 · dom mutations: 3 · heap: 355MB
- react commits by boundary (worst first):
  - `app-root`: 21 commits, total 93ms, worst 13ms
  - `screen:game`: 21 commits, total 92ms, worst 13ms
  - `game-body`: 21 commits, total 92ms, worst 13ms
  - `op-tabs`: 21 commits, total 92ms, worst 13ms

### navigate: config → rule book subpage
- kind: `navigate` · measured at +46077ms into run
- **settle**: 7955ms · **first DOM change**: 15ms · **window**: 8014ms
- frames 438 · avg 18.3ms · p95 17ms · worst 633ms · >50ms: 2
- long tasks: 1 (total 644ms, worst 644ms)
- backend writes this window: user_vars:set 0.2ms, user_vars:set 0.0ms
- queries subscribed during window: 4 · active data subs after: 459 · dom mutations: 669 · heap: 384MB
- react commits by boundary (worst first):
  - `app-root`: 16 commits, total 578ms, worst 330ms
  - `screen:game`: 16 commits, total 577ms, worst 330ms
  - `op-tabs`: 16 commits, total 577ms, worst 330ms
  - `game-body`: 16 commits, total 577ms, worst 330ms
- notes: (settle timeout 8000ms)

### scroll: operator rulebook (scroll-linked TOC)
- kind: `scroll` · measured at +54092ms into run
- **settle**: 3058ms · **first DOM change**: 43ms · **window**: 3058ms
- frames 181 · avg 16.9ms · p95 17ms · worst 40ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 459 · dom mutations: 353 · heap: 379MB
- react commits by boundary (worst first):
  - `app-root`: 161 commits, total 345ms, worst 6ms
  - `screen:game`: 161 commits, total 342ms, worst 5ms
  - `game-body`: 161 commits, total 341ms, worst 5ms
  - `op-tabs`: 161 commits, total 341ms, worst 5ms

### modal open: rulebook table of contents
- kind: `modal-open` · measured at +57153ms into run
- **settle**: 96ms · **first DOM change**: 10ms · **window**: 662ms
- frames 36 · avg 18.4ms · p95 17ms · worst 79ms · >50ms: 1
- long tasks: 1 (total 87ms, worst 87ms)
- queries subscribed during window: 0 · active data subs after: 459 · dom mutations: 87 · heap: 391MB
- react commits by boundary (worst first):
  - `op-tabs`: 5 commits, total 17ms, worst 10ms
  - `game-body`: 5 commits, total 17ms, worst 10ms
  - `screen:game`: 5 commits, total 17ms, worst 10ms
  - `app-root`: 5 commits, total 17ms, worst 10ms

### modal close: rulebook TOC
- kind: `modal-close` · measured at +57816ms into run
- **settle**: 184ms · **first DOM change**: 23ms · **window**: 449ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 459 · dom mutations: 32 · heap: 392MB
- react commits by boundary (worst first):
  - `app-root`: 2 commits, total 4ms, worst 2ms
  - `op-tabs`: 2 commits, total 4ms, worst 2ms
  - `game-body`: 2 commits, total 4ms, worst 2ms
  - `screen:game`: 2 commits, total 4ms, worst 2ms

### navigate: rule book → config
- kind: `navigate` · measured at +58266ms into run
- **settle**: 525ms · **first DOM change**: 6ms · **window**: 1041ms
- frames 56 · avg 18.6ms · p95 17ms · worst 125ms · >50ms: 1
- long tasks: 1 (total 136ms, worst 136ms)
- queries subscribed during window: 0 · active data subs after: 459 · dom mutations: 153 · heap: 397MB
- react commits by boundary (worst first):
  - `op-tabs`: 8 commits, total 107ms, worst 75ms
  - `game-body`: 8 commits, total 107ms, worst 75ms
  - `screen:game`: 8 commits, total 107ms, worst 75ms
  - `app-root`: 8 commits, total 107ms, worst 75ms

### navigate: config → phone book subpage
- kind: `navigate` · measured at +59308ms into run
- **settle**: 7988ms · **first DOM change**: 3ms · **window**: 8016ms
- frames 461 · avg 17.4ms · p95 17ms · worst 308ms · >50ms: 1
- long tasks: 1 (total 306ms, worst 306ms)
- queries subscribed during window: 25 · active data subs after: 484 · dom mutations: 853 · heap: 202MB
- react commits by boundary (worst first):
  - `app-root`: 15 commits, total 303ms, worst 90ms
  - `screen:game`: 15 commits, total 302ms, worst 89ms
  - `op-tabs`: 15 commits, total 302ms, worst 89ms
  - `game-body`: 15 commits, total 302ms, worst 89ms
- notes: (settle timeout 8000ms)

### scroll: operator phone book
- kind: `scroll` · measured at +67324ms into run
- **settle**: 2367ms · **first DOM change**: 36ms · **window**: 2367ms
- frames 141 · avg 16.8ms · p95 17ms · worst 33ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 484 · dom mutations: 131 · heap: 207MB
- react commits by boundary (worst first):
  - `app-root`: 53 commits, total 119ms, worst 3ms
  - `screen:game`: 53 commits, total 118ms, worst 3ms
  - `op-tabs`: 53 commits, total 117ms, worst 3ms
  - `game-body`: 53 commits, total 117ms, worst 3ms

### navigate: phone book → config
- kind: `navigate` · measured at +69692ms into run
- **settle**: 515ms · **first DOM change**: 7ms · **window**: 1032ms
- frames 56 · avg 18.4ms · p95 17ms · worst 117ms · >50ms: 1
- long tasks: 1 (total 130ms, worst 130ms)
- queries subscribed during window: 0 · active data subs after: 484 · dom mutations: 157 · heap: 198MB
- react commits by boundary (worst first):
  - `app-root`: 8 commits, total 100ms, worst 63ms
  - `op-tabs`: 8 commits, total 99ms, worst 63ms
  - `game-body`: 8 commits, total 99ms, worst 63ms
  - `screen:game`: 8 commits, total 99ms, worst 63ms

### tab → op:config (warm revisit)
- kind: `tab` · measured at +70724ms into run
- **settle**: 600ms · **first DOM change**: 152ms · **window**: 783ms
- frames 39 · avg 20.1ms · p95 25ms · worst 142ms · >50ms: 1
- long tasks: 1 (total 152ms, worst 152ms)
- queries subscribed during window: 0 · active data subs after: 484 · dom mutations: 40 · heap: 210MB
- react commits by boundary (worst first):
  - `app-root`: 4 commits, total 160ms, worst 139ms
  - `game-body`: 4 commits, total 160ms, worst 139ms
  - `screen:game`: 4 commits, total 160ms, worst 139ms
  - `op-tabs`: 4 commits, total 156ms, worst 136ms

### scroll: operator roles table
- kind: `scroll` · measured at +71507ms into run
- **settle**: 2429ms · **first DOM change**: 27ms · **window**: 2442ms
- frames 146 · avg 16.7ms · p95 17ms · worst 24ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 484 · dom mutations: 1387 · heap: 237MB
- react commits by boundary (worst first):
  - `app-root`: 99 commits, total 287ms, worst 10ms
  - `screen:game`: 99 commits, total 284ms, worst 10ms
  - `op-tabs`: 99 commits, total 283ms, worst 10ms
  - `game-body`: 99 commits, total 283ms, worst 10ms

### navigate → game list
- kind: `navigate` · measured at +73949ms into run
- **settle**: 674ms · **first DOM change**: 2ms · **window**: 1441ms
- frames 77 · avg 18.7ms · p95 17ms · worst 175ms · >50ms: 1
- long tasks: 1 (total 194ms, worst 194ms)
- backend writes this window: user_vars:set 0.0ms
- queries subscribed during window: 0 · active data subs after: 484 · dom mutations: 272 · heap: 73MB
- react commits by boundary (worst first):
  - `app-root`: 10 commits, total 32ms, worst 19ms
  - `screen:allGames`: 3 commits, total 28ms, worst 19ms
  - `screen:game`: 3 commits, total 1ms, worst 0ms
  - `game-body`: 3 commits, total 1ms, worst 0ms
  - `op-tabs`: 3 commits, total 0ms, worst 0ms

### — Phase C — player game
> current user is a player in SIMPLY567

### open game: SIMPLY567 (as player)
- kind: `navigate` · measured at +75391ms into run
- **settle**: 2383ms · **first DOM change**: 4ms · **window**: 3350ms
- frames 172 · avg 19.5ms · p95 17ms · worst 292ms · >50ms: 3
- long tasks: 2 (total 370ms, worst 245ms)
- backend writes this window: user_vars:set 0.0ms, user_lists:set 0.1ms, user_lists:set 0.0ms, user_lists:set 0.0ms, user_lists:set 0.0ms, user_lists:set 0.0ms, user_vars:set 0.1ms, user_vars:set 0.1ms, user_lists:set 0.0ms, user_lists:set 0.1ms, user_lists:set 0.1ms, user_lists:set 0.0ms, user_lists:set 0.0ms, user_vars:set 0.0ms
- queries subscribed during window: 67 · active data subs after: 534 · dom mutations: 1723 · heap: 82MB
- react commits by boundary (worst first):
  - `app-root`: 104 commits, total 408ms, worst 122ms
  - `screen:game`: 93 commits, total 371ms, worst 122ms
  - `game-body`: 86 commits, total 363ms, worst 122ms
  - `player-tabs`: 60 commits, total 341ms, worst 122ms
  - `screen:allGames`: 5 commits, total 22ms, worst 6ms

### tab → player:newspaper (cold mount)
- kind: `tab` · measured at +78741ms into run
- **settle**: 384ms · **first DOM change**: 45ms · **window**: 950ms
- frames 47 · avg 20.2ms · p95 25ms · worst 158ms · >50ms: 1
- long tasks: 1 (total 161ms, worst 161ms)
- backend writes this window: user_vars:set 0.0ms
- queries subscribed during window: 11 · active data subs after: 544 · dom mutations: 200 · heap: 101MB
- react commits by boundary (worst first):
  - `app-root`: 28 commits, total 189ms, worst 82ms
  - `screen:game`: 28 commits, total 189ms, worst 82ms
  - `game-body`: 28 commits, total 189ms, worst 82ms
  - `player-tabs`: 28 commits, total 187ms, worst 82ms

### tab → player:eyesOnly (cold mount)
- kind: `tab` · measured at +79691ms into run
- **settle**: 442ms · **first DOM change**: 59ms · **window**: 1008ms
- frames 53 · avg 19.0ms · p95 42ms · worst 75ms · >50ms: 1
- long tasks: 1 (total 59ms, worst 59ms)
- backend writes this window: user_vars:set 0.1ms
- queries subscribed during window: 8 · active data subs after: 551 · dom mutations: 97 · heap: 89MB
- react commits by boundary (worst first):
  - `app-root`: 18 commits, total 134ms, worst 22ms
  - `screen:game`: 18 commits, total 133ms, worst 22ms
  - `game-body`: 18 commits, total 133ms, worst 22ms
  - `player-tabs`: 18 commits, total 131ms, worst 21ms

### tab → player:ruleBook (cold mount)
- kind: `tab` · measured at +80699ms into run
- **settle**: 7834ms · **first DOM change**: 51ms · **window**: 8008ms
- frames 462 · avg 17.3ms · p95 17ms · worst 308ms · >50ms: 1
- long tasks: 3 (total 361ms, worst 244ms)
- queries subscribed during window: 2 · active data subs after: 553 · dom mutations: 668 · heap: 120MB
- react commits by boundary (worst first):
  - `app-root`: 21 commits, total 433ms, worst 127ms
  - `screen:game`: 21 commits, total 432ms, worst 127ms
  - `game-body`: 21 commits, total 432ms, worst 127ms
  - `player-tabs`: 21 commits, total 430ms, worst 127ms
- notes: (settle timeout 8000ms)

### tab → player:phoneBook (cold mount)
- kind: `tab` · measured at +88707ms into run
- **settle**: 7851ms · **first DOM change**: 78ms · **window**: 8008ms
- frames 458 · avg 17.5ms · p95 17ms · worst 333ms · >50ms: 2
- long tasks: 2 (total 408ms, worst 327ms)
- queries subscribed during window: 29 · active data subs after: 578 · dom mutations: 1014 · heap: 130MB
- react commits by boundary (worst first):
  - `app-root`: 29 commits, total 511ms, worst 110ms
  - `screen:game`: 29 commits, total 510ms, worst 110ms
  - `game-body`: 29 commits, total 510ms, worst 110ms
  - `player-tabs`: 29 commits, total 508ms, worst 110ms
- notes: (settle timeout 8000ms)

### tab → player:newspaper (warm revisit)
- kind: `tab` · measured at +96716ms into run
- **settle**: 335ms · **first DOM change**: 29ms · **window**: 516ms
- frames 29 · avg 17.8ms · p95 33ms · worst 33ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 51 · heap: 128MB
- react commits by boundary (worst first):
  - `app-root`: 17 commits, total 42ms, worst 23ms
  - `screen:game`: 17 commits, total 42ms, worst 23ms
  - `game-body`: 17 commits, total 42ms, worst 23ms
  - `player-tabs`: 17 commits, total 39ms, worst 21ms

### tab → player:eyesOnly (warm revisit)
- kind: `tab` · measured at +97232ms into run
- **settle**: 29ms · **first DOM change**: 25ms · **window**: 308ms
- frames 18 · avg 17.1ms · p95 24ms · worst 24ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 16 · heap: 133MB
- react commits by boundary (worst first):
  - `game-body`: 3 commits, total 20ms, worst 19ms
  - `screen:game`: 3 commits, total 20ms, worst 19ms
  - `app-root`: 3 commits, total 20ms, worst 19ms
  - `player-tabs`: 3 commits, total 17ms, worst 17ms

### tab → player:ruleBook (warm revisit)
- kind: `tab` · measured at +97541ms into run
- **settle**: 201ms · **first DOM change**: 25ms · **window**: 391ms
- frames 23 · avg 17.0ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 17 · heap: 119MB
- react commits by boundary (worst first):
  - `app-root`: 4 commits, total 36ms, worst 20ms
  - `game-body`: 4 commits, total 36ms, worst 20ms
  - `screen:game`: 4 commits, total 36ms, worst 20ms
  - `player-tabs`: 4 commits, total 33ms, worst 17ms

### tab → player:phoneBook (warm revisit)
- kind: `tab` · measured at +97932ms into run
- **settle**: 1226ms · **first DOM change**: 24ms · **window**: 1417ms
- frames 72 · avg 19.7ms · p95 17ms · worst 225ms · >50ms: 1
- long tasks: 1 (total 240ms, worst 240ms)
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 604 · heap: 127MB
- react commits by boundary (worst first):
  - `app-root`: 8 commits, total 253ms, worst 129ms
  - `screen:game`: 8 commits, total 253ms, worst 129ms
  - `game-body`: 8 commits, total 253ms, worst 128ms
  - `player-tabs`: 8 commits, total 250ms, worst 128ms

### tab → player:townSquare (warm revisit)
- kind: `tab` · measured at +99349ms into run
- **settle**: 41ms · **first DOM change**: 29ms · **window**: 316ms
- frames 18 · avg 17.6ms · p95 33ms · worst 33ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 36 · heap: 146MB
- react commits by boundary (worst first):
  - `game-body`: 2 commits, total 24ms, worst 24ms
  - `screen:game`: 2 commits, total 24ms, worst 24ms
  - `app-root`: 2 commits, total 24ms, worst 24ms
  - `player-tabs`: 2 commits, total 21ms, worst 21ms

### tab → player:townSquare (warm revisit)
- kind: `tab` · measured at +99666ms into run
- **settle**: 73ms · **first DOM change**: 3ms · **window**: 316ms
- frames 19 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 2 · heap: 130MB
- react commits by boundary (worst first):
  - `player-tabs`: 2 commits, total 16ms, worst 14ms
  - `game-body`: 2 commits, total 16ms, worst 14ms
  - `screen:game`: 2 commits, total 16ms, worst 14ms
  - `app-root`: 2 commits, total 16ms, worst 14ms

### scroll: player town square
- kind: `scroll` · measured at +99982ms into run
- **settle**: 1756ms · **first DOM change**: 10ms · **window**: 2233ms
- frames 134 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 11 · heap: 105MB
- react commits by boundary (worst first):
  - `app-root`: 5 commits, total 41ms, worst 14ms
  - `player-tabs`: 5 commits, total 41ms, worst 14ms
  - `game-body`: 5 commits, total 41ms, worst 14ms
  - `screen:game`: 5 commits, total 41ms, worst 14ms

### tab → player:newspaper (warm revisit)
- kind: `tab` · measured at +102216ms into run
- **settle**: 522ms · **first DOM change**: 25ms · **window**: 708ms
- frames 42 · avg 16.8ms · p95 17ms · worst 24ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 26 · heap: 115MB
- react commits by boundary (worst first):
  - `app-root`: 17 commits, total 39ms, worst 20ms
  - `screen:game`: 17 commits, total 39ms, worst 19ms
  - `game-body`: 17 commits, total 39ms, worst 19ms
  - `player-tabs`: 17 commits, total 37ms, worst 17ms

### scroll: player newspaper
- kind: `scroll` · measured at +102924ms into run
- **settle**: 1816ms · **first DOM change**: 11ms · **window**: 2633ms
- frames 158 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 3 · heap: 125MB
- react commits by boundary (worst first):
  - `app-root`: 4 commits, total 32ms, worst 14ms
  - `player-tabs`: 4 commits, total 32ms, worst 14ms
  - `game-body`: 4 commits, total 32ms, worst 14ms
  - `screen:game`: 4 commits, total 32ms, worst 14ms

### tab → player:eyesOnly (warm revisit)
- kind: `tab` · measured at +105557ms into run
- **settle**: 176ms · **first DOM change**: 25ms · **window**: 358ms
- frames 21 · avg 17.0ms · p95 17ms · worst 24ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 17 · heap: 111MB
- react commits by boundary (worst first):
  - `app-root`: 6 commits, total 46ms, worst 20ms
  - `game-body`: 6 commits, total 45ms, worst 20ms
  - `screen:game`: 6 commits, total 45ms, worst 20ms
  - `player-tabs`: 6 commits, total 42ms, worst 17ms

### scroll: player eyes only
- kind: `scroll` · measured at +105916ms into run
- **settle**: 1822ms · **first DOM change**: 10ms · **window**: 2333ms
- frames 140 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 3 · heap: 120MB
- react commits by boundary (worst first):
  - `app-root`: 4 commits, total 33ms, worst 14ms
  - `game-body`: 4 commits, total 33ms, worst 14ms
  - `screen:game`: 4 commits, total 33ms, worst 14ms
  - `player-tabs`: 4 commits, total 33ms, worst 14ms

### tab → player:ruleBook (warm revisit)
- kind: `tab` · measured at +108249ms into run
- **settle**: 492ms · **first DOM change**: 25ms · **window**: 674ms
- frames 40 · avg 16.9ms · p95 17ms · worst 24ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 21 · heap: 104MB
- react commits by boundary (worst first):
  - `app-root`: 4 commits, total 36ms, worst 19ms
  - `game-body`: 4 commits, total 35ms, worst 19ms
  - `screen:game`: 4 commits, total 35ms, worst 19ms
  - `player-tabs`: 4 commits, total 33ms, worst 16ms

### scroll: player rulebook (scroll-linked)
- kind: `scroll` · measured at +108924ms into run
- **settle**: 2834ms · **first DOM change**: 9ms · **window**: 2834ms
- frames 170 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 341 · heap: 118MB
- react commits by boundary (worst first):
  - `app-root`: 7 commits, total 47ms, worst 15ms
  - `player-tabs`: 7 commits, total 47ms, worst 15ms
  - `game-body`: 7 commits, total 47ms, worst 15ms
  - `screen:game`: 7 commits, total 47ms, worst 15ms

### tab → player:phoneBook (warm revisit)
- kind: `tab` · measured at +111758ms into run
- **settle**: 1600ms · **first DOM change**: 25ms · **window**: 1790ms
- frames 93 · avg 19.2ms · p95 17ms · worst 250ms · >50ms: 1
- long tasks: 1 (total 252ms, worst 252ms)
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 621 · heap: 116MB
- react commits by boundary (worst first):
  - `app-root`: 9 commits, total 268ms, worst 134ms
  - `screen:game`: 9 commits, total 267ms, worst 134ms
  - `game-body`: 9 commits, total 267ms, worst 134ms
  - `player-tabs`: 9 commits, total 265ms, worst 134ms

### scroll: player phone book
- kind: `scroll` · measured at +113549ms into run
- **settle**: 2334ms · **first DOM change**: 11ms · **window**: 2334ms
- frames 140 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 578 · dom mutations: 136 · heap: 111MB
- react commits by boundary (worst first):
  - `app-root`: 7 commits, total 67ms, worst 14ms
  - `player-tabs`: 7 commits, total 67ms, worst 14ms
  - `game-body`: 7 commits, total 67ms, worst 14ms
  - `screen:game`: 7 commits, total 67ms, worst 14ms

### navigate → game list
- kind: `navigate` · measured at +115883ms into run
- **settle**: 623ms · **first DOM change**: 3ms · **window**: 1390ms
- frames 78 · avg 17.8ms · p95 17ms · worst 83ms · >50ms: 1
- long tasks: 2 (total 148ms, worst 97ms)
- backend writes this window: user_vars:set 0.1ms
- queries subscribed during window: 3 · active data subs after: 581 · dom mutations: 178 · heap: 137MB
- react commits by boundary (worst first):
  - `app-root`: 12 commits, total 61ms, worst 20ms
  - `screen:allGames`: 3 commits, total 28ms, worst 20ms
  - `game-body`: 6 commits, total 26ms, worst 8ms
  - `screen:game`: 6 commits, total 26ms, worst 8ms
  - `player-tabs`: 4 commits, total 26ms, worst 8ms

### — Phase D — newser game
> current user is the newser of SIMNEWS9

### open game: SIMNEWS9 (as newser)
- kind: `navigate` · measured at +117274ms into run
- **settle**: 2392ms · **first DOM change**: 3ms · **window**: 3351ms
- frames 174 · avg 19.3ms · p95 17ms · worst 292ms · >50ms: 3
- long tasks: 2 (total 368ms, worst 249ms)
- backend writes this window: user_vars:set 0.1ms, user_lists:set 0.0ms, user_lists:set 0.0ms, user_lists:set 0.0ms, user_lists:set 0.0ms, user_lists:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms, user_vars:set 0.0ms
- queries subscribed during window: 54 · active data subs after: 624 · dom mutations: 1748 · heap: 85MB
- react commits by boundary (worst first):
  - `app-root`: 87 commits, total 388ms, worst 122ms
  - `screen:game`: 77 commits, total 353ms, worst 122ms
  - `game-body`: 70 commits, total 346ms, worst 122ms
  - `newser-tabs`: 60 commits, total 330ms, worst 122ms
  - `screen:allGames`: 5 commits, total 22ms, worst 6ms

### tab → newser:newspaper (cold mount)
- kind: `tab` · measured at +120625ms into run
- **settle**: 304ms · **first DOM change**: 45ms · **window**: 858ms
- frames 40 · avg 21.4ms · p95 33ms · worst 100ms · >50ms: 2
- long tasks: 1 (total 87ms, worst 87ms)
- backend writes this window: user_vars:set 0.1ms, user_vars:set 0.0ms, user_lists:set 0.0ms
- queries subscribed during window: 19 · active data subs after: 638 · dom mutations: 68 · heap: 115MB
- react commits by boundary (worst first):
  - `app-root`: 33 commits, total 172ms, worst 41ms
  - `screen:game`: 33 commits, total 171ms, worst 41ms
  - `game-body`: 33 commits, total 171ms, worst 41ms
  - `newser-tabs`: 33 commits, total 169ms, worst 41ms

### tab → newser:ruleBook (cold mount)
- kind: `tab` · measured at +121483ms into run
- **settle**: 8011ms · **first DOM change**: 25ms · **window**: 8015ms
- frames 467 · avg 17.2ms · p95 17ms · worst 250ms · >50ms: 1
- long tasks: 1 (total 195ms, worst 195ms)
- queries subscribed during window: 2 · active data subs after: 640 · dom mutations: 728 · heap: 93MB
- react commits by boundary (worst first):
  - `app-root`: 10 commits, total 202ms, worst 87ms
  - `screen:game`: 10 commits, total 202ms, worst 87ms
  - `game-body`: 10 commits, total 201ms, worst 87ms
  - `newser-tabs`: 10 commits, total 201ms, worst 87ms
- notes: (settle timeout 8000ms)

### tab → newser:phoneBook (cold mount)
- kind: `tab` · measured at +129499ms into run
- **settle**: 7836ms · **first DOM change**: 61ms · **window**: 8008ms
- frames 460 · avg 17.4ms · p95 17ms · worst 317ms · >50ms: 2
- long tasks: 2 (total 381ms, worst 319ms)
- queries subscribed during window: 31 · active data subs after: 667 · dom mutations: 1016 · heap: 130MB
- react commits by boundary (worst first):
  - `app-root`: 22 commits, total 359ms, worst 98ms
  - `screen:game`: 22 commits, total 359ms, worst 98ms
  - `game-body`: 22 commits, total 358ms, worst 98ms
  - `newser-tabs`: 22 commits, total 356ms, worst 98ms
- notes: (settle timeout 8000ms)

### tab → newser:newspaper (warm revisit)
- kind: `tab` · measured at +137507ms into run
- **settle**: 691ms · **first DOM change**: 13ms · **window**: 875ms
- frames 51 · avg 17.1ms · p95 17ms · worst 42ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 667 · dom mutations: 150 · heap: 119MB
- react commits by boundary (worst first):
  - `game-body`: 3 commits, total 12ms, worst 8ms
  - `screen:game`: 3 commits, total 12ms, worst 8ms
  - `app-root`: 3 commits, total 12ms, worst 8ms
  - `newser-tabs`: 3 commits, total 10ms, worst 7ms

### tab → newser:ruleBook (warm revisit)
- kind: `tab` · measured at +138382ms into run
- **settle**: 713ms · **first DOM change**: 8ms · **window**: 900ms
- frames 54 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 667 · dom mutations: 97 · heap: 121MB
- react commits by boundary (worst first):
  - `app-root`: 3 commits, total 8ms, worst 5ms
  - `screen:game`: 3 commits, total 8ms, worst 4ms
  - `game-body`: 3 commits, total 8ms, worst 4ms
  - `newser-tabs`: 3 commits, total 6ms, worst 3ms

### tab → newser:phoneBook (warm revisit)
- kind: `tab` · measured at +139282ms into run
- **settle**: 1252ms · **first DOM change**: 8ms · **window**: 1433ms
- frames 73 · avg 19.6ms · p95 17ms · worst 233ms · >50ms: 1
- long tasks: 1 (total 239ms, worst 239ms)
- queries subscribed during window: 0 · active data subs after: 667 · dom mutations: 601 · heap: 103MB
- react commits by boundary (worst first):
  - `app-root`: 7 commits, total 224ms, worst 126ms
  - `game-body`: 7 commits, total 224ms, worst 126ms
  - `screen:game`: 7 commits, total 224ms, worst 126ms
  - `newser-tabs`: 7 commits, total 222ms, worst 126ms

### tab → newser:townSquare (warm revisit)
- kind: `tab` · measured at +140715ms into run
- **settle**: 24ms · **first DOM change**: 13ms · **window**: 316ms
- frames 19 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 667 · dom mutations: 36 · heap: 122MB
- react commits by boundary (worst first):
  - `screen:game`: 2 commits, total 9ms, worst 8ms
  - `app-root`: 2 commits, total 9ms, worst 8ms
  - `game-body`: 2 commits, total 9ms, worst 8ms
  - `newser-tabs`: 2 commits, total 7ms, worst 6ms

### tab → newser:newspaper (warm revisit)
- kind: `tab` · measured at +141032ms into run
- **settle**: 667ms · **first DOM change**: 9ms · **window**: 850ms
- frames 51 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 667 · dom mutations: 128 · heap: 124MB
- react commits by boundary (worst first):
  - `app-root`: 3 commits, total 8ms, worst 5ms
  - `game-body`: 3 commits, total 8ms, worst 5ms
  - `screen:game`: 3 commits, total 8ms, worst 5ms
  - `newser-tabs`: 3 commits, total 6ms, worst 3ms

### scroll: newser newspaper editor
- kind: `scroll` · measured at +141882ms into run
- **settle**: 517ms · **first DOM change**: 10ms · **window**: 2733ms
- frames 164 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 667 · dom mutations: 28 · heap: 126MB
- react commits by boundary (worst first):
  - `app-root`: 3 commits, total 6ms, worst 2ms
  - `newser-tabs`: 3 commits, total 6ms, worst 2ms
  - `game-body`: 3 commits, total 6ms, worst 2ms
  - `screen:game`: 3 commits, total 6ms, worst 2ms

### navigate → game list
- kind: `navigate` · measured at +144615ms into run
- **settle**: 600ms · **first DOM change**: 3ms · **window**: 1367ms
- frames 78 · avg 17.5ms · p95 17ms · worst 67ms · >50ms: 1
- long tasks: 1 (total 82ms, worst 82ms)
- backend writes this window: user_vars:set 0.0ms
- queries subscribed during window: 0 · active data subs after: 667 · dom mutations: 172 · heap: 123MB
- react commits by boundary (worst first):
  - `app-root`: 10 commits, total 38ms, worst 19ms
  - `screen:allGames`: 3 commits, total 26ms, worst 18ms
  - `newser-tabs`: 2 commits, total 4ms, worst 2ms
  - `game-body`: 2 commits, total 4ms, worst 2ms
  - `screen:game`: 2 commits, total 4ms, worst 2ms

### — Phase E — modal lab
> every dialog with fixture data, opened/closed/measured

### modal open: MarkdownEditorDialog (heavy editor)
- kind: `modal-open` · measured at +146006ms into run
- **settle**: 347ms · **first DOM change**: 18ms · **window**: 1009ms
- frames 41 · avg 24.6ms · p95 17ms · worst 309ms · >50ms: 1
- long tasks: 2 (total 385ms, worst 324ms)
- backend writes this window: user_vars:set 0.1ms
- queries subscribed during window: 2 · active data subs after: 668 · dom mutations: 459 · heap: 87MB

### modal close: MarkdownEditorDialog (heavy editor)
- kind: `modal-close` · measured at +147015ms into run
- **settle**: 192ms · **first DOM change**: 42ms · **window**: 458ms
- frames 27 · avg 17.0ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 668 · dom mutations: 30 · heap: 101MB

### modal open: markdown-editor (for minimize test)
- kind: `modal-open` · measured at +147473ms into run
- **settle**: 300ms · **first DOM change**: 282ms · **window**: 867ms
- frames 36 · avg 24.1ms · p95 17ms · worst 283ms · >50ms: 1
- long tasks: 1 (total 286ms, worst 286ms)
- queries subscribed during window: 0 · active data subs after: 668 · dom mutations: 434 · heap: 101MB

### modal minimize: markdown-editor
- kind: `action` · measured at +148340ms into run
- **settle**: 288ms · **first DOM change**: 49ms · **window**: 850ms
- frames 50 · avg 17.0ms · p95 17ms · worst 33ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 668 · dom mutations: 37 · heap: 107MB
- react commits by boundary (worst first):
  - `screen:allGames`: 1 commits, total 1ms, worst 1ms
  - `app-root`: 1 commits, total 1ms, worst 1ms

### modal restore: markdown-editor
- kind: `action` · measured at +149190ms into run
- **settle**: 192ms · **first DOM change**: 41ms · **window**: 909ms
- frames 54 · avg 16.8ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 668 · dom mutations: 18 · heap: 111MB
- react commits by boundary (worst first):
  - `screen:allGames`: 1 commits, total 1ms, worst 1ms
  - `app-root`: 1 commits, total 1ms, worst 1ms

### modal close: markdown-editor (after restore)
- kind: `modal-close` · measured at +150100ms into run
- **settle**: 183ms · **first DOM change**: 36ms · **window**: 449ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 668 · dom mutations: 24 · heap: 124MB

### modal open: TownSquarePostDialog
- kind: `modal-open` · measured at +150549ms into run
- **settle**: 0ms · **first DOM change**: — · **window**: 2552ms
- queries subscribed during window: 0 · active data subs after: 0 · dom mutations: 4 · heap: n/aMB
- **error**: verify failed: no [role="dialog"] appeared

### modal close: TownSquarePostDialog
- kind: `modal-close` · measured at +153101ms into run
- **settle**: 19ms · **first DOM change**: 19ms · **window**: 314ms
- frames 19 · avg 16.5ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 1 · heap: 116MB

### modal open: PlayerProfileDialogNEW
- kind: `modal-open` · measured at +153415ms into run
- **settle**: 125ms · **first DOM change**: 19ms · **window**: 792ms
- frames 42 · avg 18.8ms · p95 17ms · worst 108ms · >50ms: 1
- long tasks: 1 (total 111ms, worst 111ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 90 · heap: 84MB

### modal close: PlayerProfileDialogNEW
- kind: `modal-close` · measured at +154207ms into run
- **settle**: 183ms · **first DOM change**: 29ms · **window**: 450ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 87MB

### modal open: UserEditDialog
- kind: `modal-open` · measured at +154657ms into run
- **settle**: 108ms · **first DOM change**: 21ms · **window**: 775ms
- frames 42 · avg 18.4ms · p95 17ms · worst 91ms · >50ms: 1
- long tasks: 1 (total 94ms, worst 94ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 52 · heap: 106MB

### modal close: UserEditDialog
- kind: `modal-close` · measured at +155432ms into run
- **settle**: 183ms · **first DOM change**: 30ms · **window**: 450ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 109MB

### modal open: UserAddDialog
- kind: `modal-open` · measured at +155882ms into run
- **settle**: 108ms · **first DOM change**: 21ms · **window**: 775ms
- frames 42 · avg 18.4ms · p95 17ms · worst 91ms · >50ms: 1
- long tasks: 1 (total 92ms, worst 92ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 42 · heap: 101MB

### modal close: UserAddDialog
- kind: `modal-close` · measured at +156657ms into run
- **settle**: 183ms · **first DOM change**: 29ms · **window**: 450ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 105MB

### modal open: RoleEditDialog
- kind: `modal-open` · measured at +157107ms into run
- **settle**: 75ms · **first DOM change**: 21ms · **window**: 742ms
- frames 42 · avg 17.6ms · p95 17ms · worst 58ms · >50ms: 1
- long tasks: 1 (total 66ms, worst 66ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 41 · heap: 93MB

### modal close: RoleEditDialog
- kind: `modal-close` · measured at +157849ms into run
- **settle**: 183ms · **first DOM change**: 31ms · **window**: 450ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 96MB

### modal open: RoleAddDialog
- kind: `modal-open` · measured at +158299ms into run
- **settle**: 83ms · **first DOM change**: 24ms · **window**: 750ms
- frames 42 · avg 17.8ms · p95 17ms · worst 66ms · >50ms: 1
- long tasks: 1 (total 67ms, worst 67ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 38 · heap: 105MB

### modal close: RoleAddDialog
- kind: `modal-close` · measured at +159049ms into run
- **settle**: 183ms · **first DOM change**: 31ms · **window**: 450ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 109MB

### modal open: VoteEditorDialog
- kind: `modal-open` · measured at +159498ms into run
- **settle**: 108ms · **first DOM change**: 23ms · **window**: 775ms
- frames 42 · avg 18.4ms · p95 17ms · worst 91ms · >50ms: 1
- long tasks: 1 (total 94ms, worst 94ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 41 · heap: 103MB

### modal close: VoteEditorDialog
- kind: `modal-close` · measured at +160274ms into run
- **settle**: 200ms · **first DOM change**: 33ms · **window**: 466ms
- frames 28 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 107MB

### modal open: VoteEnableDialog
- kind: `modal-open` · measured at +160740ms into run
- **settle**: 83ms · **first DOM change**: 25ms · **window**: 750ms
- frames 42 · avg 17.8ms · p95 17ms · worst 66ms · >50ms: 1
- long tasks: 1 (total 67ms, worst 67ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 37 · heap: 116MB

### modal close: VoteEnableDialog
- kind: `modal-close` · measured at +161490ms into run
- **settle**: 200ms · **first DOM change**: 33ms · **window**: 467ms
- frames 28 · avg 16.7ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 98MB

### modal open: ActionEditorDialog
- kind: `modal-open` · measured at +161957ms into run
- **settle**: 100ms · **first DOM change**: 26ms · **window**: 767ms
- frames 42 · avg 18.2ms · p95 17ms · worst 83ms · >50ms: 1
- long tasks: 1 (total 89ms, worst 89ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 37 · heap: 84MB

### modal close: ActionEditorDialog
- kind: `modal-close` · measured at +162724ms into run
- **settle**: 200ms · **first DOM change**: 34ms · **window**: 466ms
- frames 28 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 88MB

### modal open: BioEditorDialog
- kind: `modal-open` · measured at +163190ms into run
- **settle**: 158ms · **first DOM change**: 27ms · **window**: 825ms
- frames 42 · avg 19.6ms · p95 17ms · worst 141ms · >50ms: 1
- long tasks: 1 (total 142ms, worst 142ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 66 · heap: 97MB

### modal close: BioEditorDialog
- kind: `modal-close` · measured at +164015ms into run
- **settle**: 184ms · **first DOM change**: 36ms · **window**: 450ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 110MB

### modal open: TagCellEditor
- kind: `modal-open` · measured at +164465ms into run
- **settle**: 150ms · **first DOM change**: 27ms · **window**: 817ms
- frames 42 · avg 19.4ms · p95 17ms · worst 133ms · >50ms: 1
- long tasks: 1 (total 136ms, worst 136ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 55 · heap: 109MB

### modal close: TagCellEditor
- kind: `modal-close` · measured at +165282ms into run
- **settle**: 200ms · **first DOM change**: 38ms · **window**: 466ms
- frames 28 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 113MB

### modal open: AddTagDialog
- kind: `modal-open` · measured at +165748ms into run
- **settle**: 117ms · **first DOM change**: 29ms · **window**: 767ms
- frames 41 · avg 18.7ms · p95 17ms · worst 100ms · >50ms: 1
- long tasks: 1 (total 101ms, worst 101ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 35 · heap: 110MB

### modal close: AddTagDialog
- kind: `modal-close` · measured at +166515ms into run
- **settle**: 183ms · **first DOM change**: 38ms · **window**: 450ms
- frames 27 · avg 16.6ms · p95 17ms · worst 17ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 114MB

### modal open: AddTagDialog (edit mode + trigger script)
- kind: `modal-open` · measured at +166965ms into run
- **settle**: 142ms · **first DOM change**: 31ms · **window**: 809ms
- frames 43 · avg 18.8ms · p95 17ms · worst 108ms · >50ms: 1
- long tasks: 1 (total 116ms, worst 116ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 56 · heap: 113MB

### modal close: AddTagDialog (edit mode + trigger script)
- kind: `modal-close` · measured at +167775ms into run
- **settle**: 207ms · **first DOM change**: 46ms · **window**: 474ms
- frames 28 · avg 16.9ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 117MB

### modal open: ChooseDayDialog
- kind: `modal-open` · measured at +168248ms into run
- **settle**: 125ms · **first DOM change**: 36ms · **window**: 793ms
- frames 42 · avg 18.8ms · p95 17ms · worst 108ms · >50ms: 1
- long tasks: 1 (total 110ms, worst 110ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 34 · heap: 86MB

### modal close: ChooseDayDialog
- kind: `modal-close` · measured at +169041ms into run
- **settle**: 207ms · **first DOM change**: 44ms · **window**: 474ms
- frames 28 · avg 16.9ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 91MB

### modal open: DaySelectionDialog
- kind: `modal-open` · measured at +169515ms into run
- **settle**: 100ms · **first DOM change**: 36ms · **window**: 767ms
- frames 42 · avg 18.2ms · p95 17ms · worst 83ms · >50ms: 1
- long tasks: 1 (total 90ms, worst 90ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 32 · heap: 102MB

### modal close: DaySelectionDialog
- kind: `modal-close` · measured at +170283ms into run
- **settle**: 191ms · **first DOM change**: 43ms · **window**: 457ms
- frames 27 · avg 16.9ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 107MB

### modal open: DaysPerGameDayDialog
- kind: `modal-open` · measured at +170740ms into run
- **settle**: 109ms · **first DOM change**: 38ms · **window**: 775ms
- frames 42 · avg 18.4ms · p95 17ms · worst 91ms · >50ms: 1
- long tasks: 1 (total 91ms, worst 91ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 34 · heap: 93MB

### modal close: DaysPerGameDayDialog
- kind: `modal-close` · measured at +171515ms into run
- **settle**: 192ms · **first DOM change**: 44ms · **window**: 458ms
- frames 27 · avg 17.0ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 98MB

### modal open: DeleteRoleConfirmationDialog
- kind: `modal-open` · measured at +171973ms into run
- **settle**: 108ms · **first DOM change**: 37ms · **window**: 775ms
- frames 42 · avg 18.4ms · p95 17ms · worst 91ms · >50ms: 1
- long tasks: 1 (total 91ms, worst 91ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 34 · heap: 109MB

### modal close: DeleteRoleConfirmationDialog
- kind: `modal-close` · measured at +172748ms into run
- **settle**: 208ms · **first DOM change**: 44ms · **window**: 475ms
- frames 28 · avg 16.9ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 95MB

### modal open: EditInfoDialog
- kind: `modal-open` · measured at +173223ms into run
- **settle**: 108ms · **first DOM change**: 38ms · **window**: 776ms
- frames 42 · avg 18.4ms · p95 17ms · worst 91ms · >50ms: 1
- long tasks: 1 (total 99ms, worst 99ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 42 · heap: 108MB

### modal close: EditInfoDialog
- kind: `modal-close` · measured at +173999ms into run
- **settle**: 207ms · **first DOM change**: 45ms · **window**: 474ms
- frames 28 · avg 16.9ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 113MB

### modal open: JoinedGameOptionsDialog
- kind: `modal-open` · measured at +174473ms into run
- **settle**: 150ms · **first DOM change**: 38ms · **window**: 816ms
- frames 42 · avg 19.4ms · p95 17ms · worst 133ms · >50ms: 1
- long tasks: 1 (total 136ms, worst 136ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 42 · heap: 105MB

### modal close: JoinedGameOptionsDialog
- kind: `modal-close` · measured at +175290ms into run
- **settle**: 209ms · **first DOM change**: 46ms · **window**: 475ms
- frames 28 · avg 16.9ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 119MB

### modal open: ArchivedGamesDialog
- kind: `modal-open` · measured at +175765ms into run
- **settle**: 150ms · **first DOM change**: 40ms · **window**: 817ms
- frames 42 · avg 19.4ms · p95 17ms · worst 133ms · >50ms: 1
- long tasks: 1 (total 134ms, worst 134ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 32 · heap: 86MB

### modal close: ArchivedGamesDialog
- kind: `modal-close` · measured at +176582ms into run
- **settle**: 208ms · **first DOM change**: 45ms · **window**: 475ms
- frames 28 · avg 16.9ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 100MB

### modal open: MarkdownInputBuilderDialog
- kind: `modal-open` · measured at +177057ms into run
- **settle**: 117ms · **first DOM change**: 40ms · **window**: 783ms
- frames 42 · avg 18.6ms · p95 17ms · worst 100ms · >50ms: 1
- long tasks: 1 (total 105ms, worst 105ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 53 · heap: 94MB

### modal close: MarkdownInputBuilderDialog
- kind: `modal-close` · measured at +177840ms into run
- **settle**: 208ms · **first DOM change**: 47ms · **window**: 475ms
- frames 28 · avg 16.9ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 99MB

### modal open: MarkdownVariableDialog
- kind: `modal-open` · measured at +178315ms into run
- **settle**: 108ms · **first DOM change**: 40ms · **window**: 776ms
- frames 42 · avg 18.4ms · p95 17ms · worst 91ms · >50ms: 1
- long tasks: 1 (total 97ms, worst 97ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 31 · heap: 111MB

### modal close: MarkdownVariableDialog
- kind: `modal-close` · measured at +179091ms into run
- **settle**: 207ms · **first DOM change**: 47ms · **window**: 474ms
- frames 28 · avg 16.9ms · p95 17ms · worst 25ms · >50ms: 0
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 97MB

### modal open: NightlyCertificationDialog
- kind: `modal-open` · measured at +179565ms into run
- **settle**: 183ms · **first DOM change**: 41ms · **window**: 851ms
- frames 42 · avg 20.2ms · p95 17ms · worst 166ms · >50ms: 1
- long tasks: 1 (total 172ms, worst 172ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 182 · heap: 103MB

### modal close: NightlyCertificationDialog
- kind: `modal-close` · measured at +180416ms into run
- **settle**: 216ms · **first DOM change**: 53ms · **window**: 482ms
- frames 28 · avg 17.2ms · p95 17ms · worst 33ms · >50ms: 0
- long tasks: 1 (total 53ms, worst 53ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 109MB

### modal open: ScheduleTableUpdateDialog
- kind: `modal-open` · measured at +180898ms into run
- **settle**: 152ms · **first DOM change**: 43ms · **window**: 816ms
- frames 42 · avg 19.4ms · p95 17ms · worst 133ms · >50ms: 1
- long tasks: 1 (total 137ms, worst 137ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 60 · heap: 104MB

### modal close: ScheduleTableUpdateDialog
- kind: `modal-close` · measured at +181715ms into run
- **settle**: 217ms · **first DOM change**: 52ms · **window**: 483ms
- frames 28 · avg 17.2ms · p95 17ms · worst 33ms · >50ms: 0
- long tasks: 1 (total 52ms, worst 52ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 86MB

### modal open: ColumnActionsDialog
- kind: `modal-open` · measured at +182198ms into run
- **settle**: 125ms · **first DOM change**: 44ms · **window**: 791ms
- frames 42 · avg 18.8ms · p95 17ms · worst 108ms · >50ms: 1
- long tasks: 1 (total 110ms, worst 110ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 43 · heap: 100MB

### modal close: ColumnActionsDialog
- kind: `modal-close` · measured at +182990ms into run
- **settle**: 200ms · **first DOM change**: 51ms · **window**: 466ms
- frames 27 · avg 17.3ms · p95 17ms · worst 33ms · >50ms: 0
- long tasks: 1 (total 51ms, worst 51ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 106MB

### modal open: PhoneBookTocDialog
- kind: `modal-open` · measured at +183457ms into run
- **settle**: 150ms · **first DOM change**: 45ms · **window**: 818ms
- frames 42 · avg 19.4ms · p95 17ms · worst 133ms · >50ms: 1
- long tasks: 1 (total 135ms, worst 135ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 42 · heap: 107MB

### modal close: PhoneBookTocDialog
- kind: `modal-close` · measured at +184274ms into run
- **settle**: 199ms · **first DOM change**: 53ms · **window**: 465ms
- frames 27 · avg 17.2ms · p95 17ms · worst 33ms · >50ms: 0
- long tasks: 1 (total 53ms, worst 53ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 87MB

### modal open: TableOfContentsDialog (rulebook)
- kind: `modal-open` · measured at +184740ms into run
- **settle**: 150ms · **first DOM change**: 46ms · **window**: 817ms
- frames 42 · avg 19.4ms · p95 17ms · worst 133ms · >50ms: 1
- long tasks: 1 (total 136ms, worst 136ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 88 · heap: 108MB

### modal close: TableOfContentsDialog (rulebook)
- kind: `modal-close` · measured at +185557ms into run
- **settle**: 217ms · **first DOM change**: 55ms · **window**: 483ms
- frames 28 · avg 17.2ms · p95 17ms · worst 33ms · >50ms: 0
- long tasks: 1 (total 55ms, worst 55ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 94MB

### modal open: ImportDraftDialog
- kind: `modal-open` · measured at +186040ms into run
- **settle**: 198ms · **first DOM change**: 48ms · **window**: 858ms
- frames 43 · avg 20.0ms · p95 17ms · worst 108ms · >50ms: 2
- long tasks: 2 (total 192ms, worst 114ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 120 · heap: 107MB

### modal close: ImportDraftDialog
- kind: `modal-close` · measured at +186898ms into run
- **settle**: 208ms · **first DOM change**: 59ms · **window**: 475ms
- frames 27 · avg 17.6ms · p95 17ms · worst 42ms · >50ms: 0
- long tasks: 1 (total 59ms, worst 59ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 103MB

### modal open: NewspaperSectionOptionsDialog
- kind: `modal-open` · measured at +187373ms into run
- **settle**: 158ms · **first DOM change**: 49ms · **window**: 825ms
- frames 42 · avg 19.6ms · p95 17ms · worst 141ms · >50ms: 1
- long tasks: 1 (total 142ms, worst 142ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 39 · heap: 109MB

### modal close: NewspaperSectionOptionsDialog
- kind: `modal-close` · measured at +188198ms into run
- **settle**: 217ms · **first DOM change**: 55ms · **window**: 483ms
- frames 28 · avg 17.2ms · p95 17ms · worst 33ms · >50ms: 0
- long tasks: 1 (total 55ms, worst 55ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 116MB

### modal open: PlayerPreviewModal
- kind: `modal-open` · measured at +188682ms into run
- **settle**: 208ms · **first DOM change**: 49ms · **window**: 875ms
- frames 42 · avg 20.8ms · p95 17ms · worst 191ms · >50ms: 1
- long tasks: 1 (total 195ms, worst 195ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 93 · heap: 89MB

### modal close: PlayerPreviewModal
- kind: `modal-close` · measured at +189557ms into run
- **settle**: 225ms · **first DOM change**: 59ms · **window**: 492ms
- frames 28 · avg 17.5ms · p95 17ms · worst 42ms · >50ms: 0
- long tasks: 1 (total 59ms, worst 59ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 95MB

### modal open: TownSquareImageDialog
- kind: `modal-open` · measured at +190048ms into run
- **settle**: 133ms · **first DOM change**: 49ms · **window**: 800ms
- frames 42 · avg 19.0ms · p95 17ms · worst 116ms · >50ms: 1
- long tasks: 1 (total 121ms, worst 121ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 36 · heap: 109MB

### modal close: TownSquareImageDialog
- kind: `modal-close` · measured at +190848ms into run
- **settle**: 208ms · **first DOM change**: 61ms · **window**: 475ms
- frames 27 · avg 17.6ms · p95 17ms · worst 42ms · >50ms: 0
- long tasks: 1 (total 60ms, worst 60ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 96MB

### modal open: TownSquareLinkDialog
- kind: `modal-open` · measured at +191323ms into run
- **settle**: 133ms · **first DOM change**: 52ms · **window**: 800ms
- frames 42 · avg 19.0ms · p95 17ms · worst 116ms · >50ms: 1
- long tasks: 1 (total 121ms, worst 121ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 39 · heap: 111MB

### modal close: TownSquareLinkDialog
- kind: `modal-close` · measured at +192123ms into run
- **settle**: 225ms · **first DOM change**: 58ms · **window**: 491ms
- frames 28 · avg 17.5ms · p95 17ms · worst 42ms · >50ms: 0
- long tasks: 1 (total 57ms, worst 57ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 100MB

### modal open: TownSquareMoreOptionsDialog
- kind: `modal-open` · measured at +192615ms into run
- **settle**: 133ms · **first DOM change**: 51ms · **window**: 800ms
- frames 42 · avg 19.0ms · p95 17ms · worst 116ms · >50ms: 1
- long tasks: 1 (total 120ms, worst 120ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 36 · heap: 115MB

### modal close: TownSquareMoreOptionsDialog
- kind: `modal-close` · measured at +193415ms into run
- **settle**: 200ms · **first DOM change**: 57ms · **window**: 466ms
- frames 27 · avg 17.3ms · p95 17ms · worst 33ms · >50ms: 0
- long tasks: 1 (total 56ms, worst 56ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 104MB

### modal open: ConfirmDialog
- kind: `modal-open` · measured at +193882ms into run
- **settle**: 133ms · **first DOM change**: 51ms · **window**: 800ms
- frames 42 · avg 19.0ms · p95 17ms · worst 116ms · >50ms: 1
- long tasks: 1 (total 118ms, worst 118ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 118MB

### modal close: ConfirmDialog
- kind: `modal-close` · measured at +194682ms into run
- **settle**: 217ms · **first DOM change**: 56ms · **window**: 483ms
- frames 28 · avg 17.2ms · p95 17ms · worst 33ms · >50ms: 0
- long tasks: 1 (total 56ms, worst 56ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 108MB

### modal open: ImageUploadDialog
- kind: `modal-open` · measured at +195165ms into run
- **settle**: 133ms · **first DOM change**: 50ms · **window**: 800ms
- frames 42 · avg 19.0ms · p95 17ms · worst 116ms · >50ms: 1
- long tasks: 1 (total 121ms, worst 121ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 44 · heap: 83MB

### modal close: ImageUploadDialog
- kind: `modal-close` · measured at +195965ms into run
- **settle**: 225ms · **first DOM change**: 60ms · **window**: 491ms
- frames 28 · avg 17.5ms · p95 17ms · worst 42ms · >50ms: 0
- long tasks: 1 (total 59ms, worst 59ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 47 · heap: 89MB

### modal open: SaveHistoryDialog
- kind: `modal-open` · measured at +196457ms into run
- **settle**: 142ms · **first DOM change**: 52ms · **window**: 808ms
- frames 42 · avg 19.2ms · p95 17ms · worst 125ms · >50ms: 1
- long tasks: 1 (total 128ms, worst 128ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 40 · heap: 105MB

### modal close: SaveHistoryDialog
- kind: `modal-close` · measured at +197265ms into run
- **settle**: 208ms · **first DOM change**: 58ms · **window**: 475ms
- frames 27 · avg 17.6ms · p95 17ms · worst 42ms · >50ms: 0
- long tasks: 1 (total 58ms, worst 58ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 91MB

### modal open: UnsavedChangesDialog
- kind: `modal-open` · measured at +197740ms into run
- **settle**: 133ms · **first DOM change**: 52ms · **window**: 800ms
- frames 42 · avg 19.0ms · p95 17ms · worst 116ms · >50ms: 1
- long tasks: 1 (total 118ms, worst 118ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 105MB

### modal close: UnsavedChangesDialog
- kind: `modal-close` · measured at +198540ms into run
- **settle**: 208ms · **first DOM change**: 60ms · **window**: 475ms
- frames 27 · avg 17.6ms · p95 17ms · worst 42ms · >50ms: 0
- long tasks: 1 (total 60ms, worst 60ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 95MB

### modal open: ViewOnlyPreviewModal
- kind: `modal-open` · measured at +199015ms into run
- **settle**: 133ms · **first DOM change**: 53ms · **window**: 800ms
- frames 42 · avg 19.0ms · p95 17ms · worst 116ms · >50ms: 1
- long tasks: 1 (total 118ms, worst 118ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 28 · heap: 109MB

### modal close: ViewOnlyPreviewModal
- kind: `modal-close` · measured at +199815ms into run
- **settle**: 225ms · **first DOM change**: 59ms · **window**: 491ms
- frames 28 · avg 17.5ms · p95 17ms · worst 42ms · >50ms: 0
- long tasks: 1 (total 58ms, worst 58ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 99MB

### modal open: DeleteGameConfirmationDialog
- kind: `modal-open` · measured at +200307ms into run
- **settle**: 133ms · **first DOM change**: 53ms · **window**: 800ms
- frames 42 · avg 19.0ms · p95 17ms · worst 116ms · >50ms: 1
- long tasks: 1 (total 122ms, worst 122ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 34 · heap: 114MB

### modal close: DeleteGameConfirmationDialog
- kind: `modal-close` · measured at +201107ms into run
- **settle**: 225ms · **first DOM change**: 58ms · **window**: 491ms
- frames 28 · avg 17.5ms · p95 17ms · worst 42ms · >50ms: 0
- long tasks: 1 (total 58ms, worst 58ms)
- queries subscribed during window: 0 · active data subs after: 669 · dom mutations: 30 · heap: 103MB

### — Tour complete
> 164 steps in 199.7s
