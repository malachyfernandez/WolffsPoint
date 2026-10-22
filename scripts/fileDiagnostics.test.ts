import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildFileDiagnostics } from '../utils/fileDiagnostics';
import { buildFilesIndex, type ScriptFile, type ScriptFilesDoc } from '../utils/scriptFiles';
import type { UserTableTitle } from '../types/playerTable';

const file = (
  id: string,
  path: string,
  source = 'Return players;',
  role: 'display' | 'trigger' = 'display'
): ScriptFile => ({ id, path, kind: 'script', role, source, updatedAt: 1 });

const idx = (files: ScriptFile[], folders: string[] = []) => {
  const doc: ScriptFilesDoc = {
    files: Object.fromEntries(files.map((f) => [f.id, f])),
    folders,
  };
  return buildFilesIndex(doc);
};

const hasFlag = (map: Map<string, string[]>, id: string, part: string) =>
  (map.get(id) ?? []).some((m) => m.includes(part));

test('deleting a referenced file flags the caller', () => {
  const caller = file('f_a', 'caller', 'File({PATH = "target", ID = "f_b"});');
  const target = file('f_b', 'target');
  const before = buildFileDiagnostics(idx([caller, target]));
  assert.equal(hasFlag(before, 'f_a', 'Missing file'), false);
  const after = buildFileDiagnostics(idx([caller]));
  assert.equal(hasFlag(after, 'f_a', 'Missing file'), true);
});

test('Add File() inside UpdateCell flags a missing target too', () => {
  const caller = file(
    'f_a',
    'caller',
    'UpdateCell({PLAYERS = placedUser, COLUMNTYPE = "day", DAY = placedDay, COLUMN = "morningMessage"}) { Add File({PATH = "gone", ID = "f_g"}); }'
  );
  const map = buildFileDiagnostics(idx([caller]));
  assert.equal(hasFlag(map, 'f_a', 'Missing file'), true);
});

test('flipping a callee role flags its callers', () => {
  const caller = file('f_a', 'caller', 'File({PATH = "target", ID = "f_b"});');
  const before = buildFileDiagnostics(idx([caller, file('f_b', 'target')]));
  assert.equal(hasFlag(before, 'f_a', 'trigger'), false);
  const after = buildFileDiagnostics(idx([caller, file('f_b', 'target', 'Return 1;', 'trigger')]));
  assert.equal(hasFlag(after, 'f_a', 'trigger file'), true);
});

test('dropping an input flags undeclared overrides at call sites', () => {
  const caller = file('f_a', 'caller', 'File({PATH = "target", ID = "f_b", WHO = "Alice"});');
  const before = buildFileDiagnostics(
    idx([caller, file('f_b', 'target', 'FileInput({NAME = "WHO"}); Return 1;')])
  );
  assert.equal(hasFlag(before, 'f_a', 'not a declared input'), false);
  const after = buildFileDiagnostics(idx([caller, file('f_b', 'target', 'Return 1;')]));
  assert.equal(hasFlag(after, 'f_a', 'not a declared input'), true);
});

test('include cycles flag every member and upstream caller', () => {
  const a = file('f_a', 'a', 'File({PATH = "b", ID = "f_b"});');
  const b = file('f_b', 'b', 'File({PATH = "a", ID = "f_a"});');
  const up = file('f_up', 'up', 'File({PATH = "a", ID = "f_a"});');
  const map = buildFileDiagnostics(idx([a, b, up]));
  assert.equal(hasFlag(map, 'f_a', 'Circular file reference'), true);
  assert.equal(hasFlag(map, 'f_b', 'Circular file reference'), true);
  assert.equal(hasFlag(map, 'f_up', 'Circular file reference'), true);
});

test('a clean chain reports no diagnostics', () => {
  const a = file('f_a', 'a', 'File({PATH = "b", ID = "f_b"});');
  const b = file('f_b', 'b');
  assert.equal(buildFileDiagnostics(idx([a, b])).size, 0);
});

test('deleting a tag flags Add tag(...) callers by name', () => {
  const tag = file('f_tag', 'tags/Infected', 'Tag({NAME = "Infected"}); Return 1;', 'trigger');
  const caller = file(
    'f_a',
    'caller',
    'UpdateCell({PLAYERS = placedUser, COLUMNTYPE = "day", DAY = placedDay, COLUMN = "morningMessage"}) { Add tag("Infected"); }'
  );
  const before = buildFileDiagnostics(idx([tag, caller], ['tags']));
  assert.equal(hasFlag(before, 'f_a', 'Unknown tag'), false);
  const after = buildFileDiagnostics(idx([caller], ['tags']));
  assert.equal(hasFlag(after, 'f_a', 'Unknown tag "Infected"'), true);
});

test('renaming a tag file path flags name-based callers', () => {
  const tag = file('f_tag', 'tags/Infected', 'Tag({NAME = "Infected"}); Return 1;', 'trigger');
  const caller = file(
    'f_a',
    'caller',
    'UpdateCell({PLAYERS = placedUser, COLUMNTYPE = "day", DAY = placedDay, COLUMN = "morningMessage"}) { Add tag("Infected"); }'
  );
  // Meta-only renames keep resolving: name lookup matches the tags/ path too.
  const metaRenamed = { ...tag, source: 'Tag({NAME = "Cured"}); Return 1;' };
  const after = buildFileDiagnostics(idx([metaRenamed, caller], ['tags']));
  assert.equal(hasFlag(after, 'f_a', 'Unknown tag'), false);
  // Path-only renames also keep resolving via the tag's NAME meta.
  const pathRenamed = { ...tag, path: 'tags/Cured' };
  const afterMove = buildFileDiagnostics(idx([pathRenamed, caller], ['tags']));
  assert.equal(hasFlag(afterMove, 'f_a', 'Unknown tag'), false);
  // Renaming both leaves no resolution for "Infected".
  const fullyRenamed = { ...pathRenamed, source: 'Tag({NAME = "Cured"}); Return 1;' };
  const afterFull = buildFileDiagnostics(idx([fullyRenamed, caller], ['tags']));
  assert.equal(hasFlag(afterFull, 'f_a', 'Unknown tag "Infected"'), true);
});

test('Create*Input labels count as known inputs for entry() keys', () => {
  // The user's scenario: a display file declares the input via
  // CreateSelectInput and reads it back through InputsWithData.entry.
  const own = file(
    'f_a',
    'roleMessage/Infector',
    'CreateSelectInput({LIST = players, LABEL = "Select"}); UpdateCell({PLAYERS = InputsWithData.entry("Select"), COLUMNTYPE = "day", DAY = (currentDay + 1), COLUMN = "morningMessage"}) { Add tag("Infected"); }'
  );
  const map = buildFileDiagnostics(idx([own]));
  assert.equal(hasFlag(map, 'f_a', 'Unknown input'), false);

  // Included files' input labels register in the same flat namespace.
  const included = file('f_b', 'shared/picker', 'CreateTextInput({LABEL = "Note"});');
  const caller = file('f_c', 'caller', 'File({ID = "f_b"}); Return Inputs.entry("Note");');
  const map2 = buildFileDiagnostics(idx([included, caller]));
  assert.equal(hasFlag(map2, 'f_c', 'Unknown input'), false);

  // Genuinely unknown keys still flag.
  const bad = file('f_d', 'bad', 'Return Inputs.entry("Nope");');
  const map3 = buildFileDiagnostics(idx([bad]));
  assert.equal(hasFlag(map3, 'f_d', 'Unknown input "Nope"'), true);
});

test('tag meta headers do not self-flag on tag files', () => {
  const tag = file('f_tag', 'tags/Infected', 'Tag({NAME = "Infected"}); Return 1;', 'trigger');
  const map = buildFileDiagnostics(idx([tag], ['tags']));
  assert.deepEqual(map.get('f_tag') ?? [], []);
});

test('removing a table column flags UpdateCell users', () => {
  const titles: UserTableTitle = {
    extraUserColumns: ['Notes'],
    extraDayColumns: ['Log'],
    extraUserColumnIds: ['c_notes'],
    extraDayColumnIds: ['d_log'],
  };
  const caller = file(
    'f_a',
    'caller',
    'UpdateCell({PLAYERS = placedUser, COLUMNTYPE = "day", DAY = placedDay, COLUMN = "Log"}) { Each cellContents { Replace cellContents; } }'
  );
  const before = buildFileDiagnostics(idx([caller]), titles);
  assert.equal(hasFlag(before, 'f_a', 'does not exist'), false);
  const after = buildFileDiagnostics(idx([caller]), {
    ...titles,
    extraDayColumns: [],
    extraDayColumnIds: [],
  });
  assert.equal(hasFlag(after, 'f_a', 'Column "Log" does not exist'), true);
});
