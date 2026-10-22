import { emptySpan, type Expression, type NamedArgument, type Statement } from '../script/lang/ast';
import {
  folderOfPath,
  isTriggerFile,
  normalizeFilePath,
  type ScriptFile,
  type ScriptFileRole,
  type ScriptFilesIndex,
} from './scriptFiles';

export interface FolderRef {
  id?: string;
  path?: string;
}

export interface FolderDisplayOptions {
  order?: string[];
  hidden?: string[];
  recursive?: boolean;
  dividers?: boolean;
  align?: 'left' | 'center' | 'justify';
  imageHeight?: number;
}

export interface FolderCallParts extends FolderRef, FolderDisplayOptions {
  issues: string[];
}

export const isFolderCallStatement = (statement: Statement): boolean =>
  statement.kind === 'ExpressionStatement' &&
  statement.expression.kind === 'CallExpression' &&
  statement.expression.callee.kind === 'IdentifierExpression' &&
  statement.expression.callee.name.toLowerCase() === 'folder';

/** Folder settings are literal metadata, not expressions evaluated in a player scope. */
export const getFolderCallParts = (statement: Statement): FolderCallParts | null => {
  if (!isFolderCallStatement(statement) || statement.kind !== 'ExpressionStatement') return null;
  if (statement.expression.kind !== 'CallExpression') return null;
  const result: FolderCallParts = { issues: [] };
  const seen = new Set<string>();
  for (const arg of statement.expression.arguments) {
    if (arg.kind !== 'NamedArgument') {
      result.issues.push('Folder requires named arguments');
      continue;
    }
    const name = arg.name.toLowerCase();
    if (seen.has(name)) result.issues.push(`Duplicate Folder option: ${arg.name}`);
    seen.add(name);
    const value = arg.value;
    const invalid = () => result.issues.push(`Invalid Folder option: ${arg.name}`);
    if (name === 'id' || name === 'path') {
      if (value.kind === 'StringLiteral' && value.value.trim()) result[name] = value.value;
      else invalid();
    } else if (name === 'order' || name === 'hidden') {
      if (value.kind === 'ListExpression' && value.items.every((item) => item.kind === 'StringLiteral')) {
        result[name] = [...new Set(value.items.map((item) => (item as { value: string }).value))];
      } else invalid();
    } else if (name === 'recursive' || name === 'dividers') {
      if (value.kind === 'BooleanLiteral') result[name] = value.value;
      else invalid();
    } else if (name === 'align') {
      if (
        value.kind === 'StringLiteral' &&
        (value.value === 'left' || value.value === 'center' || value.value === 'justify')
      ) result.align = value.value;
      else invalid();
    } else if (name === 'imageheight') {
      if (value.kind === 'NumberLiteral' && Number.isFinite(value.value) && value.value > 0 && value.value <= 100) {
        result.imageHeight = value.value;
      } else invalid();
    } else {
      result.issues.push(`Unknown Folder option: ${arg.name}`);
    }
  }
  if (!result.id && !result.path) result.issues.push('Folder requires ID or PATH');
  return result;
};

export const makeFolderStatement = (
  ref: FolderRef,
  options: FolderDisplayOptions = {}
): Statement => {
  const span = emptySpan();
  const args: NamedArgument[] = [];
  const add = (name: string, value: Expression) =>
    args.push({ kind: 'NamedArgument', name, value, span });
  const string = (value: string): Expression => ({ kind: 'StringLiteral', value, span });
  if (ref.path) add('PATH', string(ref.path));
  if (ref.id) add('ID', string(ref.id));
  for (const key of ['order', 'hidden'] as const) {
    if (options[key]?.length) {
      add(key.toUpperCase(), { kind: 'ListExpression', items: options[key].map(string), span });
    }
  }
  if (options.recursive === false) add('RECURSIVE', { kind: 'BooleanLiteral', value: false, span });
  if (options.dividers) add('DIVIDERS', { kind: 'BooleanLiteral', value: true, span });
  if (options.align) add('ALIGN', string(options.align));
  if (options.imageHeight !== undefined) {
    add('IMAGEHEIGHT', { kind: 'NumberLiteral', value: options.imageHeight, span });
  }
  return {
    kind: 'ExpressionStatement',
    expression: {
      kind: 'CallExpression',
      callee: { kind: 'IdentifierExpression', name: 'Folder', span },
      arguments: args,
      span,
    },
    span,
  };
};

/** An ID-backed missing folder never rebinds to a replacement at the old path. */
export const resolveFolderRef = (index: ScriptFilesIndex, ref: FolderRef): string | undefined =>
  ref.id !== undefined
    ? index.folderIdentities.byId.get(ref.id)
    : index.folders.find(
        (folder) => folder.toLowerCase() === normalizeFilePath(ref.path ?? '').toLowerCase()
      );

export const selectFolderFiles = (
  index: ScriptFilesIndex,
  parts: FolderCallParts,
  role: ScriptFileRole = 'display'
): { path?: string; files: ScriptFile[]; excluded: ScriptFile[]; issues: string[] } => {
  const path = resolveFolderRef(index, parts);
  const issues = [...parts.issues];
  if (!path) issues.push(`Missing folder: ${parts.path ?? parts.id ?? ''}`);
  if (!path || issues.length) return { path, files: [], excluded: [], issues };
  const lower = path.toLowerCase();
  const members = [...index.byId.values()].filter((file) => {
    const parent = folderOfPath(file.path).toLowerCase();
    return parent === lower || (parts.recursive !== false && parent.startsWith(`${lower}/`));
  });
  const excluded = members.filter((file) => isTriggerFile(file) !== (role === 'trigger'));
  const hidden = new Set(parts.hidden);
  const rank = new Map((parts.order ?? []).map((id, i) => [id, i]));
  const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  const files = members
    .filter((file) => !excluded.includes(file) && !hidden.has(file.id))
    .sort((a, b) => {
      const difference = (rank.get(a.id) ?? rank.size) - (rank.get(b.id) ?? rank.size);
      return difference || compare(a.path.toLowerCase(), b.path.toLowerCase()) || compare(a.id, b.id);
    });
  return { path, files, excluded, issues };
};
