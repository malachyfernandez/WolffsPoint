import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
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

const sanitizeIdentifier = (value: string) =>
  value.replace(/[^a-zA-Z0-9_]/g, '').replace(/^[0-9]/, '_$&');

const createDefaultExpression = (pieceType: string): Expression => {
  switch (pieceType) {
    case 'input-text':
      return { kind: 'StringLiteral', value: '', span: emptySpan() };
    case 'input-number':
      return { kind: 'NumberLiteral', value: 0, span: emptySpan() };
    case 'input-dropdown':
      return {
        kind: 'DropdownLiteral',
        options: ['Option 1', 'Option 2'],
        value: 'Option 1',
        span: emptySpan(),
      };
    default:
      return { kind: 'NothingLiteral', span: emptySpan() };
  }
};

const createDefaultLabel = (pieceType: string): string => {
  switch (pieceType) {
    case 'input-text':
      return 'text';
    case 'input-number':
      return 'number';
    case 'input-dropdown':
      return 'choice';
    default:
      return 'param';
  }
};

interface TemplateInputModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  pieceType: string;
  onDone: (piece: FunctionTemplatePiece) => void;
  contextVariables: string[];
  definedFunctions?: DefinedFunction[];
  entryKeysBySource?: Record<string, string[]>;
  onEditMarkdown?: (currentValue: string, onSave: (newValue: string) => void) => void;
}

/**
 * "New Input" modal — a standalone ConvexDialog that is always mounted.
 *
 * The parent controls visibility via `isOpen`.
 * Manages its own draft state (label + default expression) internally.
 * Has its own InsertModal for building expressions — updates the draft directly,
 * not the reducer (since the draft isn't in the AST yet).
 * When the user clicks "Done", calls `onDone` with the constructed piece.
 * Uses the unsaved-changes confirmation pattern on close.
 */
const TemplateInputModal = ({
  isOpen,
  onOpenChange,
  pieceType,
  onDone,
  contextVariables,
  definedFunctions,
  entryKeysBySource,
  onEditMarkdown,
}: TemplateInputModalProps) => {
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
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [insertTarget, setInsertTarget] = useState<InsertTarget | null>(null);

  // Reset drafts whenever this modal opens
  useEffect(() => {
    if (isOpen) {
      const label = createDefaultLabel(pieceType);
      const expr = createDefaultExpression(pieceType);
      setLabelDraft(label);
      setOriginalLabel(label);
      setExprDraft(expr);
      setOriginalExpr(expr);
      setInsertTarget(null);
    }
  }, [isOpen, pieceType]);

  const hasUnsavedChanges =
    labelDraft !== originalLabel || JSON.stringify(exprDraft) !== JSON.stringify(originalExpr);

  const handleSetDraftExpr = useCallback((location: ExpressionLocation, expression: Expression) => {
    setExprDraft(expression);
  }, []);

  // When the InsertModal returns an expression, update the draft directly
  // instead of dispatching to the reducer (the draft isn't in the AST yet).
  const handleInsertExpression = useCallback((expression: Expression, target: InsertTarget) => {
    if (target.replaceMode === 'chainBase') {
      // Replace the whole expression (chain base)
      setExprDraft(expression);
    } else {
      setExprDraft(expression);
    }
    setInsertTarget(null);
  }, []);

  const handleInsertChainLink = useCallback((target: InsertTarget, blockId: string) => {
    // For chain links in the draft, we need to compose the chain.
    // For now, just set the expression to the block ID as an identifier.
    // This is a simplified version — the full chain composition happens
    // in the reducer for AST-based expressions.
    setExprDraft((prev) => {
      // If the current expression is a NothingLiteral, replace it
      if (prev.kind === 'NothingLiteral') {
        return { kind: 'IdentifierExpression', name: blockId, span: emptySpan() };
      }
      // Otherwise, append as a member expression
      return {
        kind: 'MemberExpression',
        object: prev,
        property: blockId,
        span: emptySpan(),
      };
    });
    setInsertTarget(null);
  }, []);

  const handleRemove = useCallback((target: InsertTarget) => {
    if (target.location) {
      setExprDraft({ kind: 'NothingLiteral', span: emptySpan() });
    }
    setInsertTarget(null);
  }, []);

  const handleDone = () => {
    onDone({
      kind: 'input',
      label: sanitizeIdentifier(labelDraft) || 'param',
      defaultExpression: exprDraft,
    });
  };

  const handleAttemptClose = () => {
    if (hasUnsavedChanges) {
      setShowLeaveConfirm(true);
    } else {
      onOpenChange(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && hasUnsavedChanges) {
      setShowLeaveConfirm(true);
    } else {
      onOpenChange(open);
    }
  };

  const handleConfirmLeave = () => {
    setShowLeaveConfirm(false);
    onOpenChange(false);
  };

  // Dummy location for the draft expression socket
  const draftLocation: ExpressionLocation = {
    statementPath: [],
    slot: { kind: 'templateDefault', pieceIndex: -1 },
    expressionPath: [],
  };

  return (
    <>
      <ConvexDialog.Root isOpen={isOpen} onOpenChange={handleOpenChange}>
        <ConvexDialog.Trigger asChild>
          <View />
        </ConvexDialog.Trigger>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="max-w-md" isSwipeable={!hasUnsavedChanges}>
            <CloseButton onPress={handleAttemptClose} />
            <Column className="gap-3 pt-3">
              <FontText weight="medium" className="text-base">
                New Input
              </FontText>

              {/* Variable name */}
              <Column className="gap-1">
                <FontText variant="subtext" className="text-xs">
                  Variable name
                </FontText>
                <StableTextInput
                  value={labelDraft}
                  onChangeText={(value: string) =>
                    setLabelDraft(sanitizeIdentifier(value) || 'param')
                  }
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
                  onAdd={setInsertTarget}
                  onSetExpression={handleSetDraftExpr}
                  onEditMarkdown={onEditMarkdown}
                />
              </Column>

              <Row className="justify-end">
                <AppButton
                  variant="filled"
                  className="h-9 px-4"
                  onPress={handleDone}
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

      <UnsavedChangesDialog
        isOpen={showLeaveConfirm}
        onOpenChange={setShowLeaveConfirm}
        onSave={handleDone}
        onDiscard={handleConfirmLeave}
      />

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
        onInsertBuiltinFunction={() => setInsertTarget(null)}
        hideBuiltinFunctions
        onRemove={handleRemove}
        onClose={() => setInsertTarget(null)}
      />
    </>
  );
};

export default TemplateInputModal;
