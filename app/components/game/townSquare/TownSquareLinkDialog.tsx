import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import ConvexDialog from '../../ui/dialog/ConvexDialog';
import DialogHeader from '../../ui/dialog/DialogHeader';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import AppButton from '../../ui/buttons/AppButton';
import FontText from '../../ui/text/FontText';
import FontTextInput from '../../ui/forms/FontTextInput';

interface TownSquareLinkDialogProps {
    isOpen: boolean;
    onInsert: (label: string, url: string) => void;
    onOpenChange: (open: boolean) => void;
    selectedText: string;
}

const TownSquareLinkDialog = ({ isOpen, onInsert, onOpenChange, selectedText }: TownSquareLinkDialogProps) => {
    const [label, setLabel] = useState('');
    const [url, setUrl] = useState('');

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        setLabel(selectedText.trim());
        setUrl('');
    }, [isOpen, selectedText]);

    const canSubmit = url.trim().length > 0;

    return (
        <ConvexDialog.Root isOpen={isOpen} onOpenChange={onOpenChange}>
            <ConvexDialog.Trigger asChild>
                <View />
            </ConvexDialog.Trigger>
            <ConvexDialog.Portal>
                <ConvexDialog.Overlay />
                <ConvexDialog.Content className='p-1 max-w-2xl'>
                    <ConvexDialog.Close iconProps={{ color: 'rgb(246, 238, 219)' }} className='absolute right-4 top-4 z-10 h-10 w-10 bg-accent-hover' />
                    <DialogHeader text='Insert link' />
                    <Column className='p-5' gap={4}>
                        <Column gap={1}>
                            <FontText weight='medium'>Link text</FontText>
                            <FontTextInput
                                className='w-full rounded-xl border border-subtle-border px-4 py-3'
                                placeholder='Read more'
                                value={label}
                                onChangeText={setLabel}
                            />
                        </Column>
                        <Column gap={1}>
                            <FontText weight='medium'>Link URL</FontText>
                            <FontTextInput
                                className='w-full rounded-xl border border-subtle-border px-4 py-3'
                                placeholder='https://example.com'
                                value={url}
                                onChangeText={setUrl}
                            />
                        </Column>
                        <Row className='justify-end gap-3'>
                            <AppButton variant='outline' className='w-32' onPress={() => onOpenChange(false)}>
                                <FontText weight='medium'>Cancel</FontText>
                            </AppButton>
                            <AppButton
                                variant='green'
                                className='w-36'
                                disabled={!canSubmit}
                                onPress={() => {
                                    if (!canSubmit) {
                                        return;
                                    }

                                    onInsert(label.trim() || selectedText.trim() || 'Read more', url.trim());
                                    onOpenChange(false);
                                }}
                            >
                                <FontText weight='medium' color='white'>Insert link</FontText>
                            </AppButton>
                        </Row>
                    </Column>
                </ConvexDialog.Content>
            </ConvexDialog.Portal>
        </ConvexDialog.Root>
    );
};

export default TownSquareLinkDialog;
