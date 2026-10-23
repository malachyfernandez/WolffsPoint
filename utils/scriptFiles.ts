import { createContext } from 'react';
import { nowMs } from './simNow';
import { parseScript } from '../script/lang/parser';
import { printExpression, printScript, printStatement } from '../script/lang/printer';
import { getMarkdownVariableNames } from '../script/markdownVariables';
import {
  adoptFolderIdentities,
  buildFolderIdentityIndex,
  PINNED_FOLDER_PATHS,
  withoutFolderIdentities,
  type FolderIdentityIndex,
} from './scriptFolderIdentity';
import { getFolderCallParts, selectFolderFiles } from './scriptFolders';
import type {
  BlockStatement,
  CallExpression,
  Expression,
  MarkdownLiteral,
  NamedArgument,
  Script,
  Statement,
} from '../script/lang/ast';
import { emptySpan } from '../script/lang/ast';

/**
 * Script files: reusable script/markdown documents stored per game.
 *
 * A "file-mode" cell (role message, vote message, morning message) stores a
 * script whose only top-level statements are `File({PATH = "..."})` calls.
 * At render time `flattenCellContent` expands each reference into the file's
 * own statements, producing one flat mega-script that is wrapped in a
 * `/*script ... script*\/` island and fed through the existing markdown
 * engine unchanged. Inputs are flat: `FileInput` statements write into the
 * interpreter's inputState, which `Inputs.entry("x")` and markdownVariable
 * markers both read: no scoping.
 */

export type ScriptFileKind = 'markdown' | 'script';

/** What a file is for: `display` files are rendered into cells/messages and
 *  may carry inputs; `trigger` files run in tag-trigger context (placed*
 *  globals, no inputs). Tag files (in `tags/`) are always trigger. */
export type ScriptFileRole = 'display' | 'trigger';

export interface ScriptFile {
  id: string;
  /** Full path, e.g. "roleMessage/Werewolf Intro". Folders are path segments. */
  path: string;
  kind: ScriptFileKind;
  /** Printed script source. Markdown files contain a single CreateMarkdown. */
  source: string;
  /** Absent = display. Only meaningful on script-kind files. */
  role?: ScriptFileRole;
  updatedAt: number;
}

export interface ScriptFilesDoc {
  files: Record<string, ScriptFile>;
  /** Explicit folder paths so empty folders persist. */
  folders: string[];
  /** Stable folder identities. Optional on pre-composition documents. */
  folderIds?: Record<string, string>;
}

/** Pinned root folders: always exist, cannot be renamed/moved/deleted. */
export const PINNED_FOLDERS = PINNED_FOLDER_PATHS;
export type PinnedFolder = (typeof PINNED_FOLDERS)[number];

/** The pinned folder holding tag files. Each file = one tag: a `Tag({NAME,
 *  COLOR})` meta statement followed by the on-added trigger script. */
export const TAGS_FOLDER = 'tags';

// Shared empty doc: stable identity so `?? emptyScriptFilesDoc()` doesn't
// defeat downstream useMemos when no record exists yet. Never mutate.
const EMPTY_DOC: ScriptFilesDoc = { files: {}, folders: [...PINNED_FOLDERS] };

export const emptyScriptFilesDoc = (): ScriptFilesDoc => EMPTY_DOC;

export const FILE_CALL = 'file';
export const FILE_INPUT_CALL = 'fileinput';
export const MANUAL_ENTRY_PREFIX = '!';

const MAX_FLATTEN_DEPTH = 16;

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

export const normalizeFilePath = (path: string): string =>
  path
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join('/');

export const fileName = (path: string): string => {
  const normalized = normalizeFilePath(path);
  const slash = normalized.lastIndexOf('/');
  return slash === -1 ? normalized : normalized.slice(slash + 1);
};

export const folderOfPath = (path: string): string => {
  const normalized = normalizeFilePath(path);
  const slash = normalized.lastIndexOf('/');
  return slash === -1 ? '' : normalized.slice(0, slash);
};

export const joinFilePath = (folder: string, name: string): string =>
  normalizeFilePath(folder ? `${folder}/${name}` : name);

const INVALID_NAME_CHARS = /[/\\:*?"<>|]/;

export const isValidFileName = (name: string): boolean =>
  name.trim().length > 0 && !INVALID_NAME_CHARS.test(name);

/** True when `path` is one of the pinned top-level folders. Compares
 *  case-insensitively since PINNED_FOLDERS entries are camelCase. */
export const isProtectedFolder = (path: string): boolean => {
  const normalized = normalizeFilePath(path).toLowerCase();
  return (PINNED_FOLDERS as readonly string[]).some((f) => f.toLowerCase() === normalized);
};

// ---------------------------------------------------------------------------
// Index
// ---------------------------------------------------------------------------

export interface ScriptFilesIndex {
  doc: ScriptFilesDoc;
  byId: Map<string, ScriptFile>;
  byPath: Map<string, ScriptFile>;
  folders: string[];
  folderIdentities: FolderIdentityIndex;
}

export const buildFilesIndex = (doc: ScriptFilesDoc | undefined | null): ScriptFilesIndex => {
  const safe: ScriptFilesDoc = doc ?? emptyScriptFilesDoc();
  const byId = new Map<string, ScriptFile>();
  const byPath = new Map<string, ScriptFile>();
  for (const file of Object.values(safe.files ?? {})) {
    byId.set(file.id, file);
    byPath.set(normalizeFilePath(file.path).toLowerCase(), file);
  }
  const folders = new Map<string, string>(PINNED_FOLDERS.map((path) => [path.toLowerCase(), path]));
  for (const folder of safe.folders ?? []) {
    let normalized = normalizeFilePath(folder);
    while (normalized) {
      if (!folders.has(normalized.toLowerCase())) folders.set(normalized.toLowerCase(), normalized);
      normalized = folderOfPath(normalized);
    }
  }
  // Folders implied by file paths also exist.
  for (const file of byId.values()) {
    let folder = folderOfPath(file.path);
    while (folder) {
      if (!folders.has(folder.toLowerCase())) folders.set(folder.toLowerCase(), folder);
      folder = folderOfPath(folder);
    }
  }
  const folderPaths = [...folders.values()].sort();
  return {
    doc: safe,
    byId,
    byPath,
    folders: folderPaths,
    folderIdentities: buildFolderIdentityIndex(folderPaths, safe.folderIds),
  };
};

export const pathExists = (index: ScriptFilesIndex, path: string): boolean =>
  index.byPath.has(normalizeFilePath(path).toLowerCase()) ||
  index.folders.some((f) => f.toLowerCase() === normalizeFilePath(path).toLowerCase());

/** Pick `base`, `base 2`, `base 3`, ... first name not taken in `folder`. */
export const suggestFileName = (base: string, folder: string, index: ScriptFilesIndex): string => {
  const cleaned = base.trim().replace(INVALID_NAME_CHARS, '') || 'file';
  for (let i = 0; ; i++) {
    const candidate = i === 0 ? cleaned : `${cleaned} ${i + 1}`;
    if (!index.byPath.has(joinFilePath(folder, candidate).toLowerCase())) return candidate;
  }
};

// ---------------------------------------------------------------------------
// File() / FileInput() call helpers
// ---------------------------------------------------------------------------

const isCallTo = (statement: Statement, name: string): boolean =>
  statement.kind === 'ExpressionStatement' &&
  statement.expression.kind === 'CallExpression' &&
  statement.expression.callee.kind === 'IdentifierExpression' &&
  statement.expression.callee.name.toLowerCase() === name;

const callOf = (statement: Statement): CallExpression =>
  (statement as { expression: CallExpression }).expression;

export const isFileCallStatement = (statement: Statement): boolean =>
  isCallTo(statement, FILE_CALL);

export const isFileInputStatement = (statement: Statement): boolean =>
  isCallTo(statement, FILE_INPUT_CALL);

const namedArg = (call: CallExpression, name: string): NamedArgument | undefined =>
  call.arguments.find(
    (a): a is NamedArgument =>
      a.kind === 'NamedArgument' && a.name.toLowerCase() === name.toLowerCase()
  );

const literalString = (expr: Expression | undefined): string | undefined =>
  expr?.kind === 'StringLiteral' ? expr.value : undefined;

export interface FileCallParts {
  /** Display + legacy-resolution path. Drifts on rename: resolution prefers id. */
  path: string;
  /** Stable file identity: survives renames/moves. Absent on legacy refs. */
  id?: string;
  /** Call-site input overrides: name → expression. */
  overrides: Map<string, Expression>;
}

const fileCallPartsFromCall = (call: CallExpression): FileCallParts | null => {
  const path = literalString(namedArg(call, 'path')?.value);
  const id = literalString(namedArg(call, 'id')?.value);
  if (path === undefined && id === undefined) return null;
  const overrides = new Map<string, Expression>();
  for (const arg of call.arguments) {
    if (
      arg.kind === 'NamedArgument' &&
      arg.name.toLowerCase() !== 'path' &&
      arg.name.toLowerCase() !== 'id'
    ) {
      overrides.set(arg.name.toLowerCase(), arg.value);
    }
  }
  return { path: path ?? '', id, overrides };
};

export const getFileCallParts = (statement: Statement): FileCallParts | null =>
  isFileCallStatement(statement) ? fileCallPartsFromCall(callOf(statement)) : null;

/**
 * Resolve a file reference: by stable ID first (survives rename/move), then
 * by path only for legacy refs written before IDs existed. A missing ID means
 * the file was deleted: don't path-bind to a stranger that took the slot.
 */
export const resolveFileRef = (
  index: ScriptFilesIndex,
  ref: { id?: string; path?: string }
): ScriptFile | undefined => {
  if (ref.id) return index.byId.get(ref.id);
  const path = normalizeFilePath(ref.path ?? '');
  return path ? index.byPath.get(path.toLowerCase()) : undefined;
};

export interface FileInputDecl {
  name: string;
  defaultExpression?: Expression;
}

export const getFileInputParts = (statement: Statement): FileInputDecl | null => {
  if (!isFileInputStatement(statement)) return null;
  const call = callOf(statement);
  const name = literalString(namedArg(call, 'name')?.value);
  if (!name) return null;
  return { name, defaultExpression: namedArg(call, 'default')?.value };
};

/** Statement-level calls that declare a player-visible input keyed by LABEL.
 *  These register into the same flat Inputs namespace as FileInput decls. */
export const INPUT_LABEL_CALLS = new Set([
  'createtextinput',
  'createnumberinput',
  'createcheckbox',
  'createselectinput',
  'createselectvoteinput',
]);

/** Runtime fallback key when the LABEL arg is absent or an empty literal
 *  (each block's `execute` falls back to `|| 'input'` / `|| 'Vote'`). */
const INPUT_LABEL_DEFAULTS: Record<string, string> = {
  createtextinput: 'input',
  createnumberinput: 'input',
  createcheckbox: 'input',
  createselectinput: 'input',
  createselectvoteinput: 'Vote',
};

/** The key a Create*Input statement registers under Inputs (its LABEL
 *  literal, or the runtime fallback when LABEL is absent/empty). Null when
 *  the statement isn't an input declaration or LABEL is a dynamic expr. */
export const getInputStatementLabel = (statement: Statement): string | null => {
  if (statement.kind !== 'ExpressionStatement') return null;
  const call = statement.expression;
  if (call.kind !== 'CallExpression' || call.callee.kind !== 'IdentifierExpression') return null;
  const callName = call.callee.name.toLowerCase();
  const fallback = INPUT_LABEL_DEFAULTS[callName];
  if (fallback === undefined) return null;
  const arg = namedArg(call, 'label');
  if (arg === undefined) return fallback;
  const literal = literalString(arg.value);
  return literal === undefined ? null : literal || fallback;
};

const makeCall = (name: string, args: NamedArgument[]): Statement => ({
  kind: 'ExpressionStatement',
  expression: {
    kind: 'CallExpression',
    callee: { kind: 'IdentifierExpression', name, span: emptySpan() },
    arguments: args,
    span: emptySpan(),
  },
  span: emptySpan(),
});

const named = (name: string, value: Expression): NamedArgument => ({
  kind: 'NamedArgument',
  name,
  value,
  span: emptySpan(),
});

const strLit = (value: string): Expression => ({
  kind: 'StringLiteral',
  value,
  span: emptySpan(),
});

/** `File({PATH = "path", ID = "f_x", <overrides>});`: ID keeps the ref alive across renames. */
export const makeFileStatement = (
  file: { id: string; path: string },
  overrides: Record<string, Expression> = {}
): Statement =>
  makeCall('File', [
    named('PATH', strLit(file.path)),
    named('ID', strLit(file.id)),
    ...Object.entries(overrides).map(([key, expr]) => named(key, expr)),
  ]);

/** `FileInput({NAME = "x", DEFAULT = <expr>});`: DEFAULT omitted when absent. */
export const makeFileInputStatement = (name: string, defaultExpression?: Expression): Statement =>
  makeCall('FileInput', [
    named('NAME', strLit(name)),
    ...(defaultExpression ? [named('DEFAULT', defaultExpression)] : []),
  ]);

/**
 * FileInput declarations conceptually live at the top of a file, hoist all
 * top-level FileInput statements into a stable prefix (order preserved).
 * FileInputs nested inside If/ForEach/Function bodies aren't real
 * declarations and are left where they are.
 */
export const hoistFileInputs = (statements: Statement[]): Statement[] => {
  const inputs = statements.filter(isFileInputStatement);
  if (inputs.length === 0) return statements;
  const rest = statements.filter((s) => !isFileInputStatement(s));
  return [...inputs, ...rest];
};

// ---------------------------------------------------------------------------
// Cell detection
// ---------------------------------------------------------------------------

/**
 * A cell is in "file mode" when its text parses cleanly and every top-level
 * statement is a `File(...)` call. Anything else is legacy markdown.
 */
// A file-mode cell's first statement is always a File( call, so anything
// whose first non-comment token isn't `File(` can never be file mode. This
// skips the parser entirely for legacy markdown (the common case, hot path:
// previewText runs for every row of the nightly table).
const FILE_CELL_LEAD = /^\s*(?:(?:\/\/[^\n]*)|(?:\/\*[\s\S]*?\*\/))*\s*File\s*\(/i;

const fileCellParseCache = new Map<string, Statement[] | null>();

export const parseFileCell = (text: string): Statement[] | null => {
  const trimmed = (text ?? '').trim();
  if (!trimmed) return [];
  if (!FILE_CELL_LEAD.test(trimmed)) return null;
  const cached = fileCellParseCache.get(trimmed);
  if (cached !== undefined) return cached;
  let result: Statement[] | null = null;
  try {
    const script = parseScript(trimmed);
    if (
      !script.diagnostics.some((d) => d.severity === 'error') &&
      script.statements.length > 0 &&
      script.statements.every(isFileCallStatement)
    ) {
      result = script.statements;
    }
  } catch {
    /* not a file cell */
  }
  if (fileCellParseCache.size > 300) fileCellParseCache.clear();
  fileCellParseCache.set(trimmed, result);
  return result;
};

export const isFileCell = (text: string): boolean => parseFileCell(text) !== null;

const DISPLAY_CALLS = new Set(['file', 'folder', 'createmarkdown', 'createdivider']);

/** Top-level statements allowed in a modular display cell. */
export const isDisplayCompositionStatement = (statement: Statement): boolean => {
  if (statement.kind === 'NavButtonStatement') {
    return statement.body.statements.every(isDisplayCompositionStatement);
  }
  return (
    statement.kind === 'ExpressionStatement' &&
    statement.expression.kind === 'CallExpression' &&
    statement.expression.callee.kind === 'IdentifierExpression' &&
    DISPLAY_CALLS.has(statement.expression.callee.name.toLowerCase())
  );
};

const DISPLAY_CELL_LEAD =
  /^\s*(?:(?:\/\/[^\n]*)|(?:\/\*[\s\S]*?\*\/))*\s*(?:File|Folder|CreateMarkdown|CreateDivider|NavButton)\s*\(/i;

const displayCellParseCache = new Map<string, Statement[] | null>();

/**
 * Display-composition mode: File, Folder, inline Markdown/Divider calls, and
 * NavButton containers only. Explicit v2 hosts use this parser; ordinary
 * legacy markdown remains unparsed text.
 */
export const parseDisplayComposition = (text: string): Statement[] | null => {
  const trimmed = (text ?? '').trim();
  if (!trimmed) return [];
  if (!DISPLAY_CELL_LEAD.test(trimmed)) return null;
  const cached = displayCellParseCache.get(trimmed);
  if (cached !== undefined) return cached;
  let result: Statement[] | null = null;
  try {
    const script = parseScript(trimmed);
    if (
      !script.diagnostics.some((d) => d.severity === 'error') &&
      script.statements.every(isDisplayCompositionStatement)
    ) {
      result = script.statements;
    }
  } catch {
    /* not a display composition */
  }
  if (displayCellParseCache.size > 300) displayCellParseCache.clear();
  displayCellParseCache.set(trimmed, result);
  return result;
};

// ---------------------------------------------------------------------------
// File inputs
// ---------------------------------------------------------------------------

const fileParseCache = new Map<string, { source: string; script: Script }>();

export const parseFileSource = (file: ScriptFile): Script | null => {
  const cacheKey = `${file.id}:${file.updatedAt}`;
  const cached = fileParseCache.get(cacheKey);
  if (cached?.source === file.source) return cached.script;
  try {
    const parsed = parseScript(file.source);
    if (fileParseCache.size >= 200) {
      fileParseCache.delete(fileParseCache.keys().next().value ?? '');
    }
    fileParseCache.set(cacheKey, { source: file.source, script: parsed });
    return parsed;
  } catch {
    return null;
  }
};

export const fileStatements = (file: ScriptFile): Statement[] =>
  parseFileSource(file)?.statements ?? [];

/** Every resolved/unresolved `File(...)` reference in a file's own source
 *  (all nesting levels, cell-op values included). Used by the diagnostics
 *  graph to build referrer→referenced edges without re-parsing. */
export const collectSourceFileRefs = (
  file: ScriptFile,
  index: ScriptFilesIndex
): FileCallParts[] => {
  const refs: FileCallParts[] = [];
  walkFileCalls(
    fileStatements(file),
    (parts) => refs.push(parts),
    0,
    index,
    isTriggerFile(file) ? 'trigger' : 'display'
  );
  return refs;
};

/**
 * Declared inputs of a file.
 * Script files: top-level FileInput statements.
 * Markdown files: the markdownVariable markers inside the CreateMarkdown
 * content: their `variables` bindings act as the declared defaults.
 */
/**
 * Inputs declared by a statement list, top-level FileInput statements plus
 * `/*markdownVariable:*\/` markers inside CreateMarkdown content. A FileInput
 * statement's DEFAULT overrides the marker's inline binding for the same name.
 */
export const collectDraftFileInputs = (statements: Statement[]): FileInputDecl[] => {
  const fileInputs = new Map<string, FileInputDecl>();
  for (const stmt of statements) {
    const decl = getFileInputParts(stmt);
    if (decl) fileInputs.set(decl.name.toLowerCase(), decl);
  }
  const decls: FileInputDecl[] = [];
  const seen = new Set<string>();
  for (const statement of statements) {
    if (!isCallTo(statement, 'createmarkdown')) continue;
    const content = namedArg(callOf(statement), 'content')?.value;
    if (content?.kind !== 'MarkdownLiteral') continue;
    const bindings = new Map(
      (content.variables ?? []).map((v) => [v.name.toLowerCase(), v.expression] as const)
    );
    for (const name of getMarkdownVariableNames(content.value)) {
      const lower = name.toLowerCase();
      if (seen.has(lower)) continue;
      const binding = bindings.get(lower);
      if (!fileInputs.has(lower) && binding && !isMarkdownInputDefault(binding)) continue;
      seen.add(lower);
      decls.push({
        name,
        defaultExpression: fileInputs.get(lower)?.defaultExpression ?? binding,
      });
    }
  }
  for (const [lower, decl] of fileInputs) {
    if (seen.has(lower)) continue;
    seen.add(lower);
    decls.push(decl);
  }
  // Explicit defaults may depend on earlier inputs. Marker order is a display
  // concern and must not reorder declarations when expanding a File call.
  const byName = new Map(decls.map((decl) => [decl.name.toLowerCase(), decl]));
  return [
    ...[...fileInputs].map(([lower, decl]) => ({
      ...decl,
      defaultExpression: decl.defaultExpression ?? byName.get(lower)?.defaultExpression,
    })),
    ...decls.filter((decl) => !fileInputs.has(decl.name.toLowerCase())),
  ];
};

export const getFileInputs = (file: ScriptFile): FileInputDecl[] =>
  collectDraftFileInputs(fileStatements(file));

const inputNamesCache = new WeakMap<ScriptFile, { source: string; names: ReadonlySet<string> }>();

/** An unresolved or invalid definition is not an empty input contract. */
const declaredInputNames = (
  index: ScriptFilesIndex,
  ref: { id?: string; path?: string }
): ReadonlySet<string> | undefined => {
  const file = resolveFileRef(index, ref);
  if (!file) return undefined;
  const cached = inputNamesCache.get(file);
  if (cached?.source === file.source) return cached.names;
  const script = parseFileSource(file);
  if (!script || script.diagnostics.some((item) => item.severity === 'error')) return undefined;
  const names = new Set(getFileInputs(file).map((input) => input.name.toLowerCase()));
  inputNamesCache.set(file, { source: file.source, names });
  return names;
};

/** Preserve identity when there are no stale arguments, for live editor effects. */
export const cleanupFileInputExpression = (
  expression: Expression,
  index: ScriptFilesIndex
): Expression => {
  let changed = false;
  const visit = (value: Expression): Expression => {
    let next = mapExpressionChildren(value, visit);
    if (next.kind === 'StringLiteral' || next.kind === 'MarkdownLiteral') {
      const text = cleanupEmbeddedFileInputs(next.value, index);
      if (text !== next.value) {
        changed = true;
        next = { ...next, value: text };
      }
    }
    if (next.kind !== 'CallExpression') return next;
    const ref = getFileCallParts({
      kind: 'ExpressionStatement',
      expression: next,
      span: next.span,
    });
    const names = ref ? declaredInputNames(index, ref) : undefined;
    if (!names) return next;
    const args = next.arguments.filter(
      (arg) =>
        arg.kind !== 'NamedArgument' ||
        ['id', 'path'].includes(arg.name.toLowerCase()) ||
        names.has(arg.name.toLowerCase())
    );
    if (args.length === next.arguments.length) return next;
    changed = true;
    return { ...next, arguments: args };
  };
  const result = visit(expression);
  return changed ? result : expression;
};

export const cleanupFileInputStatements = (
  statements: Statement[],
  index: ScriptFilesIndex
): Statement[] => {
  let changed = false;
  const next = statements.map((statement) =>
    mapStatementExpressions(statement, (expression) => {
      const clean = cleanupFileInputExpression(expression, index);
      if (clean !== expression) changed = true;
      return clean;
    })
  );
  return changed ? next : statements;
};

const cleanupEmbeddedFileInputs = (text: string, index: ScriptFilesIndex): string => {
  const markers = text.replace(
    new RegExp(FILE_MARKER_PATTERN.source, 'g'),
    (marker, json: string) => {
      const ref = parseFileMarker(json);
      const names = ref ? declaredInputNames(index, ref) : undefined;
      if (!ref || !names) return marker;
      let changed = false;
      const inputs: Record<string, string> = {};
      for (const [name, source] of Object.entries(ref.inputs)) {
        if (!names.has(name.toLowerCase())) {
          changed = true;
          continue;
        }
        const expression = parsePrintedExpression(source);
        const clean = expression ? cleanupFileInputExpression(expression, index) : undefined;
        inputs[name] = clean && clean !== expression ? printExpression(clean) : source;
        if (inputs[name] !== source) changed = true;
      }
      return changed ? encodeFileMarker(ref, inputs) : marker;
    }
  );
  return markers.replace(/\/\*script\s*\n?([\s\S]*?)\n?script\*\//gi, (island, source: string) => {
    const clean = cleanupFileInputText(source, index);
    return clean === source ? island : `/*script\n${clean}\nscript*/`;
  });
};

/** Handles bare script/file lists and embedded markdown file/script markers. */
export const cleanupFileInputText = (source: string, index: ScriptFilesIndex): string => {
  if (!/\bfile\s*\(|\/\*file:/i.test(source)) return source;
  const embedded = cleanupEmbeddedFileInputs(source, index);
  try {
    const script = parseScript(embedded);
    if (script.diagnostics.some((item) => item.severity === 'error')) return embedded;
    const statements = cleanupFileInputStatements(script.statements, index);
    return statements === script.statements ? embedded : printScript({ ...script, statements });
  } catch {
    return embedded;
  }
};

/** Saving a definition also repairs every current caller in the same files doc. */
export const cleanupFileInputsInDoc = (doc: ScriptFilesDoc): ScriptFilesDoc => {
  const index = buildFilesIndex(doc);
  let changed = false;
  const files = { ...doc.files };
  for (const file of Object.values(files)) {
    const source = cleanupFileInputText(file.source, index);
    if (source === file.source) continue;
    changed = true;
    files[file.id] = { ...file, source, updatedAt: nowMs() };
  }
  return changed ? { ...doc, files } : doc;
};

/**
 * Call-site overrides seeded from a file's declared input defaults, so a
 * fresh `File(...)` block shows the defaults instead of empty sockets.
 * Blank (NothingLiteral) defaults emit no override; the socket stays a
 * fill-in target.
 */
export const fileInputDefaults = (file: ScriptFile): Record<string, Expression> => {
  const overrides: Record<string, Expression> = {};
  for (const decl of getFileInputs(file)) {
    const d = decl.defaultExpression;
    if (d && d.kind !== 'NothingLiteral') overrides[decl.name] = d;
  }
  return overrides;
};

/** Preserve call-site overrides case-insensitively when choosing another file. */
export const retargetFileStatement = (file: ScriptFile, previous?: Statement): Statement => {
  const overrides = new Map(
    Object.entries(fileInputDefaults(file)).map(([name, value]) => [name.toLowerCase(), value])
  );
  if (previous) {
    getFileCallParts(previous)?.overrides.forEach((value, name) => overrides.set(name, value));
  }
  const statement = makeFileStatement(file, Object.fromEntries(overrides));
  return cleanupFileInputStatements(
    [statement],
    buildFilesIndex({ files: { [file.id]: file }, folders: [] })
  )[0];
};

/**
 * Fallback expression for a declared `File(...)` input arg that has no
 * call-site override. File-only cells ('fileOnly' mode) always show an
 * editable string field. The empty arg is auto-filled with an empty
 * StringLiteral so the slot is a text input, never a '+' socket that
 * could route to the file picker. Other contexts keep NothingLiteral so
 * the override stays optional and the declared default applies.
 */
export const missingFileInputArgFallback = (fileOnly: boolean): Expression =>
  fileOnly
    ? { kind: 'StringLiteral', value: '', span: emptySpan() }
    : { kind: 'NothingLiteral', span: emptySpan() };

/** Where a '+'/swap request goes in a fileOnly cell editor. */
export type FileOnlyInsertRoute = 'filePick' | 'expressionPicker';

/**
 * File-only editors accept only File(...) statements at the top level, so
 * statement targets go straight to the file browser. Expression-level
 * slots inside a File(...) call (its input args) are ordinary values and
 * must use the normal expression picker, never the file picker.
 */
export const fileOnlyInsertRoute = (kind: string): FileOnlyInsertRoute =>
  kind === 'statement' ? 'filePick' : 'expressionPicker';

// ---------------------------------------------------------------------------
// /*file:*/ markers inside markdown content
// ---------------------------------------------------------------------------

const FILE_MARKER_PATTERN = /\/\*file:\s*(\{[\s\S]*?\})\s*\*\//g;

export interface FileMarker {
  /** Stable file identity: survives renames. Absent on legacy markers. */
  id?: string;
  path: string;
  /** input name → printed expression source */
  inputs: Record<string, string>;
}

export const encodeFileMarker = (
  file: { id?: string; path: string },
  inputs: Record<string, string> = {}
): string => `/*file: ${JSON.stringify({ id: file.id, path: file.path, inputs })}*/`;

export const parseFileMarker = (json: string): FileMarker | null => {
  try {
    const parsed = JSON.parse(json);
    if (typeof parsed?.path !== 'string' || !parsed.path.trim()) return null;
    const inputs: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed.inputs ?? {})) {
      if (typeof value === 'string') inputs[key] = value;
    }
    return {
      id: typeof parsed.id === 'string' && parsed.id ? parsed.id : undefined,
      path: parsed.path,
      inputs,
    };
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------
// Flattening
// ---------------------------------------------------------------------------

export interface FlattenIssue {
  message: string;
  path?: string;
}

interface IncludeExpansionContext {
  role: ScriptFileRole;
  remaining: number;
}

export interface IncludeExpansionOptions {
  role?: ScriptFileRole;
  maxStatements?: number;
}

const expansionContext = (options: IncludeExpansionOptions = {}): IncludeExpansionContext => ({
  role: options.role ?? 'display',
  remaining: Math.max(1, Math.min(10_000, options.maxStatements ?? 10_000)),
});

const parsePrintedExpression = (source: string): Expression | undefined => {
  try {
    const script = parseScript(`${source};`);
    const stmt = script.statements[0];
    return stmt?.kind === 'ExpressionStatement' ? stmt.expression : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Expand `/*file:*\/` markers inside markdown content text. Markdown files
 * inline their (recursively expanded) content; script files inline a
 * `/*script ... script*\/` island. Marker inputs emit FileInput islands
 * before the inlined content: flat semantics.
 */
const expandMarkdownText = (
  text: string,
  index: ScriptFilesIndex,
  stack: string[],
  issues: FlattenIssue[],
  depth: number,
  context: IncludeExpansionContext
): string => {
  FILE_MARKER_PATTERN.lastIndex = 0;
  return text.replace(FILE_MARKER_PATTERN, (marker, json: string) => {
    if (context.remaining-- <= 0) {
      if (context.remaining === -1) issues.push({ message: 'File expansion limit exceeded' });
      return '';
    }
    const ref = parseFileMarker(json);
    if (!ref) {
      issues.push({ message: 'Malformed file marker' });
      return '';
    }
    const file = resolveFileRef(index, ref);
    if (!file) {
      issues.push({ message: `Missing file: ${ref.path}`, path: ref.path });
      return '';
    }
    if (stack.includes(file.id)) {
      issues.push({ message: `Circular file reference: ${ref.path}`, path: ref.path });
      return '';
    }
    if (depth >= MAX_FLATTEN_DEPTH) {
      issues.push({ message: `File nesting too deep at: ${ref.path}`, path: ref.path });
      return '';
    }
    const inputIsland = buildInputStatements(file, exprMapFromStrings(ref.inputs));
    const prefix =
      inputIsland.length > 0
        ? `/*script\n${inputIsland.map((s) => printStatement(s)).join('\n')}\nscript*/\n`
        : '';
    if (file.kind === 'markdown') {
      return (
        prefix +
        expandMarkdownText(
          fileMarkdownText(file),
          index,
          [...stack, file.id],
          issues,
          depth + 1,
          context
        )
      );
    }
    const expanded = expandStatements(
      fileStatements(file),
      index,
      [...stack, file.id],
      issues,
      depth + 1,
      true,
      context
    );
    return `${prefix}/*script\n${expanded.map((s) => printStatement(s)).join('\n')}\nscript*/`;
  });
};

/**
 * Editor-only context: when a file index is provided, MarkdownRenderer expands
 * `/*file:*\/` markers before rendering so previews show composed content.
 * Player-facing paths resolve cells before render and leave this null.
 */
export const ScriptFilesIndexContext = createContext<ScriptFilesIndex | null>(null);

/** Expand `/*file:*\/` markers in arbitrary markdown text for previews. */
export const expandFileMarkersInText = (text: string, index: ScriptFilesIndex): string => {
  const issues: FlattenIssue[] = [];
  return expandMarkdownText(text, index, [], issues, 0, expansionContext());
};

const exprMapFromStrings = (inputs: Record<string, string>): Map<string, Expression> => {
  const map = new Map<string, Expression>();
  for (const [key, source] of Object.entries(inputs)) {
    const expr = parsePrintedExpression(source);
    if (expr) map.set(key.toLowerCase(), expr);
  }
  return map;
};

/** FileInput statements resolving a file's declared inputs against overrides. */
const buildInputStatements = (
  file: ScriptFile,
  overrides: Map<string, Expression>
): Statement[] => {
  const inputs = getFileInputs(file);
  const emitted: Statement[] = [];
  for (const decl of inputs) {
    emitted.push(
      makeFileInputStatement(
        decl.name,
        overrides.get(decl.name.toLowerCase()) ?? decl.defaultExpression
      )
    );
  }
  return emitted;
};

/** The markdown text of a markdown file (the CreateMarkdown CONTENT literal). */
const fileMarkdownText = (file: ScriptFile): string => {
  for (const statement of fileStatements(file)) {
    if (!isCallTo(statement, 'createmarkdown')) continue;
    const content = namedArg(callOf(statement), 'content')?.value;
    if (content?.kind === 'MarkdownLiteral') return content.value;
    if (content?.kind === 'StringLiteral') return content.value;
  }
  return '';
};

/**
 * Clone a MarkdownLiteral with the declared-input names removed from its
 * `variables` bindings: those resolve through inputState (FileInput) after
 * flattening. Bindings for names that were never inputs stay untouched.
 */
const isMarkdownInputDefault = (expression: Expression): boolean => {
  if (expression.kind === 'ListExpression') return expression.items.every(isMarkdownInputDefault);
  if (expression.kind === 'UnaryExpression') return isMarkdownInputDefault(expression.operand);
  return [
    'StringLiteral',
    'NumberLiteral',
    'BooleanLiteral',
    'NothingLiteral',
    'DropdownLiteral',
    'ListLiteral',
  ].includes(expression.kind);
};

const stripDeclaredBindings = (
  literal: MarkdownLiteral,
  declaredNames: Set<string>
): MarkdownLiteral => ({
  ...literal,
  variables: (literal.variables ?? []).filter(
    (v) => !declaredNames.has(v.name.toLowerCase()) || !isMarkdownInputDefault(v.expression)
  ),
});

const expandStatements = (
  statements: Statement[],
  index: ScriptFilesIndex,
  stack: string[],
  issues: FlattenIssue[],
  depth: number,
  /** True when iterating a file's direct top-level statements, the file's
   *  own FileInput declarations get replaced by the referencing call's
   *  resolved values, so they're skipped here. Nested FileInputs run. */
  isFileTopLevel = false,
  context: IncludeExpansionContext = expansionContext()
): Statement[] => {
  const out: Statement[] = [];
  const declaredInputs = new Set(
    (isFileTopLevel
      ? collectDraftFileInputs(statements)
      : statements.map(getFileInputParts).filter((decl): decl is FileInputDecl => decl !== null)
    ).map((decl) => decl.name.toLowerCase())
  );
  for (const statement of statements) {
    if (context.remaining-- <= 0) {
      if (context.remaining === -1) issues.push({ message: 'File expansion limit exceeded' });
      return out;
    }
    if (depth >= MAX_FLATTEN_DEPTH) {
      issues.push({ message: 'File nesting too deep' });
      return out;
    }
    const folderCall = getFolderCallParts(statement);
    if (folderCall) {
      const selection = selectFolderFiles(index, folderCall, context.role);
      issues.push(...selection.issues.map((message) => ({ message })));
      for (const file of selection.excluded) {
        issues.push({
          message: `Folder excludes incompatible ${isTriggerFile(file) ? 'trigger' : 'display'} file: ${file.path}`,
          path: file.path,
        });
      }
      let emitted = false;
      for (const file of selection.files) {
        if (context.remaining < 0) break;
        const children = expandStatements(
          [makeFileStatement(file)],
          index,
          stack,
          issues,
          depth + 1,
          false,
          context
        );
        if (!children.length) continue;
        if (emitted && folderCall.dividers) {
          out.push(makeCall('CreateDivider', []));
        }
        emitted = true;
        if (folderCall.align || folderCall.imageHeight !== undefined) {
          const args: NamedArgument[] = [];
          if (folderCall.align) args.push(named('ALIGN', strLit(folderCall.align)));
          if (folderCall.imageHeight !== undefined) {
            args.push(
              named('IMAGEHEIGHT', {
                kind: 'NumberLiteral',
                value: folderCall.imageHeight,
                span: emptySpan(),
              })
            );
          }
          out.push({
            kind: 'DisplayGroupStatement',
            arguments: args,
            body: { kind: 'BlockStatement', statements: children, span: statement.span },
            span: statement.span,
          });
        } else out.push(...children);
      }
      continue;
    }
    const fileCall = getFileCallParts(statement);
    if (fileCall) {
      const file = resolveFileRef(index, fileCall);
      if (!file) {
        issues.push({ message: `Missing file: ${fileCall.path}`, path: fileCall.path });
        continue;
      }
      if (stack.includes(file.id)) {
        issues.push({ message: `Circular file reference: ${fileCall.path}`, path: file.path });
        continue;
      }
      out.push(...buildInputStatements(file, fileCall.overrides));
      out.push(
        ...expandStatements(
          fileStatements(file),
          index,
          [...stack, file.id],
          issues,
          depth + 1,
          true,
          context
        )
      );
      continue;
    }
    // Skip a file's own top-level FileInput declarations; they were already
    // emitted (with resolved defaults) by the referencing File call. FileInput
    // statements inside nested bodies execute normally, so leave those alone.
    if (isFileTopLevel && isFileInputStatement(statement)) continue;
    // File calls nested inside block bodies expand too, same flat model.
    const withExpandedBodies = expandNestedFileCalls(
      statement,
      index,
      stack,
      issues,
      depth,
      context
    );
    out.push(
      expandMarkdownLiterals(
        withExpandedBodies,
        index,
        stack,
        issues,
        depth,
        declaredInputs,
        context
      )
    );
  }
  return out;
};

/** Recurse into statement bodies so File calls inside If/ForEach/etc expand. */
const expandNestedFileCalls = (
  statement: Statement,
  index: ScriptFilesIndex,
  stack: string[],
  issues: FlattenIssue[],
  depth: number,
  context: IncludeExpansionContext
): Statement => {
  const expandBlock = (block: { kind: 'BlockStatement'; statements: Statement[]; span: any }) => ({
    ...block,
    statements: expandStatements(block.statements, index, stack, issues, depth + 1, false, context),
  });
  switch (statement.kind) {
    case 'IfStatement':
      return {
        ...statement,
        branches: statement.branches.map((b) => ({ ...b, body: expandBlock(b.body) })),
        elseBody: statement.elseBody ? expandBlock(statement.elseBody) : undefined,
      };
    case 'ForEachStatement':
    case 'NavButtonStatement':
    case 'DisplayGroupStatement':
    case 'FunctionStatement':
    case 'OnTagAddedStatement':
    case 'OnTagRemovedStatement':
      return { ...statement, body: expandBlock(statement.body) } as Statement;
    case 'UpdateCellStatement':
    case 'ForEachCellStatement':
      return { ...statement, body: expandBlock(statement.body) } as Statement;
    default:
      return statement;
  }
};

/**
 * Expand /*file:*\/ markers inside any MarkdownLiteral in a statement,
 * recursively through nested expressions: and strip declared-input bindings.
 */
const expandMarkdownLiterals = (
  statement: Statement,
  index: ScriptFilesIndex,
  stack: string[],
  issues: FlattenIssue[],
  depth: number,
  declaredInputs: Set<string>,
  context: IncludeExpansionContext
): Statement => {
  const transform = (expr: Expression): Expression => {
    // CreateMarkdown CONTENT: whichever literal kind carries the markdown
    // gets its /*file:*/ markers expanded; declared-input bindings strip so
    // they resolve through inputState (FileInput) after flattening.
    if (
      expr.kind === 'CallExpression' &&
      expr.callee.kind === 'IdentifierExpression' &&
      expr.callee.name.toLowerCase() === 'createmarkdown'
    ) {
      return {
        ...expr,
        arguments: expr.arguments.map((arg) => {
          if (arg.kind !== 'NamedArgument') {
            return { ...arg, value: transform(arg.value) };
          }
          const value = arg.value;
          if (arg.name.toLowerCase() !== 'content') {
            return { ...arg, value: transform(value) };
          }
          if (value.kind === 'MarkdownLiteral') {
            const stripped = stripDeclaredBindings(value, declaredInputs);
            return {
              ...arg,
              value: {
                ...stripped,
                value: expandMarkdownText(stripped.value, index, stack, issues, depth, context),
              },
            };
          }
          if (value.kind === 'StringLiteral') {
            return {
              ...arg,
              value: {
                ...value,
                value: expandMarkdownText(value.value, index, stack, issues, depth, context),
              },
            };
          }
          return { ...arg, value: transform(value) };
        }),
      };
    }
    if (expr.kind === 'MarkdownLiteral') {
      const stripped = stripDeclaredBindings(expr, declaredInputs);
      return {
        ...stripped,
        value: expandMarkdownText(stripped.value, index, stack, issues, depth, context),
      };
    }
    return mapExpressionChildren(expr, transform);
  };
  return mapStatementExpressions(statement, transform);
};

/** Structural map over the child expressions of an Expression. */
export const mapExpressionChildren = (
  expr: Expression,
  fn: (e: Expression) => Expression
): Expression => {
  switch (expr.kind) {
    case 'CallExpression':
      return {
        ...expr,
        callee: fn(expr.callee),
        arguments: expr.arguments.map((a) =>
          a.kind === 'NamedArgument' ? { ...a, value: fn(a.value) } : { ...a, value: fn(a.value) }
        ),
      };
    case 'BinaryExpression':
      return { ...expr, left: fn(expr.left), right: fn(expr.right) };
    case 'UnaryExpression':
      return { ...expr, operand: fn(expr.operand) };
    case 'MemberExpression':
      return { ...expr, object: fn(expr.object) };
    case 'IndexExpression':
      return { ...expr, object: fn(expr.object), index: fn(expr.index) };
    case 'ListExpression':
      return { ...expr, items: expr.items.map(fn) };
    case 'LambdaExpression':
      return expr.body.kind === 'BlockStatement'
        ? {
            ...expr,
            body: {
              ...expr.body,
              statements: expr.body.statements.map((s) => mapStatementExpressions(s, fn)),
            },
          }
        : { ...expr, body: fn(expr.body as Expression) };
    case 'MarkdownLiteral':
      // Children are the {var} binding expressions, not the node itself.
      return expr.variables?.length
        ? {
            ...expr,
            variables: expr.variables.map((v) => ({ ...v, expression: fn(v.expression) })),
          }
        : expr;
    default:
      return expr;
  }
};

/** Apply `fn` to every expression slot of a statement (recursing into bodies). */
export const mapStatementExpressions = (
  statement: Statement,
  fn: (e: Expression) => Expression
): Statement => {
  const mapBlock = (block: { kind: 'BlockStatement'; statements: Statement[]; span: any }) => ({
    ...block,
    statements: block.statements.map((s) => mapStatementExpressions(s, fn)),
  });
  switch (statement.kind) {
    case 'BlockStatement':
      return mapBlock(statement);
    case 'ExpressionStatement':
      return { ...statement, expression: fn(statement.expression) };
    case 'IfStatement':
      return {
        ...statement,
        branches: statement.branches.map((b) => ({
          ...b,
          condition: fn(b.condition),
          body: mapBlock(b.body),
        })),
        elseBody: statement.elseBody ? mapBlock(statement.elseBody) : undefined,
      };
    case 'ForEachStatement':
      return { ...statement, iterable: fn(statement.iterable), body: mapBlock(statement.body) };
    case 'NavButtonStatement':
      return { ...statement, label: fn(statement.label), body: mapBlock(statement.body) };
    case 'DisplayGroupStatement':
      return {
        ...statement,
        arguments: statement.arguments.map((arg) => ({ ...arg, value: fn(arg.value) })),
        body: mapBlock(statement.body),
      };
    case 'FunctionStatement': {
      const template = statement.template?.map((piece) =>
        piece.kind === 'input' && piece.defaultExpression
          ? { ...piece, defaultExpression: fn(piece.defaultExpression) }
          : piece
      );
      return { ...statement, template, body: mapBlock(statement.body) };
    }
    case 'ReturnStatement':
      return statement.value ? { ...statement, value: fn(statement.value) } : statement;
    case 'UpdateCellStatement':
      return {
        ...statement,
        players: fn(statement.players),
        dayIndex: statement.dayIndex ? fn(statement.dayIndex) : null,
        column: fn(statement.column),
        body: mapBlock(statement.body),
      };
    case 'CellOpStatement':
      return { ...statement, value: fn(statement.value) };
    case 'ForEachCellStatement':
      return { ...statement, body: mapBlock(statement.body) };
    case 'OnTagAddedStatement':
    case 'OnTagRemovedStatement':
      return { ...statement, body: mapBlock(statement.body) };
    default:
      return statement;
  }
};

/**
 * Resolve cell text to flat markdown ready for the existing pipeline.
 * Legacy (non-file-list) text passes through unchanged.
 */
export const flattenCellContent = (
  text: string,
  index: ScriptFilesIndex,
  options: { displayModules?: boolean } = {}
): { markdown: string; issues: FlattenIssue[] } => {
  const statements = options.displayModules
    ? (parseDisplayComposition(text) ?? parseFileCell(text))
    : parseFileCell(text);
  if (statements === null) return { markdown: text, issues: [] };
  if (statements.length === 0) return { markdown: '', issues: [] };
  const issues: FlattenIssue[] = [];
  const expanded = expandStatements(statements, index, [], issues, 0);
  const markdown = `/*script\n${expanded.map((s) => printStatement(s)).join('\n\n')}\nscript*/`;
  return { markdown, issues };
};

/**
 * Flatten arbitrary statements (a file body or a cell's file list) into the
 * expanded mega-script markdown: used by the editor Preview button. The
 * container's own FileInput statements are kept (they supply defaults).
 */
export const flattenStatementsToMarkdown = (
  statements: Statement[],
  index: ScriptFilesIndex,
  options: IncludeExpansionOptions = {}
): { markdown: string; issues: FlattenIssue[] } => {
  const { statements: expanded, issues } = expandScriptIncludes(statements, index, options);
  return {
    markdown: `/*script\n${expanded.map((s) => printStatement(s)).join('\n\n')}\nscript*/`,
    issues,
  };
};

/** The shared include seam for standalone runtimes, planning, and previews. */
export const expandScriptIncludes = (
  statements: Statement[],
  index: ScriptFilesIndex,
  options: IncludeExpansionOptions = {}
): { statements: Statement[]; issues: FlattenIssue[] } => {
  const issues: FlattenIssue[] = [];
  return {
    statements: expandStatements(
      statements,
      index,
      [],
      issues,
      0,
      false,
      expansionContext(options)
    ),
    issues,
  };
};

// ---------------------------------------------------------------------------
// Editor support
// ---------------------------------------------------------------------------

/**
 * All input names visible to `Inputs.entry("...")` inside a file or cell,
 * the flattened closure: the container's own FileInput declarations plus the
 * declared inputs of every transitively included file.
 */
export const collectFileInputNames = (
  statements: Statement[],
  index: ScriptFilesIndex
): string[] => {
  const names = new Set<string>();
  const visitStatements = (stmts: Statement[], stack: string[], depth: number) => {
    if (depth > MAX_FLATTEN_DEPTH) return;
    for (const stmt of stmts) {
      const decl = getFileInputParts(stmt);
      if (decl) names.add(decl.name);
      // Create*Input statements register under LABEL in the same flat
      // Inputs namespace - own file and transitively included files alike.
      const inputLabel = getInputStatementLabel(stmt);
      if (inputLabel) names.add(inputLabel);
      const call = getFileCallParts(stmt);
      if (call) {
        const file = resolveFileRef(index, call);
        if (file && !stack.includes(file.id)) {
          for (const decl2 of getFileInputs(file)) names.add(decl2.name);
          visitStatements(fileStatements(file), [...stack, file.id], depth + 1);
        }
      }
      const folder = getFolderCallParts(stmt);
      if (folder) {
        for (const file of selectFolderFiles(index, folder).files) {
          if (!stack.includes(file.id)) {
            for (const decl of getFileInputs(file)) names.add(decl.name);
            visitStatements(fileStatements(file), [...stack, file.id], depth + 1);
          }
        }
      }
      // Recurse into bodies
      if (stmt.kind === 'IfStatement') {
        stmt.branches.forEach((b) => visitStatements(b.body.statements, stack, depth));
        if (stmt.elseBody) visitStatements(stmt.elseBody.statements, stack, depth);
      } else if (
        stmt.kind === 'ForEachStatement' ||
        stmt.kind === 'FunctionStatement' ||
        stmt.kind === 'NavButtonStatement' ||
        stmt.kind === 'DisplayGroupStatement'
      ) {
        visitStatements(stmt.body.statements, stack, depth);
      } else if (stmt.kind === 'OnTagAddedStatement' || stmt.kind === 'OnTagRemovedStatement') {
        visitStatements(stmt.body.statements, stack, depth);
      } else if (stmt.kind === 'UpdateCellStatement' || stmt.kind === 'ForEachCellStatement') {
        visitStatements(stmt.body.statements, stack, depth);
      }
    }
  };
  visitStatements(statements, [], 0);
  return [...names];
};

/**
 * Statements of every transitively included file (for defined-variable /
 * function inference that should see the whole flat closure).
 */
export const collectClosureStatements = (
  statements: Statement[],
  index: ScriptFilesIndex
): Statement[] => {
  const out: Statement[] = [];
  const seen = new Set<string>();
  const visit = (stmts: Statement[], depth: number) => {
    if (depth > MAX_FLATTEN_DEPTH) return;
    for (const stmt of stmts) {
      const call = getFileCallParts(stmt);
      if (call) {
        const file = resolveFileRef(index, call);
        if (file && !seen.has(file.id)) {
          seen.add(file.id);
          visit(fileStatements(file), depth + 1);
        }
      }
      const folder = getFolderCallParts(stmt);
      if (folder) {
        for (const file of selectFolderFiles(index, folder).files) {
          if (!seen.has(file.id)) {
            seen.add(file.id);
            visit(fileStatements(file), depth + 1);
          }
        }
      }
      out.push(stmt);
    }
  };
  visit(statements, 0);
  return out;
};

/**
 * Validate a script against the files index: dangling File paths and
 * `Inputs.entry("x")` / `InputsWithData.entry("x")` keys that are neither a
 * known input label nor `!`-marked manual entries.
 */
export interface FileValidationFlag {
  message: string;
  /** The offending StringLiteral expression node, if any. */
  expression?: Expression;
  statement?: Statement;
}

export const validateFileReferences = (
  statements: Statement[],
  index: ScriptFilesIndex,
  knownInputNames: string[]
): FileValidationFlag[] => {
  const flags: FileValidationFlag[] = [];
  const known = new Set(knownInputNames.map((n) => n.toLowerCase()));

  const visitExpression = (expr: Expression, stmt: Statement) => {
    if (
      expr.kind === 'CallExpression' &&
      expr.callee.kind === 'IdentifierExpression' &&
      expr.callee.name.toLowerCase() === FILE_CALL
    ) {
      const ref = getFileCallParts({
        kind: 'ExpressionStatement',
        expression: expr,
        span: expr.span,
      });
      if (ref && !resolveFileRef(index, ref)) {
        flags.push({
          message: `Missing file: ${ref.path || ref.id}`,
          expression: expr,
          statement: stmt,
        });
      } else if (ref && ref.overrides.size > 0) {
        /* Overrides must exist in the callee's input contract - when a file
         *  drops or renames an input, every call site passing it goes stale.
         *  An undefined contract (missing/unparseable file) reports nothing
         *  here; the missing-file flag above covers that case. */
        const names = declaredInputNames(index, ref);
        if (names) {
          for (const name of ref.overrides.keys()) {
            if (!names.has(name)) {
              flags.push({
                message: `"${name}" is not a declared input of ${ref.path || ref.id}`,
                expression: expr,
                statement: stmt,
              });
            }
          }
        }
      }
    }
    // Inputs.entry("x") / InputsWithData.entry("x")
    if (
      expr.kind === 'CallExpression' &&
      expr.callee.kind === 'MemberExpression' &&
      expr.callee.object.kind === 'IdentifierExpression' &&
      ['inputs', 'inputswithdata'].includes(expr.callee.object.name.toLowerCase()) &&
      expr.callee.property.toLowerCase() === 'entry'
    ) {
      const keyArg = expr.arguments[0];
      const lit = keyArg?.kind === 'PositionalArgument' ? keyArg.value : keyArg?.value;
      if (lit?.kind === 'StringLiteral') {
        const raw = lit.value;
        if (!raw.startsWith(MANUAL_ENTRY_PREFIX) && !known.has(raw.toLowerCase())) {
          flags.push({
            message: `Unknown input "${raw}"`,
            expression: lit,
            statement: stmt,
          });
        }
      }
    }
    // also handle chain form: Inputs.entry(...) parses as MemberExpression callee? cover CallExpression callee Identifier 'entry' with object chain
    mapExpressionChildren(expr, (child) => {
      visitExpression(child, stmt);
      return child;
    });
  };

  const visit = (stmt: Statement) => {
    mapStatementExpressions(stmt, (e) => {
      visitExpression(e, stmt);
      return e;
    });
  };

  for (const stmt of statements) visit(stmt);
  return flags;
};

/** Short friendly summary for table cells that store file lists. */
export const cellPreviewText = (text: string, index: ScriptFilesIndex): string => {
  const statements = parseFileCell(text);
  if (statements === null) {
    const trimmed = text.trim();
    return trimmed.length > 30 ? `${trimmed.slice(0, 30)}...` : trimmed;
  }
  if (statements.length === 0) return '';
  const names = statements
    .map(getFileCallParts)
    .filter((p): p is FileCallParts => p !== null)
    .map((p) => fileName(resolveFileRef(index, p)?.path ?? p.path));
  if (names.length === 0) return '';
  const joined = names.join(', ');
  return joined.length > 30 ? `${joined.slice(0, 30)}...` : joined;
};

// ---------------------------------------------------------------------------
// Doc mutation helpers (pure, the hook applies them)
// ---------------------------------------------------------------------------

export const makeFileId = (): string =>
  `f_${nowMs().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const createMarkdownFileSource = (content = 'Markdown text'): string =>
  `CreateMarkdown({\n  CONTENT = Markdown(\`${content.replace(/\\/g, '\\\\').replace(/`/g, '\\`')}\`),\n});`;

export const docWithFile = (doc: ScriptFilesDoc, file: ScriptFile): ScriptFilesDoc => ({
  ...doc,
  files: { ...doc.files, [file.id]: file },
});

export const docWithoutFile = (doc: ScriptFilesDoc, id: string): ScriptFilesDoc => {
  const files = { ...doc.files };
  delete files[id];
  return { ...doc, files };
};

export const docWithFolder = (doc: ScriptFilesDoc, folder: string): ScriptFilesDoc => {
  const normalized = normalizeFilePath(folder);
  if (!normalized) return doc;
  const folders = new Map(
    doc.folders.map((path) => [normalizeFilePath(path).toLowerCase(), normalizeFilePath(path)])
  );
  // persist parents too
  let f = normalized;
  while (f) {
    if (!folders.has(f.toLowerCase())) folders.set(f.toLowerCase(), f);
    f = folderOfPath(f);
  }
  const next = { ...doc, folders: [...folders.values()] };
  return adoptFolderIdentities(next, buildFilesIndex(next).folders);
};

export const docWithoutFolder = (doc: ScriptFilesDoc, folder: string): ScriptFilesDoc => {
  const normalized = normalizeFilePath(folder).toLowerCase();
  // Pinned roots are structural - refuse at the doc level too so direct-doc
  // writers (migrations, importers) can't drop them or their contents.
  if (isProtectedFolder(normalized)) return doc;
  const keep = (f: string) => {
    const n = normalizeFilePath(f).toLowerCase();
    return n !== normalized && !n.startsWith(`${normalized}/`);
  };
  return {
    ...doc,
    folders: doc.folders.filter(keep),
    ...(doc.folderIds ? { folderIds: withoutFolderIdentities(doc, folder) } : {}),
    files: Object.fromEntries(
      Object.entries(doc.files).filter(([, file]) => {
        const dir = folderOfPath(file.path).toLowerCase();
        return dir !== normalized && !dir.startsWith(`${normalized}/`);
      })
    ),
  };
};

/**
 * Rewrite every `File(PATH = "...")` reference across all file sources when a
 * file or folder is renamed/moved. Returns the updated doc and whether any
 * source changed.
 */
export const rewritePathReferences = (
  doc: ScriptFilesDoc,
  oldPath: string,
  newPath: string
): ScriptFilesDoc => {
  const oldNorm = normalizeFilePath(oldPath).toLowerCase();
  const prefix = `${oldNorm}/`;
  const rewrite = (path: string): string => {
    const norm = normalizeFilePath(path).toLowerCase();
    if (norm === oldNorm) return normalizeFilePath(newPath);
    if (norm.startsWith(prefix)) {
      return `${normalizeFilePath(newPath)}/${normalizeFilePath(path).slice(oldNorm.length + 1)}`;
    }
    return path;
  };

  const files: Record<string, ScriptFile> = {};
  for (const [id, file] of Object.entries(doc.files)) {
    let source = file.source;
    try {
      const script = parseScript(source);
      let touched = false;
      const rewriteStatements = (stmts: Statement[]): Statement[] =>
        stmts.map((stmt) => {
          const parts = getFileCallParts(stmt) ?? getFolderCallParts(stmt);
          if (parts) {
            const next = rewrite(parts.path ?? '');
            if (next !== parts.path) {
              touched = true;
              const call = callOf(stmt);
              return {
                ...stmt,
                expression: {
                  ...call,
                  arguments: call.arguments.map((a) =>
                    a.kind === 'NamedArgument' && a.name.toLowerCase() === 'path'
                      ? { ...a, value: strLit(next) }
                      : a
                  ),
                },
              } as Statement;
            }
          }
          // Recurse into nested bodies so File calls inside If/ForEach get
          // rewritten too.
          const mapBodies = (s: Statement): Statement => {
            const mapBlock = (b: BlockStatement): BlockStatement => ({
              ...b,
              statements: rewriteStatements(b.statements),
            });
            switch (s.kind) {
              case 'IfStatement':
                return {
                  ...s,
                  branches: s.branches.map((b) => ({ ...b, body: mapBlock(b.body) })),
                  elseBody: s.elseBody ? mapBlock(s.elseBody) : undefined,
                };
              case 'ForEachStatement':
              case 'NavButtonStatement':
              case 'DisplayGroupStatement':
              case 'FunctionStatement':
              case 'OnTagAddedStatement':
              case 'OnTagRemovedStatement':
                return { ...s, body: mapBlock(s.body) } as Statement;
              case 'UpdateCellStatement':
              case 'ForEachCellStatement':
                return { ...s, body: mapBlock(s.body) } as Statement;
              default:
                return s;
            }
          };
          return mapBodies(stmt);
        });
      const nextStatements = rewriteStatements(script.statements);
      if (touched) {
        source = nextStatements.map((s) => printStatement(s)).join('\n\n');
      }
    } catch {
      // leave unparseable sources alone
    }
    // Also rewrite /*file:*/ markers inside sources
    FILE_MARKER_PATTERN.lastIndex = 0;
    const markerRewritten = source.replace(FILE_MARKER_PATTERN, (marker, json: string) => {
      const ref = parseFileMarker(json);
      if (!ref) return marker;
      const next = rewrite(ref.path);
      if (next === ref.path) return marker;
      return encodeFileMarker({ id: ref.id, path: next }, ref.inputs);
    });
    files[id] = { ...file, source: markerRewritten };
  }
  return { ...doc, files };
};

// ---------------------------------------------------------------------------
// Inputs.entry helpers shared by editor + interpreter
// ---------------------------------------------------------------------------

/** Strip the manual-entry marker: `entry("!custom")` reads input "custom". */
export const stripManualMarker = (name: string): string =>
  name.startsWith(MANUAL_ENTRY_PREFIX) ? name.slice(1) : name;

export const isManualEntry = (name: string): boolean => name.startsWith(MANUAL_ENTRY_PREFIX);

// ---------------------------------------------------------------------------
// File placements: where each file is referenced (cells + other files)
// ---------------------------------------------------------------------------

export type PlacementCellKind =
  | 'roleMessage'
  | 'voteMessage'
  | 'morningMessage'
  | 'voteDefault'
  | 'tableCell'
  | 'aboutRole'
  | 'ruleBook';

export interface FilePlacement {
  /** 'cell': a real game cell calls it; 'file': another file calls it. */
  kind: 'cell' | 'file';
  /** Which programmable cell (kind === 'cell' only). */
  cellKind?: PlacementCellKind;
  /** The cell's row: role name or player name (kind === 'cell'). */
  owner?: string;
  /** Stable identity for "go to cell" highlighting, role name for role
   *  cells, lowercase email for morning cells, formatCellAddress for
   *  table cells (kind === 'cell'). */
  targetKey?: string;
  /** Day-cell placements: the 1-based day index. */
  day?: number;
  /** tableCell only: the column title. */
  column?: string;
  /** Referencing file's id (kind === 'file' only). */
  fileId?: string;
  /** Fallback display label ("Role message · Werewolf" or caller path). */
  label: string;
}

export interface FilePlacements {
  /** fileId → its direct placements. */
  byFile: Map<string, FilePlacement[]>;
  /** fileIds reachable (transitively) from at least one real cell. */
  reachable: Set<string>;
  /** fileIds reachable (transitively) from at least one tag file via
   *  `File(...)` calls - the usage chain for trigger scripts. */
  tagReachable: Set<string>;
  /** fileIds with no reference chain back to their consumer: a real cell
   *  for display/markdown files and tag files, a tag file for trigger
   *  scripts. */
  orphans: Set<string>;
}

/** `File(...)` calls nested inside an expression - cell ops carry them in
 *  `Add File(...)` / `Replace File(...)` values, and expression statements
 *  can wrap them in call args. `visitTag` receives literal `tag("name")`
 *  calls the same way - `Add tag(...)` ops and `contains(tag(...))`
 *  conditions both reference the tag file by name. */
const visitFileCallsInExpression = (
  expr: Expression,
  visit: (parts: FileCallParts) => void,
  depth: number,
  index?: ScriptFilesIndex,
  role: ScriptFileRole = 'display',
  visitTag?: (name: string) => void
): void => {
  if (depth > MAX_FLATTEN_DEPTH) return;
  switch (expr.kind) {
    case 'CallExpression':
      if (
        expr.callee.kind === 'IdentifierExpression' &&
        expr.callee.name.toLowerCase() === FILE_CALL
      ) {
        const parts = fileCallPartsFromCall(expr);
        if (parts) visit(parts);
      }
      if (
        visitTag &&
        expr.callee.kind === 'IdentifierExpression' &&
        expr.callee.name.toLowerCase() === 'tag'
      ) {
        const first = expr.arguments[0]?.value;
        if (first?.kind === 'StringLiteral') visitTag(first.value);
      }
      expr.arguments.forEach((a) =>
        visitFileCallsInExpression(a.value, visit, depth + 1, index, role, visitTag)
      );
      return;
    case 'ListExpression':
      expr.items.forEach((item) =>
        visitFileCallsInExpression(item, visit, depth + 1, index, role, visitTag)
      );
      return;
    case 'UnaryExpression':
      visitFileCallsInExpression(expr.operand, visit, depth + 1, index, role, visitTag);
      return;
    case 'BinaryExpression':
      visitFileCallsInExpression(expr.left, visit, depth + 1, index, role, visitTag);
      visitFileCallsInExpression(expr.right, visit, depth + 1, index, role, visitTag);
      return;
    case 'MemberExpression':
      visitFileCallsInExpression(expr.object, visit, depth + 1, index, role, visitTag);
      return;
    case 'IndexExpression':
      visitFileCallsInExpression(expr.object, visit, depth + 1, index, role, visitTag);
      visitFileCallsInExpression(expr.index, visit, depth + 1, index, role, visitTag);
      return;
    case 'LambdaExpression':
      if (expr.body.kind === 'BlockStatement') {
        walkFileCalls(expr.body.statements, visit, depth + 1, index, role, visitTag);
      } else {
        visitFileCallsInExpression(expr.body, visit, depth + 1, index, role, visitTag);
      }
      return;
    default:
      return;
  }
};

/** Visit every `File(...)` call in a statement tree, bodies included.
 *  `visitTag` additionally receives names of literal `tag("...")` calls. */
const walkFileCalls = (
  statements: Statement[],
  visit: (parts: FileCallParts) => void,
  depth = 0,
  index?: ScriptFilesIndex,
  role: ScriptFileRole = 'display',
  visitTag?: (name: string) => void
): void => {
  if (depth > MAX_FLATTEN_DEPTH) return;
  const visitExpr = (expr: Expression) =>
    visitFileCallsInExpression(expr, visit, depth + 1, index, role, visitTag);
  for (const stmt of statements) {
    const parts = getFileCallParts(stmt);
    if (parts) visit(parts);
    /* File()/tag() in expression positions: `Add File(...)` / `Add tag(...)`
     * cell ops, nested call args in expression statements, function returns. */
    if (stmt.kind === 'CellOpStatement') {
      visitExpr(stmt.value);
    } else if (stmt.kind === 'ExpressionStatement') {
      visitExpr(stmt.expression);
    } else if (stmt.kind === 'ReturnStatement' && stmt.value) {
      visitExpr(stmt.value);
    }
    const folder = getFolderCallParts(stmt);
    if (folder && index) {
      for (const file of selectFolderFiles(index, folder, role).files) {
        visit({ id: file.id, path: file.path, overrides: new Map() });
      }
    }
    if (stmt.kind === 'IfStatement') {
      stmt.branches.forEach((b) => {
        visitExpr(b.condition);
        walkFileCalls(b.body.statements, visit, depth + 1, index, role, visitTag);
      });
      if (stmt.elseBody)
        walkFileCalls(stmt.elseBody.statements, visit, depth + 1, index, role, visitTag);
    } else if (stmt.kind === 'UpdateCellStatement' || stmt.kind === 'ForEachCellStatement') {
      if (stmt.kind === 'UpdateCellStatement') {
        visitExpr(stmt.players);
        visitExpr(stmt.column);
        if (stmt.dayIndex) visitExpr(stmt.dayIndex);
      }
      walkFileCalls(stmt.body.statements, visit, depth + 1, index, role, visitTag);
    } else if (
      stmt.kind === 'ForEachStatement' ||
      stmt.kind === 'NavButtonStatement' ||
      stmt.kind === 'DisplayGroupStatement' ||
      stmt.kind === 'FunctionStatement' ||
      stmt.kind === 'OnTagAddedStatement' ||
      stmt.kind === 'OnTagRemovedStatement'
    ) {
      if (stmt.kind === 'ForEachStatement') visitExpr(stmt.iterable);
      else if (stmt.kind === 'NavButtonStatement') visitExpr(stmt.label);
      else if (stmt.kind === 'DisplayGroupStatement') {
        stmt.arguments.forEach((a) => visitExpr(a.value));
      }
      walkFileCalls(stmt.body.statements, visit, depth + 1, index, role, visitTag);
    }
  }
};

interface TextFileRef {
  id?: string;
  path: string;
}

/** Bodies of `/*script ... script*\/` islands inside markdown text. */
const extractScriptIslands = (markdown: string): string[] => {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: string[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index].trim();
    if (line.toLowerCase().startsWith('/*script')) {
      const scriptLines: string[] = [];
      let scriptLine = lines[index].trimEnd();
      scriptLine = scriptLine.slice(scriptLine.toLowerCase().indexOf('/*script') + 8);
      while (!scriptLine.toLowerCase().includes('script*/') && index + 1 < lines.length) {
        if (scriptLine.length > 0) scriptLines.push(scriptLine);
        index += 1;
        scriptLine = lines[index].trimEnd();
      }
      const closingIndex = scriptLine.toLowerCase().indexOf('script*/');
      const finalLine = closingIndex >= 0 ? scriptLine.slice(0, closingIndex) : scriptLine;
      if (finalLine.length > 0) scriptLines.push(finalLine);
      const body = scriptLines.join('\n').trim();
      if (body) blocks.push(body);
    }
    index += 1;
  }
  return blocks;
};

/**
 * Every file reference in arbitrary cell/markdown text: `File(...)`
 * statements in file-list cells, `/*file:*\/` markers and `File(...)` calls
 * inside `/*script*\/` islands in legacy markdown.
 */
export const collectTextFileRefs = (
  text: string,
  index?: ScriptFilesIndex,
  role: ScriptFileRole = 'display'
): TextFileRef[] => {
  const refs: TextFileRef[] = [];
  const trimmed = (text ?? '').trim();
  if (!trimmed) return refs;
  let cellStatements = parseFileCell(trimmed) ?? parseDisplayComposition(trimmed);
  if (
    cellStatements === null &&
    /^(?:NavButton|Folder|CreateMarkdown|CreateDivider)\s*\(/i.test(trimmed)
  ) {
    const parsed = parseScript(trimmed);
    if (!parsed.diagnostics.length) cellStatements = parsed.statements;
  }
  if (cellStatements !== null) {
    walkFileCalls(cellStatements, (p) => refs.push({ id: p.id, path: p.path }), 0, index, role);
    return refs;
  }
  FILE_MARKER_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = FILE_MARKER_PATTERN.exec(trimmed)) !== null) {
    const marker = parseFileMarker(match[1]);
    if (marker) refs.push({ id: marker.id, path: marker.path });
  }
  // File() calls inside /*script*/ islands; the substring gate keeps the
  // common "no file calls at all" case parser-free.
  if (/(?:File|Folder)\s*\(/i.test(trimmed)) {
    for (const body of extractScriptIslands(trimmed)) {
      if (!/(?:File|Folder)\s*\(/i.test(body)) continue;
      try {
        walkFileCalls(
          parseScript(body).statements,
          (p) => refs.push({ id: p.id, path: p.path }),
          0,
          index,
          role
        );
      } catch {
        // Unparseable island: not a reference source.
      }
    }
  }
  return refs;
};

/**
 * Tag names referenced by literal `tag("name")` calls in cell/markdown text:
 * cell ops (`Add tag(...)`) and expressions inside parsed compositions and
 * `/*script*\/` islands. Dynamic names can't be resolved and are skipped.
 */
export const collectTextTagRefs = (
  text: string,
  index?: ScriptFilesIndex,
  role: ScriptFileRole = 'display'
): string[] => {
  const names: string[] = [];
  const trimmed = (text ?? '').trim();
  if (!trimmed || !/\btag\s*\(/i.test(trimmed)) return names;
  const collect = (statements: Statement[]) =>
    walkFileCalls(
      statements,
      () => {},
      0,
      index,
      role,
      (name) => names.push(name)
    );
  let cellStatements = parseFileCell(trimmed) ?? parseDisplayComposition(trimmed);
  if (
    cellStatements === null &&
    /^(?:NavButton|Folder|CreateMarkdown|CreateDivider)\s*\(/i.test(trimmed)
  ) {
    const parsed = parseScript(trimmed);
    if (!parsed.diagnostics.length) cellStatements = parsed.statements;
  }
  if (cellStatements !== null) {
    collect(cellStatements);
    return names;
  }
  for (const body of extractScriptIslands(trimmed)) {
    if (!/\btag\s*\(/i.test(body)) continue;
    try {
      collect(parseScript(body).statements);
    } catch {
      // Unparseable island: not a reference source.
    }
  }
  return names;
};

const TAG_PIECE_TOKEN_RE = /\[\/TAG\s+[^\]]*?\/\]/g;
const TAG_PIECE_ATTR_RE = /([a-zA-Z]+)="([^"]*)"/g;
const LEGACY_TAG_TOKEN_RE = /\[\/TAG:\s*"([^"]*)"/g;
const REM_PIECE_TOKEN_RE = /\[\/REM\s+[^\]]*?\/\]/g;

/** Tag references in raw cell text: `[/TAG id="f" name="n"/]` pieces and
 *  legacy `[/TAG: "n"/]` tokens. Local scan (not cellPieces) to avoid a
 *  circular import - cellPieces already depends on this module.
 *  `[/REM ... match="..."/]` tombstones are honored the same way
 *  `pieceMasked`/`effectiveCell` honor them: a tag piece masked by a later
 *  tag/tagid/src REM is not a live placement, and a `tag:` REM strips the
 *  matching legacy base token. */
const collectCellTagRefs = (raw: string): { tagId?: string; name?: string }[] => {
  const attrsOf = (token: string): Record<string, string> => {
    const attrs: Record<string, string> = {};
    TAG_PIECE_ATTR_RE.lastIndex = 0;
    let a: RegExpExecArray | null;
    while ((a = TAG_PIECE_ATTR_RE.exec(token)) !== null) {
      attrs[a[1].toLowerCase()] = a[2];
    }
    return attrs;
  };
  const rems: { pos: number; name?: string; tagId?: string; src?: string }[] = [];
  REM_PIECE_TOKEN_RE.lastIndex = 0;
  let rm: RegExpExecArray | null;
  while ((rm = REM_PIECE_TOKEN_RE.exec(raw)) !== null) {
    const match = attrsOf(rm[0]).match;
    const sep = match?.indexOf(':') ?? -1;
    if (!match || sep < 0) continue;
    const value = match.slice(sep + 1);
    switch (match.slice(0, sep).toLowerCase()) {
      case 'tag':
        rems.push({ pos: rm.index, name: value.toLowerCase() });
        break;
      case 'tagid':
        rems.push({ pos: rm.index, tagId: value });
        break;
      case 'src':
        rems.push({ pos: rm.index, src: value });
        break;
    }
  }
  const pieceMasked = (pos: number, tagId?: string, name?: string, src?: string): boolean =>
    rems.some(
      (r) =>
        r.pos > pos &&
        ((r.name !== undefined && r.name === name?.toLowerCase()) ||
          (r.tagId !== undefined && r.tagId === tagId) ||
          (r.src !== undefined && r.src === src))
    );

  const refs: { tagId?: string; name?: string }[] = [];
  TAG_PIECE_TOKEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TAG_PIECE_TOKEN_RE.exec(raw)) !== null) {
    const attrs = attrsOf(m[0]);
    if ((attrs.id || attrs.name) && !pieceMasked(m.index, attrs.id, attrs.name, attrs.src))
      refs.push({ tagId: attrs.id || undefined, name: attrs.name });
  }
  LEGACY_TAG_TOKEN_RE.lastIndex = 0;
  while ((m = LEGACY_TAG_TOKEN_RE.exec(raw)) !== null) {
    // effectiveCell strips a base token matched by any later tag REM.
    const pos = m.index;
    const token = m[1].toLowerCase();
    if (!rems.some((r) => r.pos > pos && r.name === token)) refs.push({ name: m[1] });
  }
  return refs;
};

/**
 * Build the file-usage graph for a game. `cells` are the real placements,
 * every programmable cell's raw text (role/vote/morning/default-vote).
 * Returns each file's direct placements plus reachability: files whose
 * reference chain never bottoms out at their consumer are `orphans` -
 * display/markdown files and tag files are consumed by cells, trigger
 * scripts are consumed by tag files.
 *
 * Cost: each cell text is parsed once (parseFileCell is itself cached) and
 * each file's source once (fileStatements is cached per updatedAt); the
 * graph walk is O(refs) over Maps. No backend reads at all.
 */
export const buildFilePlacements = (
  index: ScriptFilesIndex,
  cells: {
    label: string;
    text: string;
    cellKind?: PlacementCellKind;
    owner?: string;
    targetKey?: string;
    day?: number;
    column?: string;
    /** File refs that raw-text scanning can't see - visible `kind="file"` /
     *  `kind="display"` pieces and text folded through SET/REM markers. */
    extraRefs?: TextFileRef[];
  }[]
): FilePlacements => {
  const byFile = new Map<string, FilePlacement[]>();
  // referrer fileId → referenced fileIds (for reachability).
  const forward = new Map<string, Set<string>>();
  const seen = new Set<string>();

  const record = (ref: TextFileRef, placement: FilePlacement, referrerId?: string): void => {
    const file = resolveFileRef(index, ref);
    if (!file) return; // dangling refs surface as "missing" on the card
    const seenKey = `${file.id}|${placement.kind}|${placement.fileId ?? ''}|${placement.label}`;
    if (!seen.has(seenKey)) {
      seen.add(seenKey);
      const list = byFile.get(file.id);
      if (list) list.push(placement);
      else byFile.set(file.id, [placement]);
    }
    if (referrerId) {
      const edges = forward.get(referrerId);
      if (edges) edges.add(file.id);
      else forward.set(referrerId, new Set([file.id]));
    }
  };

  for (const cell of cells) {
    const cellPlacement: FilePlacement = {
      kind: 'cell',
      cellKind: cell.cellKind,
      owner: cell.owner,
      targetKey: cell.targetKey,
      day: cell.day,
      column: cell.column,
      label: cell.label,
    };
    for (const ref of collectTextFileRefs(cell.text, index)) {
      record(ref, cellPlacement);
    }
    for (const ref of cell.extraRefs ?? []) {
      record(ref, cellPlacement);
    }
    // Tag pieces + inline tag tokens count as placements of the tag file.
    if (cell.text.includes('[/TAG')) {
      for (const ref of collectCellTagRefs(cell.text)) {
        const tagFile = ref.tagId
          ? index.byId.get(ref.tagId)
          : findTagFile(index, { name: ref.name });
        if (tagFile) record({ id: tagFile.id, path: tagFile.path }, cellPlacement);
      }
    }
    // Literal tag("name") calls in cell scripts too - `Add tag(...)` ops
    // place the tag (firing its trigger) when the cell script runs.
    for (const name of collectTextTagRefs(cell.text, index)) {
      const tagFile = findTagFile(index, { name });
      if (tagFile) record({ id: tagFile.id, path: tagFile.path }, cellPlacement);
    }
  }
  for (const file of index.byId.values()) {
    const filePlacement: FilePlacement = { kind: 'file', fileId: file.id, label: file.path };
    walkFileCalls(
      fileStatements(file),
      (p) => record({ id: p.id, path: p.path }, filePlacement, file.id),
      0,
      index,
      isTriggerFile(file) ? 'trigger' : 'display',
      (name) => {
        const tagFile = findTagFile(index, { name });
        if (tagFile) record({ id: tagFile.id, path: tagFile.path }, filePlacement, file.id);
      }
    );
    // /*file:*/ markers inside CreateMarkdown literals (markdown files) and
    // File()/tag() calls in nested /*script*/ islands aren't statements, so
    // the text-level scan has to cover them. Overlap with walkFileCalls
    // dedupes.
    for (const ref of collectTextFileRefs(
      file.source,
      index,
      isTriggerFile(file) ? 'trigger' : 'display'
    )) {
      record(ref, filePlacement, file.id);
    }
    for (const name of collectTextTagRefs(
      file.source,
      index,
      isTriggerFile(file) ? 'trigger' : 'display'
    )) {
      const tagFile = findTagFile(index, { name });
      if (tagFile) record({ id: tagFile.id, path: tagFile.path }, filePlacement, file.id);
    }
  }

  // BFS out from every file a real cell touches directly.
  const reachable = new Set<string>();
  const queue: string[] = [];
  for (const [fileId, placements] of byFile) {
    if (placements.some((p) => p.kind === 'cell')) {
      reachable.add(fileId);
      queue.push(fileId);
    }
  }
  while (queue.length > 0) {
    const id = queue.pop()!;
    for (const next of forward.get(id) ?? []) {
      if (!reachable.has(next)) {
        reachable.add(next);
        queue.push(next);
      }
    }
  }
  // Trigger scripts are consumed by tag triggers, not cells - their usage
  // chain is BFS out from every tag file instead.
  const tagReachable = new Set<string>();
  const tagQueue: string[] = [];
  for (const file of index.byId.values()) {
    if (isTagFile(file)) {
      tagReachable.add(file.id);
      tagQueue.push(file.id);
    }
  }
  while (tagQueue.length > 0) {
    const id = tagQueue.pop()!;
    for (const next of forward.get(id) ?? []) {
      if (!tagReachable.has(next)) {
        tagReachable.add(next);
        tagQueue.push(next);
      }
    }
  }
  const orphans = new Set<string>();
  for (const file of index.byId.values()) {
    const used =
      file.role === 'trigger' && !isTagFile(file)
        ? tagReachable.has(file.id)
        : reachable.has(file.id);
    if (!used) orphans.add(file.id);
  }
  return { byFile, reachable, tagReachable, orphans };
};

// ---------------------------------------------------------------------------
// Tag files
// ---------------------------------------------------------------------------

export interface TagMeta {
  name: string;
  color: string;
}

/** True when `file` lives inside the pinned `tags/` folder. */
export const isTagFile = (file: ScriptFile): boolean =>
  file.path.toLowerCase().startsWith(`${TAGS_FOLDER}/`);

/** True when a file runs in trigger context: tag files always do; other
 *  script files opt in via `role`. */
export const isTriggerFile = (file: ScriptFile): boolean =>
  file.role === 'trigger' || isTagFile(file);

/** Tag meta from the leading `Tag({NAME, COLOR})` statement, if present. */
export const getTagMeta = (file: ScriptFile): TagMeta | null => {
  const first = fileStatements(file)[0];
  if (first?.kind !== 'TagStatement') return null;
  return { name: first.name, color: first.color };
};

/** Display name of a tag file: meta NAME, else the file name. */
export const tagFileName = (file: ScriptFile): string =>
  getTagMeta(file)?.name || fileName(file.path);

/** Source text for a new tag file: meta header + optional trigger body. */
export const createTagFileSource = (name: string, color: string, body = ''): string =>
  `Tag({NAME = ${JSON.stringify(name)}, COLOR = ${JSON.stringify(color)}})${
    body.trim() ? `\n\n${body.trim()}` : ''
  }`;

/** Trigger script text of a tag file: everything after the Tag meta. */
export const tagFileTriggerSource = (file: ScriptFile): string => {
  const stmts = fileStatements(file);
  const body = stmts[0]?.kind === 'TagStatement' ? stmts.slice(1) : stmts;
  return body.map((s) => printStatement(s)).join('\n\n');
};

/** Only the OnTagRemoved blocks of a tag file body. On 'removed', tracked
 *  ops are reverted by the system - the bare body (the on-tag script) must
 *  NOT re-run, so only explicit removed-blocks execute. */
export const tagFileRemovedSource = (file: ScriptFile): string => {
  const stmts = fileStatements(file);
  const body = stmts[0]?.kind === 'TagStatement' ? stmts.slice(1) : stmts;
  return body
    .filter((s) => s.kind === 'OnTagRemovedStatement')
    .map((s) => printStatement(s))
    .join('\n\n');
};

/** Rewrite a tag file's source with new meta, preserving the trigger body. */
export const tagFileSourceWithMeta = (file: ScriptFile, meta: TagMeta): string =>
  createTagFileSource(meta.name, meta.color, tagFileTriggerSource(file));

/** Find a tag file by stable id, else by tag name inside `tags/`. */
export const findTagFile = (
  index: ScriptFilesIndex,
  ref: { tagId?: string; name?: string }
): ScriptFile | undefined => {
  if (ref.tagId) {
    const file = index.byId.get(ref.tagId);
    if (file) return file;
  }
  if (ref.name) {
    const lower = ref.name.toLowerCase();
    const pathHit = index.byPath.get(`${TAGS_FOLDER}/${ref.name}`.toLowerCase());
    if (pathHit) return pathHit;
    for (const file of index.byId.values()) {
      if (!isTagFile(file)) continue;
      if (tagFileName(file).toLowerCase() === lower) return file;
    }
  }
  return undefined;
};

/** TagLookup for applyCellOps: tag name → {id, displayName} or undefined. */
export const tagLookupFromIndex =
  (index: ScriptFilesIndex) =>
  (name: string): { id: string; name: string } | undefined => {
    const file = findTagFile(index, { name });
    if (!file) return undefined;
    return { id: file.id, name: tagFileName(file) };
  };
