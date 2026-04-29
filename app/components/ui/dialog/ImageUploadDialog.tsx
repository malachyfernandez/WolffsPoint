import React, { useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAction } from 'convex/react';
import ConvexDialog from './ConvexDialog';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import AppButton from '../buttons/AppButton';
import FontText from '../text/FontText';
import DialogHeader from './DialogHeader';
import DisableableButton from '../buttons/DisableableButton';
import ImagePreview from './ImagePreview';
import UrlInputControls from './UrlInputControls';
import { useToast } from '../../../../contexts/ToastContext';
import { api } from '../../../../convex/_generated/api';
import { prepareWebFileForUpload, UploadThingReactNativeFile } from '../../../../utils/imageCompression';

interface UploadThingSignedUpload {
    url: string;
    key: string;
    serverData?: {
        url?: string;
    };
}

interface UploadThingUploadedFileResponse {
    url: string;
    appUrl: string;
    ufsUrl: string;
    fileHash: string;
    serverData?: {
        url?: string;
    };
}

const UPLOAD_TIMEOUT_MS = 90000;

const withTimeout = async <T,>(promise: Promise<T>, message: string, timeoutMs: number = UPLOAD_TIMEOUT_MS) => {
    return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
            setTimeout(() => reject(new Error(message)), timeoutMs);
        }),
    ]);
};

const UPLOAD_FAILURE_MESSAGE = 'Image Upload Failed. If obscure file type, use .WEBP or .PNG for best results';

const getUploadErrorMessage = (error: unknown) => {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    return UPLOAD_FAILURE_MESSAGE;
};

const uploadFileToPresignedUrl = async (
    file: UploadThingReactNativeFile,
    signedUpload: UploadThingSignedUpload,
) => {
    return new Promise<UploadThingUploadedFileResponse>((resolve, reject) => {
        const formData = new FormData();

        if (file.file) {
            formData.append('file', file.file);
        } else {
            formData.append('file', {
                uri: file.uri,
                type: file.type,
                name: file.name,
            } as never);
        }

        const xhr = new XMLHttpRequest();
        xhr.open('PUT', signedUpload.url, true);
        xhr.setRequestHeader('Range', 'bytes=0-');
        xhr.setRequestHeader('x-uploadthing-version', '7.7.4');
        xhr.responseType = 'json';
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(xhr.response as UploadThingUploadedFileResponse);
                return;
            }
            reject(new Error(`Upload failed with status ${xhr.status}.`));
        };
        xhr.onerror = () => reject(new Error('Upload request failed.'));
        xhr.send(formData);
    });
};

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
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const { showToast } = useToast();
    const generatePublicImageUploadUrl = useAction(api.uploadthing.generatePublicImageUploadUrl);

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

    const handleDroppedFile = useCallback(async (file: File) => {
        try {
            setIsUploading(true);
            const preparedFile = await withTimeout(
                prepareWebFileForUpload(file),
                'Preparing the image took too long. Please try a smaller image.',
            );
            const signedUpload = await withTimeout(generatePublicImageUploadUrl({
                name: preparedFile.name,
                size: preparedFile.size,
                type: preparedFile.type,
                lastModified: preparedFile.lastModified,
            }) as Promise<UploadThingSignedUpload>, 'Generating the upload URL took too long. Please try again.');
            const uploadedFile = await withTimeout(
                uploadFileToPresignedUrl(preparedFile, signedUpload),
                'Uploading the image took too long. Please try again.',
            );
            const publicUrl = uploadedFile.serverData?.url ?? uploadedFile.ufsUrl ?? uploadedFile.url;

            if (!publicUrl) {
                throw new Error('Upload completed but no public URL was returned.');
            }

            setUploadedImageUrl(publicUrl);
        } catch (error) {
            showToast(getUploadErrorMessage(error));
        } finally {
            setIsUploading(false);
            setIsDragging(false);
        }
    }, [generatePublicImageUploadUrl, showToast, setIsUploading, setIsDragging, setUploadedImageUrl]);

    useEffect(() => {
        if (!isOpen) return;

        const preventDefault = (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
        };

        document.addEventListener('dragover', preventDefault);
        document.addEventListener('drop', preventDefault);

        return () => {
            document.removeEventListener('dragover', preventDefault);
            document.removeEventListener('drop', preventDefault);
        };
    }, [isOpen]);

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
                setUrlError('Please enter a valid image URL (webp, png, gif, jpg, etc.)');
                showToast(UPLOAD_FAILURE_MESSAGE);
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

                <ConvexDialog.Content className='p-1 max-w-xl'>
                    <ConvexDialog.Close
                        iconProps={{ color: 'rgb(246, 238, 219)' }}
                        className="w-10 h-10 bg-text-inverted/10 hover:bg-text-inverted/15 rounded-full absolute right-0 top-0 z-10"
                    />

                    <Column className='gap-4'>
                        <DialogHeader
                            text={title}
                            subtext={subtitle}
                        />
                        
                        <Column className='gap-4 flex-1 px-0'>
                            {/* Preview Area */}
                            <div
                                className='flex flex-col gap-4 w-full h-56 overflow-hidden rounded-lg border border-subtle-border bg-background items-center justify-center relative'
                                onDragEnter={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (Array.from(e.dataTransfer.types).includes('Files')) {
                                        setIsDragging(true);
                                    }
                                }}
                                onDragLeave={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const container = e.currentTarget;
                                    const related = e.relatedTarget as Node | null;
                                    if (related && container.contains(related)) {
                                        return;
                                    }
                                    setIsDragging(false);
                                }}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    e.dataTransfer.dropEffect = 'copy';
                                }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setIsDragging(false);
                                    const files = e.dataTransfer.files;
                                    if (!files || files.length === 0) return;
                                    const imageFile = Array.from(files).find(f => f.type.startsWith('image/'));
                                    if (!imageFile) {
                                        showToast('Please drop an image file.');
                                        return;
                                    }
                                    handleDroppedFile(imageFile);
                                }}
                            >
                                <ImagePreview imageUrl={uploadedImageUrl} />
                                {isDragging && (
                                    <View className='absolute inset-0 bg-accent/20 border-2 border-dashed border-accent rounded-lg items-center justify-center z-10'>
                                        <FontText weight='bold' color='black'>Drop image here</FontText>
                                    </View>
                                )}
                                {isUploading && (
                                    <View className='absolute inset-0 bg-background/80 items-center justify-center z-10'>
                                        <ActivityIndicator color='#9a7a33' />
                                        <FontText className='mt-2' variant='subtext'>Uploading...</FontText>
                                    </View>
                                )}
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
                            </div>
                        </Column>

                        <Row className='gap-2 items-center w-full justify-center'>
                            <DisableableButton
                                isEnabled={!!uploadedImageUrl && !isUploading}
                                enabledText="Select Image"
                                disabledText={isUploading ? "Uploading..." : "No image selected"}
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
