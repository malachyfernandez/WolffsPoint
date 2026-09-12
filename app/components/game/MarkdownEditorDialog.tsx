import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import DialogHeader from '../ui/dialog/DialogHeader';
import SaveHistoryPill from '../ui/dialog/SaveHistoryPill';
import SaveHistoryDialog from '../ui/dialog/SaveHistoryDialog';
import ViewOnlyPreviewModal from '../ui/dialog/ViewOnlyPreviewModal';
import Row from '../layout/Row';
import AppButton from '../ui/buttons/AppButton';
import FontText from '../ui/text/FontText';
import { Code2 } from 'lucide-react-native';
import { useUndoRedo, useCreateUndoSnapshot } from '../../../hooks/useUndoRedo';
import { useSaveHistory, SavedEntry } from '../../../hooks/useSaveHistory';
import { useKeyboardShortcuts } from '../../../hooks/useKeyboardShortcuts';
import {
  SelectionRange,
  emptySelection,
  stripMarkdownSyntax,
  wrapSelection,
  insertAtSelection,
} from './townSquare/townSquareUtils';
import { CloseButton, MainContent, ActionButtons, SubDialogs } from './markdownEditor';
import { InputOptionsProvider } from './markdownEditor/InputOptionsProvider';
import ScriptEditorDialog from '../../script/editor/ScriptEditorDialog';
import { useMarkdownRendererInputData } from '../ui/markdown/MarkdownRenderer';
import PlayerPreviewModal from './markdownEditor/PlayerPreviewModal';
import MarkdownVariableDialog from './markdownEditor/MarkdownVariableDialog';
import { createMarkdownVariableMarker } from '../../script/markdownVariables';

/** Find all `/*script ... script*\/` blocks in the markdown text. */
const findScriptBlocks = (text: string): { start: number; end: number; content: string }[] => {
  const blocks: { start: number; end: number; content: string }[] = [];
  const regex = /\/\*script\s*\n?([\s\S]*?)\n?script\*\//gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    blocks.push({
      start: match.index,
      end: match.index + match[0].length,
      content: match[1],
    });
  }
  return blocks;
};

/** Find the script block containing the cursor position, if any. */
const findScriptBlockAtCursor = (
  text: string,
  cursor: number
): { start: number; end: number; content: string } | null => {
  const blocks = findScriptBlocks(text);
  return blocks.find((block) => cursor >= block.start && cursor <= block.end) ?? null;
};

export interface MarkdownEditorDialogSubmitPayload {
  markdown: string;
  plainText: string;
  title?: string;
}

interface MarkdownEditorDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialMarkdown?: string;
  initialTitle?: string;
  onSubmit: (payload: MarkdownEditorDialogSubmitPayload) => void;
  gameId?: string;
  showInputs?: boolean;
  showScript?: boolean;
  showVariables?: boolean;
  /** When true (default), input-creating blocks are hidden in the script editor.
   *  Pass false only for editors that support player input state (role messages,
   *  morning messages). */
  hideInputs?: boolean;
  allowVoteInput?: boolean;
  isPreviewSideBySide?: boolean;
  includeTitle?: boolean;
  dialogSubtext?: string;
  titleInputLabel?: string;
  titleInputPlaceholder?: string;
  requireMarkdown?: boolean;
  centered?: boolean;
  roleName?: string;
  /** When true, shows the "Preview as Player" button. Only the role message
   *  editor should pass this — it saves the markdown and opens a preview modal
   *  that renders the message as a specific player would see it. */
  showPreviewAsPlayerOption?: boolean;
  /** Scoped key for save history storage. If omitted, save history is disabled. */
  historyKey?: string;
  /** When true, the editor is non-editable (view-only): no editing, no save pill, no Done button, just Close. */
  readOnly?: boolean;
}

const ScriptEditorWithSources = ({
  isOpen,
  onOpenChange,
  onSubmit,
  initialScriptText,
  gameId,
  hideInputs,
  allowVoteInput,
  onSaveToServer,
  historyEntries,
  historyMaxSaves,
  onClearHistory,
  renderPreviewContent,
  readOnly,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (scriptText: string) => void;
  initialScriptText?: string;
  gameId?: string;
  hideInputs?: boolean;
  allowVoteInput?: boolean;
  onSaveToServer?: (scriptText: string) => void;
  historyEntries?: SavedEntry[];
  historyMaxSaves?: number;
  onClearHistory?: () => void;
  renderPreviewContent?: (entry: SavedEntry) => React.ReactNode;
  readOnly?: boolean;
}) => {
  const { scriptSources } = useMarkdownRendererInputData();
  return (
    <ScriptEditorDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      onSubmit={onSubmit}
      sources={scriptSources}
      initialScriptText={initialScriptText}
      gameId={gameId}
      hideInputs={hideInputs}
      allowVoteInput={allowVoteInput}
      onSaveToServer={onSaveToServer}
      historyEntries={historyEntries}
      historyMaxSaves={historyMaxSaves}
      onClearHistory={onClearHistory}
      renderPreviewContent={renderPreviewContent}
      readOnly={readOnly}
    />
  );
};

const MarkdownEditorDialog = ({
  isOpen,
  onOpenChange,
  title,
  initialMarkdown = '',
  initialTitle = '',
  onSubmit,
  gameId,
  showInputs = false,
  showScript = false,
  showVariables = false,
  hideInputs = true,
  allowVoteInput = false,
  isPreviewSideBySide = false,
  includeTitle = false,
  dialogSubtext,
  titleInputLabel = 'Thread title',
  titleInputPlaceholder = 'Conversation topic',
  requireMarkdown = false,
  centered = false,
  roleName,
  showPreviewAsPlayerOption = false,
  historyKey,
  readOnly = false,
}: MarkdownEditorDialogProps) => {
  const { executeCommand } = useUndoRedo();
  const createUndoSnapshot = useCreateUndoSnapshot();
  const { history, addSave, clearHistory, maxSaves } = useSaveHistory(historyKey ?? null);

  const [activeTab, setActiveTab] = useState('editing');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [editingStartTitle, setEditingStartTitle] = useState('');
  const [editingStartText, setEditingStartText] = useState('');
  const [selection, setSelection] = useState<SelectionRange>(emptySelection);
  const [isMoreDialogOpen, setIsMoreDialogOpen] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [isInputDialogOpen, setIsInputDialogOpen] = useState(false);
  const [isVariableDialogOpen, setIsVariableDialogOpen] = useState(false);
  const [isLeaveConfirmDialogOpen, setIsLeaveConfirmDialogOpen] = useState(false);
  const [isScriptDialogOpen, setIsScriptDialogOpen] = useState(false);
  const [editingScriptBlock, setEditingScriptBlock] = useState<{
    start: number;
    end: number;
    content: string;
  } | null>(null);
  const [previewInputState, setPreviewInputState] = useState<Record<string, string | undefined>>(
    {}
  );
  const [isPlayerPreviewOpen, setIsPlayerPreviewOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [previewEntry, setPreviewEntry] = useState<SavedEntry | null>(null);

  // Sticky-enabled: once Done becomes enabled, it stays enabled (until dialog closes)
  const [hasEverBeenEnabled, setHasEverBeenEnabled] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setHasEverBeenEnabled(false);
      return;
    }

    setActiveTab('editing');
    setDraftTitle(initialTitle ?? '');
    setDraftBody(initialMarkdown ?? '');
    setEditingStartTitle(initialTitle ?? '');
    setEditingStartText(initialMarkdown ?? '');
    setSelection(emptySelection);
    setIsMoreDialogOpen(false);
    setIsLinkDialogOpen(false);
    setIsImageDialogOpen(false);
    setIsInputDialogOpen(false);
    setIsVariableDialogOpen(false);
    setIsLeaveConfirmDialogOpen(false);
    setEditingScriptBlock(null);
    setPreviewInputState({});
    setIsHistoryOpen(false);
    setPreviewEntry(null);
    setHasEverBeenEnabled(false);
  }, [initialMarkdown, initialTitle, isOpen]);

  const handleTabChange = (newTab: string) => {
    if (activeTab === 'editing' && newTab === 'preview') {
      const previousTitle = createUndoSnapshot(editingStartTitle);
      const currentTitle = createUndoSnapshot(draftTitle);
      const previousText = createUndoSnapshot(editingStartText);
      const currentText = createUndoSnapshot(draftBody);

      executeCommand({
        action: () => {
          setDraftTitle(currentTitle);
          setDraftBody(currentText);
        },
        undoAction: () => {
          setDraftTitle(previousTitle);
          setDraftBody(previousText);
        },
        description: 'Edit markdown',
      });
    } else if (activeTab === 'preview' && newTab === 'editing') {
      setEditingStartTitle(draftTitle);
      setEditingStartText(draftBody);
    }

    setActiveTab(newTab);
  };

  const isTitleValid = !includeTitle || draftTitle.trim().length > 0;
  const isMarkdownValid = !requireMarkdown || draftBody.trim().length > 0;
  const hasUnsavedChanges =
    draftBody.trim() !== (editingStartText?.trim() || '') ||
    (includeTitle && draftTitle.trim() !== (editingStartTitle?.trim() || ''));
  const isInvalid = !isTitleValid || !isMarkdownValid;

  // Sticky-enabled: once enabled, stays enabled unless invalid
  const doneEnabled = (hasUnsavedChanges || hasEverBeenEnabled) && !isInvalid;

  useEffect(() => {
    if (hasUnsavedChanges) {
      setHasEverBeenEnabled(true);
    }
  }, [hasUnsavedChanges]);

  const submitDisabledText = !isTitleValid
    ? 'No Title'
    : !isMarkdownValid
      ? 'No Text'
      : !hasUnsavedChanges
        ? 'No Changes'
        : 'No Changes';

  const handleAttemptClose = () => {
    if (hasUnsavedChanges) {
      setIsLeaveConfirmDialogOpen(true);
    } else {
      onOpenChange(false);
    }
  };

  // Intercept all dismiss attempts (overlay click, escape) to check for unsaved changes.
  const handleOpenChange = (open: boolean) => {
    if (!open && hasUnsavedChanges) {
      setIsLeaveConfirmDialogOpen(true);
    } else {
      onOpenChange(open);
    }
  };

  const handleConfirmLeave = () => {
    setIsLeaveConfirmDialogOpen(false);
    onOpenChange(false);
  };

  const selectedText = useMemo(() => {
    return draftBody.slice(selection.start, selection.end);
  }, [draftBody, selection.end, selection.start]);

  const runBodyUpdate = (
    updater: (
      value: string,
      selection: SelectionRange
    ) => { value: string; selection: SelectionRange }
  ) => {
    const result = updater(draftBody, selection);
    setDraftBody(result.value);
    setSelection(result.selection);
  };

  const handleSubmit = () => {
    if (!doneEnabled) {
      return;
    }

    onSubmit({
      markdown: draftBody.trim(),
      plainText: stripMarkdownSyntax(draftBody.trim()),
      title: includeTitle ? draftTitle.trim() : undefined,
    });
    onOpenChange(false);
  };

  // Save without closing — persists via onSubmit and adds to history
  const handleSave = () => {
    if (isInvalid) return;
    if (!hasUnsavedChanges) return;

    onSubmit({
      markdown: draftBody.trim(),
      plainText: stripMarkdownSyntax(draftBody.trim()),
      title: includeTitle ? draftTitle.trim() : undefined,
    });

    // Update the editing start so hasUnsavedChanges becomes false
    setEditingStartText(draftBody.trim());
    if (includeTitle) setEditingStartTitle(draftTitle.trim());

    // Add to save history
    if (historyKey) {
      const preview = stripMarkdownSyntax(draftBody.trim()).slice(0, 200);
      addSave(
        {
          markdown: draftBody.trim(),
          title: includeTitle ? draftTitle.trim() : undefined,
        },
        preview
      );
    }
  };

  // Replace current draft with a saved entry from history
  const handleReplaceFromHistory = (entry: SavedEntry) => {
    const savedValue = entry.value as { markdown: string; title?: string };
    setDraftBody(savedValue.markdown);
    if (includeTitle && savedValue.title !== undefined) {
      setDraftTitle(savedValue.title);
    }
    setPreviewEntry(null);
    setIsHistoryOpen(false);
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onSave: handleSave,
    onClose: handleAttemptClose,
    enabled: isOpen && !isHistoryOpen && !previewEntry,
  });

  const handlePreviewAsPlayer = () => {
    const markdownToSave = draftBody.trim();
    onSubmit({
      markdown: markdownToSave,
      plainText: stripMarkdownSyntax(markdownToSave),
      title: includeTitle ? draftTitle.trim() : undefined,
    });
    setEditingStartText(markdownToSave);
    setIsPlayerPreviewOpen(true);
  };

  const handleBold = () =>
    runBodyUpdate((value, range) => wrapSelection(value, range, '**', '**', 'bold text'));
  const handleItalic = () =>
    runBodyUpdate((value, range) => wrapSelection(value, range, '*', '*', 'italic text'));
  const handleLink = () => setIsLinkDialogOpen(true);
  const handleImage = () => setIsImageDialogOpen(true);
  const handleInput = () => setIsInputDialogOpen(true);
  const handleMore = () => setIsMoreDialogOpen(true);
  const handleScript = () => setIsScriptDialogOpen(true);
  const handleVariable = () => setIsVariableDialogOpen(true);

  // Detect if the cursor is inside a `/*script ... script*/` block.
  const cursorScriptBlock = useMemo(
    () => findScriptBlockAtCursor(draftBody, selection.start),
    [draftBody, selection.start]
  );

  const handleEditCode = () => {
    if (!cursorScriptBlock) return;
    setEditingScriptBlock({
      start: cursorScriptBlock.start,
      end: cursorScriptBlock.end,
      content: cursorScriptBlock.content,
    });
    setIsScriptDialogOpen(true);
  };

  const handleUpdateScript = (scriptText: string) => {
    if (editingScriptBlock) {
      const before = draftBody.slice(0, editingScriptBlock.start);
      const after = draftBody.slice(editingScriptBlock.end);
      const nextBody = `${before}${scriptText}${after}`;
      setDraftBody(nextBody);
      const newCursor = editingScriptBlock.start + scriptText.length;
      setSelection({ start: newCursor, end: newCursor });
      setEditingScriptBlock(null);
    } else {
      runBodyUpdate((value, range) => insertAtSelection(value, range, `\n\n${scriptText}\n\n`));
    }
    setIsScriptDialogOpen(false);
  };

  // Called by the script editor when the user presses Save or Done — inserts the
  // script into the draft AND saves the full markdown to the server (fixes the
  // double-save issue where the script editor's "Save" only updated the draft).
  const handleSaveScriptToServer = (scriptText: string) => {
    let nextBody: string;
    if (editingScriptBlock) {
      const before = draftBody.slice(0, editingScriptBlock.start);
      const after = draftBody.slice(editingScriptBlock.end);
      nextBody = `${before}${scriptText}${after}`;
      setDraftBody(nextBody);
      const newCursor = editingScriptBlock.start + scriptText.length;
      setSelection({ start: newCursor, end: newCursor });
      setEditingScriptBlock(null);
    } else {
      const result = insertAtSelection(draftBody, selection, `\n\n${scriptText}\n\n`);
      nextBody = result.value;
      setDraftBody(nextBody);
      setSelection(result.selection);
    }

    // Save to server
    onSubmit({
      markdown: nextBody.trim(),
      plainText: stripMarkdownSyntax(nextBody.trim()),
      title: includeTitle ? draftTitle.trim() : undefined,
    });
    setEditingStartText(nextBody.trim());

    // Add to shared history
    if (historyKey) {
      const preview = stripMarkdownSyntax(nextBody.trim()).slice(0, 200);
      addSave(
        {
          markdown: nextBody.trim(),
          title: includeTitle ? draftTitle.trim() : undefined,
        },
        preview
      );
    }
  };

  return (
    <>
      <ConvexDialog.Root isOpen={isOpen} onOpenChange={handleOpenChange}>
        <ConvexDialog.Trigger asChild>
          <View />
        </ConvexDialog.Trigger>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <InputOptionsProvider gameId={gameId} showInputs>
            <ConvexDialog.Content className="h-[80vh]" isSwipeable={false}>
              <CloseButton onPress={readOnly ? () => onOpenChange(false) : handleAttemptClose} />
              {historyKey && !readOnly && (
                <SaveHistoryPill
                  hasUnsavedChanges={hasUnsavedChanges}
                  isInvalid={isInvalid && hasUnsavedChanges}
                  invalidMessage={!isTitleValid ? 'Title is required' : !isMarkdownValid ? 'Text is required' : undefined}
                  onSave={handleSave}
                  onOpenHistory={() => setIsHistoryOpen(true)}
                />
              )}
              <DialogHeader text={title} subtext={dialogSubtext} />
              <MainContent
                includeTitle={includeTitle}
                titleInputLabel={titleInputLabel}
                titleInputPlaceholder={titleInputPlaceholder}
                draftTitle={draftTitle}
                draftBody={draftBody}
                isPreviewSideBySide={isPreviewSideBySide}
                activeTab={activeTab}
                showInputs={showInputs}
                previewInputState={previewInputState}
                setPreviewInputState={setPreviewInputState}
                setDraftTitle={setDraftTitle}
                setDraftBody={setDraftBody}
                setSelection={setSelection}
                onTabChange={handleTabChange}
                onBold={handleBold}
                onItalic={handleItalic}
                onLink={handleLink}
                onImage={handleImage}
                onInput={handleInput}
                onMore={handleMore}
                onScript={showScript ? handleScript : undefined}
                onVariable={showVariables ? handleVariable : undefined}
                centered={centered}
                showPreviewAsPlayer={showPreviewAsPlayerOption}
                onPreviewAsPlayer={handlePreviewAsPlayer}
                readOnly={readOnly}
              />
              <Row className="-mx-3 items-center justify-between gap-4 pt-4 sm:mx-0">
                {cursorScriptBlock && !readOnly ? (
                  <AppButton
                    variant="outline"
                    className="h-8 px-3"
                    onPress={handleEditCode}
                    dropShadow={false}>
                    <Row className="items-center gap-1.5">
                      <Code2 size={14} color="#1a1a1a" />
                      <FontText className="text-sm">Edit Code</FontText>
                    </Row>
                  </AppButton>
                ) : (
                  <View />
                )}
                {readOnly ? (
                  <Row className="gap-4 justify-end">
                    <AppButton
                      variant="filled"
                      className="w-32"
                      onPress={() => onOpenChange(false)}>
                      <FontText color="white" weight="medium">Close</FontText>
                    </AppButton>
                  </Row>
                ) : (
                  <ActionButtons
                    canSubmit={doneEnabled}
                    submitDisabledText={submitDisabledText}
                    onCancel={handleAttemptClose}
                    onSubmit={handleSubmit}
                  />
                )}
              </Row>
            </ConvexDialog.Content>
          </InputOptionsProvider>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>

      <SubDialogs
        gameId={gameId}
        showInputs={showInputs}
        selectedText={selectedText}
        isMoreDialogOpen={isMoreDialogOpen}
        setIsMoreDialogOpen={setIsMoreDialogOpen}
        isLinkDialogOpen={isLinkDialogOpen}
        setIsLinkDialogOpen={setIsLinkDialogOpen}
        isImageDialogOpen={isImageDialogOpen}
        setIsImageDialogOpen={setIsImageDialogOpen}
        isInputDialogOpen={isInputDialogOpen}
        setIsInputDialogOpen={setIsInputDialogOpen}
        isLeaveConfirmDialogOpen={isLeaveConfirmDialogOpen}
        setIsLeaveConfirmDialogOpen={setIsLeaveConfirmDialogOpen}
        runBodyUpdate={runBodyUpdate}
        onConfirmLeave={handleConfirmLeave}
        onSave={handleSubmit}
      />

      <MarkdownVariableDialog
        isOpen={isVariableDialogOpen}
        onOpenChange={setIsVariableDialogOpen}
        onInsert={(name) =>
          runBodyUpdate((value, range) =>
            insertAtSelection(value, range, createMarkdownVariableMarker(name))
          )
        }
      />

      <InputOptionsProvider gameId={gameId} showInputs>
        <ScriptEditorWithSources
          isOpen={isScriptDialogOpen}
          onOpenChange={(open) => {
            if (!open) setEditingScriptBlock(null);
            setIsScriptDialogOpen(open);
          }}
          onSubmit={handleUpdateScript}
          initialScriptText={editingScriptBlock?.content}
          gameId={gameId}
          hideInputs={hideInputs}
          allowVoteInput={allowVoteInput}
          onSaveToServer={historyKey ? handleSaveScriptToServer : undefined}
          historyEntries={historyKey ? history : undefined}
          historyMaxSaves={historyKey ? maxSaves : undefined}
          onClearHistory={historyKey ? clearHistory : undefined}
          renderPreviewContent={historyKey ? ((entry: SavedEntry) => (
            <InputOptionsProvider gameId={gameId} showInputs>
              <MainContent
                includeTitle={includeTitle}
                titleInputLabel={titleInputLabel}
                titleInputPlaceholder={titleInputPlaceholder}
                draftTitle={(entry.value as { title?: string })?.title ?? ''}
                draftBody={(entry.value as { markdown: string })?.markdown ?? ''}
                isPreviewSideBySide={isPreviewSideBySide}
                activeTab="preview"
                showInputs={showInputs}
                previewInputState={{}}
                setPreviewInputState={() => {}}
                setDraftTitle={() => {}}
                setDraftBody={() => {}}
                setSelection={() => {}}
                onTabChange={() => {}}
                onBold={() => {}}
                onItalic={() => {}}
                onLink={() => {}}
                onImage={() => {}}
                onInput={() => {}}
                onMore={() => {}}
                centered={centered}
                readOnly
              />
            </InputOptionsProvider>
          )) : undefined}
        />
      </InputOptionsProvider>

      {gameId && roleName !== undefined && (
        <PlayerPreviewModal
          isOpen={isPlayerPreviewOpen}
          onOpenChange={setIsPlayerPreviewOpen}
          gameId={gameId}
          roleName={roleName}
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
            onOpenChange={(open) => { if (!open) setPreviewEntry(null); }}
            title="Preview Saved Version"
            subtext={previewEntry ? new Date(previewEntry.savedAt).toLocaleString() : undefined}
            entry={previewEntry}
            onReplace={handleReplaceFromHistory}
          >
            {previewEntry && (
              <InputOptionsProvider gameId={gameId} showInputs>
                <MainContent
                  includeTitle={includeTitle}
                  titleInputLabel={titleInputLabel}
                  titleInputPlaceholder={titleInputPlaceholder}
                  draftTitle={(previewEntry.value as { title?: string })?.title ?? ''}
                  draftBody={(previewEntry.value as { markdown: string })?.markdown ?? ''}
                  isPreviewSideBySide={isPreviewSideBySide}
                  activeTab="preview"
                  showInputs={showInputs}
                  previewInputState={{}}
                  setPreviewInputState={() => {}}
                  setDraftTitle={() => {}}
                  setDraftBody={() => {}}
                  setSelection={() => {}}
                  onTabChange={() => {}}
                  onBold={() => {}}
                  onItalic={() => {}}
                  onLink={() => {}}
                  onImage={() => {}}
                  onInput={() => {}}
                  onMore={() => {}}
                  centered={centered}
                  readOnly
                />
              </InputOptionsProvider>
            )}
          </ViewOnlyPreviewModal>
        </>
      )}
    </>
  );
};

export default MarkdownEditorDialog;
