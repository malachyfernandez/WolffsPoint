import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Plus } from 'lucide-react-native';
import Column from '../../components/layout/Column';
import Row from '../../components/layout/Row';
import FontText from '../../components/ui/text/FontText';
import ConvexDialog from '../../components/ui/dialog/ConvexDialog';
import { CloseButton } from '../../components/game/markdownEditor';
import AppButton from '../../components/ui/buttons/AppButton';
import UnsavedChangesDialog from '../../components/ui/dialog/UnsavedChangesDialog';
import { StableTextInput, ExpressionSocket } from './Canvas';
import type { Expression, FunctionTemplatePiece } from '../lang/ast';
import { emptySpan } from '../lang/ast';
import type { ExpressionLocation } from './expressionEditor';
import type { DefinedFunction, InsertTarget } from './InsertModal';

interface FunctionTemplateEditorProps {
  template: FunctionTemplatePiece[];
  onChange: (template: FunctionTemplatePiece[]) => void;
  statementPath: number[];
  contextVariables: string[];
  definedFunctions?: DefinedFunction[];
  entryKeysBySource?: Record<string, string[]>;
  onAdd: (target: InsertTarget) => void;
  onSetExpression: (
    location: ExpressionLocation,
    expression: Expression,
    trackHistory?: boolean
  ) => void;
  onEditMarkdown?: (currentValue: string, onSave: (newValue: string) => void) => void;
}

const PIECE_TYPES = [
  { kind: 'text' as const, label: 'Text', description: 'Static text between inputs' },
  { kind: 'input-blank' as const, label: 'Blank input', description: 'Any expression, no default' },
  { kind: 'input-text' as const, label: 'Text input', description: 'Defaults to a text value' },
  { kind: 'input-number' as const, label: 'Number input', description: 'Defaults to a number' },
  {
    kind: 'input-dropdown' as const,
    label: 'Dropdown input',
    description: 'Defaults to a dropdown with options',
  },
];

const createPiece = (kind: string): FunctionTemplatePiece => {
  switch (kind) {
    case 'text':
      return { kind: 'text', text: '' };
    case 'input-blank':
      return {
        kind: 'input',
        label: 'param',
        defaultExpression: { kind: 'NothingLiteral', span: emptySpan() },
      };
    case 'input-text':
      return {
        kind: 'input',
        label: 'text',
        defaultExpression: { kind: 'StringLiteral', value: '', span: emptySpan() },
      };
    case 'input-number':
      return {
        kind: 'input',
        label: 'number',
        defaultExpression: { kind: 'NumberLiteral', value: 0, span: emptySpan() },
      };
    case 'input-dropdown':
      return {
        kind: 'input',
        label: 'choice',
        defaultExpression: {
          kind: 'DropdownLiteral',
          options: ['Option 1', 'Option 2'],
          value: 'Option 1',
          span: emptySpan(),
        },
      };
    default:
      return { kind: 'text', text: '' };
  }
};

const sanitizeIdentifier = (value: string) =>
  value.replace(/[^a-zA-Z0-9_]/g, '').replace(/^[0-9]/, '_$&');

type ModalState =
  | { kind: 'picker'; insertIndex: number }
  | { kind: 'newText'; insertIndex: number }
  | { kind: 'newInput'; insertIndex: number; pieceType: string }
  | { kind: 'editText'; index: number }
  | { kind: 'editInput'; index: number };

const FunctionTemplateEditor = ({
  template,
  onChange,
  statementPath,
  contextVariables,
  definedFunctions,
  entryKeysBySource,
  onAdd,
  onSetExpression,
  onEditMarkdown,
}: FunctionTemplateEditorProps) => {
  const [modalState, setModalState] = useState<ModalState | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // Draft state for text editing
  const [textDraft, setTextDraft] = useState('');
  const [originalText, setOriginalText] = useState('');

  // Draft state for input editing
  const [labelDraft, setLabelDraft] = useState('');
  const [originalLabel, setOriginalLabel] = useState('');
  const [exprDraft, setExprDraft] = useState<Expression>({
    kind: 'NothingLiteral',
    span: emptySpan(),
  });
  const [originalExpr, setOriginalExpr] = useState<Expression>({
    kind: 'NothingLiteral',
    span: emptySpan(),
  });

  // Reset drafts when modal opens
  useEffect(() => {
    if (!modalState) return;
    if (modalState.kind === 'newText') {
      setTextDraft('');
      setOriginalText('');
    } else if (modalState.kind === 'editText') {
      const piece = template[modalState.index];
      const text = piece?.kind === 'text' ? (piece.text ?? '') : '';
      setTextDraft(text);
      setOriginalText(text);
    } else if (modalState.kind === 'newInput') {
      const piece = createPiece(modalState.pieceType);
      if (piece.kind === 'input') {
        const expr: Expression = piece.defaultExpression ?? {
          kind: 'NothingLiteral',
          span: emptySpan(),
        };
        setLabelDraft(piece.label ?? '');
        setExprDraft(expr);
      } else {
        setLabelDraft('');
        setExprDraft({ kind: 'NothingLiteral', span: emptySpan() });
      }
      setOriginalLabel('');
      setOriginalExpr({ kind: 'NothingLiteral', span: emptySpan() });
    } else if (modalState.kind === 'editInput') {
      const piece = template[modalState.index];
      if (piece && piece.kind === 'input') {
        const expr: Expression = piece.defaultExpression ?? {
          kind: 'NothingLiteral',
          span: emptySpan(),
        };
        setLabelDraft(piece.label ?? '');
        setOriginalLabel(piece.label ?? '');
        setExprDraft(expr);
        setOriginalExpr(expr);
      } else {
        setLabelDraft('');
        setOriginalLabel('');
        setExprDraft({ kind: 'NothingLiteral', span: emptySpan() });
        setOriginalExpr({ kind: 'NothingLiteral', span: emptySpan() });
      }
    }
  }, [modalState, template]);

  // Check for unsaved changes
  const hasUnsavedChanges = (() => {
    if (!modalState) return false;
    if (modalState.kind === 'newText' || modalState.kind === 'editText') {
      return textDraft !== originalText;
    }
    if (modalState.kind === 'newInput' || modalState.kind === 'editInput') {
      return (
        labelDraft !== originalLabel || JSON.stringify(exprDraft) !== JSON.stringify(originalExpr)
      );
    }
    return false;
  })();

  const closeModal = useCallback(() => {
    setModalState(null);
  }, []);

  const handleAttemptClose = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowLeaveConfirm(true);
    } else {
      closeModal();
    }
  }, [hasUnsavedChanges, closeModal]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open && hasUnsavedChanges) {
        setShowLeaveConfirm(true);
      } else if (!open) {
        closeModal();
      }
    },
    [hasUnsavedChanges, closeModal]
  );

  const handleConfirmLeave = () => {
    setShowLeaveConfirm(false);
    closeModal();
  };

  const handleCancelLeave = () => {
    setShowLeaveConfirm(false);
  };

  // Commit a new text piece
  const handleDoneNewText = () => {
    if (!modalState || modalState.kind !== 'newText') return;
    const newPiece: FunctionTemplatePiece = { kind: 'text', text: textDraft };
    const newTemplate = [...template];
    newTemplate.splice(modalState.insertIndex, 0, newPiece);
    onChange(newTemplate);
    closeModal();
  };

  // Commit a new input piece
  const handleDoneNewInput = () => {
    if (!modalState || modalState.kind !== 'newInput') return;
    const newPiece: FunctionTemplatePiece = {
      kind: 'input',
      label: sanitizeIdentifier(labelDraft) || 'param',
      defaultExpression: exprDraft,
    };
    const newTemplate = [...template];
    newTemplate.splice(modalState.insertIndex, 0, newPiece);
    onChange(newTemplate);
    closeModal();
  };

  // Save an edited text piece
  const handleSaveEditText = () => {
    if (!modalState || modalState.kind !== 'editText') return;
    const newTemplate = [...template];
    newTemplate[modalState.index] = { kind: 'text', text: textDraft };
    onChange(newTemplate);
    closeModal();
  };

  // Save an edited input piece
  const handleSaveEditInput = () => {
    if (!modalState || modalState.kind !== 'editInput') return;
    const newTemplate = [...template];
    newTemplate[modalState.index] = {
      kind: 'input',
      label: sanitizeIdentifier(labelDraft) || 'param',
      defaultExpression: exprDraft,
    };
    onChange(newTemplate);
    closeModal();
  };

  // Remove a piece
  const handleRemove = () => {
    if (!modalState) return;
    if (modalState.kind === 'editText' || modalState.kind === 'editInput') {
      const newTemplate = template.filter((_, i) => i !== modalState.index);
      onChange(newTemplate);
      closeModal();
    }
  };

  // Location for the ExpressionSocket to edit the draft expression
  const exprLocation: ExpressionLocation | null = (() => {
    if (!modalState) return null;
    if (modalState.kind === 'newInput' || modalState.kind === 'editInput') {
      return {
        statementPath,
        slot: { kind: 'templateDefault', pieceIndex: -1 }, // -1 = draft, not yet committed
        expressionPath: [],
      };
    }
    return null;
  })();

  // For the draft expression, we need a custom onSetExpression that updates the draft
  const handleSetDraftExpr = useCallback((location: ExpressionLocation, expression: Expression) => {
    setExprDraft(expression);
  }, []);

  const isEditing = modalState?.kind === 'editText' || modalState?.kind === 'editInput';
  const isNew = modalState?.kind === 'newText' || modalState?.kind === 'newInput';
  const isTextInput = modalState?.kind === 'newText' || modalState?.kind === 'editText';
  const isInputPiece = modalState?.kind === 'newInput' || modalState?.kind === 'editInput';

  return (
    <Column className="gap-1">
      <Row className="items-center gap-2">
        <FontText weight="medium" className="text-sm">
          Template
        </FontText>
      </Row>

      <Row className="flex-wrap items-center gap-1">
        {/* Leading connector */}
        <Pressable
          accessibilityRole="button"
          onPress={() => setModalState({ kind: 'picker', insertIndex: 0 })}
          className="border-subtle-border hover:bg-text/10 h-6 w-6 items-center justify-center rounded-full border">
          <Plus size={12} color="#1a1a1a" />
        </Pressable>

        {template.map((piece, index) => (
          <React.Fragment key={`piece-${index}`}>
            <PieceChip
              piece={piece}
              onPress={() => {
                if (piece.kind === 'text') {
                  setModalState({ kind: 'editText', index });
                } else {
                  setModalState({ kind: 'editInput', index });
                }
              }}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => setModalState({ kind: 'picker', insertIndex: index + 1 })}
              className="border-subtle-border hover:bg-text/10 h-6 w-6 items-center justify-center rounded-full border">
              <Plus size={12} color="#1a1a1a" />
            </Pressable>
          </React.Fragment>
        ))}
      </Row>

      {/* ADD A PIECE picker dialog */}
      <ConvexDialog.Root isOpen={modalState?.kind === 'picker'} onOpenChange={handleOpenChange}>
        <ConvexDialog.Trigger asChild>
          <View />
        </ConvexDialog.Trigger>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="max-w-sm" isSwipeable={false}>
            <CloseButton onPress={handleAttemptClose} />
            <Column className="gap-3 pt-3">
              <FontText weight="medium" className="text-base">
                Add a piece
              </FontText>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (modalState?.kind === 'picker') {
                    setModalState({ kind: 'newText', insertIndex: modalState.insertIndex });
                  }
                }}
                className="bg-text/5 hover:bg-text/10 rounded-lg p-3">
                <Column className="gap-0.5">
                  <FontText weight="medium" className="text-sm">
                    New Text
                  </FontText>
                  <FontText variant="subtext" className="text-xs">
                    Static text between inputs
                  </FontText>
                </Column>
              </Pressable>
              {PIECE_TYPES.filter((p) => p.kind !== 'text').map((pt) => (
                <Pressable
                  key={pt.kind}
                  accessibilityRole="button"
                  onPress={() => {
                    if (modalState?.kind === 'picker') {
                      setModalState({
                        kind: 'newInput',
                        insertIndex: modalState.insertIndex,
                        pieceType: pt.kind,
                      });
                    }
                  }}
                  className="bg-text/5 hover:bg-text/10 rounded-lg p-3">
                  <Column className="gap-0.5">
                    <FontText weight="medium" className="text-sm">
                      {pt.label}
                    </FontText>
                    <FontText variant="subtext" className="text-xs">
                      {pt.description}
                    </FontText>
                  </Column>
                </Pressable>
              ))}
            </Column>
          </ConvexDialog.Content>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>

      {/* NEW TEXT dialog */}
      <ConvexDialog.Root isOpen={modalState?.kind === 'newText'} onOpenChange={handleOpenChange}>
        <ConvexDialog.Trigger asChild>
          <View />
        </ConvexDialog.Trigger>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="max-w-md" isSwipeable={!hasUnsavedChanges}>
            <CloseButton onPress={handleAttemptClose} />
            <Column className="gap-3 pt-3">
              <FontText weight="medium" className="text-base">
                New Text
              </FontText>
              <StableTextInput
                value={textDraft}
                onChangeText={setTextDraft}
                placeholder="Static text"
                className="bg-text/10 rounded-lg px-3 py-2 text-sm"
              />
              <Row className="justify-end">
                <AppButton
                  variant="filled"
                  className="h-9 px-4"
                  onPress={handleDoneNewText}
                  dropShadow={false}>
                  <FontText weight="medium" color="white">
                    Done
                  </FontText>
                </AppButton>
              </Row>
            </Column>
          </ConvexDialog.Content>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>

      {/* NEW INPUT dialog */}
      <ConvexDialog.Root isOpen={modalState?.kind === 'newInput'} onOpenChange={handleOpenChange}>
        <ConvexDialog.Trigger asChild>
          <View />
        </ConvexDialog.Trigger>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="max-w-md" isSwipeable={!hasUnsavedChanges}>
            <CloseButton onPress={handleAttemptClose} />
            {modalState?.kind === 'newInput' && (
              <InputEditorContent
                labelDraft={labelDraft}
                setLabelDraft={setLabelDraft}
                exprDraft={exprDraft}
                onSetExpr={handleSetDraftExpr}
                contextVariables={contextVariables}
                definedFunctions={definedFunctions}
                entryKeysBySource={entryKeysBySource}
                onAdd={onAdd}
                onSetExpression={onSetExpression}
                onEditMarkdown={onEditMarkdown}
                isEditing={false}
                onSave={handleDoneNewInput}
                saveLabel="Done"
              />
            )}
          </ConvexDialog.Content>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>

      {/* EDIT TEXT dialog */}
      <ConvexDialog.Root isOpen={modalState?.kind === 'editText'} onOpenChange={handleOpenChange}>
        <ConvexDialog.Trigger asChild>
          <View />
        </ConvexDialog.Trigger>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="max-w-md" isSwipeable={!hasUnsavedChanges}>
            <CloseButton onPress={handleAttemptClose} />
            <Column className="gap-3 pt-3">
              <FontText weight="medium" className="text-base">
                Edit Text
              </FontText>
              <StableTextInput
                value={textDraft}
                onChangeText={setTextDraft}
                placeholder="Static text"
                className="bg-text/10 rounded-lg px-3 py-2 text-sm"
              />
              <Row className="justify-between">
                <AppButton
                  variant="red"
                  className="h-9 px-3"
                  onPress={handleRemove}
                  dropShadow={false}>
                  <FontText weight="bold" className="text-sm text-red-500">
                    Remove
                  </FontText>
                </AppButton>
                <AppButton
                  variant="filled"
                  className="h-9 px-4"
                  onPress={handleSaveEditText}
                  dropShadow={false}>
                  <FontText weight="medium" color="white">
                    Save
                  </FontText>
                </AppButton>
              </Row>
            </Column>
          </ConvexDialog.Content>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>

      {/* EDIT INPUT dialog */}
      <ConvexDialog.Root isOpen={modalState?.kind === 'editInput'} onOpenChange={handleOpenChange}>
        <ConvexDialog.Trigger asChild>
          <View />
        </ConvexDialog.Trigger>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="max-w-md" isSwipeable={!hasUnsavedChanges}>
            <CloseButton onPress={handleAttemptClose} />
            {modalState?.kind === 'editInput' && (
              <InputEditorContent
                labelDraft={labelDraft}
                setLabelDraft={setLabelDraft}
                exprDraft={exprDraft}
                onSetExpr={handleSetDraftExpr}
                contextVariables={contextVariables}
                definedFunctions={definedFunctions}
                entryKeysBySource={entryKeysBySource}
                onAdd={onAdd}
                onSetExpression={onSetExpression}
                onEditMarkdown={onEditMarkdown}
                isEditing={true}
                onSave={handleSaveEditInput}
                saveLabel="Save"
                onRemove={handleRemove}
              />
            )}
          </ConvexDialog.Content>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>

      {/* Unsaved changes confirmation */}
      <UnsavedChangesDialog
        isOpen={showLeaveConfirm}
        onOpenChange={setShowLeaveConfirm}
        onStay={handleCancelLeave}
        onLeave={handleConfirmLeave}
      />
    </Column>
  );
};

/** Compact chip display for a piece in the template row. */
const PieceChip = ({ piece, onPress }: { piece: FunctionTemplatePiece; onPress: () => void }) => {
  if (piece.kind === 'text') {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        className="border-subtle-border items-center rounded-full border bg-white px-2 py-1">
        <FontText className="text-sm">{piece.text || 'text'}</FontText>
      </Pressable>
    );
  }

  const defaultExpr = piece.defaultExpression;
  const typeLabel =
    defaultExpr?.kind === 'StringLiteral'
      ? 'text'
      : defaultExpr?.kind === 'NumberLiteral'
        ? 'number'
        : defaultExpr?.kind === 'DropdownLiteral'
          ? 'dropdown'
          : defaultExpr?.kind === 'NothingLiteral'
            ? 'blank'
            : 'expr';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="border-subtle-border bg-accent/10 items-center rounded-lg border px-2 py-1">
      <Row className="items-center gap-1">
        <FontText weight="medium" className="text-sm">
          {piece.label || 'param'}
        </FontText>
        <FontText variant="subtext" className="text-xs opacity-60">
          {typeLabel}
        </FontText>
      </Row>
    </Pressable>
  );
};

/** Shared input editor content for both new and edit input modals. */
const InputEditorContent = ({
  labelDraft,
  setLabelDraft,
  exprDraft,
  onSetExpr,
  contextVariables,
  definedFunctions,
  entryKeysBySource,
  onAdd,
  onSetExpression,
  onEditMarkdown,
  isEditing,
  onSave,
  saveLabel,
  onRemove,
}: {
  labelDraft: string;
  setLabelDraft: (value: string) => void;
  exprDraft: Expression;
  onSetExpr: (location: ExpressionLocation, expression: Expression) => void;
  contextVariables: string[];
  definedFunctions?: DefinedFunction[];
  entryKeysBySource?: Record<string, string[]>;
  onAdd: (target: InsertTarget) => void;
  onSetExpression: (
    location: ExpressionLocation,
    expression: Expression,
    trackHistory?: boolean
  ) => void;
  onEditMarkdown?: (currentValue: string, onSave: (newValue: string) => void) => void;
  isEditing: boolean;
  onSave: () => void;
  saveLabel: string;
  onRemove?: () => void;
}) => {
  // Use a dummy location for the draft expression socket
  const draftLocation: ExpressionLocation = {
    statementPath: [],
    slot: { kind: 'templateDefault', pieceIndex: -1 },
    expressionPath: [],
  };

  return (
    <Column className="gap-3 pt-3">
      <FontText weight="medium" className="text-base">
        {isEditing ? 'Edit Input' : 'New Input'}
      </FontText>

      {/* Variable name */}
      <Column className="gap-1">
        <FontText variant="subtext" className="text-xs">
          Variable name
        </FontText>
        <StableTextInput
          value={labelDraft}
          onChangeText={(value: string) => setLabelDraft(sanitizeIdentifier(value) || 'param')}
          placeholder="variableName"
          autoCapitalize="none"
          autoCorrect={false}
          className="bg-text/10 rounded-lg px-3 py-2 text-sm"
        />
      </Column>

      {/* Default value — full expression editor */}
      <Column className="gap-1">
        <FontText variant="subtext" className="text-xs">
          Default value
        </FontText>
        <ExpressionSocket
          expression={exprDraft}
          location={draftLocation}
          contextVariables={contextVariables}
          entryKeysBySource={entryKeysBySource}
          definedFunctions={definedFunctions}
          label="default"
          onAdd={onAdd}
          onSetExpression={onSetExpr}
          onEditMarkdown={onEditMarkdown}
        />
      </Column>

      <Row className="justify-between">
        {isEditing && onRemove ? (
          <AppButton variant="red" className="h-9 px-3" onPress={onRemove} dropShadow={false}>
            <FontText weight="bold" className="text-sm text-red-500">
              Remove
            </FontText>
          </AppButton>
        ) : (
          <View />
        )}
        <AppButton variant="filled" className="h-9 px-4" onPress={onSave} dropShadow={false}>
          <FontText weight="medium" color="white">
            {saveLabel}
          </FontText>
        </AppButton>
      </Row>
    </Column>
  );
};

export default FunctionTemplateEditor;
