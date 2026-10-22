import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseScript } from '../script/lang/parser';
import { printScript } from '../script/lang/printer';
import { interpretScript } from '../script/runtime/interpreter';
import {
  hasFileInputReferences,
  markdownFileBody,
  normalizeMarkdownFileInputs,
  renameFileInputReferences,
  withMarkdownFileBody,
} from '../utils/markdownFileEditor';
import {
  buildFilesIndex,
  collectDraftFileInputs,
  flattenCellContent,
  flattenStatementsToMarkdown,
  getFileInputs,
  makeFileStatement,
} from '../utils/scriptFiles';
import { getMarkdownVariableNames, substituteMarkdownVariables } from '../script/markdownVariables';

const source = [
  'FileInput({NAME = "Count", DEFAULT = 3});',
  'Variable({NAME = "total", VALUE = Inputs.entry("Count").toNumber * 2});',
  'CreateMarkdown({CONTENT = Markdown(`Total: /*markdownVariable: "Total"*/`, "Total" = total)});',
].join('\n');
const file = { id: 'f_math', path: 'Math', kind: 'markdown' as const, source, updatedAt: 1 };
const index = buildFilesIndex({ files: { [file.id]: file }, folders: [] });
const render = (markdown: string) => {
  const result = interpretScript(markdown);
  assert.deepEqual(result.issues, []);
  return result.output
    .filter((item) => item.kind === 'markdown')
    .map((item) => item.markdown)
    .join('\n');
};

test('markdown/source round trips retain calculations and explicit bindings', () => {
  const ast = parseScript(source);
  assert.equal(markdownFileBody(ast), 'Total: /*markdownVariable: "Total"*/');
  const changed = withMarkdownFileBody(ast, 'Answer: /*markdownVariable: "Total"*/');
  assert.deepEqual(changed.statements.slice(0, 2), ast.statements.slice(0, 2));
  assert.equal(
    markdownFileBody(parseScript(printScript(changed))),
    'Answer: /*markdownVariable: "Total"*/'
  );
  assert.equal(
    render(flattenStatementsToMarkdown(changed.statements, index).markdown),
    'Answer: 6'
  );
});

test('computed bindings are not hoisted into overridable file inputs', () => {
  assert.deepEqual(
    getFileInputs(file).map((input) => input.name),
    ['Count']
  );
  const flattened = flattenCellContent(
    printScript({
      ...parseScript(''),
      statements: [makeFileStatement(file)],
    }),
    index
  );
  assert.deepEqual(flattened.issues, []);
  assert.equal(render(flattened.markdown), 'Total: 6');
  assert.doesNotMatch(flattened.markdown, /NAME = "Total"/);
});

test('call-site overrides reach calculations and rendered markdown', () => {
  const count = parseScript('Return 7;').statements[0];
  assert.equal(count.kind, 'ReturnStatement');
  if (count.kind !== 'ReturnStatement' || !count.value) throw new Error('Missing expression');
  const cell = printScript({
    ...parseScript(''),
    statements: [makeFileStatement(file, { cOuNt: count.value })],
  });
  const flattened = flattenCellContent(cell, index);
  assert.deepEqual(flattened.issues, []);
  assert.equal(render(flattened.markdown), 'Total: 14');
});

test('legacy literal defaults remain inputs and respect overrides', () => {
  const legacy = {
    ...file,
    id: 'f_legacy',
    source:
      'CreateMarkdown({CONTENT = Markdown(`Hi /*markdownVariable: "Name"*/`, "name" = "World")});',
  };
  const files = buildFilesIndex({ files: { [legacy.id]: legacy }, folders: [] });
  assert.deepEqual(
    getFileInputs(legacy).map((input) => input.name),
    ['Name']
  );
  const ast = normalizeMarkdownFileInputs(parseScript(legacy.source));
  assert.equal(ast.statements.length, 2);
  assert.equal(normalizeMarkdownFileInputs(ast), ast);
  assert.equal(
    render(flattenStatementsToMarkdown(parseScript(legacy.source).statements, files).markdown),
    'Hi World'
  );
  const value = parseScript('Return "Ada";').statements[0];
  if (value.kind !== 'ReturnStatement' || !value.value) throw new Error('Missing expression');
  const cell = printScript({
    ...parseScript(''),
    statements: [makeFileStatement(legacy, { NAME: value.value })],
  });
  assert.equal(render(flattenCellContent(cell, files).markdown), 'Hi Ada');
});

test('renaming inputs updates markers and entry references case-insensitively', () => {
  const ast = parseScript(
    [
      'FileInput({NAME = "Count", DEFAULT = 3});',
      'Variable({NAME = "total", VALUE = Inputs.entry("!cOuNt").toNumber * 2});',
      'CreateMarkdown({CONTENT = Markdown(`/*markdownVariable: "COUNT"*/ /*markdownVariable: "Total"*/`, "Total" = total)});',
    ].join('\n')
  );
  assert.equal(hasFileInputReferences(ast, 'Count'), true);
  const renamed = renameFileInputReferences(ast, 'Count', 'Quantity');
  const printed = printScript(renamed);
  assert.match(printed, /Inputs\.entry\("!Quantity"\)/);
  assert.match(printed, /markdownVariable: "Quantity"/);
  assert.equal(hasFileInputReferences(renamed, 'Count'), false);
  assert.equal(hasFileInputReferences(renamed, 'Quantity'), true);
  assert.equal(
    hasFileInputReferences(parseScript('FileInput({NAME = "Unused"});'), 'Unused'),
    false
  );
});

test('legacy string content becomes a substituting markdown literal when edited', () => {
  const ast = withMarkdownFileBody(
    parseScript('FileInput({NAME = "Name", DEFAULT = "Ada"}); CreateMarkdown({CONTENT = "old"});'),
    'Hello /*markdownVariable: "name"*/'
  );
  assert.equal(render(flattenStatementsToMarkdown(ast.statements, index).markdown), 'Hello Ada');
});

test('case-insensitive bindings win over ambient input values', () => {
  assert.deepEqual(
    getMarkdownVariableNames('/*markdownVariable: "Name"*/ /*markdownVariable: "NAME"*/'),
    ['Name']
  );
  assert.equal(
    substituteMarkdownVariables('/*markdownVariable: "Name"*/', new Map([['name', 'Ada']])),
    'Ada'
  );
  const result = interpretScript(
    'CreateMarkdown({CONTENT = Markdown(`/*markdownVariable: "name"*/`, "NAME" = "bound")});',
    { inputState: { Name: 'ambient' } }
  );
  assert.deepEqual(result.issues, []);
  assert.equal(result.output[0].markdown, 'bound');
});

test('complex or duplicate rendering stays in source without destructive body replacement', () => {
  for (const text of [
    `${source}\nCreateMarkdown({CONTENT = "second"});`,
    `${source}\nCreateDivider();`,
    `${source}\nReturn "early exit";`,
    'CreateMarkdown({CONTENT = Inputs.entry("body")});',
  ]) {
    const ast = parseScript(text);
    assert.equal(markdownFileBody(ast), null);
    assert.equal(withMarkdownFileBody(ast, 'replacement'), ast);
  }
});

test('computed bindings sharing an explicit input name are preserved', () => {
  const ast = parseScript(
    'FileInput({NAME = "Count", DEFAULT = 3}); CreateMarkdown({CONTENT = Markdown(`/*markdownVariable: "Count"*/`, "Count" = Inputs.entry("Count").toNumber * 2)});'
  );
  assert.deepEqual(
    collectDraftFileInputs(ast.statements).map((input) => input.name),
    ['Count']
  );
  assert.equal(render(flattenStatementsToMarkdown(ast.statements, index).markdown), '6');
});

test('temporarily removing a marker does not discard its computed expression', () => {
  const ast = withMarkdownFileBody(parseScript(source), 'Temporarily no marker');
  const roundTrip = parseScript(printScript(ast));
  const restored = withMarkdownFileBody(roundTrip, 'Restored: /*markdownVariable: "TOTAL"*/');
  assert.equal(
    render(flattenStatementsToMarkdown(restored.statements, index).markdown),
    'Restored: 6'
  );
});

test('input updates replace differently cased ambient values consistently', () => {
  const result = interpretScript(
    'FileInput({NAME = "Count", DEFAULT = 5}); CreateMarkdown({CONTENT = Markdown(`/*markdownVariable: "COUNT"*/`, "Count" = Inputs.entry("count"))});',
    { globals: { Inputs: { COUNT: 2 } }, inputState: { COUNT: 2 } }
  );
  assert.deepEqual(result.issues, []);
  assert.equal(result.output[0].markdown, '5');
  assert.equal(result.inputState.COUNT, 5);
});

test('reference-aware renames support legacy string CONTENT without rewriting unrelated text', () => {
  const ast = parseScript(
    'Variable({NAME = "note", VALUE = "Count"}); CreateMarkdown({CONTENT = "/*markdownVariable: \\"COUNT\\"*/"});'
  );
  assert.equal(hasFileInputReferences(ast, 'Count'), true);
  const renamed = printScript(renameFileInputReferences(ast, 'Count', 'Quantity'));
  assert.match(renamed, /VALUE = "Count"/);
  assert.match(renamed, /markdownVariable: \\"Quantity\\"/);
});

test('removing a marker releases unused input bindings but not real expression dependencies', () => {
  const ast = parseScript(
    'FileInput({NAME = "Name"}); CreateMarkdown({CONTENT = Markdown(`/*markdownVariable: "Name"*/`, "Name" = nothing)});'
  );
  assert.equal(hasFileInputReferences(ast, 'Name'), true);
  assert.equal(hasFileInputReferences(withMarkdownFileBody(ast, 'No marker'), 'Name'), false);
  const computed = parseScript(
    'CreateMarkdown({CONTENT = Markdown(`No marker`, "Unused" = Inputs.entry("Name"))});'
  );
  assert.equal(hasFileInputReferences(computed, 'Name'), true);
});

test('same-timestamp source revisions cannot reuse a stale parsed file', () => {
  const original = { ...file, id: 'f_cache', source: 'FileInput({NAME = "Old", DEFAULT = 1});' };
  const edited = { ...original, source: 'FileInput({NAME = "New", DEFAULT = 2});' };
  assert.deepEqual(
    getFileInputs(original).map((input) => input.name),
    ['Old']
  );
  assert.deepEqual(
    getFileInputs(edited).map((input) => input.name),
    ['New']
  );
  assert.deepEqual(
    getFileInputs(original).map((input) => input.name),
    ['Old']
  );
});

test('file expansion preserves input dependency order, not marker order', () => {
  const ordered = {
    ...file,
    id: 'f_ordered',
    path: 'Ordered',
    source:
      'FileInput({NAME = "First", DEFAULT = 4}); FileInput({NAME = "Second", DEFAULT = Inputs.entry("First")}); CreateMarkdown({CONTENT = Markdown(`/*markdownVariable: "Second"*/ /*markdownVariable: "First"*/`)});',
  };
  const files = buildFilesIndex({ files: { [ordered.id]: ordered }, folders: [] });
  assert.deepEqual(
    getFileInputs(ordered).map((input) => input.name),
    ['First', 'Second']
  );
  const cell = printScript({ ...parseScript(''), statements: [makeFileStatement(ordered)] });
  assert.equal(render(flattenCellContent(cell, files).markdown), '4 4');
});

test('hoisted functions see file inputs declared after their definition', () => {
  const ast = parseScript(
    'Function doubleCount() { Return Inputs.entry("Count").toNumber * 2; } FileInput({NAME = "Count", DEFAULT = 3}); CreateMarkdown({CONTENT = Markdown(`/*markdownVariable: "Total"*/`, "Total" = doubleCount())});'
  );
  assert.notEqual(markdownFileBody(ast), null);
  assert.equal(render(flattenStatementsToMarkdown(ast.statements, index).markdown), '6');
});

test('runtime input state overrides ambient Inputs case-insensitively even without a default', () => {
  const result = interpretScript(
    'FileInput({NAME = "Count"}); CreateMarkdown({CONTENT = Markdown(`/*markdownVariable: "Direct"*/ /*markdownVariable: "Count"*/`, "Direct" = Inputs.entry("Count"))});',
    {
      globals: { Inputs: { COUNT: 2 } },
      inputState: { Count: 7 },
    }
  );
  assert.deepEqual(result.issues, []);
  assert.equal(result.output[0].markdown, '7 7');
});
