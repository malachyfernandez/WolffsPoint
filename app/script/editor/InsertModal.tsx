import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, View, TextInput } from 'react-native';
import ConvexDialog from '../../components/ui/dialog/ConvexDialog';
import ShadowScrollView from '../../components/ui/ShadowScrollView';
import Column from '../../components/layout/Column';
import Row from '../../components/layout/Row';
import FontText from '../../components/ui/text/FontText';
import AppButton from '../../components/ui/buttons/AppButton';
import { CloseButton } from '../../components/game/markdownEditor';
import type { BinaryOperator, Expression, Statement } from '../lang/ast';
import { emptySpan } from '../lang/ast';
import type { InputType } from '../registry';
import { STATEMENT_BLOCKS, EXPRESSION_BLOCKS } from '../registry';
import {
  buildDefaultMethodArgs,
  createCallStatement,
  createForEachStatement,
  createFunctionStatement,
  createIfStatement,
  parseLiteralValue,
} from './editorReducer';
import type { ExpressionLocation } from './expressionEditor';

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
  linkIndex?: number;
}

export interface DefinedFunction {
  name: string;
  parameters: string[];
}

interface InsertModalProps {
  isOpen: boolean;
  target: InsertTarget | null;
  definedVariables: string[];
  definedFunctions: DefinedFunction[];
  onInsertStatement: (statement: Statement, path: number[], replace?: boolean) => void;
  onInsertExpression: (expression: Expression, target: InsertTarget) => void;
  onInsertChainLink: (target: InsertTarget, blockId: string) => void;
  onRemove: (target: InsertTarget) => void;
  onClose: () => void;
}

const span = emptySpan();

const CONTROL_TEMPLATES: { label: string; description: string; build: () => Statement }[] = [
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
    build: () => createFunctionStatement('isPlayerDead', ['Item']),
  },
  {
    label: 'Return',
    description: 'Return a value from a function',
    build: () => ({ kind: 'ReturnStatement', value: { kind: 'NothingLiteral', span }, span }),
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
  { name: 'submissions', description: 'Player submissions (operator only)' },
  { name: 'Inputs', description: 'Current input state' },
];

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

const buildFunctionCall = (fn: DefinedFunction): Expression => ({
  kind: 'CallExpression',
  callee: { kind: 'IdentifierExpression', name: fn.name, span },
  arguments: fn.parameters.map(() => ({
    kind: 'PositionalArgument' as const,
    value: { kind: 'NothingLiteral' as const, span },
    span,
  })),
  span,
});

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
};

const InsertModal = ({
  isOpen,
  target,
  definedVariables,
  definedFunctions,
  onInsertStatement,
  onInsertExpression,
  onInsertChainLink,
  onRemove,
  onClose,
}: InsertModalProps) => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Reset to the first tab + clear search every time the modal opens so a
  // previous session's selection never carries over.
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setActiveCategory(null);
    }
  }, [isOpen]);

  const items = useMemo<ModalItem[]>(() => {
    if (!target) return [];
    if (target.kind === 'statement') {
      return [
        ...STATEMENT_BLOCKS.map((block) => ({
          label: block.name,
          description: block.description,
          category: block.category,
          onSelect: () =>
            onInsertStatement(
              buildStatementFromRegistry(block.id),
              target.path ?? [],
              target.mode === 'swap'
            ),
        })),
        ...CONTROL_TEMPLATES.map((template) => ({
          label: template.label,
          description: template.description,
          category: 'control',
          onSelect: () =>
            onInsertStatement(template.build(), target.path ?? [], target.mode === 'swap'),
        })),
      ];
    }
    if (target.kind === 'chainInsert' || target.kind === 'chainSwap') {
      return EXPRESSION_BLOCKS.map((block) => ({
        label: block.name,
        description: block.description,
        category: block.category,
        onSelect: () => onInsertChainLink(target, block.id),
      }));
    }
    const selectExpression = (expression: Expression) => onInsertExpression(expression, target);
    const functionItems = definedFunctions.map((fn) => ({
      label: `${fn.name}(${fn.parameters.join(', ')})`,
      description: 'Custom function',
      category: 'function',
      onSelect: () => selectExpression(buildFunctionCall(fn)),
    }));
    const seenVariables = new Set<string>();
    const variableItems: ModalItem[] = [
      ...(target.contextVariables ?? []).filter(Boolean).map((name) => {
        seenVariables.add(name);
        return {
          label: name,
          description: 'Variable',
          category: 'variable',
          onSelect: () => selectExpression({ kind: 'IdentifierExpression', name, span }),
        };
      }),
      ...definedVariables
        .filter((name) => !seenVariables.has(name))
        .map((name) => ({
          label: name,
          description: 'Variable',
          category: 'variable',
          onSelect: () => selectExpression(buildVariableReference(name)),
        })),
    ];
    const entryBlock = EXPRESSION_BLOCKS.find((b) => b.id === 'entry');
    const otherExpressionBlocks = EXPRESSION_BLOCKS.filter((b) => b.id !== 'entry');
    const sharedItems: ModalItem[] = [
      ...functionItems,
      ...variableItems,
      ...(entryBlock
        ? [
            {
              label: entryBlock.name,
              description: entryBlock.description,
              category: 'data',
              onSelect: () => selectExpression(buildMethodExpression(entryBlock.id)),
              dividerAfter: true,
            },
          ]
        : []),
      ...DATA_SOURCES.map((source) => ({
        label: source.name,
        description: source.description,
        category: 'data',
        onSelect: () => selectExpression({ kind: 'IdentifierExpression', name: source.name, span }),
      })),
      ...otherExpressionBlocks.map((block) => ({
        label: block.name,
        description: block.description,
        category: block.category,
        onSelect: () => selectExpression(buildMethodExpression(block.id)),
        dividerAfter: block.id === 'sort' || block.id === 'lower',
      })),
    ];
    const booleanItems: ModalItem[] = [
      {
        label: 'true',
        description: 'Boolean',
        category: 'boolean',
        onSelect: () => selectExpression({ kind: 'BooleanLiteral', value: true, span }),
      },
      {
        label: 'false',
        description: 'Boolean',
        category: 'boolean',
        onSelect: () => selectExpression({ kind: 'BooleanLiteral', value: false, span }),
      },
      ...BOOLEAN_OPERATORS.map(({ label, operator }) => ({
        label,
        description: operator,
        category: 'operator',
        dividerAfter: operator === '<=',
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
      return [...functionItems, ...variableItems, ...booleanItems];
    return [
      {
        label: '0',
        description: 'Number',
        category: 'math',
        dividerAfter: true,
        onSelect: () => selectExpression({ kind: 'NumberLiteral', value: 0, span }),
      },
      {
        label: '"text"',
        description: 'Text',
        category: 'string',
        dividerAfter: true,
        onSelect: () => selectExpression({ kind: 'StringLiteral', value: '', span }),
      },
      ...mathItems,
      ...sharedItems,
      ...booleanItems,
    ];
  }, [
    target,
    definedVariables,
    definedFunctions,
    onInsertStatement,
    onInsertExpression,
    onInsertChainLink,
  ]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const query = search.toLowerCase();
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(query) || item.description.toLowerCase().includes(query)
    );
  }, [items, search]);

  const grouped = useMemo(
    () =>
      filtered.reduce<Record<string, ModalItem[]>>((groups, item) => {
        (groups[item.category] ??= []).push(item);
        return groups;
      }, {}),
    [filtered]
  );

  const categoryOrder = useMemo(() => {
    const order =
      target?.kind === 'statement'
        ? ['input', 'display', 'variable', 'control']
        : target?.kind === 'chainInsert' || target?.kind === 'chainSwap'
          ? ['list', 'math', 'string', 'boolean', 'data']
          : ['data', 'variable', 'function', 'math', 'operator', 'boolean', 'list', 'string'];
    return order.filter((category) => grouped[category]?.length);
  }, [target, grouped]);

  const effectiveCategory =
    activeCategory && grouped[activeCategory] ? activeCategory : categoryOrder[0];
  const visibleItems = search.trim() ? filtered : (grouped[effectiveCategory] ?? []);

  const handleSelect = (item: ModalItem) => {
    item.onSelect();
    onClose();
  };

  return (
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
                  <Pressable
                    onPress={() => handleSelect(item)}
                    className="border-subtle-border hover:bg-text/5 rounded-lg border px-3 py-2">
                    <FontText weight="medium" className="text-sm">
                      {item.label}
                    </FontText>
                    <FontText variant="subtext" className="text-xs">
                      {item.description}
                    </FontText>
                  </Pressable>
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
    </ConvexDialog.Root>
  );
};

export default InsertModal;
