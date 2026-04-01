import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import Column from '../layout/Column';
import Row from '../layout/Row';
import DialogHeader from '../ui/dialog/DialogHeader';
import PoppinsText from '../ui/text/PoppinsText';
import PoppinsTextInput from '../ui/forms/PoppinsTextInput';
import AppButton from '../ui/buttons/AppButton';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';

interface MarkdownComposerDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    submitLabel: string;
    initialMarkdown?: string;
    onSubmit: (markdown: string) => void;
}

const MarkdownComposerDialog = ({ isOpen, onOpenChange, title, submitLabel, initialMarkdown = '', onSubmit }: MarkdownComposerDialogProps) => {
    const [markdown, setMarkdown] = useState(initialMarkdown);

    useEffect(() => {
        if (isOpen) {
            setMarkdown(initialMarkdown);
        }
    }, [initialMarkdown, isOpen]);

    const canSubmit = markdown.trim().length > 0;

    return (
        <ConvexDialog.Root isOpen={isOpen} onOpenChange={onOpenChange}>
            <ConvexDialog.Trigger asChild>
                <View />
            </ConvexDialog.Trigger>
            <ConvexDialog.Portal>
                <ConvexDialog.Overlay />
                <ConvexDialog.Content className='p-1 h-[85vh] max-w-5xl'>
                    <ConvexDialog.Close iconProps={{ color: 'rgb(246, 238, 219)' }} className="w-10 h-10 bg-accent-hover absolute right-4 top-4 z-10" />
                    <DialogHeader text={title} />
                    <Row className='gap-4 p-4 h-full'>
                        <Column className='flex-1' gap={2}>
                            <PoppinsText weight='medium'>Markdown</PoppinsText>
                            <PoppinsTextInput
                                className='w-full flex-1 min-h-[300px] border border-subtle-border p-3'
                                value={markdown}
                                onChangeText={setMarkdown}
                                multiline={true}
                                autoGrow={true}
                                placeholder='Write here...'
                            />
                        </Column>
                        <Column className='flex-1 rounded-xl border border-subtle-border bg-white p-3' gap={2}>
                            <PoppinsText weight='medium'>Preview</PoppinsText>
                            {markdown.trim().length > 0 ? (
                                <MarkdownRenderer markdown={markdown} />
                            ) : (
                                <PoppinsText varient='subtext'>Your preview appears here.</PoppinsText>
                            )}
                        </Column>
                    </Row>
                    <Row className='justify-end gap-3 px-4 pb-4'>
                        <AppButton variant='outline' className='w-32' onPress={() => onOpenChange(false)}>
                            <PoppinsText weight='medium'>Cancel</PoppinsText>
                        </AppButton>
                        <AppButton
                            variant='black'
                            className='w-40'
                            onPress={() => {
                                if (!canSubmit) return;
                                onSubmit(markdown.trim());
                                onOpenChange(false);
                            }}
                            disabled={!canSubmit}
                        >
                            <PoppinsText weight='medium' color='white'>{submitLabel}</PoppinsText>
                        </AppButton>
                    </Row>
                </ConvexDialog.Content>
            </ConvexDialog.Portal>
        </ConvexDialog.Root>
    );
};

export default MarkdownComposerDialog;
