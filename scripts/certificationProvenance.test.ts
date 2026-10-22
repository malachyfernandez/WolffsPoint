import assert from 'node:assert/strict';
import { test } from 'node:test';
import type {
  CertificationEffect,
  CertificationLedger,
  CertificationRun,
  EffectOperation,
  EffectTarget,
} from '../types/certification';
import {
  activeCertificationEffects,
  certificationReplayBaseline,
  createCertificationLedger,
  effectTargetKey,
  materializeCertification,
  planCertification,
  recordManualDecision,
  resolveCertificationPlan,
  validateCertificationLedger,
} from '../utils/certificationProvenance';
import { effectiveCell, effectiveCellText } from '../utils/cellPieces';
import {
  adoptCertificationIdentities,
  bindPlannedUpdateTargets,
  resolvePlannedUpdateTargets,
} from '../utils/certificationIdentity';
import {
  executeMorningMessagePlannedUpdates,
  executePlannedUpdates,
} from '../utils/executePlannedUpdates';
import type { PlannedUpdate } from '../types/multiplayer';
import type { UserTableItem } from '../types/playerTable';
import { normalizePlayerPageState } from '../components/game/playerTableNormalization';

const action: EffectTarget = { playerId: 'alice', dayId: 'day-a', columnId: 'action' };
const status: EffectTarget = { playerId: 'bob', dayId: null, columnId: 'status' };
const morning: EffectTarget = { playerId: 'bob', dayId: 'day-a', columnId: 'morning' };
const multiplier: EffectTarget = { playerId: 'bob', dayId: 'day-a', columnId: 'multiplier' };
const set = (value: string | number): EffectOperation => ({ kind: 'set', value });
const append = (value: string): EffectOperation => ({
  kind: 'cell',
  op: { mode: 'append', value },
});
const run = (id: string, supersedes: string[] = []): CertificationRun => ({
  id,
  scope: { gameId: 'game', dayId: 'day-a', type: 'actions' },
  actorId: 'operator',
  createdAt: 1,
  supersedes,
  branches: [
    {
      id: `${id}:alice`,
      playerId: 'alice',
      submissionId: 'submission-a',
      submissionRevision: 'v1',
      snapshot: '{"action":"infect Bob"}',
    },
  ],
});
const effect = (
  id: string,
  runId: string,
  sequence: number,
  target = action,
  operation = set('infect Bob')
): CertificationEffect => ({
  id,
  sequence,
  target,
  operation,
  cause: { kind: 'certification', runId, branchId: `${runId}:alice` },
  primary: target === action,
});
const empty = (): CertificationLedger => ({
  ...createCertificationLedger('live:game'),
  bases: [
    { target: action, value: '' },
    { target: status, value: '' },
    { target: morning, value: '' },
    { target: multiplier, value: 2 },
  ],
});
const commit = (
  ledger: CertificationLedger,
  nextRun: CertificationRun,
  effects: CertificationEffect[],
  choices: Record<string, 'keep' | 'replace'> = {}
) =>
  resolveCertificationPlan(
    ledger,
    planCertification(ledger, nextRun, effects, 'snapshot'),
    choices,
    'snapshot'
  );
const value = (ledger: CertificationLedger, target: EffectTarget) =>
  materializeCertification(ledger).get(effectTargetKey(target));
const certified = () => commit(empty(), run('r1'), [effect('e1', 'r1', 0)]);
const override = (
  ledger: CertificationLedger,
  target = action,
  operation = set('operator choice')
) =>
  recordManualDecision(ledger, {
    id: 'manual-edit',
    actorId: 'operator',
    createdAt: 2,
    target,
    operation,
    overrides: ['e1'],
  });

test('unchanged re-certification retires the old run and retains its receipt', () => {
  const first = certified();
  const next = commit(first, run('r2', ['r1']), [effect('e2', 'r2', 1)]);
  assert.equal(value(next, action), 'infect Bob');
  assert.deepEqual(next.retiredRunIds, ['r1']);
  assert.deepEqual(
    activeCertificationEffects(next).map((e) => e.id),
    ['e2']
  );
  assert.equal(next.runs.length, 2);
  assert.equal(next.effects.length, 2);
});

test('withdrawn submission retires the previous direct field', () => {
  const next = commit(certified(), { ...run('r2', ['r1']), branches: [] }, []);
  assert.equal(value(next, action), '');
});

test('replacement plans use a retired baseline, not a whole-table snapshot', () => {
  const first = commit(empty(), run('r1'), [effect('e1', 'r1', 0, multiplier, set(5))]);
  const withOtherDay = commit(
    first,
    { ...run('other'), scope: { ...run('other').scope, dayId: 'other-day' } },
    [effect('independent', 'other', 1, multiplier, { kind: 'number', mode: 'add', value: 3 })]
  );
  const baseline = certificationReplayBaseline(withOtherDay, run('r1').scope);
  assert.equal(value(baseline, multiplier), 5);
  assert.equal(value(withOtherDay, multiplier), 8);
  assert.equal(value(first, multiplier), 5);
});

test('retirement recursively removes tag consequences, including persistent file modules', () => {
  const root = effect('tag-a', 'r1', 0, status, append('[/TAG: "Infected"/]'));
  const tagB: CertificationEffect = {
    id: 'tag-b',
    sequence: 1,
    target: status,
    operation: append('[/TAG: "Contagious"/]'),
    cause: {
      kind: 'trigger',
      placementId: 'placement-a',
      scriptRevision: 'a-v1',
      supports: ['tag-a'],
    },
  };
  const file: CertificationEffect = {
    id: 'morning-file',
    sequence: 2,
    target: morning,
    operation: {
      kind: 'cell',
      op: { mode: 'append', value: 'f_infected', valueKind: 'file', autoRemove: false },
    },
    cause: {
      kind: 'trigger',
      placementId: 'placement-b',
      scriptRevision: 'b-v1',
      supports: ['tag-b'],
    },
  };
  const first = commit(empty(), run('r1'), [root, tagB, file]);
  assert.equal(effectiveCell(value(first, morning) as string).pieces.length, 1);
  const next = commit(first, { ...run('r2', ['r1']), branches: [] }, []);
  assert.equal(value(next, status), '');
  assert.equal(value(next, morning), '');
});

test('shared trigger consequences survive when another certification still supports the tag', () => {
  const first = commit(empty(), run('r1'), [
    effect('tag-a', 'r1', 0, status, append('[/TAG: "Infected"/]')),
  ]);
  const other = { ...run('votes'), scope: { ...run('votes').scope, type: 'votes' as const } };
  const shared = commit(first, other, [
    effect('tag-v', 'votes', 1, status, append('[/TAG: "Infected"/]')),
    {
      id: 'shared-file',
      sequence: 2,
      target: morning,
      operation: append('infected'),
      cause: {
        kind: 'trigger',
        placementId: 'infection',
        scriptRevision: 'v1',
        supports: ['tag-a', 'tag-v'],
      },
    },
  ]);
  const next = commit(shared, { ...run('r2', ['r1']), branches: [] }, []);
  assert.equal(effectiveCellText(value(next, morning) as string), 'infected');
  const retiredAll = commit(
    next,
    { ...run('v2', ['votes']), scope: other.scope, branches: [] },
    []
  );
  assert.equal(value(retiredAll, morning), '');
});

test('unsupported cycles are inactive, but independently rooted cycles survive', () => {
  const ledger = {
    ...empty(),
    runs: [run('r1')],
    nextSequence: 3,
    effects: [
      effect('root', 'r1', 0),
      {
        id: 'cycle-a',
        sequence: 1,
        target: status,
        operation: append('a'),
        cause: {
          kind: 'trigger' as const,
          placementId: 'a',
          scriptRevision: '1',
          supports: ['root', 'cycle-b'],
        },
      },
      {
        id: 'cycle-b',
        sequence: 2,
        target: morning,
        operation: append('b'),
        cause: {
          kind: 'trigger' as const,
          placementId: 'b',
          scriptRevision: '1',
          supports: ['cycle-a'],
        },
      },
    ],
  };
  assert.equal(activeCertificationEffects(ledger).length, 3);
  assert.equal(activeCertificationEffects({ ...ledger, retiredRunIds: ['r1'] }).length, 0);
});

test('manual overrides require an explicit review before re-certification', () => {
  const ledger = override(certified());
  const plan = planCertification(ledger, run('r2', ['r1']), [effect('e2', 'r2', 1)], 'snapshot');
  assert.equal(plan.conflicts.length, 1);
  assert.equal(plan.conflicts[0].currentValue, 'operator choice');
  assert.throws(() => resolveCertificationPlan(ledger, plan, {}, 'snapshot'), /explicit decision/);
  assert.equal(value(ledger, action), 'operator choice');
  assert.equal(ledger.runs.length, 1);
});

test('Keep on a primary action rejects the new submission and its unshared consequences', () => {
  const ledger = override(certified());
  const next = commit(
    ledger,
    run('r2', ['r1']),
    [
      effect('e2', 'r2', 1),
      effect('infection', 'r2', 2, status, append('[/TAG: "Infected"/]')),
      {
        id: 'derived',
        sequence: 3,
        target: morning,
        operation: append('new consequence'),
        cause: {
          kind: 'trigger',
          placementId: 'infection',
          scriptRevision: 'v1',
          supports: ['infection'],
        },
      },
    ],
    { 'manual-edit': 'keep' }
  );
  assert.equal(value(next, action), 'operator choice');
  assert.equal(value(next, status), '');
  assert.equal(value(next, morning), '');
});

test('Replace releases only the reviewed decision, not unrelated manual work', () => {
  let ledger = override(certified());
  ledger = recordManualDecision(ledger, {
    id: 'independent-note',
    actorId: 'operator',
    createdAt: 3,
    target: morning,
    operation: append('manual note'),
    overrides: [],
  });
  const next = commit(ledger, run('r2', ['r1']), [effect('e2', 'r2', 1)], {
    'manual-edit': 'replace',
  });
  assert.equal(value(next, action), 'infect Bob');
  assert.equal(effectiveCellText(value(next, morning) as string), 'manual note');
  assert.deepEqual(next.releasedDecisionIds, ['manual-edit']);
});

test('targeted file removal remains protected against a newly appended certification ADD', () => {
  const addition = (): EffectOperation => ({
    kind: 'cell',
    op: { mode: 'append', value: 'f_infected', valueKind: 'file' },
  });
  const first = commit(empty(), run('r1'), [effect('e1', 'r1', 0, morning, addition())]);
  const ledger = override(first, morning, {
    kind: 'cell',
    op: { mode: 'remove', value: 'f_infected', valueKind: 'file' },
  });
  const next = commit(
    ledger,
    run('r2', ['r1']),
    [
      effect('e2', 'r2', 1, morning, addition()),
      effect('status', 'r2', 2, status, append('other effect')),
    ],
    { 'manual-edit': 'keep' }
  );
  assert.equal(effectiveCell(value(next, morning) as string).pieces.length, 0);
  assert.equal(effectiveCellText(value(next, status) as string), 'other effect');
});

test('same-value assertions and change-back are recorded, not erased by equality', () => {
  let ledger = override(certified(), action, set('infect Bob'));
  ledger = recordManualDecision(ledger, {
    id: 'changed',
    actorId: 'operator',
    createdAt: 3,
    target: action,
    operation: set('different'),
    overrides: ['e1'],
  });
  ledger = recordManualDecision(ledger, {
    id: 'changed-back',
    actorId: 'operator',
    createdAt: 4,
    target: action,
    operation: set('infect Bob'),
    overrides: ['e1'],
  });
  assert.equal(value(ledger, action), 'infect Bob');
  const plan = planCertification(ledger, run('r2', ['r1']), [effect('e2', 'r2', 1)], 'snapshot');
  assert.equal(plan.conflicts.length, 3);
});

test('a withdrawn submission still reviews a protected operator decision', () => {
  const ledger = override(certified());
  const next = commit(ledger, { ...run('r2', ['r1']), branches: [] }, [], {
    'manual-edit': 'keep',
  });
  assert.equal(value(next, action), 'operator choice');
});

test('changed data, scripts, submissions, or namespace rejects a stale plan', () => {
  const ledger = certified();
  const plan = planCertification(ledger, run('r2', ['r1']), [effect('e2', 'r2', 1)], 'v1');
  assert.throws(() => resolveCertificationPlan(ledger, plan, {}, 'v2'), /changed/);
  assert.throws(() => resolveCertificationPlan(override(ledger), plan, {}, 'v1'), /changed/);
  assert.throws(
    () => resolveCertificationPlan({ ...ledger, namespace: 'sim:game' }, plan, {}, 'v1'),
    /changed/
  );
});

test('IDs use unambiguous tuples and do not depend on display names or array order', () => {
  assert.notEqual(
    effectTargetKey({ playerId: 'a|b', dayId: 'c', columnId: 'd' }),
    effectTargetKey({ playerId: 'a', dayId: 'b|c', columnId: 'd' })
  );
  const ledger = certified();
  assert.equal(value({ ...ledger, bases: [...ledger.bases].reverse() }, action), 'infect Bob');
});

test('duplicate IDs, missing bases, unknown supports and wrong scope fail closed', () => {
  const ledger = certified();
  assert.throws(() => planCertification(ledger, run('r2'), [effect('e2', 'r2', 1)], ''), /scope/);
  assert.throws(
    () => planCertification(ledger, run('r2', ['r1']), [effect('e1', 'r2', 1)], ''),
    /Duplicate/
  );
  assert.throws(() => validateCertificationLedger({ ...ledger, bases: [] }), /base/);
  assert.throws(
    () =>
      validateCertificationLedger({
        ...ledger,
        nextSequence: 2,
        effects: [
          ...ledger.effects,
          {
            ...effect('broken', 'r1', 1),
            cause: {
              kind: 'trigger',
              placementId: 'a',
              scriptRevision: '1',
              supports: ['missing'],
            },
          },
        ],
      }),
    /support/
  );
});

test('Keep remains reviewable on every later replay, not just the first replacement', () => {
  const first = override(certified());
  const second = commit(first, run('r2', ['r1']), [effect('e2', 'r2', 1)], {
    'manual-edit': 'keep',
  });
  const thirdPlan = planCertification(
    second,
    run('r3', ['r2']),
    [effect('e3', 'r3', 2)],
    'snapshot'
  );
  assert.equal(thirdPlan.conflicts.length, 1);
  const third = resolveCertificationPlan(
    second,
    thirdPlan,
    { 'manual-edit': 'replace' },
    'snapshot'
  );
  assert.equal(value(third, action), 'infect Bob');
  assert.equal(second.effects.length, 2);
  assert.deepEqual(second.suppressedEffectIds, ['e2']);
  assert.equal(second.resolutions[1].decisions[0].choice, 'keep');
});

test('forged conflict list cannot bypass override review', () => {
  const ledger = override(certified());
  const plan = planCertification(ledger, run('r2', ['r1']), [effect('e2', 'r2', 1)], '');
  assert.throws(
    () => resolveCertificationPlan(ledger, { ...plan, conflicts: [] }, {}, ''),
    /decision/
  );
});

test('invalid numeric operations fail without mutating the original ledger', () => {
  const ledger = empty();
  assert.throws(
    () =>
      commit(ledger, run('r1'), [
        effect('number', 'r1', 0, action, { kind: 'number', mode: 'add', value: 1 }),
      ]),
    /Numeric/
  );
  assert.equal(ledger.runs.length, 0);
  assert.equal(ledger.revision, 0);
});

test('a manual root supports a shared tag without applying its operation twice', () => {
  const manual = {
    id: 'manual-root',
    actorId: 'operator',
    createdAt: 1,
    target: status,
    operation: {
      kind: 'cell' as const,
      op: { mode: 'append' as const, value: '[/TAG: "Infected"/]', allowDuplicates: true },
    },
    overrides: [],
  };
  const ledger = recordManualDecision(empty(), manual);
  const next = commit(ledger, run('r1'), [
    effect('automatic-tag', 'r1', 0, status, append('[/TAG: "Infected"/]')),
    {
      id: 'manual-tag',
      sequence: 1,
      target: status,
      operation: manual.operation,
      cause: { kind: 'manual', eventId: manual.id },
    },
    {
      id: 'shared-output',
      sequence: 2,
      target: morning,
      operation: append('Infected'),
      cause: {
        kind: 'trigger',
        placementId: 'infection',
        scriptRevision: 'v1',
        supports: ['automatic-tag', 'manual-tag'],
      },
    },
  ]);
  const retired = commit(next, { ...run('r2', ['r1']), branches: [] }, []);
  assert.equal(effectiveCell(value(retired, status) as string).pieces.length, 1);
  assert.equal(effectiveCellText(value(retired, morning) as string), 'Infected');
});

test('review cannot commit another branch evaluated using a rejected effect', () => {
  const ledger = override(certified());
  const secondRun = {
    ...run('r2', ['r1']),
    branches: [
      ...run('r2').branches,
      {
        id: 'r2:bob',
        playerId: 'bob',
        submissionId: 'bob-action',
        submissionRevision: '1',
        snapshot: '{}',
      },
    ],
  };
  const dependent: CertificationEffect = {
    ...effect('dependent', 'r2', 2, multiplier, set(5)),
    cause: { kind: 'certification', runId: 'r2', branchId: 'r2:bob' },
    readEffectIds: ['e2'],
  };
  const plan = planCertification(ledger, secondRun, [effect('e2', 'r2', 1), dependent], 'snapshot');
  assert.throws(
    () => resolveCertificationPlan(ledger, plan, { 'manual-edit': 'keep' }, 'snapshot'),
    /execution dependency/
  );
  assert.equal(value(ledger, multiplier), 2);
  assert.equal(ledger.runs.length, 1);
});

test('planning and cancellation leave the input objects unchanged', () => {
  const ledger = override(certified());
  const before = JSON.stringify(ledger);
  const nextRun = run('r2', ['r1']);
  const effects = [effect('e2', 'r2', 1)];
  const input = JSON.stringify({ nextRun, effects });
  planCertification(ledger, nextRun, effects, 'snapshot');
  assert.equal(JSON.stringify(ledger), before);
  assert.equal(JSON.stringify({ nextRun, effects }), input);
});

test('unrelated manual adjustments remain in the proposed review value', () => {
  const first = commit(empty(), run('r1'), [effect('e1', 'r1', 0, multiplier, set(5))]);
  let ledger = override(first, multiplier, { kind: 'number', mode: 'add', value: 1 });
  ledger = recordManualDecision(ledger, {
    id: 'independent-multiplier',
    actorId: 'operator',
    createdAt: 4,
    target: multiplier,
    operation: { kind: 'number', mode: 'add', value: 2 },
    overrides: [],
  });
  const plan = planCertification(
    ledger,
    run('r2', ['r1']),
    [effect('e2', 'r2', 1, multiplier, set(10))],
    'snapshot'
  );
  assert.equal(plan.conflicts[0].proposedValue, 12);
});

const identifiedTable = () => {
  const users: UserTableItem[] = ['Alice', 'Bob'].map((name) => ({
    realName: name,
    email: `${name.toLowerCase()}@example.com`,
    userId: 'NOT-JOINED',
    role: '',
    playerData: { livingState: 'alive', extraColumns: ['', ''] },
    days: [
      { action: '', extraColumns: [''] },
      { action: '', extraColumns: [''] },
    ],
  }));
  let sequence = 0;
  return adoptCertificationIdentities(
    users,
    { extraUserColumns: ['Status', 'Other'], extraDayColumns: ['Notes'] },
    2,
    (kind) => `${kind}-${sequence++}`
  );
};
const tableUpdate = (overrides: Partial<PlannedUpdate> = {}): PlannedUpdate => ({
  playerIndex: 1,
  dayIndex: null,
  column: 'Status',
  columnType: 'user',
  updateExpression: '"infected"',
  itemName: 'cellContents',
  op: 'add',
  ...overrides,
});

test('identity adoption is pure, keeps NOT-JOINED rows distinct, and is idempotent', () => {
  const table = identifiedTable();
  assert.notEqual(table.users[0].id, table.users[1].id);
  assert.equal(table.users[0].days[0].id, table.users[1].days[0].id);
  const second = adoptCertificationIdentities(table.users, table.titles, 2, () => {
    throw new Error('Existing IDs must not be regenerated');
  });
  assert.deepEqual(second, table);
  assert.notEqual(second.users, table.users);
  assert.notEqual(second.users[0].days, table.users[0].days);
});

test('normalization preserves permanent day identities and column metadata', () => {
  const table = identifiedTable();
  const normalized = normalizePlayerPageState({ ...table, targetDayCount: 2 });
  assert.equal(normalized.users[0].days[0].id, table.titles.dayIds![0]);
  assert.deepEqual(normalized.titles.extraUserColumnIds, table.titles.extraUserColumnIds);
});

test('bound plans survive row reorder, email changes, column rename and column reorder', () => {
  const table = identifiedTable();
  const [bound] = bindPlannedUpdateTargets([tableUpdate()], table.users, table.titles);
  const reorderedUsers = [...table.users].reverse().map((user) => ({
    ...user,
    email: `renamed-${user.email}`,
    playerData: { ...user.playerData, extraColumns: ['', ''] },
  }));
  const titles = {
    ...table.titles,
    extraUserColumns: ['Other', 'Conditions'],
    extraUserColumnIds: [...table.titles.extraUserColumnIds!].reverse(),
  };
  const result = executePlannedUpdates(reorderedUsers, [bound], titles, {
    source: 'run-effect',
    requireStableTargets: true,
  });
  assert.equal(result[0].id, table.users[1].id);
  assert.equal(effectiveCellText(result[0].playerData.extraColumns![1]), 'infected');
  assert.equal(result[1].playerData.extraColumns![1], '');
});

test('deleted planned targets never fall back to the row or column at the old index', () => {
  const table = identifiedTable();
  const [bound] = bindPlannedUpdateTargets([tableUpdate()], table.users, table.titles);
  assert.throws(
    () => executePlannedUpdates([table.users[0]], [bound], table.titles),
    /player was deleted/
  );
  assert.throws(
    () =>
      executePlannedUpdates(table.users, [bound], {
        ...table.titles,
        extraUserColumns: ['Other'],
        extraUserColumnIds: [table.titles.extraUserColumnIds![1]],
      }),
    /column was deleted/
  );
});

test('all-player plans capture player identities rather than accidentally adding future players', () => {
  const table = identifiedTable();
  const [bound] = bindPlannedUpdateTargets(
    [tableUpdate({ playerIndex: null })],
    table.users,
    table.titles
  );
  const third = { ...table.users[0], id: 'third-player', email: 'third@example.com' };
  const result = executePlannedUpdates([...table.users, third], [bound], table.titles);
  assert.equal(effectiveCellText(result[0].playerData.extraColumns![0]), 'infected');
  assert.equal(effectiveCellText(result[1].playerData.extraColumns![0]), 'infected');
  assert.equal(result[2].playerData.extraColumns![0], '');
});

test('bound morning plans follow the game-day ID after reordering days', () => {
  const table = identifiedTable();
  const [bound] = bindPlannedUpdateTargets(
    [tableUpdate({ column: 'morningMessage', dayIndex: 0, columnType: 'day' })],
    table.users,
    table.titles
  );
  const titles = { ...table.titles, dayIds: [...table.titles.dayIds!].reverse() };
  const users = table.users.map((user) => ({ ...user, days: [...user.days].reverse() }));
  const result = executeMorningMessagePlannedUpdates({}, [bound], users, {
    titles,
    source: 'effect',
    requireStableTargets: true,
  });
  assert.equal(result['bob@example.com'][0], '');
  assert.equal(effectiveCellText(result['bob@example.com'][1]), 'infected');
  assert.throws(
    () => executeMorningMessagePlannedUpdates({}, [bound], users),
    /requires table titles/
  );
  assert.throws(
    () => resolvePlannedUpdateTargets(bound, users, { ...titles, dayIds: [] }),
    /game day was deleted/
  );
});

test('legacy plans remain compatible but strict certification can require explicit target review', () => {
  const table = identifiedTable();
  const update = tableUpdate();
  assert.equal(resolvePlannedUpdateTargets(update, table.users, table.titles)[0], update);
  assert.throws(
    () =>
      executePlannedUpdates(table.users, [update], table.titles, { requireStableTargets: true }),
    /requires target review/
  );
  const users = table.users.map(({ id, ...user }) => user);
  assert.equal(bindPlannedUpdateTargets([update], users, table.titles)[0].targetIds, undefined);
});

test('identity adoption refuses inconsistent days, duplicate player IDs, and truncated column IDs', () => {
  const table = identifiedTable();
  assert.throws(
    () =>
      adoptCertificationIdentities(
        [table.users[0], { ...table.users[1], id: table.users[0].id }],
        table.titles,
        2,
        () => 'unused'
      ),
    /duplicate player/
  );
  assert.throws(
    () =>
      adoptCertificationIdentities(
        [{ ...table.users[0], days: [{ id: 'wrong-day' }] }],
        table.titles,
        2,
        () => 'unused'
      ),
    /Conflicting game-day/
  );
  assert.throws(
    () =>
      adoptCertificationIdentities(
        table.users,
        { ...table.titles, extraUserColumns: ['Status'] },
        2,
        () => 'unused'
      ),
    /deleted together/
  );
});
