import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Tabs } from 'heroui-native';
import { ScrollShadow } from 'heroui-native';
import { LinearGradient } from 'expo-linear-gradient';
import ConvexDialog from '../../ui/dialog/ConvexDialog';
import DialogHeader from '../../ui/dialog/DialogHeader';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import AppButton from '../../ui/buttons/AppButton';
import PoppinsText from '../../ui/text/PoppinsText';
import PoppinsTextInput from '../../ui/forms/PoppinsTextInput';
import TownSquareComposerEditorPane from './TownSquareComposerEditorPane';
import TownSquareComposerPreviewPane from './TownSquareComposerPreviewPane';
import TownSquareComposerToolbar from './TownSquareComposerToolbar';
import ImageUploadDialog from '../../ui/dialog/ImageUploadDialog';
import TownSquareLinkDialog from './TownSquareLinkDialog';
import TownSquareMoreOptionsDialog from './TownSquareMoreOptionsDialog';
import {
    ComposerSubmitPayload,
    SelectionRange,
    applyMoreComposerAction,
    emptySelection,
    insertMarkdownImage,
    insertMarkdownLink,
    stripMarkdownSyntax,
    wrapSelection,
} from './townSquareUtils';

interface TownSquareComposerDialogProps {
    includeTitle: boolean;
    initialBody?: string;
    initialTitle?: string;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (payload: ComposerSubmitPayload) => void;
    submitLabel: string;
    targetLabel?: string;
    title: string;
}

const TownSquareComposerDialog = ({
    includeTitle,
    initialBody,
    initialTitle,
    isOpen,
    onOpenChange,
    onSubmit,
    submitLabel,
    targetLabel,
    title,
}: TownSquareComposerDialogProps) => {
    const [activeTab, setActiveTab] = useState('editing');
    const [draftTitle, setDraftTitle] = useState('');
    const [draftBody, setDraftBody] = useState('');
    const [selection, setSelection] = useState<SelectionRange>(emptySelection);
    const [isMoreDialogOpen, setIsMoreDialogOpen] = useState(false);
    const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
    const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        setActiveTab('editing');
        setDraftTitle(initialTitle ?? '');
        setDraftBody(initialBody ?? '');
        setSelection(emptySelection);
        setIsMoreDialogOpen(false);
        setIsLinkDialogOpen(false);
        setIsImageDialogOpen(false);
    }, [initialBody, initialTitle, isOpen]);

    const canSubmit = includeTitle
        ? draftTitle.trim().length > 0 && draftBody.trim().length > 0
        : draftBody.trim().length > 0;

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
                        <ConvexDialog.Close iconProps={{ color: 'rgb(246, 238, 219)' }} className='absolute right-4 top-4 z-10 h-10 w-10 bg-accent-hover' />
                        <DialogHeader text={title} subtext={targetLabel} />
                        <Column className='flex-1 pt-5 max-h-[80vh]  h-[80vh]' gap={4}>
                            {includeTitle ? (
                                <Column gap={1}>
                                    <PoppinsText weight='medium'>Thread title</PoppinsText>
                                    <PoppinsTextInput
                                        className='w-full rounded-xl border border-subtle-border px-4 py-3'
                                        placeholder='Conversation topic'
                                        value={draftTitle}
                                        onChangeText={setDraftTitle}
                                    />
                                </Column>
                            ) : null}

                            <Tabs value={activeTab} onValueChange={setActiveTab} variant="secondary" className="flex-1 grow-0 pb-10">
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

                            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 h-[40vh] max-h-[40vh]">
                                <Tabs.Content value="editing" className='flex-1 '>
                                    <Column gap={1}>
                                        {/* <PoppinsText weight='medium'>Composer</PoppinsText> */}
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
                                                includeTitle={includeTitle}
                                                markdown={draftBody}
                                                title={draftTitle}
                                            />
                                        </ScrollView>
                                    </ScrollShadow>

                                </Tabs.Content>
                            </Tabs>

                            <Row className='justify-end gap-3 pt-1'>
                                <AppButton variant='outline' className='w-32' onPress={() => onOpenChange(false)}>
                                    <PoppinsText weight='medium'>Cancel</PoppinsText>
                                </AppButton>
                                <AppButton
                                    variant='accent'
                                    className='w-40'
                                    disabled={!canSubmit}
                                    onPress={() => {
                                        if (!canSubmit) {
                                            return;
                                        }

                                        onSubmit({
                                            markdown: draftBody.trim(),
                                            plainText: stripMarkdownSyntax(draftBody.trim()),
                                            title: includeTitle ? draftTitle.trim() : undefined,
                                        });
                                        onOpenChange(false);
                                    }}
                                >
                                    <PoppinsText weight='medium' color='white'>{submitLabel}</PoppinsText>
                                </AppButton>
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
        </>
    );
};

export default TownSquareComposerDialog;
