import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseExpression, parseScript } from '../script/lang/parser';
import { printExpression, printScript } from '../script/lang/printer';
import { interpretScript } from '../script/runtime/interpreter';
import {
  buildFilesIndex,
  cleanupFileInputExpression,
  cleanupFileInputStatements,
  cleanupFileInputText,
  cleanupFileInputsInDoc,
  encodeFileMarker,
  flattenCellContent,
} from '../utils/scriptFiles';
import {
  applyCellOp,
  cleanupFileInputCell,
  fileCellEditorText,
  parseCellPieces,
  reconcileFileCell,
  serializePiece,
  stripSource,
} from '../utils/cellPieces';
import {
  cleanupFileInputContent,
  cleanupFileInputRoles,
  cleanupFileInputUserTable,
  hasRemovedFileInputs,
} from '../utils/fileInputCleanup';
import { executePlannedUpdates } from '../utils/executePlannedUpdates';
import type { PlannedUpdate } from '../types/multiplayer';
import type { UserTableItem } from '../types/playerTable';

const target = {
  id: 'target',
  path: 'Folder/Target',
  kind: 'script' as const,
  updatedAt: 1,
  source: 'FileInput({NAME = "Keep", DEFAULT = "default"}); CreateMarkdown({CONTENT = "body"});',
};
const other = {
  ...target,
  id: 'other',
  path: 'Other',
  source: 'FileInput({NAME = "Removed", DEFAULT = "good"}); CreateMarkdown({CONTENT = "other"});',
};
const doc = { files: { target, other }, folders: [] };
const index = buildFilesIndex(doc);
const call =
  'File({ID = "target", PATH = "Folder/Target", kEeP = "custom", REMOVED = unknownFunction()})';
const expression = parseExpression(call);
const user: UserTableItem = {
  id: 'player',
  userId: 'user',
  email: 'a@example.com',
  realName: 'Alice',
  role: '',
  playerData: { livingState: 'alive', extraColumns: [''] },
  days: [{ id: 'day', extraColumns: [''] }],
};
const titles = {
  extraUserColumns: ['Files'],
  extraDayColumns: [],
  extraUserColumnTypes: ['files'] as const,
};

test('removed named arguments are pruned throughout nested calls, bodies, lambdas and defaults', () => {
  const script = parseScript(`
    Function transform(value) { Return ${call}; }
    Variable({NAME = "list", VALUE = [${call}].Map(Item => { Return ${call}; })});
    OnTagAdded {
      UpdateCell({PLAYERS = players, COLUMN = "Files"}) {
        Add ${call}; Each contents { If True { Replace ${call}; } }
      }
    }
  `);
  assert.deepEqual(script.diagnostics, []);
  const next = cleanupFileInputStatements(script.statements, index);
  const text = printScript({ ...script, statements: next });
  assert.doesNotMatch(text, /REMOVED|unknownFunction/);
  assert.equal((text.match(/kEeP = "custom"/g) ?? []).length, 5);
  assert.match(printScript(script), /REMOVED/);
  assert.equal(cleanupFileInputStatements(next, index), next);
});

test('embedded markdown markers and script islands drop inputs without changing surrounding prose', () => {
  const marker = encodeFileMarker(target, { Keep: '"custom"', Removed: 'unknownFunction()' });
  const markdown = `Before\n${marker}\nMiddle\n/*script\n${call};\nscript*/\nAfter`;
  const clean = cleanupFileInputText(markdown, index);
  assert.doesNotMatch(clean, /Removed|REMOVED|unknownFunction/);
  assert.ok(clean.startsWith('Before\n'));
  assert.ok(clean.endsWith('\nAfter'));
  assert.match(clean, /custom/);
  assert.equal(cleanupFileInputText(clean, index), clean);
  const literal = parseExpression(
    printExpression({
      kind: 'MarkdownLiteral',
      value: marker,
      span: expression.span,
    })
  );
  assert.doesNotMatch(printExpression(cleanupFileInputExpression(literal, index)), /Removed/);
});

test('missing files, invalid definitions and dynamic references never imply an empty signature', () => {
  const broken = { ...target, source: 'FileInput({' };
  const invalid = buildFilesIndex({ files: { target: broken }, folders: [] });
  assert.equal(cleanupFileInputExpression(expression, invalid), expression);
  const missing = parseExpression('File({ID = "deleted", PATH = "Other", Removed = "keep me"})');
  assert.equal(cleanupFileInputExpression(missing, index), missing);
  const dynamic = parseExpression('File({PATH = dynamicPath, Removed = "keep me"})');
  assert.equal(cleanupFileInputExpression(dynamic, index), dynamic);
  const noInputs = buildFilesIndex({ files: { target: { ...target, source: '' } }, folders: [] });
  const clean = printExpression(cleanupFileInputExpression(expression, noInputs));
  assert.doesNotMatch(clean, /kEeP|REMOVED/);
  assert.match(clean, /ID = "target"/);
  assert.match(clean, /PATH = "Folder\/Target"/);
});

test('saving definitions repairs file callers without changing unrelated files or resurrecting values', () => {
  const caller = {
    ...target,
    id: 'caller',
    path: 'Caller',
    source: `${call}; File({ID = "other", Removed = "other override"});`,
  };
  const input = { files: { ...doc.files, caller }, folders: [] };
  const clean = cleanupFileInputsInDoc(input);
  assert.equal(clean.files.target, target);
  assert.equal(clean.files.other, other);
  assert.doesNotMatch(clean.files.caller.source, /unknownFunction/);
  assert.match(clean.files.caller.source, /Removed = "other override"/);
  assert.match(input.files.caller.source, /REMOVED/);
  assert.equal(cleanupFileInputsInDoc(clean), clean);
  const restored = cleanupFileInputsInDoc({
    ...clean,
    files: { ...clean.files, target: { ...target, source: other.source } },
  });
  assert.doesNotMatch(restored.files.caller.source, /unknownFunction/);
});

test('all owned and masked file pieces are cleaned without losing tombstones, source IDs or order', () => {
  const raw =
    applyCellOp('', {
      mode: 'append',
      valueKind: 'file',
      value: target.id,
      fileCall: call,
      source: 'certification:one',
    }) +
    applyCellOp('', {
      mode: 'append',
      valueKind: 'file',
      value: target.id,
      fileCall: call,
      source: 'tag:two',
    }) +
    serializePiece({ kind: 'set', text: `${call};`, src: 'manual:set' }) +
    serializePiece({ kind: 'order', refs: ['target'], src: 'manual' }) +
    serializePiece({
      kind: 'rem',
      match: { type: 'src', src: 'manual:set' },
      src: 'manual:remove',
    });
  const clean = cleanupFileInputCell(raw, index);
  const before = parseCellPieces(raw).pieces;
  const after = parseCellPieces(clean).pieces;
  assert.deepEqual(
    after.map(({ kind, src }) => ({ kind, src })),
    before.map(({ kind, src }) => ({ kind, src }))
  );
  assert.doesNotMatch(decodeURIComponent(clean), /REMOVED|unknownFunction/);
  assert.match(decodeURIComponent(clean), /custom/);
  assert.equal(cleanupFileInputCell(clean, index), clean);
  assert.doesNotMatch(decodeURIComponent(stripSource(clean, 'manual:remove', true).raw), /REMOVED/);
  assert.equal(
    reconcileFileCell(raw, fileCellEditorText(raw, index), index),
    raw,
    'Schema repair must not be mistaken for a manual replacement'
  );
});

test('live-table cleanup preserves IDs and private provenance/history by reference', () => {
  const history = {
    base: call,
    writes: [{ id: 'write', source: 'certification:old', value: call }],
  };
  const users = [
    {
      ...user,
      playerData: {
        ...user.playerData,
        extraColumns: [`${call};`],
        fieldProvenance: { value: history },
      },
      days: [
        {
          ...user.days[0],
          extraColumns: [`${call};`],
          action: call,
          fieldProvenance: { action: history },
        },
      ],
    },
  ];
  const clean = cleanupFileInputUserTable(users, index);
  assert.equal(clean[0].id, user.id);
  assert.equal(clean[0].days[0].id, user.days[0].id);
  assert.equal(clean[0].playerData.fieldProvenance, users[0].playerData.fieldProvenance);
  assert.equal(clean[0].days[0].fieldProvenance, users[0].days[0].fieldProvenance);
  assert.equal(clean[0].days[0].action, call);
  assert.doesNotMatch(clean[0].playerData.extraColumns![0], /REMOVED/);
  assert.doesNotMatch(clean[0].days[0].extraColumns![0], /REMOVED/);
  assert.equal(cleanupFileInputUserTable(clean, index), clean);
  const roles = [
    {
      role: 'Wolf',
      doesRoleVote: true,
      isVisible: true,
      roleMessage: `${call};`,
      voteMessage: `${call};`,
      aboutRole: 'about',
    },
  ];
  assert.doesNotMatch(cleanupFileInputRoles(roles, index)[0].voteMessage!, /REMOVED/);
  const content = { [user.email]: [`${call};`] };
  const messages = cleanupFileInputContent(content, index);
  assert.doesNotMatch(messages[user.email][0], /REMOVED/);
  assert.equal(cleanupFileInputContent(messages, index), messages);
});

test('removed inputs cannot pollute the flat input namespace or evaluate dead expressions', () => {
  const flat = flattenCellContent(`${call}; File({ID = "other"});`, index);
  assert.deepEqual(flat.issues, []);
  assert.doesNotMatch(flat.markdown, /unknownFunction/);
  const rendered = interpretScript(flat.markdown);
  assert.deepEqual(rendered.issues, []);
  assert.equal(rendered.inputState.Removed, 'good');
  const result = interpretScript(
    `UpdateCell({PLAYERS = players, COLUMN = "Files"}) { Add ${call}; }`,
    {
      globals: { players: [{ email: user.email }] },
      filesIndex: index,
      getCellValue: () => '',
    }
  );
  assert.deepEqual(result.issues, []);
  assert.doesNotMatch(result.tableUpdates[0].fileCall!, /REMOVED/);
  const updates: PlannedUpdate[] = [
    {
      playerIndex: 0,
      dayIndex: null,
      column: 'Files',
      columnType: 'user',
      op: 'add',
      itemName: 'cellContents',
      updateExpression: call,
    },
  ];
  const snapshot = structuredClone(updates);
  const output = executePlannedUpdates(
    [user],
    updates,
    { ...titles, extraUserColumnTypes: ['files'] },
    {
      filesIndex: index,
      strict: true,
    }
  );
  assert.doesNotMatch(fileCellEditorText(output[0].playerData.extraColumns![0], index), /REMOVED/);
  assert.deepEqual(updates, snapshot, 'Saved certification snapshots are immutable');
});

test('cleanup is triggered by removals, not input additions, casing changes or file deletion', () => {
  const before = buildFilesIndex({
    ...doc,
    files: {
      ...doc.files,
      target: { ...target, source: `FileInput({NAME = "Removed"}); ${target.source}` },
    },
  });
  assert.equal(hasRemovedFileInputs(before, index), true);
  assert.equal(hasRemovedFileInputs(index, before), false);
  assert.equal(hasRemovedFileInputs(index, buildFilesIndex({ files: {}, folders: [] })), false);
  assert.equal(
    hasRemovedFileInputs(
      index,
      buildFilesIndex({
        ...doc,
        files: {
          ...doc.files,
          target: { ...target, source: target.source.replace('"Keep"', '"KEEP"') },
        },
      })
    ),
    false
  );
});
