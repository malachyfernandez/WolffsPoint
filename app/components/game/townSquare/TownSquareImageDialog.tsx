import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import ConvexDialog from '../../ui/dialog/ConvexDialog';
import DialogHeader from '../../ui/dialog/DialogHeader';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import AppButton from '../../ui/buttons/AppButton';
import FontText from '../../ui/text/FontText';
import FontTextInput from '../../ui/forms/FontTextInput';
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
                    <Column className='gap-4 p-5'>
                        <Column className='gap-1'>
                            <FontText weight='medium'>Image caption</FontText>
                            <FontTextInput
                                className='w-full rounded-xl border border-subtle-border px-4 py-3'
                                placeholder='Forum image'
                                value={caption}
                                onChangeText={setCaption}
                            />
                        </Column>
                        <Row className='gap-4 items-center justify-between'>
                            <FontText variant='subtext'>{uploadedUrl ? 'Image uploaded and ready to insert.' : 'Upload an image first.'}</FontText>
                            <SimpleImageUpload buttonLabel='Upload image' className='w-40' onUpload={setUploadedUrl} />
                        </Row>
                        <Row className='gap-4 justify-end'>
                            <AppButton variant='outline' className='w-32' onPress={() => onOpenChange(false)}>
                                <FontText weight='medium'>Cancel</FontText>
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
                                <FontText weight='medium' color='white'>Insert image</FontText>
                            </AppButton>
                        </Row>
                    </Column>
                </ConvexDialog.Content>
            </ConvexDialog.Portal>
        </ConvexDialog.Root>
    );
};

export default TownSquareImageDialog;
