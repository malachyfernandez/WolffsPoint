import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import CloseButton from '../ui/dialog/CloseButton';
import Column from '../layout/Column';
import Row from '../layout/Row';
import AppButton from '../ui/buttons/AppButton';
import FontText from '../ui/text/FontText';
import FontTextInput from '../ui/forms/FontTextInput';
import DialogHeader from '../ui/dialog/DialogHeader';
import UnsavedChangesDialog from '../ui/dialog/UnsavedChangesDialog';
import TagPill, { TAG_COLORS, type TagColor } from './TagPill';
import { useValue } from 'hooks/useData';
import { getGameScopedKey } from 'utils/multiplayer';
import { useKeyboardShortcuts } from 'hooks/useKeyboardShortcuts';
import { useKeyboardShortcutHint } from 'contexts/KeyboardShortcutHintContext';

interface AddTagDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (name: string, colorName: string) => void;
  /** If provided, show existing tag names so we can avoid duplicates */
  existingNames?: string[];
  /** Edit mode: pass the tag to edit. When set, dialog acts as an editor. */
  editTag?: { name: string; color: string } | null;
  /** Called when saving edits with old name + new name + new color */
  onEdit?: (oldName: string, newName: string, colorName: string) => void;
  /** Called when deleting a tag (edit mode only) */
  onDelete?: (name: string) => void;
  /** Game ID for legacy tag-trigger cleanup on rename/delete */
  gameId?: string;
}

/**
 * Sub-modal for creating or editing a tag definition. Trigger scripts are
 * not edited here - file-backed tags are edited by opening the tag FILE
 * (name + color + trigger body live in the file editor).
 */
const AddTagDialog = ({
  isOpen,
  onOpenChange,
  onAdd,
  existingNames = [],
  editTag = null,
  onEdit,
  onDelete,
  gameId,
}: AddTagDialogProps) => {
  const { setHint } = useKeyboardShortcutHint();

  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>(TAG_COLORS[0].name);
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);

  // Legacy tag trigger scripts: { "Infected": "script...", "Dead": "..." }.
  // Only needed so renaming/deleting a legacy tag moves/cleans its trigger.
  const [tagTriggersRecord, setTagTriggersRecord] = useValue<Record<string, string>>(
    gameId ? getGameScopedKey('tagTriggers', gameId) : 'tagTriggers-noop',
    { defaultValue: {}, privacy: 'PUBLIC' }
  );
  const tagTriggers = tagTriggersRecord?.value ?? {};

  // Snapshot of the initial state when the dialog opens, used to detect
  // unsaved changes and prompt before closing.
  const [initialName, setInitialName] = useState('');
  const [initialColor, setInitialColor] = useState<string>(TAG_COLORS[0].name);

  const isEditMode = !!editTag;

  useEffect(() => {
    if (isOpen) {
      const startName = editTag ? editTag.name : '';
      const startColor = editTag ? editTag.color : TAG_COLORS[0].name;
      setName(startName);
      setSelectedColor(startColor);
      setInitialName(startName);
      setInitialColor(startColor);
      setIsLeaveConfirmOpen(false);
    }
  }, [isOpen, editTag]);

  const hasUnsavedChanges = name.trim() !== initialName.trim() || selectedColor !== initialColor;

  // Intercept all dismiss attempts (overlay click, escape, cancel button).
  // Swipe is disabled via isSwipeable={false} on the Content because HeroUI's
  // swipe animation completes before onOpenChange fires, leaving the dialog
  // stuck off-screen if we intercept the close.
  const handleAttemptClose = () => {
    if (hasUnsavedChanges) {
      setIsLeaveConfirmOpen(true);
    } else {
      onOpenChange(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && hasUnsavedChanges) {
      setIsLeaveConfirmOpen(true);
    } else {
      onOpenChange(open);
    }
  };

  const handleConfirmLeave = () => {
    setIsLeaveConfirmOpen(false);
    onOpenChange(false);
  };

  const trimmedName = name.trim();
  // In edit mode, don't count the tag's own name as a duplicate
  const namesToCheck = isEditMode
    ? existingNames.filter((n) => n.toLowerCase() !== editTag!.name.toLowerCase())
    : existingNames;
  const isDuplicate = namesToCheck.map((n) => n.toLowerCase()).includes(trimmedName.toLowerCase());
  const canSubmit = trimmedName.length > 0 && !isDuplicate;

  const color: TagColor = TAG_COLORS.find((c) => c.name === selectedColor) ?? TAG_COLORS[0];

  const handleSubmit = () => {
    if (!canSubmit) return;
    if (isEditMode && editTag) {
      onEdit?.(editTag.name, trimmedName, selectedColor);
      // Rename legacy tag trigger if the name changed (file tags carry their
      // trigger in the file - a rename doesn't move it).
      if (editTag.name !== trimmedName && tagTriggers[editTag.name]) {
        const next = { ...tagTriggers };
        next[trimmedName] = next[editTag.name];
        delete next[editTag.name];
        setTagTriggersRecord(next);
      }
    } else {
      onAdd(trimmedName, selectedColor);
    }
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (editTag) {
      onDelete?.(editTag.name);
      // Also clean up the legacy tag trigger (not needed for file tags -
      // deleting the file removes the trigger with it).
      if (tagTriggers[editTag.name]) {
        const next = { ...tagTriggers };
        delete next[editTag.name];
        setTagTriggersRecord(next);
      }
      onOpenChange(false);
    }
  };

  useKeyboardShortcuts({
    onPrimaryAction: handleSubmit,
    onClose: handleAttemptClose,
    enabled: isOpen,
  });

  return (
    <>
      {/* hidden Root: closed dialogs still render an empty View that eats a
       *  flex gap in parents like the insert picker's gap-3 column */}
      <ConvexDialog.Root className="hidden" isOpen={isOpen} onOpenChange={handleOpenChange}>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="max-w-md" isSwipeable={false}>
            <CloseButton onPress={handleAttemptClose} />
            <DialogHeader text={isEditMode ? 'Edit Tag' : 'New Tag'} />
            <Column className="gap-4 p-0 sm:p-5">
              {/* Preview */}
              <Column className="items-center gap-2">
                <TagPill label={trimmedName || 'Tag name'} color={color} maxWidth={400} />
              </Column>

              {/* Name input */}
              <Column className="gap-1">
                <FontText weight="medium">Name</FontText>
                <FontTextInput
                  autoFocus
                  selectTextOnFocus
                  placeholder="Enter tag name..."
                  variant="styled"
                  className="w-full p-2"
                  value={name}
                  onChangeText={setName}
                />
                {isDuplicate && (
                  <FontText className="text-xs">A tag with this name already exists</FontText>
                )}
              </Column>

              {/* Color picker */}
              <Column className="gap-2">
                <FontText weight="medium">Color</FontText>
                <Row className="flex-wrap gap-2">
                  {TAG_COLORS.map((c) => (
                    <PressableColorSwatch
                      key={c.name}
                      color={c}
                      selected={selectedColor === c.name}
                      onPress={() => setSelectedColor(c.name)}
                    />
                  ))}
                </Row>
              </Column>

              {/* Buttons */}
              <Row className="gap-3">
                {isEditMode ? (
                  <View style={{ width: 48, height: 48 }}>
                    <AppButton
                      className="h-full w-full items-center justify-center"
                      variant="red"
                      onPress={handleDelete}
                      dropShadow={false}>
                      <Trash2 size={16} color="rgb(185, 28, 28)" />
                    </AppButton>
                  </View>
                ) : null}
                <AppButton
                  className="h-10 flex-1"
                  variant="black"
                  onPress={handleSubmit}
                  onHoverIn={() => setHint(['enter'])}
                  onHoverOut={() => setHint(null)}
                  disabled={!canSubmit}>
                  <FontText color="white" weight="medium">
                    {isEditMode ? 'Save' : 'Create'}
                  </FontText>
                </AppButton>
                <AppButton
                  className="h-10 flex-1"
                  variant="outline"
                  onPress={handleAttemptClose}
                  onHoverIn={() => setHint(['esc'])}
                  onHoverOut={() => setHint(null)}>
                  <FontText weight="medium">Cancel</FontText>
                </AppButton>
              </Row>
            </Column>
          </ConvexDialog.Content>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>

      <UnsavedChangesDialog
        isOpen={isLeaveConfirmOpen}
        onOpenChange={setIsLeaveConfirmOpen}
        onSave={handleSubmit}
        onDiscard={handleConfirmLeave}
      />
    </>
  );
};

/** A single color swatch for the picker */
const PressableColorSwatch = ({
  color,
  selected,
  onPress,
}: {
  color: TagColor;
  selected: boolean;
  onPress: () => void;
}) => {
  return (
    <View
      className={`rounded-full ${selected ? 'ring-2 ring-offset-2' : ''}`}
      style={{
        backgroundColor: color.bg,
        width: 32,
        height: 32,
        borderWidth: selected ? 0 : 1,
        borderColor: '#0002',
      }}>
      <Pressable onPress={onPress} style={{ width: '100%', height: '100%' }} />
    </View>
  );
};

export default AddTagDialog;
