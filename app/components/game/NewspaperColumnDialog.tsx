import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import Column from '../layout/Column';
import Row from '../layout/Row';
import AppButton from '../ui/buttons/AppButton';
import PoppinsText from '../ui/text/PoppinsText';
import PoppinsTextInput from '../ui/forms/PoppinsTextInput';
import DialogHeader from '../ui/dialog/DialogHeader';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';

interface NewspaperColumnDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    columnIndex: number;
    currentMarkdown: string;
    setColumnMarkdown: (columnIndex: number, markdown: string) => void;
}

const applyWrap = (value: string, prefix: string, suffix = prefix) => {
    if (!value.trim()) {
        return `${prefix}Text${suffix}`;
    }

    return `${value}${value.endsWith('\n') ? '' : '\n'}${prefix}Text${suffix}`;
};

const applyLine = (value: string, prefix: string) => {
    if (!value.trim()) {
        return `${prefix} Heading`;
    }

    return `${value}${value.endsWith('\n') ? '' : '\n'}${prefix} Heading`;
};

const NewspaperColumnDialog = ({
    isOpen,
    onOpenChange,
    columnIndex,
    currentMarkdown,
    setColumnMarkdown,
}: NewspaperColumnDialogProps) => {
    const [message, setMessage] = useState(currentMarkdown || '');

    useEffect(() => {
        if (isOpen) {
            setMessage(currentMarkdown || '');
        }
    }, [currentMarkdown, isOpen]);

    const handleSubmit = () => {
        setColumnMarkdown(columnIndex, message.trim());
        onOpenChange(false);
    };

    const handleCancel = () => {
        setMessage(currentMarkdown || '');
        onOpenChange(false);
    };

    return (
        <ConvexDialog.Root isOpen={isOpen} onOpenChange={onOpenChange}>
            <ConvexDialog.Trigger asChild>
                <View />
            </ConvexDialog.Trigger>
            <ConvexDialog.Portal>
                <ConvexDialog.Overlay />

                <ConvexDialog.Content>
                    <ConvexDialog.Close iconProps={{ color: 'rgb(246, 238, 219)' }} className="w-10 h-10 bg-accent-hover absolute right-4 top-4 z-10" />

                    <Column className='p-1 max-h-[85vh]'>
                        <DialogHeader
                            text={`Column ${columnIndex + 1}`}
                            subtext='Write and preview newspaper markdown'
                        />

                        <Row className='flex-wrap items-center' gap={2}>
                            <AppButton className='w-16 h-8' variant='grey' onPress={() => setMessage((value) => applyLine(value, '#'))}>
                                <PoppinsText color='white' weight='medium'>H1</PoppinsText>
                            </AppButton>
                            <AppButton className='w-16 h-8' variant='grey' onPress={() => setMessage((value) => applyLine(value, '##'))}>
                                <PoppinsText color='white' weight='medium'>H2</PoppinsText>
                            </AppButton>
                            <AppButton className='w-20 h-8' variant='grey' onPress={() => setMessage((value) => applyWrap(value, '**'))}>
                                <PoppinsText color='white' weight='medium'>Bold</PoppinsText>
                            </AppButton>
                            <AppButton className='w-20 h-8' variant='grey' onPress={() => setMessage((value) => applyLine(value, '-'))}>
                                <PoppinsText color='white' weight='medium'>List</PoppinsText>
                            </AppButton>
                            <AppButton className='w-20 h-8' variant='grey' onPress={() => setMessage((value) => applyLine(value, '>'))}>
                                <PoppinsText color='white' weight='medium'>Quote</PoppinsText>
                            </AppButton>
                        </Row>

                        <Row className='items-start flex-wrap' gap={4}>
                            <Column className='flex-1 min-w-[18rem]' gap={2}>
                                <PoppinsText weight='medium'>Editor</PoppinsText>
                                <PoppinsTextInput
                                    placeholder='Write newspaper markdown...'
                                    className='w-full border border-subtle-border p-3 bg-[#fffaf0]'
                                    value={message}
                                    onChangeText={setMessage}
                                    multiline
                                    numberOfLines={18}
                                    style={{ minHeight: 360, textAlignVertical: 'top' }}
                                />
                            </Column>

                            <Column className='flex-1 min-w-[18rem] rounded-xl border border-border bg-[#f7f1dd] p-4' gap={2}>
                                <PoppinsText weight='medium'>Preview</PoppinsText>
                                <MarkdownRenderer markdown={message} textAlign='justify' />
                            </Column>
                        </Row>

                        <Row gap={2}>
                            <AppButton className='w-34 h-10' variant='black' onPress={handleSubmit}>
                                <PoppinsText color='white' weight='medium'>Save</PoppinsText>
                            </AppButton>
                            <AppButton className='w-34 h-10' variant='outline-alt' onPress={handleCancel}>
                                <PoppinsText color='black' weight='medium'>Cancel</PoppinsText>
                            </AppButton>
                        </Row>
                    </Column>
                </ConvexDialog.Content>
            </ConvexDialog.Portal>
        </ConvexDialog.Root>
    );
};

export default NewspaperColumnDialog;
