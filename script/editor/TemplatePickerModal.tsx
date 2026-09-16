import React from 'react';
import { Pressable, View } from 'react-native';
import Column from '../../components/layout/Column';
import FontText from '../../components/ui/text/FontText';
import ConvexDialog from '../../components/ui/dialog/ConvexDialog';
import { CloseButton } from '../../components/game/markdownEditor';

const PIECE_TYPES = [
  { kind: 'input-blank', label: 'Blank input', description: 'Any expression, no default' },
  { kind: 'input-text', label: 'Text input', description: 'Defaults to a text value' },
  { kind: 'input-number', label: 'Number input', description: 'Defaults to a number' },
  {
    kind: 'input-dropdown',
    label: 'Dropdown input',
    description: 'Defaults to a dropdown with options',
  },
];

interface TemplatePickerModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectNewText: () => void;
  onSelectNewInput: (pieceType: string) => void;
  onClose: () => void;
  title?: string;
}

/**
 * Picker modal for adding or swapping a template piece.
 *
 * This is a standalone ConvexDialog that is always mounted.
 * The parent controls visibility via `isOpen`.
 * When the user selects an option, the parent closes this modal
 * and opens the corresponding next modal.
 */
const TemplatePickerModal = ({
  isOpen,
  onOpenChange,
  onSelectNewText,
  onSelectNewInput,
  onClose,
  title = 'Add a piece',
}: TemplatePickerModalProps) => {
  return (
    <ConvexDialog.Root isOpen={isOpen} onOpenChange={onOpenChange}>
      <ConvexDialog.Trigger asChild>
        <View />
      </ConvexDialog.Trigger>
      <ConvexDialog.Portal>
        <ConvexDialog.Overlay />
        <ConvexDialog.Content className="max-w-sm" isSwipeable={false}>
          <CloseButton onPress={onClose} />
          <Column className="gap-3 pt-3">
            <FontText weight="medium" className="text-base">
              {title}
            </FontText>
            <Pressable
              accessibilityRole="button"
              onPress={onSelectNewText}
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
            {PIECE_TYPES.map((pt) => (
              <Pressable
                key={pt.kind}
                accessibilityRole="button"
                onPress={() => onSelectNewInput(pt.kind)}
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
  );
};

export default TemplatePickerModal;
