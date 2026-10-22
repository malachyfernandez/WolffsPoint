import assert from 'node:assert/strict';
import { test } from 'node:test';
import { planLiveCertification, type LiveCertificationInput } from '../utils/liveCertification';
import {
  effectiveCell,
  effectiveCellText,
  applyCellOp,
  parseCellPieces,
  fileCellEditorText,
} from '../utils/cellPieces';
import { cleanupFileInputUserTable } from '../utils/fileInputCleanup';
import {
  trackManualTableChanges,
  trackManualMessages,
  latestFieldSource,
  writeManualField,
} from '../utils/fieldProvenance';
import { splitFieldProvenance, joinFieldProvenance } from '../utils/fieldProvenanceStorage';
import { adoptCertificationIdentities } from '../utils/certificationIdentity';
import type { UserTableItem } from '../types/playerTable';
import { buildFilesIndex, createMarkdownFileSource } from '../utils/scriptFiles';
import { MockDb, keyOf, mockDb } from '../sim/mockDb';
import { encodeUserValue } from '../hooks/userValueSerialization';
import { normalizePlayerPageState } from '../components/game/playerTableNormalization';

const setup = (): LiveCertificationInput => {
  let id = 0;
  const users: UserTableItem[] = ['Alice', 'Bob'].map((realName) => ({
    realName,
    email: `${realName.toLowerCase()}@example.com`,
    userId: realName,
    role: '',
    playerData: { livingState: 'alive', extraColumns: [''] },
    days: [{ vote: 'baseline', action: 'baseline', voteMultiplier: 1, extraColumns: [''] }],
  }));
  const table = adoptCertificationIdentities(
    users,
    { extraUserColumns: ['Status'], extraDayColumns: ['Notes'] },
    1,
    (kind) => `${kind}-${id++}`
  );
  return {
    ...table,
    mornings: {},
    day: 0,
    type: 'votes',
    runId: 'first',
    env: { strict: true, legacyTriggers: {} },
    submissions: {
      'alice@example.com': {
        gameId: 'game',
        gameDayId: 'day-0',
        dayIndex: 0,
        playerEmail: 'alice@example.com',
        playerUserId: 'Alice',
        vote: 'Bob',
        action: 'infect',
        submittedVoteAt: 1,
        submittedActionAt: 1,
      },
    },
  };
};
const replay = (
  input: LiveCertificationInput,
  result: ReturnType<typeof planLiveCertification>
) => ({
  ...input,
  users: result.users,
  mornings: result.mornings,
  runId: 'next',
});
const infect = (input: LiveCertificationInput) => {
  input.type = 'actions';
  input.submissions['alice@example.com'].plannedUpdates = [
    {
      playerIndex: 1,
      dayIndex: null,
      column: 'Status',
      columnType: 'user',
      op: 'add',
      itemName: 'cellContents',
      updateExpression: 'tag("Infected")',
    },
  ];
};
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

test('removing a file input keeps re-certification clean and preserves independent module owners', () => {
  const input = setup();
  input.type = 'actions';
  const file = {
    id: 'input-file',
    path: 'Input file',
    kind: 'script' as const,
    updatedAt: 1,
    source: 'FileInput({NAME = "Removed"}); CreateMarkdown({CONTENT = "body"});',
  };
  input.env.index = buildFilesIndex({ files: { [file.id]: file }, folders: [] });
  input.submissions['alice@example.com'].plannedUpdates = [
    {
      playerIndex: 1,
      dayIndex: null,
      column: 'Status',
      columnType: 'user',
      op: 'add',
      itemName: 'cellContents',
      updateExpression: 'File({ID = "input-file", Removed = "old value"})',
    },
  ];
  const submitted = clone(input.submissions);
  const first = planLiveCertification(input);
  first.users[1].playerData.extraColumns![0] = applyCellOp(
    first.users[1].playerData.extraColumns![0],
    {
      mode: 'append',
      valueKind: 'file',
      value: file.id,
      source: 'manual',
      fileCall: 'File({ID = "input-file", Removed = "manual value"})',
    }
  );
  const index = buildFilesIndex({
    files: {
      [file.id]: {
        ...file,
        source: 'CreateMarkdown({CONTENT = "body"});',
        updatedAt: 2,
      },
    },
    folders: [],
  });
  const next = replay(input, first);
  next.env = { ...next.env, index };
  next.users = cleanupFileInputUserTable(next.users, index);
  const result = planLiveCertification(next);
  assert.deepEqual(result.conflicts, []);
  const raw = result.users[1].playerData.extraColumns![0];
  assert.ok(
    parseCellPieces(raw).pieces.some((piece) => piece.kind === 'file' && piece.src === 'manual')
  );
  assert.doesNotMatch(fileCellEditorText(raw, index), /Removed|old value|manual value/);
  assert.deepEqual(input.submissions, submitted);
});

test('a changed vote moves its tag and generated live file to the new target on re-certification', () => {
  const input = setup();
  const file = {
    id: 'f_vote_notice',
    path: 'Vote Notice',
    kind: 'markdown' as const,
    source: createMarkdownFileSource('Targeted by vote'),
    updatedAt: 1,
  };
  input.env.index = buildFilesIndex({ files: { [file.id]: file }, folders: [] });
  input.env.legacyTriggers = {
    Infected:
      'OnTagAdded { UpdateCell({PLAYERS = placedUser, COLUMNTYPE = "day", DAY = 0, COLUMN = "morningMessage"}) { Add File({ID = "f_vote_notice", PATH = "Vote Notice"}); } }',
  };
  const submission = input.submissions['alice@example.com'];
  submission.votePlannedUpdates = [
    {
      playerIndex: 1,
      dayIndex: null,
      column: 'Status',
      columnType: 'user',
      op: 'add',
      itemName: 'cellContents',
      updateExpression: 'tag("Infected")',
    },
  ];
  const first = planLiveCertification(input);
  assert.match(
    effectiveCellText(first.mornings['bob@example.com'][0], input.env.index),
    /Targeted by vote/
  );
  const next = clone(replay(input, first));
  next.env = input.env;
  next.submissions['alice@example.com'] = {
    ...submission,
    vote: 'Alice',
    submittedVoteAt: 2,
    votePlannedUpdates: [{ ...submission.votePlannedUpdates[0], playerIndex: 0 }],
  };
  const second = planLiveCertification(next);
  assert.equal(effectiveCellText(second.users[1].playerData.extraColumns![0]), '');
  assert.equal(effectiveCellText(second.mornings['bob@example.com'][0], input.env.index), '');
  assert.match(effectiveCellText(second.users[0].playerData.extraColumns![0]), /Infected/);
  assert.match(
    effectiveCellText(second.mornings['alice@example.com'][0], input.env.index),
    /Targeted by vote/
  );
});

test('live vote certification tracks its direct fields and leaves existing values untracked', () => {
  const input = setup();
  const result = planLiveCertification(input);
  assert.equal(result.users[0].days[0].vote, 'Bob');
  assert.match(
    latestFieldSource(result.users[0].days[0].fieldProvenance, 'vote', 'Bob')!,
    /^certification:/
  );
  assert.equal(result.users[1].days[0].vote, 'baseline');
  assert.equal(result.users[1].days[0].fieldProvenance, undefined);
  const again = planLiveCertification(replay(input, result));
  assert.equal(again.users[0].days[0].fieldProvenance!.vote.writes.length, 1);
});

test('a manually changed certified vote requires review; Keep skips the branch and Replace uses the submission', () => {
  const input = setup();
  const first = planLiveCertification(input);
  const edited = clone(first.users);
  edited[0].days[0].vote = 'operator';
  const users = trackManualTableChanges(first.users, edited);
  assert.equal(latestFieldSource(users[0].days[0].fieldProvenance, 'vote', 'operator'), undefined);
  const next = { ...replay(input, first), users };
  const preview = planLiveCertification(next);
  assert.equal(preview.conflicts.length, 1);
  assert.equal(preview.conflicts[0].primary, true);
  const kept = planLiveCertification(next, { [preview.conflicts[0].id]: 'keep' });
  assert.equal(kept.users[0].days[0].vote, 'operator');
  const replaced = planLiveCertification(next, { [preview.conflicts[0].id]: 'replace' });
  assert.equal(replaced.users[0].days[0].vote, 'Bob');
  const later = planLiveCertification(replay(next, kept));
  assert.equal(
    later.conflicts.length,
    1,
    'Kept overrides remain protected on the next certification'
  );
});

test('same-value operator assertions are explicit events and survive a change-back', () => {
  const input = setup();
  const first = planLiveCertification(input);
  const edited = clone(first.users);
  const day = edited[0].days[0];
  day.fieldProvenance = writeManualField(day.fieldProvenance, 'vote', day.vote, day.vote);
  assert.equal(
    planLiveCertification({ ...replay(input, first), users: edited }).conflicts.length,
    1
  );
  edited[0].days[0].vote = 'other';
  const changed = trackManualTableChanges(first.users, edited);
  const back = clone(changed);
  back[0].days[0].vote = 'Bob';
  const tracked = trackManualTableChanges(changed, back);
  assert.equal(
    planLiveCertification({ ...replay(input, first), users: tracked }).conflicts.length,
    1
  );
});

test('withdrawn submissions retire typed and modular writes without restoring an entire table snapshot', () => {
  const input = setup();
  infect(input);
  const first = planLiveCertification(input);
  const edited = clone(first.users);
  edited[1].days[0].vote = 'independent manual vote';
  const next = { ...replay(input, first), users: edited, submissions: {} };
  const result = planLiveCertification(next);
  assert.equal(result.users[0].days[0].action, 'baseline');
  assert.equal(effectiveCellText(result.users[1].playerData.extraColumns![0]), '');
  assert.equal(result.users[1].days[0].vote, 'independent manual vote');
});

test('certification tag removal retires cascaded tag writes to votes, multipliers, living state, and morning files', () => {
  const input = setup();
  infect(input);
  const file = {
    id: 'f_infected',
    path: 'Infected',
    kind: 'markdown' as const,
    source: createMarkdownFileSource('Infected message'),
    updatedAt: 1,
  };
  input.env.index = buildFilesIndex({ files: { [file.id]: file }, folders: [] });
  input.env.legacyTriggers = {
    Infected: `OnTagAdded {
      UpdateCell({PLAYERS = placedUser, COLUMN = "Status"}) { Add tag("Sick"); }
      UpdateCell({PLAYERS = placedUser, COLUMN = "livingState"}) { Replace "dead"; }
    }`,
    Sick: `OnTagAdded {
      UpdateCell({PLAYERS = placedUser, COLUMNTYPE = "day", DAY = 0, COLUMN = "vote"}) { Replace "Alice"; }
      UpdateCell({PLAYERS = placedUser, COLUMNTYPE = "day", DAY = 0, COLUMN = "voteMultiplier"}) { Replace 3; }
      UpdateCell({PLAYERS = placedUser, COLUMNTYPE = "day", DAY = 0, COLUMN = "morningMessage"}) { Add File({ID = "f_infected", PATH = "Infected"}); }
    }`,
  };
  const first = planLiveCertification(input);
  assert.equal(first.users[1].playerData.livingState, 'dead');
  assert.equal(first.users[1].days[0].vote, 'Alice');
  assert.equal(first.users[1].days[0].voteMultiplier, 3);
  assert.match(
    effectiveCellText(first.mornings['bob@example.com'][0], input.env.index),
    /Infected message/
  );
  const removed = planLiveCertification({ ...replay(input, first), submissions: {} });
  assert.equal(removed.users[1].playerData.livingState, 'alive');
  assert.equal(removed.users[1].days[0].vote, 'baseline');
  assert.equal(removed.users[1].days[0].voteMultiplier, 1);
  assert.equal(effectiveCellText(removed.mornings['bob@example.com'][0], input.env.index), '');
});

test('shared manual tag ownership survives retirement of certification and keeps its trigger output', () => {
  const input = setup();
  infect(input);
  input.env.legacyTriggers = {
    Infected:
      'OnTagAdded { UpdateCell({PLAYERS = placedUser, COLUMN = "livingState"}) { Replace "dead"; } }',
  };
  const first = planLiveCertification(input);
  first.users[1].playerData.extraColumns![0] = applyCellOp(
    first.users[1].playerData.extraColumns![0],
    { mode: 'append', value: '[/TAG: "Infected"/]', source: 'manual' }
  );
  const removed = planLiveCertification({ ...replay(input, first), submissions: {} });
  assert.equal(removed.users[1].playerData.livingState, 'dead');
  assert.match(effectiveCellText(removed.users[1].playerData.extraColumns![0]), /Infected/);
});

test('manual removal of a certified tag is reviewed and kept without re-adding it', () => {
  const input = setup();
  infect(input);
  const first = planLiveCertification(input);
  const edited = clone(first.users);
  edited[1].playerData.extraColumns![0] = applyCellOp(edited[1].playerData.extraColumns![0], {
    mode: 'remove',
    value: '[/TAG: "Infected"/]',
    source: 'manual',
  });
  const users = trackManualTableChanges(first.users, edited);
  const next = { ...replay(input, first), users };
  const preview = planLiveCertification(next);
  assert.equal(preview.conflicts.length, 1);
  const kept = planLiveCertification(next, { [preview.conflicts[0].id]: 'keep' });
  assert.equal(effectiveCellText(kept.users[1].playerData.extraColumns![0]), '');
  const replaced = planLiveCertification(next, { [preview.conflicts[0].id]: 'replace' });
  assert.match(effectiveCellText(replaced.users[1].playerData.extraColumns![0]), /Infected/);
});

test('typed rollback history is private while public projections retain ordinary scalar values', () => {
  const first = planLiveCertification(setup());
  const split = splitFieldProvenance(first.users);
  assert.equal('fieldProvenance' in split.users[0].days[0], false);
  assert.equal(split.users[0].days[0].vote, 'Bob');
  assert.deepEqual(clone(joinFieldProvenance(split.users, split.fields)), clone(first.users));
});

test('failed script execution and cancelled planning do not modify inputs', () => {
  const input = setup();
  infect(input);
  input.env.legacyTriggers = { Infected: 'OnTagAdded { definitelyMissing(); }' };
  const before = JSON.stringify(input);
  assert.throws(() => planLiveCertification(input));
  assert.equal(JSON.stringify(input), before);
});

const seedTransaction = (gameId: string) => {
  const input = setup();
  for (const [key, value] of [
    ['userTable', input.users],
    ['userTableTitle', input.titles],
    ['morningMessagesList', {}],
  ] as const)
    mockDb.seedListItem(mockDb.viewerUserId, key, gameId, value);
  const result = planLiveCertification(input);
  const targets = [
    { key: 'userTable', next: result.users },
    { key: 'userTableTitle', next: input.titles },
    { key: 'morningMessagesList', next: result.mornings },
  ].map(({ key, next }) => ({
    targetType: 'list',
    key,
    itemId: gameId,
    pending: false,
    expected: mockDb.runQuery('user_lists:get', { key, itemId: gameId }).value,
    next,
  }));
  return encodeUserValue({
    targets,
    submissions: [],
    submissionKey: `absent-${gameId}`,
    simulated: false,
  });
};

test('atomic commit rejects stale tables without saving any other target', () => {
  const args = seedTransaction('test-stale');
  mockDb.runMutation('user_lists:set', {
    key: 'morningMessagesList',
    itemId: 'test-stale',
    value: { unrelated: ['changed'] },
  });
  assert.throws(
    () => mockDb.runMutation('user_lists:commitCellCertification', args),
    /Data changed/
  );
  const table = mockDb.runQuery('user_lists:get', { key: 'userTable', itemId: 'test-stale' });
  assert.equal(table.value[0].days[0].vote, 'baseline');
});

test('atomic commit keeps private histories out of public search results', () => {
  const args = seedTransaction('test-private');
  mockDb.runMutation('user_lists:commitCellCertification', args);
  const operator = mockDb.runQuery('user_lists:get', { key: 'userTable', itemId: 'test-private' });
  assert.ok(operator.value[0].days[0].fieldProvenance.vote);
  const publicRows = mockDb.runQuery('user_lists_get:search', {
    key: 'userTable',
    itemId: 'test-private',
    returnTop: 200,
  });
  assert.equal(publicRows[0].value[0].days[0].fieldProvenance, undefined);
  const privateDefinition = [...mockDb.listDefs.values()].find(
    (row) => row.key === 'private-fields:userTable'
  );
  assert.equal(privateDefinition?.privacy, 'PRIVATE');
});

test('certification inside a frozen batch leaves published values alone and cancel discards its histories', () => {
  const args = seedTransaction('test-frozen');
  for (const target of args.targets) {
    mockDb.runMutation('scheduled_updates:stageTarget', {
      target: { targetType: 'list', key: target.key, itemId: target.itemId },
      encodedValue: target.expected,
      batchId: 'test-frozen-batch',
    });
    target.pending = true;
  }
  mockDb.runMutation('user_lists:commitCellCertification', args);
  const published = mockDb.runQuery('user_lists:get', { key: 'userTable', itemId: 'test-frozen' });
  assert.equal(published.value[0].days[0].vote, 'baseline');
  const pending = mockDb.runQuery('scheduled_updates:getPendingTarget', {
    target: { targetType: 'list', key: 'userTable', itemId: 'test-frozen' },
  });
  assert.equal(pending.encodedValue[0].days[0].vote, 'Bob');
  mockDb.runMutation('scheduled_updates:cancelBatch', { batchId: 'test-frozen-batch' });
  assert.equal(
    mockDb.runQuery('user_lists:get', { key: 'userTable', itemId: 'test-frozen' }).value[0].days[0]
      .fieldProvenance,
    undefined
  );
});

test('a new submission arriving during review invalidates the whole plan', () => {
  const args = seedTransaction('test-submission');
  mockDb.seedVar(mockDb.viewerUserId, args.submissionKey, { playerEmail: 'alice@example.com' });
  assert.throws(
    () => mockDb.runMutation('user_lists:commitCellCertification', args),
    /Submissions changed/
  );
});

test('manual removal of a tag-generated file is reviewed without losing unrelated manual additions', () => {
  const input = setup();
  infect(input);
  const file = {
    id: 'f_msg',
    path: 'Message',
    kind: 'markdown' as const,
    source: createMarkdownFileSource('From tag'),
    updatedAt: 1,
  };
  input.env.index = buildFilesIndex({ files: { [file.id]: file }, folders: [] });
  input.env.legacyTriggers = {
    Infected:
      'OnTagAdded { UpdateCell({PLAYERS = placedUser, COLUMNTYPE = "day", DAY = 0, COLUMN = "morningMessage"}) { Add File({ID = "f_msg", PATH = "Message"}); } }',
  };
  const first = planLiveCertification(input);
  const raw = first.mornings['bob@example.com'][0];
  const edited = applyCellOp(
    applyCellOp(raw, { mode: 'remove', value: 'f_msg', valueKind: 'file', source: 'manual' }),
    { mode: 'append', value: 'independent note', source: 'manual' }
  );
  const mornings = trackManualMessages(first.mornings, { 'bob@example.com': [edited] });
  const next = { ...replay(input, first), mornings };
  const preview = planLiveCertification(next);
  assert.equal(preview.conflicts.length, 1);
  const kept = planLiveCertification(next, { [preview.conflicts[0].id]: 'keep' });
  assert.equal(
    effectiveCell(kept.mornings['bob@example.com'][0]).pieces.filter(
      (piece) => piece.kind === 'file'
    ).length,
    0
  );
  assert.match(effectiveCellText(kept.mornings['bob@example.com'][0]), /independent note/);
  const replaced = planLiveCertification(next, { [preview.conflicts[0].id]: 'replace' });
  assert.equal(
    effectiveCell(replaced.mornings['bob@example.com'][0]).pieces.filter(
      (piece) => piece.kind === 'file'
    ).length,
    1
  );
  assert.match(effectiveCellText(replaced.mornings['bob@example.com'][0]), /independent note/);
});

test('retiring a certification removes unsupported trigger cycles', () => {
  const input = setup();
  infect(input);
  input.env.legacyTriggers = {
    Infected:
      'OnTagAdded { UpdateCell({PLAYERS = placedUser, COLUMN = "Status"}) { Add tag("Sick"); } }',
    Sick: 'OnTagAdded { UpdateCell({PLAYERS = placedUser, COLUMN = "Status"}) { Add tag("Infected"); } }',
  };
  const first = planLiveCertification(input);
  assert.match(effectiveCellText(first.users[1].playerData.extraColumns![0]), /Sick/);
  const removed = planLiveCertification({ ...replay(input, first), submissions: {} });
  assert.equal(effectiveCellText(removed.users[1].playerData.extraColumns![0]), '');
});

test('action certification does not retire vote certification effects or an independently supported shared tag', () => {
  const input = setup();
  infect(input);
  const first = planLiveCertification(input);
  const votes = replay(input, first);
  votes.type = 'votes';
  votes.submissions['alice@example.com'].votePlannedUpdates =
    input.submissions['alice@example.com'].plannedUpdates;
  const second = planLiveCertification(votes);
  const removeActions = { ...replay(input, second), submissions: {} };
  const result = planLiveCertification(removeActions);
  assert.equal(result.users[0].days[0].vote, 'Bob');
  assert.match(effectiveCellText(result.users[1].playerData.extraColumns![0]), /Infected/);
});

test('tracked tag effects follow their originating row after reordering, not the previous row position', () => {
  const input = setup();
  infect(input);
  input.env.legacyTriggers = {
    Infected:
      'OnTagAdded { UpdateCell({PLAYERS = placedUser, COLUMN = "livingState"}) { Replace "dead"; } }',
  };
  const first = planLiveCertification(input);
  const reordered = { ...replay(input, first), users: [...first.users].reverse(), submissions: {} };
  const result = planLiveCertification(reordered);
  assert.equal(result.users[0].realName, 'Bob');
  assert.equal(result.users[0].playerData.livingState, 'alive');
});

test('persisting repeated automatic runs does not manufacture manual SET overrides', () => {
  const input = setup();
  infect(input);
  const gameId = 'test-repeat-origin';
  mockDb.seedListItem(mockDb.viewerUserId, 'userTable', gameId, input.users);
  for (let run = 0; run < 3; run++) {
    const users = mockDb.runQuery('user_lists:get', { key: 'userTable', itemId: gameId }).value;
    const result = planLiveCertification({ ...input, users, runId: `run-${run}` });
    assert.equal(result.conflicts.length, 0);
    mockDb.runMutation('user_lists:set', {
      key: 'userTable',
      itemId: gameId,
      value: result.users,
      cellWriteOrigin: 'tracked',
    });
    const stored = mockDb.runQuery('user_lists:get', { key: 'userTable', itemId: gameId }).value;
    const pieces = parseCellPieces(stored[1].playerData.extraColumns[0]).pieces;
    assert.equal(pieces.length, 1);
    assert.ok(pieces[0].src.startsWith('certification:'));
  }
});

test('staged manual writes are tracked and publication preserves their exact provenance', () => {
  const input = setup();
  const first = planLiveCertification(input);
  const gameId = 'test-stage-origin';
  mockDb.seedListItem(mockDb.viewerUserId, 'userTable', gameId, first.users);
  const target = { targetType: 'list', key: 'userTable', itemId: gameId };
  mockDb.runMutation('scheduled_updates:stageTarget', {
    target,
    encodedValue: first.users,
    batchId: gameId,
    cellWriteOrigin: 'restore',
  });
  const edited = clone(first.users);
  edited[0].days[0].vote = 'staged operator';
  mockDb.runMutation('scheduled_updates:stageTarget', {
    target,
    encodedValue: edited,
    batchId: gameId,
  });
  const staged = mockDb.runQuery('scheduled_updates:getPendingTarget', { target }).encodedValue;
  assert.equal(
    planLiveCertification({ ...replay(input, first), users: staged }).conflicts.length,
    1
  );
  mockDb.runMutation('scheduled_updates:publishBatchNow', { batchId: gameId });
  const published = mockDb.runQuery('user_lists:get', { key: 'userTable', itemId: gameId }).value;
  assert.deepEqual(encodeUserValue(published), encodeUserValue(staged));
  mockDb.runMutation('user_lists:set', {
    key: 'userTable',
    itemId: gameId,
    value: first.users,
    cellWriteOrigin: 'restore',
  });
  const restored = mockDb.runQuery('user_lists:get', { key: 'userTable', itemId: gameId }).value;
  assert.deepEqual(encodeUserValue(restored), encodeUserValue(first.users));
});

test('same-timestamp submission edits still invalidate a pending certification', () => {
  const args = seedTransaction('test-same-timestamp');
  mockDb.seedVar(mockDb.viewerUserId, args.submissionKey, { vote: 'first' }, { lastModified: 123 });
  const submissions = mockDb
    .runQuery('user_lists:certificationSubmissions', {
      key: args.submissionKey,
      simulated: false,
    })
    .map((row: any) => ({ id: row._id, modified: row.lastModified, value: clone(row.value) }));
  mockDb.seedVar(
    mockDb.viewerUserId,
    args.submissionKey,
    { vote: 'second' },
    { lastModified: 123 }
  );
  assert.throws(
    () =>
      mockDb.runMutation('user_lists:commitCellCertification', {
        ...args,
        submissions,
      }),
    /Submissions changed/
  );
});

test('editing a fully retired field becomes an untracked baseline, not an invisible permanent pin', () => {
  const input = setup();
  const first = planLiveCertification(input);
  const retired = planLiveCertification({ ...replay(input, first), submissions: {} });
  const edited = clone(retired.users);
  edited[0].days[0].vote = 'new baseline';
  const users = trackManualTableChanges(retired.users, edited);
  const next = planLiveCertification({ ...replay(input, retired), users });
  assert.equal(next.conflicts.length, 0);
  assert.equal(next.users[0].days[0].vote, 'Bob');
});

test('a new scope reviews manual typed decisions that its new writes would replace', () => {
  const input = setup();
  infect(input);
  input.env.legacyTriggers = {
    Infected:
      'OnTagAdded { UpdateCell({PLAYERS = placedUser, COLUMN = "livingState"}) { Replace "dead"; } }',
  };
  const first = planLiveCertification(input);
  const edited = clone(first.users);
  edited[1].playerData.livingState = 'alive';
  const users = trackManualTableChanges(first.users, edited);
  const next = {
    ...replay(input, first),
    type: 'votes' as const,
    users,
    submissions: clone(input.submissions),
  };
  next.submissions['alice@example.com'].votePlannedUpdates = [
    {
      playerIndex: 1,
      dayIndex: null,
      column: 'livingState',
      columnType: 'user',
      op: 'replace',
      itemName: 'cellContents',
      updateExpression: '"dead"',
    },
  ];
  const preview = planLiveCertification(next);
  assert.equal(preview.conflicts.length, 1);
  assert.equal(preview.conflicts[0].proposed, 'dead');
  assert.equal(
    planLiveCertification(next, { [preview.conflicts[0].id]: 'keep' }).users[1].playerData
      .livingState,
    'alive'
  );
  assert.equal(
    planLiveCertification(next, { [preview.conflicts[0].id]: 'replace' }).users[1].playerData
      .livingState,
    'dead'
  );
});

test('a new scope cannot silently re-add a module protected by an earlier manual removal', () => {
  const input = setup();
  infect(input);
  const first = planLiveCertification(input);
  const edited = clone(first.users);
  edited[1].playerData.extraColumns![0] = applyCellOp(edited[1].playerData.extraColumns![0], {
    mode: 'remove',
    value: '[/TAG: "Infected"/]',
    source: 'manual',
  });
  const manual = { ...replay(input, first), users: trackManualTableChanges(first.users, edited) };
  const review = planLiveCertification(manual);
  const kept = planLiveCertification(manual, { [review.conflicts[0].id]: 'keep' });
  const votes = {
    ...replay(input, kept),
    type: 'votes' as const,
    submissions: clone(input.submissions),
  };
  votes.submissions['alice@example.com'].votePlannedUpdates =
    input.submissions['alice@example.com'].plannedUpdates;
  const preview = planLiveCertification(votes);
  assert.equal(preview.conflicts.length, 1);
  const next = planLiveCertification(votes, { [preview.conflicts[0].id]: 'keep' });
  assert.equal(effectiveCellText(next.users[1].playerData.extraColumns![0]), '');
});

test('later edits of a kept manual module decision retain its original ownership links', () => {
  const input = setup();
  infect(input);
  const first = planLiveCertification(input);
  const edited = clone(first.users);
  edited[1].playerData.extraColumns![0] = '';
  const manual = { ...replay(input, first), users: trackManualTableChanges(first.users, edited) };
  const review = planLiveCertification(manual);
  const kept = planLiveCertification(manual, { [review.conflicts[0].id]: 'keep' });
  const later = clone(kept.users);
  later[1].playerData.extraColumns![0] = 'operator replacement';
  const next = { ...replay(input, kept), users: trackManualTableChanges(kept.users, later) };
  const preview = planLiveCertification(next);
  assert.equal(preview.conflicts.length, 1);
  const replaced = planLiveCertification(next, { [preview.conflicts[0].id]: 'replace' });
  assert.doesNotMatch(
    effectiveCellText(replaced.users[1].playerData.extraColumns![0]),
    /operator replacement/
  );
  assert.match(effectiveCellText(replaced.users[1].playerData.extraColumns![0]), /Infected/);
});

test('adding a day never regenerates or duplicates existing adopted identities', () => {
  const initial = normalizePlayerPageState({
    users: setup().users.map(({ id, ...user }) => ({ ...user, days: [{ vote: 'baseline' }] })),
    titles: { extraUserColumns: ['Status'], extraDayColumns: ['Notes'] },
    targetDayCount: 1,
  });
  const extended = normalizePlayerPageState({ ...initial, targetDayCount: 2 });
  assert.equal(extended.titles.dayIds![0], initial.titles.dayIds![0]);
  assert.equal(new Set(extended.titles.dayIds).size, 2);
  assert.equal(extended.users[0].days[1].id, extended.users[1].days[1].id);
});

test('explicit OnTagRemoved effects remain rooted and still run the new tag trigger', () => {
  const input = setup();
  infect(input);
  input.env.legacyTriggers = {
    Infected:
      'OnTagRemoved { UpdateCell({PLAYERS = placedUser, COLUMN = "Status"}) { Add tag("Recovered"); } }',
    Recovered:
      'OnTagAdded { UpdateCell({PLAYERS = placedUser, COLUMNTYPE = "day", DAY = 0, COLUMN = "vote"}) { Replace "recovered vote"; } }',
  };
  const first = planLiveCertification(input);
  const removed = planLiveCertification({ ...replay(input, first), submissions: {} });
  assert.match(effectiveCellText(removed.users[1].playerData.extraColumns![0]), /Recovered/);
  assert.equal(removed.users[1].days[0].vote, 'recovered vote');
  const root = parseCellPieces(removed.users[1].playerData.extraColumns![0]).pieces.find(
    (piece) => piece.kind === 'tag' && piece.name === 'Recovered'
  );
  assert.ok(root?.src.startsWith('tag:removed:'));
  const repeated = planLiveCertification({ ...replay(input, removed), submissions: {} });
  assert.equal(
    repeated.users[1].playerData.extraColumns![0],
    removed.users[1].playerData.extraColumns![0]
  );
});

test('effective base attribution ignores a SET that has been masked by source', () => {
  const automatic = applyCellOp('manual baseline', {
    mode: 'replace',
    value: 'automatic',
    source: 'certification:test|run|player',
  });
  const masked = automatic + '[/REM src="manual" match="src:certification:test|run|player"/]';
  assert.equal(effectiveCell(masked).baseText, 'manual baseline');
  assert.equal(effectiveCell(masked).baseSource, undefined);
});

test('certification reads the complete submission set beyond the general 200-row search limit', () => {
  const db = new MockDb();
  for (let index = 0; index < 250; index++) {
    db.seedVar(`player-${index}`, 'complete-submissions', { playerEmail: `${index}@example.com` });
  }
  const rows = db.runQuery('user_lists:certificationSubmissions', {
    key: 'complete-submissions',
    simulated: false,
  });
  assert.equal(rows.length, 250);
});

test('submission access follows real sharing permissions and sim reads remain owner-scoped', () => {
  const db = new MockDb();
  db.seedVar('player-owner', 'shared-submission', { vote: 'shared' }, { privacy: 'PRIVATE' });
  const row = [...db.vars.values()].find((item) => item.key === 'shared-submission')!;
  const query = () =>
    db.runQuery('user_lists:certificationSubmissions', {
      key: 'shared-submission',
      simulated: false,
    });
  assert.equal(query().length, 0);
  db.varPermissions.add(keyOf(row._id, db.viewerUserId));
  assert.equal(query().length, 1);
  db.varPermissions.delete(keyOf(row._id, db.viewerUserId));
  assert.equal(query().length, 0);
  db.seedListItem('another-operator', 'sim-submission', 'sim:persona', { vote: 'other' });
  assert.equal(
    db.runQuery('user_lists:certificationSubmissions', {
      key: 'sim-submission',
      simulated: true,
    }).length,
    0
  );
});

test('legacy-shaped manual writes cannot erase identities or private certification history', () => {
  const input = setup();
  const first = planLiveCertification(input);
  const legacy = clone(first.users);
  delete legacy[0].id;
  delete legacy[0].days[0].id;
  delete legacy[0].days[0].fieldProvenance;
  legacy[0].days[0].vote = 'older client edit';
  const tracked = trackManualTableChanges(first.users, legacy);
  assert.equal(tracked[0].id, first.users[0].id);
  assert.equal(tracked[0].days[0].id, first.users[0].days[0].id);
  const next = planLiveCertification({ ...replay(input, first), users: tracked });
  assert.equal(next.conflicts.length, 1);
  assert.equal(next.conflicts[0].current, 'older client edit');
});

test('an unchanged legacy submission replays against its first accepted target IDs after row reorder', () => {
  const input = setup();
  infect(input);
  const first = planLiveCertification(input);
  const reordered = { ...replay(input, first), users: [...first.users].reverse() };
  const result = planLiveCertification(reordered);
  assert.equal(result.users[0].realName, 'Bob');
  assert.match(effectiveCellText(result.users[0].playerData.extraColumns![0]), /Infected/);
  assert.equal(effectiveCellText(result.users[1].playerData.extraColumns![0]), '');
  const binding = result.users[1].days[0].fieldProvenance?.action.submissionBinding;
  assert.deepEqual(binding?.updates[0].targetIds?.playerIds, [first.users[1].id]);
});

test('keeping a primary action preserves target bindings for a later Replace decision', () => {
  const input = setup();
  infect(input);
  const first = planLiveCertification(input);
  const edited = clone(first.users);
  edited[0].days[0].action = 'operator action';
  const next = { ...replay(input, first), users: trackManualTableChanges(first.users, edited) };
  const preview = planLiveCertification(next);
  const kept = planLiveCertification(next, { [preview.conflicts[0].id]: 'keep' });
  const reordered = { ...replay(input, kept), users: [...kept.users].reverse() };
  const review = planLiveCertification(reordered);
  const replaced = planLiveCertification(reordered, { [review.conflicts[0].id]: 'replace' });
  assert.match(effectiveCellText(replaced.users[0].playerData.extraColumns![0]), /Infected/);
  assert.equal(effectiveCellText(replaced.users[1].playerData.extraColumns![0]), '');
});
