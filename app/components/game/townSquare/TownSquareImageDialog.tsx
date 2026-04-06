import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import ConvexDialog from '../../ui/dialog/ConvexDialog';
import DialogHeader from '../../ui/dialog/DialogHeader';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import AppButton from '../../ui/buttons/AppButton';
import PoppinsText from '../../ui/text/PoppinsText';
import PoppinsTextInput from '../../ui/forms/PoppinsTextInput';
import SimpleImageUpload from '../../ui/imageUpload/SimpleImageUpload';

interface TownSquareImageDialogProps {
    isOpen: boolean;
    onInsert: (caption: string, url: string) => void;
    onOpenChange: (open: boolean) => void;
}

const TownSquareImageDialog = ({ isOpen, onInsert, onOpenChange }: TownSquareImageDialogProps) => {
    const [caption, setCaption] = useState('');
    const [uploadedUrl, setUploadedUrl] = useState('');

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        setCaption('');
        setUploadedUrl('');
    }, [isOpen]);

    const canInsert = uploadedUrl.trim().length > 0;

    return (
        <ConvexDialog.Root isOpen={isOpen} onOpenChange={onOpenChange}>
            <ConvexDialog.Trigger asChild>
                <View />
            </ConvexDialog.Trigger>
            <ConvexDialog.Portal>
                <ConvexDialog.Overlay />
                <ConvexDialog.Content className='p-1 max-w-2xl'>
                    <ConvexDialog.Close iconProps={{ color: 'rgb(246, 238, 219)' }} className='absolute right-4 top-4 z-10 h-10 w-10 bg-accent-hover' />
                    <DialogHeader text='Insert image' />
                    <Column className='p-5' gap={4}>
                        <Column gap={1}>
                            <PoppinsText weight='medium'>Image caption</PoppinsText>
                            <PoppinsTextInput
                                className='w-full rounded-xl border border-subtle-border px-4 py-3'
                                placeholder='Forum image'
                                value={caption}
                                onChangeText={setCaption}
                            />
                        </Column>
                        <Row className='items-center justify-between gap-3'>
                            <PoppinsText varient='subtext'>{uploadedUrl ? 'Image uploaded and ready to insert.' : 'Upload an image first.'}</PoppinsText>
                            <SimpleImageUpload buttonLabel='Upload image' className='w-40' onUpload={setUploadedUrl} />
                        </Row>
                        <Row className='justify-end gap-3'>
                            <AppButton variant='outline' className='w-32' onPress={() => onOpenChange(false)}>
                                <PoppinsText weight='medium'>Cancel</PoppinsText>
                            </AppButton>
                            <AppButton
                                variant='green'
                                className='w-40'
                                disabled={!canInsert}
                                onPress={() => {
                                    if (!canInsert) {
                                        return;
                                    }

                                    onInsert(caption.trim() || 'Forum image', uploadedUrl.trim());
                                    onOpenChange(false);
                                }}
                            >
                                <PoppinsText weight='medium' color='white'>Insert image</PoppinsText>
                            </AppButton>
                        </Row>
                    </Column>
                </ConvexDialog.Content>
            </ConvexDialog.Portal>
        </ConvexDialog.Root>
    );
};

export default TownSquareImageDialog;
