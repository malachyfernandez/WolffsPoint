import type { Expression } from '../script/lang/ast';
import type { UserTableTitle } from '../types/playerTable';

export type CellColumnKind = 'tags' | 'files' | 'value';

export const cellColumnValueType = (column: string): 'number' | 'string' =>
  column.toLowerCase() === 'votemultiplier' ? 'number' : 'string';

export const cellOperationDisabledReason = (
  kind: CellColumnKind | undefined,
  scope: 'all' | 'cell',
  op: 'add' | 'remove' | 'replace'
): string | undefined => {
  if (kind !== 'value') return undefined;
  if (scope === 'all') {
    return 'This column stores a single value. Use For each cell, then For Cell Replace With.';
  }
  if (op !== 'replace') {
    return 'This column stores a single value, not modules. Use Replace With instead of Add or Remove.';
  }
  return undefined;
};

/** Modular writes must be explicit: a runtime variable isn't a live File reference. */
export const isCellValueChoiceAllowed = (
  kind: CellColumnKind | undefined,
  module: CellColumnKind | undefined,
  resultType: string,
  valueType: 'number' | 'string'
): boolean => {
  if (kind === 'files' || kind === 'tags') return module === kind;
  if (kind === 'value') {
    return (
      module !== 'files' &&
      module !== 'tags' &&
      (resultType === valueType || resultType === 'any' || resultType === 'nothing')
    );
  }
  return true;
};

/** Unknown/dynamic columns stay unknown; they must not silently become tag columns. */
export const cellColumnKind = (
  titles: UserTableTitle | undefined,
  scope: 'user' | 'day',
  column: string
): CellColumnKind | undefined => {
  const name = column.toLowerCase();
  if (!name) return undefined;
  if (scope === 'day' && name === 'morningmessage') return 'files';
  if (
    (scope === 'user' && name === 'livingstate') ||
    (scope === 'day' && ['vote', 'action', 'votemultiplier'].includes(name))
  )
    return 'value';
  const names = scope === 'user' ? titles?.extraUserColumns : titles?.extraDayColumns;
  const types = scope === 'user' ? titles?.extraUserColumnTypes : titles?.extraDayColumnTypes;
  const index = names?.findIndex((entry) => entry.toLowerCase() === name) ?? -1;
  return index < 0 ? undefined : (types?.[index] ?? 'tags');
};

export const cellExpressionKind = (expression: Expression): CellColumnKind | undefined => {
  if (expression.kind === 'CallExpression' && expression.callee.kind === 'IdentifierExpression') {
    const name = expression.callee.name.toLowerCase();
    if (name === 'file') return 'files';
    if (name === 'tag') return 'tags';
  }
  if (
    ['StringLiteral', 'NumberLiteral', 'BooleanLiteral', 'MarkdownLiteral'].includes(
      expression.kind
    )
  )
    return 'value';
  return undefined;
};
