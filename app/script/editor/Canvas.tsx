import React, { useEffect, useId, useMemo, useState } from 'react';
import { Pressable, ScrollView, View, type TextStyle } from 'react-native';
import { Plus, X, Pencil, Bookmark, BookmarkCheck, MessageCircle } from 'lucide-react-native';
import Column from '../../components/layout/Column';
import Row from '../../components/layout/Row';
import FontText from '../../components/ui/text/FontText';
import AppDropdown from '../../components/ui/forms/AppDropdown';
import FontTextInput from '../../components/ui/forms/FontTextInput';
import ShadowScrollView from '../../components/ui/ShadowScrollView';
import AppButton from '../../components/ui/buttons/AppButton';
import ConvexDialog from '../../components/ui/dialog/ConvexDialog';
import { CloseButton } from '../../components/game/markdownEditor';
import { getTagColor } from '../../components/game/TagPill';
import AddTagDialog from '../../components/game/AddTagDialog';
import { useValue } from 'hooks/useData';
import { getGameScopedKey } from 'utils/multiplayer';
import type { TagDefinitionsData } from '../../components/game/TagCellEditor';
import { useTooltip } from './useTooltip';
import type {
  BinaryOperator,
  CallArgument,
  CallExpression,
  DropdownLiteral,
  Expression,
  FunctionTemplatePiece,
  IdentifierExpression,
  ListLiteral,
  NamedArgument,
  Statement,
} from '../lang/ast';
import { emptySpan } from '../lang/ast';
import { parseExpression } from '../lang/parser';
import { printExpression, printStatement } from '../lang/printer';
import type { BlockInput, InputType } from '../registry';
import { EXPRESSION_BLOCKS, STATEMENT_BLOCKS } from '../registry';
import type { DefinedFunction, InsertTarget } from './InsertModal';
import { BUILTIN_FUNCTION_NAMES } from './InsertModal';
import {
  applyEntryTransition,
  decomposeChain,
  recomposeChain,
  renameIdentifier,
  traceEntrySource,
  type ChainLink,
  type ExpressionLocation,
  type ExpressionPathStep,
} from './expressionEditor';
import DropdownLiteralEditor from './DropdownLiteralEditor';
import ListLiteralEditor from './ListLiteralEditor';
import FunctionTemplateEditor from './FunctionTemplateEditor';

const span = emptySpan();

/** Context for input label → data source mapping (used for entry autocomplete tracing). */
const InputSourcesContext = React.createContext<Record<string, string>>({});

/** Context for tag definitions (used by tag() call rendering). */
interface TagDefinitionsContextValue {
  definitions: TagDefinitionsData;
  gameId?: string;
}
const TagDefinitionsContext = React.createContext<TagDefinitionsContextValue | null>(null);
const BOOLEAN_OPERATORS: BinaryOperator[] = ['==', '!=', '>', '<', '>=', '<=', 'AND', 'OR'];
const MATH_OPERATORS: BinaryOperator[] = ['+', '-', '*', '/', '%'];
const isMathOperator = (op: BinaryOperator) => MATH_OPERATORS.includes(op);

const sanitizeIdentifier = (value: string) =>
  value.replace(/[^a-zA-Z0-9_]/g, '').replace(/^[0-9]/, '_$&');

interface CanvasProps {
  statements: Statement[];
  definedVariables: string[];
  definedFunctions?: DefinedFunction[];
  onAdd: (target: InsertTarget) => void;
  onSetExpression: (
    location: ExpressionLocation,
    expression: Expression,
    trackHistory?: boolean
  ) => void;
  onSetStatementField: (
    path: number[],
    field:
      | 'name'
      | 'parameters'
      | 'itemName'
      | 'template'
      | 'columnType'
      | 'players'
      | 'dayIndex'
      | 'updateValue',
    value: string | string[] | FunctionTemplatePiece[] | Expression
  ) => void;
  onDeleteStatement: (path: number[]) => void;
  entryKeysBySource?: Record<string, string[]>;
  inputSources?: Record<string, string>;
  stmtPath?: number[];
  onEditMarkdown?: (currentValue: string, onSave: (newValue: string) => void) => void;
  /** When true, UpdateCell blocks show "Update Cell" instead of "On Certify => Update Cell" */
  isTriggerContext?: boolean;
  /** Game ID, used to load tag definitions for the tag() function dropdown. */
  gameId?: string;
  /** Names of functions the user has saved to their library. */
  savedFunctionNames?: string[];
  /** Save a function to the user's library (by printing its source). */
  onSaveFunction?: (name: string, source: string) => void;
  /** Remove a function from the user's library. */
  onUnsaveFunction?: (name: string) => void;
  /** Called when the user clicks a locked (saved/built-in) function.
   * Opens the decouple dialog. */
  onLockedFunctionClick?: (path: number[], functionName: string, isBuiltin: boolean) => void;
  /** Names of functions that have been decoupled (no longer locked) in this
   * editing session. Used to exclude both saved and built-in functions from
   * the lock check. */
  decoupledFunctionNames?: string[];
  /** Set a comment on a statement at the given path. */
  onSetComment?: (path: number[], comment: string) => void;
}

const appendLocation = (
  location: ExpressionLocation,
  ...steps: ExpressionPathStep[]
): ExpressionLocation => ({
  ...location,
  expressionPath: [...location.expressionPath, ...steps],
});

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
  tooltipText,
}: {
  label: string;
  onSwap: () => void;
  children: React.ReactNode;
  variant?: 'statement' | 'block' | 'piece' | 'bare';
  isFunction?: boolean;
  indent?: number;
  tooltipText?: string;
}) => {
  const id = useId();
  const { hovered, setHovered } = useTooltip(id, tooltipText ?? `Change ${label}`);

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
      className={`relative m-0 h-7 w-7 items-center justify-center ${isVertical ? 'my-1 w-full' : ''}`}>
      <View
        className={`border-subtle-border items-center justify-center border transition-all ${
          isList ? 'rounded-[3px]' : 'rounded-full'
        } ${
          hovered ? 'bg-text/10 h-7 w-7' : isVertical ? 'bg-text/20 h-3 w-2' : 'bg-text/20 h-2 w-3'
        }`}>
        {hovered && <Plus size={14} color="#1a1a1a" />}
      </View>
    </Pressable>
  );
};

export const ReplaceableTextInput = ({
  value,
  onChangeText,
  placeholder,
  onReplace,
  minWidth = 80,
  maxWidth = 150,
  autoSize = false,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  onReplace?: () => void;
  minWidth?: number;
  maxWidth?: number;
  autoSize?: boolean;
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
    <View
      className="relative"
      style={autoSize ? { minWidth: 0, maxWidth } : { minWidth, maxWidth }}>
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
        style={
          autoSize
            ? ({ minWidth: 0, maxWidth: maxWidth + 70, fieldSizing: 'content' } as TextStyle)
            : { minWidth, maxWidth: maxWidth + 70 }
        }
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
export const StableTextInput = ({
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

interface FunctionCallRendererProps {
  call: CallExpression;
  location: ExpressionLocation;
  contextVariables: string[];
  entryKeysBySource?: Record<string, string[]>;
  entrySource?: string;
  entrySourceMap?: Record<string, string>;
  definedFunctions?: DefinedFunction[];
  onAdd: (target: InsertTarget) => void;
  onSetExpression: CanvasProps['onSetExpression'];
  onEditMarkdown?: CanvasProps['onEditMarkdown'];
}

const FunctionCallRenderer = ({
  call,
  location,
  contextVariables,
  entryKeysBySource,
  entrySource,
  entrySourceMap,
  definedFunctions,
  onAdd,
  onSetExpression,
  onEditMarkdown,
}: FunctionCallRendererProps) => {
  if (call.callee.kind !== 'IdentifierExpression') {
    return <FontText className="text-sm">{printExpression(call)}</FontText>;
  }
  const fnName = call.callee.name;
  const fnDef = definedFunctions?.find((f) => f.name === fnName);
  const template = fnDef?.template;
  const hasTemplate = template && template.length > 0;

  // Special case: tag() renders with an integrated dropdown
  if (fnName === 'tag') {
    return <TagCallRenderer call={call} onSetExpression={onSetExpression} location={location} />;
  }

  // If no template, render the flat argument list
  if (!hasTemplate) {
    return (
      <Row className="items-center gap-1">
        <FontText weight="medium" className="text-sm">
          {fnName}
        </FontText>
        {call.arguments.map((argument, index) => (
          <ExpressionSocket
            key={index}
            expression={argument.value}
            location={appendLocation(
              location,
              { kind: 'chainBase' },
              { kind: 'callArgument', index }
            )}
            contextVariables={contextVariables}
            entryKeysBySource={entryKeysBySource}
            entrySource={entrySource}
            entrySourceMap={entrySourceMap}
            isOuterExpression={false}
            definedFunctions={definedFunctions}
            label={`argument ${index + 1}`}
            onAdd={onAdd}
            onSetExpression={onSetExpression}
            onEditMarkdown={onEditMarkdown}
          />
        ))}
      </Row>
    );
  }

  // Render using the template layout
  // Input pieces map to call arguments by position
  const inputPieces = template!.filter((p) => p.kind === 'input');
  let inputIndex = 0;

  return (
    <Row className="items-center gap-1">
      {template!.map((piece, pieceIndex) => {
        if (piece.kind === 'text') {
          return (
            <FontText key={`tpl-${pieceIndex}`} className="text-sm">
              {piece.text}
            </FontText>
          );
        }
        // Input piece - render the corresponding argument
        const argIndex = inputIndex++;
        const argument = call.arguments[argIndex];
        if (!argument) {
          return (
            <FontText key={`tpl-${pieceIndex}`} variant="subtext" className="text-xs">
              {piece.label ?? 'input'}
            </FontText>
          );
        }
        return (
          <ExpressionSocket
            key={`tpl-${pieceIndex}`}
            expression={argument.value}
            location={appendLocation(
              location,
              { kind: 'chainBase' },
              { kind: 'callArgument', index: argIndex }
            )}
            contextVariables={contextVariables}
            entryKeysBySource={entryKeysBySource}
            entrySource={entrySource}
            entrySourceMap={entrySourceMap}
            isOuterExpression={false}
            definedFunctions={definedFunctions}
            label={piece.label ?? `argument ${argIndex + 1}`}
            onAdd={onAdd}
            onSetExpression={onSetExpression}
            onEditMarkdown={onEditMarkdown}
          />
        );
      })}
    </Row>
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
  definedFunctions?: DefinedFunction[];
  onAdd: (target: InsertTarget) => void;
  onSetExpression: CanvasProps['onSetExpression'];
  onEditMarkdown?: CanvasProps['onEditMarkdown'];
  /** When true, renders just the block(s) without chain scaffolding
   * (PuzzleConnectors, bg-black/5 wrapper, NothingLiteral base sockets).
   * Used by BlockPreview in the InsertModal. */
  preview?: boolean;
}

export const ExpressionSocket = ({
  expression,
  location,
  expectedType = 'expression',
  contextVariables,
  label = 'expression',
  entryKeysBySource,
  entrySource,
  entrySourceMap,
  isOuterExpression = true,
  definedFunctions,
  onAdd,
  onSetExpression,
  onEditMarkdown,
  preview = false,
}: ExpressionSocketProps) => {
  const chain = useMemo(() => decomposeChain(expression), [expression]);
  const inputSources = React.useContext(InputSourcesContext);
  const expressionLabel = (() => {
    if (expression.kind === 'BooleanLiteral') return String(expression.value);
    if (expression.kind === 'BinaryExpression') return expression.operator;
    if (expression.kind === 'UnaryExpression') {
      if (expression.operator === 'ISTRUTHY') return 'isTruthy';
      if (expression.operator === 'ISFALSY') return 'isFalsy';
      return expression.operator;
    }
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
    if (expression.kind === 'ListLiteral') return 'List';
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
      variableSources: entrySourceMap,
      inputSources,
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
    const binaryContent = (
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
          definedFunctions={definedFunctions}
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
          definedFunctions={definedFunctions}
          label="right side"
          onAdd={onAdd}
          onSetExpression={onSetExpression}
          onEditMarkdown={onEditMarkdown}
        />
      </Row>
    );
    const binarySwapable = (
      <Swapable
        label={expressionLabel}
        variant="block"
        onSwap={() => openExpressionModal('whole', expectedType)}>
        {binaryContent}
      </Swapable>
    );
    return isOuterExpression ? (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
        {binarySwapable}
      </ScrollView>
    ) : (
      binarySwapable
    );
  }

  if (expression.kind === 'UnaryExpression') {
    const unaryContent = (
      <Row
        className="items-center gap-1"
        style={{ borderRadius: expectedType === 'boolean' ? 0 : 6 }}>
        <FontText weight="medium" className="text-sm">
          {expression.operator === 'ISTRUTHY'
            ? 'isTruthy'
            : expression.operator === 'ISFALSY'
              ? 'isFalsy'
              : expression.operator}
        </FontText>
        <ExpressionSocket
          expression={expression.operand}
          location={appendLocation(location, { kind: 'unaryOperand' })}
          expectedType={
            expression.operator === 'NOT'
              ? 'boolean'
              : expression.operator === 'ISTRUTHY' || expression.operator === 'ISFALSY'
                ? 'expression'
                : 'number'
          }
          contextVariables={contextVariables}
          entryKeysBySource={entryKeysBySource}
          entrySource={entrySource}
          entrySourceMap={entrySourceMap}
          isOuterExpression={false}
          definedFunctions={definedFunctions}
          onAdd={onAdd}
          onSetExpression={onSetExpression}
          onEditMarkdown={onEditMarkdown}
        />
      </Row>
    );
    const unarySwapable = (
      <Swapable
        label={expressionLabel}
        variant="block"
        onSwap={() => openExpressionModal('whole', expectedType)}>
        {unaryContent}
      </Swapable>
    );
    return isOuterExpression ? (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
        {unarySwapable}
      </ScrollView>
    ) : (
      unarySwapable
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

  if (expression.kind === 'DropdownLiteral') {
    return (
      <Swapable
        label={expressionLabel}
        variant="block"
        onSwap={() => openExpressionModal('whole', expectedType)}>
        <DropdownLiteralEditor
          expression={expression}
          onChange={(next) => onSetExpression(location, next, true)}
          onEditOptions={(next) => onSetExpression(location, next, true)}
        />
      </Swapable>
    );
  }

  if (expression.kind === 'ListLiteral') {
    return (
      <Swapable
        label={expressionLabel}
        variant="block"
        onSwap={() => openExpressionModal('whole', expectedType)}>
        <ListLiteralEditor
          expression={expression}
          onEditItems={(next) => onSetExpression(location, next, true)}
        />
      </Swapable>
    );
  }

  const base = chain[0];
  // Label for the chain BASE (e.g. "players" in players.filter().map()), as
  // opposed to `expressionLabel` which describes the WHOLE expression (e.g.
  // ".map"). Used for the base's tooltip + the swap modal title so clicking
  // the base targets the base, not the last link.
  const chainBaseLabel = base.type === 'base' ? printExpression(base.expr) : expressionLabel;
  const chainBaseSource = useMemo(() => {
    if (base.type !== 'base') return entrySource;
    // Identifier: look up in entrySourceMap (lambda params, variables)
    if (base.expr.kind === 'IdentifierExpression') {
      return entrySourceMap?.[base.expr.name] ?? base.expr.name;
    }
    // Function call: trace through the function body to determine return source
    if (base.expr.kind === 'CallExpression' && base.expr.callee.kind === 'IdentifierExpression') {
      const fnName = base.expr.callee.name;
      const fnDef = definedFunctions?.find((f) => f.name === fnName);
      if (fnDef) {
        // Try tracing with actual call-site arguments for accuracy
        const traced = traceEntrySource(base.expr, {
          varSources: {},
          inputSources,
          definedFunctions: definedFunctions ?? [],
        });
        return traced ?? fnDef.returnEntrySource ?? entrySource;
      }
    }
    // Chain base (e.g. InputsWithData.entry("Select").map(...))
    if (base.expr.kind === 'MemberExpression' || base.expr.kind === 'CallExpression') {
      const traced = traceEntrySource(base.expr, {
        varSources: {},
        inputSources,
        definedFunctions: definedFunctions ?? [],
      });
      if (traced) return traced;
    }
    return entrySource;
  }, [base, entrySource, entrySourceMap, definedFunctions, inputSources]);
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
            autoSize
            maxWidth={120}
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
    <Row className={`items-center gap-0 ${preview ? '' : 'rounded-lg bg-black/5'}`}>
      {chain.map((link, index) => {
        const nextLink = chain[index + 1];
        const nextDefinition =
          nextLink && nextLink.type !== 'base'
            ? EXPRESSION_BLOCKS.find(
                (block) => block.id.toLowerCase() === nextLink.name.toLowerCase()
              )
            : undefined;
        // Compute the entry source for this link's position in the chain.
        // As we traverse through .entry("days").index(...), the source evolves
        // so subsequent .entry() calls get keys for the nested object type.
        let linkEntrySource = chainBaseSource;
        for (let i = 0; i < index; i++) {
          const prev = chain[i];
          if (prev.type === 'method' && prev.name.toLowerCase() === 'entry') {
            const keyArg = prev.args[0];
            if (keyArg && keyArg.value.kind === 'StringLiteral') {
              linkEntrySource = applyEntryTransition(linkEntrySource, keyArg.value.value);
            }
          }
        }
        return (
          <React.Fragment key={index}>
            {link.type === 'base' ? (
              link.expr.kind === 'NothingLiteral' ? (
                preview ? null : (
                  <BooleanSocket
                    onAdd={() => openExpressionModal('chainBase')}
                    tooltip="Add expression"
                  />
                )
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
                  <FunctionCallRenderer
                    call={link.expr}
                    location={location}
                    contextVariables={contextVariables}
                    entryKeysBySource={entryKeysBySource}
                    entrySource={chainBaseSource}
                    entrySourceMap={entrySourceMap}
                    definedFunctions={definedFunctions}
                    onAdd={onAdd}
                    onSetExpression={onSetExpression}
                    onEditMarkdown={onEditMarkdown}
                  />
                </Swapable>
              ) : (
                <Swapable
                  label={chainBaseLabel}
                  variant="block"
                  onSwap={() => openExpressionModal('chainBase', expectedType, chainBaseLabel)}>
                  <FontText className="text-sm">{printExpression(link.expr)}</FontText>
                </Swapable>
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
                    variableSources: entrySourceMap,
                    inputSources,
                    chainExpression: recomposeChain(chain.slice(0, index)),
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
                entrySource={linkEntrySource}
                entrySourceMap={entrySourceMap}
                definedFunctions={definedFunctions}
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
                    variableSources: entrySourceMap,
                    inputSources,
                    chainExpression: recomposeChain(chain.slice(0, index)),
                  })
                }
              />
            )}
            {!preview && (
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
                    variableSources: entrySourceMap,
                    inputSources,
                    chainExpression: recomposeChain(chain.slice(0, index + 1)),
                  })
                }
              />
            )}
          </React.Fragment>
        );
      })}
    </Row>
  );

  return isOuterExpression && !preview ? (
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
  definedFunctions,
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
  definedFunctions?: DefinedFunction[];
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
            definedFunctions={definedFunctions}
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

/** Global state to trigger the tag manager modal from anywhere in the Canvas tree. */
let openTagManagerFn: (() => void) | null = null;

/**
 * Tag manager modal — list of tags with edit buttons + New Tag.
 * Rendered once at the Canvas root, triggered by `openTagManagerFn`.
 */
const TagManagerModal = ({
  gameId,
  tagDefinitions,
  setTagDefs,
}: {
  gameId?: string;
  tagDefinitions: TagDefinitionsData;
  setTagDefs: (defs: TagDefinitionsData) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAddTagOpen, setIsAddTagOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<{ name: string; color: string } | null>(null);

  // Register/unregister the open function so any child can trigger this modal
  useEffect(() => {
    openTagManagerFn = () => setIsOpen(true);
    return () => {
      openTagManagerFn = null;
    };
  }, []);

  return (
    <>
      <ConvexDialog.Root
        isOpen={isOpen}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setIsOpen(false);
            setEditingTag(null);
          }
        }}>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="max-w-sm">
            <CloseButton
              onPress={() => {
                setIsOpen(false);
                setEditingTag(null);
              }}
            />
            <Column className="gap-3 pt-3">
              <FontText weight="medium" className="text-base">
                Tags
              </FontText>
              <ShadowScrollView className="border-subtle-border max-h-[300px] rounded-lg border">
                <Column className="gap-1 p-2">
                  {tagDefinitions.length === 0 ? (
                    <FontText variant="subtext" className="px-1 py-4 text-center text-xs">
                      No tags yet
                    </FontText>
                  ) : (
                    tagDefinitions.map((def) => {
                      const color = getTagColor(def.color);
                      return (
                        <Pressable
                          key={def.name}
                          onPress={() => {
                            setEditingTag(def);
                            setIsAddTagOpen(true);
                          }}
                          className="hover:bg-text/5 rounded-lg p-1.5">
                          <Row className="items-center gap-2">
                            <View
                              className="h-3.5 w-3.5 rounded-full"
                              style={{ backgroundColor: color.bg }}
                            />
                            <FontText
                              className="flex-1 text-xs"
                              weight="medium"
                              numberOfLines={1}
                              ellipsizeMode="tail">
                              {def.name}
                            </FontText>
                            <Pencil size={13} color="rgb(46, 41, 37)" style={{ opacity: 0.7 }} />
                          </Row>
                        </Pressable>
                      );
                    })
                  )}
                </Column>
              </ShadowScrollView>
              <AppButton
                variant="outline"
                className="h-8 w-full"
                onPress={() => {
                  setEditingTag(null);
                  setIsAddTagOpen(true);
                }}>
                <Row className="items-center gap-1">
                  <Plus size={13} color="rgb(46, 41, 37)" />
                  <FontText weight="medium" className="text-xs">
                    New Tag
                  </FontText>
                </Row>
              </AppButton>
            </Column>
          </ConvexDialog.Content>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>

      <AddTagDialog
        isOpen={isAddTagOpen}
        onOpenChange={(open) => {
          setIsAddTagOpen(open);
          if (!open) setEditingTag(null);
        }}
        onAdd={(name, colorName) => {
          setTagDefs([...tagDefinitions, { name, color: colorName }]);
        }}
        onEdit={(oldName, newName, colorName) => {
          setTagDefs(
            tagDefinitions.map((d) =>
              d.name === oldName ? { name: newName, color: colorName } : d
            )
          );
        }}
        onDelete={(name) => {
          setTagDefs(tagDefinitions.filter((d) => d.name !== name));
        }}
        editTag={editingTag}
        existingNames={tagDefinitions.map((d) => d.name)}
        gameId={gameId}
      />
    </>
  );
};

/**
 * Integrated dropdown for the tag() function argument.
 * Shows all tag definitions + "Edit Tags" at the bottom.
 */
const TagCallRenderer = ({
  call,
  onSetExpression,
  location,
}: {
  call: CallExpression;
  onSetExpression: CanvasProps['onSetExpression'];
  location: ExpressionLocation;
}) => {
  const ctx = React.useContext(TagDefinitionsContext);
  const tagDefs = ctx?.definitions ?? [];
  const currentValue =
    call.arguments[0]?.value.kind === 'StringLiteral' ? call.arguments[0].value.value : '';

  const options = tagDefs.map((def) => ({ value: def.name, label: def.name }));

  return (
    <Row className="items-center gap-1">
      <FontText weight="medium" className="text-sm">
        tag
      </FontText>
      <AppDropdown
        options={options}
        value={tagDefs.some((d) => d.name === currentValue) ? currentValue : undefined}
        onValueChange={(next) => {
          onSetExpression(location, {
            ...call,
            arguments: [
              {
                kind: 'PositionalArgument' as const,
                value: { kind: 'StringLiteral' as const, value: next, span },
                span,
              },
            ],
          });
        }}
        placeholder="Tag name"
        triggerClassName="min-w-32 !py-1.5 !px-2 text-sm"
        isInDialog
        allowUnselect={false}
        footer={
          <Row className="items-center gap-2 px-3 py-2">
            <Pencil size={14} color="rgb(46, 41, 37)" style={{ opacity: 0.7 }} />
            <FontText weight="medium" className="text-sm">
              Edit Tags
            </FontText>
          </Row>
        }
        onFooterPress={() => openTagManagerFn?.()}
      />
    </Row>
  );
};

const ColumnSelectorInput = ({
  expression,
  keys,
  location,
  contextVariables,
  entryKeysBySource,
  definedFunctions,
  onAdd,
  onSetExpression,
  onEditMarkdown,
}: {
  expression: Expression;
  keys: string[];
  location: ExpressionLocation;
  contextVariables: string[];
  entryKeysBySource?: Record<string, string[]>;
  definedFunctions?: DefinedFunction[];
  onAdd: CanvasProps['onAdd'];
  onSetExpression: CanvasProps['onSetExpression'];
  onEditMarkdown?: CanvasProps['onEditMarkdown'];
}) => {
  const isStringLiteral = expression.kind === 'StringLiteral';
  const value = isStringLiteral
    ? (expression as { kind: 'StringLiteral'; value: string }).value
    : '';
  const isCustom = !isStringLiteral || (value !== '' && !keys.includes(value));
  const [customMode, setCustomMode] = useState(isCustom);

  if (customMode) {
    return (
      <Row className="items-start gap-1">
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setCustomMode(false);
            onSetExpression(location, { kind: 'StringLiteral', value: '', span }, true);
          }}>
          <FontText className="text-xs opacity-60">List</FontText>
        </Pressable>
        <ExpressionSocket
          expression={expression}
          location={location}
          expectedType="string"
          contextVariables={contextVariables}
          entryKeysBySource={entryKeysBySource}
          definedFunctions={definedFunctions}
          onAdd={onAdd}
          onSetExpression={onSetExpression}
          onEditMarkdown={onEditMarkdown}
        />
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
        if (next === '__custom__') {
          setCustomMode(true);
          onSetExpression(location, { kind: 'StringLiteral', value: '', span }, true);
        } else {
          onSetExpression(location, { kind: 'StringLiteral', value: next, span }, true);
        }
      }}
      placeholder="Select column"
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
  definedFunctions,
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
  definedFunctions?: DefinedFunction[];
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
          definedFunctions={definedFunctions}
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
      definedFunctions={definedFunctions}
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
  definedFunctions,
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
  definedFunctions?: DefinedFunction[];
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
      definedFunctions={definedFunctions}
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

const SaveFunctionButton = ({
  isSaved,
  onSave,
  onUnsave,
}: {
  isSaved: boolean;
  onSave: () => void;
  onUnsave: () => void;
}) => {
  const tooltipId = useId();
  const { setHovered } = useTooltip(tooltipId, isSaved ? 'Saved' : 'Save to library');
  return (
    <Pressable
      accessibilityRole="button"
      onPress={isSaved ? onUnsave : onSave}
      className={isSaved ? 'bg-green-500/20 rounded' : ''}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}>
      {isSaved ? (
        <BookmarkCheck size={16} color="#1a1a1a" />
      ) : (
        <Bookmark size={16} color="#1a1a1a" />
      )}
    </Pressable>
  );
};

const StatementBlock = ({
  statement,
  index,
  stmtPath,
  definedVariables,
  definedFunctions,
  onAdd,
  onSetExpression,
  onSetStatementField,
  onDeleteStatement,
  entryKeysBySource,
  onEditMarkdown,
  isTriggerContext,
  savedFunctionNames,
  onSaveFunction,
  onUnsaveFunction,
  onLockedFunctionClick,
  decoupledFunctionNames,
  onSetComment,
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
  const isSavedFunction = savedFunctionNames?.includes(
    statement.kind === 'FunctionStatement' ? statement.name : ''
  ) ?? false;
  const isBuiltinFunction =
    statement.kind === 'FunctionStatement' && BUILTIN_FUNCTION_NAMES.has(statement.name);
  const isDecoupled =
    statement.kind === 'FunctionStatement' &&
    (decoupledFunctionNames?.includes(statement.name) ?? false);
  const isLockedFunction =
    (isSavedFunction || isBuiltinFunction) && !isDecoupled && !!onLockedFunctionClick;
  const swapStatement = () => {
    if (isLockedFunction && statement.kind === 'FunctionStatement') {
      onLockedFunctionClick!(currentPath, statement.name, isBuiltinFunction);
      return;
    }
    onAdd({
      kind: 'statement',
      mode: 'swap',
      swapLabel: statementLabel,
      path: currentPath,
      contextVariables,
    });
  };
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
            definedFunctions={definedFunctions}
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
      <Column className="gap-0">
        <View className="bg-text/10 rounded-t-xl p-2">
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
              definedFunctions={definedFunctions}
              onAdd={onAdd}
              onSetExpression={onSetExpression}
              onEditMarkdown={onEditMarkdown}
            />
          </Column>
        </View>
        <View className="border-subtle-border border-x px-2">
          <Canvas
            statements={statement.branches[0]?.body.statements ?? []}
            {...{
              definedVariables,
              definedFunctions,
              onAdd,
              onSetExpression,
              onSetStatementField,
              onDeleteStatement,
              entryKeysBySource,
              onEditMarkdown,
              isTriggerContext,
              savedFunctionNames,
              onSaveFunction,
              onUnsaveFunction,
              onLockedFunctionClick,
              decoupledFunctionNames,
              onSetComment,
            }}
            stmtPath={currentPath}
          />
        </View>
        <View className="bg-text/10 rounded-b-xl p-2" />
      </Column>
    );
  } else if (statement.kind === 'ForEachStatement') {
    content = (
      <Column className="gap-0">
        <View className="bg-text/10 rounded-t-xl p-2">
          <Column className="gap-2">
            <Row className="items-center justify-between gap-2">
              <Row className="items-center gap-2">
                <FontText weight="medium">For each</FontText>
                <ReplaceableTextInput
                  value={statement.itemName}
                  onChangeText={(value) =>
                    onSetStatementField(
                      currentPath,
                      'itemName',
                      sanitizeIdentifier(value) || 'Item'
                    )
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
              definedFunctions={definedFunctions}
              onAdd={onAdd}
              onSetExpression={onSetExpression}
              onEditMarkdown={onEditMarkdown}
            />
          </Column>
        </View>
        <View className="border-subtle-border border-x px-2">
          <Canvas
            statements={statement.body.statements}
            {...{
              definedVariables: [statement.itemName, ...definedVariables],
              definedFunctions,
              onAdd,
              onSetExpression,
              onSetStatementField,
              onDeleteStatement,
              entryKeysBySource,
              onEditMarkdown,
              isTriggerContext,
              savedFunctionNames,
              onSaveFunction,
              onUnsaveFunction,
              onLockedFunctionClick,
              decoupledFunctionNames,
              onSetComment,
            }}
            stmtPath={currentPath}
          />
        </View>
        <View className="bg-text/10 rounded-b-xl p-2" />
      </Column>
    );
  } else if (statement.kind === 'UpdateCellStatement') {
    const userColumns = entryKeysBySource?.['_userColumns'] ?? [];
    const dayColumns = entryKeysBySource?.['_dayColumns'] ?? [];
    // Built-in fields that are not extra columns but can be updated:
    // - livingState (alive/dead) is a player-level field
    // - vote, action, voteMultiplier are day-level fields
    const columnKeys =
      statement.columnType === 'user'
        ? ['livingState', ...userColumns]
        : ['vote', 'action', 'voteMultiplier', ...dayColumns];
    content = (
      <Column className="gap-0">
        {/* Cell selector section (row layout, like normal blocks) */}
        <View className="rounded-t-xl p-2">
          <Column className="gap-1">
            <Row className="items-center justify-between gap-2">
              <FontText weight="medium" className="text-sm">
                {isTriggerContext ? 'Update Cell' : 'On Certify => Update Cell'}
              </FontText>
              <DeleteButton onPress={() => onDeleteStatement(currentPath)} />
            </Row>
            {/* Players */}
            <Row className="items-start gap-2">
              <FontText variant="subtext" className="pt-1 text-xs">
                Players
              </FontText>
              <ExpressionSocket
                expression={statement.players}
                location={{
                  statementPath: currentPath,
                  slot: { kind: 'updateCellPlayers' },
                  expressionPath: [],
                }}
                expectedType="expression"
                contextVariables={contextVariables}
                entryKeysBySource={entryKeysBySource}
                definedFunctions={definedFunctions}
                onAdd={onAdd}
                onSetExpression={onSetExpression}
                onEditMarkdown={onEditMarkdown}
              />
            </Row>
            {/* Column type */}
            <Row className="items-start gap-2">
              <FontText variant="subtext" className="pt-1 text-xs">
                Column type
              </FontText>
              <AppDropdown
                options={[
                  { value: 'user', label: 'All-Game Columns' },
                  { value: 'day', label: 'Day-Specific Columns' },
                ]}
                value={statement.columnType}
                onValueChange={(next) => {
                  if (next === 'user' || next === 'day') {
                    onSetStatementField(currentPath, 'columnType', next);
                  }
                }}
                triggerClassName="min-w-32 !py-1 !px-2 text-sm"
                isInDialog
                allowUnselect={false}
              />
            </Row>
            {/* Day index (only for day columns) */}
            {statement.columnType === 'day' && statement.dayIndex && (
              <Row className="items-start gap-2">
                <FontText variant="subtext" className="pt-1 text-xs">
                  Day index
                </FontText>
                <ExpressionSocket
                  expression={statement.dayIndex}
                  location={{
                    statementPath: currentPath,
                    slot: { kind: 'updateCellDayIndex' },
                    expressionPath: [],
                  }}
                  expectedType="number"
                  contextVariables={contextVariables}
                  entryKeysBySource={entryKeysBySource}
                  definedFunctions={definedFunctions}
                  onAdd={onAdd}
                  onSetExpression={onSetExpression}
                  onEditMarkdown={onEditMarkdown}
                />
              </Row>
            )}
            {/* Column title dropdown (contextual, like .entry()) with custom mode */}
            <Row className="items-start gap-2">
              <FontText variant="subtext" className="pt-1 text-xs">
                Column
              </FontText>
              <ColumnSelectorInput
                expression={statement.column}
                keys={columnKeys}
                location={{
                  statementPath: currentPath,
                  slot: { kind: 'updateCellColumn' },
                  expressionPath: [],
                }}
                contextVariables={contextVariables}
                entryKeysBySource={entryKeysBySource}
                definedFunctions={definedFunctions}
                onAdd={onAdd}
                onSetExpression={onSetExpression}
                onEditMarkdown={onEditMarkdown}
              />
            </Row>
          </Column>
        </View>
        {/* ForEach section (column layout, dark background) */}
        <View className="bg-text/10 p-2">
          <Column className="gap-2">
            <Row className="items-center justify-between gap-2">
              <FontText weight="medium">For each</FontText>
              <Row className="items-center gap-2">
                <FontText variant="subtext" className="text-xs">
                  cell variable:
                </FontText>
                <ReplaceableTextInput
                  value={statement.itemName}
                  onChangeText={(value) =>
                    onSetStatementField(
                      currentPath,
                      'itemName',
                      sanitizeIdentifier(value) || 'cellContents'
                    )
                  }
                  placeholder="cellContents"
                />
              </Row>
            </Row>
          </Column>
        </View>
        <View className="border-subtle-border border-x px-2">
          <Canvas
            statements={statement.body.statements}
            {...{
              definedVariables: [statement.itemName, ...definedVariables],
              definedFunctions,
              onAdd,
              onSetExpression,
              onSetStatementField,
              onDeleteStatement,
              entryKeysBySource,
              onEditMarkdown,
              isTriggerContext,
              savedFunctionNames,
              onSaveFunction,
              onUnsaveFunction,
              onLockedFunctionClick,
              decoupledFunctionNames,
              onSetComment,
            }}
            stmtPath={currentPath}
          />
          {/* Update with expression — inside the loop body */}
          <Row className="border-subtle-border items-center gap-2 border-t py-2">
            <FontText weight="medium">Update with</FontText>
            <ExpressionSocket
              expression={statement.updateValue}
              location={{
                statementPath: currentPath,
                slot: { kind: 'updateCellValue' },
                expressionPath: [],
              }}
              expectedType="expression"
              contextVariables={[statement.itemName, ...contextVariables]}
              entryKeysBySource={entryKeysBySource}
              definedFunctions={definedFunctions}
              onAdd={onAdd}
              onSetExpression={onSetExpression}
              onEditMarkdown={onEditMarkdown}
            />
          </Row>
        </View>
        {/* Bottom strip (dark background, like ForEach) */}
        <View className="bg-text/10 rounded-b-xl p-2" />
      </Column>
    );
  } else if (statement.kind === 'OnTagAddedStatement') {
    content = (
      <Column className="gap-0">
        <View className="rounded-t-xl p-2">
          <Row className="items-center justify-between gap-2">
            <FontText weight="medium" className="text-sm">
              On Tag Added
            </FontText>
            <DeleteButton onPress={() => onDeleteStatement(currentPath)} />
          </Row>
        </View>
        <View className="border-subtle-border border-x px-2">
          <Canvas
            statements={statement.body.statements}
            {...{
              definedVariables,
              definedFunctions,
              onAdd,
              onSetExpression,
              onSetStatementField,
              onDeleteStatement,
              entryKeysBySource,
              onEditMarkdown,
              isTriggerContext,
              savedFunctionNames,
              onSaveFunction,
              onUnsaveFunction,
              onLockedFunctionClick,
              decoupledFunctionNames,
              onSetComment,
            }}
            stmtPath={currentPath}
          />
        </View>
        <View className="bg-text/10 rounded-b-xl p-2" />
      </Column>
    );
  } else if (statement.kind === 'OnTagRemovedStatement') {
    content = (
      <Column className="gap-0">
        <View className="rounded-t-xl p-2">
          <Row className="items-center justify-between gap-2">
            <FontText weight="medium" className="text-sm">
              On Tag Removed
            </FontText>
            <DeleteButton onPress={() => onDeleteStatement(currentPath)} />
          </Row>
        </View>
        <View className="border-subtle-border border-x px-2">
          <Canvas
            statements={statement.body.statements}
            {...{
              definedVariables,
              definedFunctions,
              onAdd,
              onSetExpression,
              onSetStatementField,
              onDeleteStatement,
              entryKeysBySource,
              onEditMarkdown,
              isTriggerContext,
              savedFunctionNames,
              onSaveFunction,
              onUnsaveFunction,
              onLockedFunctionClick,
              decoupledFunctionNames,
              onSetComment,
            }}
            stmtPath={currentPath}
          />
        </View>
        <View className="bg-text/10 rounded-b-xl p-2" />
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
      <View pointerEvents={isLockedFunction ? 'none' : 'auto'}>
      <Column className="gap-0">
        <View className="bg-text/10 rounded-t-xl p-2">
          <Column className="gap-2">
            <Row className="items-center justify-between">
              <FontText weight="medium">Function</FontText>
              <Row className="items-center gap-1">
                {onSaveFunction && onUnsaveFunction && !isLockedFunction && (
                  <SaveFunctionButton
                    isSaved={isSavedFunction && !isDecoupled}
                    onSave={() =>
                      onSaveFunction(statement.name, printStatement(statement))
                    }
                    onUnsave={() => onUnsaveFunction(statement.name)}
                  />
                )}
                {isLockedFunction && (isSavedFunction || isBuiltinFunction) && (
                  <View className="bg-green-500/20 rounded">
                    <BookmarkCheck size={16} color="#1a1a1a" />
                  </View>
                )}
                {!isLockedFunction && <DeleteButton onPress={() => onDeleteStatement(currentPath)} />}
              </Row>
            </Row>
            <FunctionTemplateEditor
              template={statement.template ?? []}
              onChange={(template) => onSetStatementField(currentPath, 'template', template)}
              statementPath={currentPath}
              contextVariables={contextVariables}
              definedFunctions={definedFunctions}
              entryKeysBySource={entryKeysBySource}
              onEditMarkdown={onEditMarkdown}
            />
          </Column>
        </View>
        <View className="border-subtle-border border-x px-2">
          <Canvas
            statements={bodyStatements}
            {...{
              definedVariables: [...statement.parameters, ...definedVariables],
              definedFunctions,
              onAdd,
              onSetExpression,
              onSetStatementField,
              onDeleteStatement,
              entryKeysBySource,
              onEditMarkdown,
              isTriggerContext,
              savedFunctionNames,
              onSaveFunction,
              onUnsaveFunction,
              onLockedFunctionClick,
              decoupledFunctionNames,
              onSetComment,
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
                definedFunctions={definedFunctions}
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
      </View>
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
            definedFunctions={definedFunctions}
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

  const isFunction =
    statement.kind === 'FunctionStatement' ||
    statement.kind === 'IfStatement' ||
    statement.kind === 'ForEachStatement';
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [commentDraft, setCommentDraft] = useState(statement.comment ?? '');
  const hasComment = !!statement.comment;
  const showCommentBlock = hasComment || isEditingComment;

  const handleCommentPress = () => {
    setCommentDraft(statement.comment ?? '');
    setIsEditingComment(true);
  };

  const handleCommentSave = () => {
    onSetComment?.(currentPath, commentDraft.trim());
    setIsEditingComment(false);
  };

  const handleCommentDelete = () => {
    setCommentDraft('');
    onSetComment?.(currentPath, '');
    setIsEditingComment(false);
  };

  return (
    <View style={{ marginLeft: stmtPath!.length * 12 }}>
      {showCommentBlock && (
        <View className="mb-1 ml-2 flex-row items-start gap-1">
          <View className="bg-text/5 border-subtle-border relative rounded-lg border p-2 flex-1">
            {hasComment && (
              <Pressable
                onPress={handleCommentDelete}
                className="absolute -right-1.5 -top-1.5 z-20 h-4 w-4 items-center justify-center rounded-full"
                style={{ backgroundColor: 'rgb(140, 134, 125)' }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={9} color="rgb(46, 41, 37)" />
              </Pressable>
            )}
            {isEditingComment ? (
              <FontTextInput
                value={commentDraft}
                onChangeText={setCommentDraft}
                onBlur={handleCommentSave}
                placeholder="Write a comment..."
                autoFocus
                autoGrow
                className="text-xs italic text-text"
                style={{ minHeight: 20, paddingTop: 0, paddingBottom: 0 }}
              />
            ) : (
              <Pressable onPress={() => { setCommentDraft(statement.comment ?? ''); setIsEditingComment(true); }}>
                <FontText variant="subtext" className="text-xs italic">
                  {statement.comment}
                </FontText>
              </Pressable>
            )}
          </View>
        </View>
      )}
      {showCommentBlock && (
        <View style={{ marginLeft: 14, width: 2, height: 8, backgroundColor: 'rgb(0,0,0,0.15)' }} />
      )}
      <View className="relative">
        {onSetComment && !isEditingComment && (
          <Pressable
            onPress={handleCommentPress}
            className="absolute -left-2 -top-2 z-20 h-5 w-5 items-center justify-center rounded-full"
            style={{ backgroundColor: 'rgb(140, 134, 125)' }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MessageCircle size={10} color="rgb(46, 41, 37)" />
          </Pressable>
        )}
        <Swapable
          label={statementLabel}
          variant="statement"
          onSwap={swapStatement}
          isFunction={isFunction}
          indent={0}
          tooltipText={isLockedFunction ? 'Click to edit' : undefined}>
          {content}
        </Swapable>
      </View>
    </View>
  );
};

// ── BlockPreview ────────────────────────────────────────────────────────
// Renders a Statement or Expression as a non-interactive visual preview,
// using the exact same rendering as the Canvas but with pointer events
// disabled and no-op callbacks. Used in the InsertModal to show users what
// a block will look like before they insert it.

const noop = () => {};
const noopLocation: ExpressionLocation = {
  statementPath: [0],
  slot: { kind: 'callArg', name: '' },
  expressionPath: [],
};

interface BlockPreviewProps {
  statement?: Statement;
  expression?: Expression;
  entryKeysBySource?: Record<string, string[]>;
  definedFunctions?: DefinedFunction[];
  /** Additional function definitions to make available for the preview render
   * (e.g. the function being previewed, which isn't in the script yet). */
  previewDefinedFunctions?: DefinedFunction[];
  definedVariables?: string[];
  isTriggerContext?: boolean;
}

export const BlockPreview = ({
  statement,
  expression,
  entryKeysBySource,
  definedFunctions,
  previewDefinedFunctions,
  definedVariables = [],
  isTriggerContext,
}: BlockPreviewProps) => {
  const allFunctions = useMemo(
    () => [...(definedFunctions ?? []), ...(previewDefinedFunctions ?? [])],
    [definedFunctions, previewDefinedFunctions]
  );
  if (statement) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
        <View pointerEvents="none">
          <StatementBlock
            statement={statement}
            index={0}
            stmtPath={[]}
            definedVariables={definedVariables}
            definedFunctions={allFunctions}
            onAdd={noop}
            onSetExpression={noop}
            onSetStatementField={noop}
            onDeleteStatement={noop}
            entryKeysBySource={entryKeysBySource}
            isTriggerContext={isTriggerContext}
          />
        </View>
      </ScrollView>
    );
  }
  if (expression) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
        <View pointerEvents="none">
          <ExpressionSocket
            expression={expression}
            location={noopLocation}
            contextVariables={definedVariables}
            entryKeysBySource={entryKeysBySource}
            definedFunctions={allFunctions}
            onAdd={noop}
            onSetExpression={noop}
            preview
          />
        </View>
      </ScrollView>
    );
  }
  return null;
};

const Canvas = ({
  statements,
  definedVariables,
  definedFunctions,
  onAdd,
  onSetExpression,
  onSetStatementField,
  onDeleteStatement,
  entryKeysBySource,
  inputSources,
  stmtPath = [],
  onEditMarkdown,
  isTriggerContext,
  gameId,
  savedFunctionNames,
  onSaveFunction,
  onUnsaveFunction,
  onLockedFunctionClick,
  decoupledFunctionNames,
  onSetComment,
}: CanvasProps) => {
  // Only load tag definitions at the root level (stmtPath is empty).
  // Nested Canvas instances inherit the context from the root.
  const isRoot = stmtPath.length === 0;
  const tagDefsKey = gameId && isRoot ? getGameScopedKey('tagDefinitions', gameId) : null;
  const [tagDefs, setTagDefs] = useValue<TagDefinitionsData>(tagDefsKey ?? '__no-game__', {
    defaultValue: [],
    privacy: 'PUBLIC',
  });
  const tagDefinitions = tagDefs?.value ?? [];

  const inner = (
    <InputSourcesContext.Provider value={inputSources ?? {}}>
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
              definedFunctions={definedFunctions}
              onAdd={onAdd}
              onSetExpression={onSetExpression}
              onEditMarkdown={onEditMarkdown}
              onSetStatementField={onSetStatementField}
              onDeleteStatement={onDeleteStatement}
              entryKeysBySource={entryKeysBySource}
              isTriggerContext={isTriggerContext}
              savedFunctionNames={savedFunctionNames}
              onSaveFunction={onSaveFunction}
              onUnsaveFunction={onUnsaveFunction}
              onLockedFunctionClick={onLockedFunctionClick}
              decoupledFunctionNames={decoupledFunctionNames}
              onSetComment={onSetComment}
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
    </InputSourcesContext.Provider>
  );

  if (!isRoot) {
    // Nested Canvas: just render the inner content (inherits tag context from root)
    return inner;
  }

  // Root Canvas: provide tag definitions context + render tag manager modal
  return (
    <TagDefinitionsContext.Provider value={{ definitions: tagDefinitions, gameId }}>
      {inner}
      <TagManagerModal gameId={gameId} tagDefinitions={tagDefinitions} setTagDefs={setTagDefs} />
    </TagDefinitionsContext.Provider>
  );
};

export default Canvas;
