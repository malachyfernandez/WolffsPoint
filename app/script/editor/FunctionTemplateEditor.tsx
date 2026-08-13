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
import InsertModal, { type DefinedFunction, type InsertTarget } from './InsertModal';
import type { Expression, FunctionTemplatePiece, Statement } from '../lang/ast';
import { emptySpan } from '../lang/ast';
import type { ExpressionLocation } from './expressionEditor';
import TemplatePickerModal from './TemplatePickerModal';
import TemplateInputModal from './TemplateInputModal';

interface FunctionTemplateEditorProps {
  template: FunctionTemplatePiece[];
  onChange: (template: FunctionTemplatePiece[]) => void;
  statementPath: number[];
  contextVariables: string[];
  definedFunctions?: DefinedFunction[];
  entryKeysBySource?: Record<string, string[]>;
  onEditMarkdown?: (currentValue: string, onSave: (newValue: string) => void) => void;
}

const sanitizeIdentifier = (value: string) =>
  value.replace(/[^a-zA-Z0-9_]/g, '').replace(/^[0-9]/, '_$&');

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

const FunctionTemplateEditor = ({
  template,
  onChange,
  statementPath,
  contextVariables,
  definedFunctions,
  entryKeysBySource,
  onEditMarkdown,
}: FunctionTemplateEditorProps) => {
  // --- Modal open states (each is a separate dialog object, always mounted) ---
  const [pickerOpen, setPickerOpen] = useState(false);
  const [swapPickerOpen, setSwapPickerOpen] = useState(false);
  const [newInputOpen, setNewInputOpen] = useState(false);
  const [newTextOpen, setNewTextOpen] = useState(false);
  const [editTextOpen, setEditTextOpen] = useState(false);
  const [editInputOpen, setEditInputOpen] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // Context for which insert index / piece type / edit index the open modal uses
  const [insertIndex, setInsertIndex] = useState(0);
  const [pieceType, setPieceType] = useState<string>('input-blank');
  const [editIndex, setEditIndex] = useState(0);

  // When true, the "new" modals replace the piece at editIndex instead of inserting
  const [swapMode, setSwapMode] = useState(false);

  // --- Draft state for text modals (newText, editText) ---
  const [textDraft, setTextDraft] = useState('');
  const [originalText, setOriginalText] = useState('');

  // --- Draft state for edit input modal ---
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

  // Reset text drafts when text modals open
  useEffect(() => {
    if (newTextOpen) {
      setTextDraft('');
      setOriginalText('');
    }
  }, [newTextOpen]);

  useEffect(() => {
    if (editTextOpen) {
      const piece = template[editIndex];
      const text = piece?.kind === 'text' ? (piece.text ?? '') : '';
      setTextDraft(text);
      setOriginalText(text);
    }
  }, [editTextOpen, editIndex, template]);

  // Reset input drafts when edit input modal opens
  useEffect(() => {
    if (editInputOpen) {
      const piece = template[editIndex];
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
  }, [editInputOpen, editIndex, template]);

  // --- Unsaved changes detection for inline modals ---
  // (picker and newInput manage their own unsaved-changes state)
  const inlineHasUnsavedChanges = (() => {
    if (newTextOpen || editTextOpen) {
      return textDraft !== originalText;
    }
    if (editInputOpen) {
      return (
        labelDraft !== originalLabel || JSON.stringify(exprDraft) !== JSON.stringify(originalExpr)
      );
    }
    return false;
  })();

  // --- Close handlers for inline modals ---
  const closeInlineModals = useCallback(() => {
    setNewTextOpen(false);
    setEditTextOpen(false);
    setEditInputOpen(false);
  }, []);

  const handleInlineAttemptClose = useCallback(() => {
    if (inlineHasUnsavedChanges) {
      setShowLeaveConfirm(true);
    } else {
      closeInlineModals();
    }
  }, [inlineHasUnsavedChanges, closeInlineModals]);

  const handleInlineOpenChange = useCallback(
    (open: boolean) => {
      if (!open && inlineHasUnsavedChanges) {
        setShowLeaveConfirm(true);
      } else if (!open) {
        closeInlineModals();
      }
    },
    [inlineHasUnsavedChanges, closeInlineModals]
  );

  const handleConfirmLeave = () => {
    setShowLeaveConfirm(false);
    closeInlineModals();
  };

  const handleCancelLeave = () => {
    setShowLeaveConfirm(false);
  };

  // --- Picker → next modal transitions ---
  // Close picker and open the next modal simultaneously.
  // Both are separate dialog objects, so each plays its own animation.
  const handlePickerSelectNewText = () => {
    setPickerOpen(false);
    setSwapMode(false);
    setNewTextOpen(true);
  };

  const handlePickerSelectNewInput = (type: string) => {
    setPieceType(type);
    setPickerOpen(false);
    setSwapMode(false);
    setNewInputOpen(true);
  };

  // --- Swap picker → next modal transitions ---
  // Same as above but in swap mode (replace at editIndex instead of insert)
  const handleSwapPickerSelectNewText = () => {
    setSwapPickerOpen(false);
    setSwapMode(true);
    setNewTextOpen(true);
  };

  const handleSwapPickerSelectNewInput = (type: string) => {
    setPieceType(type);
    setSwapPickerOpen(false);
    setSwapMode(true);
    setNewInputOpen(true);
  };

  // --- Swap button handler (from edit modals) ---
  const handleSwap = () => {
    closeInlineModals();
    setSwapPickerOpen(true);
  };

  // --- Commit handlers ---
  const handleDoneNewText = () => {
    const newPiece: FunctionTemplatePiece = { kind: 'text', text: textDraft };
    const newTemplate = [...template];
    if (swapMode) {
      newTemplate[editIndex] = newPiece;
    } else {
      newTemplate.splice(insertIndex, 0, newPiece);
    }
    onChange(newTemplate);
    setNewTextOpen(false);
    setSwapMode(false);
  };

  const handleDoneNewInput = (piece: FunctionTemplatePiece) => {
    const newTemplate = [...template];
    if (swapMode) {
      newTemplate[editIndex] = piece;
    } else {
      newTemplate.splice(insertIndex, 0, piece);
    }
    onChange(newTemplate);
    setNewInputOpen(false);
    setSwapMode(false);
  };

  const handleSaveEditText = () => {
    const newTemplate = [...template];
    newTemplate[editIndex] = { kind: 'text', text: textDraft };
    onChange(newTemplate);
    setEditTextOpen(false);
  };

  const handleSaveEditInput = () => {
    const newTemplate = [...template];
    newTemplate[editIndex] = {
      kind: 'input',
      label: sanitizeIdentifier(labelDraft) || 'param',
      defaultExpression: exprDraft,
    };
    onChange(newTemplate);
    setEditInputOpen(false);
  };

  const handleRemove = () => {
    if (editTextOpen || editInputOpen) {
      const newTemplate = template.filter((_, i) => i !== editIndex);
      onChange(newTemplate);
      closeInlineModals();
    }
  };

  // For the edit input draft expression
  const handleSetDraftExpr = useCallback((location: ExpressionLocation, expression: Expression) => {
    setExprDraft(expression);
  }, []);

  return (
    <Column className="gap-0">
      <Row className="flex-wrap items-center gap-0 rounded-lg bg-black/5 p-3">
        {/* Leading connector */}
        <TemplatePlusButton
          onPress={() => {
            setInsertIndex(0);
            setPickerOpen(true);
          }}
        />

        {template.map((piece, index) => (
          <React.Fragment key={`piece-${index}`}>
            <PieceChip
              piece={piece}
              onPress={() => {
                if (piece.kind === 'text') {
                  setEditIndex(index);
                  setEditTextOpen(true);
                } else {
                  setEditIndex(index);
                  setEditInputOpen(true);
                }
              }}
            />
            <TemplatePlusButton
              onPress={() => {
                setInsertIndex(index + 1);
                setPickerOpen(true);
              }}
            />
          </React.Fragment>
        ))}
      </Row>

      {/* PICKER MODAL — separate component, always mounted */}
      {/* ADD A PIECE picker — separate component, always mounted */}
      <TemplatePickerModal
        isOpen={pickerOpen}
        onOpenChange={(open) => {
          if (!open) setPickerOpen(false);
        }}
        onSelectNewText={handlePickerSelectNewText}
        onSelectNewInput={handlePickerSelectNewInput}
        onClose={() => setPickerOpen(false)}
      />

      {/* SWAP A PIECE picker — separate component, always mounted */}
      <TemplatePickerModal
        isOpen={swapPickerOpen}
        onOpenChange={(open) => {
          if (!open) setSwapPickerOpen(false);
        }}
        onSelectNewText={handleSwapPickerSelectNewText}
        onSelectNewInput={handleSwapPickerSelectNewInput}
        onClose={() => setSwapPickerOpen(false)}
        title="Swap a piece"
      />

      {/* NEW INPUT MODAL — separate component, always mounted */}
      <TemplateInputModal
        isOpen={newInputOpen}
        onOpenChange={(open) => {
          if (!open) setNewInputOpen(false);
        }}
        pieceType={pieceType}
        onDone={handleDoneNewInput}
        contextVariables={contextVariables}
        definedFunctions={definedFunctions}
        entryKeysBySource={entryKeysBySource}
        onEditMarkdown={onEditMarkdown}
      />

      {/* NEW TEXT dialog — inline modal */}
      <ConvexDialog.Root isOpen={newTextOpen} onOpenChange={handleInlineOpenChange}>
        <ConvexDialog.Trigger asChild>
          <View />
        </ConvexDialog.Trigger>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="max-w-md" isSwipeable={!inlineHasUnsavedChanges}>
            <CloseButton onPress={handleInlineAttemptClose} />
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

      {/* EDIT TEXT dialog — inline modal */}
      <ConvexDialog.Root isOpen={editTextOpen} onOpenChange={handleInlineOpenChange}>
        <ConvexDialog.Trigger asChild>
          <View />
        </ConvexDialog.Trigger>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="max-w-md" isSwipeable={!inlineHasUnsavedChanges}>
            <CloseButton onPress={handleInlineAttemptClose} />
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
                <Row className="gap-2">
                  <AppButton
                    variant="outline"
                    className="h-9 px-3"
                    onPress={handleSwap}
                    dropShadow={false}>
                    <FontText weight="medium" className="text-sm">
                      Swap
                    </FontText>
                  </AppButton>
                  <AppButton
                    variant="red"
                    className="h-9 px-3"
                    onPress={handleRemove}
                    dropShadow={false}>
                    <FontText weight="bold" className="text-sm text-red-500">
                      Remove
                    </FontText>
                  </AppButton>
                </Row>
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

      {/* EDIT INPUT dialog — inline modal */}
      <ConvexDialog.Root isOpen={editInputOpen} onOpenChange={handleInlineOpenChange}>
        <ConvexDialog.Trigger asChild>
          <View />
        </ConvexDialog.Trigger>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="max-w-md" isSwipeable={!inlineHasUnsavedChanges}>
            <CloseButton onPress={handleInlineAttemptClose} />
            {editInputOpen && (
              <EditInputContent
                labelDraft={labelDraft}
                setLabelDraft={setLabelDraft}
                exprDraft={exprDraft}
                onSetExpr={handleSetDraftExpr}
                contextVariables={contextVariables}
                definedFunctions={definedFunctions}
                entryKeysBySource={entryKeysBySource}
                onEditMarkdown={onEditMarkdown}
                onSave={handleSaveEditInput}
                onRemove={handleRemove}
                onSwap={handleSwap}
              />
            )}
          </ConvexDialog.Content>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>

      {/* Unsaved changes confirmation (for inline modals) */}
      <UnsavedChangesDialog
        isOpen={showLeaveConfirm}
        onOpenChange={setShowLeaveConfirm}
        onStay={handleCancelLeave}
        onLeave={handleConfirmLeave}
      />
    </Column>
  );
};

/** Plus button that shows as a small dot and expands on hover. */
const TemplatePlusButton = ({ onPress }: { onPress: () => void }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      className="-mx-1 h-6 w-6 items-center justify-center rounded-full">
      <View
        className={`border-subtle-border items-center justify-center rounded-full border transition-all ${
          hovered ? 'hover:bg-text/10 h-6 w-6' : 'bg-text/20 h-2 w-2 border-transparent'
        }`}>
        {hovered && <Plus size={12} color="#1a1a1a" />}
      </View>
    </Pressable>
  );
};

/** Compact chip display for a piece in the template row. */
const PieceChip = ({ piece, onPress }: { piece: FunctionTemplatePiece; onPress: () => void }) => {
  if (piece.kind === 'text') {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        className="rounded px-1 py-0.5 hover:bg-black/5">
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

/** Edit input content (used only by the edit input inline modal) */
const EditInputContent = ({
  labelDraft,
  setLabelDraft,
  exprDraft,
  onSetExpr,
  contextVariables,
  definedFunctions,
  entryKeysBySource,
  onEditMarkdown,
  onSave,
  onRemove,
  onSwap,
}: {
  labelDraft: string;
  setLabelDraft: (value: string) => void;
  exprDraft: Expression;
  onSetExpr: (location: ExpressionLocation, expression: Expression) => void;
  contextVariables: string[];
  definedFunctions?: DefinedFunction[];
  entryKeysBySource?: Record<string, string[]>;
  onEditMarkdown?: (currentValue: string, onSave: (newValue: string) => void) => void;
  onSave: () => void;
  onRemove: () => void;
  onSwap: () => void;
}) => {
  const [insertTarget, setInsertTarget] = useState<InsertTarget | null>(null);

  const draftLocation: ExpressionLocation = {
    statementPath: [],
    slot: { kind: 'templateDefault', pieceIndex: -1 },
    expressionPath: [],
  };

  // When the InsertModal returns an expression, update the draft directly
  const handleInsertExpression = useCallback(
    (expression: Expression, _target: InsertTarget) => {
      onSetExpr(draftLocation, expression);
      setInsertTarget(null);
    },
    [onSetExpr, draftLocation]
  );

  const handleInsertChainLink = useCallback(
    (target: InsertTarget, blockId: string) => {
      onSetExpr(draftLocation, {
        kind: 'IdentifierExpression',
        name: blockId,
        span: emptySpan(),
      });
      setInsertTarget(null);
    },
    [onSetExpr, draftLocation]
  );

  const handleRemoveExpr = useCallback(
    (_target: InsertTarget) => {
      onSetExpr(draftLocation, { kind: 'NothingLiteral', span: emptySpan() });
      setInsertTarget(null);
    },
    [onSetExpr, draftLocation]
  );

  return (
    <>
      <Column className="gap-3 pt-3">
        <FontText weight="medium" className="text-base">
          Edit Input
        </FontText>

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
            onAdd={setInsertTarget}
            onSetExpression={onSetExpr}
            onEditMarkdown={onEditMarkdown}
          />
        </Column>

        <Row className="justify-between">
          <Row className="gap-2">
            <AppButton variant="outline" className="h-9 px-3" onPress={onSwap} dropShadow={false}>
              <FontText weight="medium" className="text-sm">
                Swap
              </FontText>
            </AppButton>
            <AppButton variant="red" className="h-9 px-3" onPress={onRemove} dropShadow={false}>
              <FontText weight="bold" className="text-sm text-red-500">
                Remove
              </FontText>
            </AppButton>
          </Row>
          <AppButton variant="filled" className="h-9 px-4" onPress={onSave} dropShadow={false}>
            <FontText weight="medium" color="white">
              Save
            </FontText>
          </AppButton>
        </Row>
      </Column>

      {/* Local InsertModal — updates the draft directly, not the reducer */}
      <InsertModal
        isOpen={insertTarget !== null}
        target={insertTarget}
        definedVariables={[]}
        definedFunctions={definedFunctions ?? []}
        onInsertStatement={(_stmt: Statement, _path: number[]) => {
          setInsertTarget(null);
        }}
        onInsertExpression={handleInsertExpression}
        onInsertChainLink={handleInsertChainLink}
        onRemove={handleRemoveExpr}
        onClose={() => setInsertTarget(null)}
      />
    </>
  );
};

export default FunctionTemplateEditor;
