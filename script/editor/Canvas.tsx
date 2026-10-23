import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import {
  Plus,
  X,
  Pencil,
  Bookmark,
  BookmarkCheck,
  MessageCircle,
  Code2,
  FileText,
  FileWarning,
  FolderSearch,
  Flag,
  Check,
  ChevronRight,
  Folder,
  Settings,
} from 'lucide-react-native';
import Column from '../../components/layout/Column';
import Row from '../../components/layout/Row';
import FontText from '../../components/ui/text/FontText';
import AppDropdown from '../../components/ui/forms/AppDropdown';
import FontTextInput from '../../components/ui/forms/FontTextInput';
import ShadowScrollView from '../../components/ui/ShadowScrollView';
import AppButton from '../../components/ui/buttons/AppButton';
import ConvexDialog from '../../components/ui/dialog/ConvexDialog';
import DialogHeader from '../../components/ui/dialog/DialogHeader';
import UnsavedChangesDialog from '../../components/ui/dialog/UnsavedChangesDialog';
import { CloseButton } from '../../components/game/markdownEditor';
import { getTagColor, TAG_COLORS } from '../../components/game/TagPill';
import { useValue } from 'hooks/useData';
import { getGameScopedKey } from 'utils/multiplayer';
import type { TagDefinition, TagDefinitionsData } from '../../components/game/TagCellEditor';
import { useScriptFiles } from '../../hooks/useScriptFiles';
import { useFileEditorHost } from '../../components/game/scriptFiles/FileEditorHostContext';
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
  CellOpStatement,
} from '../lang/ast';
import { emptySpan } from '../lang/ast';
import type { CellContentType, UserTableTitle } from '../../types/playerTable';
import { useCreateExtraColumn } from '../../hooks/useCreateExtraColumn';
import {
  cellColumnKind,
  cellOperationDisabledReason,
  type CellColumnKind,
} from '../../utils/cellColumnTypes';
import { parseExpression } from '../lang/parser';
import { printExpression, printStatement } from '../lang/printer';
import { getMarkdownVariableNames } from '../markdownVariables';
import type { BlockInput, InputType } from '../registry';
import { EXPRESSION_BLOCKS, STATEMENT_BLOCKS } from '../registry';
import { getCategoryTint, getInputTypeTint, type BlockTint } from './blockColors';
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
import {
  getFileCallParts,
  buildFilesIndex,
  getFileInputs,
  isFileCallStatement,
  isFileInputStatement,
  isManualEntry,
  missingFileInputArgFallback,
  resolveFileRef,
  stripManualMarker,
  fileName as filePathName,
  createTagFileSource,
  getTagMeta,
  isTagFile,
  tagFileName,
  tagFileTriggerSource,
  TAGS_FOLDER,
  type ScriptFile,
  type ScriptFilesIndex,
} from '../../utils/scriptFiles';
import { getFolderCallParts, resolveFolderRef } from '../../utils/scriptFolders';
import { folderLabel } from '../../utils/scriptFolderIdentity';

const span = emptySpan();

/** Context for input label → data source mapping (used for entry autocomplete tracing). */
const InputSourcesContext = React.createContext<Record<string, string>>({});
const VariableRenameContext = React.createContext<((from: string, to: string) => void) | null>(
  null
);

/** Context for tag definitions (used by tag() call rendering). */
interface TagDefinitionsContextValue {
  definitions: TagDefinitionsData;
  gameId?: string;
}
const TagDefinitionsContext = React.createContext<TagDefinitionsContextValue | null>(null);

/** File-system context: present when the canvas edits file-aware content
 *  (script files or file-mode cells). File(...) statements render as file
 *  cards that can open the referenced file or re-pick it in the browser. */
export interface FileBlocksContextValue {
  index: ScriptFilesIndex;
  /** Set when editing a file: FileInput declarations hoist to the header
   *  strip instead of rendering as canvas blocks. */
  filePath?: string;
  /** Cell file-list mode: File(...) is the only top-level block kind, so
   *  clicking a file card goes straight to the file picker ("Change file").
   *  In a normal script the same click opens the block-swap modal instead
   *  ("Change file block"). */
  fileOnly?: boolean;
  /** Rendered centered in place of the "+ press to add a block" empty state,
   *  file-list cells show a chooser (new text / new script / browser). */
  emptyState?: React.ReactNode;
  /** Open the referenced file in a stacked editor (the host force-saves the
   *  current draft first). */
  onOpenFile?: (file: ScriptFile) => void;
  /** Re-pick which file the File statement at `statementPath` points to. */
  onRetargetFile?: (statementPath: number[]) => void;
  /** Re-pick a File() used as a value, without replacing its owning statement. */
  onRetargetFileExpression?: (location: ExpressionLocation) => void;
  /** Re-pick the folder referenced by a Folder(...) display block. */
  onRetargetFolder?: (statementPath: number[]) => void;
  /** Open per-reference folder ordering/visibility settings. */
  onOpenFolderSettings?: (statementPath: number[]) => void;
  /** Trigger files: FileInput statements stay on the canvas (flagged as
   *  incompatible) instead of hoisting into the header inputs strip. */
  showFileInputBlocks?: boolean;
}
const FileBlocksContext = React.createContext<FileBlocksContextValue | null>(null);
/** Expressions/statements flagged by file validation, rendered red. */
const InvalidExpressionsContext = React.createContext<Set<Expression> | null>(null);
const InvalidStatementsContext = React.createContext<Set<Statement> | null>(null);
/** Human-readable lint messages for flagged statements, rendered on the card. */
const StatementFlagMessagesContext = React.createContext<Map<Statement, string> | null>(null);
/** Insert-zone context: 'all' inside an UpdateCell body, 'cell' inside a
 *  For-each-cell loop. Nested canvases wrap themselves in the provider so
 *  the block selector offers the right cell-op blocks. */
const CellScopeContext = React.createContext<'all' | 'cell' | null>(null);
const ColumnTitlesContext = React.createContext<UserTableTitle | undefined>(undefined);
/** Provided only by editable canvases that may write the players table -
 *  previews/read-only surfaces get no context, so no "New Column" footer. */
const TableColumnActionsContext = React.createContext<{
  create: (scope: 'user' | 'day', name: string, type: CellContentType) => boolean;
} | null>(null);
const CellColumnKindContext = React.createContext<CellColumnKind | undefined>(undefined);
const BOOLEAN_OPERATORS: BinaryOperator[] = ['==', '!=', '>', '<', '>=', '<=', 'AND', 'OR'];
const MATH_OPERATORS: BinaryOperator[] = ['+', '-', '*', '/', '%'];
const isMathOperator = (op: BinaryOperator) => MATH_OPERATORS.includes(op);

/** Script globals that count as "data" sources (vs user-defined variables). */
const DATA_SOURCE_NAMES = new Set([
  'players',
  'roles',
  'currentPlayer',
  'currentDay',
  'dayDates',
  'schedule',
  'profiles',
  'Inputs',
  'InputsWithData',
  'placedTag',
  'placedUser',
  'placedDay',
  'placedColumn',
]);

const sanitizeIdentifier = (value: string) =>
  value.replace(/[^a-zA-Z0-9_]/g, '').replace(/^[0-9]/, '_$&');

interface CanvasProps {
  statements: Statement[];
  definedVariables: string[];
  variableNames?: string[];
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
      | 'op'
      | 'allowDuplicates'
      | 'autoRemove'
      | 'tagName'
      | 'tagColor',
    value: string | boolean | string[] | FunctionTemplatePiece[] | Expression
  ) => void;
  onDeleteStatement: (path: number[]) => void;
  onRenameVariable?: (from: string, to: string) => void;
  entryKeysBySource?: Record<string, string[]>;
  columnTitles?: UserTableTitle;
  inputSources?: Record<string, string>;
  stmtPath?: number[];
  onEditMarkdown?: (currentValue: string, onSave: (newValue: string) => void) => void;
  /** When true, UpdateCell blocks show "Update Cell" instead of "On Certify => Update Cell" */
  isTriggerContext?: boolean;
  /** Game ID, used to load tag definitions for the tag() function dropdown. */
  gameId?: string;
  /** Editable canvases only: enables writing new players-table columns from
   *  the UpdateCell column dropdown. */
  allowTableColumnCreate?: boolean;
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
  moveTool?: MoveToolControls;
  /** File-system context: root Canvas only; nested canvases inherit it.
   *  Enables File(...) cards + file-open/retarget actions. */
  fileBlocks?: FileBlocksContextValue;
  /** Expressions/statements flagged by file validation, rendered red. */
  invalidExpressions?: Set<Expression>;
  invalidStatements?: Set<Statement>;
  /** Lint messages keyed by statement - shown as a banner on the block card. */
  flagMessages?: Map<Statement, string>;
}

export type ExpressionMoveTarget =
  | { kind: 'whole'; location: ExpressionLocation; expression: Expression }
  | { kind: 'chainLink'; location: ExpressionLocation; linkIndex: number; link: ChainLink };

export interface MoveToolControls {
  operation: 'move' | 'clone';
  phase: 'collect' | 'place';
  category: 'expression' | 'block' | null;
  getLinkMarkers: (location: ExpressionLocation, linkIndex: number) => number[];
  getWholeMarker: (location: ExpressionLocation) => number | undefined;
  getOriginalStatementPath: (currentPath: number[]) => number[];
  getBlockMarkers: (currentParentPath: number[], currentBoundary: number) => number[];
  onPickExpression: (target: ExpressionMoveTarget) => void;
  onPickBlock: (path: number[], statement: Statement) => void;
  onReturn: (number: number) => void;
  canPlaceExpression: (target: { location: ExpressionLocation; linkIndex?: number }) => boolean;
  onPlaceExpression: (target: { location: ExpressionLocation; linkIndex?: number }) => void;
  onRequestExpressionSwap: (target: {
    location: ExpressionLocation;
    expression: Expression;
  }) => void;
  onPlaceBlock: (path: number[]) => void;
}

const MoveToolContext = React.createContext<MoveToolControls | null>(null);

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

// The single hover + click + tooltip target for every object in the editor,
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
      pointerEvents: 'none',
    }}
  />
);

const MoveNumberMarker = ({ number }: { number: number }) => {
  const moveTool = React.useContext(MoveToolContext);
  const animation = useRef(new Animated.Value(0)).current;
  const tooltipId = useId();
  const { setHovered } = useTooltip(tooltipId, `Click to return ${number}`);
  useEffect(() => {
    Animated.spring(animation, {
      toValue: 1,
      useNativeDriver: true,
      speed: 22,
      bounciness: 7,
    }).start();
  }, [animation]);
  return (
    <View
      style={{ alignSelf: 'center' }}
      {...({
        onPointerDown: (event: PointerEvent) => {
          event.preventDefault();
          event.stopPropagation();
          moveTool?.onReturn(number);
        },
      } as Record<string, unknown>)}>
      <Animated.View style={{ opacity: animation, transform: [{ scale: animation }] }}>
        <Pressable
          accessibilityRole="button"
          onPress={() => moveTool?.onReturn(number)}
          onHoverIn={() => setHovered(true)}
          onHoverOut={() => setHovered(false)}
          className="border-subtle-border bg-text/10 h-7 w-7 items-center justify-center rounded-full border">
          <FontText weight="medium" className="text-xs">
            {number}
          </FontText>
        </Pressable>
      </Animated.View>
    </View>
  );
};

const Swapable = ({
  label,
  onSwap,
  children,
  variant = 'block',
  isFunction = false,
  indent = 0,
  tooltipText,
  moveTarget,
  tint,
}: {
  label: string;
  onSwap: () => void;
  children: React.ReactNode;
  variant?: 'statement' | 'block' | 'piece' | 'bare';
  isFunction?: boolean;
  indent?: number;
  tooltipText?: string;
  moveTarget?: ExpressionMoveTarget | { kind: 'block'; path: number[]; statement: Statement };
  /** Category/type color: tints the block background and border. */
  tint?: BlockTint;
}) => {
  const moveTool = React.useContext(MoveToolContext);
  const moveKind = moveTarget?.kind === 'block' ? 'block' : moveTarget ? 'expression' : undefined;
  const canPick =
    !!moveTool &&
    moveTool.phase === 'collect' &&
    !!moveKind &&
    (moveTool.category === null || moveTool.category === moveKind);
  const canPlaceWhole =
    !!moveTool &&
    moveTool.phase === 'place' &&
    moveTarget?.kind === 'whole' &&
    moveTool.canPlaceExpression({ location: moveTarget.location });
  const id = useId();
  const action = moveTool
    ? moveTool.phase === 'place'
      ? canPlaceWhole
        ? 'Swap here'
        : undefined
      : `${moveTool.operation === 'move' ? 'Move' : 'Clone'} ${label}`
    : (tooltipText ?? `Change ${label}`);
  const { hovered, setHovered } = useTooltip(id, action);

  // `textured` variants get the paper background layer.
  // `bare` is the only flat variant (used for inline elements with no border).
  const textured = variant !== 'bare';
  // The texture layer is absolute-positioned inside the border (in the
  // padding box), so its border-radius must be the container's outer
  // radius minus the 1px border width to align with the rounded corners.
  //   piece:  rounded(4px)  - 1 = 3px
  //   block/statement: rounded-xl(12px) - 1 = 11px
  const radius = variant === 'piece' ? 3 : 11;

  const bgClass = tint ? '' : 'bg-inner-background';
  const containerClassName = (() => {
    if (variant === 'piece') {
      return `border-subtle-border rounded border px-2 py-1 relative overflow-hidden ${bgClass} ${
        hovered ? 'border-text/30' : 'border-subtle-border'
      }`;
    }
    if (variant === 'bare') {
      return 'bg-transparent';
    }
    if (variant === 'statement') {
      return `rounded-xl border ${isFunction ? 'p-1' : 'p-3'} relative overflow-hidden ${bgClass} ${
        hovered ? 'border-text/30' : 'border-subtle-border'
      }`;
    }
    return `rounded-xl border px-2 py-1 relative overflow-hidden ${bgClass} ${
      hovered ? 'border-text/30' : 'border-subtle-border'
    }`;
  })();

  // Web-only: `outline` paints outside the border box, so a 1px outline in
  // the hover border color reads as a widened border without changing the
  // element's size or shifting layout (unlike bumping border-width).
  const hoverOutlineStyle = hovered
    ? ({
        outlineWidth: 1,
        outlineStyle: 'solid',
        outlineColor: tint ? tint.solid : 'color-mix(in srgb, var(--color-text) 30%, transparent)',
        ...(variant === 'bare' ? { borderRadius: 4 } : {}),
      } as ViewStyle)
    : undefined;

  return (
    <View
      style={[
        // Small margin leaves room for the 1px hover outline so it isn't
        // clipped by `overflow-hidden` parents or flush sibling edges.
        { margin: 2, marginLeft: indent + 2 },
        tint && {
          backgroundColor: tint.bg,
          borderColor: hovered ? tint.solid : tint.border,
        },
        hoverOutlineStyle,
      ]}
      className={containerClassName}
      {...({ 'data-swapable': true, 'data-move-kind': moveKind } as Record<string, unknown>)}
      {...({
        onPointerDown: (e: PointerEvent) => {
          if (!moveTool || !canPick || !moveTarget) return;
          const target = e.target as HTMLElement;
          const current = e.currentTarget as HTMLElement;
          const selector = moveTool.category
            ? `[data-move-kind="${moveTool.category}"]`
            : '[data-move-kind]';
          if (target.closest(selector) !== current) return;
          e.preventDefault();
          e.stopPropagation();
          if (moveTarget.kind === 'block')
            moveTool.onPickBlock(moveTarget.path, moveTarget.statement);
          else moveTool.onPickExpression(moveTarget);
        },
        onClickCapture: (e: MouseEvent) => {
          if (!canPlaceWhole || moveTarget?.kind !== 'whole') return;
          const target = e.target as HTMLElement;
          const current = e.currentTarget as HTMLElement;
          const selector = moveTool?.category
            ? `[data-move-kind="${moveTool.category}"]`
            : '[data-swapable]';
          if (target.closest(selector) !== current) return;
          e.preventDefault();
          e.stopPropagation();
          moveTool?.onRequestExpressionSwap({
            location: moveTarget.location,
            expression: moveTarget.expression,
          });
        },
        onMouseOver: (e: MouseEvent) => {
          const target = e.target as HTMLElement;
          const current = e.currentTarget as HTMLElement;
          const selector = moveTool?.category
            ? `[data-move-kind="${moveTool.category}"]`
            : '[data-swapable]';
          const swapableEl = target.closest(selector);
          const interactiveEl = target.closest(INTERACTIVE_SELECTOR);
          if (
            (interactiveEl && !moveTool) ||
            (swapableEl && swapableEl !== current) ||
            (!canPick && !canPlaceWhole && moveTool)
          ) {
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
          const selector = moveTool?.category
            ? `[data-move-kind="${moveTool.category}"]`
            : '[data-swapable]';
          const swapableEl = target.closest(selector);
          const interactiveEl = target.closest(INTERACTIVE_SELECTOR);
          if ((interactiveEl && !moveTool) || (swapableEl && swapableEl !== current)) return;
          if (moveTool) {
            if (!canPlaceWhole || moveTarget?.kind !== 'whole') return;
            e.preventDefault();
            e.stopPropagation();
            moveTool.onRequestExpressionSwap({
              location: moveTarget.location,
              expression: moveTarget.expression,
            });
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          onSwap();
        },
      } as Record<string, unknown>)}>
      {textured && <PaperTexture radius={radius} />}
      <View className="relative">{children}</View>
    </View>
  );
};

const PuzzleConnector = ({
  direction,
  type = 'expression',
  onPress,
  tooltip,
  placeTarget,
}: {
  direction: 'vertical' | 'horizontal';
  type?: InputType;
  onPress: () => void;
  tooltip?: string;
  placeTarget?:
    | { kind: 'expression'; location: ExpressionLocation; linkIndex: number }
    | { kind: 'block'; path: number[] };
}) => {
  const moveTool = React.useContext(MoveToolContext);
  const validPlace =
    !!moveTool &&
    moveTool.phase === 'place' &&
    !!placeTarget &&
    (placeTarget.kind === 'block'
      ? moveTool.category === 'block'
      : moveTool.category === 'expression' && moveTool.canPlaceExpression(placeTarget));
  const tooltipId = useId();
  const { hovered, setHovered } = useTooltip(
    tooltipId,
    moveTool ? (validPlace ? 'Place here' : undefined) : tooltip
  );
  const isVertical = direction === 'vertical';
  const isList = type === 'list';
  const disabled = !!moveTool && !validPlace;
  const socketTint = getInputTypeTint(type);
  const handlePress = () => {
    if (!moveTool) return onPress();
    if (!validPlace || !placeTarget) return;
    if (placeTarget.kind === 'block') moveTool.onPlaceBlock(placeTarget.path);
    else moveTool.onPlaceExpression(placeTarget);
  };
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={handlePress}
      onHoverIn={() => !disabled && setHovered(true)}
      onHoverOut={() => setHovered(false)}
      className={`relative m-0 h-7 w-7 items-center justify-center ${isVertical ? 'my-1 w-full' : ''}`}>
      <View
        style={
          !validPlace && type
            ? { borderColor: socketTint.solid, backgroundColor: socketTint.soft }
            : undefined
        }
        className={`items-center justify-center border transition-all ${
          isList ? 'rounded-[3px]' : 'rounded-full'
        } ${
          validPlace
            ? 'h-7 w-7 border-green-800 bg-green-700'
            : hovered
              ? 'border-subtle-border bg-text/10 h-7 w-7'
              : isVertical
                ? 'border-subtle-border bg-text/20 h-3 w-2'
                : 'border-subtle-border bg-text/20 h-2 w-3'
        } ${disabled ? 'opacity-30' : ''}`}>
        {(hovered || validPlace) && <Plus size={14} color={validPlace ? '#fff' : '#1a1a1a'} />}
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
  autoSize = true,
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

  // `field-sizing: content` lets web inputs shrink to their text. It has no
  // native equivalent, so non-web keeps the fixed minWidth bounds.
  const fitsContent = autoSize && Platform.OS === 'web';

  return (
    <View
      className="relative"
      style={fitsContent ? { minWidth: 0, maxWidth } : { minWidth, maxWidth }}>
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
        className={`bg-white py-1 pl-2 text-sm ${onReplace ? 'pr-7' : 'pr-2'}`}
        style={
          fitsContent
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
  autoFocus?: boolean;
  selectTextOnFocus?: boolean;
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

const BooleanSocket = ({
  onAdd,
  tooltip,
  location,
  linkIndex,
  type,
}: {
  onAdd: () => void;
  tooltip?: string;
  location?: ExpressionLocation;
  linkIndex?: number;
  type?: InputType;
}) => {
  const moveTool = React.useContext(MoveToolContext);
  const validPlace =
    !!moveTool &&
    moveTool.phase === 'place' &&
    moveTool.category === 'expression' &&
    !!location &&
    moveTool.canPlaceExpression({ location, linkIndex });
  const tooltipId = useId();
  const { setHovered } = useTooltip(
    tooltipId,
    moveTool ? (validPlace ? 'Place here' : undefined) : tooltip
  );
  return (
    <Pressable
      accessibilityRole="button"
      disabled={!!moveTool && !validPlace}
      onPress={() => {
        if (moveTool && location) moveTool.onPlaceExpression({ location, linkIndex });
        else onAdd();
      }}
      onHoverIn={() => (!moveTool || validPlace) && setHovered(true)}
      onHoverOut={() => setHovered(false)}>
      <View
        style={
          !validPlace && type
            ? {
                borderColor: getInputTypeTint(type).solid,
                backgroundColor: getInputTypeTint(type).soft,
              }
            : undefined
        }
        className={`h-8 min-w-16 items-center justify-center rounded border border-dashed px-3 ${
          validPlace ? 'border-green-800 bg-green-700' : 'border-subtle-border bg-transparent'
        } ${moveTool && !validPlace ? 'opacity-30' : ''}`}>
        <FontText className={`text-sm ${validPlace ? 'text-white' : 'text-text/40'}`}>+</FontText>
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
  suppressMoveMarker?: boolean;
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
  suppressMoveMarker = false,
}: ExpressionSocketProps) => {
  const chain = useMemo(() => decomposeChain(expression), [expression]);
  const inputSources = React.useContext(InputSourcesContext);
  const moveTool = React.useContext(MoveToolContext);
  const fileBlocks = React.useContext(FileBlocksContext);
  const wholeMarker = suppressMoveMarker ? undefined : moveTool?.getWholeMarker(location);
  if (wholeMarker !== undefined) {
    if (moveTool?.operation === 'move') return <MoveNumberMarker number={wholeMarker} />;
    return (
      <Row className="items-center gap-1">
        <MoveNumberMarker number={wholeMarker} />
        <ExpressionSocket
          expression={expression}
          location={location}
          expectedType={expectedType}
          contextVariables={contextVariables}
          label={label}
          entryKeysBySource={entryKeysBySource}
          entrySource={entrySource}
          entrySourceMap={entrySourceMap}
          isOuterExpression={isOuterExpression}
          definedFunctions={definedFunctions}
          onAdd={onAdd}
          onSetExpression={onSetExpression}
          onEditMarkdown={onEditMarkdown}
          preview={preview}
          suppressMoveMarker
        />
      </Row>
    );
  }
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
        location={location}
        type={expectedType}
      />
    );
  }

  if (
    expression.kind === 'CallExpression' &&
    expression.callee.kind === 'IdentifierExpression' &&
    expression.callee.name.toLowerCase() === 'file' &&
    fileBlocks
  ) {
    const statement: Statement = { kind: 'ExpressionStatement', expression, span: expression.span };
    return (
      <Swapable
        label="file module"
        moveTarget={{ kind: 'whole', location, expression }}
        variant="piece"
        onSwap={() => openExpressionModal('whole', expectedType, 'file module')}>
        <FileCallCard
          statement={statement}
          currentPath={location.statementPath}
          expressionLocation={location}
          fileBlocks={fileBlocks}
          contextVariables={contextVariables}
          definedVariables={contextVariables}
          entryKeysBySource={entryKeysBySource}
          definedFunctions={definedFunctions}
          onAdd={onAdd}
          onSetExpression={onSetExpression}
          onEditMarkdown={onEditMarkdown}
        />
      </Swapable>
    );
  }

  if (expression.kind === 'BooleanLiteral') {
    return (
      <Swapable
        label={expressionLabel}
        moveTarget={{ kind: 'whole', location, expression }}
        variant="piece"
        tint={getCategoryTint('boolean')}
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
            onSetExpression(location, { ...expression, operator: operator as BinaryOperator }, true)
          }
          fitContent
          triggerClassName="!py-1 !px-2 text-sm"
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
        moveTarget={{ kind: 'whole', location, expression }}
        variant="block"
        tint={getCategoryTint(isMathOperator(expression.operator) ? 'math' : 'operator')}
        onSwap={() => openExpressionModal('whole', expectedType)}>
        {binaryContent}
      </Swapable>
    );
    const binaryWithConnector = (
      <Row className={`items-center gap-0 ${preview ? '' : 'rounded-lg bg-black/5'}`}>
        {binarySwapable}
        {!preview && (
          <PuzzleConnector
            direction="horizontal"
            type={expectedType}
            tooltip="Wrap expression"
            placeTarget={{ kind: 'expression', location, linkIndex: 1 }}
            onPress={() =>
              onAdd({
                kind: 'chainInsert',
                location,
                linkIndex: 1,
                contextVariables,
                variableSources: entrySourceMap,
                inputSources,
                chainExpression: expression,
                excludeProperties: true,
              })
            }
          />
        )}
      </Row>
    );
    return isOuterExpression ? (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}>
        {binaryWithConnector}
      </ScrollView>
    ) : (
      binaryWithConnector
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
        moveTarget={{ kind: 'whole', location, expression }}
        variant="block"
        tint={getCategoryTint(
          expression.operator === 'NOT'
            ? 'operator'
            : expression.operator === 'ISTRUTHY' || expression.operator === 'ISFALSY'
              ? 'boolean'
              : 'math'
        )}
        onSwap={() => openExpressionModal('whole', expectedType)}>
        {unaryContent}
      </Swapable>
    );
    const unaryWithConnector = (
      <Row className={`items-center gap-0 ${preview ? '' : 'rounded-lg bg-black/5'}`}>
        {unarySwapable}
        {!preview && (
          <PuzzleConnector
            direction="horizontal"
            type={expectedType}
            tooltip="Wrap expression"
            placeTarget={{ kind: 'expression', location, linkIndex: 1 }}
            onPress={() =>
              onAdd({
                kind: 'chainInsert',
                location,
                linkIndex: 1,
                contextVariables,
                variableSources: entrySourceMap,
                inputSources,
                chainExpression: expression,
                excludeProperties: true,
              })
            }
          />
        )}
      </Row>
    );
    return isOuterExpression ? (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}>
        {unaryWithConnector}
      </ScrollView>
    ) : (
      unaryWithConnector
    );
  }

  if (expression.kind === 'MarkdownLiteral') {
    const previewText = expression.value.trim() || 'Empty markdown';
    const variableNames = getMarkdownVariableNames(expression.value);
    return (
      <Swapable
        label={expressionLabel}
        moveTarget={{ kind: 'whole', location, expression }}
        variant="block"
        tint={getCategoryTint('display')}
        onSwap={() => openExpressionModal('whole', expectedType)}>
        <Column className="gap-2">
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              onEditMarkdown?.(expression.value, (newValue) => {
                const variables = getMarkdownVariableNames(newValue).map((name) => ({
                  name,
                  expression: expression.variables?.find((variable) => variable.name === name)
                    ?.expression ?? { kind: 'NothingLiteral' as const, span },
                }));
                onSetExpression(
                  location,
                  {
                    ...expression,
                    value: newValue,
                    variables: variables.length > 0 ? variables : undefined,
                  },
                  true
                );
              })
            }
            className="border-subtle-border max-h-32 overflow-hidden rounded-lg border p-2">
            <FontText className="text-sm">
              {previewText.slice(0, 200)}
              {previewText.length > 200 ? '…' : ''}
            </FontText>
          </Pressable>
          {variableNames.map((name) => (
            <Row key={name} className="items-center gap-2">
              <FontText variant="subtext" className="text-xs">
                {name}
              </FontText>
              <ExpressionSocket
                expression={
                  expression.variables?.find((variable) => variable.name === name)?.expression ?? {
                    kind: 'NothingLiteral',
                    span,
                  }
                }
                location={appendLocation(location, { kind: 'markdownVariable', name })}
                contextVariables={contextVariables}
                entryKeysBySource={entryKeysBySource}
                entrySource={entrySource}
                entrySourceMap={entrySourceMap}
                isOuterExpression={false}
                definedFunctions={definedFunctions}
                label={name}
                onAdd={onAdd}
                onSetExpression={onSetExpression}
                onEditMarkdown={onEditMarkdown}
              />
            </Row>
          ))}
        </Column>
      </Swapable>
    );
  }

  if (expression.kind === 'DropdownLiteral') {
    return (
      <Swapable
        label={expressionLabel}
        moveTarget={{ kind: 'whole', location, expression }}
        variant="block"
        tint={getCategoryTint('string')}
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
        moveTarget={{ kind: 'whole', location, expression }}
        variant="block"
        tint={getCategoryTint('list')}
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
  const chainBaseSource = (() => {
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
  })();
  const isSingleLiteral =
    chain.length === 1 &&
    base.type === 'base' &&
    (base.expr.kind === 'StringLiteral' ||
      base.expr.kind === 'NumberLiteral' ||
      base.expr.kind === 'NothingLiteral');

  if (moveTool && isSingleLiteral && base.type === 'base' && base.expr.kind !== 'NothingLiteral') {
    return (
      <Swapable
        label={expressionLabel}
        moveTarget={{ kind: 'whole', location, expression }}
        variant="piece"
        onSwap={() => openExpressionModal('whole', expectedType)}>
        <FontText className="text-sm">{printExpression(expression)}</FontText>
      </Swapable>
    );
  }

  if (isSingleLiteral && base.type === 'base') {
    if (expectedType === 'boolean')
      return (
        <BooleanSocket
          onAdd={() => openExpressionModal('whole', 'boolean')}
          tooltip={`Add ${label}`}
          location={location}
          type="boolean"
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
        const linkMarkers = moveTool?.getLinkMarkers(location, index) ?? [];
        return (
          <React.Fragment key={index}>
            {linkMarkers.map((number) => (
              <MoveNumberMarker key={`move-${number}`} number={number} />
            ))}
            {moveTool?.operation === 'move' && linkMarkers.length > 0 ? null : link.type ===
              'base' ? (
              link.expr.kind === 'NothingLiteral' ? (
                preview ? null : (
                  <BooleanSocket
                    onAdd={() => openExpressionModal('chainBase')}
                    tooltip="Add expression"
                    location={location}
                    linkIndex={0}
                    type={expectedType}
                  />
                )
              ) : link.expr.kind === 'IdentifierExpression' ? (
                <Swapable
                  label={chainBaseLabel}
                  moveTarget={{
                    kind: 'chainLink',
                    location,
                    linkIndex: index,
                    link,
                  }}
                  variant="piece"
                  tint={getCategoryTint(
                    DATA_SOURCE_NAMES.has(link.expr.name) ? 'data' : 'variable'
                  )}
                  onSwap={() => openExpressionModal('chainBase', expectedType, chainBaseLabel)}>
                  <FontText className="text-sm">{printExpression(link.expr)}</FontText>
                </Swapable>
              ) : link.expr.kind === 'CallExpression' &&
                link.expr.callee.kind === 'IdentifierExpression' ? (
                <Swapable
                  label={chainBaseLabel}
                  moveTarget={{
                    kind: 'chainLink',
                    location,
                    linkIndex: index,
                    link,
                  }}
                  variant="block"
                  tint={getCategoryTint(
                    (link.expr.callee as IdentifierExpression).name === 'tag' ? 'data' : 'function'
                  )}
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
                  moveTarget={{
                    kind: 'chainLink',
                    location,
                    linkIndex: index,
                    link,
                  }}
                  variant="block"
                  onSwap={() => openExpressionModal('chainBase', expectedType, chainBaseLabel)}>
                  <FontText className="text-sm">{printExpression(link.expr)}</FontText>
                </Swapable>
              )
            ) : link.type === 'property' ? (
              <Swapable
                label={`.${link.name}`}
                moveTarget={{
                  kind: 'chainLink',
                  location,
                  linkIndex: index,
                  link,
                }}
                variant="piece"
                tint={getCategoryTint(
                  EXPRESSION_BLOCKS.find(
                    (block) => block.id.toLowerCase() === link.name.toLowerCase()
                  )?.category
                )}
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
                placeTarget={{ kind: 'expression', location, linkIndex: index + 1 }}
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
  const moveTool = React.useContext(MoveToolContext);
  return (
    <Swapable
      label={`.${link.name}`}
      moveTarget={{
        kind: 'chainLink',
        location,
        linkIndex,
        link,
      }}
      variant="block"
      tint={getCategoryTint(definition?.category)}
      onSwap={onSwapWhole}>
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
  const invalidExpressions = React.useContext(InvalidExpressionsContext);
  const isInvalid = !!expression && (invalidExpressions?.has(expression) ?? false);
  const rawValue = expression.kind === 'StringLiteral' ? expression.value : '';
  // Manually-typed keys are stored with a "!" prefix, an internal marker
  // that exempts them from "unknown input" flagging (text mode uses the same
  // convention). The prefix is stripped for display.
  const displayValue = stripManualMarker(rawValue);
  const [custom, setCustom] = useState(
    Boolean(rawValue && (isManualEntry(rawValue) || !keys.includes(rawValue)))
  );
  const invalidClass = isInvalid ? 'border-red-500' : '';
  if (custom) {
    return (
      <Row className="items-center gap-1">
        <View className={`rounded ${isInvalid ? 'border border-red-500' : ''}`}>
          <ReplaceableTextInput
            value={displayValue}
            onChangeText={(next) =>
              onChange({
                kind: 'StringLiteral',
                value: next ? `!${stripManualMarker(next)}` : '',
                span,
              })
            }
            placeholder="Custom key"
            minWidth={110}
          />
        </View>
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
      value={keys.includes(rawValue) ? rawValue : undefined}
      onValueChange={(next) => {
        if (next === '__custom__') setCustom(true);
        else onChange({ kind: 'StringLiteral', value: next, span });
      }}
      placeholder="Select"
      fitContent
      triggerClassName={`!py-1 !px-2 text-sm ${invalidClass}`}
      isInDialog
      allowUnselect={false}
    />
  );
};

const ADD_NEW_VARIABLE_VALUE = '__add-new-variable__';

const VariableRenameModal = ({
  variableName,
  existingVariables,
  onOpenChange,
  onRename,
}: {
  variableName: string | null;
  existingVariables: string[];
  onOpenChange: (open: boolean) => void;
  onRename: (from: string, to: string) => void;
}) => {
  const [draftName, setDraftName] = useState('');
  const [initialName, setInitialName] = useState('');
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);

  useEffect(() => {
    if (!variableName) return;
    setDraftName(variableName);
    setInitialName(variableName);
    setIsLeaveConfirmOpen(false);
  }, [variableName]);

  const hasUnsavedChanges = draftName.trim() !== initialName.trim();
  const sanitizedName = sanitizeIdentifier(draftName);
  const hasCollision = existingVariables.some(
    (name) => name !== variableName && name.toLowerCase() === sanitizedName.toLowerCase()
  );
  const canSubmit = Boolean(variableName && sanitizedName && !hasCollision);
  const closeWithoutSaving = () => {
    setIsLeaveConfirmOpen(false);
    onOpenChange(false);
  };
  const handleDone = () => {
    if (!variableName || !canSubmit) return;
    if (sanitizedName !== variableName) onRename(variableName, sanitizedName);
    setInitialName(sanitizedName);
    onOpenChange(false);
  };
  const handleAttemptClose = () => {
    if (hasUnsavedChanges) setIsLeaveConfirmOpen(true);
    else onOpenChange(false);
  };
  const handleOpenChange = (open: boolean) => {
    if (!open) handleAttemptClose();
    else onOpenChange(true);
  };

  return (
    <>
      <ConvexDialog.Root isOpen={variableName !== null} onOpenChange={handleOpenChange}>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="max-w-md p-6" isSwipeable={false}>
            <CloseButton onPress={handleAttemptClose} accessibilityLabel="Cancel rename" />
            <DialogHeader text="Rename Variable" />
            <Column className="gap-4 px-5 pb-5">
              <Column className="gap-1">
                <FontText weight="medium">Variable name</FontText>
                <FontTextInput
                  autoFocus
                  className="border-subtle-border bg-background w-full rounded-xl border px-4 py-3"
                  value={draftName}
                  onChangeText={(next) => setDraftName(sanitizeIdentifier(next))}
                  onSubmitEditing={handleDone}
                  placeholder="Variable name"
                />
              </Column>
              {hasCollision && (
                <FontText className="text-sm">A variable already uses this name.</FontText>
              )}
              <Row className="justify-end gap-4 pt-2">
                <AppButton variant="outline" className="w-32 px-6" onPress={handleAttemptClose}>
                  <FontText weight="medium">Cancel</FontText>
                </AppButton>
                <AppButton
                  variant="filled"
                  className="w-32 px-6"
                  disabled={!canSubmit}
                  onPress={handleDone}>
                  <FontText weight="medium" color="white">
                    Done
                  </FontText>
                </AppButton>
              </Row>
            </Column>
          </ConvexDialog.Content>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>
      <UnsavedChangesDialog
        isOpen={isLeaveConfirmOpen}
        onOpenChange={setIsLeaveConfirmOpen}
        onSave={handleDone}
        onDiscard={closeWithoutSaving}
        title="Rename Variable?"
        message="Save the variable name change before closing?"
        saveLabel="Save"
        discardLabel="Discard"
      />
    </>
  );
};

const VariableNameInput = ({
  expression,
  definedVariables,
  onChange,
}: {
  expression: Expression;
  definedVariables: string[];
  onChange: (expression: Expression) => void;
}) => {
  const value = expression.kind === 'StringLiteral' ? expression.value : '';
  const variables = [...new Set(definedVariables)];
  const [custom, setCustom] = useState(
    variables.length === 0 || Boolean(value && !variables.includes(value))
  );
  const [customValue, setCustomValue] = useState(value);
  const [renamingVariable, setRenamingVariable] = useState<string | null>(null);
  const onRenameVariable = React.useContext(VariableRenameContext);

  useEffect(() => {
    setCustomValue(value);
  }, [value]);

  if (custom) {
    return (
      <Row className="items-center gap-1">
        <ReplaceableTextInput
          value={customValue}
          onChangeText={(next) => {
            const sanitized = sanitizeIdentifier(next);
            setCustomValue(sanitized);
            onChange({ kind: 'StringLiteral', value: sanitized, span });
          }}
          placeholder="Variable name"
          minWidth={110}
        />
        <Pressable accessibilityRole="button" onPress={() => setCustom(false)}>
          <FontText className="text-xs opacity-60">List</FontText>
        </Pressable>
      </Row>
    );
  }

  return (
    <>
      <AppDropdown
        options={[
          ...variables.map((variable) => ({ value: variable, label: variable })),
          { value: ADD_NEW_VARIABLE_VALUE, label: 'Add new…' },
        ]}
        value={variables.includes(value) ? value : undefined}
        onValueChange={(next) => {
          if (next === ADD_NEW_VARIABLE_VALUE) {
            setCustomValue('');
            setCustom(true);
          } else {
            onChange({ kind: 'StringLiteral', value: sanitizeIdentifier(next), span });
          }
        }}
        placeholder="Select"
        fitContent
        triggerClassName="!py-1 !px-2 text-sm"
        isInDialog
        allowUnselect={false}
        renderOptionAction={(option) =>
          option.value !== ADD_NEW_VARIABLE_VALUE && onRenameVariable ? (
            <Pencil size={14} color="rgb(46, 41, 37)" />
          ) : null
        }
        onOptionAction={(option) => setRenamingVariable(option.value)}
      />
      <VariableRenameModal
        variableName={renamingVariable}
        existingVariables={variables}
        onOpenChange={(open) => {
          if (!open) setRenamingVariable(null);
        }}
        onRename={(from, to) => onRenameVariable?.(from, to)}
      />
    </>
  );
};

/** Global state to trigger the tag manager modal from anywhere in the Canvas tree. */
let openTagManagerFn: (() => void) | null = null;

/**
 * Tag manager modal: list of tags with edit buttons + New Tag.
 * Rendered once at the Canvas root, triggered by `openTagManagerFn`.
 */
// AddTagDialog imports ScriptEditorDialog which imports this file, so it is
// resolved lazily inside components to avoid a require cycle.
const getAddTagDialog = () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- intentional lazy require to break the module cycle
  (
    require('../../components/game/AddTagDialog') as typeof import('../../components/game/AddTagDialog')
  ).default;

// FileEditorDialog also reaches this file through ScriptEditorDialog.
const getFileEditorDialog = () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- intentional lazy require to break the module cycle
  (
    require('../../components/game/scriptFiles/FileEditorDialog') as typeof import('../../components/game/scriptFiles/FileEditorDialog')
  ).default;

const TagLibraryProvider = ({
  gameId,
  definitions,
  setDefinitions,
  children,
}: {
  gameId: string;
  definitions: TagDefinitionsData;
  setDefinitions: (definitions: TagDefinitionsData) => void;
  children: React.ReactNode;
}) => {
  const filesApi = useScriptFiles(gameId);
  const tags = useMemo(() => {
    const files = [...filesApi.index.byId.values()].filter(isTagFile).map((file) => ({
      name: tagFileName(file),
      color: getTagMeta(file)?.color ?? 'Grey',
      tagId: file.id,
    }));
    const names = new Set(files.map((tag) => tag.name.toLowerCase()));
    return [...files, ...definitions.filter((tag) => !names.has(tag.name.toLowerCase()))].sort(
      (a, b) => a.name.localeCompare(b.name)
    );
  }, [filesApi.index, definitions]);
  return (
    <TagDefinitionsContext.Provider value={{ definitions: tags, gameId }}>
      {children}
      <TagManagerModal
        gameId={gameId}
        tagDefinitions={tags}
        legacyDefinitions={definitions}
        setTagDefs={setDefinitions}
        filesApi={filesApi}
      />
    </TagDefinitionsContext.Provider>
  );
};

const TagManagerModal = ({
  gameId,
  tagDefinitions,
  legacyDefinitions,
  setTagDefs,
  filesApi,
}: {
  gameId?: string;
  tagDefinitions: TagDefinitionsData;
  legacyDefinitions: TagDefinitionsData;
  setTagDefs: (defs: TagDefinitionsData) => void;
  filesApi: ReturnType<typeof useScriptFiles>;
}) => {
  const AddTagDialog = getAddTagDialog();
  const FileEditorDialog = getFileEditorDialog();
  const [isOpen, setIsOpen] = useState(false);
  const [isAddTagOpen, setIsAddTagOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagDefinition | null>(null);
  /** File-backed tags edit in the file editor (name + color + trigger body
   *  all live in the tag file) instead of the tag dialog. */
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const fileEditorHost = useFileEditorHost();
  const openTagFile = (tagId: string) =>
    fileEditorHost ? fileEditorHost.openFile(tagId) : setEditingFileId(tagId);

  // Register/unregister the open function so any child can trigger this modal
  useEffect(() => {
    const previous = openTagManagerFn;
    const open = () => setIsOpen(true);
    openTagManagerFn = open;
    return () => {
      if (openTagManagerFn === open) openTagManagerFn = previous;
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
            <Column className="gap-3">
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
                            if (def.tagId) openTagFile(def.tagId);
                            else {
                              setEditingTag(def);
                              setIsAddTagOpen(true);
                            }
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
                disabled={filesApi.isLoading}
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
          const file = filesApi.createFile(
            TAGS_FOLDER,
            filesApi.suggestName(name, TAGS_FOLDER),
            'script',
            'trigger'
          );
          if (file) {
            filesApi.updateFileSource(file.id, createTagFileSource(name, colorName));
            openTagFile(file.id);
          }
        }}
        onEdit={(oldName, newName, colorName) => {
          const file = editingTag?.tagId ? filesApi.index.byId.get(editingTag.tagId) : undefined;
          if (file) {
            filesApi.updateFileSource(
              file.id,
              createTagFileSource(newName, colorName, tagFileTriggerSource(file))
            );
            return;
          }
          setTagDefs(
            legacyDefinitions.map((d) =>
              d.name === oldName ? { ...d, name: newName, color: colorName } : d
            )
          );
        }}
        onDelete={(name) => {
          if (editingTag?.tagId) filesApi.deleteFile(editingTag.tagId);
          else setTagDefs(legacyDefinitions.filter((d) => d.name !== name));
        }}
        editTag={editingTag}
        existingNames={tagDefinitions.map((d) => d.name)}
        gameId={gameId}
      />

      {editingFileId && !fileEditorHost && (
        <FileEditorDialog
          isOpen
          onOpenChange={(open) => {
            if (!open) setEditingFileId(null);
          }}
          fileId={editingFileId}
          filesApi={filesApi}
          gameId={gameId}
        />
      )}
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
        placeholder="Select"
        fitContent
        triggerClassName="!py-1.5 !px-2 text-sm"
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
  columnScope,
  onCreateColumn,
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
  /** Enables the "New Column" footer: writes a players-table column for the
   *  given scope (user = all-game, day = day-specific). */
  columnScope?: 'user' | 'day';
  onCreateColumn?: (scope: 'user' | 'day', name: string, type: CellContentType) => boolean;
}) => {
  const isStringLiteral = expression.kind === 'StringLiteral';
  const value = isStringLiteral
    ? (expression as { kind: 'StringLiteral'; value: string }).value
    : '';
  const isCustom = !isStringLiteral || (value !== '' && !keys.includes(value));
  const [customMode, setCustomMode] = useState(isCustom);
  const [newColOpen, setNewColOpen] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColType, setNewColType] = useState<CellContentType>('tags');
  const [newColError, setNewColError] = useState<string | null>(null);
  const [newColLeaveOpen, setNewColLeaveOpen] = useState(false);

  const newColDirty = newColName.trim() !== '' || newColType !== 'tags';
  const openNewColumn = () => {
    setNewColName('');
    setNewColType('tags');
    setNewColError(null);
    setNewColLeaveOpen(false);
    setNewColOpen(true);
  };
  const attemptCloseNewColumn = () => {
    if (newColDirty) setNewColLeaveOpen(true);
    else setNewColOpen(false);
  };
  const handleNewColOpenChange = (open: boolean) => {
    if (!open) attemptCloseNewColumn();
    else setNewColOpen(true);
  };
  const confirmLeaveNewColumn = () => {
    setNewColLeaveOpen(false);
    setNewColOpen(false);
  };
  const submitNewColumn = () => {
    const name = newColName.trim();
    if (!name) return setNewColError('Name is required');
    if (keys.some((k) => k.toLowerCase() === name.toLowerCase()))
      return setNewColError('A column with this name already exists');
    if (!columnScope || !onCreateColumn?.(columnScope, name, newColType))
      return setNewColError('Could not create the column');
    onSetExpression(location, { kind: 'StringLiteral', value: name, span }, true);
    setNewColOpen(false);
  };

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
    <>
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
        placeholder="Select"
        fitContent
        triggerClassName="!py-1 !px-2 text-sm"
        isInDialog
        allowUnselect={false}
        footer={
          columnScope && onCreateColumn ? (
            <Row className="items-center gap-2 px-3 py-2">
              <Plus size={14} color="rgb(46, 41, 37)" style={{ opacity: 0.7 }} />
              <FontText weight="medium" className="text-sm">
                New Column
              </FontText>
            </Row>
          ) : undefined
        }
        onFooterPress={columnScope && onCreateColumn ? openNewColumn : undefined}
      />
      {/* hidden Root: closed dialogs render an empty View that eats flex
       *  gaps inside the block card layout */}
      <ConvexDialog.Root
        className="hidden"
        isOpen={newColOpen}
        onOpenChange={handleNewColOpenChange}>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="max-w-md" isSwipeable={false}>
            <CloseButton onPress={attemptCloseNewColumn} />
            <DialogHeader
              text="New Column"
              subtext={`Add a ${columnScope === 'day' ? 'day-specific' : 'all-game'} column to the players table`}
            />
            <Column className="gap-3">
              <Column className="gap-1">
                <FontText weight="medium">Name</FontText>
                <FontTextInput
                  autoFocus
                  placeholder="Column name..."
                  variant="styled"
                  className="w-full p-2"
                  value={newColName}
                  onChangeText={setNewColName}
                />
                {newColError && <FontText className="text-xs">{newColError}</FontText>}
              </Column>
              <Column className="gap-1">
                <FontText weight="medium">Content</FontText>
                <View className="border-subtle-border flex-row self-start overflow-hidden rounded-lg border">
                  {(['tags', 'files'] as const).map((t, i) => (
                    <Pressable
                      key={t}
                      accessibilityRole="button"
                      onPress={() => setNewColType(t)}
                      className={`h-8 w-24 items-center justify-center ${
                        newColType === t ? 'bg-text/20' : 'hover:bg-text/5'
                      } ${i === 0 ? '' : 'border-subtle-border border-l'}`}>
                      <FontText className="text-xs capitalize">{t}</FontText>
                    </Pressable>
                  ))}
                </View>
              </Column>
              <Row className="justify-end gap-3 pt-2">
                <AppButton
                  variant="outline"
                  className="h-9 w-24"
                  onPress={attemptCloseNewColumn}>
                  <FontText weight="medium">Cancel</FontText>
                </AppButton>
                <AppButton className="h-9 w-24" onPress={submitNewColumn}>
                  <FontText weight="medium" color="white">
                    Create
                  </FontText>
                </AppButton>
              </Row>
            </Column>
          </ConvexDialog.Content>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>
      <UnsavedChangesDialog
        isOpen={newColLeaveOpen}
        onOpenChange={setNewColLeaveOpen}
        onSave={submitNewColumn}
        onDiscard={confirmLeaveNewColumn}
        message="You have an unfinished column. Create it?"
        saveLabel="Create"
        discardLabel="Discard"
      />
    </>
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
        fitContent
        triggerClassName="!py-1 !px-2 text-sm"
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
  definedVariables,
  entryKeysBySource,
  entrySourceMap,
  definedFunctions,
  blockName,
  onAdd,
  onSetExpression,
  onEditMarkdown,
}: {
  argument: NamedArgument;
  input?: BlockInput;
  location: ExpressionLocation;
  contextVariables: string[];
  definedVariables: string[];
  entryKeysBySource?: Record<string, string[]>;
  entrySourceMap?: Record<string, string>;
  definedFunctions?: DefinedFunction[];
  blockName: string;
  onAdd: CanvasProps['onAdd'];
  onSetExpression: CanvasProps['onSetExpression'];
  onEditMarkdown?: CanvasProps['onEditMarkdown'];
}) => (
  <Row className="items-start gap-2">
    <FontText variant="subtext" className="pt-1 text-xs">
      {input?.label ?? argument.name}
    </FontText>
    {blockName.toUpperCase() === 'VARIABLE' && argument.name.toUpperCase() === 'NAME' ? (
      <VariableNameInput
        expression={argument.value}
        definedVariables={definedVariables}
        onChange={(next) => onSetExpression(location, next)}
      />
    ) : (
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
    )}
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

/* ── Block flags ───────────────────────────────────────────────────────
 * Rarely-changed options ("flags") live behind a small menu in the block
 * header instead of taking up a row. Visibility is derived, never stored
 * in the AST: a flag row renders while it holds a non-default value or
 * while the user has opted in via local state, so default-valued flags
 * clean themselves up on remount. Hiding a modified flag asks first,
 * then resets the value back to its default. */

interface BlockFlag {
  /** Stable id within the block (input name or statement field). */
  id: string;
  label: string;
  /** True when the current value equals the default: hiding needs no reset. */
  isDefault: boolean;
  /** Restore the value to its default. Called only after user confirms. */
  reset: () => void;
}

interface BlockFlagsControl {
  isVisible: (flag: BlockFlag) => boolean;
  show: (id: string) => void;
  hide: (id: string) => void;
}

/** Per-block local state: which default-valued flags the user opted to show. */
const useShownFlags = (): BlockFlagsControl => {
  const [shownIds, setShownIds] = useState<ReadonlySet<string>>(() => new Set());
  return useMemo(
    () => ({
      isVisible: (flag) => shownIds.has(flag.id) || !flag.isDefault,
      show: (id) => setShownIds((prev) => new Set(prev).add(id)),
      hide: (id) =>
        setShownIds((prev) => {
          if (!prev.has(id)) return prev;
          const next = new Set(prev);
          next.delete(id);
          return next;
        }),
    }),
    [shownIds]
  );
};

/** True when a statement call arg is absent, `nothing`, or a literal that
 *  equals the input's declared default. */
const callArgMatchesDefault = (input: BlockInput, argument?: NamedArgument): boolean => {
  if (!argument || argument.value.kind === 'NothingLiteral') return true;
  if (input.default === undefined) return false;
  const value = argument.value;
  if (value.kind === 'StringLiteral') return value.value === String(input.default);
  if (value.kind === 'NumberLiteral') return value.value === Number(input.default);
  if (value.kind === 'BooleanLiteral') return value.value === Boolean(input.default);
  return false;
};

/** Flag icon button + flags dialog for a block header. Renders nothing
 *  when the block has no flags. The same dialog swaps to a reset-to-
 *  default confirmation when hiding a modified flag. */
const BlockFlagsMenu = ({ flags, ctl }: { flags: BlockFlag[]; ctl: BlockFlagsControl }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingHide, setPendingHide] = useState<BlockFlag | null>(null);
  const tooltipId = useId();
  const { setHovered } = useTooltip(tooltipId, 'Flags');

  if (flags.length === 0) return null;

  const handleFlagPress = (flag: BlockFlag) => {
    if (!ctl.isVisible(flag)) {
      ctl.show(flag.id);
      return;
    }
    if (flag.isDefault) {
      ctl.hide(flag.id);
      return;
    }
    setPendingHide(flag);
  };

  const handleConfirmHide = () => {
    if (!pendingHide) return;
    pendingHide.reset();
    ctl.hide(pendingHide.id);
    setPendingHide(null);
  };

  const anyModified = flags.some((flag) => !flag.isDefault);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Flags"
        onPress={() => setIsOpen(true)}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        className="border-subtle-border hover:bg-text/10 flex-row items-center gap-1 rounded-full border px-2 py-0.5">
        <Flag size={9} color="rgb(46, 41, 37)" style={{ opacity: 0.6 }} />
        <FontText className="text-[10px] opacity-70">Flags</FontText>
        {anyModified && (
          <View
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: 'rgb(46, 41, 37)', opacity: 0.45 }}
          />
        )}
      </Pressable>
      <ConvexDialog.Root
        isOpen={isOpen}
        onOpenChange={(open: boolean) => {
          setIsOpen(open);
          if (!open) setPendingHide(null);
        }}>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="max-w-sm">
            <CloseButton onPress={() => setIsOpen(false)} />
            {pendingHide ? (
              <>
                <DialogHeader text={`Hide ${pendingHide.label}?`} />
                <Column className="gap-3 px-4 pb-4">
                  <FontText className="text-sm">
                    {pendingHide.label} doesn’t match its default value. Hiding this flag resets it
                    back to the default.
                  </FontText>
                  <Row className="justify-end gap-3">
                    <AppButton
                      variant="outline"
                      className="px-4"
                      onPress={() => setPendingHide(null)}>
                      <FontText weight="medium">Cancel</FontText>
                    </AppButton>
                    <AppButton variant="red" className="px-4" onPress={handleConfirmHide}>
                      <FontText weight="medium" color="red-700">
                        Hide and reset
                      </FontText>
                    </AppButton>
                  </Row>
                </Column>
              </>
            ) : (
              <Column className="gap-1">
                <FontText weight="medium" className="px-1 pb-1 text-base">
                  Flags
                </FontText>
                {flags.map((flag) => {
                  const visible = ctl.isVisible(flag);
                  return (
                    <Pressable
                      key={flag.id}
                      accessibilityRole="button"
                      onPress={() => handleFlagPress(flag)}
                      className="hover:bg-text/5 rounded-lg p-1.5">
                      <Row className="items-center gap-2">
                        <View
                          className={`h-4 w-4 items-center justify-center rounded border ${
                            visible ? 'border-text/50 bg-text/10' : 'border-subtle-border'
                          }`}>
                          {visible && <Check size={11} color="rgb(46, 41, 37)" />}
                        </View>
                        <FontText className="flex-1 text-sm">{flag.label}</FontText>
                        {!flag.isDefault && (
                          <FontText variant="subtext" className="text-xs">
                            modified
                          </FontText>
                        )}
                      </Row>
                    </Pressable>
                  );
                })}
              </Column>
            )}
          </ConvexDialog.Content>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>
    </>
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
      className={isSaved ? 'rounded bg-green-500/20' : ''}
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

/** Card for a `File({PATH = "..."})` statement, shows the referenced file
 *  plus sockets for each of the file's declared inputs (call-site overrides). */
const FileCallCard = ({
  statement,
  currentPath,
  fileBlocks,
  contextVariables,
  definedVariables,
  entryKeysBySource,
  definedFunctions,
  onAdd,
  onSetExpression,
  onDeleteStatement,
  onEditMarkdown,
  expressionLocation,
}: {
  statement: Statement;
  currentPath: number[];
  fileBlocks: FileBlocksContextValue;
  contextVariables: string[];
  definedVariables: string[];
  entryKeysBySource?: Record<string, string[]>;
  definedFunctions?: DefinedFunction[];
  onAdd: CanvasProps['onAdd'];
  onSetExpression: CanvasProps['onSetExpression'];
  onDeleteStatement?: CanvasProps['onDeleteStatement'];
  onEditMarkdown?: CanvasProps['onEditMarkdown'];
  expressionLocation?: ExpressionLocation;
}) => {
  const parts = getFileCallParts(statement);
  const call =
    statement.kind === 'ExpressionStatement' && statement.expression.kind === 'CallExpression'
      ? statement.expression
      : null;
  const file = parts ? resolveFileRef(fileBlocks.index, parts) : undefined;
  const canOpen = !!(file && fileBlocks.onOpenFile);
  const retarget = expressionLocation
    ? fileBlocks.onRetargetFileExpression
      ? () => fileBlocks.onRetargetFileExpression?.(expressionLocation)
      : undefined
    : fileBlocks.onRetargetFile
      ? () => fileBlocks.onRetargetFile?.(currentPath)
      : undefined;
  const inputLocation = (name: string): ExpressionLocation =>
    expressionLocation
      ? appendLocation(expressionLocation, { kind: 'namedCallArgument', name })
      : {
          statementPath: currentPath,
          slot: { kind: 'callArg', name },
          expressionPath: [],
        };
  const chipTooltipId = useId();
  // One tooltip for the whole chip, the text swaps when the nested
  // change-file button is hovered (the button sits inside the chip, so the
  // chip's own hover stays active the whole time).
  const [chipHover, setChipHover] = useState<'open' | 'retarget' | null>(null);
  const { setHovered: setChipHovered } = useTooltip(
    chipTooltipId,
    chipHover === 'retarget' ? 'Change file' : canOpen ? 'Open file' : undefined
  );
  const declaredInputs = file ? getFileInputs(file) : [];
  const declaredKeys = new Set(declaredInputs.map((decl) => decl.name.toLowerCase()));
  const overrideArgs = (call?.arguments ?? []).filter(
    (argument): argument is NamedArgument =>
      argument.kind === 'NamedArgument' &&
      argument.name.toLowerCase() !== 'path' &&
      argument.name.toLowerCase() !== 'id' &&
      !declaredKeys.has(argument.name.toLowerCase())
  );
  const argValue = (name: string): Expression => {
    const arg = call?.arguments.find(
      (a): a is NamedArgument =>
        a.kind === 'NamedArgument' && a.name.toLowerCase() === name.toLowerCase()
    );
    // File-only cells: declared inputs always get an editable string field
    // (empty args auto-fill a StringLiteral instead of a '+' socket that
    // opens a picker). Other contexts keep NothingLiteral so the override
    // stays optional and the declared default applies.
    return arg?.value ?? missingFileInputArgFallback(!!fileBlocks.fileOnly);
  };

  const cardInfo = (
    <Column className="min-w-0 shrink gap-0.5">
      <Row className="items-center gap-2">
        {file ? (
          file.kind === 'markdown' ? (
            <FileText size={16} color="#4a6a8a" />
          ) : (
            <Code2 size={16} color="#6a4a8a" />
          )
        ) : parts?.path || parts?.id ? (
          <FileWarning size={16} color="#a03030" />
        ) : (
          <FileText size={16} color="#4a6a8a" />
        )}
        <FontText weight="medium" className="text-sm" numberOfLines={1}>
          {file
            ? filePathName(file.path)
            : parts?.path || parts?.id
              ? 'Missing file'
              : 'Select file'}
        </FontText>
        {!file && (parts?.path || parts?.id) && (
          <FontText className="text-xs" style={{ color: '#a03030' }}>
            missing
          </FontText>
        )}
      </Row>
      {(file?.path || parts?.path) && (
        <FontText variant="subtext" className="text-xs" numberOfLines={1}>
          {file?.path ?? parts?.path}
        </FontText>
      )}
    </Column>
  );

  return (
    <Column className="gap-1">
      <Row className="items-center justify-between gap-2">
        {/* The whole outlined chip opens the file; the nested folder button
            re-picks it (nested buttons are fine, web only). No flex-1 so
            the chip hugs the filename; shrink + min-w-0 let long names
            truncate on narrow screens. */}
        {(() => {
          const changeFileButton = retarget ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change file"
              onPress={(e) => {
                // Nested inside the open-file chip, keep the press from
                // also firing the chip's own onPress.
                e.stopPropagation();
                retarget();
              }}
              onHoverIn={() => {
                setChipHover('retarget');
                setChipHovered(true);
              }}
              onHoverOut={() => setChipHover('open')}
              className="hover:bg-text/10 h-6 w-6 shrink-0 items-center justify-center rounded-md">
              <FolderSearch size={14} color="rgb(46, 41, 37)" />
            </Pressable>
          ) : null;
          return canOpen || retarget ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={canOpen ? `Open ${filePathName(file!.path)}` : 'Select file'}
              onPress={(e) => {
                e.stopPropagation();
                if (canOpen) fileBlocks.onOpenFile?.(file!);
                else retarget?.();
              }}
              onHoverIn={() => {
                setChipHover('open');
                setChipHovered(true);
              }}
              onHoverOut={() => {
                setChipHover(null);
                setChipHovered(false);
              }}
              className="border-subtle-border hover:bg-text/10 min-w-0 max-w-full shrink flex-row items-center gap-1.5 rounded-lg border py-1 pl-2 pr-1">
              {cardInfo}
              {changeFileButton}
            </Pressable>
          ) : (
            <View className="border-subtle-border min-w-0 max-w-full shrink flex-row items-center gap-1.5 rounded-lg border py-1 pl-2 pr-1">
              {cardInfo}
              {changeFileButton}
            </View>
          );
        })()}
        {onDeleteStatement && <DeleteButton onPress={() => onDeleteStatement(currentPath)} />}
      </Row>
      {declaredInputs.map((decl) => (
        <Row key={decl.name} className="items-start gap-2">
          <FontText variant="subtext" className="pt-1 text-xs">
            {decl.name}
          </FontText>
          <ExpressionSocket
            expression={argValue(decl.name)}
            location={inputLocation(decl.name)}
            contextVariables={contextVariables}
            entryKeysBySource={entryKeysBySource}
            definedFunctions={definedFunctions}
            label={decl.name}
            onAdd={onAdd}
            onSetExpression={onSetExpression}
            onEditMarkdown={onEditMarkdown}
          />
        </Row>
      ))}
      {overrideArgs.map((argument) => (
        <Row key={argument.name} className="items-start gap-2">
          <FontText className="pt-1 text-xs" style={{ color: '#8a6d00' }}>
            {argument.name}
          </FontText>
          <ExpressionSocket
            expression={argument.value}
            location={inputLocation(argument.name)}
            contextVariables={contextVariables}
            entryKeysBySource={entryKeysBySource}
            definedFunctions={definedFunctions}
            label={`${argument.name} (not declared)`}
            onAdd={onAdd}
            onSetExpression={onSetExpression}
            onEditMarkdown={onEditMarkdown}
          />
        </Row>
      ))}
    </Column>
  );
};

/** Concise cards for display-only calls. Folder blocks open settings instead
 *  of treating the referenced folder like a file. */
const DisplayCallCard = ({
  statement,
  currentPath,
  fileBlocks,
  onSetExpression,
  onDeleteStatement,
  onEditMarkdown,
}: {
  statement: Statement;
  currentPath: number[];
  fileBlocks: FileBlocksContextValue;
  onSetExpression: CanvasProps['onSetExpression'];
  onDeleteStatement?: CanvasProps['onDeleteStatement'];
  onEditMarkdown?: CanvasProps['onEditMarkdown'];
}) => {
  const call =
    statement.kind === 'ExpressionStatement' && statement.expression.kind === 'CallExpression'
      ? statement.expression
      : null;
  const callee = call?.callee.kind === 'IdentifierExpression' ? call.callee.name.toLowerCase() : '';
  const namedArg = (name: string) =>
    call?.arguments.find(
      (argument): argument is NamedArgument =>
        argument.kind === 'NamedArgument' && argument.name.toLowerCase() === name.toLowerCase()
    );

  if (callee === 'folder') {
    const parts = getFolderCallParts(statement);
    const resolvedPath = parts ? resolveFolderRef(fileBlocks.index, parts) : undefined;
    const shownPath = resolvedPath ?? parts?.path;
    return (
      <Row className="items-center justify-between gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Folder settings"
          onPress={(e) => {
            e.stopPropagation();
            fileBlocks.onOpenFolderSettings?.(currentPath);
          }}
          className="border-subtle-border hover:bg-text/10 min-w-0 flex-row items-center gap-1.5 rounded-lg border px-2 py-1">
          <Folder size={16} color="#8a7355" />
          <Column className="min-w-0 shrink gap-0">
            <FontText weight="medium" className="text-sm" numberOfLines={1}>
              {shownPath ? folderLabel(shownPath) : 'Select folder'}
            </FontText>
            {shownPath && (
              <FontText variant="subtext" className="text-xs" numberOfLines={1}>
                {shownPath}
              </FontText>
            )}
            {!resolvedPath && parts && (
              <FontText className="text-xs" color="#a03030">
                missing
              </FontText>
            )}
          </Column>
        </Pressable>
        <Row className="items-center gap-1.5">
          {fileBlocks.onRetargetFolder && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change folder"
              onPress={(e) => {
                e.stopPropagation();
                fileBlocks.onRetargetFolder?.(currentPath);
              }}
              className="hover:bg-text/10 h-6 w-6 items-center justify-center rounded-md">
              <FolderSearch size={14} color="rgb(46, 41, 37)" />
            </Pressable>
          )}
          {fileBlocks.onOpenFolderSettings && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Folder settings"
              onPress={(e) => {
                e.stopPropagation();
                fileBlocks.onOpenFolderSettings?.(currentPath);
              }}
              className="hover:bg-text/10 h-6 w-6 items-center justify-center rounded-md">
              <Settings size={14} color="rgb(46, 41, 37)" />
            </Pressable>
          )}
          {onDeleteStatement && <DeleteButton onPress={() => onDeleteStatement(currentPath)} />}
        </Row>
      </Row>
    );
  }

  if (callee === 'createmarkdown') {
    const arg = namedArg('content');
    const value = arg?.value;
    const preview =
      value?.kind === 'MarkdownLiteral' || value?.kind === 'StringLiteral'
        ? value.value.replace(/\s+/g, ' ').trim().slice(0, 48)
        : '';
    return (
      <Row className="items-center justify-between gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit markdown"
          onPress={(e) => {
            e.stopPropagation();
            if (value?.kind === 'MarkdownLiteral') {
              onEditMarkdown?.(value.value, (next) =>
                onSetExpression(
                  {
                    statementPath: currentPath,
                    slot: { kind: 'callArg', name: arg?.name ?? 'CONTENT' },
                    expressionPath: [],
                  },
                  {
                    ...value,
                    value: next,
                    variables: value.variables?.filter((variable) =>
                      getMarkdownVariableNames(next).includes(variable.name)
                    ),
                  },
                  true
                )
              );
            }
          }}
          className="border-subtle-border hover:bg-text/10 min-w-0 flex-row items-center gap-1.5 rounded-lg border px-2 py-1">
          <FileText size={16} color="#4a6a8a" />
          <Column className="min-w-0 shrink gap-0">
            <FontText weight="medium" className="text-sm">
              Markdown
            </FontText>
            {preview && (
              <FontText variant="subtext" className="text-xs" numberOfLines={1}>
                {preview}
              </FontText>
            )}
          </Column>
        </Pressable>
        {onDeleteStatement && <DeleteButton onPress={() => onDeleteStatement(currentPath)} />}
      </Row>
    );
  }

  return (
    <Row className="items-center justify-between gap-2">
      <Column className="min-w-0 flex-1 gap-1">
        <FontText weight="medium" className="text-sm">
          Divider
        </FontText>
        <View className="border-subtle-border border-t" />
      </Column>
      {onDeleteStatement && <DeleteButton onPress={() => onDeleteStatement(currentPath)} />}
    </Row>
  );
};

/** Op options shared by the "For All Cells" / "For Cell" block dropdown -
 *  switching ops is allowed in-place; scope never is (a "For Cell" can't
 *  turn into a "For All Cells"). */
const CELL_OP_OPTIONS: { value: CellOpStatement['op']; label: string }[] = [
  { value: 'add', label: 'Add' },
  { value: 'remove', label: 'Remove' },
  { value: 'replace', label: 'Replace With' },
];

const StatementBlock = ({
  statement,
  index,
  stmtPath,
  definedVariables,
  variableNames,
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
  const moveTool = React.useContext(MoveToolContext);
  const fileBlocks = React.useContext(FileBlocksContext);
  const invalidStatements = React.useContext(InvalidStatementsContext);
  const flagMessage = React.useContext(StatementFlagMessagesContext)?.get(statement);
  const cellScope = React.useContext(CellScopeContext);
  const columnTitles = React.useContext(ColumnTitlesContext);
  const columnKind = React.useContext(CellColumnKindContext);
  const tableColumnActions = React.useContext(TableColumnActionsContext);
  const flagsCtl = useShownFlags();
  const isInvalidStatement = (invalidStatements?.has(statement) ?? false) || !!flagMessage;
  const currentPath = [...stmtPath!, index];
  const originalPath = moveTool?.getOriginalStatementPath(currentPath) ?? currentPath;
  const contextVariables = definedVariables;
  const declaredVariableNames = variableNames ?? definedVariables;
  const statementLabel = (() => {
    if (
      statement.kind === 'ExpressionStatement' &&
      statement.expression.kind === 'CallExpression' &&
      statement.expression.callee.kind === 'IdentifierExpression'
    )
      return statement.expression.callee.name;
    if (statement.kind === 'IfStatement') return 'If / Else';
    if (statement.kind === 'ForEachStatement') return `ForEach (${statement.itemName})`;
    if (statement.kind === 'NavButtonStatement') return 'Nav Button';
    if (statement.kind === 'DisplayGroupStatement') return 'Display Group';
    if (statement.kind === 'FunctionStatement') return `Function (${statement.name})`;
    if (statement.kind === 'ReturnStatement') return 'Return';
    if (statement.kind === 'CellOpStatement')
      return statement.scope === 'cell' ? 'For Cell' : 'For All Cells';
    if (statement.kind === 'ForEachCellStatement') return 'For each cell';
    return statement.kind;
  })();
  // Category drives the block's color tint (see blockColors.ts).
  const blockCategory = (() => {
    if (
      statement.kind === 'ExpressionStatement' &&
      statement.expression.kind === 'CallExpression' &&
      statement.expression.callee.kind === 'IdentifierExpression'
    ) {
      const callee = (statement.expression as CallExpression).callee as IdentifierExpression;
      if (isFileCallStatement(statement) || isFileInputStatement(statement)) return 'file';
      return STATEMENT_BLOCKS.find((block) => block.id.toLowerCase() === callee.name.toLowerCase())
        ?.category;
    }
    if (statement.kind === 'IfStatement' || statement.kind === 'ForEachStatement') return 'control';
    if (statement.kind === 'NavButtonStatement' || statement.kind === 'DisplayGroupStatement')
      return 'display';
    if (
      statement.kind === 'UpdateCellStatement' ||
      statement.kind === 'CellOpStatement' ||
      statement.kind === 'ForEachCellStatement'
    )
      return 'table';
    if (statement.kind === 'OnTagAddedStatement' || statement.kind === 'OnTagRemovedStatement')
      return 'control';
    if (statement.kind === 'FunctionStatement' || statement.kind === 'ReturnStatement')
      return 'function';
    return undefined;
  })();
  const blockTint = getCategoryTint(blockCategory);
  const isSavedFunction =
    savedFunctionNames?.includes(statement.kind === 'FunctionStatement' ? statement.name : '') ??
    false;
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
      cellScope: cellScope ?? undefined,
    });
  };
  let content: React.ReactNode;

  if (fileBlocks && isFileCallStatement(statement)) {
    content = (
      <FileCallCard
        statement={statement}
        currentPath={currentPath}
        fileBlocks={fileBlocks}
        contextVariables={contextVariables}
        definedVariables={declaredVariableNames}
        entryKeysBySource={entryKeysBySource}
        definedFunctions={definedFunctions}
        onAdd={onAdd}
        onSetExpression={onSetExpression}
        onDeleteStatement={onDeleteStatement}
        onEditMarkdown={onEditMarkdown}
      />
    );
  } else if (
    fileBlocks &&
    statement.kind === 'ExpressionStatement' &&
    statement.expression.kind === 'CallExpression' &&
    statement.expression.callee.kind === 'IdentifierExpression' &&
    ['folder', 'createmarkdown', 'createdivider'].includes(
      statement.expression.callee.name.toLowerCase()
    )
  ) {
    content = (
      <DisplayCallCard
        statement={statement}
        currentPath={currentPath}
        fileBlocks={fileBlocks}
        onSetExpression={onSetExpression}
        onDeleteStatement={onDeleteStatement}
        onEditMarkdown={onEditMarkdown}
      />
    );
  } else if (
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
    const callFlags: BlockFlag[] = (definition?.inputs ?? [])
      .filter((input) => input.flag)
      .map((input) => ({
        id: input.name,
        label: input.label,
        isDefault: callArgMatchesDefault(
          input,
          namedArguments.find(
            (argument) => argument.name.toUpperCase() === input.name.toUpperCase()
          )
        ),
        reset: () =>
          onSetExpression(
            {
              statementPath: currentPath,
              slot: { kind: 'callArg', name: input.name },
              expressionPath: [],
            },
            { kind: 'NothingLiteral', span },
            true
          ),
      }));
    const callFlagsByName = new Map(callFlags.map((flag) => [flag.id.toUpperCase(), flag]));
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
          <Row className="items-center gap-2">
            <BlockFlagsMenu flags={callFlags} ctl={flagsCtl} />
            <DeleteButton onPress={() => onDeleteStatement(currentPath)} />
          </Row>
        </Row>
        {renderedArguments.map(({ argument, input }, argumentIndex) => {
          const flag = input?.flag ? callFlagsByName.get(input.name.toUpperCase()) : undefined;
          if (flag && !flagsCtl.isVisible(flag)) return null;
          return (
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
              definedVariables={declaredVariableNames}
              entryKeysBySource={entryKeysBySource}
              definedFunctions={definedFunctions}
              blockName={calleeName}
              onAdd={onAdd}
              onSetExpression={onSetExpression}
              onEditMarkdown={onEditMarkdown}
            />
          );
        })}
      </Column>
    );
  } else if (statement.kind === 'IfStatement') {
    const condition = statement.branches[0]?.condition ?? { kind: 'NothingLiteral' as const, span };
    content = (
      <Column className="gap-0">
        <View className="rounded-t-xl p-2" style={{ backgroundColor: blockTint.soft }}>
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
              variableNames: declaredVariableNames,
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
        <View className="rounded-b-xl p-2" style={{ backgroundColor: blockTint.soft }} />
      </Column>
    );
  } else if (statement.kind === 'ForEachStatement') {
    content = (
      <Column className="gap-0">
        <View className="rounded-t-xl p-2" style={{ backgroundColor: blockTint.soft }}>
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
              variableNames: declaredVariableNames,
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
        <View className="rounded-b-xl p-2" style={{ backgroundColor: blockTint.soft }} />
      </Column>
    );
  } else if (statement.kind === 'NavButtonStatement') {
    content = (
      <Column className="gap-0">
        <View className="rounded-t-xl p-2" style={{ backgroundColor: blockTint.soft }}>
          <Column className="gap-2">
            <Row className="items-center justify-between gap-2">
              <Row className="items-center gap-2">
                <FontText weight="medium">Nav Button</FontText>
                <ChevronRight size={15} color="#1a1a1a" />
              </Row>
              <DeleteButton onPress={() => onDeleteStatement(currentPath)} />
            </Row>
            <Row className="items-center gap-2">
              <ExpressionSocket
                expression={statement.label}
                location={{
                  statementPath: currentPath,
                  slot: { kind: 'navLabel' },
                  expressionPath: [],
                }}
                expectedType="string"
                contextVariables={contextVariables}
                entryKeysBySource={entryKeysBySource}
                definedFunctions={definedFunctions}
                onAdd={onAdd}
                onSetExpression={onSetExpression}
                onEditMarkdown={onEditMarkdown}
              />
              <ChevronRight size={17} color="#1a1a1a" />
            </Row>
          </Column>
        </View>
        <View className="border-subtle-border border-x px-2">
          <Canvas
            statements={statement.body.statements}
            {...{
              definedVariables,
              variableNames: declaredVariableNames,
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
        <View className="rounded-b-xl p-2" style={{ backgroundColor: blockTint.soft }} />
      </Column>
    );
  } else if (statement.kind === 'DisplayGroupStatement') {
    const namedArguments = statement.arguments.filter(
      (argument): argument is NamedArgument => argument.kind === 'NamedArgument'
    );
    content = (
      <Column className="gap-0">
        <View className="rounded-t-xl p-2" style={{ backgroundColor: blockTint.soft }}>
          <Column className="gap-2">
            <Row className="items-center justify-between gap-2">
              <FontText weight="medium">Display Group</FontText>
              <DeleteButton onPress={() => onDeleteStatement(currentPath)} />
            </Row>
            {namedArguments.map((argument) => (
              <Row key={argument.name} className="items-start gap-2">
                <FontText variant="subtext" className="pt-1 text-xs">
                  {argument.name}
                </FontText>
                <ExpressionSocket
                  expression={argument.value}
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
              </Row>
            ))}
          </Column>
        </View>
        <View className="border-subtle-border border-x px-2">
          <Canvas
            statements={statement.body.statements}
            {...{
              definedVariables,
              variableNames: declaredVariableNames,
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
        <View className="rounded-b-xl p-2" style={{ backgroundColor: blockTint.soft }} />
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
    const updateCellFlags: BlockFlag[] = [
      {
        id: 'allowDuplicates',
        label: 'Duplicates',
        isDefault: statement.allowDuplicates !== true,
        reset: () => onSetStatementField(currentPath, 'allowDuplicates', false),
      },
      ...(isTriggerContext
        ? [
            {
              id: 'autoRemove',
              label: 'When tag removed',
              isDefault: statement.autoRemove !== false,
              reset: () => onSetStatementField(currentPath, 'autoRemove', true),
            },
          ]
        : []),
    ];
    content = (
      <Column className="gap-0">
        {/* Cell selector section (row layout, like normal blocks) */}
        <View className="rounded-t-xl p-2">
          <Column className="gap-1">
            <Row className="items-center justify-between gap-2">
              <FontText weight="medium" className="text-sm">
                {isTriggerContext ? 'Update Cell' : 'On Certify => Update Cell'}
              </FontText>
              <Row className="items-center gap-2">
                <BlockFlagsMenu flags={updateCellFlags} ctl={flagsCtl} />
                <DeleteButton onPress={() => onDeleteStatement(currentPath)} />
              </Row>
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
                fitContent
                triggerClassName="!py-1 !px-2 text-sm"
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
            {flagsCtl.isVisible(updateCellFlags[0]) && (
              <Row className="items-start gap-2">
                <FontText variant="subtext" className="pt-1 text-xs">
                  Duplicates
                </FontText>
                <AppDropdown
                  options={[
                    { value: 'prevent', label: 'Prevent duplicates' },
                    { value: 'allow', label: 'Allow duplicates' },
                  ]}
                  value={statement.allowDuplicates ? 'allow' : 'prevent'}
                  onValueChange={(next) =>
                    onSetStatementField(currentPath, 'allowDuplicates', next === 'allow')
                  }
                  fitContent
                  triggerClassName="!py-1 !px-2 text-xs"
                  isInDialog
                  allowUnselect={false}
                />
              </Row>
            )}
            {isTriggerContext && updateCellFlags[1] && flagsCtl.isVisible(updateCellFlags[1]) && (
              <Row className="items-start gap-2">
                <FontText variant="subtext" className="pt-1 text-xs">
                  When tag removed
                </FontText>
                <AppDropdown
                  options={[
                    { value: 'undo', label: 'Undo when tag is removed' },
                    { value: 'keep', label: 'Keep when tag is removed' },
                  ]}
                  value={statement.autoRemove === false ? 'keep' : 'undo'}
                  onValueChange={(next) =>
                    onSetStatementField(currentPath, 'autoRemove', next !== 'keep')
                  }
                  fitContent
                  triggerClassName="!py-1 !px-2 text-xs"
                  isInDialog
                  allowUnselect={false}
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
                columnScope={
                  tableColumnActions
                    ? statement.columnType === 'user'
                      ? 'user'
                      : 'day'
                    : undefined
                }
                onCreateColumn={tableColumnActions?.create}
              />
            </Row>
            {statement.column.kind === 'StringLiteral' &&
              ['vote', 'action', 'votemultiplier', 'livingstate'].includes(
                statement.column.value.toLowerCase()
              ) && (
                <FontText variant="subtext" className="text-xs">
                  This built-in field uses direct values instead of file or tag modules.
                </FontText>
              )}
          </Column>
        </View>
        {/* Cell-op blocks: the UpdateCell body - "For All Cells" ops and
            "For each cell" loops insert like normal blocks. */}
        <View className="border-subtle-border border-x px-2">
          {statement.column.kind === 'StringLiteral' &&
          !statement.column.value.trim() &&
          statement.body.statements.length === 0 ? (
            <FontText variant="subtext" className="p-2 text-xs">
              Select a column to add an action.
            </FontText>
          ) : (
            <CellColumnKindContext.Provider
              value={
                statement.column.kind === 'StringLiteral'
                  ? cellColumnKind(columnTitles, statement.columnType, statement.column.value)
                  : undefined
              }>
              <CellScopeContext.Provider value="all">
                <Canvas
                  statements={statement.body.statements}
                  {...{
                    definedVariables: ['cellContents', ...definedVariables],
                    variableNames: declaredVariableNames,
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
              </CellScopeContext.Provider>
            </CellColumnKindContext.Provider>
          )}
        </View>
        {/* Bottom strip (dark background, like ForEach) */}
        <View className="rounded-b-xl p-2" style={{ backgroundColor: blockTint.soft }} />
      </Column>
    );
  } else if (statement.kind === 'CellOpStatement') {
    content = (
      <Column className="gap-1">
        <Row className="items-center justify-between gap-2">
          <Row className="items-center gap-2">
            <FontText weight="medium" className="text-sm">
              {statement.scope === 'cell' ? 'For Cell' : 'For All Cells'}
            </FontText>
            <AppDropdown
              options={CELL_OP_OPTIONS.map((option) => ({
                ...option,
                disabledReason: cellOperationDisabledReason(
                  columnKind,
                  statement.scope,
                  option.value
                ),
              }))}
              value={statement.op}
              onValueChange={(next) => {
                if (next === 'add' || next === 'remove' || next === 'replace') {
                  onSetStatementField(currentPath, 'op', next);
                }
              }}
              fitContent
              triggerClassName="!py-1 !px-2 text-sm"
              isInDialog
              allowUnselect={false}
            />
          </Row>
          <DeleteButton onPress={() => onDeleteStatement(currentPath)} />
        </Row>
        <Row className="items-center gap-2">
          <ExpressionSocket
            expression={statement.value}
            location={{
              statementPath: currentPath,
              slot: { kind: 'cellOpValue' },
              expressionPath: [],
            }}
            expectedType="expression"
            contextVariables={['cellContents', ...contextVariables]}
            entryKeysBySource={entryKeysBySource}
            definedFunctions={definedFunctions}
            onAdd={onAdd}
            onSetExpression={onSetExpression}
            onEditMarkdown={onEditMarkdown}
          />
        </Row>
      </Column>
    );
  } else if (statement.kind === 'ForEachCellStatement') {
    content = (
      <Column className="gap-0">
        <View className="rounded-t-xl p-2" style={{ backgroundColor: blockTint.soft }}>
          <Row className="items-center justify-between gap-2">
            <Row className="items-center gap-2">
              <FontText weight="medium">For each cell</FontText>
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
            <DeleteButton onPress={() => onDeleteStatement(currentPath)} />
          </Row>
        </View>
        <View className="border-subtle-border border-x px-2">
          <CellScopeContext.Provider value="cell">
            <Canvas
              statements={statement.body.statements}
              {...{
                definedVariables: [statement.itemName, 'cellContents', ...definedVariables],
                variableNames: declaredVariableNames,
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
          </CellScopeContext.Provider>
        </View>
        <View className="rounded-b-xl p-2" style={{ backgroundColor: blockTint.soft }} />
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
              variableNames: declaredVariableNames,
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
        <View className="rounded-b-xl p-2" style={{ backgroundColor: blockTint.soft }} />
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
              variableNames: declaredVariableNames,
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
        <View className="rounded-b-xl p-2" style={{ backgroundColor: blockTint.soft }} />
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
      <View style={{ pointerEvents: isLockedFunction ? 'none' : 'auto' }}>
        <Column className="gap-0">
          <View className="rounded-t-xl p-2" style={{ backgroundColor: blockTint.soft }}>
            <Column className="gap-2">
              <Row className="items-center justify-between">
                <FontText weight="medium">Function</FontText>
                <Row className="items-center gap-1">
                  {onSaveFunction && onUnsaveFunction && !isLockedFunction && (
                    <SaveFunctionButton
                      isSaved={isSavedFunction && !isDecoupled}
                      onSave={() => onSaveFunction(statement.name, printStatement(statement))}
                      onUnsave={() => onUnsaveFunction(statement.name)}
                    />
                  )}
                  {isLockedFunction && (isSavedFunction || isBuiltinFunction) && (
                    <View className="rounded bg-green-500/20">
                      <BookmarkCheck size={16} color="#1a1a1a" />
                    </View>
                  )}
                  {!isLockedFunction && (
                    <DeleteButton onPress={() => onDeleteStatement(currentPath)} />
                  )}
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
            <CellScopeContext.Provider value={null}>
              <Canvas
                statements={bodyStatements}
                {...{
                  definedVariables: [...statement.parameters, ...definedVariables],
                  variableNames: declaredVariableNames,
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
            </CellScopeContext.Provider>
          </View>
          <View className="rounded-b-xl p-2" style={{ backgroundColor: blockTint.soft }}>
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
  } else if (statement.kind === 'TagStatement') {
    // Tag file meta header (files inside the pinned `tags/` folder): the
    // tag's display name + color. The file's remaining statements are the
    // on-added trigger script.
    content = (
      <Row className="items-center justify-between gap-2">
        <Row className="items-center gap-2">
          <FontText weight="medium" className="text-sm">
            Tag
          </FontText>
          <ReplaceableTextInput
            value={statement.name}
            onChangeText={(value) => onSetStatementField(currentPath, 'tagName', value)}
            placeholder="Tag name"
          />
          <AppDropdown
            options={TAG_COLORS.map((c) => ({ value: c.name, label: c.name }))}
            value={statement.color || TAG_COLORS[0].name}
            onValueChange={(next) => onSetStatementField(currentPath, 'tagColor', next)}
            fitContent
            triggerClassName="!py-1 !px-2 text-sm"
            isInDialog
            allowUnselect={false}
          />
        </Row>
        <DeleteButton onPress={() => onDeleteStatement(currentPath)} />
      </Row>
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

  // FileInput declarations hoist to the header inputs strip when editing a
  // file: they keep their AST position (paths stay valid) but render
  // nothing in the canvas. Top-level only: a FileInput buried in a nested
  // body isn't a declared input and stays visible.
  if (
    fileBlocks?.filePath &&
    !fileBlocks.showFileInputBlocks &&
    currentPath.length === 1 &&
    isFileInputStatement(statement)
  ) {
    return null;
  }

  return (
    <View style={{ marginLeft: stmtPath!.length * 12 }}>
      {showCommentBlock && (
        <View className="mb-1 ml-2 flex-row items-start gap-1">
          <View className="bg-text/5 border-subtle-border relative flex-1 rounded-lg border p-2">
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
                className="text-text text-xs italic"
                style={{ minHeight: 20, paddingTop: 0, paddingBottom: 0 }}
              />
            ) : (
              <Pressable
                onPress={() => {
                  setCommentDraft(statement.comment ?? '');
                  setIsEditingComment(true);
                }}>
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
          moveTarget={{ kind: 'block', path: originalPath, statement }}
          variant="statement"
          onSwap={swapStatement}
          isFunction={isFunction}
          indent={0}
          tint={
            isInvalidStatement
              ? { bg: '#a0303014', soft: '#a0303014', border: '#a03030', solid: '#a03030' }
              : blockCategory
                ? blockTint
                : undefined
          }
          tooltipText={
            isLockedFunction
              ? 'Click to edit'
              : isFileCallStatement(statement) && !fileBlocks?.fileOnly
                ? 'Change file block'
                : undefined
          }>
          {flagMessage && (
            <View className="mb-1 rounded-md border border-red-800/40 bg-red-800/10 px-2 py-1">
              <FontText className="text-xs" style={{ color: '#7f1d1d' }}>
                {flagMessage}
              </FontText>
            </View>
          )}
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
const previewFileBlocks: FileBlocksContextValue = {
  index: buildFilesIndex({ files: {}, folders: [] }),
  onRetargetFile: noop,
  onRetargetFileExpression: noop,
};
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
  const fileBlocks = React.useContext(FileBlocksContext) ?? previewFileBlocks;
  const allFunctions = useMemo(
    () => [...(definedFunctions ?? []), ...(previewDefinedFunctions ?? [])],
    [definedFunctions, previewDefinedFunctions]
  );
  if (statement) {
    return (
      <FileBlocksContext.Provider value={fileBlocks}>
        <ShadowScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}>
          <View style={{ pointerEvents: 'none' }}>
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
        </ShadowScrollView>
      </FileBlocksContext.Provider>
    );
  }
  if (expression) {
    return (
      <FileBlocksContext.Provider value={fileBlocks}>
        <ShadowScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}>
          <View style={{ pointerEvents: 'none' }}>
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
        </ShadowScrollView>
      </FileBlocksContext.Provider>
    );
  }
  return null;
};

const Canvas = ({
  statements,
  definedVariables,
  variableNames,
  definedFunctions,
  onAdd,
  onSetExpression,
  onSetStatementField,
  onDeleteStatement,
  onRenameVariable,
  entryKeysBySource,
  columnTitles,
  inputSources,
  stmtPath = [],
  onEditMarkdown,
  isTriggerContext,
  gameId,
  allowTableColumnCreate,
  savedFunctionNames,
  onSaveFunction,
  onUnsaveFunction,
  onLockedFunctionClick,
  decoupledFunctionNames,
  onSetComment,
  moveTool,
  fileBlocks,
  invalidExpressions,
  invalidStatements,
  flagMessages,
}: CanvasProps) => {
  const inheritedMoveTool = React.useContext(MoveToolContext);
  const inheritedRenameVariable = React.useContext(VariableRenameContext);
  const inheritedFileBlocks = React.useContext(FileBlocksContext);
  const inheritedInvalidExpressions = React.useContext(InvalidExpressionsContext);
  const inheritedInvalidStatements = React.useContext(InvalidStatementsContext);
  const inheritedFlagMessages = React.useContext(StatementFlagMessagesContext);
  /** Insert-zone context: provided by the UpdateCell / For-each-cell cards
   *  around their nested canvases - the block selector reads it to offer
   *  "For All Cells" / "For Cell" ops. */
  const cellScope = React.useContext(CellScopeContext);
  const activeMoveTool = moveTool ?? inheritedMoveTool;
  const activeRenameVariable = onRenameVariable ?? inheritedRenameVariable;
  const activeFileBlocks = fileBlocks ?? inheritedFileBlocks;
  const activeInvalidExpressions = invalidExpressions ?? inheritedInvalidExpressions;
  const activeInvalidStatements = invalidStatements ?? inheritedInvalidStatements;
  const activeFlagMessages = flagMessages ?? inheritedFlagMessages;
  // Only load tag definitions at the root level (stmtPath is empty).
  // Nested Canvas instances inherit the context from the root.
  const isRoot = stmtPath.length === 0;
  const createExtraColumn = useCreateExtraColumn(gameId, isRoot && !!allowTableColumnCreate);
  const tagDefsKey = gameId && isRoot ? getGameScopedKey('tagDefinitions', gameId) : null;
  const [tagDefs, setTagDefs] = useValue<TagDefinitionsData>(tagDefsKey ?? '__no-game__', {
    defaultValue: [],
    privacy: 'PUBLIC',
  });
  const tagDefinitions = tagDefs?.value ?? [];

  // In file mode, top-level FileInput statements render nothing (they live
  // in the header inputs strip); the insert target *before* one would be a
  // duplicate of the target after the previous visible statement.
  const hiddenStatementAt = (i: number) =>
    !!activeFileBlocks?.filePath &&
    !activeFileBlocks.showFileInputBlocks &&
    stmtPath.length === 0 &&
    i >= 0 &&
    i < statements.length &&
    isFileInputStatement(statements[i]);

  const inner = (
    <VariableRenameContext.Provider value={activeRenameVariable}>
      <InputSourcesContext.Provider value={inputSources ?? {}}>
        <Column className="gap-0">
          {statements.length > 0 && (
            <>
              {activeMoveTool?.getBlockMarkers(stmtPath, 0).map((number) => (
                <MoveNumberMarker key={`move-${number}`} number={number} />
              ))}
              {/* The insert target directly above a hidden FileInput would
                  float mid-air: statements insert before it, but the input
                  conceptually lives at the top. */}
              {!hiddenStatementAt(0) && (
                <PuzzleConnector
                  direction="vertical"
                  tooltip="Add block"
                  placeTarget={{ kind: 'block', path: [...stmtPath, 0] }}
                  onPress={() =>
                    onAdd({
                      kind: 'statement',
                      path: [...stmtPath, 0],
                      cellScope: cellScope ?? undefined,
                    })
                  }
                />
              )}
            </>
          )}
          {statements.map((statement, index) => (
            <React.Fragment key={`stmt-${stmtPath.join('-')}-${index}`}>
              {index > 0 &&
                activeMoveTool
                  ?.getBlockMarkers(stmtPath, index)
                  .map((number) => <MoveNumberMarker key={`move-${number}`} number={number} />)}
              <StatementBlock
                statement={statement}
                index={index}
                stmtPath={stmtPath}
                definedVariables={definedVariables}
                variableNames={variableNames ?? definedVariables}
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
              {!hiddenStatementAt(index + 1) && (
                <PuzzleConnector
                  direction="vertical"
                  tooltip="Add block"
                  placeTarget={{ kind: 'block', path: [...stmtPath, index + 1] }}
                  onPress={() =>
                    onAdd({
                      kind: 'statement',
                      path: [...stmtPath, index + 1],
                      cellScope: cellScope ?? undefined,
                    })
                  }
                />
              )}
            </React.Fragment>
          ))}
          {statements.length > 0 &&
            activeMoveTool
              ?.getBlockMarkers(stmtPath, statements.length)
              .map((number) => <MoveNumberMarker key={`move-${number}`} number={number} />)}
          {statements.length === 0 &&
            activeMoveTool
              ?.getBlockMarkers(stmtPath, 0)
              .map((number) => <MoveNumberMarker key={`move-${number}`} number={number} />)}
          {statements.length === 0 &&
            (activeFileBlocks?.emptyState ? (
              <Column className="flex-1 items-center justify-center py-8">
                {activeFileBlocks.emptyState}
              </Column>
            ) : (
              <Pressable
                accessibilityRole="button"
                disabled={
                  !!activeMoveTool &&
                  (activeMoveTool.phase !== 'place' || activeMoveTool.category !== 'block')
                }
                onPress={() => {
                  if (activeMoveTool?.phase === 'place' && activeMoveTool.category === 'block') {
                    activeMoveTool.onPlaceBlock([...stmtPath, 0]);
                  } else if (!activeMoveTool) {
                    onAdd({
                      kind: 'statement',
                      path: [...stmtPath, 0],
                      cellScope: cellScope ?? undefined,
                    });
                  }
                }}>
                <View
                  className={`my-2 h-10 w-full flex-row items-center justify-center gap-2 rounded-xl border border-dashed ${
                    activeMoveTool?.phase === 'place' && activeMoveTool.category === 'block'
                      ? 'border-green-800 bg-green-700'
                      : 'border-subtle-border bg-transparent'
                  } ${activeMoveTool && (activeMoveTool.phase !== 'place' || activeMoveTool.category !== 'block') ? 'opacity-30' : ''}`}>
                  <FontText className="text-text/40 text-sm">+</FontText>
                  <FontText variant="subtext" className="text-sm">
                    press to add a block
                  </FontText>
                </View>
              </Pressable>
            ))}
        </Column>
      </InputSourcesContext.Provider>
    </VariableRenameContext.Provider>
  );

  if (!isRoot) {
    // Nested Canvas: just render the inner content (inherits tag context from root)
    return inner;
  }

  // Root Canvas: provide tag definitions context + render tag manager modal
  const root = (
    <ColumnTitlesContext.Provider value={columnTitles}>
      <TableColumnActionsContext.Provider
        value={allowTableColumnCreate && gameId ? { create: createExtraColumn } : null}>
        <MoveToolContext.Provider value={activeMoveTool}>
          <FileBlocksContext.Provider value={activeFileBlocks}>
            <InvalidExpressionsContext.Provider value={activeInvalidExpressions}>
              <InvalidStatementsContext.Provider value={activeInvalidStatements}>
                <StatementFlagMessagesContext.Provider value={activeFlagMessages}>
                  {inner}
                </StatementFlagMessagesContext.Provider>
              </InvalidStatementsContext.Provider>
            </InvalidExpressionsContext.Provider>
          </FileBlocksContext.Provider>
        </MoveToolContext.Provider>
      </TableColumnActionsContext.Provider>
    </ColumnTitlesContext.Provider>
  );
  return gameId ? (
    <TagLibraryProvider gameId={gameId} definitions={tagDefinitions} setDefinitions={setTagDefs}>
      {root}
    </TagLibraryProvider>
  ) : (
    <TagDefinitionsContext.Provider value={{ definitions: tagDefinitions }}>
      {root}
    </TagDefinitionsContext.Provider>
  );
};

export default Canvas;
