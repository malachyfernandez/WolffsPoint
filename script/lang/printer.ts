import { getMarkdownVariableNames } from '../markdownVariables';
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
    case 'MarkdownLiteral': {
      const markdown = `\`${expression.value.replace(/\\/g, '\\\\').replace(/`/g, '\\`')}\``;
      const variableNames = getMarkdownVariableNames(expression.value);
      for (const binding of expression.variables ?? []) {
        if (!variableNames.some((name) => name.toLowerCase() === binding.name.toLowerCase())) {
          variableNames.push(binding.name);
        }
      }
      if (variableNames.length === 0) {
        result = markdown;
        break;
      }
      const bindings = variableNames.map((name) => {
        const binding = expression.variables?.find(
          (variable) => variable.name.toLowerCase() === name.toLowerCase()
        );
        const value = binding?.expression ?? {
          kind: 'NothingLiteral' as const,
          span: expression.span,
        };
        return `${JSON.stringify(name)} = ${printExpression(value, 0, depth)}`;
      });
      result = `Markdown(${markdown}, ${bindings.join(', ')})`;
      break;
    }
    case 'DropdownLiteral':
      result = `Dropdown(${JSON.stringify(expression.value)}, [${expression.options.map((o) => JSON.stringify(o)).join(', ')}])`;
      break;
    case 'ListLiteral':
      result = `List([${expression.items.map((i) => JSON.stringify(i)).join(', ')}])`;
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
      const operator =
        expression.operator === 'NOT'
          ? 'NOT '
          : expression.operator === 'ISTRUTHY'
            ? 'isTruthy '
            : expression.operator === 'ISFALSY'
              ? 'isFalsy '
              : expression.operator;
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

const printBlock = (block: BlockStatement, depth: number, inCellLoop = false): string => {
  if (block.statements.length === 0) {
    return '{}';
  }
  const body = block.statements
    .map((statement) => printStatement(statement, depth + 1, inCellLoop))
    .join('\n');
  return `{\n${body}\n${indent(depth)}}`;
};

export const printStatement = (
  statement: Statement,
  depth: number = 0,
  inCellLoop = false
): string => {
  const prefix = indent(depth);
  const commentPrefix = indent(depth);
  const commentStr = statement.comment
    ? statement.comment
        .split('\n')
        .map((line) => `${commentPrefix}// ${line}`)
        .join('\n') + '\n'
    : '';
  switch (statement.kind) {
    case 'BlockStatement':
      return `${commentStr}${prefix}${printBlock(statement, depth, inCellLoop)}`;
    case 'ExpressionStatement':
      return `${commentStr}${prefix}${printExpression(statement.expression, 0, depth)};`;
    case 'IfStatement': {
      const first = statement.branches[0];
      let result = `${prefix}If (${printExpression(first.condition, 0, depth)}) ${printBlock(first.body, depth, inCellLoop)}`;
      for (const branch of statement.branches.slice(1)) {
        result += ` ElseIf (${printExpression(branch.condition, 0, depth)}) ${printBlock(branch.body, depth, inCellLoop)}`;
      }
      if (statement.elseBody) {
        result += ` Else ${printBlock(statement.elseBody, depth, inCellLoop)}`;
      }
      return `${commentStr}${result}`;
    }
    case 'ForEachStatement':
      return `${commentStr}${prefix}ForEach (${statement.itemName} in ${printExpression(statement.iterable, 0, depth)}) ${printBlock(statement.body, depth, inCellLoop)}`;
    case 'NavButtonStatement':
      return `${commentStr}${prefix}NavButton({LABEL = ${printExpression(statement.label, 0, depth)}}) ${printBlock(statement.body, depth, inCellLoop)}`;
    case 'DisplayGroupStatement':
      return `${commentStr}${prefix}DisplayGroup({${statement.arguments.map((arg) => printArgument(arg, depth)).join(', ')}}) ${printBlock(statement.body, depth, inCellLoop)}`;
    case 'FunctionStatement': {
      let templateStr = '';
      if (statement.template && statement.template.length > 0) {
        const pieces = statement.template.map((piece) => {
          if (piece.kind === 'text') {
            return JSON.stringify(piece.text ?? '');
          }
          const label = JSON.stringify(piece.label ?? '');
          const defaultStr = piece.defaultExpression
            ? `, ${printExpression(piece.defaultExpression, 0, depth)}`
            : '';
          return `input(${label}${defaultStr})`;
        });
        templateStr = ` template(${pieces.join(', ')})`;
      }
      return `${commentStr}${prefix}Function ${statement.name}(${statement.parameters.join(', ')})${templateStr} ${printBlock(statement.body, depth, inCellLoop)}`;
    }
    case 'ReturnStatement':
      return `${commentStr}${prefix}Return${statement.value ? ` ${printExpression(statement.value, 0, depth)}` : ''};`;
    case 'UpdateCellStatement': {
      const args = [
        `PLAYERS = ${printExpression(statement.players, 0, depth)}`,
        `COLUMNTYPE = "${statement.columnType}"`,
      ];
      if (statement.dayIndex) {
        args.push(`DAY = ${printExpression(statement.dayIndex, 0, depth)}`);
      }
      args.push(`COLUMN = ${printExpression(statement.column, 0, depth)}`);
      if (statement.allowDuplicates !== undefined) {
        args.push(`ALLOWDUPLICATES = ${statement.allowDuplicates ? 'True' : 'False'}`);
      }
      if (statement.autoRemove !== undefined) {
        args.push(`AUTOREMOVE = ${statement.autoRemove ? 'True' : 'False'}`);
      }
      const stmts = statement.body?.statements ?? [];
      // A lone ForEachCell whose body holds no cell ops is the legacy
      // `{ ...; Return expr; }` form - the body prints bare (item name as
      // the ITEM arg) so round-trips stay byte-identical with older files.
      // Bodies WITH cell ops print the canonical `Each ... { }` instead:
      // inside the bare braces, `Add`/`ForCell` would re-parse at the
      // UpdateCell level, breaking the loop's structure.
      const loopBodyHasCellOps = (block: BlockStatement): boolean =>
        block.statements.some((s) => {
          if (s.kind === 'CellOpStatement' || s.kind === 'ForEachCellStatement') return true;
          const nested: BlockStatement[] =
            s.kind === 'IfStatement'
              ? [...s.branches.map((b) => b.body), ...(s.elseBody ? [s.elseBody] : [])]
              : 'body' in s && s.body.kind === 'BlockStatement'
                ? [s.body]
                : [];
          return nested.some(loopBodyHasCellOps);
        });
      if (
        stmts.length === 1 &&
        stmts[0].kind === 'ForEachCellStatement' &&
        !loopBodyHasCellOps(stmts[0].body)
      ) {
        const loop = stmts[0];
        if (loop.itemName !== 'cellContents') {
          args.push(`ITEM = ${JSON.stringify(loop.itemName)}`);
        }
        return `${commentStr}${prefix}UpdateCell({${args.join(', ')}}) ${printBlock(loop.body, depth)}`;
      }
      if (stmts.length === 0) {
        return `${commentStr}${prefix}UpdateCell({${args.join(', ')}}) { }`;
      }
      return `${commentStr}${prefix}UpdateCell({${args.join(', ')}}) {\n${stmts
        .map((s) => printStatement(s, depth + 1))
        .join('\n')}\n${prefix}}`;
    }
    case 'CellOpStatement': {
      // Bare Add/Remove/Replace re-parses to the ambient scope, so the
      // explicit prefix is only needed where it would flip: 'cell' ops
      // outside a loop → `ForCell`, 'all' ops inside a loop → `ForAllCells`.
      const word =
        statement.op === 'add' ? 'Add' : statement.op === 'remove' ? 'Remove' : 'Replace';
      const head =
        statement.scope === 'cell' && !inCellLoop
          ? `ForCell ${word}`
          : statement.scope === 'all' && inCellLoop
            ? `ForAllCells ${word}`
            : word;
      return `${commentStr}${prefix}${head} ${printExpression(statement.value, 0, depth)};`;
    }
    case 'ForEachCellStatement': {
      return `${commentStr}${prefix}Each ${statement.itemName} ${printBlock(statement.body, depth, true)}`;
    }
    case 'TagStatement':
      return `${commentStr}${prefix}Tag({NAME = ${JSON.stringify(statement.name)}, COLOR = ${JSON.stringify(statement.color)}})`;
    case 'ErrorStatement':
      return `${commentStr}${prefix}${statement.source}`;
    case 'OnTagAddedStatement': {
      return `${commentStr}${prefix}OnTagAdded ${printBlock(statement.body, depth, inCellLoop)}`;
    }
    case 'OnTagRemovedStatement': {
      return `${commentStr}${prefix}OnTagRemoved ${printBlock(statement.body, depth, inCellLoop)}`;
    }
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
