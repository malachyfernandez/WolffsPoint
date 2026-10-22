import type { CallExpression, Expression, Script } from '../script/lang/ast';
import {
  collectDraftFileInputs,
  getFileInputParts,
  makeFileInputStatement,
  mapExpressionChildren,
  mapStatementExpressions,
} from './scriptFiles';
import { getMarkdownVariableNames, renameMarkdownVariable } from '../script/markdownVariables';

/** Keep computational source intact; only the primary rendering literal is edited. */
export const markdownFileBody = (script: Script): string | null => {
  if (script.diagnostics.length > 0) return null;
  let body: string | null = null;
  for (const statement of script.statements) {
    if (statement.kind === 'FunctionStatement') continue;
    if (statement.kind !== 'ExpressionStatement') return null;
    const call = statement.expression;
    if (call.kind !== 'CallExpression' || call.callee.kind !== 'IdentifierExpression') return null;
    const name = call.callee.name.toLowerCase();
    if (name === 'fileinput' || name === 'variable') continue;
    if (name !== 'createmarkdown' || body !== null) return null;
    const content = call.arguments.find(
      (arg) => arg.kind === 'NamedArgument' && arg.name.toLowerCase() === 'content'
    )?.value;
    if (content?.kind !== 'MarkdownLiteral' && content?.kind !== 'StringLiteral') return null;
    body = content.value;
  }
  return body;
};

export const withMarkdownFileBody = (script: Script, value: string): Script => {
  if (markdownFileBody(script) === null) return script;
  return {
    ...script,
    statements: script.statements.map((statement) => {
      if (statement.kind !== 'ExpressionStatement') return statement;
      const call = statement.expression;
      if (
        call.kind !== 'CallExpression' ||
        call.callee.kind !== 'IdentifierExpression' ||
        call.callee.name.toLowerCase() !== 'createmarkdown'
      )
        return statement;
      const expression: CallExpression = {
        ...call,
        arguments: call.arguments.map((arg) =>
          arg.kind === 'NamedArgument' &&
          arg.name.toLowerCase() === 'content' &&
          (arg.value.kind === 'MarkdownLiteral' || arg.value.kind === 'StringLiteral')
            ? { ...arg, value: { ...arg.value, kind: 'MarkdownLiteral' as const, value } }
            : arg
        ),
      };
      return { ...statement, expression };
    }),
  };
};

/** Rename references, not unrelated strings or other files' override keys. */
export const renameFileInputReferences = (script: Script, from: string, to: string): Script => {
  const matches = (name: string) => name.toLowerCase() === from.toLowerCase();
  const transform = (expression: Expression): Expression => {
    const mapped = mapExpressionChildren(expression, transform);
    if (mapped.kind === 'MarkdownLiteral') {
      return {
        ...mapped,
        value: renameMarkdownVariable(mapped.value, from, to),
        variables: mapped.variables?.map((binding) => ({
          ...binding,
          name: matches(binding.name) ? to : binding.name,
        })),
      };
    }
    if (
      mapped.kind === 'CallExpression' &&
      mapped.callee.kind === 'IdentifierExpression' &&
      mapped.callee.name.toLowerCase() === 'createmarkdown'
    ) {
      return {
        ...mapped,
        arguments: mapped.arguments.map((arg) =>
          arg.kind === 'NamedArgument' &&
          arg.name.toLowerCase() === 'content' &&
          arg.value.kind === 'StringLiteral'
            ? {
                ...arg,
                value: { ...arg.value, value: renameMarkdownVariable(arg.value.value, from, to) },
              }
            : arg
        ),
      };
    }
    if (
      mapped.kind === 'CallExpression' &&
      mapped.callee.kind === 'MemberExpression' &&
      mapped.callee.object.kind === 'IdentifierExpression' &&
      ['inputs', 'inputswithdata'].includes(mapped.callee.object.name.toLowerCase()) &&
      mapped.callee.property.toLowerCase() === 'entry'
    ) {
      return {
        ...mapped,
        arguments: mapped.arguments.map((arg) =>
          arg.value.kind === 'StringLiteral' && matches(arg.value.value.replace(/^!/, ''))
            ? {
                ...arg,
                value: {
                  ...arg.value,
                  value: `${arg.value.value.startsWith('!') ? '!' : ''}${to}`,
                },
              }
            : arg
        ),
      };
    }
    return mapped;
  };
  return {
    ...script,
    statements: script.statements.map((s) => mapStatementExpressions(s, transform)),
  };
};

export const hasFileInputReferences = (script: Script, name: string): boolean => {
  const matches = (value: string) => value.toLowerCase() === name.toLowerCase();
  let found = false;
  const visit = (expression: Expression): Expression => {
    if (expression.kind === 'MarkdownLiteral') {
      found ||= getMarkdownVariableNames(expression.value).some(matches);
    }
    if (expression.kind === 'CallExpression') {
      const callee = expression.callee;
      if (
        callee.kind === 'IdentifierExpression' &&
        callee.name.toLowerCase() === 'createmarkdown'
      ) {
        found ||= expression.arguments.some(
          (arg) =>
            arg.kind === 'NamedArgument' &&
            arg.name.toLowerCase() === 'content' &&
            arg.value.kind === 'StringLiteral' &&
            getMarkdownVariableNames(arg.value.value).some(matches)
        );
      }
      if (
        callee.kind === 'MemberExpression' &&
        callee.object.kind === 'IdentifierExpression' &&
        ['inputs', 'inputswithdata'].includes(callee.object.name.toLowerCase()) &&
        callee.property.toLowerCase() === 'entry'
      ) {
        found ||= expression.arguments.some(
          (arg) => arg.value.kind === 'StringLiteral' && matches(arg.value.value.replace(/^!/, ''))
        );
      }
    }
    return mapExpressionChildren(expression, visit);
  };
  script.statements.forEach((statement) => mapStatementExpressions(statement, visit));
  return found;
};

/** Adopt legacy marker/default inputs into the same editable declarations. */
export const normalizeMarkdownFileInputs = (script: Script): Script => {
  if (markdownFileBody(script) === null) return script;
  const explicit = new Set(
    script.statements
      .map(getFileInputParts)
      .flatMap((decl) => (decl ? [decl.name.toLowerCase()] : []))
  );
  const missing = collectDraftFileInputs(script.statements).filter(
    (decl) => !explicit.has(decl.name.toLowerCase())
  );
  return missing.length
    ? {
        ...script,
        statements: [
          ...missing.map((decl) => makeFileInputStatement(decl.name, decl.defaultExpression)),
          ...script.statements,
        ],
      }
    : script;
};
