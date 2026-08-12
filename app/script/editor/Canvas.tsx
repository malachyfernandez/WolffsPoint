import React, { useEffect, useId, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Plus, X } from 'lucide-react-native';
import Column from '../../components/layout/Column';
import Row from '../../components/layout/Row';
import FontText from '../../components/ui/text/FontText';
import AppDropdown from '../../components/ui/forms/AppDropdown';
import FontTextInput from '../../components/ui/forms/FontTextInput';
import type {
  BinaryOperator,
  CallArgument,
  Expression,
  IdentifierExpression,
  NamedArgument,
  Statement,
} from '../lang/ast';
import { emptySpan } from '../lang/ast';
import { parseExpression } from '../lang/parser';
import { printExpression } from '../lang/printer';
import type { BlockInput, InputType } from '../registry';
import { EXPRESSION_BLOCKS, STATEMENT_BLOCKS } from '../registry';
import type { InsertTarget } from './InsertModal';
import {
  decomposeChain,
  renameIdentifier,
  type ChainLink,
  type ExpressionLocation,
  type ExpressionPathStep,
} from './expressionEditor';

const span = emptySpan();
const BOOLEAN_OPERATORS: BinaryOperator[] = ['==', '!=', '>', '<', '>=', '<=', 'AND', 'OR'];
const MATH_OPERATORS: BinaryOperator[] = ['+', '-', '*', '/', '%'];
const isMathOperator = (op: BinaryOperator) => MATH_OPERATORS.includes(op);

const sanitizeIdentifier = (value: string) =>
  value.replace(/[^a-zA-Z0-9_]/g, '').replace(/^[0-9]/, '_$&');

interface CanvasProps {
  statements: Statement[];
  definedVariables: string[];
  onAdd: (target: InsertTarget) => void;
  onSetExpression: (
    location: ExpressionLocation,
    expression: Expression,
    trackHistory?: boolean
  ) => void;
  onSetStatementField: (
    path: number[],
    field: 'name' | 'parameters' | 'itemName',
    value: string | string[]
  ) => void;
  onDeleteStatement: (path: number[]) => void;
  entryKeysBySource?: Record<string, string[]>;
  stmtPath?: number[];
  onEditMarkdown?: (currentValue: string, onSave: (newValue: string) => void) => void;
}

const appendLocation = (
  location: ExpressionLocation,
  ...steps: ExpressionPathStep[]
): ExpressionLocation => ({
  ...location,
  expressionPath: [...location.expressionPath, ...steps],
});

// Global mouse position tracker — listens on document so it works regardless of
// which element is under the cursor.
const useGlobalMouse = () => {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handler = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    document.addEventListener('mousemove', handler);
    return () => document.removeEventListener('mousemove', handler);
  }, []);
  return pos;
};

// Shared tooltip element — one DOM node appended to document.body, reused.
// Uses an ownership model: only the component that last requested the tooltip
// can release it. This prevents parent/child hover conflicts.
let sharedTooltip: HTMLDivElement | null = null;
let tooltipOwner: string | null = null; // tracks which id currently owns the tooltip

const showTooltip = (id: string, message: string) => {
  if (typeof document === 'undefined') return;
  if (!sharedTooltip) {
    sharedTooltip = document.createElement('div');
    sharedTooltip.style.cssText =
      'position:fixed;z-index:99999;pointer-events:none;white-space:nowrap;' +
      'border-radius:9999px;background:rgba(0,0,0,0.5);color:#fff;padding:4px 10px;' +
      'font-size:12px;line-height:16px;font-family:inherit;opacity:0;transition:opacity 80ms;';
    document.body.appendChild(sharedTooltip);
  }
  tooltipOwner = id;
  sharedTooltip.textContent = message;
  sharedTooltip.style.opacity = '1';
};
const hideTooltip = (id: string) => {
  if (sharedTooltip && tooltipOwner === id) sharedTooltip.style.opacity = '0';
};
const moveTooltip = (x: number, y: number) => {
  if (sharedTooltip) {
    sharedTooltip.style.left = `${x + 14}px`;
    sharedTooltip.style.top = `${y + 14}px`;
  }
};

// Hook for any element that wants a hover-following tooltip.
// Pass a unique id and the message to show. Returns hovered state + setter.
const useTooltip = (id: string, message: string | undefined) => {
  const [hovered, setHovered] = useState(false);
  const mousePos = useGlobalMouse();
  useEffect(() => {
    if (hovered && message) {
      showTooltip(id, message);
      moveTooltip(mousePos.x, mousePos.y);
    } else {
      hideTooltip(id);
    }
  }, [hovered, id, message, mousePos]);
  useEffect(() => () => hideTooltip(id), [id]);
  return { hovered, setHovered };
};

// Selector for elements that own their own interaction and therefore opt out
// of swapable hover/click-to-swap. Detected by tag/role rather than a manual
// data attribute: real form controls plus anything exposed as a button/combobox
// (React Native Web's Pressable emits role="button" when given
// accessibilityRole="button", which is how the non-swapable controls below
// register themselves).
const INTERACTIVE_SELECTOR =
  'input, textarea, button, select, [role="button"], [role="combobox"], [role="listbox"]';

// The single hover + click + tooltip target for every object in the editor —
// statement blocks and expressions alike. One component, one system.
//
// "Innermost wins" is enforced via data-swapable: on every mouseover we ask
// whether the element under the cursor is inside a NESTED swapable or an
// interactive control. If so, this swapable deactivates and lets the inner
// one (or the control) own the hover. Only when this swapable is the
// innermost non-interactive target does it activate.
// Paper-texture background overlay matching the PaperContainer look: a tiled
// paper image multiplied over the inner background color. Rendered absolutely
// inside a `relative` parent. `borderRadius` adapts to the container shape.
const PaperTexture = ({ radius = 12 }: { radius?: number }) => (
  <View
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: radius,
      opacity: 0.5,
      // @ts-ignore: RN types don't know about web CSS background properties
      backgroundImage:
        "url('https://dydrl5o9tb.ufs.sh/f/6bPCFkuBjl92dnXGroFLInwCTmuU48v7QcbPaXDEgKZzYeBq')",
      backgroundRepeat: 'repeat',
      backgroundSize: '642px 642px',
      mixBlendMode: 'multiply',
    }}
    pointerEvents="none"
  />
);

// Hover overlay — a semi-transparent dark layer that sits on top of the paper
// texture but below the content, so hover darkens the textured background.
const HoverOverlay = ({ radius = 12 }: { radius?: number }) => (
  <View
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: radius,
      backgroundColor: 'rgba(0,0,0,0.12)',
    }}
    pointerEvents="none"
  />
);

const Swapable = ({
  label,
  onSwap,
  children,
  variant = 'block',
  isFunction = false,
  indent = 0,
}: {
  label: string;
  onSwap: () => void;
  children: React.ReactNode;
  variant?: 'statement' | 'block' | 'piece' | 'bare';
  isFunction?: boolean;
  indent?: number;
}) => {
  const id = useId();
  const { hovered, setHovered } = useTooltip(id, `Change ${label}`);

  // `textured` variants get the paper background + hover overlay layers.
  // `bare` is the only flat variant (used for inline elements with no border).
  const textured = variant !== 'bare';
  // The overlay/texture layers are absolute-positioned inside the border (in
  // the padding box), so their border-radius must be the container's outer
  // radius minus the 1px border width to align with the rounded corners.
  //   piece:  rounded(4px)  - 1 = 3px
  //   block/statement: rounded-xl(12px) - 1 = 11px
  const radius = variant === 'piece' ? 3 : 11;

  const containerClassName = (() => {
    if (variant === 'piece') {
      return `border-subtle-border rounded border px-2 py-1 relative overflow-hidden bg-inner-background ${
        hovered ? 'border-text/30' : 'border-subtle-border'
      }`;
    }
    if (variant === 'bare') {
      return hovered ? 'bg-text/20' : 'bg-transparent';
    }
    if (variant === 'statement') {
      return `rounded-xl border ${isFunction ? 'p-1' : 'p-3'} relative overflow-hidden bg-inner-background ${
        hovered ? 'border-text/30' : 'border-subtle-border'
      }`;
    }
    return `rounded-xl border px-2 py-1 relative overflow-hidden bg-inner-background ${
      hovered ? 'border-text/30' : 'border-subtle-border'
    }`;
  })();

  return (
    <View
      style={{ marginLeft: indent }}
      className={containerClassName}
      {...({ 'data-swapable': true } as Record<string, unknown>)}
      {...({
        onMouseOver: (e: MouseEvent) => {
          const target = e.target as HTMLElement;
          const current = e.currentTarget as HTMLElement;
          const swapableEl = target.closest('[data-swapable]');
          const interactiveEl = target.closest(INTERACTIVE_SELECTOR);
          if (interactiveEl || (swapableEl && swapableEl !== current)) {
            setHovered(false);
          } else {
            setHovered(true);
          }
        },
        onMouseOut: (e: MouseEvent) => {
          const related = e.relatedTarget as Node | null;
          const current = e.currentTarget as HTMLElement | null;
          if (!related || !current?.contains(related)) setHovered(false);
        },
        onClick: (e: MouseEvent) => {
          const target = e.target as HTMLElement;
          const current = e.currentTarget as HTMLElement;
          const swapableEl = target.closest('[data-swapable]');
          const interactiveEl = target.closest(INTERACTIVE_SELECTOR);
          if (interactiveEl || (swapableEl && swapableEl !== current)) return;
          e.preventDefault();
          e.stopPropagation();
          onSwap();
        },
      } as Record<string, unknown>)}>
      {textured && <PaperTexture radius={radius} />}
      {textured && hovered && <HoverOverlay radius={radius} />}
      <View className="relative">{children}</View>
    </View>
  );
};

const PuzzleConnector = ({
  direction,
  type = 'expression',
  onPress,
  tooltip,
}: {
  direction: 'vertical' | 'horizontal';
  type?: InputType;
  onPress: () => void;
  tooltip?: string;
}) => {
  const tooltipId = useId();
  const { hovered, setHovered } = useTooltip(tooltipId, tooltip);
  const isVertical = direction === 'vertical';
  const isList = type === 'list';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      className={`relative items-center justify-center ${
        isVertical ? 'my-1 h-8 w-full' : 'mx-0.5 h-9 w-8'
      }`}>
      <View
        className={`border-subtle-border bg-text/10 border ${isList ? 'rounded-[3px]' : 'rounded-full'}`}
        style={isVertical ? { height: 16, width: 12 } : { height: 12, width: 16 }}
      />
      <View
        className={`border-subtle-border absolute h-7 w-7 items-center justify-center rounded-full border bg-white transition-opacity ${
          hovered ? 'opacity-100' : 'opacity-0'
        }`}>
        <Plus size={14} color="#1a1a1a" />
      </View>
    </Pressable>
  );
};

const ReplaceableTextInput = ({
  value,
  onChangeText,
  placeholder,
  onReplace,
  minWidth = 80,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  onReplace?: () => void;
  minWidth?: number;
}) => {
  // Local state keeps the text input responsive without depending on external
  // re-renders. We sync from props only when the external value differs from
  // our local state (e.g. undo/redo or programmatic changes), but NOT while
  // the user is actively typing (to avoid focus loss from re-renders).
  const [localValue, setLocalValue] = useState(value);
  const [focused, setFocused] = useState(false);
  const replaceTooltipId = useId();
  const { setHovered: setReplaceHovered } = useTooltip(replaceTooltipId, 'Change expression');
  useEffect(() => {
    if (!focused && localValue !== value) setLocalValue(value);
  }, [value, focused, localValue]);

  return (
    <View className="relative" style={{ minWidth, maxWidth: 150 }}>
      <FontTextInput
        value={localValue}
        onChangeText={(next) => {
          setLocalValue(next);
          onChangeText(next);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          setLocalValue(value);
        }}
        placeholder={placeholder}
        placeholderTextColor="#0004"
        autoCapitalize="none"
        autoCorrect={false}
        className="bg-white py-1 pl-2 pr-7 text-sm"
        style={{ minWidth, maxWidth: 220 }}
      />
      {onReplace && (
        <Pressable
          accessibilityRole="button"
          onPress={onReplace}
          onHoverIn={() => setReplaceHovered(true)}
          onHoverOut={() => setReplaceHovered(false)}
          className="hover:bg-text/10 absolute right-0.5 top-0.5 h-6 w-6 items-center justify-center rounded-full">
          <FontText className="text-xs">+</FontText>
        </Pressable>
      )}
    </View>
  );
};

// Thin wrapper around FontTextInput that keeps local state while focused
// to prevent focus loss from external re-renders.
const StableTextInput = ({
  value,
  onChangeText,
  ...props
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  className?: string;
  style?: Record<string, unknown>;
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused && localValue !== value) setLocalValue(value);
  }, [value, focused, localValue]);
  return (
    <FontTextInput
      {...props}
      value={localValue}
      onChangeText={(next) => {
        setLocalValue(next);
        onChangeText(next);
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        setLocalValue(value);
      }}
    />
  );
};

const ParsedTextInput = ({
  expression,
  onChange,
  onReplace,
  placeholder,
}: {
  expression: Expression;
  onChange: (expression: Expression) => void;
  onReplace: () => void;
  placeholder: string;
}) => {
  const printed = printExpression(expression);
  const [text, setText] = useState(expression.kind === 'NothingLiteral' ? '' : printed);
  const [hasError, setHasError] = useState(false);
  useEffect(() => {
    const next = expression.kind === 'NothingLiteral' ? '' : printed;
    setText((current) => (current === next ? current : next));
    setHasError(false);
  }, [expression.kind, printed]);
  const handleChange = (value: string) => {
    setText(value);
    if (!value.trim()) {
      setHasError(false);
      onChange({ kind: 'NothingLiteral', span });
      return;
    }
    try {
      onChange(parseExpression(value));
      setHasError(false);
    } catch {
      setHasError(true);
    }
  };
  return (
    <View className={`rounded border ${hasError ? 'border-red-400' : 'border-subtle-border'}`}>
      <ReplaceableTextInput
        value={text}
        onChangeText={handleChange}
        placeholder={placeholder}
        onReplace={onReplace}
        minWidth={100}
      />
    </View>
  );
};

const BooleanSocket = ({ onAdd, tooltip }: { onAdd: () => void; tooltip?: string }) => {
  const tooltipId = useId();
  const { setHovered } = useTooltip(tooltipId, tooltip);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onAdd}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}>
      <View className="border-subtle-border h-8 min-w-16 items-center justify-center rounded border border-dashed bg-transparent px-3">
        <FontText className="text-text/40 text-sm">+</FontText>
      </View>
    </Pressable>
  );
};

interface ExpressionSocketProps {
  expression: Expression;
  location: ExpressionLocation;
  expectedType?: InputType;
  contextVariables: string[];
  label?: string;
  entryKeysBySource?: Record<string, string[]>;
  entrySource?: string;
  entrySourceMap?: Record<string, string>;
  isOuterExpression?: boolean;
  onAdd: (target: InsertTarget) => void;
  onSetExpression: CanvasProps['onSetExpression'];
  onEditMarkdown?: CanvasProps['onEditMarkdown'];
}

const ExpressionSocket = ({
  expression,
  location,
  expectedType = 'expression',
  contextVariables,
  label = 'expression',
  entryKeysBySource,
  entrySource,
  entrySourceMap,
  isOuterExpression = true,
  onAdd,
  onSetExpression,
  onEditMarkdown,
}: ExpressionSocketProps) => {
  const chain = useMemo(() => decomposeChain(expression), [expression]);
  const expressionLabel = (() => {
    if (expression.kind === 'BooleanLiteral') return String(expression.value);
    if (expression.kind === 'BinaryExpression') return expression.operator;
    if (expression.kind === 'UnaryExpression') return expression.operator;
    if (expression.kind === 'StringLiteral') return `"${expression.value}"`;
    if (expression.kind === 'NumberLiteral') return String(expression.value);
    if (expression.kind === 'IdentifierExpression') return expression.name;
    if (expression.kind === 'CallExpression') {
      const callee =
        expression.callee.kind === 'IdentifierExpression'
          ? expression.callee.name
          : expression.callee.kind === 'MemberExpression'
            ? `.${expression.callee.property}`
            : 'call';
      return callee;
    }
    if (expression.kind === 'MemberExpression') return `.${expression.property}`;
    return expression.kind;
  })();
  const openExpressionModal = (
    replaceMode: 'whole' | 'chainBase' = 'whole',
    type: InputType = expectedType,
    swapLabelOverride?: string
  ) =>
    onAdd({
      kind: 'expression',
      mode: expression.kind === 'NothingLiteral' ? 'insert' : 'swap',
      swapLabel:
        swapLabelOverride ?? (expression.kind === 'NothingLiteral' ? undefined : expressionLabel),
      location,
      replaceMode,
      expectedType: type,
      contextVariables,
    });

  if (expression.kind === 'NothingLiteral') {
    return (
      <BooleanSocket
        onAdd={() => openExpressionModal('whole', expectedType)}
        tooltip={`Add ${label}`}
      />
    );
  }

  if (expression.kind === 'BooleanLiteral') {
    return (
      <Swapable
        label={expressionLabel}
        variant="piece"
        onSwap={() => openExpressionModal('whole', 'boolean')}>
        <FontText weight="medium" className="text-sm">
          {String(expression.value)}
        </FontText>
      </Swapable>
    );
  }

  if (expression.kind === 'BinaryExpression') {
    const operandType = ['AND', 'OR'].includes(expression.operator) ? 'boolean' : 'expression';
    const operatorSet = isMathOperator(expression.operator) ? MATH_OPERATORS : BOOLEAN_OPERATORS;
    return (
      <Swapable
        label={expressionLabel}
        variant="block"
        onSwap={() => openExpressionModal('whole', expectedType)}>
        <Row
          className="items-center gap-1"
          style={{ borderRadius: expectedType === 'boolean' ? 0 : 6 }}>
          <ExpressionSocket
            expression={expression.left}
            location={appendLocation(location, { kind: 'binaryLeft' })}
            expectedType={operandType}
            contextVariables={contextVariables}
            entryKeysBySource={entryKeysBySource}
            entrySource={entrySource}
            entrySourceMap={entrySourceMap}
            isOuterExpression={false}
            label="left side"
            onAdd={onAdd}
            onSetExpression={onSetExpression}
            onEditMarkdown={onEditMarkdown}
          />
          <AppDropdown
            options={operatorSet.map((operator) => ({ value: operator, label: operator }))}
            value={expression.operator}
            onValueChange={(operator) =>
              onSetExpression(
                location,
                { ...expression, operator: operator as BinaryOperator },
                true
              )
            }
            triggerClassName="min-w-16 !py-1 !px-2 text-sm"
            isInDialog
            allowUnselect={false}
          />
          <ExpressionSocket
            expression={expression.right}
            location={appendLocation(location, { kind: 'binaryRight' })}
            expectedType={operandType}
            contextVariables={contextVariables}
            entryKeysBySource={entryKeysBySource}
            entrySource={entrySource}
            entrySourceMap={entrySourceMap}
            isOuterExpression={false}
            label="right side"
            onAdd={onAdd}
            onSetExpression={onSetExpression}
            onEditMarkdown={onEditMarkdown}
          />
        </Row>
      </Swapable>
    );
  }

  if (expression.kind === 'UnaryExpression') {
    return (
      <Swapable
        label={expressionLabel}
        variant="block"
        onSwap={() => openExpressionModal('whole', expectedType)}>
        <Row
          className="items-center gap-1"
          style={{ borderRadius: expectedType === 'boolean' ? 0 : 6 }}>
          <FontText weight="medium" className="text-sm">
            {expression.operator}
          </FontText>
          <ExpressionSocket
            expression={expression.operand}
            location={appendLocation(location, { kind: 'unaryOperand' })}
            expectedType={expression.operator === 'NOT' ? 'boolean' : 'number'}
            contextVariables={contextVariables}
            entryKeysBySource={entryKeysBySource}
            entrySource={entrySource}
            entrySourceMap={entrySourceMap}
            isOuterExpression={false}
            onAdd={onAdd}
            onSetExpression={onSetExpression}
            onEditMarkdown={onEditMarkdown}
          />
        </Row>
      </Swapable>
    );
  }

  if (expression.kind === 'MarkdownLiteral') {
    const previewText = expression.value.trim() || 'Empty markdown';
    return (
      <Swapable
        label={expressionLabel}
        variant="block"
        onSwap={() => openExpressionModal('whole', expectedType)}>
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            onEditMarkdown?.(expression.value, (newValue) =>
              onSetExpression(location, { kind: 'MarkdownLiteral', value: newValue, span }, true)
            )
          }
          className="border-subtle-border max-h-32 overflow-hidden rounded-lg border p-2">
          <FontText className="text-sm">
            {previewText.slice(0, 200)}
            {previewText.length > 200 ? '…' : ''}
          </FontText>
        </Pressable>
      </Swapable>
    );
  }

  const base = chain[0];
  // Label for the chain BASE (e.g. "players" in players.filter().map()), as
  // opposed to `expressionLabel` which describes the WHOLE expression (e.g.
  // ".map"). Used for the base's tooltip + the swap modal title so clicking
  // the base targets the base, not the last link.
  const chainBaseLabel = base.type === 'base' ? printExpression(base.expr) : expressionLabel;
  const chainBaseSource =
    base.type === 'base' && base.expr.kind === 'IdentifierExpression'
      ? (entrySourceMap?.[base.expr.name] ?? base.expr.name)
      : entrySource;
  const isSingleLiteral =
    chain.length === 1 &&
    base.type === 'base' &&
    (base.expr.kind === 'StringLiteral' ||
      base.expr.kind === 'NumberLiteral' ||
      base.expr.kind === 'NothingLiteral');

  if (isSingleLiteral && base.type === 'base') {
    if (expectedType === 'boolean')
      return (
        <BooleanSocket
          onAdd={() => openExpressionModal('whole', 'boolean')}
          tooltip={`Add ${label}`}
        />
      );
    if (expectedType === 'string' || base.expr.kind === 'StringLiteral') {
      const value = base.expr.kind === 'StringLiteral' ? base.expr.value : '';
      return (
        <View className="border-subtle-border rounded border">
          <ReplaceableTextInput
            value={value}
            onChangeText={(next) =>
              onSetExpression(location, { kind: 'StringLiteral', value: next, span })
            }
            placeholder={label}
            onReplace={() => openExpressionModal()}
          />
        </View>
      );
    }
    if (expectedType === 'number' || base.expr.kind === 'NumberLiteral') {
      const value = base.expr.kind === 'NumberLiteral' ? String(base.expr.value) : '';
      return (
        <View className="border-subtle-border rounded border">
          <ReplaceableTextInput
            value={value}
            onChangeText={(next) => {
              const number = Number(next);
              onSetExpression(
                location,
                next.trim() && !Number.isNaN(number)
                  ? { kind: 'NumberLiteral', value: number, span }
                  : { kind: 'NumberLiteral', value: 0, span }
              );
            }}
            placeholder="0"
            onReplace={() => openExpressionModal()}
          />
        </View>
      );
    }
    return (
      <ParsedTextInput
        expression={base.expr}
        onChange={(next) => onSetExpression(location, next)}
        onReplace={() => openExpressionModal()}
        placeholder={label}
      />
    );
  }

  const isChain = chain.length > 1;
  const ChainContent = (
    <Row
      className={`items-center gap-0 ${isChain ? 'rounded-lg bg-black/[0.08] px-1 py-0.5' : ''}`}>
      {chain.map((link, index) => {
        const nextLink = chain[index + 1];
        const nextDefinition =
          nextLink && nextLink.type !== 'base'
            ? EXPRESSION_BLOCKS.find(
                (block) => block.id.toLowerCase() === nextLink.name.toLowerCase()
              )
            : undefined;
        return (
          <React.Fragment key={index}>
            {link.type === 'base' ? (
              link.expr.kind === 'NothingLiteral' ? (
                <BooleanSocket
                  onAdd={() => openExpressionModal('chainBase')}
                  tooltip="Add expression"
                />
              ) : link.expr.kind === 'IdentifierExpression' ? (
                <Swapable
                  label={chainBaseLabel}
                  variant="piece"
                  onSwap={() => openExpressionModal('chainBase', expectedType, chainBaseLabel)}>
                  <FontText className="text-sm">{printExpression(link.expr)}</FontText>
                </Swapable>
              ) : link.expr.kind === 'CallExpression' &&
                link.expr.callee.kind === 'IdentifierExpression' ? (
                <Swapable
                  label={chainBaseLabel}
                  variant="block"
                  onSwap={() => openExpressionModal('chainBase', expectedType, chainBaseLabel)}>
                  <Row
                    className="items-center gap-1"
                    style={{ borderRadius: expectedType === 'boolean' ? 0 : 6 }}>
                    <FontText weight="medium" className="text-sm">
                      {link.expr.callee.name}
                    </FontText>
                    {link.expr.arguments.map((argument, index) => (
                      <View
                        key={index}
                        className="border-subtle-border items-center gap-1 border-l pl-1">
                        <ExpressionSocket
                          expression={argument.value}
                          location={appendLocation(
                            location,
                            { kind: 'chainBase' },
                            {
                              kind: 'callArgument',
                              index,
                            }
                          )}
                          contextVariables={contextVariables}
                          entryKeysBySource={entryKeysBySource}
                          entrySource={chainBaseSource}
                          entrySourceMap={entrySourceMap}
                          isOuterExpression={false}
                          label={`argument ${index + 1}`}
                          onAdd={onAdd}
                          onSetExpression={onSetExpression}
                          onEditMarkdown={onEditMarkdown}
                        />
                      </View>
                    ))}
                  </Row>
                </Swapable>
              ) : (
                <ExpressionSocket
                  expression={link.expr}
                  location={appendLocation(location, { kind: 'chainBase' })}
                  expectedType={expectedType}
                  contextVariables={contextVariables}
                  entryKeysBySource={entryKeysBySource}
                  entrySource={chainBaseSource}
                  entrySourceMap={entrySourceMap}
                  isOuterExpression={false}
                  label={label}
                  onAdd={onAdd}
                  onSetExpression={onSetExpression}
                  onEditMarkdown={onEditMarkdown}
                />
              )
            ) : link.type === 'property' ? (
              <Swapable
                label={`.${link.name}`}
                variant="piece"
                onSwap={() =>
                  onAdd({
                    kind: 'chainSwap',
                    mode: 'swap',
                    swapLabel: `.${link.name}`,
                    location,
                    linkIndex: index,
                    contextVariables,
                  })
                }>
                <FontText className="text-sm">.{link.name}</FontText>
              </Swapable>
            ) : (
              <MethodLink
                link={link}
                linkIndex={index}
                location={location}
                contextVariables={contextVariables}
                entryKeysBySource={entryKeysBySource}
                entrySource={chainBaseSource}
                entrySourceMap={entrySourceMap}
                onAdd={onAdd}
                onSetExpression={onSetExpression}
                onEditMarkdown={onEditMarkdown}
                onSwapWhole={() =>
                  onAdd({
                    kind: 'chainSwap',
                    mode: 'swap',
                    swapLabel: `.${link.name}`,
                    location,
                    linkIndex: index,
                    contextVariables,
                  })
                }
              />
            )}
            <PuzzleConnector
              direction="horizontal"
              type={nextDefinition?.appliesTo === 'list' ? 'list' : expectedType}
              tooltip="Add to chain"
              onPress={() =>
                onAdd({
                  kind: 'chainInsert',
                  location,
                  linkIndex: index + 1,
                  contextVariables,
                })
              }
            />
          </React.Fragment>
        );
      })}
    </Row>
  );

  return isOuterExpression ? (
    <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ flexGrow: 1 }}>
      {ChainContent}
    </ScrollView>
  ) : (
    ChainContent
  );
};

const MethodLink = ({
  link,
  linkIndex,
  location,
  contextVariables,
  entryKeysBySource,
  entrySource,
  entrySourceMap,
  onAdd,
  onSetExpression,
  onEditMarkdown,
  onSwapWhole,
}: {
  link: Extract<ChainLink, { type: 'method' }>;
  linkIndex: number;
  location: ExpressionLocation;
  contextVariables: string[];
  entryKeysBySource?: Record<string, string[]>;
  entrySource?: string;
  entrySourceMap?: Record<string, string>;
  onAdd: CanvasProps['onAdd'];
  onSetExpression: CanvasProps['onSetExpression'];
  onEditMarkdown?: CanvasProps['onEditMarkdown'];
  onSwapWhole: () => void;
}) => {
  const definition = EXPRESSION_BLOCKS.find(
    (block) => block.id.toLowerCase() === link.name.toLowerCase()
  );
  return (
    <Swapable label={`.${link.name}`} variant="block" onSwap={onSwapWhole}>
      <Row className="items-center gap-1.5">
        <FontText className="text-sm">.{link.name}</FontText>
        {link.args.map((argument, argumentIndex) => (
          <MethodArgument
            key={argumentIndex}
            argument={argument}
            input={definition?.inputs[argumentIndex]}
            location={appendLocation(location, {
              kind: 'chainArgument',
              linkIndex,
              argumentIndex,
            })}
            contextVariables={contextVariables}
            entryKeysBySource={entryKeysBySource}
            entrySource={entrySource}
            entrySourceMap={entrySourceMap}
            methodName={link.name}
            onAdd={onAdd}
            onSetExpression={onSetExpression}
            onEditMarkdown={onEditMarkdown}
          />
        ))}
      </Row>
    </Swapable>
  );
};

const EntryKeyInput = ({
  expression,
  keys,
  onChange,
}: {
  expression: Expression;
  keys: string[];
  onChange: (expression: Expression) => void;
}) => {
  const value = expression.kind === 'StringLiteral' ? expression.value : '';
  const [custom, setCustom] = useState(Boolean(value && !keys.includes(value)));
  if (custom) {
    return (
      <Row className="items-center gap-1">
        <ReplaceableTextInput
          value={value}
          onChangeText={(next) => onChange({ kind: 'StringLiteral', value: next, span })}
          placeholder="Custom key"
          minWidth={110}
        />
        <Pressable accessibilityRole="button" onPress={() => setCustom(false)}>
          <FontText className="text-xs opacity-60">List</FontText>
        </Pressable>
      </Row>
    );
  }
  return (
    <AppDropdown
      options={[
        ...keys.map((key) => ({ value: key, label: key })),
        { value: '__custom__', label: 'Custom…' },
      ]}
      value={keys.includes(value) ? value : undefined}
      onValueChange={(next) => {
        if (next === '__custom__') setCustom(true);
        else onChange({ kind: 'StringLiteral', value: next, span });
      }}
      placeholder="Select entry"
      triggerClassName="min-w-32 !py-1 !px-2 text-sm"
      isInDialog
      allowUnselect={false}
    />
  );
};

const MethodArgument = ({
  argument,
  input,
  location,
  contextVariables,
  entryKeysBySource,
  entrySource,
  entrySourceMap,
  methodName,
  onAdd,
  onSetExpression,
  onEditMarkdown,
}: {
  argument: CallArgument;
  input?: BlockInput;
  location: ExpressionLocation;
  contextVariables: string[];
  entryKeysBySource?: Record<string, string[]>;
  entrySource?: string;
  entrySourceMap?: Record<string, string>;
  methodName?: string;
  onAdd: CanvasProps['onAdd'];
  onSetExpression: CanvasProps['onSetExpression'];
  onEditMarkdown?: CanvasProps['onEditMarkdown'];
}) => {
  if (input?.type === 'lambda') {
    const lambda =
      argument.value.kind === 'LambdaExpression'
        ? argument.value
        : {
            kind: 'LambdaExpression' as const,
            parameters: ['Item'],
            body: { kind: 'NothingLiteral' as const, span },
            span,
          };
    const parameter = lambda.parameters[0] || 'Item';
    const body =
      lambda.body.kind === 'BlockStatement'
        ? { kind: 'NothingLiteral' as const, span }
        : lambda.body;
    const innerEntrySourceMap: Record<string, string> = {
      ...(entrySourceMap ?? {}),
      ...(entrySource ? { [parameter]: entrySource } : {}),
    };
    return (
      <Row className="border-subtle-border items-center gap-1 border-l pl-1">
        <ReplaceableTextInput
          value={parameter}
          onChangeText={(rawName) => {
            const name = sanitizeIdentifier(rawName) || 'Item';
            const nextParameter = name;
            const nextBody =
              lambda.body.kind === 'BlockStatement'
                ? lambda.body
                : renameIdentifier(lambda.body, parameter, nextParameter);
            onSetExpression(location, { ...lambda, parameters: [nextParameter], body: nextBody });
          }}
          placeholder="Item"
          minWidth={70}
        />
        <FontText className="text-xs opacity-60">where</FontText>
        <ExpressionSocket
          expression={body}
          location={appendLocation(location, { kind: 'lambdaBody' })}
          expectedType={
            ['mapper', 'comparator'].some((name) => input.name.toLowerCase().includes(name))
              ? 'expression'
              : 'boolean'
          }
          contextVariables={[parameter, ...contextVariables.filter((name) => name !== parameter)]}
          entryKeysBySource={entryKeysBySource}
          entrySource={entrySource}
          entrySourceMap={innerEntrySourceMap}
          isOuterExpression={false}
          label={input.label}
          onAdd={onAdd}
          onSetExpression={onSetExpression}
          onEditMarkdown={onEditMarkdown}
        />
      </Row>
    );
  }
  const entryKeys = entrySource ? (entryKeysBySource?.[entrySource] ?? []) : [];
  if (methodName?.toLowerCase() === 'entry' && entryKeys.length > 0) {
    return (
      <EntryKeyInput
        expression={argument.value}
        keys={entryKeys}
        onChange={(next) => onSetExpression(location, next, true)}
      />
    );
  }
  if (input?.enumValues && input.enumValues.length > 0) {
    const currentValue = argument.value.kind === 'StringLiteral' ? argument.value.value : '';
    return (
      <AppDropdown
        options={input.enumValues.map((v) => ({ value: v, label: v }))}
        value={input.enumValues.includes(currentValue) ? currentValue : undefined}
        onValueChange={(next) =>
          onSetExpression(location, { kind: 'StringLiteral', value: next, span }, true)
        }
        placeholder={input.label}
        triggerClassName="min-w-24 !py-1 !px-2 text-sm"
        isInDialog
        allowUnselect={false}
      />
    );
  }
  return (
    <ExpressionSocket
      expression={argument.value}
      location={location}
      expectedType={input?.type}
      contextVariables={contextVariables}
      entryKeysBySource={entryKeysBySource}
      entrySource={entrySource}
      entrySourceMap={entrySourceMap}
      label={input?.label}
      onAdd={onAdd}
      onSetExpression={onSetExpression}
      onEditMarkdown={onEditMarkdown}
    />
  );
};

const ArgRow = ({
  argument,
  input,
  location,
  contextVariables,
  entryKeysBySource,
  entrySourceMap,
  onAdd,
  onSetExpression,
  onEditMarkdown,
}: {
  argument: NamedArgument;
  input?: BlockInput;
  location: ExpressionLocation;
  contextVariables: string[];
  entryKeysBySource?: Record<string, string[]>;
  entrySourceMap?: Record<string, string>;
  onAdd: CanvasProps['onAdd'];
  onSetExpression: CanvasProps['onSetExpression'];
  onEditMarkdown?: CanvasProps['onEditMarkdown'];
}) => (
  <Row className="items-start gap-2">
    <FontText variant="subtext" className="pt-1 text-xs">
      {input?.label ?? argument.name}
    </FontText>
    <ExpressionSocket
      expression={argument.value}
      location={location}
      expectedType={input?.type}
      contextVariables={contextVariables}
      entryKeysBySource={entryKeysBySource}
      entrySourceMap={entrySourceMap}
      label={input?.label ?? argument.name}
      onAdd={onAdd}
      onSetExpression={onSetExpression}
      onEditMarkdown={onEditMarkdown}
    />
  </Row>
);

const DeleteButton = ({ onPress }: { onPress: () => void }) => {
  const tooltipId = useId();
  const { setHovered } = useTooltip(tooltipId, 'Delete');
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}>
      <FontText className="text-xs opacity-50">✕</FontText>
    </Pressable>
  );
};

const StatementBlock = ({
  statement,
  index,
  stmtPath,
  definedVariables,
  onAdd,
  onSetExpression,
  onSetStatementField,
  onDeleteStatement,
  entryKeysBySource,
  onEditMarkdown,
}: Omit<CanvasProps, 'statements'> & { statement: Statement; index: number }) => {
  const currentPath = [...stmtPath!, index];
  const contextVariables = definedVariables;
  const statementLabel = (() => {
    if (
      statement.kind === 'ExpressionStatement' &&
      statement.expression.kind === 'CallExpression' &&
      statement.expression.callee.kind === 'IdentifierExpression'
    )
      return statement.expression.callee.name;
    if (statement.kind === 'IfStatement') return 'If / Else';
    if (statement.kind === 'ForEachStatement') return `ForEach (${statement.itemName})`;
    if (statement.kind === 'FunctionStatement') return `Function (${statement.name})`;
    if (statement.kind === 'ReturnStatement') return 'Return';
    return statement.kind;
  })();
  const swapStatement = () =>
    onAdd({
      kind: 'statement',
      mode: 'swap',
      swapLabel: statementLabel,
      path: currentPath,
      contextVariables,
    });
  let content: React.ReactNode;

  if (
    statement.kind === 'ExpressionStatement' &&
    statement.expression.kind === 'CallExpression' &&
    statement.expression.callee.kind === 'IdentifierExpression'
  ) {
    const call = statement.expression;
    const calleeName = (call.callee as IdentifierExpression).name;
    const definition = STATEMENT_BLOCKS.find(
      (block) => block.id.toLowerCase() === calleeName.toLowerCase()
    );
    const namedArguments = call.arguments.filter(
      (argument): argument is NamedArgument => argument.kind === 'NamedArgument'
    );
    const renderedArguments = definition
      ? [
          ...definition.inputs.map((input) => ({
            input,
            argument: namedArguments.find(
              (argument) => argument.name.toUpperCase() === input.name.toUpperCase()
            ) ?? {
              kind: 'NamedArgument' as const,
              name: input.name,
              value: { kind: 'NothingLiteral' as const, span },
              span,
            },
          })),
          ...namedArguments
            .filter(
              (argument) =>
                !definition.inputs.some(
                  (input) => input.name.toUpperCase() === argument.name.toUpperCase()
                )
            )
            .map((argument) => ({ argument, input: undefined })),
        ]
      : namedArguments.map((argument) => ({ argument, input: undefined }));
    content = (
      <Column className="gap-1">
        <Row className="items-center justify-between gap-2">
          <FontText weight="medium" className="text-sm">
            {calleeName}
          </FontText>
          <DeleteButton onPress={() => onDeleteStatement(currentPath)} />
        </Row>
        {renderedArguments.map(({ argument, input }, argumentIndex) => (
          <ArgRow
            key={`${argument.name}-${argumentIndex}`}
            argument={argument}
            input={input}
            location={{
              statementPath: currentPath,
              slot: { kind: 'callArg', name: argument.name },
              expressionPath: [],
            }}
            contextVariables={contextVariables}
            entryKeysBySource={entryKeysBySource}
            onAdd={onAdd}
            onSetExpression={onSetExpression}
            onEditMarkdown={onEditMarkdown}
          />
        ))}
      </Column>
    );
  } else if (statement.kind === 'IfStatement') {
    const condition = statement.branches[0]?.condition ?? { kind: 'NothingLiteral' as const, span };
    content = (
      <Column className="gap-2">
        <Row className="items-center justify-between gap-2">
          <FontText weight="medium">If</FontText>
          <DeleteButton onPress={() => onDeleteStatement(currentPath)} />
        </Row>
        <ExpressionSocket
          expression={condition}
          location={{
            statementPath: currentPath,
            slot: { kind: 'ifCondition' },
            expressionPath: [],
          }}
          expectedType="boolean"
          contextVariables={contextVariables}
          entryKeysBySource={entryKeysBySource}
          onAdd={onAdd}
          onSetExpression={onSetExpression}
          onEditMarkdown={onEditMarkdown}
        />
        <Canvas
          statements={statement.branches[0]?.body.statements ?? []}
          {...{
            definedVariables,
            onAdd,
            onSetExpression,
            onSetStatementField,
            onDeleteStatement,
            entryKeysBySource,
          }}
          stmtPath={currentPath}
        />
      </Column>
    );
  } else if (statement.kind === 'ForEachStatement') {
    content = (
      <Column className="gap-2">
        <Row className="items-center justify-between gap-2">
          <Row className="items-center gap-2">
            <FontText weight="medium">For each</FontText>
            <ReplaceableTextInput
              value={statement.itemName}
              onChangeText={(value) =>
                onSetStatementField(currentPath, 'itemName', sanitizeIdentifier(value) || 'Item')
              }
              placeholder="Item"
            />
          </Row>
          <DeleteButton onPress={() => onDeleteStatement(currentPath)} />
        </Row>
        <ExpressionSocket
          expression={statement.iterable}
          location={{
            statementPath: currentPath,
            slot: { kind: 'forEachIterable' },
            expressionPath: [],
          }}
          expectedType="list"
          contextVariables={contextVariables}
          entryKeysBySource={entryKeysBySource}
          onAdd={onAdd}
          onSetExpression={onSetExpression}
          onEditMarkdown={onEditMarkdown}
        />
        <Canvas
          statements={statement.body.statements}
          {...{
            definedVariables: [statement.itemName, ...definedVariables],
            onAdd,
            onSetExpression,
            onSetStatementField,
            onDeleteStatement,
            entryKeysBySource,
          }}
          stmtPath={currentPath}
        />
      </Column>
    );
  } else if (statement.kind === 'FunctionStatement') {
    const returnIndex = statement.body.statements.reduce(
      (lastIndex, candidate, candidateIndex) =>
        candidate.kind === 'ReturnStatement' ? candidateIndex : lastIndex,
      -1
    );
    const hasFinalReturn = returnIndex === statement.body.statements.length - 1;
    const returnStatement = hasFinalReturn ? statement.body.statements[returnIndex] : undefined;
    const bodyStatements = hasFinalReturn
      ? statement.body.statements.slice(0, -1)
      : statement.body.statements;
    content = (
      <Column className="gap-0">
        <View className="bg-text/10 rounded-t-xl p-2">
          <Row className="flex-wrap items-center justify-between gap-2">
            <Row className="flex-wrap items-center gap-2">
              <FontText weight="medium">Function</FontText>
              <ReplaceableTextInput
                value={statement.name}
                onChangeText={(value) =>
                  onSetStatementField(currentPath, 'name', sanitizeIdentifier(value) || 'fn')
                }
                placeholder="functionName"
              />
              <FontText>(</FontText>
              {statement.parameters.map((parameter, parameterIndex) => (
                <Row
                  key={`param-${parameterIndex}`}
                  className="border-subtle-border items-center rounded-full border bg-white pl-1">
                  <StableTextInput
                    value={parameter}
                    onChangeText={(value) => {
                      const parameters = [...statement.parameters];
                      parameters[parameterIndex] = sanitizeIdentifier(value);
                      onSetStatementField(currentPath, 'parameters', parameters);
                    }}
                    placeholder="parameter"
                    autoCapitalize="none"
                    autoCorrect={false}
                    className="min-w-20 bg-transparent px-2 py-1 text-sm"
                  />
                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      onSetStatementField(
                        currentPath,
                        'parameters',
                        statement.parameters.filter((_, index) => index !== parameterIndex)
                      )
                    }
                    className="hover:bg-text/10 h-7 w-7 items-center justify-center rounded-full">
                    <X size={13} color="#1a1a1a" />
                  </Pressable>
                </Row>
              ))}
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  onSetStatementField(currentPath, 'parameters', [
                    ...statement.parameters,
                    `param${statement.parameters.length + 1}`,
                  ])
                }
                className="border-subtle-border hover:bg-text/10 h-7 w-7 items-center justify-center rounded-full border bg-white">
                <Plus size={14} color="#1a1a1a" />
              </Pressable>
              <FontText>)</FontText>
            </Row>
            <DeleteButton onPress={() => onDeleteStatement(currentPath)} />
          </Row>
        </View>
        <View className="border-subtle-border border-x px-2">
          <Canvas
            statements={bodyStatements}
            {...{
              definedVariables: [...statement.parameters, ...definedVariables],
              onAdd,
              onSetExpression,
              onSetStatementField,
              onDeleteStatement,
              entryKeysBySource,
            }}
            stmtPath={currentPath}
          />
        </View>
        <View className="bg-text/10 rounded-b-xl p-2">
          <Row className="items-center gap-2">
            <FontText weight="medium">Return</FontText>
            {returnStatement?.kind === 'ReturnStatement' ? (
              <ExpressionSocket
                expression={returnStatement.value ?? { kind: 'NothingLiteral', span }}
                location={{
                  statementPath: [...currentPath, returnIndex],
                  slot: { kind: 'returnValue' },
                  expressionPath: [],
                }}
                expectedType="expression"
                contextVariables={[...statement.parameters, ...contextVariables]}
                entryKeysBySource={entryKeysBySource}
                onAdd={onAdd}
                onSetExpression={onSetExpression}
                onEditMarkdown={onEditMarkdown}
              />
            ) : (
              <FontText variant="subtext">Add a Return block</FontText>
            )}
          </Row>
        </View>
      </Column>
    );
  } else if (statement.kind === 'ReturnStatement') {
    content = (
      <Row className="items-center justify-between gap-2">
        <Row className="items-center gap-2">
          <FontText weight="medium">Return</FontText>
          <ExpressionSocket
            expression={statement.value ?? { kind: 'NothingLiteral', span }}
            location={{
              statementPath: currentPath,
              slot: { kind: 'returnValue' },
              expressionPath: [],
            }}
            contextVariables={contextVariables}
            entryKeysBySource={entryKeysBySource}
            onAdd={onAdd}
            onSetExpression={onSetExpression}
            onEditMarkdown={onEditMarkdown}
          />
        </Row>
        <DeleteButton onPress={() => onDeleteStatement(currentPath)} />
      </Row>
    );
  } else {
    content = <FontText variant="subtext">Unsupported statement: {statement.kind}</FontText>;
  }

  const isFunction = statement.kind === 'FunctionStatement';
  return (
    <Swapable
      label={statementLabel}
      variant="statement"
      onSwap={swapStatement}
      isFunction={isFunction}
      indent={stmtPath!.length * 12}>
      {content}
    </Swapable>
  );
};

const Canvas = ({
  statements,
  definedVariables,
  onAdd,
  onSetExpression,
  onSetStatementField,
  onDeleteStatement,
  entryKeysBySource,
  stmtPath = [],
  onEditMarkdown,
}: CanvasProps) => (
  <Column className="gap-0">
    {statements.length > 0 && (
      <PuzzleConnector
        direction="vertical"
        tooltip="Add block"
        onPress={() => onAdd({ kind: 'statement', path: [...stmtPath, 0] })}
      />
    )}
    {statements.map((statement, index) => (
      <React.Fragment key={`stmt-${stmtPath.join('-')}-${index}`}>
        <StatementBlock
          statement={statement}
          index={index}
          stmtPath={stmtPath}
          definedVariables={definedVariables}
          onAdd={onAdd}
          onSetExpression={onSetExpression}
          onEditMarkdown={onEditMarkdown}
          onSetStatementField={onSetStatementField}
          onDeleteStatement={onDeleteStatement}
          entryKeysBySource={entryKeysBySource}
        />
        <PuzzleConnector
          direction="vertical"
          tooltip="Add block"
          onPress={() => onAdd({ kind: 'statement', path: [...stmtPath, index + 1] })}
        />
      </React.Fragment>
    ))}
    {statements.length === 0 && (
      <Pressable
        accessibilityRole="button"
        onPress={() => onAdd({ kind: 'statement', path: [...stmtPath, 0] })}>
        <View className="border-subtle-border my-2 h-10 w-full flex-row items-center justify-center gap-2 rounded-xl border border-dashed bg-transparent">
          <FontText className="text-text/40 text-sm">+</FontText>
          <FontText variant="subtext" className="text-sm">
            press to add a block
          </FontText>
        </View>
      </Pressable>
    )}
  </Column>
);

export default Canvas;
