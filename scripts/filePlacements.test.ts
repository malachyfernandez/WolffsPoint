import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildFilePlacements,
  buildFilesIndex,
  type ScriptFile,
  type ScriptFilesDoc,
} from '../utils/scriptFiles';
import { collectPieceFileRefs } from '../utils/cellPieces';

const file = (id: string, path: string): ScriptFile => ({
  id,
  path,
  kind: 'script',
  role: 'display',
  source: 'Return players;',
  updatedAt: 1,
});

const doc: ScriptFilesDoc = {
  files: {
    f_inf: file('f_inf', 'roleMessage/Infector'),
    f_md: file('f_md', 'roleMessage/Infector markdown'),
    f_sel: file('f_sel', 'roleMessage/Infector Selector'),
  },
  folders: ['roleMessage'],
};
const index = buildFilesIndex(doc);

const cell = (text: string) => ({
  label: 'Alice · Notes · Day 1',
  text,
  cellKind: 'tableCell' as const,
  extraRefs: collectPieceFileRefs(text, index),
});

const orphanIds = (cells: { label: string; text: string }[]) =>
  [...buildFilePlacements(index, cells).orphans].sort();

const usedIds = (cells: { label: string; text: string }[]) =>
  [...buildFilePlacements(index, cells).byFile.keys()].sort();

test('pure File() source cell counts as a placement', () => {
  const text = 'File({PATH = "roleMessage/Infector", ID = "f_inf"});';
  assert.deepEqual(usedIds([cell(text)]), ['f_inf']);
  assert.deepEqual(orphanIds([cell(text)]), ['f_md', 'f_sel']);
});

test('kind="file" ADD pieces count as placements', () => {
  const text =
    '[/ADD src="manual" kind="file" ref="f_inf"/]' + '[/ADD src="manual" kind="file" ref="f_md"/]';
  assert.deepEqual(usedIds([cell(text)]), ['f_inf', 'f_md']);
});

test('File() base + file piece both count', () => {
  const text =
    'File({PATH = "roleMessage/Infector", ID = "f_inf"});' +
    '[/ADD src="manual" kind="file" ref="f_md"/]';
  assert.deepEqual(usedIds([cell(text)]), ['f_inf', 'f_md']);
});

test('composition cell starting with File() counts all refs', () => {
  const text =
    'File({PATH = "roleMessage/Infector", ID = "f_inf"}); ' +
    'NavButton({LABEL = "More"}) { ' +
    'File({PATH = "roleMessage/Infector markdown", ID = "f_md"}); ' +
    '}';
  assert.deepEqual(usedIds([cell(text)]), ['f_inf', 'f_md']);
});

test('display piece payload contributes its file refs', () => {
  const payload = encodeURIComponent('File({PATH = "roleMessage/Infector", ID = "f_inf"});');
  const text = `[/ADD src="manual" kind="display" ref="piece_1" entry="entry_1" call="${payload}"/]`;
  assert.deepEqual(usedIds([cell(text)]), ['f_inf']);
});

test('SET piece containing File() counts', () => {
  const text = '[/SET src="manual"]File({PATH = "roleMessage/Infector", ID = "f_inf"});[/SET]';
  assert.deepEqual(usedIds([cell(text)]), ['f_inf']);
});

test('REM-masked file piece does not count', () => {
  const text =
    '[/ADD src="manual" kind="file" ref="f_inf"/]' + '[/REM src="manual" match="file:f_inf"/]';
  assert.deepEqual(usedIds([cell(text)]), []);
});

const tagDoc = (() => {
  const tagSrc =
    'Tag({NAME = "Infected", COLOR = "Red"}); ' +
    'UpdateCell({PLAYERS = placedUser, COLUMNTYPE = "day", DAY = placedDay, COLUMN = "morningMessage"}) { ' +
    'Add File({PATH = "Templates/Infected", ID = "f_tpl"}); ' +
    '}';
  return {
    files: {
      f_tag: { ...file('f_tag', 'tags/Infector'), role: 'trigger' as const, source: tagSrc },
      f_tpl: file('f_tpl', 'Templates/Infected'),
    },
    folders: ['tags', 'Templates'],
  };
})();

test('Add File() inside UpdateCell counts as a file->file edge', () => {
  const idx = buildFilesIndex(tagDoc);
  // Tag placed on a real cell: cell -> tag piece -> tag file -> Add File()
  // edge -> the referenced file is reachable, not an orphan.
  const text = '[/TAG id="f_tag" name="Infected" src="manual"/]';
  const placements = buildFilePlacements(idx, [
    { label: 'Alice · Notes', text, cellKind: 'tableCell' as const },
  ]);
  assert.equal(placements.orphans.has('f_tpl'), false);
  assert.equal(placements.reachable.has('f_tpl'), true);
});

test('the same Add File() chain stays orphaned when the tag is unplaced', () => {
  const idx = buildFilesIndex(tagDoc);
  const placements = buildFilePlacements(idx, []);
  assert.equal(placements.orphans.has('f_tpl'), true);
});

test('Add tag("X") inside a file counts as a file->tag edge', () => {
  // The user's scenario: a display file's UpdateCell applies the tag, so
  // the tag file is consumed by the caller - never "not used in files".
  const callerSrc =
    'UpdateCell({PLAYERS = InputsWithData.entry("Select"), COLUMNTYPE = "day", ' +
    'DAY = (currentDay + 1), COLUMN = "morningMessage"}) { Add tag("Infected"); }';
  const addTagDoc: ScriptFilesDoc = {
    files: {
      f_tag: {
        ...file('f_tag', 'tags/Infector'),
        role: 'trigger' as const,
        source: 'Tag({NAME = "Infected", COLOR = "Red"}); Return 1;',
      },
      f_caller: { ...file('f_caller', 'roleMessage/Infector'), source: callerSrc },
    },
    folders: ['tags', 'roleMessage'],
  };
  const idx = buildFilesIndex(addTagDoc);
  const placements = buildFilePlacements(idx, [
    {
      label: 'Infector · Role message',
      text: 'File({PATH = "roleMessage/Infector", ID = "f_caller"});',
      cellKind: 'roleMessage' as const,
    },
  ]);
  // cell -> caller file -> Add tag -> tag file: placed and reachable.
  assert.equal(
    placements.byFile.get('f_tag')?.some((p) => p.kind === 'file' && p.fileId === 'f_caller'),
    true
  );
  assert.equal(placements.reachable.has('f_tag'), true);
  assert.equal(placements.orphans.has('f_tag'), false);
});

test('Remove tag("X") in a cell script island counts as a cell placement', () => {
  const removeDoc: ScriptFilesDoc = {
    files: {
      f_tag: {
        ...file('f_tag', 'tags/Infector'),
        role: 'trigger' as const,
        source: 'Tag({NAME = "Infected", COLOR = "Red"}); Return 1;',
      },
    },
    folders: ['tags'],
  };
  const idx = buildFilesIndex(removeDoc);
  const text =
    'Some markdown\n' +
    '/*script UpdateCell({PLAYERS = players, COLUMNTYPE = "day", DAY = 1, COLUMN = "morningMessage"}) { Remove tag("Infected"); } script*/\n' +
    'More markdown';
  const placements = buildFilePlacements(idx, [
    { label: 'Alice · Morning', text, cellKind: 'morningMessage' as const },
  ]);
  assert.equal(
    placements.byFile.get('f_tag')?.some((p) => p.kind === 'cell'),
    true
  );
  assert.equal(placements.orphans.has('f_tag'), false);
});

test('a REM-masked tag piece is not a live placement', () => {
  const idx = buildFilesIndex(tagDoc);
  // Manually removed tag: the TAG piece stays in the stream but the REM
  // tombstone masks it, so the tag file has no live cell placement.
  const text =
    '[/TAG id="f_tag" name="Infected" src="manual"/]' + '[/REM src="manual" match="tag:Infected"/]';
  const placements = buildFilePlacements(idx, [
    { label: 'Alice · Notes', text, cellKind: 'tableCell' as const },
  ]);
  assert.equal(placements.byFile.has('f_tag'), false);
  assert.equal(placements.orphans.has('f_tpl'), true);
});

test('a tag re-added after its REM counts again', () => {
  const idx = buildFilesIndex(tagDoc);
  const text =
    '[/TAG id="f_tag" name="Infected" src="manual"/]' +
    '[/REM src="manual" match="tag:Infected"/]' +
    '[/TAG id="f_tag" name="Infected" src="manual"/]';
  const placements = buildFilePlacements(idx, [
    { label: 'Alice · Notes', text, cellKind: 'tableCell' as const },
  ]);
  assert.equal(placements.byFile.has('f_tag'), true);
  assert.equal(placements.orphans.has('f_tpl'), false);
});

test('a tagid REM masks the tag piece', () => {
  const idx = buildFilesIndex(tagDoc);
  const text =
    '[/TAG id="f_tag" name="Infected" src="manual"/]' + '[/REM src="manual" match="tagid:f_tag"/]';
  const placements = buildFilePlacements(idx, [
    { label: 'Alice · Notes', text, cellKind: 'tableCell' as const },
  ]);
  assert.equal(placements.byFile.has('f_tag'), false);
});

test('a legacy [/TAG: "x"/] token masked by a tag REM is not a placement', () => {
  const idx = buildFilesIndex(tagDoc);
  const text = 'notes[/TAG: "Infected"/][/REM src="manual" match="tag:Infected"/]';
  const placements = buildFilePlacements(idx, [
    { label: 'Alice · Notes', text, cellKind: 'tableCell' as const },
  ]);
  assert.equal(placements.byFile.has('f_tag'), false);
});
