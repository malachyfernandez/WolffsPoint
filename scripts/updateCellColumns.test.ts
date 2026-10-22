import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createScript,
  createForEachCellStatement,
  createCellOpStatement,
  createTriggerUpdateCellStatement,
  createUpdateCellStatement,
  editorReducer,
  initialState,
  type EditorState,
} from '../script/editor/editorReducer';
import { emptySpan, type UpdateCellStatement } from '../script/lang/ast';
import {
  getExpressionAtLocation,
  setExpressionAtLocation,
  type ExpressionLocation,
} from '../script/editor/expressionEditor';
import { parseExpression, parseScript } from '../script/lang/parser';
import { printExpression, printScript } from '../script/lang/printer';
import {
  cellColumnKind,
  cellOperationDisabledReason,
  isCellValueChoiceAllowed,
} from '../utils/cellColumnTypes';
import { lintCellColumnTypes, lintCellPlacement } from '../utils/scriptLint';
import { migrateLegacyContent, rebaseCopiedCertificationSources } from '../utils/legacyMigration';
import { applyCellOp, stripSource } from '../utils/cellPieces';
import {
  buildFilesIndex,
  createTagFileSource,
  flattenCellContent,
  isTagFile,
  getFileCallParts,
  retargetFileStatement,
} from '../utils/scriptFiles';

const span = emptySpan();
const titles = {
  extraUserColumns: ['Status', 'Notes'],
  extraUserColumnTypes: ['tags', 'files'] as ('tags' | 'files')[],
  extraDayColumns: ['Suspects'],
};
const fresh = (columnType: 'user' | 'day' = 'user') =>
  initialState({
    ...createScript(),
    statements: [{ ...createTriggerUpdateCellStatement(), columnType } as UpdateCellStatement],
  });
const block = (state: EditorState) => state.ast.statements[0] as UpdateCellStatement;
const select = (state: EditorState, column: string) =>
  editorReducer(state, {
    type: 'SET_EXPRESSION',
    location: { statementPath: [0], slot: { kind: 'updateCellColumn' }, expressionPath: [] },
    expression: { kind: 'StringLiteral', value: column, span },
    columnKind: cellColumnKind(titles, block(state).columnType, column),
    trackHistory: true,
  });

test('new per-cell loops are empty and update bodies reject Return and rendering blocks', () => {
  const loop = createForEachCellStatement();
  assert.equal(loop.kind, 'ForEachCellStatement');
  if (loop.kind !== 'ForEachCellStatement') throw new Error('Expected loop');
  assert.deepEqual(loop.body.statements, []);
  const flags = lintCellPlacement(
    parseScript(`UpdateCell({COLUMN = "Notes"}) {
      Each item {
        If True { Return "ignored"; CreateMarkdown({CONTENT = "not rendered"}); }
        CreateTextInput({LABEL = "not an input"});
        File({ID = "f_msg"});
        Function transform(value) { Return value; }
        ForCell Add File({ID = "f_msg"});
      }
    }`).statements
  );
  assert.equal(flags.length, 4);
  assert.equal(flags.filter((flag) => flag.statement?.kind === 'ReturnStatement').length, 1);
});

test('nested File input locations create absent arguments and preserve their owning operation', () => {
  for (const op of ['Add', 'Remove', 'Replace']) {
    const statement = parseScript(`UpdateCell({COLUMN = "Notes"}) { ${op} File({ID = "f_msg"}); }`)
      .statements[0] as UpdateCellStatement;
    const action = statement.body.statements[0];
    const location: ExpressionLocation = {
      statementPath: [0, 0],
      slot: { kind: 'cellOpValue' },
      expressionPath: [{ kind: 'namedCallArgument', name: 'PLAYER' }],
    };
    const edited = setExpressionAtLocation(action, location, parseExpression('"Alice"'));
    assert.equal(edited.kind, 'CellOpStatement');
    assert.equal(getExpressionAtLocation(edited, location)?.kind, 'StringLiteral');
    const again = setExpressionAtLocation(
      edited,
      { ...location, expressionPath: [{ kind: 'namedCallArgument', name: 'player' }] },
      parseExpression('"Bob"')
    );
    assert.match(printScript({ ...parseScript(''), statements: [again] }), /PLAYER = "Bob"/);
    if (again.kind !== 'CellOpStatement' || again.value.kind !== 'CallExpression') {
      throw new Error('Lost cell operation');
    }
    assert.equal(again.value.arguments.length, 2);
    assert.equal(again.op, op.toLowerCase());
    const cleared = setExpressionAtLocation(again, location, parseExpression('nothing'));
    assert.equal(getExpressionAtLocation(cleared, location), undefined);
    assert.equal(cleared.kind, 'CellOpStatement');
  }
});

test('retargeting a file preserves overrides and seeds only new inputs without casing duplicates', () => {
  const replacement = {
    id: 'new',
    path: 'New',
    kind: 'script' as const,
    updatedAt: 1,
    source:
      'FileInput({NAME = "PLAYER", DEFAULT = "default"}); FileInput({NAME = "Count", DEFAULT = 2});',
  };
  const result = retargetFileStatement(
    replacement,
    parseScript('File({ID = "old", player = "Alice", extra = True});').statements[0]
  );
  const parts = getFileCallParts(result)!;
  assert.equal(parts.id, 'new');
  assert.equal(parts.path, 'New');
  assert.deepEqual([...parts.overrides.keys()], ['player', 'count']);
  assert.equal(
    printScript({ ...parseScript(''), statements: [result] }).match(/player =/g)?.length,
    1
  );
  assert.equal(parts.overrides.get('player')?.kind, 'StringLiteral');
  assert.match(printScript({ ...parseScript(''), statements: [result] }), /player = "Alice"/);
});

test('new UpdateCell blocks default to day columns with input-driven players', () => {
  const certify = createUpdateCellStatement();
  if (certify.kind !== 'UpdateCellStatement') throw new Error('Expected UpdateCell');
  assert.equal(certify.columnType, 'day');
  assert.match(printExpression(certify.dayIndex!), /currentDay \+ 1/);
  assert.match(printExpression(certify.players), /Inputs\.entry\(""\)/);
  const trigger = createTriggerUpdateCellStatement();
  if (trigger.kind !== 'UpdateCellStatement') throw new Error('Expected UpdateCell');
  assert.equal(trigger.columnType, 'day');
  assert.match(printExpression(trigger.dayIndex!), /placedDay/);
  // Inputs isn't a trigger global - the trigger block defaults to placedUser.
  assert.match(printExpression(trigger.players), /placedUser/);
});

test('Update Cell waits for a column, then follows Tags/Files until its body is edited', () => {
  let state = fresh();
  assert.equal(block(state).body.statements.length, 0);
  state = select(state, 'Status');
  assert.match(printScript(state.ast), /Add tag\(""\)/);
  state = select(state, 'Notes');
  assert.match(printScript(state.ast), /Add File/);
  state = editorReducer(state, {
    type: 'SET_EXPRESSION',
    location: { statementPath: [0, 0], slot: { kind: 'cellOpValue' }, expressionPath: [] },
    expression: parseExpression('tag("infected")'),
    trackHistory: true,
  });
  state = select(state, 'Status');
  state = select(state, 'Notes');
  assert.match(printScript(state.ast), /Add tag\("infected"\)/);
  assert.match(lintCellColumnTypes(state.ast.statements, titles)[0].message, /File/);
  assert.doesNotMatch(printScript(state.ast), /editorDefaultBody/);
});

test('column type changes clear selection without erasing a customized body', () => {
  let state = select(fresh(), 'Status');
  state = editorReducer(state, {
    type: 'SET_STATEMENT_FIELD',
    path: [0, 0],
    field: 'op',
    value: 'remove',
  });
  state = editorReducer(state, {
    type: 'SET_STATEMENT_FIELD',
    path: [0],
    field: 'columnType',
    value: 'day',
  });
  assert.deepEqual(block(state).column, { kind: 'StringLiteral', value: '', span });
  assert.match(printScript(state.ast), /Remove tag/);
  state = select(state, 'morningMessage');
  assert.match(lintCellColumnTypes(state.ast.statements, titles)[0].message, /File/);
});

test('undo restores generated defaults and loaded source never gets silently rewritten', () => {
  const state = select(fresh(), 'Status');
  const undone = editorReducer(select(state, 'Notes'), { type: 'UNDO' });
  assert.match(printScript(undone.ast), /Add tag/);
  const loaded = initialState(parseScript('UpdateCell({COLUMN = "Status"}) { Add tag(""); }'));
  assert.match(printScript(select(loaded, 'Notes').ast), /Add tag/);
});

test('column lint checks morning messages, custom file/tag columns, direct fields and nested ops', () => {
  const flags = (column: string, value: string, scope = 'user') =>
    lintCellColumnTypes(
      parseScript(
        `UpdateCell({COLUMNTYPE = "${scope}", COLUMN = "${column}"}) { Each item { ${column === 'livingState' ? 'Replace' : 'Add'} ${value}; } }`
      ).statements,
      titles
    );
  assert.equal(flags('morningMessage', 'tag("infected")', 'day').length, 1);
  assert.equal(flags('Notes', 'File({ID = "f_msg"})').length, 0);
  assert.equal(flags('Status', 'File({ID = "f_msg"})').length, 1);
  assert.equal(flags('Notes', '"free text"').length, 1);
  assert.equal(flags('livingState', 'tag("dead")').length, 1);
  assert.equal(flags('livingState', '"dead"').length, 0);
  assert.equal(flags('Notes', 'someComputedValue').length, 0);
  assert.equal(flags('', 'tag("x")').length, 1);
  assert.equal(flags('deletedColumn', 'tag("x")').length, 1);
  assert.equal(cellColumnKind(titles, 'day', 'MORNINGMESSAGE'), 'files');
  assert.equal(cellColumnKind(titles, 'day', 'Suspects'), 'tags');
});

test('single-value columns allow only per-cell Replace With and generate the correct loop', () => {
  for (const [column, scope] of [
    ['livingState', 'user'],
    ['vote', 'day'],
    ['action', 'day'],
    ['voteMultiplier', 'day'],
  ] as const) {
    const start = fresh();
    const owner = block(start);
    const state = select(
      {
        ...start,
        ast: { ...start.ast, statements: [{ ...owner, columnType: scope }] },
      },
      column
    );
    const loop = block(state).body.statements[0];
    assert.equal(loop.kind, 'ForEachCellStatement', column);
    if (loop.kind !== 'ForEachCellStatement') throw new Error('Missing loop');
    const operation = loop.body.statements[0];
    assert.equal(operation.kind, 'CellOpStatement');
    if (operation.kind !== 'CellOpStatement') throw new Error('Missing replace');
    assert.equal(operation.scope, 'cell');
    assert.equal(operation.op, 'replace');
    assert.equal(
      operation.value.kind,
      column === 'voteMultiplier' ? 'NumberLiteral' : 'StringLiteral'
    );
    for (const op of ['add', 'remove', 'replace'] as const) {
      assert.ok(cellOperationDisabledReason('value', 'all', op));
      assert.equal(!!cellOperationDisabledReason('value', 'cell', op), op !== 'replace');
      assert.equal(cellOperationDisabledReason('files', 'all', op), undefined);
      assert.equal(cellOperationDisabledReason('tags', 'cell', op), undefined);
    }
    const flags = lintCellColumnTypes(
      parseScript(`UpdateCell({COLUMNTYPE = "${scope}", COLUMN = "${column}"}) {
        Replace 1; Each contents { Add 1; Remove 1; Replace 1; }
      }`).statements,
      titles
    );
    assert.equal(flags.length, 3, column);
  }
});

test('cell-value choices exclude incompatible modules and known scalar types', () => {
  for (const type of ['tags', 'files'] as const) {
    assert.equal(isCellValueChoiceAllowed(type, type, 'any', 'string'), true);
    assert.equal(
      isCellValueChoiceAllowed(type, type === 'tags' ? 'files' : 'tags', 'any', 'string'),
      false
    );
    for (const result of ['string', 'number', 'boolean', 'list', 'object', 'any']) {
      assert.equal(isCellValueChoiceAllowed(type, undefined, result, 'string'), false);
    }
    const replace = createCellOpStatement('cell', 'replace', type);
    assert.equal(replace.kind, 'CellOpStatement');
    if (replace.kind !== 'CellOpStatement' || replace.value.kind !== 'CallExpression')
      throw new Error('Expected module');
    assert.equal(replace.value.callee.kind, 'IdentifierExpression');
    if (replace.value.callee.kind === 'IdentifierExpression') {
      assert.equal(replace.value.callee.name.toLowerCase(), type === 'tags' ? 'tag' : 'file');
    }
  }
  assert.equal(isCellValueChoiceAllowed('value', 'files', 'any', 'number'), false);
  assert.equal(isCellValueChoiceAllowed('value', 'tags', 'string', 'string'), false);
  assert.equal(isCellValueChoiceAllowed('value', 'value', 'number', 'number'), true);
  assert.equal(isCellValueChoiceAllowed('value', 'value', 'string', 'number'), false);
  assert.equal(isCellValueChoiceAllowed('value', undefined, 'list', 'number'), false);
  assert.equal(isCellValueChoiceAllowed('value', undefined, 'any', 'number'), true);
  assert.equal(isCellValueChoiceAllowed(undefined, 'files', 'any', 'string'), true);
});

test('cell lint rejects trigger/tag files used as display modules', () => {
  const file = {
    id: 'tag',
    path: 'tags/Example',
    kind: 'script' as const,
    source: createTagFileSource('Example', 'Grey'),
    updatedAt: 1,
  };
  const flags = lintCellColumnTypes(
    parseScript(
      'UpdateCell({COLUMNTYPE = "day", COLUMN = "morningMessage"}) { Add File({ID = "tag"}); }'
    ).statements,
    titles,
    buildFilesIndex({ files: { tag: file }, folders: ['tags'] })
  );
  assert.match(flags[0].message, /display files/);
});

test('whole-game migration includes custom file columns and orphan tag triggers, and is idempotent', () => {
  const input = {
    scriptFilesDoc: undefined,
    tagDefinitions: [{ name: 'Infected', color: 'Red' }],
    tagTriggers: { Infected: 'OnTagAdded { }', Orphan: 'OnTagAdded { }' },
    roleTable: [
      {
        role: 'Wolf',
        roleMessage: 'Your role',
        voteMessage: 'Your vote',
        doesRoleVote: true,
        aboutRole: '',
        isVisible: true,
      },
    ],
    voteMessageDefault: 'Default vote',
    morningMessagesList: { 'alice@example.com': ['Morning'] },
    userTableTitle: titles,
    userTable: [
      {
        realName: 'Alice',
        email: 'alice@example.com',
        userId: 'alice',
        role: 'Wolf',
        playerData: {
          livingState: 'alive' as const,
          extraColumns: ['[/TAG: "Infected"/]', 'Private note'],
        },
        days: [{ extraColumns: ['[/TAG: "Infected"/]'] }],
      },
    ],
  };
  const original = JSON.stringify(input);
  const result = migrateLegacyContent(input);
  const index = buildFilesIndex(result.scriptFilesDoc);
  assert.equal(Object.values(result.scriptFilesDoc.files).filter(isTagFile).length, 2);
  assert.deepEqual(result.tagDefinitions, []);
  assert.deepEqual(result.tagTriggers, {});
  assert.match(
    flattenCellContent(result.userTable[0].playerData.extraColumns![1], index).markdown,
    /Private note/
  );
  assert.equal(
    result.userTable[0].playerData.extraColumns![0],
    input.userTable[0].playerData.extraColumns[0]
  );
  assert.match(
    flattenCellContent(result.morningMessagesList['alice@example.com'][0], index).markdown,
    /Morning/
  );
  const again = migrateLegacyContent({ ...input, ...result });
  assert.equal(again.stats.filesCreated, 0);
  assert.equal(JSON.stringify(input), original);
});

test('migration preserves existing module ownership, tombstones, and tag identity across renames', () => {
  const tagFile = {
    id: 'tag',
    path: 'tags/Old name',
    kind: 'script' as const,
    source: createTagFileSource('Renamed', 'Red'),
    updatedAt: 1,
  };
  const raw = applyCellOp('baseline', { mode: 'append', value: 'automatic', source: 'certify:a' });
  const result = migrateLegacyContent({
    scriptFilesDoc: { files: { tag: tagFile }, folders: ['tags'] },
    tagDefinitions: [{ name: 'Renamed' }],
    tagTriggers: {},
    roleTable: [],
    voteMessageDefault: '',
    userTable: [],
    morningMessagesList: { alice: [raw] },
  });
  assert.equal(result.stats.filesCreated, 0);
  assert.deepEqual(result.tagDefinitions, []);
  assert.equal(result.morningMessagesList.alice[0], raw);
  assert.equal(stripSource(result.morningMessagesList.alice[0], 'certify:a').raw, 'baseline');
});

test('migration refuses to discard conflicting triggers and adopts an otherwise empty file trigger', () => {
  const file = {
    id: 'tag',
    path: 'tags/Example',
    kind: 'script' as const,
    source: createTagFileSource('Example', 'Grey', 'Return "file";'),
    updatedAt: 1,
  };
  const input = {
    scriptFilesDoc: { files: { tag: file }, folders: ['tags'] },
    tagDefinitions: [{ name: 'Example' }],
    tagTriggers: { Example: 'Return "legacy";' },
    roleTable: [],
    voteMessageDefault: '',
    userTable: [],
    morningMessagesList: {},
  };
  const conflict = migrateLegacyContent(input);
  assert.equal(conflict.stats.skipped.length, 1);
  assert.equal(conflict.tagTriggers.Example, input.tagTriggers.Example);
  const adopted = migrateLegacyContent({
    ...input,
    scriptFilesDoc: {
      ...input.scriptFilesDoc,
      files: { tag: { ...file, source: createTagFileSource('Example', 'Grey') } },
    },
  });
  assert.equal(adopted.stats.skipped.length, 0);
  assert.match(adopted.scriptFilesDoc.files.tag.source, /legacy/);
  assert.deepEqual(adopted.tagTriggers, {});
});

test('safety copies preserve rollback receipts under the destination certification namespace', () => {
  const source = 'certification:live%3Aold:day-1:votes|run|player-1';
  const input = {
    raw: applyCellOp('', { mode: 'append', value: 'owned', source }),
    history: { writes: [{ source }], overrides: [source] },
  };
  const copied = rebaseCopiedCertificationSources(input, 'old', 'new');
  assert.equal(stripSource(copied.raw, 'certification:live%3Anew:').raw, '');
  assert.equal(copied.history.writes[0].source, source.replace('live%3Aold', 'live%3Anew'));
  assert.equal(input.history.writes[0].source, source);
});
