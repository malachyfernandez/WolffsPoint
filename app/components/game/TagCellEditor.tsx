import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Pencil, Plus, X } from 'lucide-react-native';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import Column from '../layout/Column';
import Row from '../layout/Row';
import AppButton from '../ui/buttons/AppButton';
import FontText from '../ui/text/FontText';
import FontTextInput from '../ui/forms/FontTextInput';
import DialogHeader from '../ui/dialog/DialogHeader';
import ShadowScrollView from '../ui/ShadowScrollView';
import UnsavedChangesDialog from '../ui/dialog/UnsavedChangesDialog';
import TagPill, { getTagColor, type TagColor } from './TagPill';
import AddTagDialog from './AddTagDialog';
import { useValue } from 'hooks/useData';
import { getGameScopedKey } from 'utils/multiplayer';
import { parseCell, encodeTags, encodeText, type ParsedCell } from 'utils/tagEncoding';

export interface TagDefinition {
  name: string;
  color: string;
}

export type TagDefinitionsData = TagDefinition[];

const getTagDefinitionsKey = (gameId: string) => getGameScopedKey('tagDefinitions', gameId);

interface TagCellEditorProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  gameId: string;
  value: string;
  onChange: (newValue: string) => void;
}

const TagCellEditor = ({ isOpen, onOpenChange, gameId, value, onChange }: TagCellEditorProps) => {
  const [tagDefs, setTagDefs] = useValue<TagDefinitionsData>(getTagDefinitionsKey(gameId), {
    defaultValue: [],
    privacy: 'PUBLIC',
  });

  const parsed: ParsedCell = useMemo(() => parseCell(value), [value]);

  const [selectedTagNames, setSelectedTagNames] = useState<string[]>([]);
  const [textValue, setTextValue] = useState('');
  const [isAddTagOpen, setIsAddTagOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagDefinition | null>(null);
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);

  // Track the initial state (snapshot when the dialog opens) so we can detect
  // unsaved changes and prompt before closing.
  const [initialSelectedTagNames, setInitialSelectedTagNames] = useState<string[]>([]);
  const [initialTextValue, setInitialTextValue] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      const initialTags = parsed.tags.map((t) => t.name);
      setSelectedTagNames(initialTags);
      setTextValue(parsed.text);
      setInitialSelectedTagNames(initialTags);
      setInitialTextValue(parsed.text);
      setIsLeaveConfirmOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const definitions = tagDefs.value ?? [];
  const isInTagMode = selectedTagNames.length > 0;

  // Detect unsaved changes by comparing current draft to the snapshot taken
  // when the dialog opened.
  const hasUnsavedChanges =
    JSON.stringify([...selectedTagNames].sort()) !==
      JSON.stringify([...initialSelectedTagNames].sort()) ||
    textValue.trim() !== initialTextValue.trim();

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

  const handleCancelLeave = () => {
    setIsLeaveConfirmOpen(false);
  };

  const toggleTag = (name: string) => {
    setSelectedTagNames((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
    if (!isInTagMode) setTextValue('');
  };

  const removeTag = (name: string) => {
    setSelectedTagNames((prev) => prev.filter((n) => n !== name));
  };

  const handleAddTagDef = (name: string, color: string) => {
    setTagDefs([...definitions, { name, color }]);
    setSelectedTagNames((prev) => [...prev, name]);
    if (!isInTagMode) setTextValue('');
  };

  const handleEditTagDef = (oldName: string, newName: string, color: string) => {
    setTagDefs(definitions.map((d) => (d.name === oldName ? { name: newName, color } : d)));
    setSelectedTagNames((prev) => prev.map((n) => (n === oldName ? newName : n)));
  };

  const handleDeleteTagDef = (name: string) => {
    setTagDefs(definitions.filter((d) => d.name !== name));
    setSelectedTagNames((prev) => prev.filter((n) => n !== name));
  };

  const handleSave = () => {
    onChange(isInTagMode ? encodeTags(selectedTagNames) : encodeText(textValue.trim()));
    onOpenChange(false);
  };

  return (
    <>
      <ConvexDialog.Root isOpen={isOpen} onOpenChange={handleOpenChange}>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="max-w-2xl" isSwipeable={false}>
            <Pressable
              onPress={handleAttemptClose}
              className="bg-text-inverted/10 hover:bg-text-inverted/15 absolute right-0 top-0 z-10 h-10 w-10 items-center justify-center rounded-full">
              <X size={18} color="rgb(246, 238, 219)" />
            </Pressable>
            <DialogHeader text="Edit Cell" />
            <Column className="gap-3 p-0 sm:p-5">
              <Row className="items-stretch gap-3">
                {/* Left: Tag sidebar */}
                <Column className="w-44 gap-2">
                  <ShadowScrollView className="border-subtle-border max-h-[240px] rounded-lg border">
                    <Column className="gap-1 p-2">
                      {definitions.length === 0 ? (
                        <FontText variant="subtext" className="px-1 py-4 text-center text-xs">
                          No tags yet
                        </FontText>
                      ) : (
                        definitions.map((def) => {
                          const color = getTagColor(def.color);
                          const isSelected = selectedTagNames.includes(def.name);
                          return (
                            <Pressable
                              key={def.name}
                              onPress={() => toggleTag(def.name)}
                              className={`rounded-lg p-1.5 ${isSelected ? 'bg-text/10' : ''}`}>
                              <Row className="items-center gap-2">
                                <View
                                  className="h-3.5 w-3.5 rounded-full"
                                  style={{ backgroundColor: color.bg }}
                                />
                                <FontText
                                  className="flex-1 text-xs"
                                  weight="medium"
                                  numberOfLines={1}
                                  ellipsizeMode="tail">
                                  {def.name}
                                </FontText>
                                {isSelected && (
                                  <FontText className="text-xs text-green-600">✓</FontText>
                                )}
                                <Pressable
                                  onPress={() => {
                                    setEditingTag(def);
                                    setIsAddTagOpen(true);
                                  }}
                                  hitSlop={6}>
                                  <Pencil
                                    size={11}
                                    color="rgb(46, 41, 37)"
                                    style={{ opacity: 0.7 }}
                                  />
                                </Pressable>
                              </Row>
                            </Pressable>
                          );
                        })
                      )}
                    </Column>
                  </ShadowScrollView>
                  <AppButton
                    variant="outline"
                    className="h-8 w-full"
                    onPress={() => {
                      setEditingTag(null);
                      setIsAddTagOpen(true);
                    }}>
                    <Row className="items-center gap-1">
                      <Plus size={13} color="rgb(46, 41, 37)" />
                      <FontText weight="medium" className="text-xs">
                        New Tag
                      </FontText>
                    </Row>
                  </AppButton>
                </Column>

                {/* Right: Editor area + buttons at bottom */}
                <Column className="flex-1 justify-between gap-2">
                  {isInTagMode ? (
                    <View className="border-subtle-border flex-row flex-wrap gap-2 rounded-lg border p-3">
                      {selectedTagNames.map((name) => {
                        const def = definitions.find((d) => d.name === name);
                        const color: TagColor = def ? getTagColor(def.color) : getTagColor('Grey');
                        return (
                          <TagPill
                            key={name}
                            label={name}
                            color={color}
                            onRemove={() => removeTag(name)}
                            maxWidth={300}
                          />
                        );
                      })}
                    </View>
                  ) : (
                    <FontTextInput
                      placeholder="Type here..."
                      variant="styled"
                      className="w-full p-2"
                      value={textValue}
                      onChangeText={setTextValue}
                      multiline
                    />
                  )}

                  <Row className="justify-end gap-2">
                    <AppButton className="h-8 w-20" variant="outline" onPress={handleAttemptClose}>
                      <FontText weight="medium" className="text-sm">
                        Cancel
                      </FontText>
                    </AppButton>
                    <AppButton className="h-8 w-20" variant="black" onPress={handleSave}>
                      <FontText color="white" weight="medium" className="text-sm">
                        Save
                      </FontText>
                    </AppButton>
                  </Row>
                </Column>
              </Row>
            </Column>
          </ConvexDialog.Content>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>

      <UnsavedChangesDialog
        isOpen={isLeaveConfirmOpen}
        onOpenChange={setIsLeaveConfirmOpen}
        onStay={handleCancelLeave}
        onLeave={handleConfirmLeave}
      />

      <AddTagDialog
        isOpen={isAddTagOpen}
        onOpenChange={(open) => {
          setIsAddTagOpen(open);
          if (!open) setEditingTag(null);
        }}
        onAdd={handleAddTagDef}
        onEdit={handleEditTagDef}
        onDelete={handleDeleteTagDef}
        editTag={editingTag}
        existingNames={definitions.map((d) => d.name)}
      />
    </>
  );
};

export default TagCellEditor;
