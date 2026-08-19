import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import DialogHeader from '../ui/dialog/DialogHeader';
import Row from '../layout/Row';
import { useUndoRedo, useCreateUndoSnapshot } from '../../../hooks/useUndoRedo';
import {
  SelectionRange,
  emptySelection,
  stripMarkdownSyntax,
  wrapSelection,
  insertAtSelection,
} from './townSquare/townSquareUtils';
import { CloseButton, MainContent, ActionButtons, SubDialogs } from './markdownEditor';
import { InputOptionsProvider } from './markdownEditor/InputOptionsProvider';
import ShadowScrollView from '../ui/ShadowScrollView';
import PlayerProfilePreviewCard from './PlayerProfilePreviewCard';
import { PlayerProfile } from '../../../types/multiplayer';

interface BioEditorDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  submitLabel: string;
  initialMarkdown?: string;
  onSubmit: (markdown: string) => void;
  gameId?: string;
  /** Profile data for the full-profile preview */
  profile: PlayerProfile;
  displayName: string;
  initials: string;
  imageUrl?: string;
}

const BioEditorDialog = ({
  isOpen,
  onOpenChange,
  title,
  submitLabel,
  initialMarkdown = '',
  onSubmit,
  gameId,
  profile,
  displayName,
  initials,
  imageUrl,
}: BioEditorDialogProps) => {
  const { executeCommand } = useUndoRedo();
  const createUndoSnapshot = useCreateUndoSnapshot();

  const [activeTab, setActiveTab] = useState('editing');
  const [draftBody, setDraftBody] = useState('');
  const [editingStartText, setEditingStartText] = useState('');
  const [selection, setSelection] = useState<SelectionRange>(emptySelection);
  const [isMoreDialogOpen, setIsMoreDialogOpen] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [isInputDialogOpen, setIsInputDialogOpen] = useState(false);
  const [isLeaveConfirmDialogOpen, setIsLeaveConfirmDialogOpen] = useState(false);
  const [previewInputState, setPreviewInputState] = useState<Record<string, string | undefined>>(
    {}
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setActiveTab('editing');
    setDraftBody(initialMarkdown ?? '');
    setEditingStartText(initialMarkdown ?? '');
    setSelection(emptySelection);
    setIsMoreDialogOpen(false);
    setIsLinkDialogOpen(false);
    setIsImageDialogOpen(false);
    setIsInputDialogOpen(false);
    setIsLeaveConfirmDialogOpen(false);
    setPreviewInputState({});
  }, [initialMarkdown, isOpen]);

  const handleTabChange = (newTab: string) => {
    if (activeTab === 'editing' && newTab === 'preview') {
      const previousText = createUndoSnapshot(editingStartText);
      const currentText = createUndoSnapshot(draftBody);

      executeCommand({
        action: () => {
          setDraftBody(currentText);
        },
        undoAction: () => {
          setDraftBody(previousText);
        },
        description: 'Edit bio',
      });
    } else if (activeTab === 'preview' && newTab === 'editing') {
      setEditingStartText(draftBody);
    }

    setActiveTab(newTab);
  };

  const hasUnsavedChanges = draftBody.trim() !== (initialMarkdown?.trim() || '');
  const canSubmit = hasUnsavedChanges;

  const submitDisabledText = !hasUnsavedChanges ? 'No Changes' : 'No Changes';

  const handleAttemptClose = () => {
    if (hasUnsavedChanges) {
      setIsLeaveConfirmDialogOpen(true);
    } else {
      onOpenChange(false);
    }
  };

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

    onSubmit(draftBody.trim());
    onOpenChange(false);
  };

  const handleBold = () =>
    runBodyUpdate((value, range) => wrapSelection(value, range, '**', '**', 'bold text'));
  const handleItalic = () =>
    runBodyUpdate((value, range) => wrapSelection(value, range, '*', '*', 'italic text'));
  const handleLink = () => setIsLinkDialogOpen(true);
  const handleImage = () => setIsImageDialogOpen(true);
  const handleInput = () => setIsInputDialogOpen(true);
  const handleMore = () => setIsMoreDialogOpen(true);

  // Preview that shows the full profile card
  const renderProfilePreview = () => (
    <ShadowScrollView className="flex-1" scrollViewClassName="flex-1">
      <PlayerProfilePreviewCard
        displayName={displayName}
        bioMarkdown={draftBody}
        imageUrl={imageUrl}
        initials={initials}
        profile={{ ...profile, bioMarkdown: draftBody }}
      />
    </ShadowScrollView>
  );

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
              <CloseButton onPress={handleAttemptClose} />
              <DialogHeader text={title} />
              <MainContent
                includeTitle={false}
                titleInputLabel=""
                titleInputPlaceholder=""
                draftTitle=""
                draftBody={draftBody}
                isPreviewSideBySide={false}
                activeTab={activeTab}
                showInputs={false}
                previewInputState={previewInputState}
                setPreviewInputState={setPreviewInputState}
                setDraftTitle={() => {}}
                setDraftBody={setDraftBody}
                setSelection={setSelection}
                onTabChange={handleTabChange}
                onBold={handleBold}
                onItalic={handleItalic}
                onLink={handleLink}
                onImage={handleImage}
                onInput={handleInput}
                onMore={handleMore}
                renderPreview={renderProfilePreview}
              />
              <Row className="-mx-3 items-center justify-end gap-4 pt-4 sm:mx-0">
                <ActionButtons
                  canSubmit={canSubmit}
                  submitLabel={submitLabel}
                  submitDisabledText={submitDisabledText}
                  onCancel={handleAttemptClose}
                  onSubmit={handleSubmit}
                />
              </Row>
            </ConvexDialog.Content>
          </InputOptionsProvider>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>

      <SubDialogs
        gameId={gameId}
        showInputs={false}
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
    </>
  );
};

export default BioEditorDialog;
