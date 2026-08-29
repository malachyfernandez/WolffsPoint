import type { CallArgument, Expression, FunctionTemplatePiece, Statement } from '../lang/ast';
import type { ExpressionBlockDef } from '../registry';
import { EXPRESSION_BLOCKS } from '../registry';
import { ENTRY_SOURCE_TRANSITIONS, decomposeChain, type ChainLink } from './expressionEditor';

/**
 * A simplified type system for the script editor.
 * Used to determine which expression blocks can be applied to a given receiver.
 */
export type ScriptType =
  | 'list' // an array of items
  | 'object' // a runtime object with keyed fields
  | 'string'
  | 'number'
  | 'boolean'
  | 'any' // unknown or mixed type
  | 'nothing'; // nothing/null

/**
 * The entryKeysBySource map. Most keys map to a list of field names.
 * The special `__fieldTypes` key maps to a record of "source.field" → ScriptType.
 */
export type EntryKeysBySource = Record<string, string[]> & {
  __fieldTypes?: Record<string, string>;
};

/** Minimal shape of a defined function needed for return-type tracing. */
interface DefinedFunctionLike {
  name: string;
  parameters: string[];
  template?: FunctionTemplatePiece[];
  bodyStatements?: Statement[];
  returnEntrySource?: string;
}

/** Options for type inference — provides the context needed to trace sources. */
export interface InferTypeOptions {
  /** Map of input label → data source name (from CreateSelectInput LIST args). */
  inputSources?: Record<string, string>;
  /** Map of variable name → source name (lambda params, ForEach items, etc.). */
  variableSources?: Record<string, string>;
  /** Defined functions in the script (for tracing return types). */
  definedFunctions?: DefinedFunctionLike[];
}

/** Convert an `appliesTo` value from ExpressionBlockDef to a ScriptType. */
export const appliesToType = (appliesTo: ExpressionBlockDef['appliesTo']): ScriptType => {
  if (appliesTo === 'list') return 'list';
  if (appliesTo === 'number') return 'number';
  if (appliesTo === 'string') return 'string';
  return 'any';
};

/** Check if a block's appliesTo type is compatible with a receiver type.
 * 'any' appliesTo means it works on anything. */
export const isCompatible = (receiverType: ScriptType, blockAppliesTo: ScriptType): boolean => {
  if (blockAppliesTo === 'any') return true;
  if (receiverType === 'any') return true;
  return receiverType === blockAppliesTo;
};

/** Infer the type of a data source by name.
 * Uses the entryKeysBySource map to determine if a source is a list, object, etc. */
export const inferDataSourceType = (
  name: string,
  entryKeysBySource: EntryKeysBySource
): ScriptType => {
  const lower = name.toLowerCase();
  // Known list sources
  const listSources = new Set(['players', 'roles', 'daydates', 'profiles']);
  if (listSources.has(lower)) return 'list';
  // Known scalar sources
  if (lower === 'currentday' || lower === 'placedday') return 'number';
  if (lower === 'placedtag' || lower === 'placedcolumn') return 'string';
  if (lower === 'schedule') return 'object';
  if (lower === 'placeduser' || lower === 'currentplayer') return 'object';
  // Inputs / InputsWithData are special markers — not plain lists
  if (lower === 'inputs' || lower === 'inputswithdata') return 'any';
  // Check entryKeysBySource — if it has keys, it could be an object or list of objects
  const keys = entryKeysBySource[name] ?? entryKeysBySource[lower];
  if (keys !== undefined) {
    return 'any';
  }
  return 'any';
};

/** Look up the type of a field on a data source using __fieldTypes metadata.
 * e.g. fieldSourceType(entryKeysBySource, 'players', 'days') → 'list' */
export const fieldSourceType = (
  entryKeysBySource: EntryKeysBySource,
  sourceName: string,
  fieldName: string
): ScriptType | undefined => {
  const fieldTypes = entryKeysBySource.__fieldTypes;
  if (!fieldTypes) return undefined;
  // Try exact match, then case-insensitive
  const key = `${sourceName}.${fieldName}`;
  const type =
    fieldTypes[key] ?? fieldTypes[`${sourceName.toLowerCase()}.${fieldName.toLowerCase()}`];
  if (type === 'list') return 'list';
  if (type === 'object') return 'object';
  if (type === 'string') return 'string';
  if (type === 'number') return 'number';
  if (type === 'boolean') return 'boolean';
  return undefined;
};

/** Infer the result type of an expression block when applied to a receiver.
 * Most blocks return the same type as their category suggests. */
export const inferBlockResultType = (
  block: ExpressionBlockDef,
  receiverType: ScriptType
): ScriptType => {
  // List operations that return lists
  if (block.id === 'filter' || block.id === 'map' || block.id === 'sort') return 'list';
  // List operations that return scalars
  if (block.id === 'length' || block.id === 'count') return 'number';
  // first/last/get return an element — object when receiver is a list of objects
  if (block.id === 'first' || block.id === 'last' || block.id === 'get') {
    if (receiverType === 'list') return 'object';
    return 'any';
  }
  if (block.id === 'join') return 'string';
  if (block.id === 'contains') return 'boolean';
  // Math operations
  if (block.category === 'math') return 'number';
  // String operations
  if (block.category === 'string') {
    if (block.id === 'startsWith' || block.id === 'endsWith') return 'boolean';
    return 'string';
  }
  // entry returns whatever the field is — could be anything
  if (block.id === 'entry') return 'any';
  if (block.id === 'index') return 'any';
  // Properties
  if (block.id === 'toNumber') return 'number';
  if (block.id === 'toString') return 'string';
  return 'any';
};

/* ──────────────────────────────────────────────────────────────────────────
 * Source-tracing type inference
 *
 * The type system walks expression chains tracking both a ScriptType and a
 * "source name" (e.g. "players", "day", "roles"). The source name lets us
 * look up field types via __fieldTypes and follow ENTRY_SOURCE_TRANSITIONS
 * so that e.g. players.entry("days").first().entry("vote") resolves to
 * 'string'.
 * ────────────────────────────────────────────────────────────────────────── */

/** Global data source identifiers → their source name (lowercased). */
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
  'currentday',
  'placedday',
  'placedtag',
  'placedcolumn',
]);

/** Map a source name to its base ScriptType (the type of the source itself). */
const sourceBaseType = (source: string, entryKeysBySource: EntryKeysBySource): ScriptType => {
  const lower = source.toLowerCase();
  if (lower === 'players' || lower === 'roles' || lower === 'daydates' || lower === 'profiles')
    return 'list';
  if (lower === 'currentday' || lower === 'placedday') return 'number';
  if (lower === 'placedtag' || lower === 'placedcolumn') return 'string';
  if (lower === 'schedule' || lower === 'currentplayer' || lower === 'placeduser') return 'object';
  // 'day' source: a single day object (reached via players.entry("days"))
  if (lower === 'day') return 'object';
  // Inputs / InputsWithData are special markers
  if (lower === 'inputs' || lower === 'inputswithdata') return 'any';
  // Unknown source with entry keys → treat as object
  const keys = entryKeysBySource[source] ?? entryKeysBySource[lower];
  if (keys && keys.length > 0) return 'object';
  return 'any';
};

/** Map a list source name to the ScriptType of its ELEMENTS.
 * Used for .first()/.last()/.get()/.index() on a list. */
const sourceElementType = (
  source: string | undefined,
  entryKeysBySource: EntryKeysBySource
): ScriptType => {
  if (!source) return 'any';
  const lower = source.toLowerCase();
  // Object-list sources: elements are objects
  if (
    lower === 'players' ||
    lower === 'currentplayer' ||
    lower === 'placeduser' ||
    lower === 'roles' ||
    lower === 'day'
  )
    return 'object';
  if (lower === 'daydates') return 'string';
  if (lower === 'profiles') return 'any';
  // If the source has entry keys, elements are likely objects
  const keys = entryKeysBySource[source] ?? entryKeysBySource[lower];
  if (keys && keys.length > 0) return 'object';
  return 'any';
};

interface TypeCtx {
  entryKeysBySource: EntryKeysBySource;
  inputSources: Record<string, string>;
  variableSources: Record<string, string>;
  definedFunctions?: DefinedFunctionLike[];
}

interface TypeInfo {
  type: ScriptType;
  source: string | undefined;
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

/** Check if a statement is a Variable({ NAME = "x", VALUE = ... }) call. */
const extractVariableStatement = (
  stmt: Statement
): { name: string; valueExpr: Expression } | undefined => {
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
      return { name: nameArg.value.value, valueExpr: valueArg.value };
    }
  }
  return undefined;
};

/** Infer the type of a function call by tracing through the function body. */
const inferFunctionCallType = (expr: Expression, ctx: TypeCtx): TypeInfo => {
  if (expr.kind !== 'CallExpression' || expr.callee.kind !== 'IdentifierExpression') {
    return { type: 'any', source: undefined };
  }
  const fnName = expr.callee.name;
  // Built-in: tag() returns a string
  if (fnName.toLowerCase() === 'tag') return { type: 'string', source: undefined };
  // Built-in: Var() returns any
  if (fnName.toLowerCase() === 'var') return { type: 'any', source: undefined };

  const fnDef = ctx.definedFunctions?.find((f) => f.name === fnName);
  if (!fnDef?.bodyStatements) return { type: 'any', source: undefined };

  // Build parameter sources from actual call arguments
  const paramSources: Record<string, string> = {};
  fnDef.parameters.forEach((param, index) => {
    const arg = expr.arguments[index];
    if (arg) {
      const argInfo = inferBaseType(arg.value, ctx);
      if (argInfo.source) paramSources[param] = argInfo.source;
    }
  });
  // Fall back to template defaults for params without arg sources
  const templateInputs = fnDef.template?.filter((p) => p.kind === 'input') ?? [];
  templateInputs.forEach((input, index) => {
    const param = fnDef.parameters[index];
    if (param && !(param in paramSources) && input.defaultExpression) {
      const defInfo = inferBaseType(input.defaultExpression, ctx);
      if (defInfo.source) paramSources[param] = defInfo.source;
    }
  });
  // Include variables defined inside the function body
  const bodyVarSources = { ...paramSources };
  for (const stmt of fnDef.bodyStatements) {
    const variable = extractVariableStatement(stmt);
    if (variable) {
      const vInfo = inferBaseType(variable.valueExpr, {
        ...ctx,
        variableSources: bodyVarSources,
      });
      if (vInfo.source) bodyVarSources[variable.name] = vInfo.source;
    }
  }
  // Trace the return expression
  const returnExpr = findReturnExpression(fnDef.bodyStatements);
  if (returnExpr) {
    return inferBaseType(returnExpr, { ...ctx, variableSources: bodyVarSources });
  }
  return { type: 'any', source: undefined };
};

/** Infer the TypeInfo of a base expression (not a chain). */
const inferBaseType = (expr: Expression, ctx: TypeCtx): TypeInfo => {
  switch (expr.kind) {
    case 'StringLiteral':
    case 'MarkdownLiteral':
      return { type: 'string', source: undefined };
    case 'NumberLiteral':
      return { type: 'number', source: undefined };
    case 'BooleanLiteral':
      return { type: 'boolean', source: undefined };
    case 'NothingLiteral':
      return { type: 'nothing', source: undefined };
    case 'ListExpression':
      return { type: 'list', source: undefined };
    case 'ListLiteral':
      return { type: 'list', source: undefined };
    case 'DropdownLiteral':
      return { type: 'string', source: undefined };
    case 'IdentifierExpression': {
      const name = expr.name;
      // Context variable with a known source (lambda param, ForEach item)
      if (name in ctx.variableSources) {
        const source = ctx.variableSources[name];
        if (source) {
          // Lambda params / ForEach items are ELEMENTS of the list source
          return { type: sourceElementType(source, ctx.entryKeysBySource), source };
        }
        return { type: 'any', source: undefined };
      }
      // Global data source
      if (GLOBAL_DATA_SOURCES.has(name.toLowerCase())) {
        const source = name.toLowerCase();
        return { type: sourceBaseType(source, ctx.entryKeysBySource), source };
      }
      return { type: 'any', source: undefined };
    }
    case 'CallExpression': {
      // Function call with identifier callee (e.g. myFunc(players), tag("X"))
      if (expr.callee.kind === 'IdentifierExpression') {
        return inferFunctionCallType(expr, ctx);
      }
      // Chain (MemberExpression callee) — decompose and walk
      const chain = decomposeChain(expr);
      if (chain.length > 1) return inferChainType(chain, ctx);
      return { type: 'any', source: undefined };
    }
    case 'MemberExpression': {
      const chain = decomposeChain(expr);
      if (chain.length > 1) return inferChainType(chain, ctx);
      return { type: 'any', source: undefined };
    }
    case 'BinaryExpression': {
      const op = expr.operator;
      if (['==', '!=', '>', '<', '>=', '<=', 'AND', 'OR'].includes(op))
        return { type: 'boolean', source: undefined };
      if (['+', '-', '*', '/', '%'].includes(op)) return { type: 'number', source: undefined };
      return { type: 'any', source: undefined };
    }
    case 'UnaryExpression': {
      if (expr.operator === 'NOT' || expr.operator === 'ISTRUTHY' || expr.operator === 'ISFALSY')
        return { type: 'boolean', source: undefined };
      return { type: 'any', source: undefined };
    }
    case 'IndexExpression':
      return { type: 'any', source: undefined };
    case 'LambdaExpression':
      return { type: 'any', source: undefined };
    default:
      return { type: 'any', source: undefined };
  }
};

/** Apply a chain method/property link to a TypeInfo, producing the next TypeInfo. */
const applyLink = (link: ChainLink, info: TypeInfo, ctx: TypeCtx): TypeInfo => {
  // Property access (no args) — treat as a method with empty args
  if (link.type === 'property') {
    return applyMethod(link.name, [], info, ctx);
  }
  if (link.type === 'method') {
    return applyMethod(link.name, link.args, info, ctx);
  }
  return info;
};

/** Apply a method call to the current TypeInfo. */
const applyMethod = (
  name: string,
  args: CallArgument[],
  info: TypeInfo,
  ctx: TypeCtx
): TypeInfo => {
  const lower = name.toLowerCase();

  // .entry("X") — field access on an object
  if (lower === 'entry') {
    const keyArg = args[0];
    if (keyArg && keyArg.value.kind === 'StringLiteral') {
      const field = keyArg.value.value;
      // Transition the source (e.g. players.entry("days") → source "day")
      const newSource = info.source
        ? ENTRY_SOURCE_TRANSITIONS[info.source]?.[field.toLowerCase()]
        : undefined;
      // Look up the field type via __fieldTypes
      const fieldType = info.source
        ? fieldSourceType(ctx.entryKeysBySource, info.source, field)
        : undefined;
      return { type: fieldType ?? 'any', source: newSource };
    }
    return { type: 'any', source: undefined };
  }

  // .first()/.last()/.get() — element of a list
  if (lower === 'first' || lower === 'last' || lower === 'get') {
    if (info.type === 'list') {
      return { type: sourceElementType(info.source, ctx.entryKeysBySource), source: info.source };
    }
    return { type: 'any', source: undefined };
  }

  // .index(position) — element at position (like first/get)
  if (lower === 'index') {
    if (info.type === 'list') {
      return { type: sourceElementType(info.source, ctx.entryKeysBySource), source: info.source };
    }
    return { type: 'any', source: undefined };
  }

  // .filter()/.sort() — preserve list + source
  if (lower === 'filter' || lower === 'sort') {
    if (info.type === 'list' || info.type === 'any') {
      return { type: 'list', source: info.source };
    }
    return { type: 'any', source: undefined };
  }

  // .map(lambda) — list of lambda body types
  if (lower === 'map') {
    if (info.type === 'list' || info.type === 'any') {
      const lambdaArg = args[0];
      if (lambdaArg && lambdaArg.value.kind === 'LambdaExpression') {
        const lambda = lambdaArg.value;
        const param = lambda.parameters[0] || 'Item';
        const body = lambda.body;
        if (body.kind !== 'BlockStatement') {
          // Trace lambda body with param bound to the element source
          const lambdaCtx: TypeCtx = {
            ...ctx,
            variableSources: { ...ctx.variableSources, [param]: info.source ?? '' },
          };
          const bodyInfo = inferBaseType(body, lambdaCtx);
          // .map() returns a list; the source is the body's source (for further tracing)
          return { type: 'list', source: bodyInfo.source };
        }
      }
      return { type: 'list', source: info.source };
    }
    return { type: 'any', source: undefined };
  }

  // .count()/.length() — number
  if (lower === 'count' || lower === 'length') return { type: 'number', source: undefined };
  // .join() — string
  if (lower === 'join') return { type: 'string', source: undefined };
  // .contains() — boolean
  if (lower === 'contains') return { type: 'boolean', source: undefined };

  // Math/string/other blocks — use inferBlockResultType
  const block = EXPRESSION_BLOCKS.find((b) => b.name.toLowerCase() === lower);
  if (block) return { type: inferBlockResultType(block, info.type), source: undefined };

  return { type: 'any', source: undefined };
};

/** Walk a chain (base + method/property links) to determine the resulting TypeInfo. */
const inferChainType = (chain: ChainLink[], ctx: TypeCtx): TypeInfo => {
  const base = chain[0];
  if (base.type !== 'base') return { type: 'any', source: undefined };

  // InputsWithData.entry("X") — resolve to the input's data source
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
          const inputSource = ctx.inputSources[key];
          if (inputSource) {
            // InputsWithData.entry("X") returns the selected object (single-select)
            // or array of objects (multi-select). Default to element type (single-select).
            const type = sourceElementType(inputSource, ctx.entryKeysBySource);
            let info: TypeInfo = { type, source: inputSource };
            for (let j = i + 1; j < chain.length; j++) {
              info = applyLink(chain[j], info, ctx);
            }
            return info;
          }
        }
      }
    }
    return { type: 'any', source: undefined };
  }

  // Inputs.entry("X") — raw selected value (primitive string or array of strings)
  if (base.expr.kind === 'IdentifierExpression' && base.expr.name.toLowerCase() === 'inputs') {
    for (let i = 1; i < chain.length; i++) {
      const link = chain[i];
      if (link.type === 'method' && link.name.toLowerCase() === 'entry') {
        // After .entry("X"), the value is a primitive — source undefined
        let info: TypeInfo = { type: 'any', source: undefined };
        for (let j = i + 1; j < chain.length; j++) {
          info = applyLink(chain[j], info, ctx);
        }
        return info;
      }
    }
    return { type: 'any', source: undefined };
  }

  // Regular chain: trace base, then apply each link
  let info = inferBaseType(base.expr, ctx);
  for (let i = 1; i < chain.length; i++) {
    info = applyLink(chain[i], info, ctx);
  }
  return info;
};

/** Infer the type of an expression based on its AST structure.
 * This is a best-effort inference — it doesn't evaluate the expression,
 * just looks at its shape and traces data sources through chains. */
export const inferExpressionType = (
  expr: Expression,
  entryKeysBySource: EntryKeysBySource,
  contextVariables: string[] = [],
  options?: InferTypeOptions
): ScriptType => {
  const ctx: TypeCtx = {
    entryKeysBySource,
    inputSources: options?.inputSources ?? {},
    variableSources: options?.variableSources ?? {},
    definedFunctions: options?.definedFunctions,
  };
  // Chains (MemberExpression or CallExpression with MemberExpression callee)
  if (
    expr.kind === 'MemberExpression' ||
    (expr.kind === 'CallExpression' && expr.callee.kind === 'MemberExpression')
  ) {
    const chain = decomposeChain(expr);
    if (chain.length > 1) return inferChainType(chain, ctx).type;
  }
  // Function call with identifier callee
  if (expr.kind === 'CallExpression' && expr.callee.kind === 'IdentifierExpression') {
    return inferFunctionCallType(expr, ctx).type;
  }
  return inferBaseType(expr, ctx).type;
};

/** Infer the receiver type for a chain insert/swap operation.
 * Given the chain up to the insertion point, determine what type the
 * next block would receive. */
export const inferChainReceiverType = (
  chainExpr: Expression | undefined,
  linkIndex: number,
  entryKeysBySource: Record<string, string[]>,
  contextVariables: string[] = [],
  options?: InferTypeOptions
): ScriptType => {
  if (!chainExpr) return 'any';
  // For inserts at the end (linkIndex beyond chain), use the full expression type
  const fullType = inferExpressionType(chainExpr, entryKeysBySource, contextVariables, options);
  if (linkIndex <= 1) return fullType;
  // For inserts in the middle, decompose and walk up to the insertion point
  const ctx: TypeCtx = {
    entryKeysBySource,
    inputSources: options?.inputSources ?? {},
    variableSources: options?.variableSources ?? {},
    definedFunctions: options?.definedFunctions,
  };
  const chain = decomposeChain(chainExpr);
  if (linkIndex >= chain.length) return fullType;
  // Walk up to linkIndex (exclusive) to get the receiver type at that point
  const subChain = chain.slice(0, linkIndex);
  const baseLink = subChain[0];
  if (subChain.length <= 1)
    return inferBaseType(baseLink?.type === 'base' ? baseLink.expr : chainExpr, ctx).type;
  return inferChainType(subChain, ctx).type;
};

/** Human-readable description of a ScriptType. */
export const describeType = (type: ScriptType): string => {
  switch (type) {
    case 'list':
      return 'a list';
    case 'object':
      return 'an object';
    case 'string':
      return 'text';
    case 'number':
      return 'a number';
    case 'boolean':
      return 'true/false';
    case 'nothing':
      return 'nothing';
    default:
      return 'any value';
  }
};

/** Explain why a block can't be applied to a receiver of the given type. */
export const explainIncompatibility = (
  receiverType: ScriptType,
  block: ExpressionBlockDef
): string | undefined => {
  const blockType = appliesToType(block.appliesTo);
  if (isCompatible(receiverType, blockType)) return undefined;
  const receiverDesc = describeType(receiverType);
  const blockDesc = describeType(blockType);
  return `Requires ${blockDesc}, but the current value is ${receiverDesc}`;
};
