import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Trash2, X } from 'lucide-react-native';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import Column from '../layout/Column';
import Row from '../layout/Row';
import AppButton from '../ui/buttons/AppButton';
import FontText from '../ui/text/FontText';
import FontTextInput from '../ui/forms/FontTextInput';
import DialogHeader from '../ui/dialog/DialogHeader';
import UnsavedChangesDialog from '../ui/dialog/UnsavedChangesDialog';
import TagPill, { TAG_COLORS, type TagColor } from './TagPill';
import ScriptEditorDialog from '../../script/editor/ScriptEditorDialog';
import { useValue, useList } from 'hooks/useData';
import { getGameScopedKey } from 'utils/multiplayer';
import type { UserTableItem, UserTableTitle } from '../../../types/playerTable';
import type { ScriptSourceData } from '../../script/runtime/sources';

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
  /** Game ID for loading/saving tag trigger scripts */
  gameId?: string;
}

/**
 * Sub-modal for creating or editing a tag definition.
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
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>(TAG_COLORS[0].name);
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);
  const [isTriggerEditorOpen, setIsTriggerEditorOpen] = useState(false);

  // Tag trigger scripts: { "Infected": "script...", "Dead": "..." }
  // Each script can contain OnTagAdded and OnTagRemoved blocks.
  const [tagTriggersRecord, setTagTriggersRecord] = useValue<Record<string, string>>(
    gameId ? getGameScopedKey('tagTriggers', gameId) : 'tagTriggers-noop',
    { defaultValue: {}, privacy: 'PUBLIC' }
  );
  const tagTriggers = tagTriggersRecord?.value ?? {};

  // Load user table title + players so the ScriptEditorDialog can show
  // extra columns in UpdateCell and provide proper script globals.
  const [userTableTitle] = useList<UserTableTitle>('userTableTitle', gameId ?? '', {
    privacy: 'PUBLIC',
  });
  const [userTable] = useList<UserTableItem[]>('userTable', gameId ?? '', {
    privacy: 'PUBLIC',
  });
  const [morningMessagesList] = useList<Record<string, string[]>>(
    'morningMessagesList',
    gameId ?? '',
    { privacy: 'PUBLIC' }
  );

  const scriptSources = useMemo<ScriptSourceData>(
    () => ({
      capability: 'operator',
      players: userTable?.value ?? [],
      userTableTitle: userTableTitle?.value,
      morningMessagesList: morningMessagesList?.value,
    }),
    [userTable?.value, userTableTitle?.value, morningMessagesList?.value]
  );

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
      // Rename tag trigger if the name changed
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
      // Also clean up the tag trigger
      if (tagTriggers[editTag.name]) {
        const next = { ...tagTriggers };
        delete next[editTag.name];
        setTagTriggersRecord(next);
      }
      onOpenChange(false);
    }
  };

  return (
    <>
      <ConvexDialog.Root isOpen={isOpen} onOpenChange={handleOpenChange}>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="max-w-md" isSwipeable={false}>
            <Pressable
              onPress={handleAttemptClose}
              className="bg-text-inverted/10 hover:bg-text-inverted/15 absolute right-0 top-0 z-10 h-10 w-10 items-center justify-center rounded-full">
              <X size={18} color="rgb(246, 238, 219)" />
            </Pressable>
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
                  placeholder="Enter tag name..."
                  variant="styled"
                  className="w-full p-2"
                  value={name}
                  onChangeText={setName}
                />
                {isDuplicate && (
                  <FontText className="text-xs text-red-500">
                    A tag with this name already exists
                  </FontText>
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

              {/* Trigger script (edit mode only) */}
              {isEditMode && editTag && gameId && (
                <Column className="gap-2">
                  <Row className="gap-2">
                    <AppButton
                      variant="outline"
                      className="h-9 px-4"
                      onPress={() => setIsTriggerEditorOpen(true)}>
                      <FontText weight="medium" className="text-sm">
                        {tagTriggers[editTag.name]?.trim()
                          ? 'Edit Trigger Script'
                          : 'Add Trigger Script'}
                      </FontText>
                    </AppButton>
                    {tagTriggers[editTag.name]?.trim() && (
                      <AppButton
                        variant="outline"
                        className="h-9 px-4"
                        onPress={() => {
                          const next = { ...tagTriggers };
                          delete next[editTag.name];
                          setTagTriggersRecord(next);
                        }}>
                        <FontText weight="medium" className="text-sm text-red-500">
                          Remove
                        </FontText>
                      </AppButton>
                    )}
                  </Row>
                  {/* Script preview when a trigger exists */}
                  {tagTriggers[editTag.name]?.trim() && (
                    <View className="bg-text/5 max-h-32 overflow-hidden rounded-lg p-2">
                      <FontText className="text-xs opacity-60" style={{ fontFamily: 'monospace' }}>
                        {tagTriggers[editTag.name].slice(0, 500)}
                        {tagTriggers[editTag.name].length > 500 ? '…' : ''}
                      </FontText>
                    </View>
                  )}
                </Column>
              )}

              {/* Buttons */}
              <Row className="gap-3">
                {isEditMode ? (
                  <View style={{ width: 48, height: 48 }}>
                    <AppButton
                      className="h-full w-full items-center justify-center"
                      variant="red"
                      onPress={handleDelete}
                      dropShadow={false}>
                      <Trash2 size={16} color="#EF4444" />
                    </AppButton>
                  </View>
                ) : null}
                <AppButton
                  className="h-10 flex-1"
                  variant="black"
                  onPress={handleSubmit}
                  disabled={!canSubmit}>
                  <FontText color="white" weight="medium">
                    {isEditMode ? 'Save' : 'Create'}
                  </FontText>
                </AppButton>
                <AppButton className="h-10 flex-1" variant="outline" onPress={handleAttemptClose}>
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

      {isEditMode && editTag && gameId && (
        <ScriptEditorDialog
          isOpen={isTriggerEditorOpen}
          onOpenChange={setIsTriggerEditorOpen}
          title="Tag Trigger Script"
          initialScriptText={tagTriggers[editTag.name] ?? ''}
          sources={scriptSources}
          hideInputs
          isTriggerContext
          gameId={gameId}
          onSubmit={(scriptText) => {
            const next = { ...tagTriggers };
            if (scriptText.trim()) {
              next[editTag.name] = scriptText;
            } else {
              delete next[editTag.name];
            }
            setTagTriggersRecord(next);
          }}
        />
      )}
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
