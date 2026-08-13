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
import { printScript, printScriptBlock } from '../lang/printer';
import type { Expression, FunctionTemplatePiece, Statement } from '../lang/ast';
import { editorReducer, initialState, createScript } from './editorReducer';
import type { EditorAction } from './editorReducer';
import Canvas from './Canvas';
import InsertModal, { type DefinedFunction, type InsertTarget } from './InsertModal';
import { createScriptGlobals, type ScriptSourceData } from '../runtime/sources';
import { useUndoRedo, useCreateUndoSnapshot } from '../../../hooks/useUndoRedo';

interface ScriptEditorDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialScriptText?: string;
  onSubmit: (scriptText: string) => void;
  sources?: ScriptSourceData;
  title?: string;
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
  acc: DefinedFunction[] = []
): DefinedFunction[] => {
  for (const statement of statements) {
    if (statement.kind === 'FunctionStatement') {
      acc.push({
        name: statement.name,
        parameters: statement.parameters,
        template: statement.template,
      });
      collectDefinedFunctions(statement.body.statements, acc);
    } else if (statement.kind === 'IfStatement') {
      statement.branches.forEach((branch) => collectDefinedFunctions(branch.body.statements, acc));
      if (statement.elseBody) collectDefinedFunctions(statement.elseBody.statements, acc);
    } else if (statement.kind === 'ForEachStatement') {
      collectDefinedFunctions(statement.body.statements, acc);
    }
  }
  return acc;
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
    const ast = trimmed.length > 0 ? parseScript(trimmed) : createScript();
    dispatch({ type: 'REPLACE_AST', ast });
    setTextDraft(trimmed);
    setMode('blocks');
    setParseError(null);
    setInsertTarget(null);
    setHasModifications(false);
    setIsLeaveConfirmDialogOpen(false);
  }, [initialScriptText, isOpen]);

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
  const definedFunctions = useMemo(
    () => collectDefinedFunctions(state.ast.statements),
    [state.ast.statements]
  );
  const entryKeysBySource = useMemo(() => {
    const globals = createScriptGlobals(sources);
    const keys = Object.fromEntries(
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
    keys.currentPlayer = keys.players;
    keys.roles = ['role', 'doesRoleVote', 'isVisible', 'aboutRole'];
    keys.Inputs = collectInputLabels(state.ast.statements);
    // Day object keys: built-in fields + extra day column titles
    keys.day = ['vote', 'action', ...(sources?.userTableTitle?.extraDayColumns ?? [])];
    return keys;
  }, [sources, state.ast.statements]);

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
    field: 'name' | 'parameters' | 'itemName' | 'template',
    value: string | string[] | FunctionTemplatePiece[]
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
            <DialogHeader text={title} subtext="Build dynamic inputs with blocks or text" />
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
              onInsertStatement={handleInsertStatement}
              onInsertExpression={handleInsertExpression}
              onInsertChainLink={handleInsertChainLink}
              onRemove={handleRemove}
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
