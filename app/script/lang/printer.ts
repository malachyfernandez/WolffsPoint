import type { BlockStatement, CallArgument, Expression, Script, Statement } from './ast';
import { parseScript } from './parser';

const PRECEDENCE: Record<string, number> = {
  OR: 1,
  AND: 2,
  '==': 3,
  '!=': 3,
  '>': 4,
  '<': 4,
  '>=': 4,
  '<=': 4,
  '+': 5,
  '-': 5,
  '*': 6,
  '/': 6,
  '%': 6,
};

const indent = (depth: number): string => '  '.repeat(depth);

const printArgument = (argument: CallArgument, depth: number): string => {
  const value = printExpression(argument.value, 0, depth);
  return argument.kind === 'NamedArgument' ? `${argument.name} = ${value}` : value;
};

const expressionPrecedence = (expression: Expression): number => {
  if (expression.kind === 'LambdaExpression') {
    return 0;
  }
  if (expression.kind === 'BinaryExpression') {
    return PRECEDENCE[expression.operator];
  }
  if (expression.kind === 'UnaryExpression') {
    return 7;
  }
  if (['CallExpression', 'MemberExpression', 'IndexExpression'].includes(expression.kind)) {
    return 8;
  }
  return 9;
};

export const printExpression = (
  expression: Expression,
  parentPrecedence: number = 0,
  depth: number = 0
): string => {
  const ownPrecedence = expressionPrecedence(expression);
  let result: string;
  switch (expression.kind) {
    case 'StringLiteral':
      result = JSON.stringify(expression.value);
      break;
    case 'MarkdownLiteral':
      result = `\`${expression.value.replace(/\\/g, '\\\\').replace(/`/g, '\\`')}\``;
      break;
    case 'NumberLiteral':
      result = Number.isFinite(expression.value) ? String(expression.value) : '0';
      break;
    case 'BooleanLiteral':
      result = expression.value ? 'true' : 'false';
      break;
    case 'NothingLiteral':
      result = 'nothing';
      break;
    case 'IdentifierExpression':
      result = expression.name;
      break;
    case 'ListExpression':
      result = `[${expression.items.map((item) => printExpression(item, 0, depth)).join(', ')}]`;
      break;
    case 'UnaryExpression': {
      const operator = expression.operator === 'NOT' ? 'NOT ' : expression.operator;
      result = `${operator}${printExpression(expression.operand, ownPrecedence, depth)}`;
      break;
    }
    case 'BinaryExpression':
      result = `(${printExpression(expression.left, 0, depth)} ${expression.operator} ${printExpression(expression.right, 0, depth)})`;
      break;
    case 'MemberExpression':
      result = `${printExpression(expression.object, ownPrecedence, depth)}.${expression.property}`;
      break;
    case 'IndexExpression':
      result = `${printExpression(expression.object, ownPrecedence, depth)}[${printExpression(expression.index, 0, depth)}]`;
      break;
    case 'CallExpression': {
      const named = expression.arguments.some((argument) => argument.kind === 'NamedArgument');
      const callee = printExpression(expression.callee, ownPrecedence, depth);
      if (named) {
        if (expression.arguments.length === 0) {
          result = `${callee}({})`;
        } else {
          const argumentsText = expression.arguments
            .map((argument) => `${indent(depth + 1)}${printArgument(argument, depth + 1)}`)
            .join(',\n');
          result = `${callee}({\n${argumentsText},\n${indent(depth)}})`;
        }
      } else {
        result = `${callee}(${expression.arguments.map((argument) => printArgument(argument, depth)).join(', ')})`;
      }
      break;
    }
    case 'LambdaExpression': {
      const parameters =
        expression.parameters.length === 1
          ? expression.parameters[0]
          : `(${expression.parameters.join(', ')})`;
      const body =
        expression.body.kind === 'BlockStatement'
          ? printBlock(expression.body, depth)
          : printExpression(expression.body, 0, depth);
      result = `${parameters} => ${body}`;
      break;
    }
    case 'ErrorExpression':
      result = expression.source || 'nothing';
      break;
  }
  return ownPrecedence < parentPrecedence ? `(${result})` : result;
};

const printBlock = (block: BlockStatement, depth: number): string => {
  if (block.statements.length === 0) {
    return '{}';
  }
  const body = block.statements.map((statement) => printStatement(statement, depth + 1)).join('\n');
  return `{\n${body}\n${indent(depth)}}`;
};

export const printStatement = (statement: Statement, depth: number = 0): string => {
  const prefix = indent(depth);
  switch (statement.kind) {
    case 'BlockStatement':
      return `${prefix}${printBlock(statement, depth)}`;
    case 'ExpressionStatement':
      return `${prefix}${printExpression(statement.expression, 0, depth)};`;
    case 'IfStatement': {
      const first = statement.branches[0];
      let result = `${prefix}If (${printExpression(first.condition, 0, depth)}) ${printBlock(first.body, depth)}`;
      for (const branch of statement.branches.slice(1)) {
        result += ` ElseIf (${printExpression(branch.condition, 0, depth)}) ${printBlock(branch.body, depth)}`;
      }
      if (statement.elseBody) {
        result += ` Else ${printBlock(statement.elseBody, depth)}`;
      }
      return result;
    }
    case 'ForEachStatement':
      return `${prefix}ForEach (${statement.itemName} in ${printExpression(statement.iterable, 0, depth)}) ${printBlock(statement.body, depth)}`;
    case 'FunctionStatement':
      return `${prefix}Function ${statement.name}(${statement.parameters.join(', ')}) ${printBlock(statement.body, depth)}`;
    case 'ReturnStatement':
      return `${prefix}Return${statement.value ? ` ${printExpression(statement.value, 0, depth)}` : ''};`;
    case 'ErrorStatement':
      return `${prefix}${statement.source}`;
  }
};

export const printScript = (script: Script): string =>
  script.statements.map((statement) => printStatement(statement)).join('\n\n');

const SCRIPT_BLOCK = /\/\*script\s*\n?([\s\S]*?)\n?script\*\//i;

export const parseScriptBlock = (source: string): Script => {
  const block = SCRIPT_BLOCK.exec(source);
  return parseScript(block?.[1] ?? source);
};

export const printScriptBlock = (script: Script | string): string => {
  const parsed = typeof script === 'string' ? parseScript(script) : script;
  return `/*script\n${printScript(parsed)}\nscript*/`;
};
