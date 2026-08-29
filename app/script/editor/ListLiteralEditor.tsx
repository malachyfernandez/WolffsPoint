import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { GripVertical, Pencil, Plus, X } from 'lucide-react-native';
import Column from '../../components/layout/Column';
import Row from '../../components/layout/Row';
import FontText from '../../components/ui/text/FontText';
import ConvexDialog from '../../components/ui/dialog/ConvexDialog';
import { CloseButton } from '../../components/game/markdownEditor';
import AppButton from '../../components/ui/buttons/AppButton';
import UnsavedChangesDialog from '../../components/ui/dialog/UnsavedChangesDialog';
import { StableTextInput } from './Canvas';
import type { ListLiteral } from '../lang/ast';
import { emptySpan } from '../lang/ast';

interface ListLiteralEditorProps {
  expression: ListLiteral;
  onEditItems: (next: ListLiteral) => void;
}

const ListLiteralEditor = ({ expression, onEditItems }: ListLiteralEditorProps) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);

  // Draft state for the edit dialog
  const [draftItems, setDraftItems] = useState<string[]>([]);
  const [originalItems, setOriginalItems] = useState<string[]>([]);

  // Drag-and-drop reorder state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Initialize drafts when dialog opens
  useEffect(() => {
    if (isEditDialogOpen) {
      setDraftItems([...expression.items]);
      setOriginalItems([...expression.items]);
    }
  }, [isEditDialogOpen, expression.items]);

  const hasUnsavedChanges = JSON.stringify(draftItems) !== JSON.stringify(originalItems);

  const handleRemoveItem = (index: number) => {
    setDraftItems(draftItems.filter((_, i) => i !== index));
  };

  const handleRenameItem = (index: number, newName: string) => {
    const newItems = [...draftItems];
    newItems[index] = newName;
    setDraftItems(newItems);
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const newItems = [...draftItems];
    const [moved] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, moved);
    setDraftItems(newItems);
  };

  const handleSave = () => {
    onEditItems({
      ...expression,
      items: draftItems,
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

  const handleCancelLeave = () => {
    setIsLeaveConfirmOpen(false);
  };

  const summary =
    expression.items.length === 0
      ? 'Empty list'
      : expression.items.length === 1
        ? `"${expression.items[0]}"`
        : `${expression.items.length} items`;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={() => setIsEditDialogOpen(true)}
        className="border-subtle-border flex-row items-center gap-1.5 rounded border bg-background px-2 py-1">
        <FontText className="text-sm" weight="medium">
          {summary}
        </FontText>
        <Pencil size={12} color="#1a1a1a" opacity={0.5} />
      </Pressable>

      {/* Edit items dialog */}
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
                Edit list items
              </FontText>

              {/* Items list — each row is typeable and draggable */}
              <Column className="gap-1.5">
                {draftItems.map((item, index) =>
                  React.createElement(
                    'div',
                    {
                      key: `item-${index}`,
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
                      onPress={() => handleRemoveItem(index)}
                      className="p-1">
                      <X size={14} color="#1a1a1a" />
                    </Pressable>,
                    <StableTextInput
                      value={item}
                      onChangeText={(value: string) => handleRenameItem(index, value)}
                      placeholder="Item value"
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
                  setDraftItems([...draftItems, '']);
                }}
                className="border-subtle-border hover:bg-text/10 mt-1 flex-row items-center justify-center gap-1.5 rounded-lg border border-dashed py-2">
                <Plus size={14} color="#1a1a1a" />
                <FontText className="text-sm opacity-60">Add item</FontText>
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
        onStay={handleCancelLeave}
        onLeave={handleConfirmLeave}
      />
    </>
  );
};

export default ListLiteralEditor;
