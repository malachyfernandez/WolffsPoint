import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseScript } from '../script/lang/parser';
import { printScript, printStatement } from '../script/lang/printer';
import { interpretScript } from '../script/runtime/interpreter';
import { walkRenderInstructions } from '../script/runtime/instructionTree';
import {
  buildFilesIndex,
  createMarkdownFileSource,
  docWithFile,
  docWithFolder,
  docWithoutFolder,
  expandScriptIncludes,
  flattenCellContent,
  flattenStatementsToMarkdown,
  parseFileCell,
  type ScriptFile,
  type ScriptFilesDoc,
} from '../utils/scriptFiles';
import {
  displayCellEditorText,
  foldCellForResolve,
  parseCellPieces,
  reconcileDisplayCell,
  stripSource,
} from '../utils/cellPieces';
import { adoptFolderIdentities, repathFolderIdentities } from '../utils/scriptFolderIdentity';
import {
  getFolderCallParts,
  makeFolderStatement,
  resolveFolderRef,
  selectFolderFiles,
} from '../utils/scriptFolders';
import {
  displayModuleCapabilities,
  parseDisplayComposition,
  resolveDisplayComposition,
} from '../utils/displayComposition';
import { lintScriptStatements } from '../utils/scriptLint';
import { renameIdentifierInStatements } from '../script/editor/expressionEditor';

const file = (id: string, path: string, source = createMarkdownFileSource(id)): ScriptFile => ({
  id,
  path,
  source,
  kind: 'script',
  updatedAt: 1,
});
const doc = (...files: ScriptFile[]): ScriptFilesDoc => ({
  files: Object.fromEntries(files.map((item) => [item.id, item])),
  folders: [],
});
const folder = (source: string) => {
  const result = getFolderCallParts(parseScript(source).statements[0]);
  assert.ok(result);
  return result;
};
const markdown = (source: string, data = doc()) => {
  const result = interpretScript(source, { filesIndex: buildFilesIndex(data) });
  return [...walkRenderInstructions(result.output)]
    .filter((item) => item.kind === 'markdown')
    .map((item) => item.markdown);
};

test('old documents get deterministic pinned identities without writes or random adoption', () => {
  const original = doc(file('f_a', 'Nested/Child/A'));
  const before = JSON.stringify(original);
  const index = buildFilesIndex(original);
  assert.equal(index.folderIdentities.byId.get('folder_about_role'), 'aboutRole');
  assert.equal(index.folderIdentities.byPath.has('nested'), false);
  assert.deepEqual(
    index.folders.filter((path) => path.startsWith('Nested')),
    ['Nested', 'Nested/Child']
  );
  assert.equal(JSON.stringify(original), before);
  assert.deepEqual(buildFilesIndex(original).folderIdentities, index.folderIdentities);
});

test('explicit adoption is idempotent and survives removing the final implied file', () => {
  const original = doc(file('f_a', 'Nested/Child/A'));
  let number = 0;
  const identified = adoptFolderIdentities(
    original,
    buildFilesIndex(original).folders,
    () => `folder_test${number++}`
  );
  const index = buildFilesIndex(identified);
  const id = index.folderIdentities.byPath.get('nested/child');
  assert.ok(id);
  assert.equal(adoptFolderIdentities(identified, index.folders), identified);
  const moved = { ...identified, files: { f_a: file('f_a', 'Elsewhere/A') } };
  assert.equal(resolveFolderRef(buildFilesIndex(moved), { id }), 'Nested/Child');
  assert.equal(original.folderIds, undefined);
});

test('folder references survive move/rename but never rebind after deletion and path reuse', () => {
  const original = docWithFolder(doc(file('f_a', 'Notes/Child/A')), 'Notes/Child');
  const id = buildFilesIndex(original).folderIdentities.byPath.get('notes/child')!;
  const moved: ScriptFilesDoc = {
    ...original,
    folders: original.folders.map((path) =>
      path.startsWith('Notes') ? path.replace('Notes', 'Moved') : path
    ),
    files: { f_a: file('f_a', 'Moved/Child/A') },
    folderIds: repathFolderIdentities(original, 'Notes', 'Moved'),
  };
  assert.equal(
    resolveFolderRef(buildFilesIndex(moved), { id, path: 'Notes/Child' }),
    'Moved/Child'
  );
  const replaced = docWithFolder(docWithoutFolder(moved, 'Moved'), 'Moved/Child');
  assert.equal(resolveFolderRef(buildFilesIndex(replaced), { id, path: 'Moved/Child' }), undefined);
  assert.equal(resolveFolderRef(buildFilesIndex(replaced), { path: 'moved/child' }), 'Moved/Child');
  assert.notEqual(buildFilesIndex(replaced).folderIdentities.byPath.get('moved/child'), id);
});

test('case-insensitive folder creation has one identity and pinned roots are protected', () => {
  const once = docWithFolder(doc(), 'Notes/Child');
  const twice = docWithFolder(once, 'notes/child');
  assert.equal(
    buildFilesIndex(twice).folders.filter((path) => path.toLowerCase() === 'notes/child').length,
    1
  );
  assert.equal(Object.keys(twice.folderIds!).length, Object.keys(once.folderIds!).length);
  assert.equal(docWithoutFolder(twice, 'ABOUTROLE'), twice);
});

test('ambiguous and forged identity metadata fails closed', () => {
  const original = {
    ...doc(),
    folders: ['Notes'],
    folderIds: { folder_a: 'Notes', folder_b: 'notes', folder_about_role: 'Notes' },
  };
  const index = buildFilesIndex(original);
  assert.equal(index.folderIdentities.byId.has('folder_a'), false);
  assert.equal(index.folderIdentities.byId.has('folder_b'), false);
  assert.equal(resolveFolderRef(index, { id: 'folder_about_role' }), 'aboutRole');
  assert.ok(index.folderIdentities.issues.length >= 2);
  assert.throws(() => adoptFolderIdentities(original, index.folders), /Ambiguous/);
});

test('Folder literal settings round-trip without exposing runtime expressions', () => {
  const statement = makeFolderStatement(
    { id: 'folder_about_role', path: 'aboutRole' },
    {
      order: ['f_b', 'f_a'],
      hidden: ['f_c'],
      recursive: false,
      dividers: true,
      align: 'center',
      imageHeight: 30,
    }
  );
  const parsed = getFolderCallParts(parseScript(printStatement(statement)).statements[0]);
  assert.deepEqual(parsed, {
    id: 'folder_about_role',
    path: 'aboutRole',
    order: ['f_b', 'f_a'],
    hidden: ['f_c'],
    recursive: false,
    dividers: true,
    align: 'center',
    imageHeight: 30,
    issues: [],
  });
  for (const source of [
    'Folder({PATH = "aboutRole", HIDDEN = players});',
    'Folder({ID = Inputs.entry("x"), PATH = "aboutRole"});',
    'Folder({PATH = "aboutRole", path = "tags"});',
    'Folder({PATH = "aboutRole", WHAT = true});',
  ])
    assert.ok(folder(source).issues.length);
});

test('folder membership is live, recursive, ordered and hidden per occurrence', () => {
  const original = doc(
    file('f_a', 'aboutRole/A'),
    file('f_b', 'aboutRole/Sub/B'),
    file('f_c', 'aboutRole/C')
  );
  const index = buildFilesIndex(original);
  const settings = folder(
    'Folder({PATH = "aboutRole", ORDER = ["f_b", "f_outside"], HIDDEN = ["f_a"]});'
  );
  assert.deepEqual(
    selectFolderFiles(index, settings).files.map((item) => item.id),
    ['f_b', 'f_c']
  );
  assert.deepEqual(
    selectFolderFiles(index, { ...settings, recursive: false }).files.map((item) => item.id),
    ['f_c']
  );
  assert.equal(selectFolderFiles(index, folder('Folder({PATH = "aboutRole"});')).files.length, 3);
  const next = docWithFile(original, file('f_new', 'aboutRole/Z'));
  assert.deepEqual(
    selectFolderFiles(buildFilesIndex(next), settings).files.map((item) => item.id),
    ['f_b', 'f_c', 'f_new']
  );
});

test('display folders never execute trigger files, while trigger callers select their own role', () => {
  const trigger = {
    ...file('f_trigger', 'Mixed/Trigger', 'Variable({NAME = "ran", VALUE = true});'),
    role: 'trigger' as const,
  };
  const data = doc(file('f_display', 'Mixed/Display'), trigger);
  const parts = folder('Folder({PATH = "Mixed"});');
  const index = buildFilesIndex(data);
  assert.deepEqual(
    selectFolderFiles(index, parts).files.map((item) => item.id),
    ['f_display']
  );
  assert.deepEqual(
    selectFolderFiles(index, parts, 'trigger').files.map((item) => item.id),
    ['f_trigger']
  );
  const result = interpretScript('Folder({PATH = "Mixed"});', { filesIndex: index });
  assert.equal(result.variables.ran, undefined);
  assert.match(result.issues[0].message, /incompatible trigger/);
  const triggered = interpretScript('Folder({PATH = "Mixed"});', {
    filesIndex: index,
    triggerMode: 'added',
  });
  assert.equal(triggered.variables.ran, true);
});

test('expansion preserves folder-item presentation and default File inputs', () => {
  const data = doc(
    file(
      'f_a',
      'aboutRole/A',
      'FileInput({NAME = "Count", DEFAULT = 7}); CreateMarkdown({CONTENT = Inputs.entry("Count")});'
    ),
    file('f_b', 'aboutRole/B')
  );
  const result = interpretScript(
    'Folder({PATH = "aboutRole", ALIGN = "center", IMAGEHEIGHT = 30, DIVIDERS = true});',
    { filesIndex: buildFilesIndex(data) }
  );
  assert.deepEqual(result.issues, []);
  assert.deepEqual(
    result.output.map((item) => item.kind),
    ['group', 'divider', 'group']
  );
  assert.deepEqual(result.output[0].props, { align: 'center', imageheight: 30 });
  assert.equal(result.output[0].children?.[0].markdown, '7');
  assert.deepEqual(markdown('Folder({PATH = "aboutRole"});', data), ['7', 'f_b']);
});

test('folder/file cycles and wide expansion are bounded with diagnostics', () => {
  const recursive = doc(file('f_self', 'Loop/Self', 'Folder({PATH = "Loop"});'));
  const result = expandScriptIncludes(
    parseScript('Folder({PATH = "Loop"});').statements,
    buildFilesIndex(recursive)
  );
  assert.match(result.issues[0].message, /Circular file/);
  assert.deepEqual(result.statements, []);
  const wide = doc(...Array.from({ length: 30 }, (_, i) => file(`f_${i}`, `Wide/${i}`)));
  const limited = expandScriptIncludes(
    parseScript('Folder({PATH = "Wide"});').statements,
    buildFilesIndex(wide),
    { maxStatements: 10 }
  );
  assert.ok(limited.statements.length < 30);
  assert.equal(limited.issues.filter((issue) => /expansion limit/.test(issue.message)).length, 1);
});

test('strict File-only parsing and legacy text remain separate from composition parsing', () => {
  const source =
    'NavButton({LABEL = "Roles"}) { Folder({PATH = "aboutRole"}); CreateDivider(); CreateMarkdown({CONTENT = "Hello"}); }';
  assert.ok(parseDisplayComposition(source));
  assert.equal(parseFileCell(source), null);
  assert.equal(parseDisplayComposition('## Ordinary legacy prose'), null);
  assert.equal(parseDisplayComposition('UpdateCell({PLAYERS = [], COLUMN = "X"}) {}'), null);
  assert.equal(parseDisplayComposition('NavButton({LABEL = "X"}) { Return 1; }'), null);
  assert.deepEqual(parseDisplayComposition(''), []);
  assert.deepEqual(resolveDisplayComposition('', buildFilesIndex(doc())), {
    markdown: '',
    issues: [],
  });
  assert.equal(resolveDisplayComposition('broken source', buildFilesIndex(doc())).issues.length, 1);
  assert.deepEqual(displayModuleCapabilities(1), { migrated: true, displayModules: false });
  assert.deepEqual(displayModuleCapabilities(2), { migrated: true, displayModules: true });
  assert.deepEqual(displayModuleCapabilities(undefined), {
    migrated: false,
    displayModules: false,
  });
});

test('Nav Button and presentation source preserve nested bodies through round trips', () => {
  const source =
    'NavButton({LABEL = "Roles"}) { DisplayGroup({ALIGN = "center", IMAGEHEIGHT = 30}) { NavButton({LABEL = "Details"}) { CreateMarkdown({CONTENT = "Text"}); } } }';
  const parsed = parseScript(source);
  assert.deepEqual(parsed.diagnostics, []);
  const printed = printScript(parsed);
  assert.equal(printScript(parseScript(printed)), printed);
  for (const invalid of [
    'NavButton() {}',
    'NavButton("X") {}',
    'NavButton({LABEL = "X", OTHER = 1}) {}',
  ]) {
    assert.ok(parseScript(invalid).diagnostics.length);
  }
});

test('navigation captures child output without leaking it into the root or stopping siblings', () => {
  const source =
    'CreateMarkdown({CONTENT = "before"}); NavButton({LABEL = "More"}) { CreateMarkdown({CONTENT = "inside"}); NavButton({LABEL = "More"}) { CreateMarkdown({CONTENT = "deep"}); } } CreateMarkdown({CONTENT = "after"});';
  const result = interpretScript(source);
  assert.deepEqual(result.issues, []);
  assert.deepEqual(
    result.output.map((item) => item.kind),
    ['markdown', 'navigation', 'markdown']
  );
  assert.deepEqual(
    result.output.map((item) => item.markdown),
    ['before', undefined, 'after']
  );
  assert.deepEqual(
    [...walkRenderInstructions(result.output)]
      .filter((item) => item.kind === 'markdown')
      .map((item) => item.markdown),
    ['before', 'inside', 'deep', 'after']
  );
  const keys = [...walkRenderInstructions(result.output)].map((item) => item.key);
  assert.equal(new Set(keys).size, keys.length);
});

test('hidden-screen controls participate in InputsWithData and preserve their flat input keys', () => {
  const result = interpretScript(
    `
    NavButton({LABEL = "Inputs"}) {
      CreateSelectInput({LIST = ["a", "b"], LABEL = "Choice"});
    }
    CreateMarkdown({CONTENT = InputsWithData.entry("Choice")});
  `,
    { inputState: { Choice: 'b' } }
  );
  assert.deepEqual(result.issues, []);
  assert.equal(result.output[1].markdown, 'b');
  assert.equal(result.output[0].children?.[0].key, 'Choice');
  assert.equal(result.inputState.Choice, 'b');
});

test('looped/repeated navigation labels have distinct runtime occurrence keys', () => {
  const result = interpretScript(
    'ForEach (Item in [1, 2]) { NavButton({LABEL = "Same"}) { CreateMarkdown({CONTENT = Item}); } }'
  );
  assert.deepEqual(result.issues, []);
  assert.equal(result.output.length, 2);
  assert.notEqual(result.output[0].key, result.output[1].key);
  assert.deepEqual(
    result.output.map((item) => item.children?.[0].markdown),
    ['1', '2']
  );
});

test('bare Nav returns are rejected without breaking real function returns', () => {
  const result = interpretScript(
    'NavButton({LABEL = "X"}) { Function double(x) { Return x * 2; } Return 8; CreateMarkdown({CONTENT = double(3)}); } CreateMarkdown({CONTENT = "after"});'
  );
  assert.match(result.issues[0].message, /Return does not belong/);
  assert.equal(result.output[0].children?.[0].markdown, '6');
  assert.equal(result.output[1].markdown, 'after');
});

test('folder expansion stays inside a Nav subtree in standalone and flattened runtimes', () => {
  const data = doc(file('f_a', 'aboutRole/A'));
  const source = 'NavButton({LABEL = "Roles"}) { Folder({PATH = "aboutRole"}); }';
  const index = buildFilesIndex(data);
  const direct = interpretScript(source, { filesIndex: index });
  const flattened = flattenStatementsToMarkdown(parseScript(source).statements, index);
  const replayed = interpretScript(flattened.markdown, { filesIndex: index });
  assert.deepEqual(direct.issues, []);
  assert.deepEqual(flattened.issues, []);
  assert.deepEqual(replayed.issues, []);
  assert.equal(direct.output[0].children?.[0].markdown, 'f_a');
  assert.equal(replayed.output[0].children?.[0].markdown, 'f_a');
});

test('new bodies are visited by identifier renaming and trigger/cell placement lint', () => {
  const source = 'NavButton({LABEL = name}) { CreateMarkdown({CONTENT = name}); }';
  const renamed = renameIdentifierInStatements(parseScript(source).statements, 'name', 'title');
  assert.match(printScript({ ...parseScript(''), statements: renamed }), /LABEL = title/);
  assert.match(printScript({ ...parseScript(''), statements: renamed }), /CONTENT = title/);
  const triggerFlags = lintScriptStatements(parseScript(source).statements, {
    isTrigger: true,
    isTagFile: false,
  });
  assert.ok(triggerFlags.some((flag) => /Nav Buttons/.test(flag.message)));
  const cellFlags = lintScriptStatements(
    parseScript(
      'UpdateCell({PLAYERS = [], COLUMNTYPE = "user", COLUMN = "X"}) { Each cellContents { NavButton({LABEL = "No"}) {} } }'
    ).statements,
    { isTrigger: false, isTagFile: false }
  );
  assert.ok(cellFlags.some((flag) => /Display containers/.test(flag.message)));
});

test('mixed display edits retain provenance, entry identity, ordering and rollback', () => {
  const data = doc(file('f_a', 'roleMessage/A'), file('f_b', 'roleMessage/B'));
  const index = buildFilesIndex(data);
  const raw = [
    'File({PATH = "roleMessage/A", ID = "f_a"});',
    'NavButton({LABEL = "Roles"}) { CreateMarkdown({CONTENT = "inside"}); }',
    '[/ADD src="certify:d1:a:ada@example.com"]untouched[/ADD]',
  ].join('\n');

  const edited = [
    'NavButton({LABEL = "Roles"}) { CreateMarkdown({CONTENT = "changed"}); }',
    'File({PATH = "roleMessage/A", ID = "f_a"});',
    'CreateDivider();',
    'File({PATH = "roleMessage/B", ID = "f_b"});',
  ].join('\n');
  const next = reconcileDisplayCell(raw, edited, index);
  const roundTrip = displayCellEditorText(next, index);
  assert.equal(
    roundTrip,
    (parseDisplayComposition(edited) ?? []).map((statement) => printStatement(statement)).join('\n')
  );
  assert.ok(next.includes('untouched'));

  const displays = parseCellPieces(next).pieces.filter((piece) => piece.kind === 'display');
  const nav = displays.find(
    (piece) => piece.kind === 'display' && piece.source.includes('NavButton')
  );
  const divider = displays.find(
    (piece) => piece.kind === 'display' && piece.source.includes('CreateDivider')
  );
  assert.ok(nav && divider);
  assert.equal(
    new Set(displays.map((piece) => piece.kind === 'display' && piece.entryId)).size,
    displays.length
  );

  const editedAgain = roundTrip.replace('changed', 'again');
  const updated = reconcileDisplayCell(next, editedAgain, index);
  const updatedNav = parseCellPieces(updated)
    .pieces.filter((piece) => piece.kind === 'display')
    .find((piece) => piece.kind === 'display' && piece.source.includes('again'));
  assert.equal(updatedNav?.kind === 'display' && updatedNav.entryId, nav.entryId);
  assert.notEqual(updatedNav?.kind === 'display' && updatedNav.pieceId, nav.pieceId);
  assert.equal(stripSource(updated, 'manual').raw, raw);
});

test('display-cell folding composes mixed entries only for upgraded hosts', () => {
  const data = doc(file('f_a', 'aboutRole/A'));
  const index = buildFilesIndex(data);
  const raw = [
    'File({PATH = "aboutRole/A", ID = "f_a"});',
    'NavButton({LABEL = "More"}) { CreateDivider(); }',
  ].join('\n');
  const flattened = flattenCellContent(
    foldCellForResolve(raw, index, { displayModules: true }),
    index,
    { displayModules: true }
  );
  assert.deepEqual(flattened.issues, []);
  assert.match(flattened.markdown, /NavButton\(\{LABEL = "More"\}\)/);
  assert.match(flattened.markdown, /CreateDivider/);
  assert.match(flattened.markdown, /CreateMarkdown/);
  assert.equal(flattenCellContent(foldCellForResolve(raw, index), index).markdown, raw);
});
