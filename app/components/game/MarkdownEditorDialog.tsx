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
} from './townSquare/townSquareUtils';
import {
    CloseButton,
    MainContent,
    ActionButtons,
    SubDialogs,
} from './markdownEditor';

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
    isPreviewSideBySide?: boolean;
    includeTitle?: boolean;
    dialogSubtext?: string;
    titleInputLabel?: string;
    titleInputPlaceholder?: string;
    requireMarkdown?: boolean;
}

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
    isPreviewSideBySide = false,
    includeTitle = false,
    dialogSubtext,
    titleInputLabel = 'Thread title',
    titleInputPlaceholder = 'Conversation topic',
    requireMarkdown = false,
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
    const [previewInputState, setPreviewInputState] = useState<Record<string, string | undefined>>({});

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
    const hasUnsavedChanges = draftBody.trim() !== (initialMarkdown?.trim() || '')
        || (includeTitle && draftTitle.trim() !== (initialTitle?.trim() || ''));
    const canSubmit = isTitleValid && isMarkdownValid && hasUnsavedChanges;

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

    const runBodyUpdate = (updater: (value: string, selection: SelectionRange) => { value: string; selection: SelectionRange }) => {
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

    const handleBold = () => runBodyUpdate((value, range) => wrapSelection(value, range, '**', '**', 'bold text'));
    const handleItalic = () => runBodyUpdate((value, range) => wrapSelection(value, range, '*', '*', 'italic text'));
    const handleLink = () => setIsLinkDialogOpen(true);
    const handleImage = () => setIsImageDialogOpen(true);
    const handleInput = () => setIsInputDialogOpen(true);
    const handleMore = () => setIsMoreDialogOpen(true);

        return (
        <>
            <ConvexDialog.Root isOpen={isOpen} onOpenChange={onOpenChange}>
                <ConvexDialog.Trigger asChild>
                    <View />
                </ConvexDialog.Trigger>
                <ConvexDialog.Portal>
                    <ConvexDialog.Overlay />
                    <ConvexDialog.Content className='h-[80vh]'>
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
                        />
                        <Row className='gap-4 justify-end pt-4 -mx-3 sm:mx-0'>
                            <ActionButtons
                                canSubmit={canSubmit}
                                submitLabel={submitLabel}
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
        </>
    );
};

export default MarkdownEditorDialog;
