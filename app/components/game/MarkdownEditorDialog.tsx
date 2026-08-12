import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import DialogHeader from '../ui/dialog/DialogHeader';
import Row from '../layout/Row';
import AppButton from '../ui/buttons/AppButton';
import FontText from '../ui/text/FontText';
import { Code2 } from 'lucide-react-native';
import { useUndoRedo, useCreateUndoSnapshot } from '../../../hooks/useUndoRedo';
import {
  SelectionRange,
  emptySelection,
  stripMarkdownSyntax,
  wrapSelection,
  insertAtSelection,
} from './townSquare/townSquareUtils';
import { CloseButton, MainContent, ActionButtons, SubDialogs } from './markdownEditor';
import ScriptEditorDialog from '../../script/editor/ScriptEditorDialog';
import { useMarkdownRendererInputData } from '../ui/markdown/MarkdownRenderer';
import { InputOptionsProvider } from './markdownEditor/InputOptionsProvider';
import PlayerPreviewModal from './markdownEditor/PlayerPreviewModal';

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
  submitLabel: string;
  initialMarkdown?: string;
  initialTitle?: string;
  onSubmit: (payload: MarkdownEditorDialogSubmitPayload) => void;
  gameId?: string;
  showInputs?: boolean;
  showScript?: boolean;
  isPreviewSideBySide?: boolean;
  includeTitle?: boolean;
  dialogSubtext?: string;
  titleInputLabel?: string;
  titleInputPlaceholder?: string;
  requireMarkdown?: boolean;
  centered?: boolean;
  roleName?: string;
}

const ScriptEditorWithSources = ({
  isOpen,
  onOpenChange,
  onSubmit,
  initialScriptText,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (scriptText: string) => void;
  initialScriptText?: string;
}) => {
  const { scriptSources } = useMarkdownRendererInputData();
  return (
    <ScriptEditorDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      onSubmit={onSubmit}
      sources={scriptSources}
      initialScriptText={initialScriptText}
    />
  );
};

const MarkdownEditorDialog = ({
  isOpen,
  onOpenChange,
  title,
  submitLabel,
  initialMarkdown = '',
  initialTitle = '',
  onSubmit,
  gameId,
  showInputs = false,
  showScript = false,
  isPreviewSideBySide = false,
  includeTitle = false,
  dialogSubtext,
  titleInputLabel = 'Thread title',
  titleInputPlaceholder = 'Conversation topic',
  requireMarkdown = false,
  centered = false,
  roleName,
}: MarkdownEditorDialogProps) => {
  const { executeCommand } = useUndoRedo();
  const createUndoSnapshot = useCreateUndoSnapshot();

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
  const [savedMarkdownForPreview, setSavedMarkdownForPreview] = useState('');

  useEffect(() => {
    if (!isOpen) {
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
    setIsLeaveConfirmDialogOpen(false);
    setEditingScriptBlock(null);
    setPreviewInputState({});
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
    draftBody.trim() !== (initialMarkdown?.trim() || '') ||
    (includeTitle && draftTitle.trim() !== (initialTitle?.trim() || ''));
  const canSubmit = isTitleValid && isMarkdownValid && hasUnsavedChanges;

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

  const handleConfirmLeave = () => {
    setIsLeaveConfirmDialogOpen(false);
    onOpenChange(false);
  };

  const handleCancelLeave = () => {
    setIsLeaveConfirmDialogOpen(false);
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
    if (!canSubmit) {
      return;
    }

    onSubmit({
      markdown: draftBody.trim(),
      plainText: stripMarkdownSyntax(draftBody.trim()),
      title: includeTitle ? draftTitle.trim() : undefined,
    });
    onOpenChange(false);
  };

  const handlePreviewAsPlayer = () => {
    // Force save: submit the current draft, then open the preview modal
    const markdownToSave = draftBody.trim();
    onSubmit({
      markdown: markdownToSave,
      plainText: stripMarkdownSyntax(markdownToSave),
      title: includeTitle ? draftTitle.trim() : undefined,
    });
    setSavedMarkdownForPreview(markdownToSave);
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
      // Replace the existing script block in-place.
      const before = draftBody.slice(0, editingScriptBlock.start);
      const after = draftBody.slice(editingScriptBlock.end);
      const nextBody = `${before}${scriptText}${after}`;
      setDraftBody(nextBody);
      const newCursor = editingScriptBlock.start + scriptText.length;
      setSelection({ start: newCursor, end: newCursor });
      setEditingScriptBlock(null);
    } else {
      // Inserting a new script.
      runBodyUpdate((value, range) => insertAtSelection(value, range, `\n\n${scriptText}\n\n`));
    }
    setIsScriptDialogOpen(false);
  };

  return (
    <>
      <ConvexDialog.Root isOpen={isOpen} onOpenChange={onOpenChange}>
        <ConvexDialog.Trigger asChild>
          <View />
        </ConvexDialog.Trigger>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="h-[80vh]">
            <CloseButton onPress={handleAttemptClose} />
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
              centered={centered}
              showPreviewAsPlayer={findScriptBlocks(draftBody).length > 0}
              onPreviewAsPlayer={handlePreviewAsPlayer}
            />
            <Row className="-mx-3 items-center justify-between gap-4 pt-4 sm:mx-0">
              {cursorScriptBlock ? (
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
              <ActionButtons
                canSubmit={canSubmit}
                submitLabel={submitLabel}
                submitDisabledText={submitDisabledText}
                onCancel={handleAttemptClose}
                onSubmit={handleSubmit}
              />
            </Row>
          </ConvexDialog.Content>
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
        onCancelLeave={handleCancelLeave}
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
        />
      </InputOptionsProvider>

      {gameId && (
        <PlayerPreviewModal
          isOpen={isPlayerPreviewOpen}
          onOpenChange={setIsPlayerPreviewOpen}
          gameId={gameId}
          roleName={roleName}
          markdown={savedMarkdownForPreview}
        />
      )}
    </>
  );
};

export default MarkdownEditorDialog;
