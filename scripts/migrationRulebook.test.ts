import assert from 'node:assert/strict';
import { test } from 'node:test';
import { migrateLegacyContent, type LegacyMigrationInput } from '../utils/legacyMigration';
import {
  buildFilesIndex,
  createMarkdownFileSource,
  flattenCellContent,
  getFileCallParts,
  makeFileStatement,
  parseDisplayComposition,
} from '../utils/scriptFiles';
import { getFolderCallParts, selectFolderFiles } from '../utils/scriptFolders';
import { printStatement } from '../script/lang/printer';
import type { RoleTableItem } from '../types/roleTable';
import type { ScriptFile, ScriptFilesDoc } from '../utils/scriptFiles';
import type { NavButtonStatement, Statement } from '../script/lang/ast';

const role = (name: string, over: Partial<RoleTableItem> = {}): RoleTableItem => ({
  role: name,
  roleMessage: '',
  doesRoleVote: true,
  aboutRole: `## ${name}\nDescription of ${name}.`,
  isVisible: true,
  ...over,
});

const baseInput = (over: Partial<LegacyMigrationInput> = {}): LegacyMigrationInput => ({
  scriptFilesDoc: undefined,
  tagDefinitions: [],
  tagTriggers: {},
  roleTable: [],
  voteMessageDefault: '',
  morningMessagesList: {},
  userTable: [],
  ...over,
});

const navBodies = (statements: Statement[]): NavButtonStatement[] =>
  statements.flatMap((s): NavButtonStatement[] => {
    if (s.kind === 'NavButtonStatement') return [s];
    if (s.kind === 'DisplayGroupStatement') return navBodies(s.body.statements);
    return [];
  });

test('legacy About Role strings become aboutRole/ files inside a Nav Button folder composition', () => {
  const input = baseInput({
    roleTable: [
      role('Wolf'),
      role('Seer', { hiddenFromRulebook: true }),
      role('Ghost', { isVisible: false }),
    ],
    ruleBook: {
      content: '## Rules\nPlay nice.',
      roleOrder: [1, 0, 2],
      roleDescriptionsTitle: 'Cast',
    },
  });
  const out = migrateLegacyContent(input);
  const index = buildFilesIndex(out.scriptFilesDoc);

  // Each role's aboutRole cell is now a live File reference into aboutRole/.
  const aboutFiles = Object.values(out.scriptFilesDoc.files).filter((f) =>
    f.path.toLowerCase().startsWith('aboutrole/')
  );
  assert.equal(aboutFiles.length, 3);
  for (const r of out.roleTable) {
    const parts = getFileCallParts(
      parseDisplayComposition(r.aboutRole ?? '')?.[0] ??
        (() => {
          throw new Error('aboutRole is not a composition');
        })()
    );
    assert.ok(parts, `aboutRole for ${r.role} is not a File ref`);
    const file = index.byId.get(parts!.id ?? '') ?? index.byPath.get(parts!.path!.toLowerCase());
    assert.ok(file, `aboutRole for ${r.role} does not resolve`);
    assert.ok(file.path.toLowerCase().startsWith('aboutrole/'));
    assert.match(file.source, /CreateMarkdown/);
    assert.match(file.source, new RegExp(`Description of ${r.role}`));
  }

  // modularContent = rules file + NavButton("Cast"){ Folder(aboutRole) }.
  const stmts = parseDisplayComposition(out.ruleBook.modularContent!);
  assert.ok(stmts && stmts.length >= 2);
  const rulesParts = getFileCallParts(stmts[0]);
  assert.ok(rulesParts, 'first composition statement is not the rules File ref');
  assert.match(stmts[0] && printStatement(stmts[0]), /ruleBook\/Rules/);

  const navs = navBodies(stmts);
  assert.equal(navs.length, 1);
  assert.equal(navs[0].label.kind === 'StringLiteral' ? navs[0].label.value : '', 'Cast');
  const folderParts = getFolderCallParts(navs[0].body.statements[0]);
  assert.ok(folderParts);
  assert.equal(folderParts!.id, 'folder_about_role');
  assert.equal(folderParts!.path, 'aboutRole');
  assert.equal(folderParts!.recursive, undefined); // recursive default
  assert.equal(folderParts!.dividers, true);

  // ORDER follows stored roleOrder (Seer, Wolf, Ghost); hidden roles are in HIDDEN.
  const idOf = (roleIndex: number) => {
    const parts = getFileCallParts(parseDisplayComposition(out.roleTable[roleIndex].aboutRole!)![0]);
    return out.scriptFilesDoc.files[parts!.id!]?.id ?? parts!.id!;
  };
  const seer = idOf(1);
  const wolf = idOf(0);
  const ghost = idOf(2);
  assert.deepEqual(folderParts!.order, [seer, wolf, ghost]);
  assert.deepEqual(new Set(folderParts!.hidden), new Set([seer, ghost]));

  // The composition actually resolves: Nav screen contains only visible files.
  const flat = flattenCellContent(out.ruleBook.modularContent!, index, {
    displayModules: true,
  });
  assert.match(flat.markdown, /NavButton/);
  assert.match(flat.markdown, /Play nice\./);
  assert.match(flat.markdown, /Description of Wolf/);
  assert.doesNotMatch(flat.markdown, /Description of Seer/);
  assert.doesNotMatch(flat.markdown, /Description of Ghost/);

  // Legacy snapshot preserved verbatim.
  assert.equal(out.ruleBook.content, input.ruleBook!.content);
  assert.deepEqual(out.ruleBook.roleOrder, [1, 0, 2]);
  assert.equal(out.ruleBook.roleDescriptionsTitle, 'Cast');
});

test('empty and prebuilt modularContent is preserved verbatim on rerun', () => {
  const doc = { files: {}, folders: ['aboutRole'] } as ScriptFilesDoc;
  const empty = migrateLegacyContent(
    baseInput({ ruleBook: { content: '## Legacy', roleOrder: [], modularContent: '' }, scriptFilesDoc: doc })
  );
  assert.equal(empty.ruleBook.modularContent, '');
  assert.deepEqual(parseDisplayComposition(empty.ruleBook.modularContent!), []);

  const prebuilt =
    'NavButton({\n  LABEL = "Roles",\n}) {\n  Folder({\n    PATH = "aboutRole",\n    ID = "folder_about_role",\n  });\n}';
  const again = migrateLegacyContent(
    baseInput({
      ruleBook: { content: '## Legacy', roleOrder: [], modularContent: prebuilt },
      scriptFilesDoc: doc,
    })
  );
  // Printer normalizes whitespace; the composition itself is untouched.
  const printed = (text: string) =>
    parseDisplayComposition(text)!.map((s) => printStatement(s)).join('\n');
  assert.equal(printed(again.ruleBook.modularContent!), printed(prebuilt));
  assert.equal(again.stats.filesCreated, 0);
});

test('already modular About Role cells reuse their file in the folder ORDER without new files', () => {
  const existing: ScriptFile = {
    id: 'f_about_wolf',
    path: 'aboutRole/Wolf',
    kind: 'markdown',
    source: createMarkdownFileSource('## Wolf\nModular description.'),
    updatedAt: 1,
  };
  const doc: ScriptFilesDoc = {
    files: { f_about_wolf: existing },
    folders: ['aboutRole'],
  };
  const input = baseInput({
    scriptFilesDoc: doc,
    roleTable: [
      role('Wolf', {
        aboutRole: printStatement(makeFileStatement(existing)),
      }),
      role('Seer'), // legacy raw
    ],
    ruleBook: { content: '', roleOrder: [0, 1] },
  });
  const out = migrateLegacyContent(input);
  const index = buildFilesIndex(out.scriptFilesDoc);

  // The preexisting file is reused, not duplicated.
  const aboutFiles = Object.values(out.scriptFilesDoc.files).filter((f) =>
    f.path.toLowerCase().startsWith('aboutrole/')
  );
  assert.equal(aboutFiles.length, 2);

  const stmts = parseDisplayComposition(out.ruleBook.modularContent!);
  const nav = navBodies(stmts!)[0];
  const folderParts = getFolderCallParts(nav.body.statements[0])!;
  assert.equal(folderParts.order![0], 'f_about_wolf');
  assert.deepEqual(folderParts.hidden ?? [], []);

  const flat = flattenCellContent(out.ruleBook.modularContent!, index, {
    displayModules: true,
  });
  assert.match(flat.markdown, /Modular description/);
  assert.match(flat.markdown, /Description of Seer/);
});

test('shared About Role files referenced by two roles get wrapped per role without copying content', () => {
  const shared: ScriptFile = {
    id: 'f_shared',
    path: 'ruleBook/Shared lore',
    kind: 'markdown',
    source: createMarkdownFileSource('Shared lore'),
    updatedAt: 1,
  };
  const doc: ScriptFilesDoc = { files: { f_shared: shared }, folders: ['ruleBook'] };
  const ref = printStatement(makeFileStatement(shared));
  const input = baseInput({
    scriptFilesDoc: doc,
    roleTable: [role('Wolf', { aboutRole: ref }), role('Seer', { aboutRole: ref })],
    ruleBook: { content: '', roleOrder: [] },
  });
  const out = migrateLegacyContent(input);
  const aboutWrappers = Object.values(out.scriptFilesDoc.files).filter(
    (f) => f.path.toLowerCase().startsWith('aboutrole/') && f.kind === 'script'
  );
  // Two roles sharing one file outside aboutRole/ → two thin wrappers.
  assert.equal(aboutWrappers.length, 2);
  for (const wrapper of aboutWrappers) assert.match(wrapper.source, /f_shared/);
});

test('folder references resolve hidden members by live selection after migration', () => {
  const input = baseInput({
    roleTable: [role('Wolf'), role('Seer', { hiddenFromRulebook: true })],
    ruleBook: { content: '', roleOrder: [] },
  });
  const out = migrateLegacyContent(input);
  const index = buildFilesIndex(out.scriptFilesDoc);
  const stmts = parseDisplayComposition(out.ruleBook.modularContent!)!;
  const folderParts = getFolderCallParts(navBodies(stmts)[0].body.statements[0])!;
  const selected = selectFolderFiles(index, folderParts).files.map((f) => f.path);
  assert.equal(selected.length, 1);
  assert.match(selected[0], /Wolf/);
});
