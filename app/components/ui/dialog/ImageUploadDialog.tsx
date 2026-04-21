import React, { useState } from 'react';
import { View } from 'react-native';
import ConvexDialog from './ConvexDialog';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import AppButton from '../buttons/AppButton';
import FontText from '../text/FontText';
import DialogHeader from './DialogHeader';
import DisableableButton from '../buttons/DisableableButton';
import ImagePreview from './ImagePreview';
import UrlInputControls from './UrlInputControls';

interface ImageUploadDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onImageSelect: (imageUrl: string) => void;
    title?: string;
    subtitle?: string;
    initialImageUrl?: string;
}

const ImageUploadDialog = ({
    isOpen,
    onOpenChange,
    onImageSelect,
    title = "Select Image",
    subtitle = "Choose an image from your device or enter a URL",
    initialImageUrl = '',
}: ImageUploadDialogProps) => {
    const [uploadedImageUrl, setUploadedImageUrl] = useState(initialImageUrl);
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [urlInput, setUrlInput] = useState('');
    const [urlError, setUrlError] = useState('');

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            // Clear all state when dialog is closing
            setUploadedImageUrl(initialImageUrl);
            setUrlInput('');
            setUrlError('');
            setShowUrlInput(false);
        }
        onOpenChange(open);
    };

    const handleSelect = () => {
        if (uploadedImageUrl) {
            onImageSelect(uploadedImageUrl);
            onOpenChange(false);
        }
    };

    const handleCancel = () => {
        setUploadedImageUrl(initialImageUrl);
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

                    <Column className='gap-4'>
                        <DialogHeader
                            text={title}
                            subtext={subtitle}
                        />
                        
                        <Column className='gap-4 flex-1 px-0'>
                            {/* Preview Area */}
                            <Column className='gap-4 w-full h-56 overflow-hidden rounded-lg border border-subtle-border bg-background items-center justify-center relative'>
                                <ImagePreview imageUrl={uploadedImageUrl} />
                                <View className='absolute top-2 items-center w-full sm:px-4'>
                                    <UrlInputControls
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

                        <Row className='gap-2 items-center w-full justify-center'>
                            <DisableableButton
                                isEnabled={!!uploadedImageUrl}
                                enabledText="Select Image"
                                disabledText="No image selected"
                                onPress={handleSelect}
                                enabledVariant="filled"
                                className='max-w-xs w-full flex-1 h-12'
                            />
                            <AppButton className='max-w-32 w-full flex-1' variant='outline' onPress={handleCancel}>
                                <FontText color='black' weight='medium'>Cancel</FontText>
                            </AppButton>
                        </Row>
                    </Column>
                </ConvexDialog.Content>
            </ConvexDialog.Portal>
        </ConvexDialog.Root >
    );
};

export default ImageUploadDialog;
