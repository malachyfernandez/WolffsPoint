import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, TextInput, View } from 'react-native';
import ConvexDialog from '../../components/ui/dialog/ConvexDialog';
import DialogHeader from '../../components/ui/dialog/DialogHeader';
import UnsavedChangesDialog from '../../components/ui/dialog/UnsavedChangesDialog';
import Column from '../../components/layout/Column';
import Row from '../../components/layout/Row';
import AppButton from '../../components/ui/buttons/AppButton';
import KeyCap from '../../components/ui/KeyCap';
import FontText from '../../components/ui/text/FontText';
import ShadowScrollView from '../../components/ui/ShadowScrollView';
import { CloseButton } from '../../components/game/markdownEditor';
import MarkdownEditorDialog from '../../components/game/MarkdownEditorDialog';
import { parseScript } from '../lang/parser';
import { printScript, printScriptBlock, parseScriptBlock } from '../lang/printer';
import type { Expression, FunctionTemplatePiece, Script, Statement } from '../lang/ast';
import { emptySpan } from '../lang/ast';
import {
  editorReducer,
  initialState,
  createScript,
  createOnTagAddedStatement,
  deleteStatementInList,
  getStatementAtPath,
  insertStatementInList,
  replaceStatementAtPath,
} from './editorReducer';
import type { EditorAction } from './editorReducer';
import Canvas, { BlockPreview, type ExpressionMoveTarget, type MoveToolControls } from './Canvas';
import InsertModal, {
  type DefinedFunction,
  type InsertTarget,
  BUILTIN_FUNCTION_NAMES,
} from './InsertModal';
import { createScriptGlobals, type ScriptSourceData } from '../runtime/sources';
import {
  decomposeChain,
  getExpressionAtLocation,
  recomposeChain,
  setExpressionAtLocation,
  traceEntrySource,
  type ChainLink,
  type ExpressionLocation,
} from './expressionEditor';
import { useTooltip } from './useTooltip';
import type { EntryKeysBySource } from './typeInference';
import { useUndoRedo, useCreateUndoSnapshot } from '../../../hooks/useUndoRedo';
import { useSavedFunctions } from '../../../hooks/useSavedFunctions';
import { useToast } from '../../../contexts/ToastContext';

interface ScriptEditorDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialScriptText?: string;
  onSubmit: (scriptText: string) => void;
  sources?: ScriptSourceData;
  title?: string;
  /** When true, input-creating blocks (select, text, number, checkbox) are hidden.
   *  Used for tag trigger scripts which have no input state storage. */
  hideInputs?: boolean;
  /** When true, the editor is configured for tag trigger scripts.
   *  Hides input/display blocks, replaces currentDay with placedDay, and
   *  shows trigger-specific data sources (placedTag, placedUser, etc.). */
  isTriggerContext?: boolean;
  /** Game ID, used to load tag definitions for the tag() function picker. */
  gameId?: string;
}

type EditorMode = 'blocks' | 'text';

const sanitizeIdentifier = (value: string) =>
  value.replace(/[^a-zA-Z0-9_]/g, '').replace(/^[0-9]/, '_$&');

const collectDefinedVariables = (statements: Statement[], acc: string[] = []): string[] => {
  for (const stmt of statements) {
    // Detect Variable({NAME = "..."}) call statements
    if (
      stmt.kind === 'ExpressionStatement' &&
      stmt.expression.kind === 'CallExpression' &&
      stmt.expression.callee.kind === 'IdentifierExpression' &&
      stmt.expression.callee.name.toUpperCase() === 'VARIABLE'
    ) {
      const nameArg = stmt.expression.arguments.find(
        (a) => a.kind === 'NamedArgument' && a.name.toUpperCase() === 'NAME'
      );
      if (nameArg && nameArg.kind === 'NamedArgument' && nameArg.value.kind === 'StringLiteral') {
        const clean = sanitizeIdentifier(nameArg.value.value);
        if (clean) acc.push(clean);
      }
    }
    if (stmt.kind === 'IfStatement') {
      collectDefinedVariables(stmt.branches[0]?.body.statements ?? [], acc);
      if (stmt.elseBody) collectDefinedVariables(stmt.elseBody.statements, acc);
    }
    if (stmt.kind === 'ForEachStatement') {
      collectDefinedVariables(stmt.body.statements, acc);
    }
    if (stmt.kind === 'FunctionStatement') {
      collectDefinedVariables(stmt.body.statements, acc);
    }
  }
  return acc;
};

const collectDefinedFunctions = (
  statements: Statement[],
  inputSources: Record<string, string> = {},
  acc: DefinedFunction[] = []
): DefinedFunction[] => {
  for (const statement of statements) {
    if (statement.kind === 'FunctionStatement') {
      // Build parameter source map from template defaults
      const paramSources: Record<string, string> = {};
      const templateInputs = statement.template?.filter((p) => p.kind === 'input') ?? [];
      templateInputs.forEach((input, index) => {
        const param = statement.parameters[index];
        if (param && input.defaultExpression) {
          const source = traceEntrySource(input.defaultExpression, {
            varSources: {},
            inputSources,
            definedFunctions: acc,
          });
          if (source) paramSources[param] = source;
        }
      });
      // Trace the return expression to compute returnEntrySource
      const returnExpr = findReturnExpression(statement.body.statements);
      const returnEntrySource = returnExpr
        ? traceEntrySource(returnExpr, {
            varSources: paramSources,
            inputSources,
            definedFunctions: acc,
          })
        : undefined;
      acc.push({
        name: statement.name,
        parameters: statement.parameters,
        template: statement.template,
        bodyStatements: statement.body.statements,
        returnEntrySource,
      });
      collectDefinedFunctions(statement.body.statements, inputSources, acc);
    } else if (statement.kind === 'IfStatement') {
      statement.branches.forEach((branch) =>
        collectDefinedFunctions(branch.body.statements, inputSources, acc)
      );
      if (statement.elseBody)
        collectDefinedFunctions(statement.elseBody.statements, inputSources, acc);
    } else if (statement.kind === 'ForEachStatement') {
      collectDefinedFunctions(statement.body.statements, inputSources, acc);
    }
  }
  return acc;
};

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

/** Build a map of input label → data source from CreateSelectInput statements. */
const collectInputSources = (
  statements: Statement[],
  entryKeysBySource: Record<string, string[]>
): Record<string, string> => {
  const sources: Record<string, string> = {};
  for (const stmt of statements) {
    if (
      stmt.kind === 'ExpressionStatement' &&
      stmt.expression.kind === 'CallExpression' &&
      stmt.expression.callee.kind === 'IdentifierExpression' &&
      stmt.expression.callee.name.toLowerCase() === 'createselectinput'
    ) {
      const labelArg = stmt.expression.arguments.find(
        (a) => a.kind === 'NamedArgument' && a.name.toLowerCase() === 'label'
      );
      const listArg = stmt.expression.arguments.find(
        (a) => a.kind === 'NamedArgument' && a.name.toLowerCase() === 'list'
      );
      if (labelArg && listArg && labelArg.value.kind === 'StringLiteral') {
        // Determine the source of the LIST argument
        const listExpr = listArg.value;
        if (listExpr.kind === 'IdentifierExpression') {
          const name = listExpr.name.toLowerCase();
          // Check if it's a known source (players, roles, etc.)
          if (name in entryKeysBySource) {
            sources[labelArg.value.value.toLowerCase()] = name;
          }
        }
      }
    }
    // Recurse into nested blocks
    if (stmt.kind === 'IfStatement') {
      stmt.branches.forEach((b) =>
        Object.assign(sources, collectInputSources(b.body.statements, entryKeysBySource))
      );
      if (stmt.elseBody)
        Object.assign(sources, collectInputSources(stmt.elseBody.statements, entryKeysBySource));
    }
    if (stmt.kind === 'ForEachStatement') {
      Object.assign(sources, collectInputSources(stmt.body.statements, entryKeysBySource));
    }
    if (stmt.kind === 'FunctionStatement') {
      Object.assign(sources, collectInputSources(stmt.body.statements, entryKeysBySource));
    }
  }
  return sources;
};

const INPUT_STATEMENT_IDS = new Set([
  'createtextinput',
  'createnumberinput',
  'createcheckbox',
  'createselectinput',
]);

/** Collect LABEL values from all input-creating statements in the script. */
const collectInputLabels = (statements: Statement[], acc: string[] = []): string[] => {
  for (const stmt of statements) {
    if (
      stmt.kind === 'ExpressionStatement' &&
      stmt.expression.kind === 'CallExpression' &&
      stmt.expression.callee.kind === 'IdentifierExpression' &&
      INPUT_STATEMENT_IDS.has(stmt.expression.callee.name.toLowerCase())
    ) {
      const labelArg = stmt.expression.arguments.find(
        (arg) => arg.kind === 'NamedArgument' && arg.name.toUpperCase() === 'LABEL'
      );
      if (labelArg && labelArg.value.kind === 'StringLiteral' && labelArg.value.value) {
        acc.push(labelArg.value.value);
      }
    }
    if (stmt.kind === 'IfStatement') {
      stmt.branches.forEach((branch) => collectInputLabels(branch.body.statements, acc));
      if (stmt.elseBody) collectInputLabels(stmt.elseBody.statements, acc);
    }
    if (stmt.kind === 'ForEachStatement') {
      collectInputLabels(stmt.body.statements, acc);
    }
    if (stmt.kind === 'FunctionStatement') {
      collectInputLabels(stmt.body.statements, acc);
    }
  }
  return acc;
};

type MoveSelection =
  | {
      kind: 'whole';
      number: number;
      location: ExpressionLocation;
      expression: Expression;
    }
  | {
      kind: 'chainLink';
      number: number;
      location: ExpressionLocation;
      linkIndex: number;
      link: ChainLink;
    }
  | { kind: 'block'; number: number; path: number[]; statement: Statement };

interface MoveSession {
  operation: 'move' | 'clone';
  phase: 'collect' | 'place';
  category: 'expression' | 'block' | null;
  baseline: Script;
  selections: MoveSelection[];
  nextNumber: number;
}

const locationKey = (location: ExpressionLocation) =>
  JSON.stringify([location.statementPath, location.slot, location.expressionPath]);

const sameLocation = (left: ExpressionLocation, right: ExpressionLocation) =>
  locationKey(left) === locationKey(right);

const isPathPrefix = (prefix: number[], path: number[]) =>
  prefix.length <= path.length && prefix.every((part, index) => path[index] === part);

const expressionPathIsPrefix = (
  prefix: ExpressionLocation['expressionPath'],
  path: ExpressionLocation['expressionPath']
) =>
  prefix.length <= path.length &&
  prefix.every((step, index) => JSON.stringify(step) === JSON.stringify(path[index]));

const expressionLocationsOverlap = (left: ExpressionLocation, right: ExpressionLocation) =>
  JSON.stringify([left.statementPath, left.slot]) ===
    JSON.stringify([right.statementPath, right.slot]) &&
  (expressionPathIsPrefix(left.expressionPath, right.expressionPath) ||
    expressionPathIsPrefix(right.expressionPath, left.expressionPath));

const setScriptExpression = (
  script: Script,
  location: ExpressionLocation,
  expression: Expression
): Script => {
  const statement = getStatementAtPath(script.statements, location.statementPath);
  if (!statement) return script;
  return {
    ...script,
    statements: replaceStatementAtPath(
      script.statements,
      location.statementPath,
      setExpressionAtLocation(statement, location, expression)
    ),
  };
};

const deriveSessionAst = (session: MoveSession): Script => {
  if (session.operation === 'clone') return session.baseline;
  if (session.category === 'block') {
    const selections = session.selections
      .filter(
        (selection): selection is Extract<MoveSelection, { kind: 'block' }> =>
          selection.kind === 'block'
      )
      .sort((left, right) => {
        const lengthDifference = right.path.length - left.path.length;
        if (lengthDifference !== 0) return lengthDifference;
        return right.path
          .join('.')
          .localeCompare(left.path.join('.'), undefined, { numeric: true });
      });
    return {
      ...session.baseline,
      statements: selections.reduce(
        (statements, selection) => deleteStatementInList(statements, selection.path),
        session.baseline.statements
      ),
    };
  }
  let next = session.baseline;
  const expressionSelections = session.selections.filter(
    (selection): selection is Exclude<MoveSelection, { kind: 'block' }> =>
      selection.kind !== 'block'
  );
  const grouped = new Map<string, typeof expressionSelections>();
  expressionSelections.forEach((selection) => {
    const key = locationKey(selection.location);
    grouped.set(key, [...(grouped.get(key) ?? []), selection]);
  });
  grouped.forEach((selections) => {
    const location = selections[0].location;
    const statement = getStatementAtPath(next.statements, location.statementPath);
    const expression = statement ? getExpressionAtLocation(statement, location) : undefined;
    if (!expression) return;
    if (selections.some((selection) => selection.kind === 'whole')) {
      next = setScriptExpression(next, location, { kind: 'NothingLiteral', span: expression.span });
      return;
    }
    const removed = new Set(
      selections
        .filter(
          (selection): selection is Extract<MoveSelection, { kind: 'chainLink' }> =>
            selection.kind === 'chainLink'
        )
        .map((selection) => selection.linkIndex)
    );
    const remaining = decomposeChain(expression).filter((_, index) => !removed.has(index));
    if (remaining.length > 0 && remaining[0].type !== 'base') {
      remaining.unshift({ type: 'base', expr: { kind: 'NothingLiteral', span: emptySpan() } });
    }
    next = setScriptExpression(next, location, recomposeChain(remaining));
  });
  return next;
};

const deriveSessionCanvasAst = (session: MoveSession): Script =>
  session.phase === 'collect' && session.category === 'expression'
    ? session.baseline
    : deriveSessionAst(session);

const composeShelfExpression = (selections: MoveSelection[]): Expression | null => {
  const expressionSelections = selections.filter(
    (selection): selection is Exclude<MoveSelection, { kind: 'block' }> =>
      selection.kind !== 'block'
  );
  if (expressionSelections.length === 0) return null;
  const links: ChainLink[] = [];
  for (const selection of expressionSelections) {
    const nextLinks =
      selection.kind === 'chainLink' ? [selection.link] : decomposeChain(selection.expression);
    const base = nextLinks[0]?.type === 'base' ? nextLinks[0] : undefined;
    if (links.length === 0) {
      if (!base) links.push({ type: 'base', expr: { kind: 'NothingLiteral', span: emptySpan() } });
      links.push(...nextLinks);
      continue;
    }
    if (base && base.expr.kind !== 'NothingLiteral') {
      const currentBase = links[0];
      if (currentBase?.type !== 'base' || currentBase.expr.kind !== 'NothingLiteral') return null;
      links[0] = base;
      links.push(...nextLinks.slice(1));
      continue;
    }
    links.push(...(base ? nextLinks.slice(1) : nextLinks));
  }
  return recomposeChain(links);
};

const statementLabel = (statement: Statement) => {
  if (
    statement.kind === 'ExpressionStatement' &&
    statement.expression.kind === 'CallExpression' &&
    statement.expression.callee.kind === 'IdentifierExpression'
  )
    return statement.expression.callee.name;
  if (statement.kind === 'IfStatement') return 'If / Else';
  if (statement.kind === 'ForEachStatement') return `For each ${statement.itemName}`;
  if (statement.kind === 'FunctionStatement') return `Function ${statement.name}`;
  if (statement.kind === 'OnTagAddedStatement') return 'On Tag Added';
  if (statement.kind === 'OnTagRemovedStatement') return 'On Tag Removed';
  if (statement.kind === 'UpdateCellStatement') return 'Update Cell';
  if (statement.kind === 'ReturnStatement') return 'Return';
  return statement.kind;
};

const ShelfItem = ({
  selection,
  onReturn,
  entryKeysBySource,
  definedFunctions,
}: {
  selection: MoveSelection;
  onReturn: () => void;
  entryKeysBySource: EntryKeysBySource;
  definedFunctions: DefinedFunction[];
}) => {
  const tooltipId = React.useId();
  const { setHovered } = useTooltip(tooltipId, `Click to return ${selection.number}`);
  const animation = useRef(new Animated.Value(0)).current;
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
      {...({
        onPointerDown: (event: PointerEvent) => {
          event.preventDefault();
          event.stopPropagation();
          onReturn();
        },
      } as Record<string, unknown>)}>
      <Animated.View style={{ opacity: animation, transform: [{ scale: animation }] }}>
        <Pressable
          onPress={onReturn}
          onHoverIn={() => setHovered(true)}
          onHoverOut={() => setHovered(false)}
          className="border-subtle-border bg-inner-background rounded-xl border p-1.5">
          {selection.kind === 'block' ? (
            <Row className="items-center gap-2 px-2 py-1">
              <View className="bg-text/10 h-6 w-6 items-center justify-center rounded-full">
                <FontText weight="medium" className="text-xs">
                  {selection.number}
                </FontText>
              </View>
              <FontText weight="medium" className="text-sm">
                {statementLabel(selection.statement)}
              </FontText>
            </Row>
          ) : (
            <BlockPreview
              expression={
                selection.kind === 'whole'
                  ? selection.expression
                  : recomposeChain([
                      {
                        type: 'base',
                        expr:
                          selection.link.type === 'base'
                            ? selection.link.expr
                            : { kind: 'NothingLiteral', span: emptySpan() },
                      },
                      ...(selection.link.type === 'base' ? [] : [selection.link]),
                    ])
              }
              entryKeysBySource={entryKeysBySource}
              definedFunctions={definedFunctions}
            />
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
};

const ScriptEditorDialog = ({
  isOpen,
  onOpenChange,
  initialScriptText = '',
  onSubmit,
  sources,
  title = 'Script Editor',
  hideInputs,
  isTriggerContext,
  gameId,
}: ScriptEditorDialogProps) => {
  const [state, dispatch] = useReducer(editorReducer, createScript(), (ast) => initialState(ast));
  const { executeCommand, undo, redo, canUndo, canRedo } = useUndoRedo();
  const createUndoSnapshot = useCreateUndoSnapshot();
  const [mode, setMode] = useState<EditorMode>('blocks');
  const [moveSession, setMoveSession] = useState<MoveSession | null>(null);
  const [textDraft, setTextDraft] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [insertTarget, setInsertTarget] = useState<InsertTarget | null>(null);
  const [markdownEditor, setMarkdownEditor] = useState<{
    isOpen: boolean;
    value: string;
    onSave: (newValue: string) => void;
  } | null>(null);
  const [hasModifications, setHasModifications] = useState(false);
  const [isLeaveConfirmDialogOpen, setIsLeaveConfirmDialogOpen] = useState(false);
  const [decoupleDialog, setDecoupleDialog] = useState<{
    path: number[];
    functionName: string;
    isBuiltin: boolean;
  } | null>(null);
  const [decoupledFunctions, setDecoupledFunctions] = useState<string[]>([]);
  const [nameCollision, setNameCollision] = useState<string | null>(null);
  const { savedFunctions, savedFunctionNames, saveFunction, unsaveFunction } = useSavedFunctions();
  const { showToast } = useToast();
  const moveTooltipId = React.useId();
  const cloneTooltipId = React.useId();
  const placeTooltipId = React.useId();
  const moveTooltipContent = useMemo(
    () => (
      <>
        Move
        <KeyCap>M</KeyCap>
      </>
    ),
    []
  );
  const cloneTooltipContent = useMemo(
    () => (
      <>
        Clone
        <KeyCap>C</KeyCap>
      </>
    ),
    []
  );
  const placeTooltipContent = useMemo(
    () => (
      <>
        Place
        <KeyCap>P</KeyCap>
      </>
    ),
    []
  );
  const { setHovered: setMoveHovered } = useTooltip(moveTooltipId, moveTooltipContent);
  const { setHovered: setCloneHovered } = useTooltip(cloneTooltipId, cloneTooltipContent);
  const { setHovered: setPlaceHovered } = useTooltip(placeTooltipId, placeTooltipContent);

  useEffect(() => {
    if (!isOpen) return;
    const trimmed = initialScriptText.trim();
    let ast;
    if (trimmed.length > 0) {
      // Use parseScriptBlock to unwrap /*script ... script*/ wrapper if present
      ast = parseScriptBlock(trimmed);
    } else if (isTriggerContext) {
      // Default trigger scripts to an OnTagAdded block so it's clear
      // this is where the tag-added logic goes
      ast = { ...createScript(), statements: [createOnTagAddedStatement()] };
    } else {
      ast = createScript();
    }
    dispatch({ type: 'REPLACE_AST', ast });
    setTextDraft(trimmed);
    setMode('blocks');
    setMoveSession(null);
    setParseError(null);
    setInsertTarget(null);
    setHasModifications(false);
    setIsLeaveConfirmDialogOpen(false);
    setDecoupleDialog(null);
    setDecoupledFunctions([]);
    setNameCollision(null);
  }, [initialScriptText, isOpen, isTriggerContext]);

  // Bridge the reducer's history with the global useUndoRedo system.
  // Computes the new AST by running the reducer manually, applies it via SET_AST
  // (no internal history), and registers an undo command with useUndoRedo so
  // Ctrl+Z / Ctrl+Shift+Z work globally with toast notifications.
  const dispatchWithUndo = useCallback(
    (action: EditorAction, description: string) => {
      const oldAst = createUndoSnapshot(state.ast);
      const newState = editorReducer(state, action);
      const newAst = createUndoSnapshot(newState.ast);
      setHasModifications(true);
      executeCommand({
        action: () => dispatch({ type: 'SET_AST', ast: newAst }),
        undoAction: () => dispatch({ type: 'SET_AST', ast: oldAst }),
        description,
      });
    },
    [state, createUndoSnapshot, executeCommand]
  );

  const commitMoveSession = useCallback(
    (session: MoveSession, ast: Script) => {
      const before = createUndoSnapshot(session.baseline);
      const after = createUndoSnapshot(ast);
      executeCommand({
        action: () => dispatch({ type: 'SET_AST', ast: after }),
        undoAction: () => dispatch({ type: 'SET_AST', ast: before }),
        description: session.operation === 'move' ? 'Move selection' : 'Clone selection',
      });
      setHasModifications(true);
      setMoveSession(null);
    },
    [createUndoSnapshot, executeCommand]
  );

  const startMoveSession = useCallback(
    (operation: 'move' | 'clone') => {
      setInsertTarget(null);
      setMoveSession({
        operation,
        phase: 'collect',
        category: null,
        baseline: createUndoSnapshot(state.ast),
        selections: [],
        nextNumber: 1,
      });
    },
    [createUndoSnapshot, state.ast]
  );

  const cancelMoveSession = () => {
    if (moveSession) dispatch({ type: 'SET_AST', ast: moveSession.baseline });
    setMoveSession(null);
  };

  const updateMoveSession = (update: (session: MoveSession) => MoveSession) => {
    if (!moveSession) return;
    const next = update(moveSession);
    dispatch({ type: 'SET_AST', ast: deriveSessionCanvasAst(next) });
    setMoveSession(next);
  };

  const handlePickExpression = (target: ExpressionMoveTarget) => {
    updateMoveSession((session) => {
      if (session.phase !== 'collect' || session.category === 'block') return session;
      const expressionSelections = session.selections.filter(
        (selection): selection is Exclude<MoveSelection, { kind: 'block' }> =>
          selection.kind !== 'block'
      );
      if (
        expressionSelections.some(
          (selection) =>
            (target.kind === 'chainLink' &&
              selection.kind === 'chainLink' &&
              sameLocation(selection.location, target.location) &&
              selection.linkIndex === target.linkIndex) ||
            (target.kind === 'whole' &&
              selection.kind === 'whole' &&
              sameLocation(selection.location, target.location)) ||
            (!sameLocation(selection.location, target.location) &&
              expressionLocationsOverlap(selection.location, target.location)) ||
            (sameLocation(selection.location, target.location) && selection.kind !== target.kind)
        )
      )
        return session;
      const selection: MoveSelection = { ...target, number: session.nextNumber };
      return {
        ...session,
        category: 'expression',
        selections: [...session.selections, selection],
        nextNumber: session.nextNumber + 1,
      };
    });
  };

  const handlePickBlock = (path: number[], statement: Statement) => {
    updateMoveSession((session) => {
      if (session.phase !== 'collect' || session.category === 'expression') return session;
      if (
        session.selections.some(
          (selection) =>
            selection.kind === 'block' &&
            (isPathPrefix(selection.path, path) || isPathPrefix(path, selection.path))
        )
      )
        return session;
      return {
        ...session,
        category: 'block',
        selections: [
          ...session.selections,
          { kind: 'block', number: session.nextNumber, path, statement },
        ],
        nextNumber: session.nextNumber + 1,
      };
    });
  };

  const handleReturnSelection = (number: number) => {
    updateMoveSession((session) => ({
      ...session,
      phase: 'collect',
      category: session.selections.length === 1 ? null : session.category,
      selections: session.selections.filter((selection) => selection.number !== number),
    }));
  };

  const shelfExpression = useMemo(
    () => (moveSession ? composeShelfExpression(moveSession.selections) : null),
    [moveSession]
  );
  const placeDisabledReason = moveSession
    ? moveSession.selections.length === 0
      ? 'Select something to place first.'
      : moveSession.category === 'expression' && !shelfExpression
        ? "These expressions can't be combined into one. Return one and try again."
        : null
    : null;
  const handleEnterPlacePhase = useCallback(() => {
    if (!moveSession) return;
    if (placeDisabledReason) {
      showToast(placeDisabledReason);
      return;
    }
    const next = { ...moveSession, phase: 'place' as const };
    dispatch({ type: 'SET_AST', ast: deriveSessionCanvasAst(next) });
    setMoveSession(next);
  }, [dispatch, moveSession, placeDisabledReason, showToast]);

  const handleBackToCollect = useCallback(() => {
    if (!moveSession) return;
    const next = { ...moveSession, phase: 'collect' as const };
    dispatch({ type: 'SET_AST', ast: deriveSessionCanvasAst(next) });
    setMoveSession(next);
  }, [dispatch, moveSession]);

  useEffect(() => {
    if (!isOpen || mode !== 'blocks' || typeof window === 'undefined') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      if (!moveSession && (key === 'm' || key === 'c')) {
        event.preventDefault();
        startMoveSession(key === 'm' ? 'move' : 'clone');
      } else if (key === 'p' && moveSession?.phase === 'collect') {
        event.preventDefault();
        handleEnterPlacePhase();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleEnterPlacePhase, isOpen, mode, moveSession, startMoveSession]);

  const canPlaceExpression = useCallback(
    (target: { location: ExpressionLocation; linkIndex?: number }) => {
      if (!moveSession || moveSession.category !== 'expression' || !shelfExpression) return false;
      const links = decomposeChain(shelfExpression);
      const hasConcreteBase = links[0]?.type === 'base' && links[0].expr.kind !== 'NothingLiteral';
      if (target.linkIndex === undefined || target.linkIndex === 0) return hasConcreteBase;
      return (
        links[0]?.type === 'base' && links[0].expr.kind === 'NothingLiteral' && links.length > 1
      );
    },
    [moveSession, shelfExpression]
  );

  const handlePlaceExpression = (target: { location: ExpressionLocation; linkIndex?: number }) => {
    if (!moveSession || !canPlaceExpression(target) || !shelfExpression) return;
    let next = deriveSessionAst(moveSession);
    if (target.linkIndex === undefined) {
      next = setScriptExpression(next, target.location, shelfExpression);
    } else {
      const statement = getStatementAtPath(next.statements, target.location.statementPath);
      const expression = statement
        ? getExpressionAtLocation(statement, target.location)
        : undefined;
      if (!expression) return;
      const chain = decomposeChain(expression);
      const shelfLinks = decomposeChain(shelfExpression);
      if (target.linkIndex === 0) {
        next = setScriptExpression(
          next,
          target.location,
          recomposeChain([...shelfLinks, ...chain.slice(1)])
        );
      } else {
        chain.splice(target.linkIndex, 0, ...shelfLinks.slice(1));
        next = setScriptExpression(next, target.location, recomposeChain(chain));
      }
    }
    commitMoveSession(moveSession, next);
  };

  const handlePlaceBlock = (path: number[]) => {
    if (!moveSession || moveSession.category !== 'block') return;
    const statements = moveSession.selections
      .filter(
        (selection): selection is Extract<MoveSelection, { kind: 'block' }> =>
          selection.kind === 'block'
      )
      .map((selection) => selection.statement);
    if (statements.length === 0) return;
    const base = deriveSessionAst(moveSession);
    const insertionIndex = path[path.length - 1] ?? base.statements.length;
    const parentPath = path.slice(0, -1);
    const nextStatements = statements.reduce(
      (current, statement, index) =>
        insertStatementInList(current, [...parentPath, insertionIndex + index], statement),
      base.statements
    );
    commitMoveSession(moveSession, { ...base, statements: nextStatements });
  };

  const moveToolControls: MoveToolControls | undefined = (() => {
    if (!moveSession) return undefined;
    const expressionSelections = moveSession.selections.filter(
      (selection): selection is Exclude<MoveSelection, { kind: 'block' }> =>
        selection.kind !== 'block'
    );
    const blockSelections = moveSession.selections.filter(
      (selection): selection is Extract<MoveSelection, { kind: 'block' }> =>
        selection.kind === 'block'
    );
    const originalStatementPath = (currentPath: number[]) => {
      if (moveSession.operation === 'clone') return currentPath;
      const original: number[] = [];
      currentPath.forEach((currentIndex) => {
        const removed = blockSelections
          .filter(
            (selection) =>
              selection.path.length === original.length + 1 &&
              original.every((part, index) => selection.path[index] === part)
          )
          .map((selection) => selection.path[original.length])
          .sort((left, right) => left - right);
        let candidate = currentIndex;
        removed.forEach((index) => {
          if (index <= candidate) candidate++;
        });
        original.push(candidate);
      });
      return original;
    };
    return {
      operation: moveSession.operation,
      phase: moveSession.phase,
      category: moveSession.category,
      getLinkMarkers: (location, linkIndex) =>
        moveSession.phase === 'collect'
          ? expressionSelections
              .filter(
                (selection): selection is Extract<MoveSelection, { kind: 'chainLink' }> =>
                  selection.kind === 'chainLink' &&
                  sameLocation(selection.location, location) &&
                  selection.linkIndex === linkIndex
              )
              .map((selection) => selection.number)
          : [],
      getWholeMarker: (location) =>
        moveSession.phase === 'collect'
          ? expressionSelections.find(
              (selection) =>
                selection.kind === 'whole' && sameLocation(selection.location, location)
            )?.number
          : undefined,
      getOriginalStatementPath: originalStatementPath,
      getBlockMarkers: (currentParentPath, currentBoundary) => {
        const parent = originalStatementPath(currentParentPath);
        return blockSelections
          .filter(
            (selection) =>
              selection.path.length === parent.length + 1 &&
              parent.every((part, index) => selection.path[index] === part)
          )
          .filter((selection) => {
            const index = selection.path[parent.length];
            if (moveSession.operation === 'clone') return index + 1 === currentBoundary;
            const earlier = blockSelections.filter(
              (candidate) =>
                candidate.path.length === parent.length + 1 &&
                parent.every((part, partIndex) => candidate.path[partIndex] === part) &&
                candidate.path[parent.length] < index
            ).length;
            return index - earlier === currentBoundary;
          })
          .map((selection) => selection.number);
      },
      onPickExpression: handlePickExpression,
      onPickBlock: handlePickBlock,
      onReturn: handleReturnSelection,
      canPlaceExpression,
      onPlaceExpression: handlePlaceExpression,
      onPlaceBlock: handlePlaceBlock,
    };
  })();

  const definedVariables = useMemo(
    () => collectDefinedVariables(state.ast.statements),
    [state.ast.statements]
  );
  const entryKeysBySource = useMemo<EntryKeysBySource>(() => {
    const globals = createScriptGlobals(sources);
    const keys: EntryKeysBySource = Object.fromEntries(
      Object.entries(globals).map(([name, value]) => {
        const sample = Array.isArray(value)
          ? value.find((item) => item && typeof item === 'object')
          : value;
        return [name, sample && typeof sample === 'object' ? Object.keys(sample) : []];
      })
    );
    keys.players = [
      'realName',
      'email',
      'userId',
      'role',
      'isAlive',
      'days',
      ...(sources?.userTableTitle?.extraUserColumns ?? []),
    ];
    keys.roles = ['role', 'doesRoleVote', 'isVisible', 'aboutRole'];
    // Day object keys: built-in fields + extra day column titles
    keys.day = [
      'vote',
      'action',
      'morningMessage',
      ...(sources?.userTableTitle?.extraDayColumns ?? []),
    ];
    // Column title dropdowns for UpdateCell
    keys._userColumns = sources?.userTableTitle?.extraUserColumns ?? [];
    keys._dayColumns = ['morningMessage', ...(sources?.userTableTitle?.extraDayColumns ?? [])];
    // Field type metadata: maps "source.field" → ScriptType
    // This lets the type inference know that players.entry("days") is a list,
    // players.entry("role") is a string, etc.
    keys.__fieldTypes = {
      'players.days': 'list',
      'players.realName': 'string',
      'players.email': 'string',
      'players.userId': 'string',
      'players.role': 'string',
      'players.isAlive': 'boolean',
      'currentPlayer.days': 'list',
      'currentPlayer.realName': 'string',
      'currentPlayer.email': 'string',
      'currentPlayer.userId': 'string',
      'currentPlayer.role': 'string',
      'currentPlayer.isAlive': 'boolean',
      'placedUser.days': 'list',
      'placedUser.realName': 'string',
      'placedUser.email': 'string',
      'placedUser.userId': 'string',
      'placedUser.role': 'string',
      'placedUser.isAlive': 'boolean',
      // Roles table fields
      'roles.role': 'string',
      'roles.doesRoleVote': 'boolean',
      'roles.isVisible': 'boolean',
      'roles.aboutRole': 'string',
      // Day object fields (built-in)
      'day.vote': 'string',
      'day.action': 'string',
      'day.morningMessage': 'string',
    };
    // Add types for extra user columns (all strings)
    for (const col of sources?.userTableTitle?.extraUserColumns ?? []) {
      keys.__fieldTypes![`players.${col}`] = 'string';
      keys.__fieldTypes![`currentPlayer.${col}`] = 'string';
      keys.__fieldTypes![`placedUser.${col}`] = 'string';
    }
    // Add types for extra day columns (all strings)
    for (const col of sources?.userTableTitle?.extraDayColumns ?? []) {
      keys.__fieldTypes![`day.${col}`] = 'string';
    }
    if (isTriggerContext) {
      // Trigger-specific globals
      keys.placedTag = [];
      keys.placedUser = keys.players;
      keys.placedDay = [];
      keys.placedColumn = [];
    } else {
      keys.currentPlayer = keys.players;
      keys.currentDay = [];
      keys.dayDates = [];
      keys.schedule = [];
      keys.profiles = [];
      keys.Inputs = collectInputLabels(state.ast.statements);
      keys.InputsWithData = keys.Inputs;
    }
    return keys;
  }, [sources, state.ast.statements, isTriggerContext]);
  const inputSources = useMemo(
    () => collectInputSources(state.ast.statements, entryKeysBySource),
    [state.ast.statements, entryKeysBySource]
  );
  const definedFunctions = useMemo(
    () => collectDefinedFunctions(state.ast.statements, inputSources),
    [state.ast.statements, inputSources]
  );

  const handleTextChange = (value: string) => {
    setTextDraft(value);
    setHasModifications(true);
    try {
      const ast = value.trim().length > 0 ? parseScript(value) : createScript();
      dispatch({ type: 'REPLACE_AST', ast });
      setParseError(null);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Parse error');
    }
  };

  const handleSwitchMode = (newMode: EditorMode) => {
    if (moveSession && newMode === 'text') return;
    if (newMode === 'blocks' && mode === 'text') {
      try {
        const ast = textDraft.trim().length > 0 ? parseScript(textDraft) : createScript();
        dispatchWithUndo({ type: 'REPLACE_AST', ast }, 'Switch to blocks');
        setParseError(null);
      } catch (error) {
        setParseError(error instanceof Error ? error.message : 'Parse error');
        return;
      }
    } else if (newMode === 'text' && mode === 'blocks') {
      setTextDraft(printScript(state.ast));
    }
    setMode(newMode);
  };

  const handleInsertStatement = (stmt: Statement, path: number[], replace = false) => {
    dispatchWithUndo(
      { type: replace ? 'REPLACE_STATEMENT' : 'INSERT_STATEMENT', statement: stmt, path },
      replace ? 'Replace block' : 'Add block'
    );
  };

  const handleInsertExpression = (expression: Expression, target: InsertTarget) => {
    if (!target.location) return;
    dispatchWithUndo(
      target.replaceMode === 'chainBase'
        ? { type: 'REPLACE_CHAIN_BASE', location: target.location, expression }
        : { type: 'SET_EXPRESSION', location: target.location, expression, trackHistory: true },
      'Insert expression'
    );
  };

  const handleInsertBuiltinFunction = (
    fnStatement: Statement,
    callExpression: Expression,
    target: InsertTarget
  ) => {
    if (!target.location) return;
    dispatchWithUndo(
      {
        type: 'INSERT_BUILTIN_FUNCTION',
        fnStatement,
        location: target.location,
        expression: callExpression,
      },
      'Add built-in function'
    );
  };

  const handleSetExpression = (
    location: NonNullable<InsertTarget['location']>,
    expression: Expression,
    trackHistory = false
  ) => {
    if (moveSession) return;
    if (trackHistory) {
      dispatchWithUndo(
        { type: 'SET_EXPRESSION', location, expression, trackHistory: true },
        'Edit expression'
      );
    } else {
      dispatch({ type: 'SET_EXPRESSION', location, expression, trackHistory });
    }
  };

  const handleSetStatementField = (
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
  ) => {
    if (moveSession) return;
    dispatchWithUndo({ type: 'SET_STATEMENT_FIELD', path, field, value }, 'Edit field');
  };

  const handleDeleteStatement = (path: number[]) => {
    if (moveSession) return;
    dispatchWithUndo({ type: 'DELETE_STATEMENT', path }, 'Delete block');
  };

  const handleSetComment = (path: number[], comment: string) => {
    if (moveSession) return;
    dispatchWithUndo(
      { type: 'SET_COMMENT', path, comment },
      comment ? 'Add comment' : 'Remove comment'
    );
  };

  const handleLockedFunctionClick = (path: number[], functionName: string, isBuiltin: boolean) => {
    setDecoupleDialog({ path, functionName, isBuiltin });
  };

  const handleSaveFunction = (name: string, source: string) => {
    // Check if the name is already in use by a built-in function or another
    // saved function (with a different source — same name + same source is a re-save).
    if (BUILTIN_FUNCTION_NAMES.has(name)) {
      setNameCollision(name);
      return;
    }
    const existing = savedFunctions.find((fn) => fn.name === name);
    if (existing && existing.source !== source) {
      setNameCollision(name);
      return;
    }
    // Re-saving a decoupled function should re-lock it — remove from decoupled list.
    setDecoupledFunctions((prev) => prev.filter((n) => n !== name));
    saveFunction(name, source);
  };

  const handleDecouple = (mode: 'remove' | 'decouple') => {
    if (!decoupleDialog) return;
    if (mode === 'remove') {
      unsaveFunction(decoupleDialog.functionName);
    }
    // Both modes unlock the function in the script — no AST change needed,
    // since the lock is purely a UI state based on savedFunctionNames /
    // BUILTIN_FUNCTION_NAMES. Removing from library makes it no longer match.
    // For built-in functions, there's nothing to remove — decoupling just
    // means the user accepts it's no longer treated as locked. We track this
    // by adding the function name to a "decoupled" set.
    setDecoupledFunctions((prev) =>
      prev.includes(decoupleDialog.functionName) ? prev : [...prev, decoupleDialog.functionName]
    );
    setDecoupleDialog(null);
  };

  const handleInsertChainLink = (target: InsertTarget, blockId: string) => {
    if (!target.location) return;
    dispatchWithUndo(
      {
        type: target.kind === 'chainSwap' ? 'REPLACE_CHAIN_LINK_AT' : 'INSERT_CHAIN_LINK_AT',
        location: target.location,
        linkIndex: target.linkIndex ?? 1,
        blockId,
      },
      target.kind === 'chainSwap' ? 'Replace chain link' : 'Add chain link'
    );
  };

  const handleRemove = (target: InsertTarget) => {
    if (target.kind === 'statement' && target.path) {
      dispatchWithUndo({ type: 'DELETE_STATEMENT', path: target.path }, 'Remove block');
    } else if (target.kind === 'chainSwap' && target.location) {
      dispatchWithUndo(
        {
          type: 'REPLACE_CHAIN_LINK_AT',
          location: target.location,
          linkIndex: target.linkIndex ?? 1,
        },
        'Remove chain link'
      );
    } else if (target.location) {
      dispatchWithUndo(
        {
          type: 'SET_EXPRESSION',
          location: target.location,
          expression: { kind: 'NothingLiteral', span: state.ast.span },
          trackHistory: true,
        },
        'Remove expression'
      );
    }
  };

  const handleSubmit = () => {
    const textToSubmit =
      mode === 'text' ? printScriptBlock(textDraft) : printScriptBlock(state.ast);
    onSubmit(textToSubmit);
    setHasModifications(false);
    onOpenChange(false);
  };

  // --- Unsaved changes protection ---
  const handleAttemptClose = () => {
    if (hasModifications) {
      setIsLeaveConfirmDialogOpen(true);
    } else {
      onOpenChange(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && hasModifications) {
      setIsLeaveConfirmDialogOpen(true);
    } else {
      onOpenChange(open);
    }
  };

  const handleConfirmLeave = () => {
    setIsLeaveConfirmDialogOpen(false);
    setHasModifications(false);
    onOpenChange(false);
  };

  const handleCancelLeave = () => {
    setIsLeaveConfirmDialogOpen(false);
  };

  const canSubmit =
    mode === 'text' ? textDraft.trim().length > 0 && !parseError : state.ast.statements.length > 0;

  return (
    <>
      <ConvexDialog.Root isOpen={isOpen} onOpenChange={handleOpenChange}>
        <ConvexDialog.Trigger asChild>
          <View />
        </ConvexDialog.Trigger>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="h-[85vh] max-w-5xl" isSwipeable={false}>
            <CloseButton onPress={handleAttemptClose} />
            <DialogHeader
              text={title}
              subtext={
                isTriggerContext
                  ? 'Runs when this tag is added to a cell'
                  : 'Build dynamic inputs with blocks or text'
              }
            />
            <Column className="min-h-0 flex-1 gap-3 pt-3">
              <Row className="justify-between gap-2">
                <Row className="gap-2">
                  {mode === 'blocks' && (
                    <>
                      <AppButton
                        variant="outline"
                        className="h-8 px-3"
                        onPress={undo}
                        dropShadow={false}
                        disabled={!canUndo || !!moveSession}>
                        <FontText className="text-sm">Undo</FontText>
                      </AppButton>
                      <AppButton
                        variant="outline"
                        className="h-8 px-3"
                        onPress={redo}
                        dropShadow={false}
                        disabled={!canRedo || !!moveSession}>
                        <FontText className="text-sm">Redo</FontText>
                      </AppButton>
                    </>
                  )}
                </Row>
                <Row className="gap-2">
                  <AppButton
                    variant={mode === 'blocks' ? 'filled' : 'outline'}
                    className="h-8 px-3"
                    onPress={() => handleSwitchMode('blocks')}
                    dropShadow={false}>
                    <FontText className="text-sm" color={mode === 'blocks' ? 'white' : undefined}>
                      Blocks
                    </FontText>
                  </AppButton>
                  <AppButton
                    variant={mode === 'text' ? 'filled' : 'outline'}
                    className="h-8 px-3"
                    onPress={() => handleSwitchMode('text')}
                    disabled={!!moveSession}
                    dropShadow={false}>
                    <FontText className="text-sm" color={mode === 'text' ? 'white' : undefined}>
                      Text
                    </FontText>
                  </AppButton>
                </Row>
              </Row>

              {parseError && (
                <View className="rounded-lg border border-red-400/30 bg-red-400/5 p-2">
                  <FontText className="text-xs text-red-500">{parseError}</FontText>
                </View>
              )}

              <View className="min-h-0 flex-1">
                {mode === 'text' ? (
                  <TextInput
                    multiline
                    value={textDraft}
                    onChangeText={handleTextChange}
                    placeholder={`Variable({\n  NAME = "deadPlayers",\n  VALUE = players.Filter(Item => Item.entry("isAlive") == false),\n});\n\nCreateSelectInput({\n  NAME = "revive",\n  LIST = deadPlayers,\n  LABEL = "Back From Dead",\n  NUMSELECTABLE = (deadPlayers.length / 2).floor,\n});`}
                    placeholderTextColor="#0004"
                    className="bg-text/5 min-h-0 flex-1 rounded-xl p-4 font-mono text-sm"
                    style={{
                      lineHeight: 20,
                      textAlignVertical: 'top',
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                ) : (
                  <ShadowScrollView className="flex-1" scrollViewClassName="flex-1 rounded-xl p-3">
                    <Canvas
                      statements={state.ast.statements}
                      definedVariables={definedVariables}
                      definedFunctions={definedFunctions}
                      onAdd={(target) => {
                        if (!moveSession) setInsertTarget(target);
                      }}
                      moveTool={moveToolControls}
                      onSetExpression={handleSetExpression}
                      onSetStatementField={handleSetStatementField}
                      onDeleteStatement={handleDeleteStatement}
                      entryKeysBySource={entryKeysBySource}
                      inputSources={inputSources}
                      isTriggerContext={isTriggerContext}
                      gameId={gameId}
                      savedFunctionNames={savedFunctionNames}
                      onSaveFunction={handleSaveFunction}
                      onUnsaveFunction={unsaveFunction}
                      onLockedFunctionClick={handleLockedFunctionClick}
                      decoupledFunctionNames={decoupledFunctions}
                      onSetComment={handleSetComment}
                      onEditMarkdown={(value, onSave) =>
                        setMarkdownEditor({ isOpen: true, value, onSave })
                      }
                    />
                  </ShadowScrollView>
                )}
                {moveSession && moveSession.selections.length > 0 && (
                  <View className="border-subtle-border bg-background/95 absolute bottom-3 left-3 right-3 z-30 rounded-2xl border p-2 shadow-lg">
                    <Row className="mb-1 items-center justify-between px-1">
                      <FontText weight="medium" className="text-xs">
                        {moveSession.operation === 'move' ? 'Moving' : 'Cloning'}{' '}
                        {moveSession.category === 'block' ? 'blocks' : 'expressions'}
                      </FontText>
                      <FontText variant="subtext" className="text-xs">
                        {moveSession.phase === 'place'
                          ? 'Choose a green target'
                          : 'Click an item to return it'}
                      </FontText>
                    </Row>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <Row className="items-center gap-1">
                        {moveSession.selections.map((selection) => (
                          <ShelfItem
                            key={selection.number}
                            selection={selection}
                            onReturn={() => handleReturnSelection(selection.number)}
                            entryKeysBySource={entryKeysBySource}
                            definedFunctions={definedFunctions}
                          />
                        ))}
                      </Row>
                    </ScrollView>
                  </View>
                )}
              </View>

              <Row className="items-center justify-between gap-4 pt-2">
                <Row className="gap-2">
                  {mode === 'blocks' &&
                    (moveSession ? (
                      moveSession.phase === 'place' ? (
                        <AppButton
                          variant="filled"
                          className="h-8 px-4"
                          onPress={handleBackToCollect}
                          dropShadow={false}>
                          <FontText className="text-sm" color="white">
                            Back to {moveSession.operation === 'move' ? 'Move' : 'Clone'}
                          </FontText>
                        </AppButton>
                      ) : (
                        <>
                          <AppButton
                            variant="outline"
                            className="h-8 px-3"
                            onPress={cancelMoveSession}
                            dropShadow={false}>
                            <FontText className="text-sm">Cancel</FontText>
                          </AppButton>
                          <View
                            onPointerEnter={() => setPlaceHovered(true)}
                            onPointerLeave={() => setPlaceHovered(false)}>
                            <AppButton
                              variant="filled"
                              className={`h-8 px-3 ${placeDisabledReason ? 'opacity-50' : ''}`}
                              onPress={handleEnterPlacePhase}
                              dropShadow={false}>
                              <FontText className="text-sm" color="white">
                                Place
                              </FontText>
                            </AppButton>
                          </View>
                        </>
                      )
                    ) : (
                      <>
                        <View
                          onPointerEnter={() => setMoveHovered(true)}
                          onPointerLeave={() => setMoveHovered(false)}>
                          <AppButton
                            variant="outline"
                            className="h-8 px-3"
                            onPress={() => startMoveSession('move')}
                            dropShadow={false}>
                            <FontText className="text-sm">Move</FontText>
                          </AppButton>
                        </View>
                        <View
                          onPointerEnter={() => setCloneHovered(true)}
                          onPointerLeave={() => setCloneHovered(false)}>
                          <AppButton
                            variant="outline"
                            className="h-8 px-3"
                            onPress={() => startMoveSession('clone')}
                            dropShadow={false}>
                            <FontText className="text-sm">Clone</FontText>
                          </AppButton>
                        </View>
                      </>
                    ))}
                </Row>
                <Row className="gap-4">
                  <AppButton variant="outline" className="w-28" onPress={handleAttemptClose}>
                    <FontText weight="medium">Cancel</FontText>
                  </AppButton>
                  <AppButton
                    variant="filled"
                    className="w-36"
                    disabled={!canSubmit || !!moveSession}
                    onPress={handleSubmit}>
                    <FontText weight="medium" color="white">
                      Save Script
                    </FontText>
                  </AppButton>
                </Row>
              </Row>
            </Column>

            <InsertModal
              isOpen={insertTarget !== null}
              target={insertTarget}
              definedVariables={definedVariables}
              definedFunctions={definedFunctions}
              entryKeysBySource={entryKeysBySource}
              onInsertStatement={handleInsertStatement}
              onInsertExpression={handleInsertExpression}
              onInsertChainLink={handleInsertChainLink}
              onInsertBuiltinFunction={handleInsertBuiltinFunction}
              onRemove={handleRemove}
              hideInputs={hideInputs}
              isTriggerContext={isTriggerContext}
              gameId={gameId}
              savedFunctions={savedFunctions}
              onUnsaveFunction={unsaveFunction}
              onClose={() => setInsertTarget(null)}
            />
          </ConvexDialog.Content>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>

      {markdownEditor && (
        <MarkdownEditorDialog
          isOpen={markdownEditor.isOpen}
          onOpenChange={(open) => {
            if (!open) setMarkdownEditor(null);
          }}
          title="Edit Markdown"
          submitLabel="Save"
          initialMarkdown={markdownEditor.value}
          showScript
          showInputs
          showVariables
          hideInputs={hideInputs}
          gameId={gameId}
          onSubmit={(payload) => {
            markdownEditor.onSave(payload.markdown);
            setMarkdownEditor(null);
          }}
        />
      )}

      <UnsavedChangesDialog
        isOpen={isLeaveConfirmDialogOpen}
        onOpenChange={setIsLeaveConfirmDialogOpen}
        onStay={handleCancelLeave}
        onLeave={handleConfirmLeave}
      />

      {/* Decouple / remove saved function dialog */}
      <ConvexDialog.Root
        isOpen={decoupleDialog !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setDecoupleDialog(null);
        }}>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="max-w-lg">
            <CloseButton onPress={() => setDecoupleDialog(null)} />
            <Column className="gap-3 pt-3">
              <FontText weight="medium" className="text-base">
                {decoupleDialog?.isBuiltin ? 'Edit Built-in Function' : 'Edit Saved Function'}
              </FontText>
              <FontText variant="subtext" className="text-sm leading-5">
                {decoupleDialog?.isBuiltin
                  ? 'This function stays in your script but is no longer treated as a built-in. You can edit it freely.'
                  : 'The function stays in all existing code — it just won\u2019t be in your library anymore.'}
              </FontText>
              <Column className="gap-2">
                {decoupleDialog?.isBuiltin ? (
                  <Pressable
                    onPress={() => handleDecouple('decouple')}
                    className="border-subtle-border items-center rounded-lg border py-2.5">
                    <FontText weight="medium">De-couple</FontText>
                  </Pressable>
                ) : (
                  <>
                    <Pressable
                      onPress={() => handleDecouple('remove')}
                      className="border-subtle-border items-center rounded-lg border py-2.5">
                      <FontText weight="medium">Remove from library</FontText>
                    </Pressable>
                    <Pressable
                      onPress={() => handleDecouple('decouple')}
                      className="border-subtle-border items-center rounded-lg border py-2.5">
                      <FontText weight="medium">Keep and de-couple</FontText>
                    </Pressable>
                  </>
                )}
                <Pressable
                  onPress={() => setDecoupleDialog(null)}
                  className="border-subtle-border items-center rounded-lg border py-2.5">
                  <FontText weight="medium">Cancel</FontText>
                </Pressable>
              </Column>
            </Column>
          </ConvexDialog.Content>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>

      {/* Name collision dialog */}
      <ConvexDialog.Root
        isOpen={nameCollision !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setNameCollision(null);
        }}>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="max-w-md">
            <CloseButton onPress={() => setNameCollision(null)} />
            <Column className="gap-3 pt-3">
              <FontText weight="medium" className="text-base">
                Name already in use
              </FontText>
              <FontText variant="subtext" className="text-sm leading-5">
                {nameCollision && BUILTIN_FUNCTION_NAMES.has(nameCollision)
                  ? `\u201C${nameCollision}\u201D is a built-in function. Choose a different name.`
                  : `A saved function called \u201C${nameCollision}\u201D already exists. Choose a different name.`}
              </FontText>
              <Pressable
                onPress={() => setNameCollision(null)}
                className="border-subtle-border items-center rounded-lg border py-2.5">
                <FontText weight="medium">OK</FontText>
              </Pressable>
            </Column>
          </ConvexDialog.Content>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>
    </>
  );
};

export default ScriptEditorDialog;
