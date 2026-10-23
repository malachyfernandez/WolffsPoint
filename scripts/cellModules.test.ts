import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  applyCellOp,
  effectiveCell,
  effectiveCellText,
  parseCellPieces,
  stripSource,
  tagPlacementSrc,
  fileCellEditorText,
  reconcileFileCell,
  foldCellForResolve,
} from '../utils/cellPieces';
import {
  applyCellOps,
  applyMorningMessageOps,
  collectTagPlacements,
  revertDeadTagPlacements,
  stripSourceFromTables,
} from '../utils/cellOps';
import {
  buildFilesIndex,
  createMarkdownFileSource,
  fileOnlyInsertRoute,
  flattenCellContent,
  makeFileStatement,
  missingFileInputArgFallback,
  validateFileReferences,
} from '../utils/scriptFiles';
import { parseScript } from '../script/lang/parser';
import { printScript, printStatement } from '../script/lang/printer';
import { interpretScript } from '../script/runtime/interpreter';
import {
  executePlannedUpdates,
  executeMorningMessagePlannedUpdates,
} from '../utils/executePlannedUpdates';
import { markdownFileBody, withMarkdownFileBody } from '../utils/markdownFileEditor';
import type { UserTableItem } from '../types/playerTable';
import type { PlannedUpdate } from '../types/multiplayer';
import { runTagTriggerFixpoint } from '../hooks/useTagTriggers';
import { reconcileTagSelection } from '../utils/tagEncoding';

const file = {
  id: 'f_infected',
  path: 'templates/Infected',
  kind: 'markdown' as const,
  source: createMarkdownFileSource('You have been infected.'),
  updatedAt: 1,
};
const index = buildFilesIndex({ files: { [file.id]: file }, folders: ['templates'] });
const users: UserTableItem[] = [
  {
    email: 'a@example.com',
    realName: 'A',
    userId: 'u1',
    role: '',
    playerData: { livingState: 'alive', extraColumns: [''] },
    days: [{ extraColumns: [''] }],
  },
];
const titles = { extraUserColumns: ['Status'], extraDayColumns: ['Notes'] };
const tag = '[/TAG: "Infected"/]';
const append = (raw: string, value: string, source = 'tag:a') =>
  applyCellOp(raw, { mode: 'append', value, source });
const src = (name: string, column = 'Status') =>
  tagPlacementSrc({ name }, { playerIndex: 0, dayIndex: null, column });

test('tag, text and file modules dedupe without discarding a second owner', () => {
  for (const valueKind of ['tag', 'text', 'file'] as const) {
    const value = valueKind === 'tag' ? tag : valueKind === 'text' ? 'hello' : file.id;
    const op = {
      mode: 'append' as const,
      value,
      valueKind: valueKind === 'file' ? ('file' as const) : undefined,
    };
    const raw = applyCellOp(applyCellOp('', { ...op, source: 'tag:a' }), {
      ...op,
      source: 'tag:b',
    });
    assert.equal(effectiveCell(raw).pieces.length, 1);
    assert.equal(parseCellPieces(raw).pieces.length, 2);
    assert.equal(effectiveCell(stripSource(raw, 'tag:a', true).raw).pieces.length, 1);
    assert.equal(
      effectiveCell(stripSource(stripSource(raw, 'tag:a', true).raw, 'tag:b', true).raw).pieces
        .length,
      0
    );
  }
});

test('existing manual tags dedupe against file-backed tag identities', () => {
  const raw = applyCellOp(tag, { mode: 'append', value: tag, source: 'tag:a' }, () => ({
    id: 'f_tag',
    name: 'Infected',
  }));
  assert.equal(effectiveCell(raw).pieces.length, 0);
  assert.equal(effectiveCellText(raw), tag);
});

test('allow duplicates survives serialization and rollback', () => {
  const raw = applyCellOp(append('', tag), {
    mode: 'append',
    value: tag,
    source: 'tag:b',
    allowDuplicates: true,
  });
  assert.equal(effectiveCell(raw).pieces.length, 2);
  assert.equal(effectiveCellText(raw), tag + tag);
  assert.equal(effectiveCell(stripSource(raw, 'tag:a', true).raw).pieces.length, 1);
});

test('adjacent self-closing file and text markers parse independently', () => {
  const raw = append(
    applyCellOp('', { mode: 'append', value: file.id, valueKind: 'file', source: 'a' }),
    'hello',
    'b'
  );
  assert.deepEqual(
    parseCellPieces(raw).pieces.map((p) => p.kind),
    ['file', 'text']
  );
  assert.match(effectiveCellText(raw, index), /You have been infected/);
  assert.match(effectiveCellText(raw, index), /hello/);
});

test('replace hides prior pieces and reverting restores them', () => {
  const original = append('base', ' extra', 'a');
  const replaced = applyCellOp(original, { mode: 'replace', value: 'replacement', source: 'b' });
  assert.equal(effectiveCellText(replaced), 'replacement');
  assert.equal(effectiveCellText(stripSource(replaced, 'b', true).raw), 'base extra');
});

test('remove is a reversible tombstone for tags and files', () => {
  const original = append('', tag, 'a');
  const removed = applyCellOp(original, { mode: 'remove', value: tag, source: 'b' });
  assert.equal(effectiveCellText(removed), '');
  assert.equal(effectiveCellText(stripSource(removed, 'b', true).raw), tag);
  const base = printStatement(makeFileStatement(file));
  const withoutFile = applyCellOp(base, {
    mode: 'remove',
    value: file.id,
    valueKind: 'file',
    source: 'b',
  });
  assert.equal(fileCellEditorText(withoutFile, index), '');
  assert.equal(stripSource(withoutFile, 'b', true).raw, base);
});

test('persistent tag updates survive automatic tag removal', () => {
  const key = src('Infected');
  const raw = applyCellOp('', {
    mode: 'append',
    value: 'permanent',
    source: key,
    autoRemove: false,
  });
  const updated = [{ ...users[0], playerData: { ...users[0].playerData, extraColumns: [raw] } }];
  const reverted = revertDeadTagPlacements(updated, {}, titles, [key]);
  assert.equal(effectiveCellText(reverted.users[0].playerData.extraColumns![0]), 'permanent');
});

test('tag removal uses exact source identities, not column-name prefixes', () => {
  const a = src('A', 'Status');
  const b = src('A', 'Status detail');
  const raw = append(append('', 'one', a), 'two', b);
  const updated = [{ ...users[0], playerData: { ...users[0].playerData, extraColumns: [raw] } }];
  assert.equal(
    effectiveCellText(
      revertDeadTagPlacements(updated, {}, titles, [a]).users[0].playerData.extraColumns![0]
    ),
    'two'
  );
});

test('removing one owner of a tag does not revert that still-live tag', () => {
  const a = src('A');
  const b = src('B');
  const child = src('Infected');
  let raw = append(append('', tag, a), tag, b);
  raw = append(raw, 'child effect', child);
  const updated = [{ ...users[0], playerData: { ...users[0].playerData, extraColumns: [raw] } }];
  const reverted = revertDeadTagPlacements(updated, {}, titles, [a]);
  assert.match(effectiveCellText(reverted.users[0].playerData.extraColumns![0]), /child effect/);
  assert.equal(collectTagPlacements(reverted.users, {}, titles).size, 1);
});

test('cascading rollback handles more than ten dependent placements', () => {
  let raw = '';
  for (let i = 0; i < 15; i++) raw = append(raw, `[/TAG: "T${i + 1}"/]`, src(`T${i}`));
  raw = append(raw, 'last effect', src('T15'));
  const updated = [{ ...users[0], playerData: { ...users[0].playerData, extraColumns: [raw] } }];
  assert.equal(
    effectiveCellText(
      revertDeadTagPlacements(updated, {}, titles, [src('T0')]).users[0].playerData.extraColumns![0]
    ),
    ''
  );
});

test('UpdateCell configuration round-trips and reaches direct and planned operations', () => {
  const source = `UpdateCell({PLAYERS = placedUser, COLUMNTYPE = "user", COLUMN = "Status",
    ALLOWDUPLICATES = True, AUTOREMOVE = False}) { Add tag("Infected"); }`;
  const ast = parseScript(source);
  assert.deepEqual(ast.diagnostics, []);
  const reparsed = parseScript(printScript(ast)).statements[0];
  assert.equal(reparsed.kind, 'UpdateCellStatement');
  if (reparsed.kind !== 'UpdateCellStatement') return;
  assert.equal(reparsed.allowDuplicates, true);
  assert.equal(reparsed.autoRemove, false);
  const globals = { placedUser: { email: users[0].email }, players: [{ email: users[0].email }] };
  const result = interpretScript(source, {
    globals,
    getCellValue: () => '',
    contributionSource: src('A'),
  });
  assert.deepEqual(result.issues, []);
  assert.equal(result.tableUpdates[0].allowDuplicates, true);
  assert.equal(result.tableUpdates[0].autoRemove, false);
  const planned: PlannedUpdate[] = [];
  interpretScript(source, { globals, getCellValue: () => '', plannedUpdates: planned });
  assert.equal(planned[0].allowDuplicates, true);
  assert.equal(planned[0].autoRemove, false);
});

test('file operations work for certify, morning messages, and re-certification', () => {
  const planned: PlannedUpdate[] = [
    {
      playerIndex: 0,
      dayIndex: null,
      columnType: 'user',
      column: 'Status',
      op: 'add',
      updateExpression: 'File({PATH = "templates/Infected"})',
      itemName: 'cellContents',
    },
  ];
  const options = { filesIndex: index, source: 'certify:d0:a:a@example.com' };
  let updated = executePlannedUpdates(users, planned, titles, options);
  assert.equal(effectiveCell(updated[0].playerData.extraColumns![0]).pieces[0].kind, 'file');
  const stripped = stripSourceFromTables(updated, {}, titles, 'certify:d0:a:');
  updated = executePlannedUpdates(stripped.users, planned, titles, options);
  assert.equal(effectiveCell(updated[0].playerData.extraColumns![0]).pieces.length, 1);
  const morning = executeMorningMessagePlannedUpdates(
    {},
    [{ ...planned[0], dayIndex: 0, columnType: 'day', column: 'morningMessage' }],
    updated,
    options
  );
  assert.match(effectiveCellText(morning[users[0].email][0], index), /You have been infected/);
});

test('file-cell edits preserve other owners and live-linked content', () => {
  const raw = applyCellOp('legacy text', {
    mode: 'append',
    value: file.id,
    valueKind: 'file',
    source: src('A'),
  });
  const editable = fileCellEditorText(raw, index);
  assert.equal(reconcileFileCell(raw, editable, index), raw);
  const removed = reconcileFileCell(raw, '', index);
  assert.equal(effectiveCellText(removed, index), 'legacy text');
  assert.equal(
    effectiveCellText(stripSource(removed, 'manual', true).raw, index),
    effectiveCellText(raw, index)
  );
  const markdown = flattenCellContent(foldCellForResolve(raw, index), index).markdown;
  assert.match(markdown, /You have been infected/);
});

test('markdown-first editing preserves file inputs and refuses to flatten complex scripts', () => {
  const ast = parseScript(`FileInput({NAME = "x", DEFAULT = "ok"});\n${file.source}`);
  assert.equal(markdownFileBody(ast), 'You have been infected.');
  const changed = withMarkdownFileBody(ast, 'Updated');
  assert.equal(markdownFileBody(parseScript(printScript(changed))), 'Updated');
  assert.deepEqual(changed.statements[0], ast.statements[0]);
  assert.equal(markdownFileBody(parseScript(`${file.source}\nReturn "other logic";`)), null);
  assert.equal(markdownFileBody(parseScript(`${file.source}\n${file.source}`)), null);
});

test('morning-message rollback preserves manual content', () => {
  const key = src('A');
  const messages = applyMorningMessageOps(
    { [users[0].email]: ['manual'] },
    [
      {
        playerIndex: 0,
        dayIndex: 0,
        column: 'morningMessage',
        mode: 'append',
        value: file.id,
        valueKind: 'file',
        source: key,
      },
    ],
    users
  );
  const reverted = revertDeadTagPlacements(users, messages, titles, [key]);
  assert.equal(reverted.morningMessages![users[0].email][0], 'manual');
  assert.equal(applyCellOps(users, [], titles).length, 1);
});

test('tag-trigger fixpoint adds a live file and removes it without an explicit removal script', () => {
  const tagged = [{ ...users[0], playerData: { ...users[0].playerData, extraColumns: [tag] } }];
  const env = {
    index,
    legacyTriggers: {
      Infected: `OnTagAdded {
      UpdateCell({PLAYERS = placedUser, COLUMNTYPE = "day", DAY = 0, COLUMN = "morningMessage"}) {
        Add File({ID = "${file.id}", PATH = "${file.path}"});
      }
    }`,
    },
  };
  const added = runTagTriggerFixpoint(users, tagged, titles, env, {});
  assert.match(
    effectiveCellText(added.morningMessages![users[0].email][0], index),
    /You have been infected/
  );
  const untagged = added.users.map((u) => ({
    ...u,
    playerData: {
      ...u.playerData,
      extraColumns: [
        applyCellOp(u.playerData.extraColumns![0], {
          mode: 'remove',
          value: tag,
          source: 'manual',
        }),
      ],
    },
  }));
  const removed = runTagTriggerFixpoint(added.users, untagged, titles, env, added.morningMessages);
  assert.equal(effectiveCellText(removed.morningMessages![users[0].email][0], index), '');
});

test('tag-trigger fixpoint supports cascading additions and removals', () => {
  const a = '[/TAG: "A"/]';
  const tagged = [{ ...users[0], playerData: { ...users[0].playerData, extraColumns: [a] } }];
  const env = {
    index,
    legacyTriggers: {
      A: 'OnTagAdded { UpdateCell({PLAYERS = placedUser, COLUMN = "Status"}) { Add tag("B"); } }',
      B: 'OnTagAdded { UpdateCell({PLAYERS = placedUser, COLUMN = "Status"}) { Add "effect"; } }',
    },
  };
  const added = runTagTriggerFixpoint(users, tagged, titles, env, {});
  assert.match(effectiveCellText(added.users[0].playerData.extraColumns![0]), /effect/);
  const untagged = [
    {
      ...added.users[0],
      playerData: {
        ...added.users[0].playerData,
        extraColumns: [
          applyCellOp(added.users[0].playerData.extraColumns![0], {
            mode: 'remove',
            value: a,
            source: 'manual',
          }),
        ],
      },
    },
  ];
  const removed = runTagTriggerFixpoint(added.users, untagged, titles, env, added.morningMessages);
  assert.equal(effectiveCellText(removed.users[0].playerData.extraColumns![0]), '');
});

test('certify diffs morning-message tags against the old morning state', () => {
  const before = { [users[0].email]: [tag] };
  const placements = collectTagPlacements(users, before, titles);
  const result = runTagTriggerFixpoint(
    users,
    users,
    titles,
    {
      index,
      legacyTriggers: {
        Infected:
          'OnTagRemoved { UpdateCell({PLAYERS = placedUser, COLUMN = "Status"}) { Add "removed"; } }',
      },
    },
    {},
    placements
  );
  assert.equal(effectiveCellText(result.users[0].playerData.extraColumns![0]), 'removed');
});

test('bulk tag selection preserves each destination cell and its ownership', () => {
  const raw = append('manual text', 'contribution', 'certify:d0:a:a@example.com');
  const changed = reconcileTagSelection(raw, [{ name: 'Infected' }]);
  assert.match(effectiveCellText(changed), /manual textcontribution/);
  assert.equal(parseCellPieces(changed).pieces[0].src, 'certify:d0:a:a@example.com');
});

test('planned cell operations read the results of earlier operations', () => {
  const base: PlannedUpdate = {
    playerIndex: 0,
    dayIndex: null,
    column: 'Status',
    columnType: 'user',
    itemName: 'cellContents',
    op: 'add',
    updateExpression: '"first"',
  };
  const result = executePlannedUpdates(
    users,
    [base, { ...base, op: 'replace', updateExpression: 'cellContents.append(" second")' }],
    titles
  );
  assert.equal(effectiveCellText(result[0].playerData.extraColumns![0]), 'first second');
});

test('direct trigger operations read the results of earlier operations too', () => {
  const result = interpretScript(
    `UpdateCell({PLAYERS = placedUser, COLUMN = "Status"}) {
    Add "first"; Replace cellContents.append(" second");
  }`,
    {
      globals: { placedUser: { email: users[0].email }, players: [{ email: users[0].email }] },
      getCellValue: () => '',
    }
  );
  assert.deepEqual(result.issues, []);
  const updated = applyCellOps(users, result.tableUpdates, titles);
  assert.equal(effectiveCellText(updated[0].playerData.extraColumns![0]), 'first second');
});

test('cell loops ignore Return, continue explicit operations, and preserve real function returns', () => {
  const source = `Function suffix(value) { Return value.append("!"); }
    UpdateCell({PLAYERS = players, COLUMN = "Status"}) {
      Each item {
        Return "must not replace or stop";
        ForCell Add suffix("explicit");
      }
    }`;
  const globals = { players: [{ email: users[0].email }] };
  const direct = interpretScript(source, { globals, getCellValue: () => '' });
  assert.deepEqual(direct.issues, []);
  assert.equal(direct.tableUpdates.length, 1);
  assert.equal(direct.tableUpdates[0].value, 'explicit!');
  assert.equal(direct.tableUpdates[0].mode, 'append');
  const planned: PlannedUpdate[] = [];
  const plan = interpretScript(source, {
    globals,
    getCellValue: () => '',
    plannedUpdates: planned,
  });
  assert.deepEqual(plan.issues, []);
  assert.equal(planned.length, 1);
  assert.equal(planned[0].op, 'add');
});

test('cell update bodies do not render markdown or create player inputs', () => {
  const result = interpretScript(
    `UpdateCell({PLAYERS = players, COLUMN = "Status"}) {
      Each item {
        CreateMarkdown({CONTENT = Markdown(\`not displayed\`)});
        CreateTextInput({LABEL = "not requested"});
        ForCell Add "data";
      }
    }`,
    { globals: { players: [{ email: users[0].email }] }, getCellValue: () => '' }
  );
  assert.deepEqual(result.output, []);
  assert.equal(result.issues.length, 2);
  assert.equal(result.tableUpdates[0].value, 'data');
});

test('file inputs survive all/cell operations in direct triggers and certification plans', () => {
  const parameterized = {
    ...file,
    source:
      'FileInput({NAME = "PLAYER"}); CreateMarkdown({CONTENT = Markdown(`Hello /*markdownVariable: "PLAYER"*/`)});',
  };
  const filesIndex = buildFilesIndex({ files: { [file.id]: parameterized }, folders: [] });
  const globals = { players: [{ email: users[0].email }] };
  for (const scope of ['all', 'cell']) {
    for (const op of ['Add', 'Remove', 'Replace']) {
      const action = `${op} File({ID = "${file.id}", PLAYER = cellContents.append(" Alice")});`;
      const source = `UpdateCell({PLAYERS = players, COLUMN = "Status"}) {
        ${scope === 'cell' ? `Each cellContents { ${action} }` : action}
      }`;
      const initial =
        op === 'Remove'
          ? applyCellOp('', { mode: 'append', value: file.id, valueKind: 'file', source: 'manual' })
          : 'Before';
      const initialUsers = users.map((user) => ({
        ...user,
        playerData: { ...user.playerData, extraColumns: [initial] },
      }));
      const direct = interpretScript(source, {
        globals,
        getCellValue: () => initial,
        filesIndex,
      });
      assert.deepEqual(direct.issues, [], `${scope} ${op}: direct`);
      assert.equal(direct.tableUpdates[0].valueKind, 'file');
      const planned: PlannedUpdate[] = [];
      const plan = interpretScript(source, {
        globals,
        getCellValue: () => initial,
        filesIndex,
        plannedUpdates: planned,
      });
      assert.deepEqual(plan.issues, [], `${scope} ${op}: planned`);
      const directRaw = applyCellOps(initialUsers, direct.tableUpdates, titles, { filesIndex })[0]
        .playerData.extraColumns![0];
      const plannedRaw = executePlannedUpdates(initialUsers, planned, titles, {
        filesIndex,
        strict: true,
      })[0].playerData.extraColumns![0];
      for (const raw of [directRaw, plannedRaw]) {
        if (op === 'Remove') {
          assert.equal(effectiveCell(raw, filesIndex).pieces.length, 0);
        } else {
          assert.match(fileCellEditorText(raw, filesIndex), /player = "Before Alice"/i);
          assert.doesNotMatch(fileCellEditorText(raw, filesIndex), /cellContents/);
          const rendered = interpretScript(
            flattenCellContent(fileCellEditorText(raw, filesIndex), filesIndex).markdown
          );
          assert.deepEqual(rendered.issues, []);
          assert.equal(rendered.output[0].markdown, 'Hello Before Alice');
        }
      }
    }
  }
});

test('morning-message file inputs resolve per target in direct and deferred cell loops', () => {
  const index = buildFilesIndex({
    files: { [file.id]: { ...file, source: `FileInput({NAME = "PLAYER"});\n${file.source}` } },
    folders: [],
  });
  const globals = { players: [{ email: users[0].email }] };
  const source = `UpdateCell({PLAYERS = players, COLUMNTYPE = "day", DAY = 0, COLUMN = "morningMessage"}) {
    Each contents { Add File({ID = "${file.id}", PLAYER = contents.append(" morning")}); }
  }`;
  const direct = interpretScript(source, {
    globals,
    getCellValue: () => 'Before',
    filesIndex: index,
  });
  const planned: PlannedUpdate[] = [];
  interpretScript(source, {
    globals,
    getCellValue: () => 'Before',
    filesIndex: index,
    plannedUpdates: planned,
  });
  const messages = { [users[0].email]: ['Before'] };
  const directRaw = applyMorningMessageOps(messages, direct.tableUpdates, users, {
    filesIndex: index,
  });
  const plannedRaw = executeMorningMessagePlannedUpdates(messages, planned, users, {
    filesIndex: index,
    strict: true,
  });
  for (const result of [directRaw, plannedRaw]) {
    assert.match(
      fileCellEditorText(result[users[0].email][0], index),
      /player = "Before morning"/i
    );
    assert.doesNotMatch(fileCellEditorText(result[users[0].email][0], index), /contents\.append/);
  }
});

test('file-cell edits preserve call-site input overrides', () => {
  const index = buildFilesIndex({
    files: { [file.id]: { ...file, source: `FileInput({NAME = "audience"});\n${file.source}` } },
    folders: [],
  });
  const edited = `File({ID = "${file.id}", PATH = "${file.path}", audience = "A"});`;
  const raw = reconcileFileCell('', edited, index);
  assert.match(fileCellEditorText(raw, index), /audience = "A"/);
  const changed = reconcileFileCell(raw, edited.replace('"A"', '"B"'), index);
  assert.match(fileCellEditorText(changed, index), /audience = "B"/);
  assert.doesNotMatch(fileCellEditorText(changed, index), /audience = "A"/);
});

test('legacy path-only base files can be removed without flattening their storage', () => {
  const raw = 'File({PATH = "templates/Infected"});';
  const removed = reconcileFileCell(raw, '', index);
  assert.equal(fileCellEditorText(removed, index), '');
  assert.equal(stripSource(removed, 'manual', true).raw, raw);
});

test('file module references stay live across file edits and moves', () => {
  const original = applyMorningMessageOps(
    {},
    [
      {
        playerIndex: 0,
        dayIndex: 0,
        column: 'morningMessage',
        mode: 'append',
        value: file.path,
        valueKind: 'file',
        fileCall: `File({PATH = "${file.path}"})`,
      },
    ],
    users,
    { filesIndex: index }
  );
  const moved = {
    ...file,
    path: 'other/Renamed',
    source: createMarkdownFileSource('Changed'),
    updatedAt: 2,
  };
  const nextIndex = buildFilesIndex({ files: { [file.id]: moved }, folders: ['other'] });
  const resolved = flattenCellContent(
    foldCellForResolve(original[users[0].email][0], nextIndex),
    nextIndex
  );
  assert.match(resolved.markdown, /Changed/);
  assert.deepEqual(resolved.issues, []);
});

test('UpdateCell flags invalid settings and missing file modules', () => {
  assert.ok(parseScript('UpdateCell({ALLOWDUPLICATES = "yes"}) {}').diagnostics.length > 0);
  const ast = parseScript(
    'UpdateCell({COLUMN = "Status"}) { Add File({ID = "missing", PATH = "gone"}); }'
  );
  assert.ok(
    validateFileReferences(ast.statements, index, []).some((f) => /Missing file/.test(f.message))
  );
});

test('reordering files preserves their owners and survives independent rollback', () => {
  const second = { ...file, id: 'f_second', path: 'templates/Second' };
  const files = buildFilesIndex({ files: { [file.id]: file, [second.id]: second }, folders: [] });
  let raw = printStatement(makeFileStatement(file));
  raw = applyCellOp(raw, { mode: 'append', value: second.id, valueKind: 'file', source: src('B') });
  const reversed = `${printStatement(makeFileStatement(second))}\n${printStatement(makeFileStatement(file))}`;
  const reordered = reconcileFileCell(raw, reversed, files);
  assert.equal(fileCellEditorText(reordered, files), reversed);
  const removed = stripSource(reordered, src('B'), true).raw;
  assert.equal(fileCellEditorText(removed, files), printStatement(makeFileStatement(file)));
});

test('switching a file-valued operation to Replace retains a live file reference', () => {
  const result = interpretScript(
    `UpdateCell({PLAYERS = placedUser, COLUMN = "Status"}) {
    Replace File({ID = "${file.id}", PATH = "${file.path}"});
  }`,
    {
      globals: { placedUser: { email: users[0].email }, players: [{ email: users[0].email }] },
      getCellValue: () => tag,
      contributionSource: src('A'),
      filesIndex: index,
    }
  );
  assert.deepEqual(result.issues, []);
  const initial = [{ ...users[0], playerData: { ...users[0].playerData, extraColumns: [tag] } }];
  const updated = applyCellOps(initial, result.tableUpdates, titles, { filesIndex: index });
  const raw = updated[0].playerData.extraColumns![0];
  assert.match(fileCellEditorText(raw, index), /f_infected/);
  assert.equal(stripSource(raw, src('A'), true).raw, tag);
});

test('two tag triggers sharing one file keep it until the last owner is removed', () => {
  const tagged = [
    {
      ...users[0],
      playerData: { ...users[0].playerData, extraColumns: ['[/TAG: "A"/][/TAG: "B"/]'] },
    },
  ];
  const script = `OnTagAdded {
    UpdateCell({PLAYERS = placedUser, COLUMNTYPE = "day", DAY = 0, COLUMN = "morningMessage"}) {
      Add File({ID = "${file.id}", PATH = "${file.path}"});
    }
  }`;
  const env = { index, legacyTriggers: { A: script, B: script } };
  let result = runTagTriggerFixpoint(users, tagged, titles, env, {});
  assert.equal(effectiveCell(result.morningMessages![users[0].email][0], index).pieces.length, 1);
  for (const selected of [[{ name: 'B' }], []]) {
    const next = [
      {
        ...result.users[0],
        playerData: {
          ...result.users[0].playerData,
          extraColumns: [
            reconcileTagSelection(result.users[0].playerData.extraColumns![0], selected),
          ],
        },
      },
    ];
    result = runTagTriggerFixpoint(result.users, next, titles, env, result.morningMessages);
    assert.equal(
      effectiveCell(result.morningMessages![users[0].email][0], index).pieces.length,
      selected.length
    );
  }
});

test('file deduplication includes legacy path-only file lists', () => {
  const initial = [
    {
      ...users[0],
      playerData: { ...users[0].playerData, extraColumns: [`File({PATH = "${file.path}"});`] },
    },
  ];
  const next = applyCellOps(
    initial,
    [
      {
        playerIndex: 0,
        dayIndex: null,
        column: 'Status',
        mode: 'append',
        value: file.id,
        valueKind: 'file',
        source: src('A'),
      },
    ],
    titles,
    { filesIndex: index }
  );
  assert.equal(effectiveCell(next[0].playerData.extraColumns![0], index).pieces.length, 0);
});

test('fileOnly insert routing sends only statements to the file picker', () => {
  assert.equal(fileOnlyInsertRoute('statement'), 'filePick');
  // '+'/swap slots inside File() input args are values, not file targets:
  // they must open the expression picker (input options only), never the
  // file selector.
  assert.equal(fileOnlyInsertRoute('expression'), 'expressionPicker');
  assert.equal(fileOnlyInsertRoute('chainInsert'), 'expressionPicker');
  assert.equal(fileOnlyInsertRoute('chainSwap'), 'expressionPicker');
});

test('fileOnly cells auto-fill empty File() input args with a string input', () => {
  const fallback = missingFileInputArgFallback(true);
  assert.equal(fallback.kind, 'StringLiteral');
  assert.equal(fallback.kind === 'StringLiteral' ? fallback.value : null, '');
  // Non-fileOnly contexts keep the optional-override socket.
  assert.equal(missingFileInputArgFallback(false).kind, 'NothingLiteral');
});

test('previewCellItems itemizes file lists, compositions, and pieces for chip previews', async () => {
  const { previewCellItems } = await import('../utils/cellPieces');
  const mdFile = {
    id: 'f_md',
    path: 'Test/Infectors',
    kind: 'markdown' as const,
    role: 'display' as const,
    source: 'x',
    updatedAt: 1,
  };
  const trigFile = {
    id: 'f_tr',
    path: 'onTag',
    kind: 'script' as const,
    role: 'trigger' as const,
    source: 'x',
    updatedAt: 1,
  };
  const idx = buildFilesIndex({
    files: { f_md: mdFile, f_tr: trigFile },
    folders: ['Test'],
    folderIds: { folder_test: 'Test' },
  });

  // Legacy file-list cell -> file chips in order.
  const list = previewCellItems(
    'File({PATH = "Test/Infectors", ID = "f_md"}); File({PATH = "onTag", ID = "f_tr"});',
    idx
  );
  assert.deepEqual(
    list.map((i) => i.kind),
    ['file', 'file']
  );
  assert.equal(list[0].kind === 'file' ? list[0].file.id : null, 'f_md');
  assert.equal(list[1].kind === 'file' ? list[1].file.id : null, 'f_tr');

  // Composition cell -> file/folder/divider/nav chips; nav contents are not
  // flattened (single chip keeps the preview brief).
  const composition = [
    'File({PATH = "Test/Infectors", ID = "f_md"});',
    'Folder({PATH = "Test", ID = "folder_test"});',
    'CreateDivider({});',
    'NavButton({LABEL = "Role Descriptions"}) { File({PATH = "onTag", ID = "f_tr"}); }',
    'File({PATH = "onTag", ID = "f_tr"});',
    'CreateMarkdown({CONTENT = Markdown(`hi`)});',
  ].join('\n');
  const comp = previewCellItems(composition, idx);
  assert.deepEqual(
    comp.map((i) => i.kind),
    ['file', 'folder', 'divider', 'nav', 'file', 'markdown']
  );
  assert.equal(comp[3].kind === 'nav' ? comp[3].label : null, 'Role Descriptions');
  assert.equal(comp[1].kind === 'folder' ? comp[1].label : null, 'Test');

  // Missing refs degrade to a faded 'missing' chip, not a crash.
  const missing = previewCellItems('File({PATH = "gone/File"});', idx);
  assert.equal(missing[0]?.kind, 'missing');

  // Tag + text pieces keep their order after file pieces; duplicate file
  // references collapse to one chip.
  const raw = applyCellOp(
    applyCellOp('File({PATH = "onTag", ID = "f_tr"});', {
      mode: 'append',
      value: mdFile.id,
      valueKind: 'file',
      source: 'tag:a',
    }),
    { mode: 'append', value: '[/TAG: "Infected"/]', source: 'tag:b' }
  );
  const mixed = previewCellItems(raw, idx);
  assert.deepEqual(
    mixed.map((i) => i.kind),
    ['file', 'file', 'tag']
  );
  const dup = applyCellOp('', {
    mode: 'append',
    value: trigFile.id,
    valueKind: 'file',
    source: 'tag:a',
  });
  const dupTwice = applyCellOp(dup, {
    mode: 'append',
    value: trigFile.id,
    valueKind: 'file',
    source: 'tag:b',
  });
  assert.equal(
    previewCellItems(dupTwice, idx).filter((i) => i.kind === 'file').length,
    1
  );
});
