import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View, Pressable } from 'react-native';
import { Tabs } from 'heroui-native';
import { ScrollShadow } from 'heroui-native';
import { LinearGradient } from 'expo-linear-gradient';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import DialogHeader from '../ui/dialog/DialogHeader';
import UnsavedChangesDialog from '../ui/dialog/UnsavedChangesDialog';
import Column from '../layout/Column';
import Row from '../layout/Row';
import AppButton from '../ui/buttons/AppButton';
import DisableableButton from '../ui/buttons/DisableableButton';
import PoppinsText from '../ui/text/PoppinsText';
import PoppinsTextInput from '../ui/forms/PoppinsTextInput';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';
import TownSquareComposerToolbar from './townSquare/TownSquareComposerToolbar';
import TownSquareComposerEditorPane from './townSquare/TownSquareComposerEditorPane';
import TownSquareComposerPreviewPane from './townSquare/TownSquareComposerPreviewPane';
import ImageUploadDialog from '../ui/dialog/ImageUploadDialog';
import TownSquareLinkDialog from './townSquare/TownSquareLinkDialog';
import TownSquareMoreOptionsDialog from './townSquare/TownSquareMoreOptionsDialog';
import { useUndoRedo, useCreateUndoSnapshot } from '../../../hooks/useUndoRedo';
import {
    SelectionRange,
    applyMoreComposerAction,
    emptySelection,
    insertMarkdownImage,
    insertMarkdownLink,
    stripMarkdownSyntax,
    wrapSelection,
} from './townSquare/townSquareUtils';

interface TableMarkdownDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    submitLabel: string;
    initialMarkdown?: string;
    onSubmit: (markdown: string) => void;
}

const TableMarkdownDialog = ({ isOpen, onOpenChange, title, submitLabel, initialMarkdown = '', onSubmit }: TableMarkdownDialogProps) => {
    const { executeCommand } = useUndoRedo();
    const createUndoSnapshot = useCreateUndoSnapshot();
    
    const [activeTab, setActiveTab] = useState('editing');
    const [draftBody, setDraftBody] = useState('');
    const [editingStartText, setEditingStartText] = useState('');
    const [selection, setSelection] = useState<SelectionRange>(emptySelection);
    const [isMoreDialogOpen, setIsMoreDialogOpen] = useState(false);
    const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
    const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
    const [isLeaveConfirmDialogOpen, setIsLeaveConfirmDialogOpen] = useState(false);
    const [pendingClose, setPendingClose] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        setActiveTab('editing');
        setDraftBody(initialMarkdown ?? '');
        setEditingStartText(initialMarkdown ?? ''); // Set initial editing start text
        setSelection(emptySelection);
        setIsMoreDialogOpen(false);
        setIsLinkDialogOpen(false);
        setIsImageDialogOpen(false);
        setIsLeaveConfirmDialogOpen(false);
        setPendingClose(false);
    }, [initialMarkdown, isOpen]);

    // Handle tab changes for undo/redo tracking
    const handleTabChange = (newTab: string) => {
        if (activeTab === 'editing' && newTab === 'preview') {
            // Switching from editing to preview - create undo/redo snapshot
            const previousText = createUndoSnapshot(editingStartText);
            const currentText = createUndoSnapshot(draftBody);
            
            executeCommand({
                action: () => setDraftBody(currentText),
                undoAction: () => setDraftBody(previousText),
                description: "Edit markdown"
            });
        } else if (activeTab === 'preview' && newTab === 'editing') {
            // Switching from preview to editing - set new editing start state
            setEditingStartText(draftBody);
        }
        
        setActiveTab(newTab);
    };

    const canSubmit = draftBody.trim() !== (initialMarkdown?.trim() || '');
    const hasUnsavedChanges = canSubmit;

    const handleAttemptClose = () => {
        if (hasUnsavedChanges) {
            setIsLeaveConfirmDialogOpen(true);
            setPendingClose(true);
        } else {
            onOpenChange(false);
        }
    };

    const handleConfirmLeave = () => {
        setIsLeaveConfirmDialogOpen(false);
        setPendingClose(false);
        onOpenChange(false);
    };

    const handleCancelLeave = () => {
        setIsLeaveConfirmDialogOpen(false);
        setPendingClose(false);
    };

    const selectedText = useMemo(() => {
        return draftBody.slice(selection.start, selection.end);
    }, [draftBody, selection.end, selection.start]);

    const runBodyUpdate = (updater: (value: string, selection: SelectionRange) => { value: string; selection: SelectionRange }) => {
        const result = updater(draftBody, selection);
        setDraftBody(result.value);
        setSelection(result.selection);
    };

    return (
        <>
            <ConvexDialog.Root isOpen={isOpen} onOpenChange={onOpenChange}>
                <ConvexDialog.Trigger asChild>
                    <View />
                </ConvexDialog.Trigger>
                <ConvexDialog.Portal>
                    <ConvexDialog.Overlay />
                    <ConvexDialog.Content className='max-w-6xl p-1'>
                        <Pressable onPress={handleAttemptClose} className="absolute right-4 top-4 z-10 h-10 w-10 bg-accent-hover rounded-full items-center justify-center">
                    <PoppinsText color='rgb(246, 238, 219)' weight='bold' className='text-xl'>×</PoppinsText>
                </Pressable>
                        <DialogHeader text={title} />
                        <Column className='flex-1 pt-5 max-h-[80vh]  h-[80vh]' gap={4}>
                            <Tabs value={activeTab} onValueChange={handleTabChange} variant="secondary" className="flex-1 grow-0 pb-10">
                                <Tabs.List>
                                    <Tabs.Indicator />
                                    <Tabs.Trigger value="editing">
                                        {({ isSelected }) => (
                                            <Tabs.Label className={isSelected ? 'text-black font-medium' : 'text-gray-500'}>
                                                Editing
                                            </Tabs.Label>
                                        )}
                                    </Tabs.Trigger>
                                    <Tabs.Trigger value="preview">
                                        {({ isSelected }) => (
                                            <Tabs.Label className={isSelected ? 'text-black font-medium' : 'text-gray-500'}>
                                                Preview
                                            </Tabs.Label>
                                        )}
                                    </Tabs.Trigger>
                                </Tabs.List>
                            </Tabs>

                            <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 h-[40vh] max-h-[40vh]">
                                <Tabs.Content value="editing" className='flex-1 '>
                                    <Column gap={1}>
                                        <TownSquareComposerToolbar
                                            onBold={() => runBodyUpdate((value, range) => wrapSelection(value, range, '**', '**', 'bold text'))}
                                            onImage={() => setIsImageDialogOpen(true)}
                                            onItalic={() => runBodyUpdate((value, range) => wrapSelection(value, range, '*', '*', 'italic text'))}
                                            onLink={() => setIsLinkDialogOpen(true)}
                                            onMore={() => setIsMoreDialogOpen(true)}
                                        />
                                    </Column>
                                    <ScrollShadow LinearGradientComponent={LinearGradient} className='flex-1'>
                                        <ScrollView className='flex-1 rounded-[24px] py-4'>
                                            <TownSquareComposerEditorPane
                                                onBodyChange={setDraftBody}
                                                onSelectionChange={setSelection}
                                                value={draftBody}
                                            />
                                        </ScrollView>
                                    </ScrollShadow>
                                </Tabs.Content>

                                <Tabs.Content value="preview" className='flex-1'>
                                    <ScrollShadow LinearGradientComponent={LinearGradient} className='flex-1'>
                                        <ScrollView className='h-[40vh] max-h-[40vh] rounded-[24px] py-4'>
                                            <TownSquareComposerPreviewPane
                                                includeTitle={false}
                                                markdown={draftBody}
                                                title={''}
                                            />
                                        </ScrollView>
                                    </ScrollShadow>

                                </Tabs.Content>
                            </Tabs>

                            <Row className='justify-end gap-3 pt-1'>
                                <AppButton variant='outline' className='w-32' onPress={handleAttemptClose}>
                                    <PoppinsText weight='medium'>Cancel</PoppinsText>
                                </AppButton>
                                <DisableableButton
                                    isEnabled={canSubmit}
                                    enabledText={submitLabel}
                                    disabledText={"No Changes"}
                                    enabledVariant='filled'
                                    className='w-40'
                                    onPress={() => {
                                        onSubmit(draftBody.trim());
                                        onOpenChange(false);
                                    }}
                                />
                            </Row>
                        </Column>
                    </ConvexDialog.Content>
                </ConvexDialog.Portal>
            </ConvexDialog.Root>

            <TownSquareMoreOptionsDialog
                isOpen={isMoreDialogOpen}
                onOpenChange={setIsMoreDialogOpen}
                onSelectAction={(action) => runBodyUpdate((value, range) => applyMoreComposerAction(value, range, action))}
            />

            <TownSquareLinkDialog
                isOpen={isLinkDialogOpen}
                onInsert={(label, url) => runBodyUpdate((value, range) => insertMarkdownLink(value, range, label, url))}
                onOpenChange={setIsLinkDialogOpen}
                selectedText={selectedText}
            />

            <ImageUploadDialog
                isOpen={isImageDialogOpen}
                onOpenChange={setIsImageDialogOpen}
                onImageSelect={(imageUrl) => runBodyUpdate((value, range) => insertMarkdownImage(value, range, '', imageUrl))}
                key={isImageDialogOpen ? 'open' : 'closed'}
            />

            <UnsavedChangesDialog
                isOpen={isLeaveConfirmDialogOpen}
                onOpenChange={setIsLeaveConfirmDialogOpen}
                onStay={handleCancelLeave}
                onLeave={handleConfirmLeave}
            />
        </>
    );
};

export default TableMarkdownDialog;
