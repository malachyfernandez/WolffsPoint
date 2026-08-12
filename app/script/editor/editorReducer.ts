import type {
  CallArgument,
  CallExpression,
  Expression,
  PositionalArgument,
  Script,
  Statement,
} from '../lang/ast';
import { emptySpan } from '../lang/ast';
import { EXPRESSION_BLOCKS } from '../registry';
import {
  decomposeChain,
  recomposeChain,
  setExpressionAtLocation,
  updateExpressionAtLocation,
  renameIdentifierInStatements,
  type ChainLink,
  type ExpressionLocation,
} from './expressionEditor';

export interface EditorState {
  ast: Script;
  past: Script[];
  future: Script[];
}

export type EditorAction =
  | { type: 'INSERT_STATEMENT'; statement: Statement; path: number[] }
  | { type: 'REPLACE_STATEMENT'; statement: Statement; path: number[] }
  | {
      type: 'SET_EXPRESSION';
      location: ExpressionLocation;
      expression: Expression;
      trackHistory?: boolean;
    }
  | { type: 'REPLACE_CHAIN_BASE'; location: ExpressionLocation; expression: Expression }
  | {
      type: 'INSERT_CHAIN_LINK_AT';
      location: ExpressionLocation;
      linkIndex: number;
      blockId: string;
    }
  | {
      type: 'REPLACE_CHAIN_LINK_AT';
      location: ExpressionLocation;
      linkIndex: number;
      blockId?: string;
    }
  | {
      type: 'SET_STATEMENT_FIELD';
      path: number[];
      field: 'name' | 'parameters' | 'itemName';
      value: string | string[];
    }
  | { type: 'DELETE_STATEMENT'; path: number[] }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'REPLACE_AST'; ast: Script };

const span = emptySpan();

export const createScript = (): Script => ({
  kind: 'Script',
  statements: [],
  diagnostics: [],
  span,
});

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const getBodyStatements = (stmt: Statement): Statement[] => {
  switch (stmt.kind) {
    case 'IfStatement':
      return stmt.branches[0]?.body.statements ?? stmt.elseBody?.statements ?? [];
    case 'ForEachStatement':
      return stmt.body.statements;
    case 'FunctionStatement':
      return stmt.body.statements;
    case 'BlockStatement':
      return stmt.statements;
    default:
      return [];
  }
};

const withBodyStatements = (stmt: Statement, newBody: Statement[]): Statement => {
  switch (stmt.kind) {
    case 'IfStatement': {
      if (stmt.branches.length > 0) {
        const branches = clone(stmt.branches);
        branches[0] = { ...branches[0], body: { ...branches[0].body, statements: newBody } };
        return { ...stmt, branches };
      }
      if (stmt.elseBody) {
        return { ...stmt, elseBody: { ...stmt.elseBody, statements: newBody } };
      }
      return stmt;
    }
    case 'ForEachStatement':
      return { ...stmt, body: { ...stmt.body, statements: newBody } };
    case 'FunctionStatement':
      return { ...stmt, body: { ...stmt.body, statements: newBody } };
    case 'BlockStatement':
      return { ...stmt, statements: newBody };
    default:
      return stmt;
  }
};

const insertStatementInList = (
  statements: Statement[],
  path: number[],
  newStmt: Statement
): Statement[] => {
  if (path.length === 0) return [...statements, newStmt];
  if (path.length === 1) {
    const result = [...statements];
    result.splice(path[0], 0, newStmt);
    return result;
  }
  const idx = path[0];
  const parent = statements[idx];
  if (!parent) return [...statements, newStmt];
  const innerStatements = getBodyStatements(parent);
  const newInner = insertStatementInList(innerStatements, path.slice(1), newStmt);
  const newParent = withBodyStatements(parent, newInner);
  const result = [...statements];
  result[idx] = newParent;
  return result;
};

const deleteStatementInList = (statements: Statement[], path: number[]): Statement[] => {
  if (path.length === 0) return statements;
  if (path.length === 1) {
    const result = [...statements];
    result.splice(path[0], 1);
    return result;
  }
  const idx = path[0];
  const parent = statements[idx];
  if (!parent) return statements;
  const innerStatements = getBodyStatements(parent);
  const newInner = deleteStatementInList(innerStatements, path.slice(1));
  const newParent = withBodyStatements(parent, newInner);
  const result = [...statements];
  result[idx] = newParent;
  return result;
};

const getStatementAtPath = (statements: Statement[], path: number[]): Statement | undefined => {
  if (path.length === 0) return undefined;
  if (path.length === 1) return statements[path[0]];
  const parent = statements[path[0]];
  if (!parent) return undefined;
  return getStatementAtPath(getBodyStatements(parent), path.slice(1));
};

const replaceStatementAtPath = (
  statements: Statement[],
  path: number[],
  newStmt: Statement
): Statement[] => {
  if (path.length === 0) return statements;
  if (path.length === 1) {
    const result = [...statements];
    result[path[0]] = newStmt;
    return result;
  }
  const idx = path[0];
  const parent = statements[idx];
  if (!parent) return statements;
  const innerStatements = getBodyStatements(parent);
  const newInner = replaceStatementAtPath(innerStatements, path.slice(1), newStmt);
  const newParent = withBodyStatements(parent, newInner);
  const result = [...statements];
  result[idx] = newParent;
  return result;
};

export const parseLiteralValue = (value: string): Expression => {
  const trimmed = value.trim();
  if (trimmed === 'true') return { kind: 'BooleanLiteral', value: true, span };
  if (trimmed === 'false') return { kind: 'BooleanLiteral', value: false, span };
  if (trimmed === 'nothing') return { kind: 'NothingLiteral', span };
  const num = Number(trimmed);
  if (trimmed !== '' && !Number.isNaN(num)) return { kind: 'NumberLiteral', value: num, span };
  if (trimmed.startsWith('"') || trimmed.startsWith("'")) {
    const inner = trimmed.replace(/^["']|["']$/g, '');
    return { kind: 'StringLiteral', value: inner, span };
  }
  if (/^[A-Za-z_][A-Za-z0-9_.]*$/.test(trimmed)) {
    return { kind: 'IdentifierExpression', name: trimmed, span };
  }
  return { kind: 'StringLiteral', value, span };
};

/** Build default positional args for a method link based on its registry inputs. */
export const buildDefaultMethodArgs = (name: string): CallArgument[] => {
  const def = EXPRESSION_BLOCKS.find((b) => b.id.toLowerCase() === name.toLowerCase());
  if (!def) return [];
  return def.inputs.map((input): PositionalArgument => {
    let value: Expression;
    switch (input.type) {
      case 'lambda':
        value = {
          kind: 'LambdaExpression',
          parameters: ['Item'],
          body: { kind: 'NothingLiteral', span },
          span,
        };
        break;
      case 'number':
        value =
          typeof input.default === 'number'
            ? { kind: 'NumberLiteral', value: input.default, span }
            : { kind: 'NothingLiteral', span };
        break;
      case 'boolean':
        value = { kind: 'NothingLiteral', span };
        break;
      case 'string':
        value = {
          kind: 'StringLiteral',
          value: typeof input.default === 'string' ? input.default : '',
          span,
        };
        break;
      case 'markdown':
        value = {
          kind: 'MarkdownLiteral',
          value: typeof input.default === 'string' ? input.default : '',
          span,
        };
        break;
      default:
        value = { kind: 'NothingLiteral', span };
    }
    return { kind: 'PositionalArgument', value, span };
  });
};

/** Adjust the arity of all call expressions to `fnName` to match `targetCount`. */
const syncFunctionCallArity = (
  statements: Statement[],
  fnName: string,
  targetCount: number
): Statement[] => {
  if (!fnName) return statements;
  const syncExpression = (expression: Expression): Expression => {
    switch (expression.kind) {
      case 'CallExpression': {
        const callee = syncExpression(expression.callee);
        const args = expression.arguments.map((argument) => ({
          ...argument,
          value: syncExpression(argument.value),
        }));
        if (
          callee.kind === 'IdentifierExpression' &&
          callee.name === fnName &&
          args.length !== targetCount
        ) {
          const positional = args.filter((a) => a.kind === 'PositionalArgument');
          if (positional.length === args.length) {
            while (positional.length < targetCount) {
              positional.push({
                kind: 'PositionalArgument' as const,
                value: { kind: 'NothingLiteral' as const, span },
                span,
              });
            }
            positional.length = targetCount;
            return {
              ...expression,
              callee,
              arguments: positional,
            };
          }
        }
        return { ...expression, callee, arguments: args };
      }
      case 'BinaryExpression':
        return {
          ...expression,
          left: syncExpression(expression.left),
          right: syncExpression(expression.right),
        };
      case 'UnaryExpression':
        return { ...expression, operand: syncExpression(expression.operand) };
      case 'MemberExpression':
        return { ...expression, object: syncExpression(expression.object) };
      case 'IndexExpression':
        return {
          ...expression,
          object: syncExpression(expression.object),
          index: syncExpression(expression.index),
        };
      case 'ListExpression':
        return { ...expression, items: expression.items.map(syncExpression) };
      case 'LambdaExpression':
        if (expression.body.kind === 'BlockStatement') return expression;
        return { ...expression, body: syncExpression(expression.body) };
      default:
        return expression;
    }
  };
  return statements.map((statement): Statement => {
    switch (statement.kind) {
      case 'ExpressionStatement':
        return { ...statement, expression: syncExpression(statement.expression) };
      case 'IfStatement':
        return {
          ...statement,
          branches: statement.branches.map((branch) => ({
            ...branch,
            condition: syncExpression(branch.condition),
            body: {
              ...branch.body,
              statements: syncFunctionCallArity(branch.body.statements, fnName, targetCount),
            },
          })),
          elseBody: statement.elseBody
            ? {
                ...statement.elseBody,
                statements: syncFunctionCallArity(
                  statement.elseBody.statements,
                  fnName,
                  targetCount
                ),
              }
            : undefined,
        };
      case 'ForEachStatement':
        return {
          ...statement,
          iterable: syncExpression(statement.iterable),
          body: {
            ...statement.body,
            statements: syncFunctionCallArity(statement.body.statements, fnName, targetCount),
          },
        };
      case 'FunctionStatement':
        return {
          ...statement,
          body: {
            ...statement.body,
            statements: syncFunctionCallArity(statement.body.statements, fnName, targetCount),
          },
        };
      case 'ReturnStatement':
        return statement.value
          ? { ...statement, value: syncExpression(statement.value) }
          : statement;
      default:
        return statement;
    }
  });
};

/** Create a chain link (method or property) from a registry block id. */
export const makeLinkFromBlockId = (blockId: string): ChainLink => {
  const def = EXPRESSION_BLOCKS.find((b) => b.id.toLowerCase() === blockId.toLowerCase());
  if (def?.isProperty) return { type: 'property', name: def.name };
  return { type: 'method', name: def?.name ?? blockId, args: buildDefaultMethodArgs(blockId) };
};

export const createCallStatement = (
  name: string,
  args: Record<string, Expression | undefined>
): Statement => {
  const argumentsList: CallArgument[] = Object.entries(args)
    .filter(([, v]) => v !== undefined)
    .map(([argName, value]) => ({
      kind: 'NamedArgument' as const,
      name: argName,
      value: value as Expression,
      span,
    }));
  const call: CallExpression = {
    kind: 'CallExpression',
    callee: { kind: 'IdentifierExpression', name, span },
    arguments: argumentsList,
    span,
  };
  return { kind: 'ExpressionStatement', expression: call, span };
};

export const createIfStatement = (condition: Expression, body: Statement[] = []): Statement => ({
  kind: 'IfStatement',
  branches: [
    {
      condition,
      body: { kind: 'BlockStatement', statements: body, span },
      span,
    },
  ],
  span,
});

export const createForEachStatement = (
  itemName: string,
  iterable: Expression,
  body: Statement[] = []
): Statement => ({
  kind: 'ForEachStatement',
  itemName,
  iterable,
  body: { kind: 'BlockStatement', statements: body, span },
  span,
});

export const createFunctionStatement = (
  name: string,
  parameters: string[],
  body: Statement[] = [{ kind: 'ReturnStatement', value: { kind: 'NothingLiteral', span }, span }]
): Statement => ({
  kind: 'FunctionStatement',
  name,
  parameters,
  body: { kind: 'BlockStatement', statements: body, span },
  span,
});

export const initialState = (ast: Script): EditorState => ({
  ast,
  past: [],
  future: [],
});

export const editorReducer = (state: EditorState, action: EditorAction): EditorState => {
  switch (action.type) {
    case 'INSERT_STATEMENT': {
      const newStatements = insertStatementInList(
        state.ast.statements,
        action.path,
        action.statement
      );
      const newAst = { ...state.ast, statements: newStatements };
      return {
        ast: newAst,
        past: [...state.past, state.ast].slice(-50),
        future: [],
      };
    }
    case 'REPLACE_STATEMENT': {
      const statements = replaceStatementAtPath(
        state.ast.statements,
        action.path,
        action.statement
      );
      return {
        ast: { ...state.ast, statements },
        past: [...state.past, state.ast].slice(-50),
        future: [],
      };
    }
    case 'SET_EXPRESSION': {
      const statement = getStatementAtPath(state.ast.statements, action.location.statementPath);
      if (!statement) return state;
      const nextStatement = setExpressionAtLocation(statement, action.location, action.expression);

      // Detect Variable block NAME change and rename references
      let statements = replaceStatementAtPath(
        state.ast.statements,
        action.location.statementPath,
        nextStatement
      );
      if (
        action.location.slot.kind === 'callArg' &&
        action.location.slot.name.toUpperCase() === 'NAME' &&
        statement.kind === 'ExpressionStatement' &&
        statement.expression.kind === 'CallExpression' &&
        statement.expression.callee.kind === 'IdentifierExpression' &&
        statement.expression.callee.name.toUpperCase() === 'VARIABLE' &&
        action.expression.kind === 'StringLiteral'
      ) {
        const oldNameArg = statement.expression.arguments.find(
          (a) => a.kind === 'NamedArgument' && a.name.toUpperCase() === 'NAME'
        );
        const oldName =
          oldNameArg &&
          oldNameArg.kind === 'NamedArgument' &&
          oldNameArg.value.kind === 'StringLiteral'
            ? oldNameArg.value.value.replace(/[^a-zA-Z0-9_]/g, '').replace(/^[0-9]/, '_$&')
            : '';
        const newName = action.expression.value
          .replace(/[^a-zA-Z0-9_]/g, '')
          .replace(/^[0-9]/, '_$&');
        if (oldName && newName && oldName !== newName) {
          statements = renameIdentifierInStatements(statements, oldName, newName);
        }
      }

      return action.trackHistory
        ? {
            ast: { ...state.ast, statements },
            past: [...state.past, state.ast].slice(-50),
            future: [],
          }
        : { ...state, ast: { ...state.ast, statements } };
    }
    case 'REPLACE_CHAIN_BASE': {
      const statement = getStatementAtPath(state.ast.statements, action.location.statementPath);
      if (!statement) return state;
      const nextStatement = updateExpressionAtLocation(statement, action.location, (expression) => {
        const chain = decomposeChain(expression);
        return recomposeChain(
          chain.map((link, index) =>
            index === 0 ? { type: 'base', expr: action.expression } : link
          )
        );
      });
      const statements = replaceStatementAtPath(
        state.ast.statements,
        action.location.statementPath,
        nextStatement
      );
      return {
        ast: { ...state.ast, statements },
        past: [...state.past, state.ast].slice(-50),
        future: [],
      };
    }
    case 'INSERT_CHAIN_LINK_AT': {
      const statement = getStatementAtPath(state.ast.statements, action.location.statementPath);
      if (!statement) return state;
      const nextStatement = updateExpressionAtLocation(statement, action.location, (expression) => {
        const chain = decomposeChain(expression);
        chain.splice(action.linkIndex, 0, makeLinkFromBlockId(action.blockId));
        return recomposeChain(chain);
      });
      const statements = replaceStatementAtPath(
        state.ast.statements,
        action.location.statementPath,
        nextStatement
      );
      return {
        ast: { ...state.ast, statements },
        past: [...state.past, state.ast].slice(-50),
        future: [],
      };
    }
    case 'REPLACE_CHAIN_LINK_AT': {
      const statement = getStatementAtPath(state.ast.statements, action.location.statementPath);
      if (!statement) return state;
      const nextStatement = updateExpressionAtLocation(statement, action.location, (expression) => {
        const chain = decomposeChain(expression);
        if (action.blockId) chain.splice(action.linkIndex, 1, makeLinkFromBlockId(action.blockId));
        else chain.splice(action.linkIndex, 1);
        return recomposeChain(chain);
      });
      const statements = replaceStatementAtPath(
        state.ast.statements,
        action.location.statementPath,
        nextStatement
      );
      return {
        ast: { ...state.ast, statements },
        past: [...state.past, state.ast].slice(-50),
        future: [],
      };
    }
    case 'SET_STATEMENT_FIELD': {
      const statement = getStatementAtPath(state.ast.statements, action.path);
      if (!statement) return state;
      let nextStatement = statement;
      let extraStatements = state.ast.statements;
      if (statement.kind === 'FunctionStatement') {
        if (action.field === 'name' && typeof action.value === 'string') {
          const oldName = statement.name;
          nextStatement = { ...statement, name: action.value };
          // Rename all call sites that reference the old function name.
          if (oldName && oldName !== action.value) {
            const replaced = replaceStatementAtPath(
              state.ast.statements,
              action.path,
              nextStatement
            );
            extraStatements = renameIdentifierInStatements(replaced, oldName, action.value);
          }
        }
        if (action.field === 'parameters' && Array.isArray(action.value)) {
          const bodyStatements =
            action.value.length === statement.parameters.length
              ? statement.parameters.reduce(
                  (statements, parameter, index) =>
                    action.value[index] && action.value[index] !== parameter
                      ? renameIdentifierInStatements(statements, parameter, action.value[index])
                      : statements,
                  statement.body.statements
                )
              : statement.body.statements;
          nextStatement = {
            ...statement,
            parameters: action.value,
            body: { ...statement.body, statements: bodyStatements },
          };
          // Sync the arity of all call sites to this function.
          if (action.value.length !== statement.parameters.length) {
            const replaced = replaceStatementAtPath(
              state.ast.statements,
              action.path,
              nextStatement
            );
            extraStatements = syncFunctionCallArity(replaced, statement.name, action.value.length);
          }
        }
      } else if (
        statement.kind === 'ForEachStatement' &&
        action.field === 'itemName' &&
        typeof action.value === 'string'
      ) {
        nextStatement = { ...statement, itemName: action.value };
      }
      const statements =
        extraStatements !== state.ast.statements
          ? extraStatements
          : replaceStatementAtPath(state.ast.statements, action.path, nextStatement);
      return {
        ast: { ...state.ast, statements },
        past: [...state.past, state.ast].slice(-50),
        future: [],
      };
    }
    case 'DELETE_STATEMENT': {
      const newStatements = deleteStatementInList(state.ast.statements, action.path);
      return {
        ...state,
        ast: { ...state.ast, statements: newStatements },
        past: [...state.past, state.ast].slice(-50),
        future: [],
      };
    }
    case 'UNDO': {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        ...state,
        ast: previous,
        past: state.past.slice(0, -1),
        future: [state.ast, ...state.future].slice(0, 50),
      };
    }
    case 'REDO': {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        ...state,
        ast: next,
        past: [...state.past, state.ast].slice(-50),
        future: state.future.slice(1),
      };
    }
    case 'REPLACE_AST':
      return { ...state, ast: action.ast, past: [...state.past, state.ast].slice(-50), future: [] };
    default:
      return state;
  }
};
