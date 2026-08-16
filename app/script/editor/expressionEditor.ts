import type { CallArgument, Expression, NamedArgument, Statement } from '../lang/ast';
import { emptySpan } from '../lang/ast';
import type { DefinedFunction } from './InsertModal';

export type ExpressionSlot =
  | { kind: 'callArg'; name: string }
  | { kind: 'ifCondition'; branchIndex?: number }
  | { kind: 'forEachIterable' }
  | { kind: 'returnValue' }
  | { kind: 'templateDefault'; pieceIndex: number }
  | { kind: 'updateCellPlayers' }
  | { kind: 'updateCellDayIndex' }
  | { kind: 'updateCellValue' }
  | { kind: 'updateCellColumn' };

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
      case 'OnTagAddedStatement':
        return {
          ...statement,
          body: {
            ...statement.body,
            statements: renameIdentifierInStatements(statement.body.statements, from, to),
          },
        };
      case 'OnTagRemovedStatement':
        return {
          ...statement,
          body: {
            ...statement.body,
            statements: renameIdentifierInStatements(statement.body.statements, from, to),
          },
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
    case 'updateCellPlayers':
      return statement.kind === 'UpdateCellStatement' ? statement.players : undefined;
    case 'updateCellDayIndex':
      return statement.kind === 'UpdateCellStatement'
        ? (statement.dayIndex ?? undefined)
        : undefined;
    case 'updateCellValue':
      return statement.kind === 'UpdateCellStatement' ? statement.updateValue : undefined;
    case 'updateCellColumn':
      return statement.kind === 'UpdateCellStatement' ? statement.column : undefined;
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
    case 'updateCellPlayers':
      return statement.kind === 'UpdateCellStatement'
        ? { ...statement, players: expression }
        : statement;
    case 'updateCellDayIndex':
      return statement.kind === 'UpdateCellStatement'
        ? { ...statement, dayIndex: expression }
        : statement;
    case 'updateCellValue':
      return statement.kind === 'UpdateCellStatement'
        ? { ...statement, updateValue: expression }
        : statement;
    case 'updateCellColumn':
      return statement.kind === 'UpdateCellStatement'
        ? { ...statement, column: expression }
        : statement;
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

/* ──────────────────────────────────────────────────────────────────────────
 * Entry source tracing — determines what "source" of data an expression
 * evaluates to (e.g. "players", "day", "roles") so .entry() autocomplete
 * can suggest the right keys even through function calls and chains.
 * ────────────────────────────────────────────────────────────────────────── */

/** Known transitions: .entry("X") on source S → sub-source. */
export const ENTRY_SOURCE_TRANSITIONS: Record<string, Record<string, string>> = {
  players: { days: 'day' },
  currentplayer: { days: 'day' },
  placeduser: { days: 'day' },
};

/** Global data sources — identifiers that are their own source. */
const GLOBAL_DATA_SOURCES = new Set([
  'players',
  'currentplayer',
  'placeduser',
  'roles',
  'schedule',
  'profiles',
  'daydates',
  'inputs',
  'inputswithdata',
]);

/** Apply an .entry(key) transition to a source. Returns the new source or undefined. */
export const applyEntryTransition = (
  source: string | undefined,
  key: string
): string | undefined => {
  if (!source) return undefined;
  return ENTRY_SOURCE_TRANSITIONS[source]?.[key.toLowerCase()];
};

/** Methods that preserve the element source (array → element). */
const SOURCE_PRESERVING_METHODS = new Set(['index', 'filter', 'sort', 'first', 'last']);

/** Methods that return a non-object (number/string/boolean). */
const SOURCE_DROPPING_METHODS = new Set(['length', 'count', 'join', 'contains']);

interface TraceContext {
  varSources: Record<string, string>;
  inputSources: Record<string, string>;
  definedFunctions: DefinedFunction[];
}

/** Find the return expression from a function body (searches nested blocks). */
const findReturnExpression = (statements: Statement[]): Expression | undefined => {
  for (let i = statements.length - 1; i >= 0; i--) {
    const stmt = statements[i];
    if (stmt.kind === 'ReturnStatement' && stmt.value) return stmt.value;
    if (stmt.kind === 'IfStatement') {
      for (let j = stmt.branches.length - 1; j >= 0; j--) {
        const found = findReturnExpression(stmt.branches[j].body.statements);
        if (found) return found;
      }
      if (stmt.elseBody) {
        const found = findReturnExpression(stmt.elseBody.statements);
        if (found) return found;
      }
    }
    if (stmt.kind === 'ForEachStatement') {
      const found = findReturnExpression(stmt.body.statements);
      if (found) return found;
    }
  }
  return undefined;
};

/** Trace a single chain method link to determine the resulting source. */
const traceMethodSource = (
  link: ChainLink,
  currentSource: string | undefined,
  ctx: TraceContext
): string | undefined => {
  if (link.type !== 'method') return currentSource;
  const name = link.name.toLowerCase();

  // .entry("X") → look up transition
  if (name === 'entry') {
    if (!currentSource) return undefined;
    const keyArg = link.args[0];
    if (keyArg && keyArg.value.kind === 'StringLiteral') {
      const key = keyArg.value.value.toLowerCase();
      return ENTRY_SOURCE_TRANSITIONS[currentSource]?.[key];
    }
    return undefined;
  }

  // .map(lambda) → trace lambda body
  if (name === 'map') {
    if (!currentSource) return undefined;
    const lambdaArg = link.args[0];
    if (lambdaArg && lambdaArg.value.kind === 'LambdaExpression') {
      const lambda = lambdaArg.value;
      const param = lambda.parameters[0] || 'Item';
      const body = lambda.body;
      // Lambda parameter gets the element source (same as array element source)
      const lambdaCtx: TraceContext = {
        ...ctx,
        varSources: { ...ctx.varSources, [param]: currentSource },
      };
      // Lambda body can be a BlockStatement (not an Expression) — skip those
      if (body.kind === 'BlockStatement') return undefined;
      return traceEntrySource(body, lambdaCtx);
    }
    return undefined;
  }

  // Methods that drop the source (return primitives)
  if (SOURCE_DROPPING_METHODS.has(name)) return undefined;

  // Methods that preserve the source (index, filter, sort, first, last)
  if (SOURCE_PRESERVING_METHODS.has(name)) return currentSource;

  return undefined;
};

/** Trace an expression to determine its entry source. */
export const traceEntrySource = (
  expr: Expression | undefined,
  ctx: TraceContext
): string | undefined => {
  if (!expr) return undefined;

  switch (expr.kind) {
    case 'IdentifierExpression':
      // Check local variables first, then fall back to global data sources
      if (expr.name in ctx.varSources) return ctx.varSources[expr.name];
      if (GLOBAL_DATA_SOURCES.has(expr.name.toLowerCase())) return expr.name.toLowerCase();
      return undefined;

    case 'CallExpression': {
      // Function call to a defined function
      if (expr.callee.kind === 'IdentifierExpression') {
        const fnName = expr.callee.name;
        const fnDef = ctx.definedFunctions.find((f) => f.name === fnName);
        if (fnDef?.bodyStatements) {
          // Build parameter sources from actual arguments
          const paramSources: Record<string, string> = {};
          fnDef.parameters.forEach((param, index) => {
            const arg = expr.arguments[index];
            if (arg) {
              const source = traceEntrySource(arg.value, ctx);
              if (source) paramSources[param] = source;
            }
          });
          // Fall back to template defaults for params without arg sources
          const templateInputs = fnDef.template?.filter((p) => p.kind === 'input') ?? [];
          templateInputs.forEach((input, index) => {
            const param = fnDef.parameters[index];
            if (param && !(param in paramSources) && input.defaultExpression) {
              const source = traceEntrySource(input.defaultExpression, ctx);
              if (source) paramSources[param] = source;
            }
          });
          // Also include variables defined inside the function body
          // (e.g. Variable statements)
          const bodyVarSources = { ...paramSources };
          for (const stmt of fnDef.bodyStatements) {
            if (
              stmt.kind === 'ExpressionStatement' &&
              stmt.expression.kind === 'CallExpression' &&
              stmt.expression.callee.kind === 'IdentifierExpression' &&
              stmt.expression.callee.name.toLowerCase() === 'variable'
            ) {
              const nameArg = stmt.expression.arguments.find(
                (a) => a.kind === 'NamedArgument' && a.name.toLowerCase() === 'name'
              );
              const valueArg = stmt.expression.arguments.find(
                (a) => a.kind === 'NamedArgument' && a.name.toLowerCase() === 'value'
              );
              if (nameArg && valueArg && nameArg.value.kind === 'StringLiteral') {
                const source = traceEntrySource(valueArg.value, {
                  ...ctx,
                  varSources: bodyVarSources,
                });
                if (source) bodyVarSources[nameArg.value.value] = source;
              }
            }
          }
          // Trace the return expression
          const returnExpr = findReturnExpression(fnDef.bodyStatements);
          if (returnExpr) {
            return traceEntrySource(returnExpr, { ...ctx, varSources: bodyVarSources });
          }
        }
        // Fall back to pre-computed returnEntrySource
        return fnDef?.returnEntrySource;
      }

      // Chain (MemberExpression callee) — decompose and trace
      const chain = decomposeChain(expr);
      if (chain.length > 1) {
        return traceChainSource(chain, ctx);
      }
      return undefined;
    }

    case 'MemberExpression': {
      const chain = decomposeChain(expr);
      if (chain.length > 1) {
        return traceChainSource(chain, ctx);
      }
      return undefined;
    }

    default:
      return undefined;
  }
};

/** Trace a chain (base + method links) to determine the resulting source. */
const traceChainSource = (chain: ChainLink[], ctx: TraceContext): string | undefined => {
  const base = chain[0];
  if (base.type !== 'base') return undefined;

  // Handle InputsWithData.entry("X") specially
  if (
    base.expr.kind === 'IdentifierExpression' &&
    base.expr.name.toLowerCase() === 'inputswithdata'
  ) {
    for (let i = 1; i < chain.length; i++) {
      const link = chain[i];
      if (link.type === 'method' && link.name.toLowerCase() === 'entry') {
        const keyArg = link.args[0];
        if (keyArg && keyArg.value.kind === 'StringLiteral') {
          const key = keyArg.value.value.toLowerCase();
          let source: string | undefined = ctx.inputSources[key];
          for (let j = i + 1; j < chain.length; j++) {
            source = traceMethodSource(chain[j], source, ctx);
          }
          return source;
        }
      }
    }
    return undefined;
  }

  // Handle Inputs.entry("X") — returns the raw value, trace from input source
  if (base.expr.kind === 'IdentifierExpression' && base.expr.name.toLowerCase() === 'inputs') {
    for (let i = 1; i < chain.length; i++) {
      const link = chain[i];
      if (link.type === 'method' && link.name.toLowerCase() === 'entry') {
        const keyArg = link.args[0];
        if (keyArg && keyArg.value.kind === 'StringLiteral') {
          const key = keyArg.value.value.toLowerCase();
          // Inputs.entry("X") returns the raw selected value (e.g. player name string)
          // The source is the input's source, but the value is a primitive (string)
          // So .entry() on it won't have keys — return undefined
          let source: string | undefined;
          // For Inputs, the value is a primitive, not an object
          // So we don't set a source — .entry() won't autocomplete
          source = undefined;
          for (let j = i + 1; j < chain.length; j++) {
            source = traceMethodSource(chain[j], source, ctx);
          }
          return source;
        }
      }
    }
    return undefined;
  }

  // Regular chain tracing
  let source = traceEntrySource(base.expr, ctx);
  for (let i = 1; i < chain.length; i++) {
    source = traceMethodSource(chain[i], source, ctx);
  }
  return source;
};
