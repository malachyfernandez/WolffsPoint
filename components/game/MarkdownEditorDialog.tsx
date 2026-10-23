import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import DialogHeader from '../ui/dialog/DialogHeader';
import SaveHistoryPill from '../ui/dialog/SaveHistoryPill';
import SaveHistoryDialog from '../ui/dialog/SaveHistoryDialog';
import ViewOnlyPreviewModal from '../ui/dialog/ViewOnlyPreviewModal';
import { MinimizeButton, useMinimizeTarget } from '../ui/minimize';
import Row from '../layout/Row';
import AppButton from '../ui/buttons/AppButton';
import FontText from '../ui/text/FontText';
import { Code2 } from 'lucide-react-native';
import { useUndoRedo, useCreateUndoSnapshot } from 'hooks/useUndoRedo';
import { useSaveHistory, SavedEntry } from 'hooks/useSaveHistory';
import { useKeyboardShortcuts } from 'hooks/useKeyboardShortcuts';
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
import CellModuleScriptEditor from './scriptFiles/CellModuleScriptEditor';
import {
  useMarkdownRendererInputData,
  default as MarkdownRenderer,
} from '../ui/markdown/MarkdownRenderer';
import ShadowScrollView from '../ui/ShadowScrollView';
import Column from '../layout/Column';
import PlayerPreviewModal from './markdownEditor/PlayerPreviewModal';
import MarkdownVariableDialog from './markdownEditor/MarkdownVariableDialog';
import { createMarkdownVariableMarker } from '../../script/markdownVariables';
import type { NewspaperDividerStyle, NewspaperTitleFont } from 'types/usepaper';
import TownSquareComposerPreviewPane from './townSquare/TownSquareComposerPreviewPane';

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

/** Find the `/*file:...*\/` marker containing the cursor position, if any. */
const findFileMarkerAtCursor = (
  text: string,
  cursor: number
): { start: number; end: number } | null => {
  const regex = /\/\*file:\s*\{[\s\S]*?\}\s*\*\//g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (cursor >= match.index && cursor <= match.index + match[0].length) {
      return { start: match.index, end: match.index + match[0].length };
    }
  }
  return null;
};

export interface MarkdownEditorDialogSubmitPayload {
  markdown: string;
  plainText: string;
  title?: string;
}

export interface MarkdownEditorDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialMarkdown?: string;
  initialTitle?: string;
  onSubmit: (payload: MarkdownEditorDialogSubmitPayload) => void;
  gameId?: string;
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
   *  editor should pass this: it saves the markdown and opens a preview modal
   *  that renders the message as a specific player would see it. */
  showPreviewAsPlayerOption?: boolean;
  /** Scoped key for save history storage. If omitted, save history is disabled. */
  historyKey?: string;
  /** When true, the editor is non-editable (view-only): no editing, no save pill, no Done button, just Close. */
  readOnly?: boolean;
  /** Label for the submit button. Defaults to "Done". */
  submitLabel?: string;
  onMinimize?: () => void;
  onRestore?: () => void;
  newspaperTitleFont?: NewspaperTitleFont;
  newspaperDividerStyle?: NewspaperDividerStyle;
  /** File contexts: instead of inserting an inline `/*script*\/` island, the
   *  script button asks the host to open the file browser; `onInsert` receives
   *  the `/*file:...*\/` marker text to splice into the draft. */
  onRequestFileInsert?: (onInsert: (markerText: string) => void) => void;
  headerContent?: React.ReactNode;
  onEditSource?: (markdown: string) => void;
  onDraftChange?: (markdown: string) => void;
  initialModified?: boolean;
  onDone?: () => void;
  transformPreviewMarkdown?: (markdown: string) => string;
  draftIdentity?: string;
  fileInputNames?: string[];
  onCreateFileInput?: (onCreated: (name: string) => void) => void;
  initialSelection?: SelectionRange;
  onSelectionChange?: (selection: SelectionRange) => void;
  onOpenFileHistory?: () => void;
  draftReplacement?: { body: string; revision: number } | null;
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
  const Editor = gameId ? CellModuleScriptEditor : ScriptEditorDialog;
  return (
    <Editor
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      onSubmit={onSubmit}
      sources={scriptSources}
      initialScriptText={initialScriptText}
      gameId={gameId ?? ''}
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

/**
 * Read-only preview of a saved markdown version. Encapsulates the local state
 * needed to switch between Editing/Preview tabs and to open the script editor
 * (in read-only mode) when the cursor lands inside a `/*script ... script*\/` block.
 *
 * Rendered inside an `InputOptionsProvider` so script input rendering works.
 */
const ReadOnlyMarkdownPreview = ({
  includeTitle,
  titleInputLabel,
  titleInputPlaceholder,
  draftTitle,
  draftBody,
  isPreviewSideBySide,
  centered,
  gameId,
  hideInputs,
  allowVoteInput,
}: {
  includeTitle: boolean;
  titleInputLabel: string;
  titleInputPlaceholder: string;
  draftTitle: string;
  draftBody: string;
  isPreviewSideBySide: boolean;
  centered: boolean;
  gameId?: string;
  hideInputs?: boolean;
  allowVoteInput?: boolean;
}) => {
  const [activeTab, setActiveTab] = useState('preview');
  const [selection, setSelection] = useState<SelectionRange>(emptySelection);
  const [editingScriptBlock, setEditingScriptBlock] = useState<{
    start: number;
    end: number;
    content: string;
  } | null>(null);
  const [isScriptDialogOpen, setIsScriptDialogOpen] = useState(false);
  const [previewInputState, setPreviewInputState] = useState<Record<string, string | undefined>>(
    {}
  );

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

  return (
    <>
      <MainContent
        includeTitle={includeTitle}
        titleInputLabel={titleInputLabel}
        titleInputPlaceholder={titleInputPlaceholder}
        draftTitle={draftTitle}
        draftBody={draftBody}
        isPreviewSideBySide={isPreviewSideBySide}
        activeTab={activeTab}
        previewInputState={previewInputState}
        setPreviewInputState={setPreviewInputState}
        setDraftTitle={() => {}}
        setDraftBody={() => {}}
        setSelection={setSelection}
        onTabChange={setActiveTab}
        onBold={() => {}}
        onItalic={() => {}}
        onLink={() => {}}
        onImage={() => {}}
        onMore={() => {}}
        centered={centered}
        readOnly
      />
      {cursorScriptBlock ? (
        <Row className="pt-2">
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
        </Row>
      ) : null}
      <ScriptEditorWithSources
        isOpen={isScriptDialogOpen}
        onOpenChange={(open) => {
          if (!open) setEditingScriptBlock(null);
          setIsScriptDialogOpen(open);
        }}
        onSubmit={() => {}}
        initialScriptText={editingScriptBlock?.content}
        gameId={gameId}
        hideInputs={hideInputs}
        allowVoteInput={allowVoteInput}
        readOnly
      />
    </>
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
  submitLabel = 'Done',
  onMinimize,
  onRestore,
  newspaperTitleFont,
  newspaperDividerStyle,
  onRequestFileInsert,
  headerContent,
  onEditSource,
  onDraftChange,
  initialModified = false,
  onDone,
  transformPreviewMarkdown,
  draftIdentity,
  fileInputNames,
  onCreateFileInput,
  initialSelection,
  onSelectionChange,
  onOpenFileHistory,
  draftReplacement,
}: MarkdownEditorDialogProps) => {
  const { executeCommand } = useUndoRedo();
  const createUndoSnapshot = useCreateUndoSnapshot();
  const { history, addSave, clearHistory, maxSaves } = useSaveHistory(historyKey ?? null, {
    enabled: isOpen,
  });

  const { targetRef, performMinimize } = useMinimizeTarget({
    title,
    onClose: onMinimize ?? (() => onOpenChange(false)),
    onRestore: onRestore ?? (() => onOpenChange(true)),
    pinned: () => hasUnsavedChanges,
  });

  const [activeTab, setActiveTab] = useState('editing');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [editingStartTitle, setEditingStartTitle] = useState('');
  const [editingStartText, setEditingStartText] = useState('');
  const [selection, setSelection] = useState<SelectionRange>(emptySelection);
  const [isMoreDialogOpen, setIsMoreDialogOpen] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
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
  useEffect(() => {
    if (isOpen) onDraftChange?.(draftBody);
  }, [draftBody, isOpen, onDraftChange]);

  // Sticky-enabled: once Done becomes enabled, it stays enabled (until dialog closes)

  const [pendingInitialChanges, setPendingInitialChanges] = useState(initialModified);
  useEffect(() => {
    setPendingInitialChanges(initialModified);
  }, [initialModified, isOpen]);
  const bodyInputRef = useRef<TextInput>(null);
  const initialContent = useRef(initialMarkdown);
  initialContent.current = initialMarkdown;
  const selectionOnOpen = useRef(initialSelection);
  selectionOnOpen.current = initialSelection;
  const initializationKey = draftIdentity ?? initialMarkdown;

  useEffect(() => {
    if (draftReplacement) setDraftBody(draftReplacement.body);
  }, [draftReplacement]);

  useEffect(() => {
    if (isOpen) onSelectionChange?.(selection);
  }, [selection, isOpen, onSelectionChange]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setActiveTab('editing');
    setDraftTitle(initialTitle ?? '');
    setDraftBody(initialContent.current ?? '');
    setEditingStartTitle(initialTitle ?? '');
    setEditingStartText(initialContent.current ?? '');
    const savedSelection = selectionOnOpen.current;
    const openingSelection = savedSelection
      ? {
          start: Math.min(savedSelection.start, initialContent.current.length),
          end: Math.min(savedSelection.end, initialContent.current.length),
        }
      : undefined;
    setSelection(openingSelection ?? emptySelection);
    setIsMoreDialogOpen(false);
    setIsLinkDialogOpen(false);
    setIsImageDialogOpen(false);
    setIsVariableDialogOpen(false);
    setIsLeaveConfirmDialogOpen(false);
    setEditingScriptBlock(null);
    setPreviewInputState({});
    setIsHistoryOpen(false);
    setPreviewEntry(null);
    // Focus the body after the dialog's open animation so the user can type right away.
    const timer = readOnly
      ? null
      : setTimeout(() => {
          const input = bodyInputRef.current;
          input?.focus();
          if (!openingSelection || !input) return;
          if ('setSelectionRange' in input) {
            (input as unknown as HTMLTextAreaElement).setSelectionRange(
              openingSelection.start,
              openingSelection.end
            );
          } else {
            input.setNativeProps({ selection: openingSelection });
          }
        }, 100);
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [initializationKey, initialTitle, isOpen, readOnly]);

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
    }

    setActiveTab(newTab);
  };

  const isTitleValid = !includeTitle || draftTitle.trim().length > 0;
  const isMarkdownValid = !requireMarkdown || draftBody.trim().length > 0;
  const hasUnsavedChanges =
    draftBody.trim() !== (editingStartText?.trim() || '') ||
    (includeTitle && draftTitle.trim() !== (editingStartTitle?.trim() || '')) ||
    pendingInitialChanges;
  const isInvalid = !isTitleValid || !isMarkdownValid;

  // Done is always pressable while the draft is valid; an unmodified Done
  // just closes without writing (see handleSubmit).
  const doneEnabled = !isInvalid;

  const submitDisabledText = !isTitleValid ? 'No Title' : 'No Text';

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

    if (hasUnsavedChanges) {
      onSubmit({
        markdown: draftBody.trim(),
        plainText: stripMarkdownSyntax(draftBody.trim()),
        title: includeTitle ? draftTitle.trim() : undefined,
      });
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
    }
    onDone?.();
    onOpenChange(false);
  };

  // Save without closing: persists via onSubmit and adds to history
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
    setPendingInitialChanges(false);
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
  const handleMore = () => setIsMoreDialogOpen(true);
  const handleVariable = () => {
    // Paste/IME edits can update the DOM caret before onSelectionChange fires.
    const input = bodyInputRef.current as unknown as HTMLTextAreaElement | null;
    if (typeof input?.selectionStart === 'number') {
      setSelection({ start: input.selectionStart, end: input.selectionEnd });
    }
    setIsVariableDialogOpen(true);
  };

  // Detect if the cursor is inside a `/*script ... script*/` block.
  const cursorScriptBlock = useMemo(
    () => findScriptBlockAtCursor(draftBody, selection.start),
    [draftBody, selection.start]
  );

  // Detect if the cursor is inside a `/*file:...*/` marker.
  const cursorFileMarker = useMemo(
    () => findFileMarkerAtCursor(draftBody, selection.start),
    [draftBody, selection.start]
  );

  const handleScript = () => {
    // File contexts: inserting a script means inserting a file call.
    if (onRequestFileInsert && !cursorScriptBlock) {
      if (cursorFileMarker) {
        // Cursor on an existing file marker → re-pick replaces it.
        handleEditCode();
        return;
      }
      onRequestFileInsert((markerText) =>
        runBodyUpdate((value, range) => insertAtSelection(value, range, `\n\n${markerText}\n\n`))
      );
      return;
    }
    setIsScriptDialogOpen(true);
  };

  const handleEditCode = () => {
    if (cursorFileMarker && onRequestFileInsert) {
      const range = cursorFileMarker;
      onRequestFileInsert((markerText) => {
        const next = `${draftBody.slice(0, range.start)}${markerText}${draftBody.slice(range.end)}`;
        setDraftBody(next);
        setSelection({
          start: range.start + markerText.length,
          end: range.start + markerText.length,
        });
      });
      return;
    }
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

  // Called by the script editor when the user presses Save or Done, inserts the
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
              <View ref={targetRef} className="min-h-0 flex-1">
                <CloseButton onPress={readOnly ? () => onOpenChange(false) : handleAttemptClose} />
                {(historyKey || onOpenFileHistory) && !readOnly && (
                  <MinimizeButton
                    hasUnsavedChanges={hasUnsavedChanges}
                    onSave={handleSave}
                    onMinimize={performMinimize}
                  />
                )}
                {(historyKey || onOpenFileHistory) && !readOnly && (
                  <SaveHistoryPill
                    hasUnsavedChanges={hasUnsavedChanges}
                    isInvalid={isInvalid && hasUnsavedChanges}
                    invalidMessage={
                      !isTitleValid
                        ? 'Title is required'
                        : !isMarkdownValid
                          ? 'Text is required'
                          : undefined
                    }
                    onSave={handleSave}
                    onOpenHistory={onOpenFileHistory ?? (() => setIsHistoryOpen(true))}
                    hasMinimizeButton
                  />
                )}
                <DialogHeader text={title} subtext={dialogSubtext} />
                {headerContent}
                {onEditSource && (
                  <Row className="justify-end py-2">
                    <AppButton
                      variant="outline"
                      dropShadow={false}
                      className="h-8 px-3"
                      onPress={() => onEditSource(draftBody)}>
                      <Row className="items-center gap-2">
                        <Code2 size={14} color="rgb(46, 41, 37)" />
                        <FontText className="text-xs">Edit source</FontText>
                      </Row>
                    </AppButton>
                  </Row>
                )}
                <MainContent
                  includeTitle={includeTitle}
                  titleInputLabel={titleInputLabel}
                  titleInputPlaceholder={titleInputPlaceholder}
                  draftTitle={draftTitle}
                  draftBody={draftBody}
                  isPreviewSideBySide={isPreviewSideBySide}
                  activeTab={activeTab}
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
                  onMore={handleMore}
                  onScript={showScript ? handleScript : undefined}
                  scriptLabel={onRequestFileInsert ? 'Insert file' : 'Insert script'}
                  onVariable={showVariables ? handleVariable : undefined}
                  centered={centered}
                  showPreviewAsPlayer={showPreviewAsPlayerOption}
                  onPreviewAsPlayer={handlePreviewAsPlayer}
                  renderPreview={
                    transformPreviewMarkdown
                      ? () => (
                          <TownSquareComposerPreviewPane
                            includeTitle={false}
                            title=""
                            markdown={transformPreviewMarkdown(draftBody)}
                            markdownInputState={previewInputState}
                            setMarkdownInputState={setPreviewInputState}
                          />
                        )
                      : newspaperTitleFont
                        ? () => (
                            <Column className="min-w-0 flex-1 gap-2">
                              <ShadowScrollView
                                className="h-[52vh] flex-1"
                                scrollViewClassName="h-[52vh] flex-1 border border-subtle-border px-4 py-4">
                                <Column className="gap-3">
                                  {draftBody.trim() ? (
                                    <MarkdownRenderer
                                      markdown={draftBody.trim()}
                                      textAlign="justify"
                                      newspaperTitleFont={newspaperTitleFont}
                                      newspaperDividerStyle={newspaperDividerStyle}
                                      isInDialog
                                    />
                                  ) : (
                                    <Column className="gap-1 py-12">
                                      <FontText weight="medium">Nothing to preview yet</FontText>
                                      <FontText variant="subtext">
                                        Start typing in the Editing tab.
                                      </FontText>
                                    </Column>
                                  )}
                                </Column>
                              </ShadowScrollView>
                            </Column>
                          )
                        : undefined
                  }
                  readOnly={readOnly}
                  inputRef={bodyInputRef}
                />
                <Row className="-mx-3 items-center justify-between gap-4 pt-4 sm:mx-0">
                  {(cursorScriptBlock || cursorFileMarker) && !readOnly ? (
                    <AppButton
                      variant="outline"
                      className="h-8 px-3"
                      onPress={handleEditCode}
                      dropShadow={false}>
                      <Row className="items-center gap-1.5">
                        <Code2 size={14} color="#1a1a1a" />
                        <FontText className="text-sm">
                          {cursorFileMarker && onRequestFileInsert ? 'Change File' : 'Edit Code'}
                        </FontText>
                      </Row>
                    </AppButton>
                  ) : (
                    <View />
                  )}
                  {readOnly ? (
                    <Row className="justify-end gap-4">
                      <AppButton
                        variant="filled"
                        className="w-32"
                        onPress={() => onOpenChange(false)}>
                        <FontText color="white" weight="medium">
                          Close
                        </FontText>
                      </AppButton>
                    </Row>
                  ) : (
                    <Row className="items-center justify-end gap-2">
                      <ActionButtons
                        canSubmit={doneEnabled}
                        submitLabel={submitLabel}
                        submitDisabledText={submitDisabledText}
                        onCancel={handleAttemptClose}
                        onSubmit={handleSubmit}
                      />
                    </Row>
                  )}
                </Row>
              </View>
            </ConvexDialog.Content>
          </InputOptionsProvider>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>

      <SubDialogs
        selectedText={selectedText}
        isMoreDialogOpen={isMoreDialogOpen}
        setIsMoreDialogOpen={setIsMoreDialogOpen}
        isLinkDialogOpen={isLinkDialogOpen}
        setIsLinkDialogOpen={setIsLinkDialogOpen}
        isImageDialogOpen={isImageDialogOpen}
        setIsImageDialogOpen={setIsImageDialogOpen}
        isLeaveConfirmDialogOpen={isLeaveConfirmDialogOpen}
        setIsLeaveConfirmDialogOpen={setIsLeaveConfirmDialogOpen}
        runBodyUpdate={runBodyUpdate}
        showImageBorderOption={Boolean(newspaperTitleFont)}
        onConfirmLeave={handleConfirmLeave}
        onSave={handleSubmit}
      />

      <MarkdownVariableDialog
        isOpen={isVariableDialogOpen}
        onOpenChange={setIsVariableDialogOpen}
        inputNames={fileInputNames}
        onCreateInput={
          onCreateFileInput
            ? () =>
                onCreateFileInput((name) =>
                  runBodyUpdate((value, range) =>
                    insertAtSelection(value, range, createMarkdownVariableMarker(name))
                  )
                )
            : undefined
        }
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
          renderPreviewContent={
            historyKey
              ? (entry: SavedEntry) => (
                  <InputOptionsProvider gameId={gameId} showInputs>
                    <MainContent
                      includeTitle={includeTitle}
                      titleInputLabel={titleInputLabel}
                      titleInputPlaceholder={titleInputPlaceholder}
                      draftTitle={(entry.value as { title?: string })?.title ?? ''}
                      draftBody={(entry.value as { markdown: string })?.markdown ?? ''}
                      isPreviewSideBySide={isPreviewSideBySide}
                      activeTab="preview"
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
                      onMore={() => {}}
                      centered={centered}
                      readOnly
                    />
                  </InputOptionsProvider>
                )
              : undefined
          }
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
            onOpenChange={(open) => {
              if (!open) setPreviewEntry(null);
            }}
            title="Preview Saved Version"
            subtext={previewEntry ? new Date(previewEntry.savedAt).toLocaleString() : undefined}
            entry={previewEntry}
            onReplace={handleReplaceFromHistory}
            contentClassName="h-[80vh]">
            {previewEntry && (
              <InputOptionsProvider gameId={gameId} showInputs>
                <ReadOnlyMarkdownPreview
                  includeTitle={includeTitle}
                  titleInputLabel={titleInputLabel}
                  titleInputPlaceholder={titleInputPlaceholder}
                  draftTitle={(previewEntry.value as { title?: string })?.title ?? ''}
                  draftBody={(previewEntry.value as { markdown: string })?.markdown ?? ''}
                  isPreviewSideBySide={isPreviewSideBySide}
                  centered={centered}
                  gameId={gameId}
                  hideInputs={hideInputs}
                  allowVoteInput={allowVoteInput}
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
