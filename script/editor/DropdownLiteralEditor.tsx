import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { GripVertical, Pencil, Plus, X } from 'lucide-react-native';
import Column from '../../components/layout/Column';
import Row from '../../components/layout/Row';
import FontText from '../../components/ui/text/FontText';
import AppDropdown from '../../components/ui/forms/AppDropdown';
import ConvexDialog from '../../components/ui/dialog/ConvexDialog';
import { CloseButton } from '../../components/game/markdownEditor';
import AppButton from '../../components/ui/buttons/AppButton';
import UnsavedChangesDialog from '../../components/ui/dialog/UnsavedChangesDialog';
import { StableTextInput } from './Canvas';
import type { DropdownLiteral } from '../lang/ast';
import { emptySpan } from '../lang/ast';

interface DropdownLiteralEditorProps {
  expression: DropdownLiteral;
  onChange: (next: DropdownLiteral) => void;
  onEditOptions: (next: DropdownLiteral) => void;
}

const DropdownLiteralEditor = ({
  expression,
  onChange,
  onEditOptions,
}: DropdownLiteralEditorProps) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);

  // Draft state for the edit dialog
  const [draftOptions, setDraftOptions] = useState<string[]>([]);
  const [draftValue, setDraftValue] = useState('');
  const [originalOptions, setOriginalOptions] = useState<string[]>([]);
  const [originalValue, setOriginalValue] = useState('');

  // Drag-and-drop reorder state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Initialize drafts when dialog opens
  useEffect(() => {
    if (isEditDialogOpen) {
      setDraftOptions([...expression.options]);
      setDraftValue(expression.value);
      setOriginalOptions([...expression.options]);
      setOriginalValue(expression.value);
    }
  }, [isEditDialogOpen, expression.options, expression.value]);

  const hasUnsavedChanges =
    JSON.stringify(draftOptions) !== JSON.stringify(originalOptions) ||
    draftValue !== originalValue;

  const options = expression.options.map((opt) => ({ value: opt, label: opt }));

  const handleSelect = (value: string) => {
    onChange({ ...expression, value, span: emptySpan() });
  };

  const handleRemoveOption = (index: number) => {
    const newOptions = draftOptions.filter((_, i) => i !== index);
    const newValue = draftValue === draftOptions[index] ? (newOptions[0] ?? '') : draftValue;
    setDraftOptions(newOptions);
    setDraftValue(newValue);
  };

  const handleRenameOption = (index: number, newName: string) => {
    const oldName = draftOptions[index];
    const newOptions = [...draftOptions];
    newOptions[index] = newName;
    const newValue = draftValue === oldName ? newName : draftValue;
    setDraftOptions(newOptions);
    setDraftValue(newValue);
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const newOptions = [...draftOptions];
    const [moved] = newOptions.splice(fromIndex, 1);
    newOptions.splice(toIndex, 0, moved);
    setDraftOptions(newOptions);
  };

  const handleSave = () => {
    onEditOptions({
      ...expression,
      options: draftOptions,
      value: draftValue,
      span: emptySpan(),
    });
    setIsEditDialogOpen(false);
  };

  const handleAttemptClose = () => {
    if (hasUnsavedChanges) {
      setIsLeaveConfirmOpen(true);
    } else {
      setIsEditDialogOpen(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && hasUnsavedChanges) {
      setIsLeaveConfirmOpen(true);
    } else if (!open) {
      setIsEditDialogOpen(false);
    }
  };

  const handleConfirmLeave = () => {
    setIsLeaveConfirmOpen(false);
    setIsEditDialogOpen(false);
  };

  return (
    <>
      <AppDropdown
        options={options}
        value={expression.value}
        onValueChange={handleSelect}
        placeholder="Select…"
        triggerClassName="min-w-24 !py-1 !px-2 text-sm"
        isInDialog
        allowUnselect={false}
        onFooterPress={() => setIsEditDialogOpen(true)}
        footer={
          <Row className="border-subtle-border mt-1 flex-row items-center justify-center gap-1.5 border-t pb-2 pt-2">
            <Pencil size={12} color="#1a1a1a" />
            <FontText className="text-xs opacity-60">Edit options</FontText>
          </Row>
        }
      />

      {/* Edit options dialog */}
      <ConvexDialog.Root isOpen={isEditDialogOpen} onOpenChange={handleOpenChange}>
        <ConvexDialog.Trigger asChild>
          <View />
        </ConvexDialog.Trigger>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="max-w-sm" isSwipeable={!hasUnsavedChanges}>
            <CloseButton onPress={handleAttemptClose} />
            <Column className="gap-2 pt-3">
              <FontText weight="medium" className="text-base">
                Edit dropdown options
              </FontText>

              {/* Options list — each row is typeable and draggable */}
              <Column className="gap-1.5">
                {draftOptions.map((option, index) =>
                  React.createElement(
                    'div',
                    {
                      key: `opt-${index}`,
                      className: `flex flex-row items-center gap-1.5 rounded-lg ${
                        dragOverIndex === index ? 'bg-text/10' : ''
                      }`,
                      onDragEnter: () => setDragOverIndex(index),
                      onDragOver: (e: React.DragEvent) => {
                        e.preventDefault();
                        setDragOverIndex(index);
                      },
                      onDragLeave: () => setDragOverIndex((prev) => (prev === index ? null : prev)),
                      onDrop: () => {
                        if (dragIndex !== null) handleReorder(dragIndex, index);
                        setDragIndex(null);
                        setDragOverIndex(null);
                      },
                    },
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => handleRemoveOption(index)}
                      className="p-1">
                      <X size={14} color="#1a1a1a" />
                    </Pressable>,
                    <StableTextInput
                      value={option}
                      onChangeText={(value: string) => handleRenameOption(index, value)}
                      placeholder="Option name"
                      className="bg-text/10 min-w-20 flex-1 rounded-lg px-3 py-2 text-sm"
                    />,
                    React.createElement(
                      'div',
                      {
                        draggable: true,
                        onDragStart: () => setDragIndex(index),
                        onDragEnd: () => {
                          setDragIndex(null);
                          setDragOverIndex(null);
                        },
                        className: 'cursor-grab active:cursor-grabbing p-1',
                      },
                      <GripVertical size={14} color="#1a1a1a" opacity={0.4} />
                    )
                  )
                )}
              </Column>

              {/* Add button — press first, then type */}
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setDraftOptions([...draftOptions, '']);
                }}
                className="border-subtle-border hover:bg-text/10 mt-1 flex-row items-center justify-center gap-1.5 rounded-lg border border-dashed py-2">
                <Plus size={14} color="#1a1a1a" />
                <FontText className="text-sm opacity-60">Add option</FontText>
              </Pressable>

              {/* Save button */}
              <Row className="justify-end pt-1">
                <AppButton
                  variant="filled"
                  className="h-9 px-4"
                  onPress={handleSave}
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

      {/* Unsaved changes confirmation */}
      <UnsavedChangesDialog
        isOpen={isLeaveConfirmOpen}
        onOpenChange={setIsLeaveConfirmOpen}
        onSave={handleSave}
        onDiscard={handleConfirmLeave}
      />
    </>
  );
};

export default DropdownLiteralEditor;
