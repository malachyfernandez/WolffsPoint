import React, { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { TextInput, View } from 'react-native';
import ConvexDialog from '../../components/ui/dialog/ConvexDialog';
import DialogHeader from '../../components/ui/dialog/DialogHeader';
import UnsavedChangesDialog from '../../components/ui/dialog/UnsavedChangesDialog';
import Column from '../../components/layout/Column';
import Row from '../../components/layout/Row';
import AppButton from '../../components/ui/buttons/AppButton';
import FontText from '../../components/ui/text/FontText';
import ShadowScrollView from '../../components/ui/ShadowScrollView';
import { CloseButton } from '../../components/game/markdownEditor';
import MarkdownEditorDialog from '../../components/game/MarkdownEditorDialog';
import { parseScript } from '../lang/parser';
import { printScript, printScriptBlock, parseScriptBlock } from '../lang/printer';
import type { Expression, FunctionTemplatePiece, Statement } from '../lang/ast';
import {
  editorReducer,
  initialState,
  createScript,
  createOnTagAddedStatement,
} from './editorReducer';
import type { EditorAction } from './editorReducer';
import Canvas from './Canvas';
import InsertModal, { type DefinedFunction, type InsertTarget } from './InsertModal';
import { createScriptGlobals, type ScriptSourceData } from '../runtime/sources';
import { traceEntrySource } from './expressionEditor';
import type { EntryKeysBySource } from './typeInference';
import { useUndoRedo, useCreateUndoSnapshot } from '../../../hooks/useUndoRedo';

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
    setParseError(null);
    setInsertTarget(null);
    setHasModifications(false);
    setIsLeaveConfirmDialogOpen(false);
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
    keys.day = ['vote', 'action', ...(sources?.userTableTitle?.extraDayColumns ?? [])];
    // Column title dropdowns for UpdateCell
    keys._userColumns = sources?.userTableTitle?.extraUserColumns ?? [];
    keys._dayColumns = sources?.userTableTitle?.extraDayColumns ?? [];
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
    dispatchWithUndo({ type: 'SET_STATEMENT_FIELD', path, field, value }, 'Edit field');
  };

  const handleDeleteStatement = (path: number[]) => {
    dispatchWithUndo({ type: 'DELETE_STATEMENT', path }, 'Delete block');
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
          <ConvexDialog.Content className="h-[85vh] max-w-5xl" isSwipeable={!hasModifications}>
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
                        disabled={!canUndo}>
                        <FontText className="text-sm">Undo</FontText>
                      </AppButton>
                      <AppButton
                        variant="outline"
                        className="h-8 px-3"
                        onPress={redo}
                        dropShadow={false}
                        disabled={!canRedo}>
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
                      onAdd={(target) => setInsertTarget(target)}
                      onSetExpression={handleSetExpression}
                      onSetStatementField={handleSetStatementField}
                      onDeleteStatement={handleDeleteStatement}
                      entryKeysBySource={entryKeysBySource}
                      inputSources={inputSources}
                      isTriggerContext={isTriggerContext}
                      gameId={gameId}
                      onEditMarkdown={(value, onSave) =>
                        setMarkdownEditor({ isOpen: true, value, onSave })
                      }
                    />
                  </ShadowScrollView>
                )}
              </View>

              <Row className="justify-end gap-4 pt-2">
                <AppButton variant="outline" className="w-28" onPress={handleAttemptClose}>
                  <FontText weight="medium">Cancel</FontText>
                </AppButton>
                <AppButton
                  variant="filled"
                  className="w-36"
                  disabled={!canSubmit}
                  onPress={handleSubmit}>
                  <FontText weight="medium" color="white">
                    Save Script
                  </FontText>
                </AppButton>
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
    </>
  );
};

export default ScriptEditorDialog;
