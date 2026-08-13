import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Pencil, Plus, X } from 'lucide-react-native';
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
  const [newOption, setNewOption] = useState('');

  // Draft state for the edit dialog
  const [draftOptions, setDraftOptions] = useState<string[]>([]);
  const [draftValue, setDraftValue] = useState('');
  const [originalOptions, setOriginalOptions] = useState<string[]>([]);
  const [originalValue, setOriginalValue] = useState('');

  // Initialize drafts when dialog opens
  useEffect(() => {
    if (isEditDialogOpen) {
      setDraftOptions([...expression.options]);
      setDraftValue(expression.value);
      setOriginalOptions([...expression.options]);
      setOriginalValue(expression.value);
      setNewOption('');
    }
  }, [isEditDialogOpen, expression.options, expression.value]);

  const hasUnsavedChanges =
    JSON.stringify(draftOptions) !== JSON.stringify(originalOptions) ||
    draftValue !== originalValue;

  const options = expression.options.map((opt) => ({ value: opt, label: opt }));

  const handleSelect = (value: string) => {
    onChange({ ...expression, value, span: emptySpan() });
  };

  const handleAddOption = () => {
    const trimmed = newOption.trim();
    if (!trimmed) return;
    setDraftOptions([...draftOptions, trimmed]);
    if (!draftValue) setDraftValue(trimmed);
    setNewOption('');
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

  const handleCancelLeave = () => {
    setIsLeaveConfirmOpen(false);
  };

  return (
    <Row className="items-center gap-1">
      <AppDropdown
        options={options}
        value={expression.value}
        onValueChange={handleSelect}
        placeholder="Select…"
        triggerClassName="min-w-24 !py-1 !px-2 text-sm"
        isInDialog
        allowUnselect={false}
      />
      <Pressable
        accessibilityRole="button"
        onPress={() => setIsEditDialogOpen(true)}
        className="p-1">
        <Pencil size={14} color="#1a1a1a" />
      </Pressable>

      {/* Edit options dialog */}
      <ConvexDialog.Root isOpen={isEditDialogOpen} onOpenChange={handleOpenChange}>
        <ConvexDialog.Trigger asChild>
          <View />
        </ConvexDialog.Trigger>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="max-w-sm" isSwipeable={!hasUnsavedChanges}>
            <CloseButton onPress={handleAttemptClose} />
            <Column className="gap-3 pt-3">
              <FontText weight="medium" className="text-base">
                Edit dropdown options
              </FontText>

              {/* Current options list */}
              {draftOptions.map((option, index) => (
                <Row key={`opt-${index}`} className="items-center gap-2">
                  <StableTextInput
                    value={option}
                    onChangeText={(value: string) => handleRenameOption(index, value)}
                    placeholder="Option name"
                    className="bg-text/10 min-w-20 flex-1 rounded-lg px-3 py-2 text-sm"
                  />
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => handleRemoveOption(index)}
                    className="p-1">
                    <X size={16} color="#1a1a1a" />
                  </Pressable>
                </Row>
              ))}

              {/* Add new option */}
              <Row className="items-center gap-2">
                <StableTextInput
                  value={newOption}
                  onChangeText={(value: string) => setNewOption(value)}
                  placeholder="New option…"
                  className="bg-text/10 min-w-20 flex-1 rounded-lg px-3 py-2 text-sm"
                />
                <Pressable
                  accessibilityRole="button"
                  onPress={handleAddOption}
                  className="border-subtle-border hover:bg-text/10 h-8 w-8 items-center justify-center rounded-full border bg-white">
                  <Plus size={14} color="#1a1a1a" />
                </Pressable>
              </Row>

              {/* Selected value indicator */}
              <FontText variant="subtext" className="text-xs">
                Selected value: "{draftValue}"
              </FontText>

              {/* Save button */}
              <Row className="justify-end">
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
    </Row>
  );
};

export default DropdownLiteralEditor;
