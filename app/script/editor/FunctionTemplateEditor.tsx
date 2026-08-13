import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Plus, X } from 'lucide-react-native';
import Column from '../../components/layout/Column';
import Row from '../../components/layout/Row';
import FontText from '../../components/ui/text/FontText';
import ConvexDialog from '../../components/ui/dialog/ConvexDialog';
import { CloseButton } from '../../components/game/markdownEditor';
import AppButton from '../../components/ui/buttons/AppButton';
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
      return { kind: 'text', text: 'text' };
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
  const [pickerIndex, setPickerIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const addPiece = (index: number, kind: string) => {
    const newPiece = createPiece(kind);
    const newTemplate = [...template];
    newTemplate.splice(index, 0, newPiece);
    onChange(newTemplate);
    setPickerIndex(null);
    // If it's an input piece, open the editor for it
    if (kind !== 'text') {
      // The new piece is at `index` in the new template
      setEditingIndex(index);
    }
  };

  const removePiece = (index: number) => {
    const newTemplate = template.filter((_, i) => i !== index);
    onChange(newTemplate);
    setEditingIndex(null);
  };

  const updatePiece = (index: number, updates: Partial<FunctionTemplatePiece>) => {
    const newTemplate = [...template];
    newTemplate[index] = { ...newTemplate[index], ...updates };
    onChange(newTemplate);
  };

  const swapPieceType = (index: number, kind: string) => {
    const newPiece = createPiece(kind);
    // Preserve label if it was an input and new one is also an input
    if (template[index].kind === 'input' && newPiece.kind === 'input') {
      newPiece.label = template[index].label;
    }
    const newTemplate = [...template];
    newTemplate[index] = newPiece;
    onChange(newTemplate);
  };

  const editingPiece = editingIndex !== null ? template[editingIndex] : null;

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
          onPress={() => setPickerIndex(0)}
          className="border-subtle-border hover:bg-text/10 h-6 w-6 items-center justify-center rounded-full border">
          <Plus size={12} color="#1a1a1a" />
        </Pressable>

        {template.map((piece, index) => (
          <React.Fragment key={`piece-${index}`}>
            <PieceChip
              piece={piece}
              onPress={() => setEditingIndex(index)}
              onRemove={() => removePiece(index)}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => setPickerIndex(index + 1)}
              className="border-subtle-border hover:bg-text/10 h-6 w-6 items-center justify-center rounded-full border">
              <Plus size={12} color="#1a1a1a" />
            </Pressable>
          </React.Fragment>
        ))}
      </Row>

      {/* ADD PIECE dialog — separate from edit dialog */}
      <ConvexDialog.Root
        isOpen={pickerIndex !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setPickerIndex(null);
        }}>
        <ConvexDialog.Trigger asChild>
          <View />
        </ConvexDialog.Trigger>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="max-w-sm">
            <CloseButton onPress={() => setPickerIndex(null)} />
            <Column className="gap-3 pt-3">
              <FontText weight="medium" className="text-base">
                Add a piece
              </FontText>
              {PIECE_TYPES.map((pt) => (
                <Pressable
                  key={pt.kind}
                  accessibilityRole="button"
                  onPress={() => pickerIndex !== null && addPiece(pickerIndex, pt.kind)}
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

      {/* EDIT PIECE dialog — separate from add dialog */}
      <ConvexDialog.Root
        isOpen={editingIndex !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setEditingIndex(null);
        }}>
        <ConvexDialog.Trigger asChild>
          <View />
        </ConvexDialog.Trigger>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="max-w-md">
            <CloseButton onPress={() => setEditingIndex(null)} />
            {editingPiece && editingIndex !== null && (
              <PieceEditorContent
                piece={editingPiece}
                pieceIndex={editingIndex}
                statementPath={statementPath}
                contextVariables={contextVariables}
                definedFunctions={definedFunctions}
                entryKeysBySource={entryKeysBySource}
                onChange={(updates) => updatePiece(editingIndex, updates)}
                onSwapType={(kind) => swapPieceType(editingIndex, kind)}
                onRemove={() => removePiece(editingIndex)}
                onAdd={onAdd}
                onSetExpression={onSetExpression}
                onEditMarkdown={onEditMarkdown}
              />
            )}
          </ConvexDialog.Content>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>
    </Column>
  );
};

/** Compact chip display for a piece in the template row. */
const PieceChip = ({
  piece,
  onPress,
  onRemove,
}: {
  piece: FunctionTemplatePiece;
  onPress: () => void;
  onRemove: () => void;
}) => {
  if (piece.kind === 'text') {
    return (
      <Row className="border-subtle-border items-center rounded-full border bg-white">
        <Pressable accessibilityRole="button" onPress={onPress} className="px-2 py-1">
          <FontText className="text-sm">{piece.text || 'text'}</FontText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onRemove}
          className="hover:bg-text/10 h-5 w-5 items-center justify-center rounded-full">
          <X size={10} color="#1a1a1a" />
        </Pressable>
      </Row>
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
    <Row className="border-subtle-border bg-accent/10 items-center rounded-lg border">
      <Pressable accessibilityRole="button" onPress={onPress} className="px-2 py-1">
        <Row className="items-center gap-1">
          <FontText weight="medium" className="text-sm">
            {piece.label || 'param'}
          </FontText>
          <FontText variant="subtext" className="text-xs opacity-60">
            {typeLabel}
          </FontText>
        </Row>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={onRemove}
        className="hover:bg-text/10 h-5 w-5 items-center justify-center rounded-full">
        <X size={10} color="#1a1a1a" />
      </Pressable>
    </Row>
  );
};

/** Full editor content for a piece, shown in a dialog. */
const PieceEditorContent = ({
  piece,
  pieceIndex,
  statementPath,
  contextVariables,
  definedFunctions,
  entryKeysBySource,
  onChange,
  onSwapType,
  onRemove,
  onAdd,
  onSetExpression,
  onEditMarkdown,
}: {
  piece: FunctionTemplatePiece;
  pieceIndex: number;
  statementPath: number[];
  contextVariables: string[];
  definedFunctions?: DefinedFunction[];
  entryKeysBySource?: Record<string, string[]>;
  onChange: (updates: Partial<FunctionTemplatePiece>) => void;
  onSwapType: (kind: string) => void;
  onRemove: () => void;
  onAdd: (target: InsertTarget) => void;
  onSetExpression: (
    location: ExpressionLocation,
    expression: Expression,
    trackHistory?: boolean
  ) => void;
  onEditMarkdown?: (currentValue: string, onSave: (newValue: string) => void) => void;
}) => {
  const [showSwapMenu, setShowSwapMenu] = useState(false);

  if (piece.kind === 'text') {
    return (
      <Column className="gap-3 pt-3">
        <FontText weight="medium" className="text-base">
          Edit text
        </FontText>
        <StableTextInput
          value={piece.text ?? ''}
          onChangeText={(value: string) => onChange({ text: value })}
          placeholder="Static text"
          className="bg-text/10 rounded-lg px-3 py-2 text-sm"
        />
        <Row className="justify-between">
          <AppButton
            variant="outline"
            className="h-9 px-3"
            onPress={() => setShowSwapMenu(!showSwapMenu)}
            dropShadow={false}>
            <FontText className="text-sm">Change type</FontText>
          </AppButton>
          <AppButton variant="red" className="h-9 px-3" onPress={onRemove} dropShadow={false}>
            <FontText weight="bold" className="text-sm text-red-500">
              Remove
            </FontText>
          </AppButton>
        </Row>
        {showSwapMenu && (
          <Column className="gap-1">
            {PIECE_TYPES.map((pt) => (
              <Pressable
                key={pt.kind}
                accessibilityRole="button"
                onPress={() => {
                  onSwapType(pt.kind);
                  setShowSwapMenu(false);
                }}
                className="bg-text/5 hover:bg-text/10 rounded-lg p-2">
                <FontText className="text-sm">{pt.label}</FontText>
              </Pressable>
            ))}
          </Column>
        )}
      </Column>
    );
  }

  // Input piece editor
  const defaultExpr = piece.defaultExpression;
  const currentType =
    defaultExpr?.kind === 'StringLiteral'
      ? 'input-text'
      : defaultExpr?.kind === 'NumberLiteral'
        ? 'input-number'
        : defaultExpr?.kind === 'DropdownLiteral'
          ? 'input-dropdown'
          : 'input-blank';

  // Location for the ExpressionSocket to edit this piece's default expression
  const exprLocation: ExpressionLocation = {
    statementPath,
    slot: { kind: 'templateDefault', pieceIndex },
    expressionPath: [],
  };

  return (
    <Column className="gap-3 pt-3">
      <FontText weight="medium" className="text-base">
        Edit input
      </FontText>

      {/* Variable name */}
      <Column className="gap-1">
        <FontText variant="subtext" className="text-xs">
          Variable name
        </FontText>
        <StableTextInput
          value={piece.label ?? ''}
          onChangeText={(value: string) =>
            onChange({ label: sanitizeIdentifier(value) || 'param' })
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
          expression={defaultExpr ?? { kind: 'NothingLiteral', span: emptySpan() }}
          location={exprLocation}
          contextVariables={contextVariables}
          entryKeysBySource={entryKeysBySource}
          definedFunctions={definedFunctions}
          label="default"
          onAdd={onAdd}
          onSetExpression={onSetExpression}
          onEditMarkdown={onEditMarkdown}
        />
      </Column>

      <Row className="justify-between">
        <AppButton
          variant="outline"
          className="h-9 px-3"
          onPress={() => setShowSwapMenu(!showSwapMenu)}
          dropShadow={false}>
          <FontText className="text-sm">Change type</FontText>
        </AppButton>
        <AppButton variant="red" className="h-9 px-3" onPress={onRemove} dropShadow={false}>
          <FontText weight="bold" className="text-sm text-red-500">
            Remove
          </FontText>
        </AppButton>
      </Row>

      {showSwapMenu && (
        <Column className="gap-1">
          {PIECE_TYPES.map((pt) => (
            <Pressable
              key={pt.kind}
              accessibilityRole="button"
              onPress={() => {
                onSwapType(pt.kind);
                setShowSwapMenu(false);
              }}
              className="bg-text/5 hover:bg-text/10 rounded-lg p-2">
              <Row className="items-center justify-between">
                <FontText className="text-sm">{pt.label}</FontText>
                {pt.kind === currentType && (
                  <FontText className="text-xs opacity-50">current</FontText>
                )}
              </Row>
            </Pressable>
          ))}
        </Column>
      )}
    </Column>
  );
};

export default FunctionTemplateEditor;
