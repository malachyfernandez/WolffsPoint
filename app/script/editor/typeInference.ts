import type { Expression } from '../lang/ast';
import type { ExpressionBlockDef } from '../registry';
import { EXPRESSION_BLOCKS } from '../registry';

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
  const listSources = new Set([
    'players',
    'roles',
    'daydates',
    'profiles',
    'inputs',
    'inputswithdata',
  ]);
  if (listSources.has(lower)) return 'list';
  // Known scalar sources
  if (lower === 'currentday' || lower === 'placedday') return 'number';
  if (lower === 'placedtag' || lower === 'placedcolumn') return 'string';
  if (lower === 'schedule') return 'object';
  if (lower === 'placeduser' || lower === 'currentplayer') return 'object';
  // Check entryKeysBySource — if it has keys, it could be an object or list of objects
  const keys = entryKeysBySource[name] ?? entryKeysBySource[lower];
  if (keys !== undefined) {
    // If the source name is in the map and has keys, it could be a list of objects
    // (like 'players') or a single object. We check known list sources above.
    // For unknown sources with keys, default to 'any'.
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
  _receiverType: ScriptType
): ScriptType => {
  // List operations that return lists
  if (block.id === 'filter' || block.id === 'map' || block.id === 'sort') return 'list';
  // List operations that return scalars
  if (block.id === 'length' || block.id === 'count') return 'number';
  if (block.id === 'first' || block.id === 'last' || block.id === 'get') return 'any'; // depends on list contents
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

/** Infer the type of an expression based on its AST structure.
 * This is a best-effort inference — it doesn't evaluate the expression,
 * just looks at its shape. */
export const inferExpressionType = (
  expr: Expression,
  entryKeysBySource: EntryKeysBySource,
  contextVariables: string[] = []
): ScriptType => {
  switch (expr.kind) {
    case 'StringLiteral':
    case 'MarkdownLiteral':
      return 'string';
    case 'NumberLiteral':
      return 'number';
    case 'BooleanLiteral':
      return 'boolean';
    case 'NothingLiteral':
      return 'nothing';
    case 'ListExpression':
      return 'list';
    case 'DropdownLiteral':
      return 'string';
    case 'IdentifierExpression': {
      // Check if it's a context variable (could be anything)
      if (contextVariables.includes(expr.name)) return 'any';
      // Check data sources
      return inferDataSourceType(expr.name, entryKeysBySource);
    }
    case 'MemberExpression': {
      // e.g. players.entry("days") — infer the object type, then the property
      const objType = inferExpressionType(expr.object, entryKeysBySource, contextVariables);
      // For .entry("field"), look up the field type in __fieldTypes
      if (expr.property === 'entry') {
        // Find the "key" argument — it's the first positional arg in the call
        // But MemberExpression doesn't have args; the CallExpression wrapper does.
        // Here we just know it's an .entry() property — the result type depends
        // on the key argument, which we handle in CallExpression below.
        return 'any';
      }
      // For .length, it's number. For .first/.last on a list, it's the item type.
      const block = EXPRESSION_BLOCKS.find((b) => b.name === expr.property);
      if (block) return inferBlockResultType(block, objType);
      return 'any';
    }
    case 'CallExpression': {
      // e.g. players.filter(...) returns a list, players.length returns number
      const callee = expr.callee;
      if (callee.kind === 'MemberExpression') {
        const objType = inferExpressionType(callee.object, entryKeysBySource, contextVariables);
        // Special case: .entry("fieldName") — look up the field type
        if (callee.property === 'entry') {
          const keyArg = expr.arguments.find((a) => a.kind === 'PositionalArgument');
          if (
            keyArg &&
            keyArg.kind === 'PositionalArgument' &&
            keyArg.value.kind === 'StringLiteral'
          ) {
            const fieldName = keyArg.value.value;
            // Try to get the source name from the base expression
            const baseExpr = callee.object;
            if (baseExpr.kind === 'IdentifierExpression') {
              const fieldType = fieldSourceType(entryKeysBySource, baseExpr.name, fieldName);
              if (fieldType) return fieldType;
            }
            // For chained access like players.first().entry("days"),
            // the base is a CallExpression (players.first()).
            // .first() on a list of players returns a player object,
            // so .entry("days") on it returns a list.
            if (baseExpr.kind === 'CallExpression' && baseExpr.callee.kind === 'MemberExpression') {
              const innerMethod = baseExpr.callee.property;
              if (innerMethod === 'first' || innerMethod === 'last' || innerMethod === 'get') {
                // The base of the first/last/get is the list source
                const listBase = baseExpr.callee.object;
                if (listBase.kind === 'IdentifierExpression') {
                  const fieldType = fieldSourceType(entryKeysBySource, listBase.name, fieldName);
                  if (fieldType) return fieldType;
                }
              }
              // Also handle .filter()/.map() which return lists, then .first()
              // players.filter(...).first().entry("days") → list
              if (innerMethod === 'first' || innerMethod === 'last' || innerMethod === 'get') {
                const innerBase = baseExpr.callee.object;
                if (
                  innerBase.kind === 'CallExpression' &&
                  innerBase.callee.kind === 'MemberExpression' &&
                  (innerBase.callee.property === 'filter' ||
                    innerBase.callee.property === 'map' ||
                    innerBase.callee.property === 'sort')
                ) {
                  const listSource = innerBase.callee.object;
                  if (listSource.kind === 'IdentifierExpression') {
                    const fieldType = fieldSourceType(
                      entryKeysBySource,
                      listSource.name,
                      fieldName
                    );
                    if (fieldType) return fieldType;
                  }
                }
              }
            }
          }
        }
        // .first()/.last()/.get() on a known list source returns an object
        if (
          (callee.property === 'first' || callee.property === 'last') &&
          callee.object.kind === 'IdentifierExpression'
        ) {
          const sourceType = inferDataSourceType(callee.object.name, entryKeysBySource);
          if (sourceType === 'list') return 'object';
        }
        if (callee.property === 'get' && callee.object.kind === 'IdentifierExpression') {
          const sourceType = inferDataSourceType(callee.object.name, entryKeysBySource);
          if (sourceType === 'list') return 'object';
        }
        // .filter()/.map()/.sort() on a list source returns a list
        if (
          (callee.property === 'filter' ||
            callee.property === 'map' ||
            callee.property === 'sort') &&
          callee.object.kind === 'IdentifierExpression'
        ) {
          const sourceType = inferDataSourceType(callee.object.name, entryKeysBySource);
          if (sourceType === 'list') return 'list';
        }
        const block = EXPRESSION_BLOCKS.find((b) => b.name === callee.property);
        if (block) return inferBlockResultType(block, objType);
      }
      // Function calls — can't infer without knowing the function
      return 'any';
    }
    case 'BinaryExpression': {
      // Comparisons return boolean, arithmetic returns number
      const op = expr.operator;
      if (['==', '!=', '>', '<', '>=', '<=', 'AND', 'OR'].includes(op)) return 'boolean';
      if (['+', '-', '*', '/', '%'].includes(op)) return 'number';
      return 'any';
    }
    case 'UnaryExpression': {
      if (expr.operator === 'NOT' || expr.operator === 'ISTRUTHY' || expr.operator === 'ISFALSY')
        return 'boolean';
      return 'any';
    }
    case 'IndexExpression': {
      // Indexing a list returns an item
      return 'any';
    }
    case 'LambdaExpression':
      return 'any';
    default:
      return 'any';
  }
};

/** Infer the receiver type for a chain insert/swap operation.
 * Given the chain up to the insertion point, determine what type the
 * next block would receive. */
export const inferChainReceiverType = (
  chainExpr: Expression | undefined,
  linkIndex: number,
  entryKeysBySource: Record<string, string[]>,
  contextVariables: string[] = []
): ScriptType => {
  if (!chainExpr) return 'any';
  // Decompose the chain to find the type at the insertion point
  // We walk through the chain links and track the type
  const exprType = inferExpressionType(chainExpr, entryKeysBySource, contextVariables);
  // For chain insert at linkIndex, the receiver is the expression up to that point
  // Since we don't decompose here, we just return the full expression type
  // if inserting at the end, or 'any' if inserting in the middle
  if (linkIndex <= 1) return exprType;
  return 'any';
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
