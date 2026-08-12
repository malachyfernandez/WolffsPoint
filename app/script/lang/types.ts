import type { Expression, Script, Statement } from './ast';

export type ExpressionKind =
  | 'string'
  | 'number'
  | 'boolean'
  | 'list'
  | 'object'
  | 'function'
  | 'nothing'
  | 'unknown';

export type TypeEnvironment = Readonly<Record<string, ExpressionKind>>;

const BOOLEAN_METHODS = new Set(['contains', 'endswith', 'startswith']);
const LIST_METHODS = new Set(['filter', 'map', 'sort']);
const NUMBER_PROPERTIES = new Set(['length', 'floor', 'ceil', 'round', 'abs']);

export const inferExpressionKind = (
  expression: Expression,
  environment: TypeEnvironment = {}
): ExpressionKind => {
  switch (expression.kind) {
    case 'StringLiteral':
      return 'string';
    case 'MarkdownLiteral':
      return 'string';
    case 'NumberLiteral':
      return 'number';
    case 'BooleanLiteral':
      return 'boolean';
    case 'NothingLiteral':
    case 'ErrorExpression':
      return expression.kind === 'NothingLiteral' ? 'nothing' : 'unknown';
    case 'IdentifierExpression':
      return environment[expression.name] ?? 'unknown';
    case 'ListExpression':
      return 'list';
    case 'LambdaExpression':
      return 'function';
    case 'UnaryExpression':
      return expression.operator === 'NOT' ? 'boolean' : 'number';
    case 'BinaryExpression':
      if (['OR', 'AND', '==', '!=', '>', '<', '>=', '<='].includes(expression.operator)) {
        return 'boolean';
      }
      if (
        expression.operator === '+' &&
        (inferExpressionKind(expression.left, environment) === 'string' ||
          inferExpressionKind(expression.right, environment) === 'string')
      ) {
        return 'string';
      }
      return 'number';
    case 'IndexExpression':
      return 'unknown';
    case 'MemberExpression': {
      const property = expression.property.toLowerCase();
      if (NUMBER_PROPERTIES.has(property)) {
        return 'number';
      }
      if (property === 'first' || property === 'last') {
        return 'unknown';
      }
      return 'unknown';
    }
    case 'CallExpression': {
      if (expression.callee.kind === 'MemberExpression') {
        const method = expression.callee.property.toLowerCase();
        if (BOOLEAN_METHODS.has(method)) {
          return 'boolean';
        }
        if (LIST_METHODS.has(method)) {
          return 'list';
        }
        if (['concat'].includes(method)) {
          return inferExpressionKind(expression.callee.object, environment) === 'list'
            ? 'list'
            : 'string';
        }
        if (['get', 'first', 'last', 'min', 'max'].includes(method)) {
          return method === 'min' || method === 'max' ? 'number' : 'unknown';
        }
      }
      return 'unknown';
    }
  }
};

const visitExpression = (expression: Expression, scope: Set<string>, roots: Set<string>): void => {
  switch (expression.kind) {
    case 'IdentifierExpression':
      if (!scope.has(expression.name)) {
        roots.add(expression.name);
      }
      return;
    case 'ListExpression':
      expression.items.forEach((item) => visitExpression(item, scope, roots));
      return;
    case 'UnaryExpression':
      visitExpression(expression.operand, scope, roots);
      return;
    case 'BinaryExpression':
      visitExpression(expression.left, scope, roots);
      visitExpression(expression.right, scope, roots);
      return;
    case 'MemberExpression':
      visitExpression(expression.object, scope, roots);
      return;
    case 'IndexExpression':
      visitExpression(expression.object, scope, roots);
      visitExpression(expression.index, scope, roots);
      return;
    case 'CallExpression':
      visitExpression(expression.callee, scope, roots);
      expression.arguments.forEach((argument) => visitExpression(argument.value, scope, roots));
      return;
    case 'LambdaExpression': {
      const lambdaScope = new Set(scope);
      expression.parameters.forEach((parameter) => lambdaScope.add(parameter));
      if (expression.body.kind === 'BlockStatement') {
        visitStatements(expression.body.statements, lambdaScope, roots);
      } else {
        visitExpression(expression.body, lambdaScope, roots);
      }
      return;
    }
    default:
      return;
  }
};

const visitStatement = (statement: Statement, scope: Set<string>, roots: Set<string>): void => {
  switch (statement.kind) {
    case 'BlockStatement':
      visitStatements(statement.statements, new Set(scope), roots);
      return;
    case 'ExpressionStatement':
      visitExpression(statement.expression, scope, roots);
      return;
    case 'IfStatement':
      statement.branches.forEach((branch) => {
        visitExpression(branch.condition, scope, roots);
        visitStatements(branch.body.statements, new Set(scope), roots);
      });
      if (statement.elseBody) {
        visitStatements(statement.elseBody.statements, new Set(scope), roots);
      }
      return;
    case 'ForEachStatement': {
      visitExpression(statement.iterable, scope, roots);
      const loopScope = new Set(scope);
      loopScope.add(statement.itemName);
      visitStatements(statement.body.statements, loopScope, roots);
      return;
    }
    case 'FunctionStatement': {
      scope.add(statement.name);
      const functionScope = new Set(scope);
      statement.parameters.forEach((parameter) => functionScope.add(parameter));
      visitStatements(statement.body.statements, functionScope, roots);
      return;
    }
    case 'ReturnStatement':
      if (statement.value) {
        visitExpression(statement.value, scope, roots);
      }
      return;
    case 'ErrorStatement':
      return;
  }
};

const visitStatements = (statements: Statement[], scope: Set<string>, roots: Set<string>): void => {
  statements.forEach((statement) => visitStatement(statement, scope, roots));
};

export const collectReferencedRoots = (node: Script | Expression): string[] => {
  const roots = new Set<string>();
  if (node.kind === 'Script') {
    visitStatements(node.statements, new Set(), roots);
  } else {
    visitExpression(node, new Set(), roots);
  }
  return [...roots].sort((left, right) => left.localeCompare(right));
};

export const inferScriptVariables = (
  script: Script,
  environment: TypeEnvironment = {}
): Record<string, ExpressionKind> => {
  const result: Record<string, ExpressionKind> = { ...environment };
  for (const statement of script.statements) {
    if (statement.kind === 'FunctionStatement') {
      result[statement.name] = 'function';
    }
  }
  return result;
};
