/**
 * sim/seed.ts
 *
 * Populates the mock backend with a realistic game world so every screen has
 * representative data to render during the audit.
 */

import { mockDb } from './mockDb';
import {
  GAME_NEWSER,
  GAME_OP,
  GAME_PLAYER,
  NUM_COMMENTS,
  NUM_DAYS,
  NUM_NEWSPAPER_DAYS,
  NUM_PLAYERS,
  NUM_ROLES,
  NUM_THREADS,
  OTHER_GM,
  PLAYER_NAMES,
  ROLE_NAMES,
  SIM_USER,
} from './seedData';

const DAY_MS = 86400000;

const fmtDay = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;

const playerUserId = (i: number) => `user_player_${String(i + 1).padStart(2, '0')}`;
const playerEmail = (i: number) =>
  `${PLAYER_NAMES[i].split(' ')[0].toLowerCase()}.${PLAYER_NAMES[i].split(' ')[1].toLowerCase()}@wolfspoint.test`;

function lorem(sentences: number, seedWord: string) {
  const words = (
    'wolf moon night village suspicion shadows council vote dawn pack whispers ' +
    'torch light alibi tracks howl evidence silence fear trust betrayal pattern ' +
    'timing window letter meeting cellar witness rumor claw marks graveyard'
  ).split(' ');
  const out: string[] = [];
  let s = 7 + seedWord.length;
  for (let i = 0; i < sentences; i++) {
    const len = 8 + ((s * 31 + i * 17) % 9);
    const sentence: string[] = [];
    for (let w = 0; w < len; w++) {
      sentence.push(words[(s + w * 13 + i * 7) % words.length]);
      s = (s * 1103515245 + 12345) % 2147483648 >>> 0;
    }
    const str = sentence.join(' ');
    out.push(str.charAt(0).toUpperCase() + str.slice(1) + '.');
  }
  return out.join(' ');
}

function markdownParagraphs(n: number, seedWord: string) {
  const chunks: string[] = [];
  for (let i = 0; i < n; i++) {
    if (i % 4 === 3) chunks.push('---');
    chunks.push(lorem(3 + (i % 3), seedWord + i));
  }
  return chunks.join('\n\n');
}

function dayDates(): string[] {
  const start = new Date();
  start.setDate(start.getDate() - (NUM_DAYS - 2)); // second-to-last day lands today
  const out: string[] = [];
  for (let i = 0; i < NUM_DAYS; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    out.push(fmtDay(d));
  }
  return out;
}

function buildUserTable(gameId: string, includeSimUser: boolean) {
  const rows: any[] = [];
  const count = NUM_PLAYERS;
  for (let i = 0; i < count; i++) {
    const isSim = includeSimUser && i === 0;
    const role = ROLE_NAMES[i % NUM_ROLES];
    const dead = i % 5 === 4; // ~20% dead
    const days: any[] = [];
    for (let d = 0; d < NUM_DAYS; d++) {
      const vote = d < NUM_DAYS - 2 ? playerEmail((i + d * 3) % count) : '';
      const action =
        d < NUM_DAYS - 2 && i % 3 === 0
          ? { 'Action': `Investigate ${PLAYER_NAMES[(i + d) % count]}` }
          : {};
      days.push({
        vote,
        action,
        voteInputs: vote ? { Vote: vote } : {},
        extraColumns: [
          d % 2 === 0 ? `Suspicion ${((i + d) % 9) + 1}` : '',
          lorem(1, `${i}-${d}`),
          '',
        ],
      });
    }
    rows.push({
      realName: isSim ? SIM_USER.name : PLAYER_NAMES[i],
      email: isSim ? SIM_USER.email : playerEmail(i),
      userId: isSim ? SIM_USER.userId : playerUserId(i),
      role,
      playerData: {
        livingState: dead ? 'dead' : 'alive',
        extraColumns: [`Alliance-${i % 4}`, i % 2 === 0 ? 'Note: veteran player' : ''],
      },
      days,
    });
  }
  return rows;
}

function buildRoleTable() {
  const rows: any[] = [];
  for (let i = 0; i < NUM_ROLES; i++) {
    const votes = i % 4 !== 3;
    rows.push({
      role: ROLE_NAMES[i],
      doesRoleVote: votes,
      isVisible: true,
      hiddenFromRulebook: i === NUM_ROLES - 1,
      roleMessage:
        `## ${ROLE_NAMES[i]} nightly brief\n\n` +
        lorem(4, ROLE_NAMES[i]) +
        `\n\n/*script\nCreateSelectInput({\n  LIST = players.Filter(Item => (Item.entry("isAlive") == true)),\n  LABEL = "Target",\n});\nscript*/\n\n` +
        lorem(2, ROLE_NAMES[i] + 'x'),
      voteMessage: votes
        ? `/*script\nCreateSelectVoteInput({\n  LIST = players.Filter(Item => (Item.entry("isAlive") == true)),\n  LABEL = "Vote",\n  NUMSELECTABLE = 1,\n  MULTIPLYER = 1,\n});\nscript*/`
        : '',
      aboutRole: `**${ROLE_NAMES[i]}** — ` + lorem(5, 'about' + i),
    });
  }
  return rows;
}

function buildNewspaper(gameId: string, dayIndex: number) {
  const sections = [
    {
      id: `sec-${dayIndex}-a`,
      titleFont: 'playfairDisplay',
      dividerStyle: 'diamond',
      columns: [
        `# The WolffsPoint Herald — Day ${dayIndex + 1}\n\n${markdownParagraphs(7, `news-a-${dayIndex}`)}`,
        `## Council Notes\n\n${markdownParagraphs(6, `news-b-${dayIndex}`)}`,
      ],
    },
    {
      id: `sec-${dayIndex}-b`,
      titleFont: 'libreBaskerville',
      dividerStyle: 'thin',
      columns: [
        `## Opinion\n\n${markdownParagraphs(6, `op-${dayIndex}`)}`,
        `## Letters to the Editor\n\n${markdownParagraphs(6, `letters-${dayIndex}`)}`,
        `## Classifieds\n\n${markdownParagraphs(5, `cls-${dayIndex}`)}`,
      ],
    },
    {
      id: `sec-${dayIndex}-c`,
      titleFont: 'imFellEnglish',
      dividerStyle: 'doubleThin',
      columns: [
        `## Obituaries\n\n${markdownParagraphs(5, `obit-${dayIndex}`)}`,
      ],
    },
  ];
  return { columns: [], sections };
}

const THREAD_TITLES = [
  'Who was near the granary last night?', 'Vote analysis: days 3-7', 'The Seer claims thread',
  'Suspicious silence from the east side', 'Rules clarification request', 'Alliance proposal',
  'Pattern in the night attacks', 'Defense of my actions', 'Vote history spreadsheet',
  'New player questions', 'The cellar door theory', 'Emergency council meeting',
  'Reading the tracks correctly', 'Why I voted the way I did', 'The herbalist\'s testimony',
];

function seedTownSquare(gameId: string, ownerIds: string[]) {
  const now = Date.now();
  const postIds: string[] = [];
  for (let t = 0; t < NUM_THREADS; t++) {
    const postId = `post-${gameId}-${t}`;
    postIds.push(postId);
    const author = ownerIds[t % ownerIds.length];
    const title = THREAD_TITLES[t % THREAD_TITLES.length] + (t >= THREAD_TITLES.length ? ` (${Math.floor(t / THREAD_TITLES.length) + 1})` : '');
    const markdown = `## ${title}\n\n` + markdownParagraphs(3 + (t % 5), `thread-${t}`);
    mockDb.seedListItem(author, `townSquarePosts-${gameId}`, postId, {
      gameId,
      postId,
      authorUserId: author,
      markdown,
      bodyMarkdown: markdown,
      plainText: markdown.replace(/[#*_\-\n]/g, ' ').replace(/\s+/g, ' ').trim(),
      title,
      createdAt: now - (NUM_THREADS - t) * 3600_000 * 2,
      postType: t % 11 === 10 ? 'announcement' : 'thread',
      isPinned: t === 0,
    }, {
      privacy: 'PUBLIC',
      searchKeys: ['title', 'plainText', 'markdown'],
      sortKey: 'createdAt',
    });
  }

  for (let c = 0; c < NUM_COMMENTS; c++) {
    const postId = postIds[c % postIds.length];
    const parentCommentId = c % 6 === 0 && c > 0 ? `comment-${gameId}-${c - 1}` : undefined;
    const commentId = `comment-${gameId}-${c}`;
    const author = ownerIds[(c * 3) % ownerIds.length];
    const markdown = lorem(2 + (c % 4), `comment-${c}`);
    mockDb.seedListItem(author, `townSquareComments-${gameId}`, commentId, {
      gameId,
      postId,
      commentId,
      authorUserId: author,
      markdown,
      plainText: markdown,
      parentCommentId,
      replyToCommentId: parentCommentId,
      createdAt: now - (NUM_COMMENTS - c) * 900_000,
    }, {
      privacy: 'PUBLIC',
      filterKey: 'postId',
      searchKeys: ['plainText', 'markdown'],
      sortKey: 'createdAt',
    });
  }
}

function seedUserData(userId: string, name: string, email: string) {
  mockDb.seedVar(userId, 'userData', { name, email, userId }, {
    privacy: 'PUBLIC',
    searchKeys: ['name'],
  });
  mockDb.seedVar(userId, 'customUserInfo', { name, photoUrl: '' }, {
    privacy: 'PUBLIC',
    searchKeys: ['name'],
  });
}

function seedGameShared(gameId: string, operatorId: string, opts: {
  includeSimPlayer?: boolean;
  newserUserId?: string;
  newserEmail?: string;
} = {}) {
  const days = dayDates();

  // games list entry
  mockDb.seedListItem(operatorId, 'games', gameId, {
    id: gameId,
    name: `Simulation Game ${gameId.slice(0, 4)}`,
    description: 'Perf audit dummy game',
  }, { privacy: 'PUBLIC', filterKey: 'id', searchKeys: ['name'], sortKey: 'createdAt' });

  // core tables
  mockDb.seedListItem(operatorId, 'userTable', gameId, buildUserTable(gameId, !!opts.includeSimPlayer), { privacy: 'PUBLIC' });
  mockDb.seedListItem(operatorId, 'userTableTitle', gameId, {
    extraUserColumns: ['Alliance', 'Operator Notes'],
    extraDayColumns: ['Suspicion', 'Intel', 'Marks'],
  }, { privacy: 'PUBLIC' });
  mockDb.seedListItem(operatorId, 'userTableColumnVisibility', gameId, {
    extraUserColumns: [true, true],
    extraDayColumns: [true, true, false],
  }, { privacy: 'PUBLIC' });
  mockDb.seedListItem(operatorId, 'userTableColumnNightlyVisibility', gameId, {
    extraUserColumns: [true, false],
    extraDayColumns: [true, false, false],
  }, { privacy: 'PUBLIC' });
  mockDb.seedListItem(operatorId, 'dayDatesArray', gameId, days, { privacy: 'PUBLIC' });
  mockDb.seedListItem(operatorId, 'selectedDayIndex', gameId, NUM_DAYS - 3, { privacy: 'PUBLIC' });
  mockDb.seedListItem(operatorId, 'numberOfRealDaysPerInGameDay', gameId, 1, { privacy: 'PUBLIC' });
  mockDb.seedListItem(operatorId, 'skipVotingDays', gameId, [], { privacy: 'PUBLIC' });
  mockDb.seedListItem(operatorId, 'skipActionsDays', gameId, [], { privacy: 'PUBLIC' });
  mockDb.seedListItem(operatorId, 'hasCompletedInitialDaySetup', gameId, true, { privacy: 'PUBLIC' });
  mockDb.seedListItem(operatorId, 'voteMessageDefault', gameId,
    '/*script\nCreateSelectVoteInput({\n  LIST = players.Filter(Item => (Item.entry("isAlive") == true)),\n  LABEL = "Vote",\n  NUMSELECTABLE = 1,\n  MULTIPLYER = 1,\n});\nscript*/',
    { privacy: 'PUBLIC' });
  mockDb.seedListItem(operatorId, 'roleTable', gameId, buildRoleTable(), { privacy: 'PUBLIC' });
  mockDb.seedListItem(operatorId, 'morningMessagesList', gameId,
    Object.fromEntries(days.map((_, i) => [`day-${i}`, [`Dawn report ${i + 1}: ${lorem(2, 'morning' + i)}`]])),
    { privacy: 'PUBLIC' });

  // game-scoped vars
  mockDb.seedVar(operatorId, `gameSchedule-${gameId}`, {
    nightlyDeadlineTime: '22:00',
    actionDeadlineTime: '22:00',
    voteDeadlineTime: '21:00',
    wakeUpTime: '08:00',
    nightlyResponseReleaseTime: '08:00',
    newspaperReleaseTime: '08:00',
    publicVoting: true,
    timezone: 'America/New_York',
  }, { privacy: 'PUBLIC' });

  const ruleBookSections: string[] = ['# The Book of WolffsPoint\n\n_Official rule book for the simulation._\n'];
  for (let s = 0; s < 14; s++) {
    ruleBookSections.push(`## Section ${s + 1}: ${['Setup', 'Night phase', 'Day phase', 'Voting', 'Roles', 'Winning', 'Timing', 'Items', 'Deaths', 'Spectators', 'Etiquette', 'Edge cases', 'Amendments', 'Appendix'][s]}\n\n${markdownParagraphs(7, `rule-${s}`)}`);
  }
  mockDb.seedVar(operatorId, `ruleBook-${gameId}`, {
    content: ruleBookSections.join('\n\n'),
    roleOrder: Array.from({ length: NUM_ROLES }, (_, i) => i),
    ruleBookTitle: 'Book of WolffsPoint',
    roleDescriptionsTitle: 'Roles in play',
  }, { privacy: 'PUBLIC' });

  mockDb.seedVar(operatorId, `tagDefinitions-${gameId}`, [
    { name: 'Infected', color: '#e11d48' },
    { name: 'Protected', color: '#22c55e' },
    { name: 'Suspicious', color: '#f59e0b' },
    { name: 'Cleared', color: '#3b82f6' },
    { name: 'Watched', color: '#a855f7' },
  ], { privacy: 'PUBLIC' });
  mockDb.seedVar(operatorId, `tagTriggers-${gameId}`, {}, { privacy: 'PUBLIC' });

  // newser assignment (optional)
  if (opts.newserUserId) {
    mockDb.seedVar(operatorId, `newserAssignment-${gameId}`, {
      email: opts.newserEmail ?? '',
      userId: opts.newserUserId,
      assignedAt: Date.now() - DAY_MS * 5,
    }, { privacy: 'PUBLIC' });
    mockDb.seedVar(opts.newserUserId, `newserAccepted-${gameId}`, {
      email: opts.newserEmail ?? '',
      userId: opts.newserUserId,
      gameId,
      acceptedAt: Date.now() - DAY_MS * 5,
    }, { privacy: 'PUBLIC' });
    for (let d = 0; d < NUM_NEWSPAPER_DAYS; d++) {
      mockDb.seedListItem(operatorId, `newspaperControl-${gameId}`, `day-${d}`, {
        ownerType: 'newser',
        ownerUserId: opts.newserUserId,
        newserUserId: opts.newserUserId,
        newserEmail: opts.newserEmail ?? '',
        updatedAt: Date.now() - DAY_MS * 2,
      }, { privacy: 'PUBLIC', filterKey: undefined });
    }
  } else {
    for (let d = 0; d < NUM_NEWSPAPER_DAYS; d++) {
      mockDb.seedListItem(operatorId, `newspaperControl-${gameId}`, `day-${d}`, {
        ownerType: 'operator',
        ownerUserId: operatorId,
        newserUserId: '',
        newserEmail: '',
        updatedAt: Date.now() - DAY_MS * 2,
      }, { privacy: 'PUBLIC' });
    }
  }

  // newspaper days (owned by whoever has control)
  const paperOwner = opts.newserUserId ?? operatorId;
  for (let d = 0; d < NUM_NEWSPAPER_DAYS; d++) {
    mockDb.seedListItem(paperOwner, 'newspaper', `${gameId}-day-${d}`, buildNewspaper(gameId, d), {
      privacy: 'PUBLIC',
      filterKey: undefined,
      sortKey: 'createdAt',
    });
    // some day comments
    for (let c = 0; c < 4; c++) {
      const cid = `ncomment-${gameId}-${d}-${c}`;
      const md = lorem(2, `nc-${d}-${c}`);
      mockDb.seedListItem(playerUserId((d * 5 + c) % NUM_PLAYERS), `newspaperDayComments-${gameId}`, cid, {
        gameId,
        postId: `${gameId}-day-${d}`,
        commentId: cid,
        authorUserId: playerUserId((d * 5 + c) % NUM_PLAYERS),
        markdown: md,
        plainText: md,
        createdAt: Date.now() - (NUM_NEWSPAPER_DAYS - d) * DAY_MS + c * 60_000,
      }, { privacy: 'PUBLIC', filterKey: 'postId', sortKey: 'createdAt' });
    }
  }

  // player profiles + night submissions
  const roster = buildUserTable(gameId, !!opts.includeSimPlayer);
  const allUserIds = [SIM_USER.userId, ...Array.from({ length: NUM_PLAYERS }, (_, i) => playerUserId(i))];
  for (let i = 0; i < roster.length; i++) {
    const row = roster[i];
    const uid = row.userId as string;
    mockDb.seedVar(uid, `playerProfile-${gameId}`, {
      gameId,
      email: row.email,
      userId: uid,
      inGameName: row.realName,
      profileImageUrl: '',
      phoneNumber: `555-01${String(i).padStart(2, '0')}`,
      instagram: i % 3 === 0 ? `@${row.realName.split(' ')[0].toLowerCase()}` : '',
      discord: i % 4 === 0 ? `${row.realName.split(' ')[0].toLowerCase()}#${1000 + i}` : '',
      otherContact: '',
      bioMarkdown: `**${row.realName}** — ${lorem(3, 'bio' + i)}`,
      claimedAt: Date.now() - DAY_MS * 10,
    }, { privacy: 'PUBLIC', searchKeys: ['inGameName', 'bioMarkdown'], sortKey: 'inGameName' });

    for (let d = 0; d < NUM_DAYS - 2; d++) {
      mockDb.seedVar(uid, `playerNightSubmission-day-${d}-${gameId}`, {
        gameId,
        gameDayId: `${gameId}-day-${d}`,
        dayIndex: d,
        playerEmail: row.email,
        playerUserId: uid,
        vote: playerEmail((i + d * 3) % NUM_PLAYERS),
        voteInputs: { Vote: playerEmail((i + d * 3) % NUM_PLAYERS) },
        voteMultiplier: 1,
        action: { 'Action': `Watch ${PLAYER_NAMES[(i + d) % NUM_PLAYERS]}` },
        submittedVoteAt: Date.now() - (NUM_DAYS - d) * DAY_MS,
        submittedActionAt: Date.now() - (NUM_DAYS - d) * DAY_MS + 60_000,
      }, { privacy: 'PUBLIC' });
    }
  }

  // town square
  seedTownSquare(gameId, allUserIds);
}

export function seedMockDb() {
  mockDb.viewerUserId = SIM_USER.userId;

  // users
  seedUserData(SIM_USER.userId, SIM_USER.name, SIM_USER.email);
  seedUserData(OTHER_GM.userId, OTHER_GM.name, OTHER_GM.email);
  for (let i = 0; i < NUM_PLAYERS; i++) {
    seedUserData(playerUserId(i), PLAYER_NAMES[i], playerEmail(i));
  }

  // Game 1 — current user is operator
  seedGameShared(GAME_OP, SIM_USER.userId, {
    newserUserId: playerUserId(0),
    newserEmail: playerEmail(0),
  });

  // Game 2 — current user is a player
  seedGameShared(GAME_PLAYER, OTHER_GM.userId, { includeSimPlayer: true });

  // Game 3 — current user is the newser
  seedGameShared(GAME_NEWSER, OTHER_GM.userId, {
    includeSimPlayer: true,
    newserUserId: SIM_USER.userId,
    newserEmail: SIM_USER.email,
  });

  // current-user variables
  mockDb.seedVar(SIM_USER.userId, 'activeGameId', '', { privacy: 'PRIVATE' });
  mockDb.seedVar(SIM_USER.userId, 'gamesTheyJoined', [GAME_PLAYER, GAME_NEWSER], { privacy: 'PRIVATE' });
  mockDb.seedVar(SIM_USER.userId, 'archivedGames', [], { privacy: 'PRIVATE' });
  mockDb.seedVar(SIM_USER.userId, 'savedFunctions', [], { privacy: 'PRIVATE' });
  mockDb.seedVar(SIM_USER.userId, 'saveHistory', [], { privacy: 'PRIVATE' });
  mockDb.seedVar(SIM_USER.userId, 'newspaperSectionDefaults',
    { titleFont: 'libreBaskerville', dividerStyle: 'thin' }, { privacy: 'PRIVATE' });
  for (const g of [GAME_OP, GAME_PLAYER, GAME_NEWSER]) {
    mockDb.seedVar(SIM_USER.userId, `townSquareReadState-${g}`, {}, { privacy: 'PUBLIC' });
  }

  // globals
  mockDb.globals.set('latestClientVersion', 0);
}

let seeded = false;
export function ensureSeeded() {
  if (!seeded) {
    seeded = true;
    const t0 = performance.now();
    seedMockDb();
    console.log(`[sim] seeded mock db in ${(performance.now() - t0).toFixed(1)}ms`, {
      vars: mockDb.vars.size,
      listItems: mockDb.listItems.size,
      listDefs: mockDb.listDefs.size,
    });
  }
}
