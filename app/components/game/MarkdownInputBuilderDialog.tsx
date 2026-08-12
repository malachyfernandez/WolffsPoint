import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import DialogHeader from '../ui/dialog/DialogHeader';
import Column from '../layout/Column';
import Row from '../layout/Row';
import AppButton from '../ui/buttons/AppButton';
import FontText from '../ui/text/FontText';
import FontTextInput from '../ui/forms/FontTextInput';
import AppDropdown, { AppDropdownOption } from '../ui/forms/AppDropdown';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';
import { printScriptBlock } from '../../script/lang/printer';

interface MarkdownInputBuilderDialogProps {
  isOpen: boolean;
  onInsert: (scriptBlock: string) => void;
  onOpenChange: (open: boolean) => void;
  selectedText: string;
}

const INPUT_TYPE_OPTIONS: AppDropdownOption[] = [
  { value: 'TEXT', label: 'Text box' },
  { value: 'SELECT_PLAYER', label: 'Player select (all)' },
  { value: 'SELECT_PLAYER_ALIVE', label: 'Player select (alive only)' },
  { value: 'SELECT_PLAYER_DEAD', label: 'Player select (dead only)' },
  { value: 'SELECT_ROLE', label: 'Role select' },
];

/**
 * Generate a script block that creates the equivalent input via code.
 * The label is used directly as both the display label and the state key.
 */
const buildScriptForInput = (label: string, inputType: string): string => {
  switch (inputType) {
    case 'SELECT_PLAYER':
      return printScriptBlock(
        `CreateSelectInput({\n  LIST = players,\n  LABEL = "${label}",\n  NUMSELECTABLE = 1,\n});`
      );
    case 'SELECT_PLAYER_ALIVE':
      return printScriptBlock(
        `CreateSelectInput({\n  LIST = players.Filter(Item => Item.isAlive),\n  LABEL = "${label}",\n  NUMSELECTABLE = 1,\n});`
      );
    case 'SELECT_PLAYER_DEAD':
      return printScriptBlock(
        `CreateSelectInput({\n  LIST = players.Filter(Item => NOT Item.isAlive),\n  LABEL = "${label}",\n  NUMSELECTABLE = 1,\n});`
      );
    case 'SELECT_ROLE':
      return printScriptBlock(
        `CreateSelectInput({\n  LIST = roles,\n  LABEL = "${label}",\n  NUMSELECTABLE = 1,\n});`
      );
    case 'TEXT':
    default:
      return printScriptBlock(`CreateTextInput({\n  LABEL = "${label}",\n});`);
  }
};

const MarkdownInputBuilderDialog = ({
  isOpen,
  onInsert,
  onOpenChange,
  selectedText,
}: MarkdownInputBuilderDialogProps) => {
  const [label, setLabel] = useState('');
  const [inputType, setInputType] = useState('TEXT');
  const [previewState, setPreviewState] = useState<Record<string, string | undefined>>({});

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setLabel(selectedText.trim());
    setInputType('TEXT');
    setPreviewState({});
  }, [isOpen, selectedText]);

  const canSubmit = label.trim().length > 0;

  const previewMarkdown = useMemo(() => {
    if (!label.trim()) {
      return '';
    }

    return buildScriptForInput(label.trim(), inputType);
  }, [inputType, label]);

  return (
    <ConvexDialog.Root isOpen={isOpen} onOpenChange={onOpenChange}>
      <ConvexDialog.Trigger asChild>
        <View />
      </ConvexDialog.Trigger>
      <ConvexDialog.Portal>
        <ConvexDialog.Overlay />
        <ConvexDialog.Content className="max-w-3xl p-1">
          <ConvexDialog.Close
            iconProps={{ color: 'rgb(246, 238, 219)' }}
            className="bg-text-inverted/10 hover:bg-text-inverted/15 absolute right-0 top-0 z-10 h-10 w-10 rounded-full"
          />
          <DialogHeader text="Insert input" />
          <Column className="gap-4 p-5">
            <Column className="gap-1">
              <FontText weight="medium">Label</FontText>
              <FontTextInput
                className="border-subtle-border w-full rounded-xl border px-4 py-3"
                placeholder="Killing"
                value={label}
                onChangeText={setLabel}
              />
            </Column>

            <Column className="gap-1">
              <FontText weight="medium">Input type</FontText>
              <AppDropdown
                options={INPUT_TYPE_OPTIONS}
                value={inputType}
                onValueChange={setInputType}
                placeholder="Select an input type"
                triggerClassName="border-0 bg-text/10 hover:bg-text/5 rounded-xl"
                contentClassName="border-0"
                isInDialog={true}
              />
            </Column>

            <Column className="gap-2">
              <FontText weight="medium">Preview</FontText>
              <Column className="gap-2 rounded-xl bg-transparent px-0 py-0">
                {previewMarkdown ? (
                  <MarkdownRenderer
                    markdown={previewMarkdown}
                    state={previewState}
                    setState={setPreviewState}
                    isInDialog={true}
                  />
                ) : (
                  <FontText variant="subtext">Add a label to preview the input.</FontText>
                )}
              </Column>
            </Column>

            <Row className="justify-end gap-4">
              <AppButton variant="outline" className="w-32" onPress={() => onOpenChange(false)}>
                <FontText weight="medium">Cancel</FontText>
              </AppButton>
              <AppButton
                variant="filled"
                className="w-36"
                disabled={!canSubmit}
                onPress={() => {
                  if (!canSubmit) {
                    return;
                  }

                  onInsert(buildScriptForInput(label.trim(), inputType));
                  onOpenChange(false);
                }}>
                <FontText weight="medium" color="white">
                  Insert input
                </FontText>
              </AppButton>
            </Row>
          </Column>
        </ConvexDialog.Content>
      </ConvexDialog.Portal>
    </ConvexDialog.Root>
  );
};

export default MarkdownInputBuilderDialog;
