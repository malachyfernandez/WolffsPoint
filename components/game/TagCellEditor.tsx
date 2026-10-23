import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Pressable, TextInput, View, ScrollView, useWindowDimensions } from 'react-native';
import { Pencil, Plus, Search } from 'lucide-react-native';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import CloseButton from '../ui/dialog/CloseButton';
import SaveHistoryPill from '../ui/dialog/SaveHistoryPill';
import SaveHistoryDialog from '../ui/dialog/SaveHistoryDialog';
import ViewOnlyPreviewModal from '../ui/dialog/ViewOnlyPreviewModal';
import { MinimizeButton, useMinimizeTarget } from '../ui/minimize';
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
import FileEditorDialog from './scriptFiles/FileEditorDialog';
import { useFileEditorHost } from './scriptFiles/FileEditorHostContext';
import { useValue } from 'hooks/useData';
import { getGameScopedKey } from 'utils/multiplayer';
import { parseCell, type ParsedCell } from 'utils/tagEncoding';
import { applyCellOp, MANUAL_SRC, type TagRef } from 'utils/cellPieces';
import {
  createTagFileSource,
  getTagMeta,
  isTagFile,
  tagFileName,
  tagFileTriggerSource,
  tagLookupFromIndex,
  TAGS_FOLDER,
} from 'utils/scriptFiles';
import { useScriptFiles } from 'hooks/useScriptFiles';
import { useSaveHistory, SavedEntry } from 'hooks/useSaveHistory';
import { useKeyboardShortcuts } from 'hooks/useKeyboardShortcuts';
import { useKeyboardShortcutHint } from 'contexts/KeyboardShortcutHintContext';

export interface TagDefinition {
  name: string;
  color: string;
  /** Set when the tag is backed by a file in `tags/` - its stable identity. */
  tagId?: string;
}

export type TagDefinitionsData = TagDefinition[];

export interface CellContext {
  playerIndex: number;
  /** null for player-level columns, 0-based day index for day columns */
  dayIndex: number | null;
  /** Column title */
  column: string;
}

const getTagDefinitionsKey = (gameId: string) => getGameScopedKey('tagDefinitions', gameId);

interface TagCellEditorProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  gameId: string;
  value: string;
  onChange: (newValue: string) => void;
  /** Context for tag triggers (player index, day index, column title) */
  cellContext?: CellContext;
  /** Called when new tags are added (for firing tag triggers) */
  onTagsAdded?: (tagRefs: (string | TagRef)[], context: CellContext) => void;
  /** Called when tags are removed (for firing tag-removed triggers) */
  onTagsRemoved?: (tagRefs: (string | TagRef)[], context: CellContext) => void;
  /** Scoped key for save history storage. If omitted, save history is disabled. */
  historyKey?: string;
  /** Label for the submit button. Defaults to "Done". */
  submitLabel?: string;
  tagsOnly?: boolean;
}

const TagCellEditor = ({
  isOpen,
  onOpenChange,
  gameId,
  value,
  onChange,
  cellContext,
  onTagsAdded,
  onTagsRemoved,
  historyKey,
  submitLabel = 'Done',
  tagsOnly = true,
}: TagCellEditorProps) => {
  const { width: windowWidth } = useWindowDimensions();
  const compact = windowWidth < 520;
  const { history, addSave, clearHistory, maxSaves } = useSaveHistory(historyKey ?? null, {
    enabled: isOpen,
  });
  const { setHint } = useKeyboardShortcutHint();
  const { targetRef, performMinimize } = useMinimizeTarget({
    title: 'Edit Tags',
    onClose: () => onOpenChange(false),
    onRestore: () => onOpenChange(true),
    pinned: () => hasUnsavedChanges,
  });
  const [tagDefs, setTagDefs] = useValue<TagDefinitionsData>(getTagDefinitionsKey(gameId), {
    defaultValue: [],
    privacy: 'PUBLIC',
  });
  const filesApi = useScriptFiles(gameId);
  const tagLookup = useMemo(
    () => (filesApi.index ? tagLookupFromIndex(filesApi.index) : undefined),
    [filesApi.index]
  );
  const parsed: ParsedCell = useMemo(() => parseCell(value), [value]);

  const [selectedTagNames, setSelectedTagNames] = useState<string[]>([]);
  const [textValue, setTextValue] = useState('');
  const [isAddTagOpen, setIsAddTagOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const searchInputRef = useRef<TextInput>(null);
  const [editingTag, setEditingTag] = useState<TagDefinition | null>(null);
  /** File-backed tags edit in the file editor (name + color + trigger body
   *  all live in the tag file) instead of the tag dialog. */
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const fileEditorHost = useFileEditorHost();
  const openTagFile = (tagId: string) =>
    fileEditorHost ? fileEditorHost.openFile(tagId) : setEditingFileId(tagId);
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [previewEntry, setPreviewEntry] = useState<SavedEntry | null>(null);

  // Track the initial state (snapshot when the dialog opens) so we can detect
  // unsaved changes and prompt before closing.
  const [initialSelectedTagNames, setInitialSelectedTagNames] = useState<string[]>([]);
  const [initialTextValue, setInitialTextValue] = useState('');

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    const initialTags = parsed.tags.map((t) => t.name);
    setSelectedTagNames(initialTags);
    setTextValue(parsed.text);
    setInitialSelectedTagNames(initialTags);
    setInitialTextValue(parsed.text);
    setIsLeaveConfirmOpen(false);
    setIsHistoryOpen(false);
    setPreviewEntry(null);
    setTagSearch('');
    // Focus after the dialog's open animation so the user can type right away.
    const timer = setTimeout(() => searchInputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // File-backed tags (tags/ folder) are ground truth; legacy tagDefinitions
  // entries remain until migrated. File tags win name conflicts.
  const definitions = useMemo<TagDefinition[]>(() => {
    const out: TagDefinition[] = [];
    const seen = new Set<string>();
    if (filesApi.index) {
      for (const file of filesApi.index.byId.values()) {
        if (!isTagFile(file)) continue;
        const meta = getTagMeta(file);
        const name = tagFileName(file);
        seen.add(name.toLowerCase());
        out.push({ name, color: meta?.color ?? 'Grey', tagId: file.id });
      }
    }
    for (const def of tagDefs.value ?? []) {
      if (seen.has(def.name.toLowerCase())) continue;
      out.push(def);
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  }, [filesApi.index, tagDefs.value]);

  const tagQuery = tagSearch.trim().toLowerCase();
  const filteredDefinitions = tagQuery
    ? definitions.filter((d) => d.name.toLowerCase().includes(tagQuery))
    : definitions;
  const isInTagMode = tagsOnly || selectedTagNames.length > 0;

  // Detect unsaved changes by comparing current draft to the snapshot taken
  // when the dialog opened.
  const hasUnsavedChanges =
    JSON.stringify([...selectedTagNames].sort()) !==
      JSON.stringify([...initialSelectedTagNames].sort()) ||
    textValue.trim() !== initialTextValue.trim();

  // Done is always pressable; an unmodified Done just closes without writing.
  const doneEnabled = true;

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

  const toggleTag = (name: string) => {
    setSelectedTagNames((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
    if (!isInTagMode) setTextValue('');
  };

  const removeTag = (name: string) => {
    setSelectedTagNames((prev) => prev.filter((n) => n !== name));
  };

  /** New tags are created as files in the pinned `tags/` folder - the file
   *  is the tag's ground truth (meta + trigger body). */
  const handleAddTagDef = (name: string, color: string) => {
    const file = filesApi.createFile(
      TAGS_FOLDER,
      filesApi.suggestName(name, TAGS_FOLDER),
      'script',
      'trigger'
    );
    if (!file) return;
    filesApi.updateFileSource(file.id, createTagFileSource(name, color));
    setSelectedTagNames((prev) => [...prev, name]);
    if (!isInTagMode) setTextValue('');
    openTagFile(file.id);
  };

  const handleEditTagDef = (oldName: string, newName: string, color: string) => {
    const def = definitions.find((d) => d.name === oldName);
    if (def?.tagId && filesApi.index) {
      // File-backed: rewrite the Tag meta header; identity (id) survives.
      const file = filesApi.index.byId.get(def.tagId);
      if (file) {
        const body = tagFileTriggerSource(file);
        filesApi.updateFileSource(file.id, createTagFileSource(newName, color, body));
      }
    } else {
      setTagDefs(
        (tagDefs.value ?? []).map((d) => (d.name === oldName ? { ...d, name: newName, color } : d))
      );
    }
    setSelectedTagNames((prev) => prev.map((n) => (n === oldName ? newName : n)));
  };

  const handleDeleteTagDef = (name: string) => {
    const def = definitions.find((d) => d.name === name);
    if (def?.tagId) {
      filesApi.deleteFile(def.tagId);
    } else {
      setTagDefs((tagDefs.value ?? []).filter((d) => d.name !== name));
    }
    setSelectedTagNames((prev) => prev.filter((n) => n !== name));
  };

  /** Resolve a selected tag name to a TagRef (id when file-backed). */
  const refForName = (name: string): TagRef => {
    const def = definitions.find((d) => d.name === name);
    return def?.tagId ? { tagId: def.tagId, name } : { name };
  };

  /**
   * Build the new cell value via provenance ops - manual edits are attributed
   * to 'manual'. Tag diffs append/remove pieces; text edits set the base.
   * Other sources' contributions (certify pieces, trigger writes) survive.
   */
  const buildSavedValue = (): { newValue: string; addedRefs: TagRef[]; removedRefs: TagRef[] } => {
    let next = value;
    const selected = new Set(selectedTagNames);
    const existingRefs = parsed.tags;
    const existingNames = new Set(existingRefs.map((t) => t.name));

    const removedRefs = existingRefs.filter((t) => !selected.has(t.name));
    const addedRefs = selectedTagNames.filter((n) => !existingNames.has(n)).map(refForName);

    for (const ref of removedRefs) {
      next = applyCellOp(
        next,
        { mode: 'remove', value: `[/TAG: "${ref.name}"/]`, source: MANUAL_SRC },
        tagLookup
      );
    }
    for (const ref of addedRefs) {
      next = applyCellOp(
        next,
        { mode: 'append', value: `[/TAG: "${ref.name}"/]`, source: MANUAL_SRC },
        tagLookup
      );
    }
    // Text edits only apply in text mode (tag-mode has no text input).
    if (!tagsOnly && selectedTagNames.length === 0 && textValue.trim() !== parsed.text.trim()) {
      next = applyCellOp(
        next,
        { mode: 'replace', value: textValue.trim(), source: MANUAL_SRC },
        tagLookup
      );
    }
    return { newValue: next, addedRefs, removedRefs };
  };

  const handleSave = () => {
    if (!hasUnsavedChanges) {
      onOpenChange(false);
      return;
    }
    const { newValue, addedRefs, removedRefs } = buildSavedValue();

    // Apply the cell change first, then fire tag triggers on top.
    // This ensures trigger scripts see the updated cell value.
    onChange(newValue);
    onOpenChange(false);

    if (cellContext) {
      if (addedRefs.length > 0 && onTagsAdded) {
        onTagsAdded(addedRefs, cellContext);
      }
      if (removedRefs.length > 0 && onTagsRemoved) {
        onTagsRemoved(removedRefs, cellContext);
      }
    }

    // Add to save history
    if (historyKey && hasUnsavedChanges) {
      const preview = isInTagMode ? selectedTagNames.join(', ') : textValue.trim().slice(0, 200);
      addSave({ value: newValue, tags: selectedTagNames, text: textValue }, preview);
    }
  };

  // Save without closing: persists via onChange and adds to history
  const handleSaveWithoutClose = () => {
    if (!hasUnsavedChanges) return;
    const { newValue, addedRefs, removedRefs } = buildSavedValue();
    onChange(newValue);

    // Update the initial snapshot so hasUnsavedChanges becomes false
    setInitialSelectedTagNames([...selectedTagNames]);
    setInitialTextValue(textValue);

    if (cellContext) {
      if (addedRefs.length > 0 && onTagsAdded) {
        onTagsAdded(addedRefs, cellContext);
      }
      if (removedRefs.length > 0 && onTagsRemoved) {
        onTagsRemoved(removedRefs, cellContext);
      }
    }

    // Add to save history
    if (historyKey) {
      const preview = isInTagMode ? selectedTagNames.join(', ') : textValue.trim().slice(0, 200);
      addSave({ value: newValue, tags: selectedTagNames, text: textValue }, preview);
    }
  };

  // Replace current draft with a saved entry from history
  const handleReplaceFromHistory = (entry: SavedEntry) => {
    const saved = entry.value as { value: string; tags: string[]; text: string };
    const savedParsed = parseCell(saved.value);
    setSelectedTagNames(savedParsed.tags.map((t) => t.name));
    setTextValue(savedParsed.text);
    setPreviewEntry(null);
    setIsHistoryOpen(false);
  };

  useKeyboardShortcuts({
    onSave: handleSaveWithoutClose,
    onClose: handleAttemptClose,
    enabled: isOpen && !isHistoryOpen && !previewEntry && !isAddTagOpen,
  });

  return (
    <>
      <ConvexDialog.Root isOpen={isOpen} onOpenChange={handleOpenChange}>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="max-w-2xl" isSwipeable={false}>
            <View ref={targetRef} className="min-h-0 flex-1">
              <CloseButton onPress={handleAttemptClose} />
              {historyKey && (
                <MinimizeButton
                  hasUnsavedChanges={hasUnsavedChanges}
                  onSave={handleSaveWithoutClose}
                  onMinimize={performMinimize}
                />
              )}
              {historyKey && (
                <SaveHistoryPill
                  hasUnsavedChanges={hasUnsavedChanges}
                  isInvalid={false}
                  onSave={handleSaveWithoutClose}
                  onOpenHistory={() => setIsHistoryOpen(true)}
                  hasMinimizeButton
                />
              )}
              <DialogHeader text="Edit Cell" />
              <Column className="gap-3 p-0 sm:px-5 sm:pb-5">
                <Row
                  className="items-stretch gap-3"
                  style={{ flexDirection: compact ? 'column' : 'row' }}>
                  {/* Left: Tag sidebar */}
                  <Column className={compact ? 'w-full gap-2' : 'w-44 gap-2'}>
                    <Row className="border-subtle-border items-center gap-1.5 rounded-lg border px-2">
                      <Search size={13} color="rgb(46, 41, 37)" style={{ opacity: 0.6 }} />
                      <FontTextInput
                        ref={searchInputRef}
                        placeholder="Search tags..."
                        className="h-8 flex-1 text-xs"
                        value={tagSearch}
                        onChangeText={setTagSearch}
                      />
                    </Row>
                    <ShadowScrollView className="border-subtle-border max-h-[240px] rounded-lg border">
                      <Column className="gap-1 p-2">
                        {filteredDefinitions.length === 0 ? (
                          <FontText variant="subtext" className="px-1 py-4 text-center text-xs">
                            {definitions.length === 0 ? 'No tags yet' : 'No matching tags'}
                          </FontText>
                        ) : (
                          filteredDefinitions.map((def) => {
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
                                  {isSelected && <FontText className="text-xs">✓</FontText>}
                                  <Pressable
                                    onPress={() => {
                                      if (def.tagId) openTagFile(def.tagId);
                                      else {
                                        setEditingTag(def);
                                        setIsAddTagOpen(true);
                                      }
                                    }}
                                    className="items-center justify-center self-stretch rounded"
                                    style={{ width: 28, marginLeft: -2 }}>
                                    <Pencil
                                      size={13}
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
                      disabled={filesApi.isLoading}
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
                        {selectedTagNames.length === 0 && (
                          <FontText variant="subtext" className="text-sm">
                            No tags selected. Choose a tag from the list.
                          </FontText>
                        )}
                        {selectedTagNames.map((name) => {
                          const def = definitions.find((d) => d.name === name);
                          const color: TagColor = def
                            ? getTagColor(def.color)
                            : getTagColor('Grey');
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
                    {tagsOnly && parsed.text && (
                      <FontText variant="subtext" className="text-xs">
                        Existing text is preserved. This column now accepts tags only.
                      </FontText>
                    )}

                    <Row className="minimize-hide flex-wrap justify-end gap-2">
                      <AppButton
                        className="h-8 w-20"
                        variant="outline"
                        onPress={handleAttemptClose}>
                        <FontText weight="medium" className="text-sm">
                          Cancel
                        </FontText>
                      </AppButton>
                      <AppButton
                        className="h-8 min-w-20 px-3"
                        variant="black"
                        onPress={handleSave}
                        disabled={!doneEnabled}>
                        <FontText color="white" weight="medium" className="text-sm">
                          {submitLabel}
                        </FontText>
                      </AppButton>
                    </Row>
                  </Column>
                </Row>
              </Column>
            </View>
          </ConvexDialog.Content>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>

      <UnsavedChangesDialog
        isOpen={isLeaveConfirmOpen}
        onOpenChange={setIsLeaveConfirmOpen}
        onSave={handleSave}
        onDiscard={handleConfirmLeave}
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
        gameId={gameId}
      />

      {editingFileId && !fileEditorHost && (
        <FileEditorDialog
          isOpen
          onOpenChange={(open) => {
            if (!open) setEditingFileId(null);
          }}
          fileId={editingFileId}
          filesApi={filesApi}
          gameId={gameId}
        />
      )}

      {historyKey && (
        <>
          <SaveHistoryDialog
            isOpen={isHistoryOpen}
            onOpenChange={setIsHistoryOpen}
            history={history}
            maxSaves={maxSaves}
            onSelectEntry={(entry) => setPreviewEntry(entry)}
            onClearHistory={clearHistory}
          />
          <ViewOnlyPreviewModal
            isOpen={previewEntry !== null}
            onOpenChange={(open) => {
              if (!open) setPreviewEntry(null);
            }}
            title="Preview Saved Cell"
            subtext={previewEntry ? new Date(previewEntry.savedAt).toLocaleString() : undefined}
            entry={previewEntry}
            onReplace={handleReplaceFromHistory}
            contentClassName="max-w-2xl">
            {previewEntry &&
              (() => {
                const savedValue = (previewEntry.value as { value: string })?.value ?? '';
                const savedParsed = parseCell(savedValue);
                if (savedParsed.tags.length > 0) {
                  return (
                    <ScrollView className="flex-1" contentContainerClassName="p-4">
                      <View className="border-subtle-border flex-row flex-wrap gap-2 rounded-lg border p-3">
                        {savedParsed.tags.map((tag) => {
                          const def = definitions.find((d) => d.name === tag.name);
                          const color: TagColor = def
                            ? getTagColor(def.color)
                            : getTagColor('Grey');
                          return (
                            <TagPill key={tag.name} label={tag.name} color={color} maxWidth={300} />
                          );
                        })}
                      </View>
                      {savedParsed.text.trim() ? (
                        <FontText className="text-text mt-3">{savedParsed.text}</FontText>
                      ) : null}
                    </ScrollView>
                  );
                }
                return (
                  <ScrollView className="flex-1" contentContainerClassName="p-4">
                    <FontText className="text-text">{savedParsed.text}</FontText>
                  </ScrollView>
                );
              })()}
          </ViewOnlyPreviewModal>
        </>
      )}
    </>
  );
};

export default TagCellEditor;
