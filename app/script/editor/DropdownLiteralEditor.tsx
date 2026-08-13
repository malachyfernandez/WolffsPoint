import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Pencil, Plus, X } from 'lucide-react-native';
import Column from '../../components/layout/Column';
import Row from '../../components/layout/Row';
import FontText from '../../components/ui/text/FontText';
import AppDropdown from '../../components/ui/forms/AppDropdown';
import ConvexDialog from '../../components/ui/dialog/ConvexDialog';
import { CloseButton } from '../../components/game/markdownEditor';
import AppButton from '../../components/ui/buttons/AppButton';
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
  const [newOption, setNewOption] = useState('');

  const options = expression.options.map((opt) => ({ value: opt, label: opt }));

  const handleSelect = (value: string) => {
    onChange({ ...expression, value, span: emptySpan() });
  };

  const handleAddOption = () => {
    const trimmed = newOption.trim();
    if (!trimmed) return;
    onEditOptions({
      ...expression,
      options: [...expression.options, trimmed],
      value: expression.value || trimmed,
      span: emptySpan(),
    });
    setNewOption('');
  };

  const handleRemoveOption = (index: number) => {
    const newOptions = expression.options.filter((_, i) => i !== index);
    const newValue =
      expression.value === expression.options[index] ? (newOptions[0] ?? '') : expression.value;
    onEditOptions({
      ...expression,
      options: newOptions,
      value: newValue,
      span: emptySpan(),
    });
  };

  const handleRenameOption = (index: number, newName: string) => {
    const oldName = expression.options[index];
    const newOptions = [...expression.options];
    newOptions[index] = newName;
    const newValue = expression.value === oldName ? newName : expression.value;
    onEditOptions({
      ...expression,
      options: newOptions,
      value: newValue,
      span: emptySpan(),
    });
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
      <ConvexDialog.Root
        isOpen={isEditDialogOpen}
        onOpenChange={(open: boolean) => {
          if (!open) setIsEditDialogOpen(false);
        }}>
        <ConvexDialog.Trigger asChild>
          <View />
        </ConvexDialog.Trigger>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="max-w-sm">
            <CloseButton onPress={() => setIsEditDialogOpen(false)} />
            <Column className="gap-3 pt-3">
              <FontText weight="medium" className="text-base">
                Edit dropdown options
              </FontText>

              {/* Current options list */}
              {expression.options.map((option, index) => (
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
                Selected value: "{expression.value}"
              </FontText>
            </Column>
          </ConvexDialog.Content>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>
    </Row>
  );
};

export default DropdownLiteralEditor;
