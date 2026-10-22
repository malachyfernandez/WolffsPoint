import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cellTagRefs } from '../utils/cellPieces';
import {
  cleanupDeletedTagCell,
  cleanupDeletedTagContent,
  cleanupDeletedTagUserTable,
  liveTagNameSet,
  removedTagDefs,
  removedTagFiles,
} from '../utils/deletedTagCleanup';
import {
  buildFilesIndex,
  createTagFileSource,
  type ScriptFile,
  type ScriptFilesDoc,
} from '../utils/scriptFiles';
import type { UserTableItem } from '../types/playerTable';

const tagFile = (id: string, name: string, path = `tags/${name}`): ScriptFile => ({
  id,
  path,
  kind: 'script',
  role: 'trigger',
  updatedAt: 1,
  source: createTagFileSource(name, 'Grey'),
});

const docWith = (files: ScriptFile[]): ScriptFilesDoc => ({
  files: Object.fromEntries(files.map((file) => [file.id, file])),
  folders: ['tags'],
});

const tagPiece = (id: string, name: string) => `[/TAG id="${id}" name="${name}" src="manual"/]`;
const legacyToken = (name: string) => `[/TAG: "${name}"/]`;

const user: UserTableItem = {
  id: 'player',
  userId: 'user',
  email: 'a@example.com',
  realName: 'Alice',
  role: '',
  playerData: { livingState: 'alive', extraColumns: [''] },
  days: [{ id: 'day', extraColumns: [''] }],
};

test('removedTagFiles detects deletes and moves out of tags/, not renames or plain files', () => {
  const before = buildFilesIndex(
    docWith([tagFile('a', 'Infector'), tagFile('b', 'Doctor'), tagFile('c', 'Moved')])
  );
  const after = buildFilesIndex(
    docWith([
      tagFile('b', 'Doctor2', 'tags/Doctor2'), // renamed inside tags/ - still a tag
      { ...tagFile('c', 'Moved'), path: 'notes/Moved' }, // moved out - no longer a tag
      {
        id: 'd',
        path: 'notes/Script',
        kind: 'script',
        updatedAt: 1,
        source: 'Variable({NAME = "x"})',
      },
    ])
  );
  const removed = removedTagFiles(before, after);
  assert.deepEqual(removed.map((t) => t.id).sort(), ['a', 'c']);
  assert.equal(removed.find((t) => t.id === 'a')?.name, 'Infector');
});

test('removedTagDefs reports dropped legacy definitions by name', () => {
  const before = [{ name: 'Infected' }, { name: 'Safe' }];
  const after = [{ name: 'safe' }];
  assert.deepEqual(removedTagDefs(before, after), [{ name: 'Infected' }]);
});

test('cleanupDeletedTagCell masks id-bound tag pieces with a tagid tombstone', () => {
  const raw = tagPiece('f_a', 'Infected');
  const next = cleanupDeletedTagCell(raw, [{ id: 'f_a', name: 'Infected' }]);
  assert.match(next, /\[\/REM src="cleanup" match="tagid:f_a"\/\]/);
  assert.deepEqual(cellTagRefs(next), []);
});

test('cleanupDeletedTagCell strips legacy tokens and name-only pieces by name', () => {
  const raw = `base${legacyToken('Infected')}[/TAG name="Infected" src="manual"/]`;
  const next = cleanupDeletedTagCell(raw, [{ name: 'Infected' }]);
  assert.deepEqual(cellTagRefs(next), []);
});

test('a surviving same-named tag keeps name-only refs alive', () => {
  const raw = legacyToken('Infected');
  const live = new Set(['infected']);
  const next = cleanupDeletedTagCell(raw, [{ id: 'f_a', name: 'Infected' }], live);
  assert.equal(next, raw, 'name-only refs must survive when another tag owns the name');
  // The id-bound piece is still masked precisely.
  const withPiece = tagPiece('f_a', 'Infected');
  assert.deepEqual(
    cellTagRefs(cleanupDeletedTagCell(withPiece, [{ id: 'f_a', name: 'Infected' }], live)),
    []
  );
});

test('other tags, other tag ids and later re-additions are untouched', () => {
  const raw = tagPiece('f_a', 'Infected') + tagPiece('f_b', 'Doctor') + tagPiece('f_c', 'Infected');
  const next = cleanupDeletedTagCell(raw, [{ id: 'f_a', name: 'Infected' }]);
  const refs = cellTagRefs(next);
  // f_a masked; f_c shares the name but is a different tag file's piece and
  // becomes the visible owner once f_a's contribution is masked.
  assert.ok(!refs.some((r) => r.tagId === 'f_a'));
  assert.ok(refs.some((r) => r.tagId === 'f_b'));
  assert.ok(refs.some((r) => r.tagId === 'f_c'));
  // Tombstones are positional: a piece re-added after them is visible again.
  const masked = cleanupDeletedTagCell(tagPiece('f_a', 'Infected'), [
    { id: 'f_a', name: 'Infected' },
  ]);
  const reAdded = masked + tagPiece('f_a', 'Infected');
  assert.ok(cellTagRefs(reAdded).some((r) => r.tagId === 'f_a'));
});

test('cells without the tag are returned by reference', () => {
  const raw = `hello${tagPiece('f_b', 'Doctor')}`;
  assert.equal(cleanupDeletedTagCell(raw, [{ id: 'f_a', name: 'Infected' }]), raw);
  assert.equal(cleanupDeletedTagCell('', [{ id: 'f_a', name: 'Infected' }]), '');
});

test('user table cleanup hits player and day cells while preserving identities', () => {
  const tagged = tagPiece('f_a', 'Infected');
  const users: UserTableItem[] = [
    {
      ...user,
      playerData: { ...user.playerData, extraColumns: [tagged, 'plain'] },
      days: [{ id: 'day', extraColumns: [tagged] }],
    },
    { ...user, id: 'p2', email: 'b@example.com' },
  ];
  const next = cleanupDeletedTagUserTable(users, [{ id: 'f_a', name: 'Infected' }]);
  assert.notEqual(next, users);
  assert.equal(next[1], users[1], 'untouched users keep their reference');
  assert.equal(next[0].playerData.extraColumns?.[1], 'plain');
  assert.deepEqual(cellTagRefs(next[0].playerData.extraColumns?.[0] ?? ''), []);
  assert.deepEqual(cellTagRefs(next[0].days[0].extraColumns?.[0] ?? ''), []);
  // Idempotent: a second pass changes nothing.
  assert.equal(cleanupDeletedTagUserTable(next, [{ id: 'f_a', name: 'Infected' }]), next);
});

test('generic content cleanup walks nested records and leaves non-marker strings alone', () => {
  const record = { 'a@example.com': [`note${tagPiece('f_a', 'Infected')}`, 'plain text'] };
  const next = cleanupDeletedTagContent(record, [{ id: 'f_a', name: 'Infected' }]);
  assert.deepEqual(cellTagRefs(next['a@example.com'][0]), []);
  assert.equal(next['a@example.com'][1], 'plain text');
  assert.equal(cleanupDeletedTagContent(record, []), record);
});

test('liveTagNameSet merges file tags and legacy definitions', () => {
  const index = buildFilesIndex(docWith([tagFile('a', 'Infector')]));
  const names = liveTagNameSet(index, [{ name: 'Legacy' }]);
  assert.ok(names.has('infector'));
  assert.ok(names.has('legacy'));
});
