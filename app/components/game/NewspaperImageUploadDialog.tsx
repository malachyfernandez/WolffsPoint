import React, { useState } from 'react';
import { View, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    FadeIn,
    ZoomInRotate,
    ZoomOutRotate,
    FadeOut,
} from 'react-native-reanimated';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import Column from '../layout/Column';
import Row from '../layout/Row';
import AppButton from '../ui/buttons/AppButton';
import PoppinsText from '../ui/text/PoppinsText';
import PoppinsTextInput from '../ui/forms/PoppinsTextInput';
import DialogHeader from '../ui/dialog/DialogHeader';
import SimpleImageUpload from '../ui/imageUpload/SimpleImageUpload';
import DisableableButton from '../ui/buttons/DisableableButton';
import ImageUploadButtonRow from './ImageUploadButtonRow';
import BackgroundPreview from './BackgroundPreview';
import ForegroundControls from './ForegroundControls';

interface NewspaperImageUploadDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onImageInsert: (imageUrl: string) => void;
}

const NewspaperImageUploadDialog = ({
    isOpen,
    onOpenChange,
    onImageInsert,
}: NewspaperImageUploadDialogProps) => {
    const [uploadedImageUrl, setUploadedImageUrl] = useState('');
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [urlInput, setUrlInput] = useState('');
    const [urlError, setUrlError] = useState('');

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            // Clear all state when dialog is closing
            setUploadedImageUrl('');
            setUrlInput('');
            setUrlError('');
            setShowUrlInput(false);
        }
        onOpenChange(open);
    };

    const handleInsert = () => {
        if (uploadedImageUrl) {
            onImageInsert(uploadedImageUrl);
            setUploadedImageUrl('');
            onOpenChange(false);
        }
    };

    const handleCancel = () => {
        setUploadedImageUrl('');
        setUrlInput('');
        setShowUrlInput(false);
        onOpenChange(false);
    };

    const handleImageUpload = (url: string) => {
        setUploadedImageUrl(url);
    };

    const isValidImageUrl = (url: string): boolean => {
        try {
            const urlObj = new URL(url);
            const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
            const pathname = urlObj.pathname.toLowerCase();
            return imageExtensions.some(ext => pathname.endsWith(ext)) ||
                   pathname.includes('image') ||
                   urlObj.searchParams.has('format') ||
                   url.includes('imgur.com') ||
                   url.includes('i.imgur.com');
        } catch {
            return false;
        }
    };

    const handleUrlSubmit = () => {
        const trimmedUrl = urlInput.trim();
        if (trimmedUrl) {
            if (!isValidImageUrl(trimmedUrl)) {
                setUrlError('Please enter a valid image URL (jpg, png, gif, webp, etc.)');
                return;
            }
            setUrlError('');
            setUploadedImageUrl(trimmedUrl);
            setUrlInput('');
            setShowUrlInput(false);
        }
    };

    const handleUrlInputChange = (text: string) => {
        setUrlInput(text);
        if (urlError) {
            setUrlError('');
        }
    };

    return (
        <ConvexDialog.Root isOpen={isOpen} onOpenChange={handleOpenChange}>
            <ConvexDialog.Trigger asChild>
                <View />
            </ConvexDialog.Trigger>
            <ConvexDialog.Portal>
                <ConvexDialog.Overlay />

                <ConvexDialog.Content className='p-1 h-[60vh]'>
                    <ConvexDialog.Close 
    iconProps={{ color: 'rgb(246, 238, 219)' }} 
    className="w-10 h-10 bg-accent-hover absolute right-4 top-4 z-10"
/>

                    <Column>
                        <DialogHeader
                            text='Upload Image'
                            subtext='Choose an image to insert into your column'
                        />

                        <Column className='flex-1 px-0'>
                            {/* Permanent Preview Area */}
                            <Column className='w-full h-56 overflow-hidden rounded-lg border border-subtle-border bg-background items-center justify-center relative'>
                                <BackgroundPreview imageUrl={uploadedImageUrl} />
                                <View className='absolute top-2 items-center w-full px-4'>
                                    <ForegroundControls
                                        showUrlInput={showUrlInput}
                                        urlInput={urlInput}
                                        urlError={urlError}
                                        hasImage={!!uploadedImageUrl}
                                        onToggleUrlInput={() => setShowUrlInput(!showUrlInput)}
                                        onImageUpload={handleImageUpload}
                                        onUrlInputChange={handleUrlInputChange}
                                        onUrlSubmit={handleUrlSubmit}
                                        onCancelUrlInput={() => { setShowUrlInput(false); setUrlInput(''); setUrlError(''); }}
                                    />
                                </View>
                            </Column>
                        </Column>

                        <Row gap={2} className='items-center w-full'>
                            <DisableableButton
                                isEnabled={!!uploadedImageUrl}
                                enabledText="Insert Image"
                                disabledText="No image selected"
                                onPress={handleInsert}
                                enabledVariant="green"
                                className='w-xs h-10'
                            />
                            {/* <AppButton className='w-32 h-10' variant='outline' onPress={handleCancel}>
                                <PoppinsText color='black' weight='medium'>Cancel</PoppinsText>
                            </AppButton> */}
                        </Row>
                    </Column>

                </ConvexDialog.Content>
            </ConvexDialog.Portal>
        </ConvexDialog.Root >
    );
};

export default NewspaperImageUploadDialog;
