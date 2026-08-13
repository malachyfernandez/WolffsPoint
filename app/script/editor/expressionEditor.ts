import type { CallArgument, Expression, NamedArgument, Statement } from '../lang/ast';
import { emptySpan } from '../lang/ast';

export type ExpressionSlot =
  | { kind: 'callArg'; name: string }
  | { kind: 'ifCondition'; branchIndex?: number }
  | { kind: 'forEachIterable' }
  | { kind: 'returnValue' }
  | { kind: 'templateDefault'; pieceIndex: number };

export type ExpressionPathStep =
  | { kind: 'lambdaBody' }
  | { kind: 'binaryLeft' }
  | { kind: 'binaryRight' }
  | { kind: 'unaryOperand' }
  | { kind: 'listItem'; index: number }
  | { kind: 'indexObject' }
  | { kind: 'indexValue' }
  | { kind: 'callArgument'; index: number }
  | { kind: 'chainBase' }
  | { kind: 'chainArgument'; linkIndex: number; argumentIndex: number };

export interface ExpressionLocation {
  statementPath: number[];
  slot: ExpressionSlot;
  expressionPath: ExpressionPathStep[];
}

export type ChainLink =
  | { type: 'base'; expr: Expression }
  | { type: 'method'; name: string; args: CallArgument[] }
  | { type: 'property'; name: string };

const span = emptySpan();

export const decomposeChain = (expression: Expression): ChainLink[] => {
  const links: ChainLink[] = [];
  let current = expression;
  while (true) {
    if (current.kind === 'MemberExpression') {
      links.unshift({ type: 'property', name: current.property });
      current = current.object;
      continue;
    }
    if (current.kind === 'CallExpression' && current.callee.kind === 'MemberExpression') {
      links.unshift({ type: 'method', name: current.callee.property, args: current.arguments });
      current = current.callee.object;
      continue;
    }
    break;
  }
  links.unshift({ type: 'base', expr: current });
  return links;
};

export const recomposeChain = (chain: ChainLink[]): Expression => {
  if (chain.length === 0) return { kind: 'NothingLiteral', span };
  let expression =
    chain[0].type === 'base' ? chain[0].expr : ({ kind: 'NothingLiteral', span } as Expression);
  for (const link of chain.slice(1)) {
    if (link.type === 'method') {
      expression = {
        kind: 'CallExpression',
        callee: { kind: 'MemberExpression', object: expression, property: link.name, span },
        arguments: link.args,
        span,
      };
    } else if (link.type === 'property') {
      expression = { kind: 'MemberExpression', object: expression, property: link.name, span };
    }
  }
  return expression;
};

export const renameIdentifier = (expression: Expression, from: string, to: string): Expression => {
  if (!from || !to || from === to) return expression;
  switch (expression.kind) {
    case 'IdentifierExpression':
      return expression.name === from ? { ...expression, name: to } : expression;
    case 'ListExpression':
      return {
        ...expression,
        items: expression.items.map((item) => renameIdentifier(item, from, to)),
      };
    case 'UnaryExpression':
      return { ...expression, operand: renameIdentifier(expression.operand, from, to) };
    case 'BinaryExpression':
      return {
        ...expression,
        left: renameIdentifier(expression.left, from, to),
        right: renameIdentifier(expression.right, from, to),
      };
    case 'MemberExpression':
      return { ...expression, object: renameIdentifier(expression.object, from, to) };
    case 'IndexExpression':
      return {
        ...expression,
        object: renameIdentifier(expression.object, from, to),
        index: renameIdentifier(expression.index, from, to),
      };
    case 'CallExpression':
      return {
        ...expression,
        callee: renameIdentifier(expression.callee, from, to),
        arguments: expression.arguments.map((argument) => ({
          ...argument,
          value: renameIdentifier(argument.value, from, to),
        })),
      };
    case 'LambdaExpression':
      if (expression.parameters.includes(from) || expression.body.kind === 'BlockStatement')
        return expression;
      return { ...expression, body: renameIdentifier(expression.body, from, to) };
    default:
      return expression;
  }
};

export const renameIdentifierInStatements = (
  statements: Statement[],
  from: string,
  to: string
): Statement[] =>
  statements.map((statement): Statement => {
    switch (statement.kind) {
      case 'BlockStatement':
        return {
          ...statement,
          statements: renameIdentifierInStatements(statement.statements, from, to),
        };
      case 'ExpressionStatement':
        return { ...statement, expression: renameIdentifier(statement.expression, from, to) };
      case 'IfStatement':
        return {
          ...statement,
          branches: statement.branches.map((branch) => ({
            ...branch,
            condition: renameIdentifier(branch.condition, from, to),
            body: {
              ...branch.body,
              statements: renameIdentifierInStatements(branch.body.statements, from, to),
            },
          })),
          elseBody: statement.elseBody
            ? {
                ...statement.elseBody,
                statements: renameIdentifierInStatements(statement.elseBody.statements, from, to),
              }
            : undefined,
        };
      case 'ForEachStatement':
        return {
          ...statement,
          iterable: renameIdentifier(statement.iterable, from, to),
          body:
            statement.itemName === from
              ? statement.body
              : {
                  ...statement.body,
                  statements: renameIdentifierInStatements(statement.body.statements, from, to),
                },
        };
      case 'FunctionStatement':
        return statement.parameters.includes(from)
          ? statement
          : {
              ...statement,
              body: {
                ...statement.body,
                statements: renameIdentifierInStatements(statement.body.statements, from, to),
              },
            };
      case 'ReturnStatement':
        return {
          ...statement,
          value: statement.value ? renameIdentifier(statement.value, from, to) : undefined,
        };
      default:
        return statement;
    }
  });

const replaceArgument = (
  argumentsList: CallArgument[],
  index: number,
  replace: (expression: Expression) => Expression
): CallArgument[] =>
  argumentsList.map((argument, argumentIndex) =>
    argumentIndex === index ? { ...argument, value: replace(argument.value) } : argument
  );

export const replaceExpressionAtPath = (
  expression: Expression,
  path: ExpressionPathStep[],
  replacement: Expression
): Expression => {
  const [step, ...rest] = path;
  if (!step) return replacement;
  const replace = (child: Expression) => replaceExpressionAtPath(child, rest, replacement);
  switch (step.kind) {
    case 'lambdaBody':
      return expression.kind === 'LambdaExpression' && expression.body.kind !== 'BlockStatement'
        ? { ...expression, body: replace(expression.body) }
        : expression;
    case 'binaryLeft':
      return expression.kind === 'BinaryExpression'
        ? { ...expression, left: replace(expression.left) }
        : expression;
    case 'binaryRight':
      return expression.kind === 'BinaryExpression'
        ? { ...expression, right: replace(expression.right) }
        : expression;
    case 'unaryOperand':
      return expression.kind === 'UnaryExpression'
        ? { ...expression, operand: replace(expression.operand) }
        : expression;
    case 'listItem':
      return expression.kind === 'ListExpression'
        ? {
            ...expression,
            items: expression.items.map((item, index) =>
              index === step.index ? replace(item) : item
            ),
          }
        : expression;
    case 'indexObject':
      return expression.kind === 'IndexExpression'
        ? { ...expression, object: replace(expression.object) }
        : expression;
    case 'indexValue':
      return expression.kind === 'IndexExpression'
        ? { ...expression, index: replace(expression.index) }
        : expression;
    case 'callArgument':
      return expression.kind === 'CallExpression'
        ? { ...expression, arguments: replaceArgument(expression.arguments, step.index, replace) }
        : expression;
    case 'chainArgument': {
      const chain = decomposeChain(expression);
      const link = chain[step.linkIndex];
      if (!link || link.type !== 'method') return expression;
      const nextChain = chain.map((candidate, index) =>
        index === step.linkIndex && candidate.type === 'method'
          ? { ...candidate, args: replaceArgument(candidate.args, step.argumentIndex, replace) }
          : candidate
      );
      return recomposeChain(nextChain);
    }
    case 'chainBase': {
      const chain = decomposeChain(expression);
      const base = chain[0];
      if (!base || base.type !== 'base') return expression;
      return recomposeChain([{ type: 'base', expr: replace(base.expr) }, ...chain.slice(1)]);
    }
  }
};

const getRootExpression = (statement: Statement, slot: ExpressionSlot): Expression | undefined => {
  switch (slot.kind) {
    case 'callArg':
      if (
        statement.kind !== 'ExpressionStatement' ||
        statement.expression.kind !== 'CallExpression'
      )
        return undefined;
      return statement.expression.arguments.find(
        (argument) =>
          argument.kind === 'NamedArgument' &&
          argument.name.toUpperCase() === slot.name.toUpperCase()
      )?.value;
    case 'ifCondition':
      return statement.kind === 'IfStatement'
        ? statement.branches[slot.branchIndex ?? 0]?.condition
        : undefined;
    case 'forEachIterable':
      return statement.kind === 'ForEachStatement' ? statement.iterable : undefined;
    case 'returnValue':
      return statement.kind === 'ReturnStatement' ? statement.value : undefined;
    case 'templateDefault':
      if (statement.kind !== 'FunctionStatement' || !statement.template) return undefined;
      return statement.template[slot.pieceIndex]?.defaultExpression;
  }
};

const setRootExpression = (
  statement: Statement,
  slot: ExpressionSlot,
  expression: Expression
): Statement => {
  switch (slot.kind) {
    case 'callArg': {
      if (
        statement.kind !== 'ExpressionStatement' ||
        statement.expression.kind !== 'CallExpression'
      )
        return statement;
      const hasArgument = statement.expression.arguments.some(
        (argument) =>
          argument.kind === 'NamedArgument' &&
          argument.name.toUpperCase() === slot.name.toUpperCase()
      );
      const argumentsList = hasArgument
        ? statement.expression.arguments.map((argument) =>
            argument.kind === 'NamedArgument' &&
            argument.name.toUpperCase() === slot.name.toUpperCase()
              ? { ...argument, value: expression }
              : argument
          )
        : [
            ...statement.expression.arguments,
            {
              kind: 'NamedArgument',
              name: slot.name,
              value: expression,
              span,
            } as NamedArgument,
          ];
      return { ...statement, expression: { ...statement.expression, arguments: argumentsList } };
    }
    case 'ifCondition': {
      if (statement.kind !== 'IfStatement') return statement;
      const branchIndex = slot.branchIndex ?? 0;
      return {
        ...statement,
        branches: statement.branches.map((branch, index) =>
          index === branchIndex ? { ...branch, condition: expression } : branch
        ),
      };
    }
    case 'forEachIterable':
      return statement.kind === 'ForEachStatement'
        ? { ...statement, iterable: expression }
        : statement;
    case 'returnValue':
      return statement.kind === 'ReturnStatement' ? { ...statement, value: expression } : statement;
    case 'templateDefault': {
      if (statement.kind !== 'FunctionStatement' || !statement.template) return statement;
      const template = statement.template.map((piece, index) =>
        index === slot.pieceIndex ? { ...piece, defaultExpression: expression } : piece
      );
      return { ...statement, template };
    }
  }
};

export const setExpressionAtLocation = (
  statement: Statement,
  location: ExpressionLocation,
  replacement: Expression
): Statement => {
  const root =
    getRootExpression(statement, location.slot) ?? ({ kind: 'NothingLiteral', span } as Expression);
  return setRootExpression(
    statement,
    location.slot,
    replaceExpressionAtPath(root, location.expressionPath, replacement)
  );
};

export const updateExpressionAtLocation = (
  statement: Statement,
  location: ExpressionLocation,
  update: (expression: Expression) => Expression
): Statement => {
  const root =
    getRootExpression(statement, location.slot) ?? ({ kind: 'NothingLiteral', span } as Expression);
  const current = location.expressionPath.reduce<Expression | undefined>((expression, step) => {
    if (!expression) return undefined;
    switch (step.kind) {
      case 'lambdaBody':
        return expression.kind === 'LambdaExpression' && expression.body.kind !== 'BlockStatement'
          ? expression.body
          : undefined;
      case 'binaryLeft':
        return expression.kind === 'BinaryExpression' ? expression.left : undefined;
      case 'binaryRight':
        return expression.kind === 'BinaryExpression' ? expression.right : undefined;
      case 'unaryOperand':
        return expression.kind === 'UnaryExpression' ? expression.operand : undefined;
      case 'listItem':
        return expression.kind === 'ListExpression' ? expression.items[step.index] : undefined;
      case 'indexObject':
        return expression.kind === 'IndexExpression' ? expression.object : undefined;
      case 'indexValue':
        return expression.kind === 'IndexExpression' ? expression.index : undefined;
      case 'callArgument':
        return expression.kind === 'CallExpression'
          ? expression.arguments[step.index]?.value
          : undefined;
      case 'chainArgument': {
        const link = decomposeChain(expression)[step.linkIndex];
        return link?.type === 'method' ? link.args[step.argumentIndex]?.value : undefined;
      }
      case 'chainBase': {
        const base = decomposeChain(expression)[0];
        return base?.type === 'base' ? base.expr : undefined;
      }
    }
  }, root);
  return current ? setExpressionAtLocation(statement, location, update(current)) : statement;
};
