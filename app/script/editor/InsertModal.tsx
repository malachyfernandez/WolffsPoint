import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Pressable, View, TextInput } from 'react-native';
import { X } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SavedFunction } from 'hooks/useSavedFunctions';
import ConvexDialog from '../../components/ui/dialog/ConvexDialog';
import UnsavedChangesDialog from '../../components/ui/dialog/UnsavedChangesDialog';
import ShadowScrollView from '../../components/ui/ShadowScrollView';
import Column from '../../components/layout/Column';
import { useTooltip } from './useTooltip';
import Row from '../../components/layout/Row';
import FontText from '../../components/ui/text/FontText';
import AppButton from '../../components/ui/buttons/AppButton';
import { CloseButton } from '../../components/game/markdownEditor';
import type { BinaryOperator, Expression, FunctionTemplatePiece, Statement } from '../lang/ast';
import { emptySpan } from '../lang/ast';
import { parseScript } from '../lang/parser';
import { printStatement } from '../lang/printer';
import type { InputType } from '../registry';
import { STATEMENT_BLOCKS, EXPRESSION_BLOCKS } from '../registry';
import { useValue } from 'hooks/useData';
import { getGameScopedKey } from 'utils/multiplayer';
import type { TagDefinitionsData } from '../../components/game/TagCellEditor';
import {
  buildDefaultMethodArgs,
  createCallStatement,
  createForEachStatement,
  createFunctionStatement,
  createIfStatement,
  createOnTagAddedStatement,
  createOnTagRemovedStatement,
  createUpdateCellStatement,
  createTriggerUpdateCellStatement,
  parseLiteralValue,
} from './editorReducer';
import type { ExpressionLocation } from './expressionEditor';
import { BlockPreview } from './Canvas';
import {
  inferExpressionType,
  inferBlockResultType,
  appliesToType,
  isCompatible,
  explainIncompatibility,
  type ScriptType,
} from './typeInference';

export type InsertKind = 'statement' | 'expression' | 'chainInsert' | 'chainSwap';

export interface InsertTarget {
  kind: InsertKind;
  mode?: 'insert' | 'swap';
  swapLabel?: string;
  path?: number[];
  location?: ExpressionLocation;
  replaceMode?: 'whole' | 'chainBase';
  expectedType?: InputType;
  contextVariables?: string[];
  /** Map of variable name → data source name (lambda params, ForEach items).
   *  Used by type inference to type context variables accurately. */
  variableSources?: Record<string, string>;
  /** Map of input label → data source name (from CreateSelectInput LIST args).
   *  Used by type inference to resolve InputsWithData.entry("X") types. */
  inputSources?: Record<string, string>;
  linkIndex?: number;
  /** The current chain expression (for chainInsert/chainSwap) — used to infer
   * the receiver type so we can show which blocks are compatible. */
  chainExpression?: Expression;
}

export interface DefinedFunction {
  name: string;
  parameters: string[];
  template?: FunctionTemplatePiece[];
  bodyStatements?: Statement[];
  returnEntrySource?: string;
}

interface InsertModalProps {
  isOpen: boolean;
  target: InsertTarget | null;
  definedVariables: string[];
  definedFunctions: DefinedFunction[];
  /** Map of data source name → available keys (for type inference and .entry dropdowns) */
  entryKeysBySource?: Record<string, string[]>;
  onInsertStatement: (statement: Statement, path: number[], replace?: boolean) => void;
  onInsertExpression: (expression: Expression, target: InsertTarget) => void;
  onInsertChainLink: (target: InsertTarget, blockId: string) => void;
  onInsertBuiltinFunction: (
    fnStatement: Statement,
    callExpression: Expression,
    target: InsertTarget
  ) => void;
  onRemove: (target: InsertTarget) => void;
  /** When true, built-in functions are hidden (used in sub-editors like template input) */
  hideBuiltinFunctions?: boolean;
  /** When true, input-creating blocks (select, text, number, checkbox) are hidden.
   *  Used for tag trigger scripts which have no input state storage. */
  hideInputs?: boolean;
  /** When true, the editor is configured for tag trigger scripts.
   *  Hides irrelevant data sources (currentDay, Inputs, etc.) and shows
   *  trigger-specific ones (placedTag, placedUser, placedDay, placedColumn). */
  isTriggerContext?: boolean;
  /** Game ID, used to load tag definitions for the tag() function picker. */
  gameId?: string;
  /** User-saved functions to show alongside built-in functions. */
  savedFunctions?: SavedFunction[];
  /** Called when the user clicks the X button on a saved function item. */
  onUnsaveFunction?: (name: string) => void;
  onClose: () => void;
}

const span = emptySpan();

/** AsyncStorage key tracking whether the user has seen the built-in function
 * explanation dialog at least once. */
const BUILTIN_INFO_SEEN_KEY = 'script:builtinInfoSeen';

const CONTROL_TEMPLATES: {
  label: string;
  description: string;
  build: () => Statement;
  /** When true, only show at trigger root level. When false, only show in regular context.
   *  When 'inside', only show inside trigger blocks (not at root level).
   *  When undefined, show in both contexts (but not at trigger root level). */
  triggerOnly?: boolean | 'inside';
}[] = [
  {
    label: 'If / Else',
    description: 'Run code when a condition is met',
    build: () => createIfStatement({ kind: 'NothingLiteral', span }),
  },
  {
    label: 'ForEach',
    description: 'Loop through a list',
    build: () => createForEachStatement('Item', parseLiteralValue('players')),
  },
  {
    label: 'Function',
    description: 'Reusable function with a return value',
    build: () => ({
      kind: 'FunctionStatement' as const,
      name: 'fn',
      parameters: [],
      body: {
        kind: 'BlockStatement' as const,
        statements: [
          {
            kind: 'ReturnStatement' as const,
            value: { kind: 'NothingLiteral' as const, span },
            span,
          },
        ],
        span,
      },
      template: [{ kind: 'text' as const, text: 'function' }],
      span,
    }),
  },
  {
    label: 'Return',
    description: 'Return a value from a function',
    build: () => ({ kind: 'ReturnStatement', value: { kind: 'NothingLiteral', span }, span }),
  },
  {
    label: 'On Certify => Update Cell',
    description: 'On certify: loop over cells and update them',
    build: () => createUpdateCellStatement(),
    /** Only shown in regular (non-trigger) scripts */
    triggerOnly: false,
  },
  {
    label: 'Update Cell',
    description: 'Loop over cells and update them',
    build: () => createTriggerUpdateCellStatement(),
    /** Only shown inside trigger blocks (not at root level) */
    triggerOnly: 'inside',
  },
  {
    label: 'On Tag Added',
    description: 'Runs when this tag is added to a cell',
    build: () => createOnTagAddedStatement(),
    /** Only shown in trigger scripts */
    triggerOnly: true,
  },
  {
    label: 'On Tag Removed',
    description: 'Runs when this tag is removed from a cell',
    build: () => createOnTagRemovedStatement(),
    /** Only shown in trigger scripts */
    triggerOnly: true,
  },
];

const DATA_SOURCES: { name: string; description: string }[] = [
  { name: 'players', description: 'All players in the game' },
  { name: 'roles', description: 'All roles in the game' },
  { name: 'currentPlayer', description: 'The player running this script' },
  { name: 'currentDay', description: 'Current day number' },
  { name: 'dayDates', description: 'Dates for each day' },
  { name: 'schedule', description: 'Game schedule' },
  { name: 'profiles', description: 'Player profiles' },
  { name: 'Inputs', description: 'Selected input values (e.g. player name)' },
  {
    name: 'InputsWithData',
    description: 'Full data for selected inputs (e.g. player object with role, email, days)',
  },
];

/** Data sources available in tag trigger scripts. */
const TRIGGER_DATA_SOURCES: { name: string; description: string }[] = [
  { name: 'players', description: 'All players in the game' },
  { name: 'roles', description: 'All roles in the game' },
  { name: 'placedTag', description: 'The tag that was added' },
  { name: 'placedUser', description: 'The player the tag was placed on' },
  {
    name: 'placedDay',
    description: 'The day index the tag was placed on (or nothing for player columns)',
  },
  { name: 'placedColumn', description: 'The column title the tag was placed in' },
];

/**
 * Built-in functions: pre-made function definitions that get appended to the
 * script when first used. They appear in the function list but disappear once
 * a function with the same name already exists in the script.
 */
interface BuiltinFunction {
  name: string;
  description: string;
  /** Source text of the full function definition (parsed to get the AST) */
  source: string;
}

const BUILTIN_FUNCTIONS: BuiltinFunction[] = [
  {
    name: 'dataDaysToday',
    description: 'Player day data relative to today (before/after)',
    source: `Function dataDaysToday(data, days, direction) template(input("data", players), " data ", input("days", 0), " day(s) ", input("direction", Dropdown("before", ["before", "after"])), "today") {
  Variable({ NAME = "targetDay", VALUE = (currentDay + days) });
  If ((direction == "before")) {
    Variable({ NAME = "targetDay", VALUE = (currentDay - days) });
  }
  Return data.Map(Item => Item.entry("days").index(targetDay));
}`,
  },
  {
    name: 'dataOnDay',
    description: 'Player day data for a specific day number',
    source: `Function dataOnDay(data, day) template(input("data", players), " on day ", input("day", 1)) {
  Return data.Map(Item => Item.entry("days").index(day));
}`,
  },
];

/** Parse a built-in function source into its FunctionStatement AST node. */
const parseBuiltinFunction = (source: string): Statement => {
  const ast = parseScript(source);
  return ast.statements[0];
};

/** Build a DefinedFunction from a parsed function source, for preview rendering. */
const buildDefinedFunction = (source: string): DefinedFunction | undefined => {
  const fnStatement = parseBuiltinFunction(source);
  if (fnStatement.kind !== 'FunctionStatement') return undefined;
  return {
    name: fnStatement.name,
    parameters: fnStatement.parameters,
    template: fnStatement.template,
    bodyStatements: fnStatement.body.statements,
  };
};

/** Build a call expression for a built-in function from its source. */
const buildBuiltinCall = (source: string): Expression => {
  const fnStatement = parseBuiltinFunction(source);
  if (fnStatement.kind !== 'FunctionStatement') return { kind: 'NothingLiteral', span };
  const templateInputs = fnStatement.template?.filter((p) => p.kind === 'input') ?? [];
  const args = fnStatement.parameters.map((_, index) => {
    const defaultExpr = templateInputs[index]?.defaultExpression;
    return {
      kind: 'PositionalArgument' as const,
      value: defaultExpr ?? { kind: 'NothingLiteral' as const, span },
      span,
    };
  });
  return {
    kind: 'CallExpression',
    callee: { kind: 'IdentifierExpression', name: fnStatement.name, span },
    arguments: args,
    span,
  };
};

const buildStatementFromRegistry = (id: string): Statement => {
  const definition = STATEMENT_BLOCKS.find((block) => block.id === id);
  if (!definition) return createCallStatement(id, {});
  const args: Record<string, Expression | undefined> = {};
  for (const input of definition.inputs) {
    if (input.type === 'boolean' || input.default === undefined) {
      args[input.name] = { kind: 'NothingLiteral', span };
      continue;
    }
    if (input.type === 'string') {
      args[input.name] = { kind: 'StringLiteral', value: String(input.default), span };
      continue;
    }
    if (input.type === 'markdown') {
      args[input.name] = {
        kind: 'MarkdownLiteral',
        value: String(input.default ?? ''),
        span,
      };
      continue;
    }
    if (input.type === 'number') {
      args[input.name] = { kind: 'NumberLiteral', value: Number(input.default), span };
      continue;
    }
    args[input.name] = parseLiteralValue(String(input.default));
  }
  return createCallStatement(definition.id, args);
};

const sanitizeIdentifier = (value: string) =>
  value.replace(/[^a-zA-Z0-9_]/g, '').replace(/^[0-9]/, '_$&');

const buildVariableReference = (name: string): Expression => ({
  kind: 'IdentifierExpression',
  name: sanitizeIdentifier(name) || 'variable',
  span,
});

const buildFunctionCall = (fn: DefinedFunction): Expression => {
  // If the function has a template, use the default expressions from input pieces
  const templateInputs = fn.template?.filter((p) => p.kind === 'input') ?? [];
  const args = fn.parameters.map((_, index) => {
    const defaultExpr = templateInputs[index]?.defaultExpression;
    return {
      kind: 'PositionalArgument' as const,
      value: defaultExpr ?? { kind: 'NothingLiteral' as const, span },
      span,
    };
  });
  return {
    kind: 'CallExpression',
    callee: { kind: 'IdentifierExpression', name: fn.name, span },
    arguments: args,
    span,
  };
};

const buildMethodExpression = (id: string): Expression => {
  const definition = EXPRESSION_BLOCKS.find((block) => block.id === id);
  if (definition?.isProperty) {
    return {
      kind: 'MemberExpression',
      object: { kind: 'NothingLiteral', span },
      property: definition.name,
      span,
    };
  }
  return {
    kind: 'CallExpression',
    callee: {
      kind: 'MemberExpression',
      object: { kind: 'NothingLiteral', span },
      property: definition?.name ?? id,
      span,
    },
    arguments: buildDefaultMethodArgs(id),
    span,
  };
};

const BOOLEAN_OPERATORS: { label: string; operator: BinaryOperator }[] = [
  { label: 'equals', operator: '==' },
  { label: 'not equal', operator: '!=' },
  { label: 'greater than', operator: '>' },
  { label: 'less than', operator: '<' },
  { label: 'at least', operator: '>=' },
  { label: 'at most', operator: '<=' },
  { label: 'and', operator: 'AND' },
  { label: 'or', operator: 'OR' },
];

const MATH_OPERATORS: { label: string; operator: BinaryOperator; description: string }[] = [
  { label: 'plus', operator: '+', description: 'Add two values' },
  { label: 'minus', operator: '-', description: 'Subtract two values' },
  { label: 'times', operator: '*', description: 'Multiply two values' },
  { label: 'divide', operator: '/', description: 'Divide two values' },
  { label: 'modulo', operator: '%', description: 'Remainder of division' },
];

interface ModalItem {
  label: string;
  description: string;
  category: string;
  onSelect: () => void;
  dividerAfter?: boolean;
  /** When true, handleSelect skips calling onClose (the item manages its own dialog flow) */
  skipCloseOnSelect?: boolean;
  /** When set, the item is shown greyed out and not clickable.
   * The string is shown as a tooltip explaining why it's disabled. */
  disabledReason?: string;
  /** AST node to render as a visual preview (non-interactive). */
  previewStatement?: Statement;
  previewExpression?: Expression;
  /** Additional function definitions needed to render the preview correctly
   * (e.g. the function being previewed, which isn't in the script yet). */
  previewDefinedFunctions?: DefinedFunction[];
  /** When true, the item is highlighted green to indicate it matches a saved function. */
  isSavedMatch?: boolean;
  /** When set, renders an X button in the top-right corner that calls this handler. */
  onUnsave?: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  variable: 'Variables',
  function: 'Functions',
  input: 'Inputs',
  display: 'Display',
  control: 'Control',
  data: 'Data',
  list: 'List',
  string: 'Text',
  boolean: 'Boolean',
  operator: 'Operators',
  math: 'Numbers',
  suggested: 'Suggested',
};

/** Blocks that naturally belong in more than one tab. Each entry duplicates the
 * block into the given secondary category so users find it where they'd look.
 * The block still appears in its primary category (from the registry). */
const CROSS_CATEGORY_BLOCKS: { blockId: string; category: string }[] = [
  // toNumber / toString convert any value — useful from the Data tab too
  { blockId: 'toNumber', category: 'data' },
  { blockId: 'toString', category: 'data' },
  // length works on lists AND text (appliesTo: 'any')
  { blockId: 'length', category: 'string' },
  // contains works on lists AND text (appliesTo: 'any')
  { blockId: 'contains', category: 'string' },
  // index gets an item at a position in a list — also useful from the List tab
  { blockId: 'index', category: 'list' },
];

/** Renders a single modal item. When disabled, shows a hover-following tooltip
 * explaining why (same tooltip system as the script editor canvas). */
const ModalItemRow = ({
  item,
  onSelect,
  entryKeysBySource,
  definedFunctions,
  definedVariables,
  isTriggerContext,
}: {
  item: ModalItem;
  onSelect: () => void;
  entryKeysBySource?: Record<string, string[]>;
  definedFunctions?: DefinedFunction[];
  definedVariables?: string[];
  isTriggerContext?: boolean;
}) => {
  const tooltipId = useId();
  const { setHovered } = useTooltip(tooltipId, item.disabledReason);
  const hasPreview = item.previewStatement || item.previewExpression;
  return (
    <Pressable
      onPress={() => !item.disabledReason && onSelect()}
      onHoverIn={() => item.disabledReason && setHovered(true)}
      onHoverOut={() => setHovered(false)}
      className={`relative border-subtle-border rounded-lg border px-3 py-2 ${
        item.disabledReason
          ? 'opacity-40'
          : item.isSavedMatch
            ? 'border-green-500/40 bg-green-500/5 hover:bg-green-500/10'
            : 'hover:bg-text/5'
      }`}>
      {item.onUnsave && (
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            item.onUnsave?.();
          }}
          className="absolute right-1 top-1 z-10 h-6 w-6 items-center justify-center rounded-full bg-text/10 hover:bg-red-500/20">
          <X size={14} color="rgb(46, 41, 37)" />
        </Pressable>
      )}
      {hasPreview ? (
        <BlockPreview
          statement={item.previewStatement}
          expression={item.previewExpression}
          entryKeysBySource={entryKeysBySource}
          definedFunctions={definedFunctions}
          previewDefinedFunctions={item.previewDefinedFunctions}
          definedVariables={definedVariables}
          isTriggerContext={isTriggerContext}
        />
      ) : (
        <FontText weight="medium" className="text-sm">
          {item.label}
        </FontText>
      )}
      <FontText variant="subtext" className="text-xs">
        {item.disabledReason ?? item.description}
      </FontText>
    </Pressable>
  );
};

const InsertModal = ({
  isOpen,
  target,
  definedVariables,
  definedFunctions,
  entryKeysBySource,
  onInsertStatement,
  onInsertExpression,
  onInsertChainLink,
  onInsertBuiltinFunction,
  hideBuiltinFunctions,
  hideInputs,
  isTriggerContext,
  gameId,
  savedFunctions,
  onUnsaveFunction,
  onRemove,
  onClose,
}: InsertModalProps) => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showBuiltinInfo, setShowBuiltinInfo] = useState(false);
  const [hasSeenBuiltinInfo, setHasSeenBuiltinInfo] = useState(true);
  const [pendingBuiltin, setPendingBuiltin] = useState<{
    fnStatement: Statement;
    callExpression: Expression;
  } | null>(null);
  const [unsaveConfirm, setUnsaveConfirm] = useState<string | null>(null);
  const searchInputRef = useRef<TextInput>(null);

  // Load whether the user has already seen the built-in function explanation.
  // Defaults to true (skip dialog) until storage confirms it hasn't been seen,
  // so returning users never see the dialog flash.
  useEffect(() => {
    AsyncStorage.getItem(BUILTIN_INFO_SEEN_KEY).then((seen) => {
      setHasSeenBuiltinInfo(seen === 'true');
    });
  }, []);

  // Load tag definitions for the tag() function picker
  const tagDefsKey = gameId ? getGameScopedKey('tagDefinitions', gameId) : null;
  const [tagDefs] = useValue<TagDefinitionsData>(tagDefsKey ?? '__no-game__', {
    defaultValue: [],
    privacy: 'PUBLIC',
  });
  const tagDefinitions = tagDefs?.value ?? [];

  // Reset to the first tab + clear search every time the modal opens so a
  // previous session's selection never carries over. Auto-focus the search
  // bar so the user can start typing immediately.
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setActiveCategory(null);
      const timer = setTimeout(() => searchInputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const items = useMemo<ModalItem[]>(() => {
    if (!target) return [];
    if (target.kind === 'statement') {
      // In trigger context at the root level (path length <= 1), only
      // OnTagAdded, OnTagRemoved, and Function blocks are allowed.
      // Everything else must be inside an OnTagAdded/OnTagRemoved block.
      const isTriggerRootLevel = isTriggerContext && (target.path ?? []).length <= 1;

      return [
        ...(isTriggerRootLevel
          ? [] // No statement blocks at trigger root level
          : STATEMENT_BLOCKS.map((block) => ({
              label: block.name,
              description: block.description,
              category: block.category,
              onSelect: () =>
                onInsertStatement(
                  buildStatementFromRegistry(block.id),
                  target.path ?? [],
                  target.mode === 'swap'
                ),
            }))),
        ...CONTROL_TEMPLATES.filter((template) => {
          // OnTagAdded/OnTagRemoved are only available at the trigger root level
          if (template.triggerOnly === true) return isTriggerRootLevel;
          // On Certify is only in non-trigger context
          if (template.triggerOnly === false) return !isTriggerContext;
          // Update Cell (trigger variant) is only inside trigger blocks
          if (template.triggerOnly === 'inside') {
            return isTriggerContext && !isTriggerRootLevel;
          }
          // At trigger root level, only allow Function (OnTag blocks handled above)
          if (isTriggerRootLevel) {
            return template.label === 'Function';
          }
          // Inside trigger blocks, other templates are fine
          return true;
        }).map((template) => ({
          label: template.label,
          description: template.description,
          category: 'control',
          onSelect: () =>
            onInsertStatement(template.build(), target.path ?? [], target.mode === 'swap'),
        })),
      ];
    }
    if (target.kind === 'chainInsert' || target.kind === 'chainSwap') {
      // Infer the receiver type from the current chain expression
      const receiverType: ScriptType = target.chainExpression
        ? inferExpressionType(
            target.chainExpression,
            entryKeysBySource ?? {},
            target.contextVariables ?? [],
            {
              variableSources: target.variableSources,
              inputSources: target.inputSources,
              definedFunctions,
            }
          )
        : 'any';
      const chainExpressionItems = EXPRESSION_BLOCKS.map((block) => {
        const blockType = appliesToType(block.appliesTo);
        const disabledReason = explainIncompatibility(receiverType, block);
        return {
          label: block.name,
          description: block.description,
          category: block.category,
          previewExpression: buildMethodExpression(block.id),
          onSelect: () => onInsertChainLink(target, block.id),
          disabledReason,
        };
      });
      // Binary operators: wrap the current chain expression as the left operand
      // and add a default right operand. This lets users chain e.g.
      // cellContents.toNumber minus 1 without needing to restructure.
      const defaultRightForOperator = (op: BinaryOperator): Expression => {
        if (op === '+' || op === '-' || op === '*' || op === '/' || op === '%')
          return { kind: 'NumberLiteral', value: 0, span };
        return { kind: 'NothingLiteral', span };
      };
      const binaryOperatorItems: ModalItem[] = [
        ...MATH_OPERATORS.map(({ label, operator, description }) => ({
          label,
          description,
          category: 'math',
          previewExpression: {
            kind: 'BinaryExpression' as const,
            operator,
            left: { kind: 'NothingLiteral' as const, span },
            right: defaultRightForOperator(operator),
            span,
          },
          onSelect: () =>
            onInsertExpression(
              {
                kind: 'BinaryExpression',
                operator,
                left: target.chainExpression ?? { kind: 'NothingLiteral', span },
                right: defaultRightForOperator(operator),
                span,
              },
              target
            ),
        })),
        ...BOOLEAN_OPERATORS.map(({ label, operator }) => ({
          label,
          description: operator,
          category: 'operator',
          previewExpression: {
            kind: 'BinaryExpression' as const,
            operator,
            left: { kind: 'NothingLiteral' as const, span },
            right: defaultRightForOperator(operator),
            span,
          },
          onSelect: () =>
            onInsertExpression(
              {
                kind: 'BinaryExpression',
                operator,
                left: target.chainExpression ?? { kind: 'NothingLiteral', span },
                right: defaultRightForOperator(operator),
                span,
              },
              target
            ),
        })),
      ];
      return [...chainExpressionItems, ...binaryOperatorItems];
    }
    const selectExpression = (expression: Expression) => onInsertExpression(expression, target);
    const existingFnNames = new Set(definedFunctions.map((fn) => fn.name));
    // Build a set of printed saved function sources for matching.
    const savedSources = new Set((savedFunctions ?? []).map((s) => s.source.trim()));
    const functionItems = definedFunctions.map((fn) => {
      // Reconstruct the FunctionStatement to print and compare with saved sources.
      const fnStatement: Statement = {
        kind: 'FunctionStatement',
        name: fn.name,
        parameters: fn.parameters,
        template: fn.template,
        body: { kind: 'BlockStatement', statements: fn.bodyStatements ?? [], span },
        span,
      };
      const printed = printStatement(fnStatement).trim();
      const isSavedMatch = savedSources.has(printed);
      return {
        label: `${fn.name}(${fn.parameters.join(', ')})`,
        description: 'Custom function',
        category: 'function',
        previewExpression: buildFunctionCall(fn),
        isSavedMatch,
        onSelect: () => selectExpression(buildFunctionCall(fn)),
      };
    });
    // Built-in functions: only show if not already defined and not hidden
    const builtinItems: ModalItem[] = hideBuiltinFunctions
      ? []
      : BUILTIN_FUNCTIONS.filter((builtin) => !existingFnNames.has(builtin.name)).map(
          (builtin, index, arr) => {
            const fnStatement = parseBuiltinFunction(builtin.source);
            const callExpression = buildBuiltinCall(builtin.source);
            const previewFnDef = buildDefinedFunction(builtin.source);
            return {
              label: builtin.name,
              description: builtin.description,
              category: 'function',
              dividerAfter: index === arr.length - 1,
              skipCloseOnSelect: true,
              previewExpression: callExpression,
              previewDefinedFunctions: previewFnDef ? [previewFnDef] : undefined,
              onSelect: () => {
                setPendingBuiltin({ fnStatement, callExpression });
                if (hasSeenBuiltinInfo) {
                  // Already seen the explanation — insert immediately.
                  onInsertBuiltinFunction(fnStatement, callExpression, target);
                  setPendingBuiltin(null);
                  onClose();
                } else {
                  setShowBuiltinInfo(true);
                }
              },
            };
          }
        );
    // Saved functions: user-saved functions, shown like built-in functions.
    // Only show if not already defined in the current script.
    const savedItems: ModalItem[] = hideBuiltinFunctions
      ? []
      : (savedFunctions ?? [])
          .filter((saved) => !existingFnNames.has(saved.name))
          .map((saved) => {
            const fnStatement = parseBuiltinFunction(saved.source);
            const callExpression = buildBuiltinCall(saved.source);
            const previewFnDef = buildDefinedFunction(saved.source);
            return {
              label: saved.name,
              description: 'Saved function',
              category: 'function',
              skipCloseOnSelect: true,
              previewExpression: callExpression,
              previewDefinedFunctions: previewFnDef ? [previewFnDef] : undefined,
              onUnsave: onUnsaveFunction
                ? () => setUnsaveConfirm(saved.name)
                : undefined,
              onSelect: () => {
                setPendingBuiltin({ fnStatement, callExpression });
                if (hasSeenBuiltinInfo) {
                  onInsertBuiltinFunction(fnStatement, callExpression, target);
                  setPendingBuiltin(null);
                  onClose();
                } else {
                  setShowBuiltinInfo(true);
                }
              },
            };
          });
    const seenVariables = new Set<string>();
    const variableItems: ModalItem[] = [
      ...(target.contextVariables ?? []).filter(Boolean).map((name) => {
        seenVariables.add(name);
        return {
          label: name,
          description: 'Variable',
          category: 'variable',
          previewExpression: { kind: 'IdentifierExpression' as const, name, span },
          onSelect: () => selectExpression({ kind: 'IdentifierExpression', name, span }),
        };
      }),
      ...definedVariables
        .filter((name) => !seenVariables.has(name))
        .map((name) => ({
          label: name,
          description: 'Variable',
          category: 'variable',
          previewExpression: buildVariableReference(name),
          onSelect: () => selectExpression(buildVariableReference(name)),
        })),
    ];
    const entryBlock = EXPRESSION_BLOCKS.find((b) => b.id === 'entry');
    const indexBlock = EXPRESSION_BLOCKS.find((b) => b.id === 'index');
    const otherExpressionBlocks = EXPRESSION_BLOCKS.filter(
      (b) => b.id !== 'entry' && b.id !== 'index'
    );
    const tagExpression: Expression = {
      kind: 'CallExpression',
      callee: { kind: 'IdentifierExpression', name: 'tag', span },
      arguments: [
        {
          kind: 'PositionalArgument' as const,
          value: { kind: 'StringLiteral' as const, value: 'Tag name', span },
          span,
        },
      ],
      span,
    };
    const sharedItems: ModalItem[] = [
      ...functionItems,
      ...builtinItems,
      ...savedItems,
      ...variableItems,
      {
        label: 'tag',
        description: 'Encode a tag name as a tag string',
        category: 'data',
        previewExpression: tagExpression,
        onSelect: () => selectExpression(tagExpression),
      },
      ...(entryBlock
        ? [
            {
              label: entryBlock.name,
              description: entryBlock.description,
              category: 'data',
              previewExpression: buildMethodExpression(entryBlock.id),
              onSelect: () => selectExpression(buildMethodExpression(entryBlock.id)),
            },
          ]
        : []),
      ...(indexBlock
        ? [
            {
              label: indexBlock.name,
              description: indexBlock.description,
              category: 'data',
              previewExpression: buildMethodExpression(indexBlock.id),
              onSelect: () => selectExpression(buildMethodExpression(indexBlock.id)),
              dividerAfter: true,
            },
          ]
        : []),
      ...(isTriggerContext ? TRIGGER_DATA_SOURCES : DATA_SOURCES).map((source) => ({
        label: source.name,
        description: source.description,
        category: 'data',
        previewExpression: { kind: 'IdentifierExpression' as const, name: source.name, span },
        onSelect: () => selectExpression({ kind: 'IdentifierExpression', name: source.name, span }),
      })),
      ...otherExpressionBlocks.map((block) => ({
        label: block.name,
        description: block.description,
        category: block.category,
        previewExpression: buildMethodExpression(block.id),
        onSelect: () => selectExpression(buildMethodExpression(block.id)),
        dividerAfter: block.id === 'sort' || block.id === 'lower',
      })),
      // Cross-category duplicates: blocks that naturally belong in multiple tabs.
      // These are copies of existing items with a different category so users
      // can find them where they'd expect them, regardless of the primary tab.
      ...(CROSS_CATEGORY_BLOCKS.map(({ blockId, category }) => {
        const block = EXPRESSION_BLOCKS.find((b) => b.id === blockId);
        if (!block) return null;
        return {
          label: block.name,
          description: block.description,
          category,
          previewExpression: buildMethodExpression(block.id),
          onSelect: () => selectExpression(buildMethodExpression(block.id)),
        } as ModalItem;
      }).filter((item): item is ModalItem => item !== null)),
    ];
    const booleanItems: ModalItem[] = [
      {
        label: 'true',
        description: 'Boolean',
        category: 'boolean',
        previewExpression: { kind: 'BooleanLiteral' as const, value: true, span },
        onSelect: () => selectExpression({ kind: 'BooleanLiteral', value: true, span }),
      },
      {
        label: 'false',
        description: 'Boolean',
        category: 'boolean',
        previewExpression: { kind: 'BooleanLiteral' as const, value: false, span },
        onSelect: () => selectExpression({ kind: 'BooleanLiteral', value: false, span }),
      },
      {
        label: 'isTruthy',
        description: 'Check if value is truthy',
        category: 'boolean',
        previewExpression: {
          kind: 'UnaryExpression' as const,
          operator: 'ISTRUTHY',
          operand: { kind: 'NothingLiteral' as const, span },
          span,
        },
        onSelect: () =>
          selectExpression({
            kind: 'UnaryExpression',
            operator: 'ISTRUTHY',
            operand: { kind: 'NothingLiteral', span },
            span,
          }),
      },
      {
        label: 'isFalsy',
        description: 'Check if value is falsy',
        category: 'boolean',
        previewExpression: {
          kind: 'UnaryExpression' as const,
          operator: 'ISFALSY',
          operand: { kind: 'NothingLiteral' as const, span },
          span,
        },
        onSelect: () =>
          selectExpression({
            kind: 'UnaryExpression',
            operator: 'ISFALSY',
            operand: { kind: 'NothingLiteral', span },
            span,
          }),
      },
      ...BOOLEAN_OPERATORS.map(({ label, operator }) => ({
        label,
        description: operator,
        category: 'operator',
        dividerAfter: operator === '<=',
        previewExpression: {
          kind: 'BinaryExpression' as const,
          operator,
          left: { kind: 'NothingLiteral' as const, span },
          right: { kind: 'NothingLiteral' as const, span },
          span,
        },
        onSelect: () =>
          selectExpression({
            kind: 'BinaryExpression',
            operator,
            left: { kind: 'NothingLiteral', span },
            right: { kind: 'NothingLiteral', span },
            span,
          }),
      })),
      {
        label: 'not',
        description: 'Negate a boolean',
        category: 'operator',
        previewExpression: {
          kind: 'UnaryExpression' as const,
          operator: 'NOT',
          operand: { kind: 'NothingLiteral' as const, span },
          span,
        },
        onSelect: () =>
          selectExpression({
            kind: 'UnaryExpression',
            operator: 'NOT',
            operand: { kind: 'NothingLiteral', span },
            span,
          }),
      },
    ];
    const mathItems: ModalItem[] = [
      ...MATH_OPERATORS.map(({ label, operator, description }) => ({
        label,
        description,
        category: 'math',
        previewExpression: {
          kind: 'BinaryExpression' as const,
          operator,
          left: { kind: 'NothingLiteral' as const, span },
          right: { kind: 'NothingLiteral' as const, span },
          span,
        },
        onSelect: () =>
          selectExpression({
            kind: 'BinaryExpression',
            operator,
            left: { kind: 'NothingLiteral', span },
            right: { kind: 'NothingLiteral', span },
            span,
          }),
      })),
      {
        label: 'negate',
        description: 'Negate a number',
        category: 'math',
        dividerAfter: true,
        previewExpression: {
          kind: 'UnaryExpression' as const,
          operator: '-',
          operand: { kind: 'NothingLiteral' as const, span },
          span,
        },
        onSelect: () =>
          selectExpression({
            kind: 'UnaryExpression',
            operator: '-',
            operand: { kind: 'NothingLiteral', span },
            span,
          }),
      },
    ];
    if (target.expectedType === 'boolean')
      return [...functionItems, ...builtinItems, ...savedItems, ...variableItems, ...booleanItems];
    return [
      {
        label: '0',
        description: 'Number',
        category: 'math',
        dividerAfter: true,
        previewExpression: { kind: 'NumberLiteral' as const, value: 0, span },
        onSelect: () => selectExpression({ kind: 'NumberLiteral', value: 0, span }),
      },
      {
        label: '"text"',
        description: 'Text',
        category: 'string',
        dividerAfter: true,
        previewExpression: { kind: 'StringLiteral' as const, value: '', span },
        onSelect: () => selectExpression({ kind: 'StringLiteral', value: '', span }),
      },
      {
        label: 'Markdown',
        description: 'Markdown text literal',
        category: 'string',
        previewExpression: { kind: 'MarkdownLiteral' as const, value: '', span },
        onSelect: () => selectExpression({ kind: 'MarkdownLiteral', value: '', span }),
      },
      {
        label: 'Dropdown',
        description: 'Selectable options',
        category: 'string',
        dividerAfter: true,
        previewExpression: {
          kind: 'DropdownLiteral' as const,
          options: ['Option 1', 'Option 2'],
          value: 'Option 1',
          span,
        },
        onSelect: () =>
          selectExpression({
            kind: 'DropdownLiteral',
            options: ['Option 1', 'Option 2'],
            value: 'Option 1',
            span,
          }),
      },
      {
        label: 'List',
        description: 'List of string items',
        category: 'string',
        previewExpression: {
          kind: 'ListLiteral' as const,
          items: ['Item 1', 'Item 2'],
          span,
        },
        onSelect: () =>
          selectExpression({
            kind: 'ListLiteral',
            items: ['Item 1', 'Item 2'],
            span,
          }),
      },
      ...mathItems,
      ...sharedItems,
      ...booleanItems,
    ];
  }, [
    target,
    definedVariables,
    definedFunctions,
    entryKeysBySource,
    onInsertStatement,
    onInsertExpression,
    onInsertChainLink,
    onInsertBuiltinFunction,
    tagDefinitions,
    isTriggerContext,
    hasSeenBuiltinInfo,
    savedFunctions,
    onUnsaveFunction,
    onClose,
  ]);

  // ── Suggested tab ──────────────────────────────────────────────────────
  // Contextual suggestions shown as the first tab for "Add Expression" and
  // "Add Chain Link". Picks ~6 items based on the expected type / receiver
  // type and context (trigger vs regular, available variables, swap value).
  const suggestedItems = useMemo<ModalItem[]>(() => {
    if (!target) return [];
    const isTrigger = isTriggerContext;
    const contextVar = target.contextVariables?.find(Boolean);
    // In swap mode, don't suggest the value being replaced
    const swapLabel = target.mode === 'swap' ? target.swapLabel : undefined;

    let labels: string[];

    if (target.kind === 'chainInsert' || target.kind === 'chainSwap') {
      // Chain link: infer the receiver type to suggest applicable blocks
      const receiverType: ScriptType = target.chainExpression
        ? inferExpressionType(
            target.chainExpression,
            entryKeysBySource ?? {},
            target.contextVariables ?? [],
            {
              variableSources: target.variableSources,
              inputSources: target.inputSources,
              definedFunctions,
            }
          )
        : 'any';
      switch (receiverType) {
        case 'list':
          // On a list: filter/map/first are the most common operations
          labels = ['filter', 'map', 'first', 'length', 'sort', 'contains'];
          break;
        case 'object':
          // On an object: .entry() is the primary operation
          labels = ['entry', 'toString', 'toNumber', 'length', 'contains', 'index'];
          break;
        case 'string':
          labels = ['contains', 'length', 'upper', 'lower', 'concat', 'replace'];
          break;
        case 'number':
          labels = ['plus', 'minus', 'times', 'divide', 'toNumber', 'toString'];
          break;
        case 'boolean':
          labels = ['not', 'and', 'or', 'equals', 'not equal', 'isTruthy'];
          break;
        default:
          // 'any' or unknown — show the most generally useful blocks
          labels = ['entry', 'length', 'contains', 'toString', 'toNumber', 'first'];
          break;
      }
    } else if (target.kind === 'expression') {
      const expectedType = target.expectedType ?? 'expression';
      switch (expectedType) {
        case 'boolean':
          labels = ['equals', 'not equal', 'and', 'or', 'not', 'true'];
          break;
        case 'number':
          labels = [
            '0',
            'plus',
            'minus',
            isTrigger ? 'placedDay' : 'currentDay',
            'length',
            'toNumber',
          ];
          break;
        case 'string':
          labels = ['"text"', 'concat', 'toString', 'upper', 'replace', 'Dropdown'];
          break;
        case 'list':
          labels = [
            'players',
            'roles',
            'filter',
            'map',
            'sort',
            ...(isTrigger ? ['placedUser'] : ['InputsWithData']),
          ];
          break;
        case 'expression':
        default: {
          const suggestions: string[] = ['players'];
          if (contextVar) suggestions.push(contextVar);
          suggestions.push(isTrigger ? 'placedUser' : 'currentPlayer');
          suggestions.push(isTrigger ? 'placedDay' : 'currentDay');
          suggestions.push('0');
          suggestions.push('"text"');
          suggestions.push('Markdown');
          labels = suggestions.slice(0, 7);
          break;
        }
      }
    } else {
      return []; // statement targets get no suggested tab
    }

    // Filter out the value being swapped away from
    if (swapLabel) labels = labels.filter((l) => l !== swapLabel);

    // Match labels to existing items (first match wins) and tag them as 'suggested'
    const result: ModalItem[] = [];
    for (const label of labels) {
      const match = items.find(
        (item) => item.label === label && !item.disabledReason && item.category !== 'suggested'
      );
      if (match) result.push({ ...match, category: 'suggested' });
    }
    return result;
  }, [target, items, isTriggerContext, entryKeysBySource, definedFunctions]);

  const filtered = useMemo(() => {
    let result = items;
    if (hideInputs) {
      result = result.filter((item) => item.category !== 'input');
    }
    if (isTriggerContext) {
      // Trigger scripts can't display content or use inputs
      result = result.filter((item) => item.category !== 'input' && item.category !== 'display');
    }
    // Only show Inputs / InputsWithData data sources once at least one input
    // has been added to the script.
    const inputLabels = entryKeysBySource?.Inputs ?? entryKeysBySource?.InputsWithData ?? [];
    if (inputLabels.length === 0) {
      result = result.filter((item) => item.label !== 'Inputs' && item.label !== 'InputsWithData');
    }
    if (!search.trim()) return result;
    const query = search.toLowerCase();
    return result.filter(
      (item) =>
        item.label.toLowerCase().includes(query) || item.description.toLowerCase().includes(query)
    );
  }, [items, search, hideInputs, isTriggerContext, entryKeysBySource]);

  const grouped = useMemo(() => {
    const groups = filtered.reduce<Record<string, ModalItem[]>>((acc, item) => {
      (acc[item.category] ??= []).push(item);
      return acc;
    }, {});
    // Prepend suggested items (for expression and chain targets)
    if (suggestedItems.length > 0) {
      groups['suggested'] = suggestedItems;
    }
    return groups;
  }, [filtered, suggestedItems]);

  const categoryOrder = useMemo(() => {
    const order =
      target?.kind === 'statement'
        ? ['input', 'control', 'display', 'variable']
        : target?.kind === 'chainInsert' || target?.kind === 'chainSwap'
          ? ['suggested', 'list', 'math', 'operator', 'string', 'boolean', 'data']
          : [
              'suggested',
              'data',
              'variable',
              'function',
              'math',
              'operator',
              'boolean',
              'list',
              'string',
            ];
    return order.filter((category) => grouped[category]?.length);
  }, [target, grouped]);

  const effectiveCategory =
    activeCategory && grouped[activeCategory] ? activeCategory : categoryOrder[0];
  const visibleItems = search.trim() ? filtered : (grouped[effectiveCategory] ?? []);

  const handleSelect = (item: ModalItem) => {
    item.onSelect();
    if (!item.skipCloseOnSelect) onClose();
  };

  return (
    <>
    <ConvexDialog.Root
      isOpen={isOpen}
      onOpenChange={(open: boolean) => {
        if (!open) onClose();
      }}>
      <ConvexDialog.Trigger asChild>
        <View />
      </ConvexDialog.Trigger>
      <ConvexDialog.Portal>
        <ConvexDialog.Overlay />
        <ConvexDialog.Content className="h-[85vh] max-w-md">
          <CloseButton onPress={onClose} />
          <Column className="min-h-0 flex-1 gap-3 pt-3">
            <FontText weight="medium" className="text-base">
              {target?.mode === 'swap'
                ? `Swap ${target.kind === 'statement' ? 'Block' : 'Expression'}${target.swapLabel ? `: ${target.swapLabel}` : ''}`
                : target?.kind === 'statement'
                  ? 'Add Block'
                  : target?.kind === 'chainInsert'
                    ? 'Add Chain Link'
                    : 'Add Expression'}
            </FontText>
            {target?.mode === 'swap' && (
              <AppButton
                variant="red"
                className="h-9 w-full"
                dropShadow={false}
                onPress={() => {
                  onRemove(target);
                  onClose();
                }}>
                <FontText weight="bold" className="text-sm text-red-500">
                  Remove
                </FontText>
              </AppButton>
            )}
            <TextInput
              ref={searchInputRef}
              value={search}
              onChangeText={setSearch}
              placeholder="Search..."
              placeholderTextColor="#0004"
              className="bg-text/10 rounded-lg px-3 py-2 text-sm"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {!search.trim() && categoryOrder.length > 1 && (
              <Row className="flex-wrap gap-1">
                {categoryOrder.map((category) => (
                  <Pressable
                    key={category}
                    onPress={() => setActiveCategory(category)}
                    className={`rounded-lg px-3 py-1.5 ${effectiveCategory === category ? 'bg-accent' : 'bg-text/10'}`}>
                    <FontText
                      className="text-xs"
                      color={effectiveCategory === category ? 'white' : undefined}>
                      {CATEGORY_LABELS[category] ?? category}
                    </FontText>
                  </Pressable>
                ))}
              </Row>
            )}
            <ShadowScrollView
              className="min-h-0 flex-1"
              contentContainerStyle={{ gap: 6 }}
              nestedScrollEnabled>
              {visibleItems.map((item, index) => (
                <React.Fragment key={`${item.category}-${item.label}-${index}`}>
                  <ModalItemRow
                    item={item}
                    onSelect={() => handleSelect(item)}
                    entryKeysBySource={entryKeysBySource}
                    definedFunctions={definedFunctions}
                    definedVariables={definedVariables}
                    isTriggerContext={isTriggerContext}
                  />
                  {item.dividerAfter && (
                    <View className="border-subtle-border my-1 h-px border-t" />
                  )}
                </React.Fragment>
              ))}
              {visibleItems.length === 0 && (
                <FontText variant="subtext" className="py-4 text-center">
                  No matching blocks
                </FontText>
              )}
            </ShadowScrollView>
          </Column>
        </ConvexDialog.Content>
      </ConvexDialog.Portal>

      {/* First-time explanation dialog for built-in functions */}
      <ConvexDialog.Root
        isOpen={showBuiltinInfo}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setShowBuiltinInfo(false);
            setPendingBuiltin(null);
          }
        }}>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="max-w-md">
            <CloseButton
              onPress={() => {
                setShowBuiltinInfo(false);
                setPendingBuiltin(null);
              }}
            />
            <Column className="gap-3 pt-3">
              <FontText weight="medium" className="text-base">
                Built-in Functions
              </FontText>
              <FontText variant="subtext" className="text-sm leading-5">
                This adds the full function code to your script so you can edit it. It then works
                like any custom function.
              </FontText>
              <Row className="gap-2">
                <AppButton
                  variant="accent"
                  className="flex-1"
                  onPress={() => {
                    if (pendingBuiltin && target) {
                      onInsertBuiltinFunction(
                        pendingBuiltin.fnStatement,
                        pendingBuiltin.callExpression,
                        target
                      );
                    }
                    setHasSeenBuiltinInfo(true);
                    AsyncStorage.setItem(BUILTIN_INFO_SEEN_KEY, 'true');
                    setShowBuiltinInfo(false);
                    setPendingBuiltin(null);
                    onClose();
                  }}>
                  <FontText weight="medium" color="white">
                    Add function
                  </FontText>
                </AppButton>
                <AppButton
                  variant="secondary"
                  className="flex-1"
                  onPress={() => {
                    setShowBuiltinInfo(false);
                    setPendingBuiltin(null);
                  }}>
                  <FontText weight="medium">Cancel</FontText>
                </AppButton>
              </Row>
            </Column>
          </ConvexDialog.Content>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>
    </ConvexDialog.Root>

    <UnsavedChangesDialog
      isOpen={unsaveConfirm !== null}
      onOpenChange={(open) => { if (!open) setUnsaveConfirm(null); }}
      onStay={() => setUnsaveConfirm(null)}
      onLeave={() => {
        if (unsaveConfirm && onUnsaveFunction) onUnsaveFunction(unsaveConfirm);
        setUnsaveConfirm(null);
      }}
      title="Remove Saved Function"
      message={`Remove this function from your saved functions? It won't affect any scripts already using it.`}
      stayLabel="Cancel"
      leaveLabel="Remove"
    />
    </>
  );
};

export default InsertModal;
