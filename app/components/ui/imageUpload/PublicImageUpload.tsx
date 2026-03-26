/**
 * PublicImageUpload - A complete image upload component with UploadThing integration
 * 
 * This component handles the full image upload workflow including:
 * - Media library permissions
 * - Image selection and editing
 * - Upload to UploadThing service
 * - Progress indication and error handling
 * - Image preview after successful upload
 * 
 * @example Basic Usage
 * ```tsx
 * const [imageUrl, setImageUrl] = useState('');
 * 
 * <PublicImageUpload
 *   url={imageUrl}
 *   setUrl={setImageUrl}
 *   buttonLabel="Upload profile picture"
 *   emptyLabel="No profile picture uploaded yet"
 * />
 * ```
 * 
 * @props {string} url - Current uploaded image URL
 * @props {Dispatch<SetStateAction<string>>} setUrl - Function to update the URL state
 * @props {string} buttonLabel - Text for the upload button (default: "Upload image")
 * @props {string} emptyLabel - Text shown when no image is uploaded (default: "No image uploaded yet")
 * 
 * @workflow
 * 1. User clicks upload button
 * 2. Requests media library permissions
 * 3. Opens image picker with editing enabled
 * 4. Converts selected asset to UploadThing format
 * 5. Generates presigned upload URL from Convex
 * 6. Uploads file to UploadThing service
 * 7. Updates URL state with public image URL
 * 8. Shows preview of uploaded image
 * 
 * @features
 * - Automatic error handling with user-friendly messages
 * - Loading state during upload process
 * - Image preview with proper aspect ratio
 * - Permission request handling
 * - Support for both file assets and URI-based assets
 * 
 * @dependencies
 * - expo-image-picker for image selection
 * - UploadThing for file hosting
 * - Convex for backend integration
 */
import React, { Dispatch, SetStateAction, useState } from 'react';
import { useAction } from 'convex/react';
import { ActivityIndicator, Image, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../../../convex/_generated/api';
import Column from '../../layout/Column';
import AppButton from '../buttons/AppButton';
import PoppinsText from '../text/PoppinsText';

type UrlSetter = Dispatch<SetStateAction<string>>;

type UploadThingReactNativeFile = {
    uri: string;
    name: string;
    size: number;
    type: string;
    lastModified: number;
    file?: File;
};

interface UploadThingSignedUpload {
    url: string;
    key: string;
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

interface PublicImageUploadProps {
    url: string;
    setUrl: UrlSetter;
    buttonLabel?: string;
    emptyLabel?: string;
}

const assetToUploadThingFile = async (asset: ImagePicker.ImagePickerAsset) => {
    if (asset.file) {
        return {
            uri: asset.file.name,
            name: asset.file.name,
            size: asset.file.size,
            type: asset.file.type,
            lastModified: asset.file.lastModified,
            file: asset.file,
        } as UploadThingReactNativeFile;
    }

    return {
        uri: asset.uri,
        name: asset.fileName ?? `upload-${Date.now()}.jpg`,
        size: asset.fileSize ?? 0,
        type: asset.mimeType ?? 'image/jpeg',
        lastModified: Date.now(),
    };
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

const PublicImageUpload = ({
    url,
    setUrl,
    buttonLabel = 'Upload image',
    emptyLabel = 'No image uploaded yet.',
}: PublicImageUploadProps) => {
    const [isUploading, setIsUploading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const generatePublicImageUploadUrl = useAction(api.uploadthing.generatePublicImageUploadUrl);

    const handleUpload = async () => {
        setErrorMessage('');

        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
            setErrorMessage('Media library permission is required to upload an image.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 1,
        });

        if (result.canceled || !result.assets?.length) {
            return;
        }

        try {
            setIsUploading(true);
            const file = await assetToUploadThingFile(result.assets[0]);
            const signedUpload = await generatePublicImageUploadUrl({
                name: file.name,
                size: file.size,
                type: file.type,
                lastModified: file.lastModified,
            }) as UploadThingSignedUpload;
            const uploadedFile = await uploadFileToPresignedUrl(file, signedUpload);
            const publicUrl = uploadedFile.serverData?.url ?? uploadedFile.ufsUrl ?? uploadedFile.url;

            if (!publicUrl) {
                throw new Error('Upload completed but no public URL was returned.');
            }

            setUrl(publicUrl);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Image upload failed.';
            setErrorMessage(message);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Column className='w-full p-4 border-b border-subtle-border bg-light/30'>
            <Column gap={3}>
                <PoppinsText weight='medium'>Public image upload</PoppinsText>

                <AppButton variant='green' className='w-40' onPress={handleUpload}>
                    {isUploading ? (
                        <ActivityIndicator color='white' />
                    ) : (
                        <PoppinsText weight='medium' color='white'>
                            {buttonLabel}
                        </PoppinsText>
                    )}
                </AppButton>

                {errorMessage ? (
                    <PoppinsText className='text-red-500'>{errorMessage}</PoppinsText>
                ) : null}

                {url ? (
                    <Column gap={2}>
                        <PoppinsText varient='subtext'>
                            {url}
                        </PoppinsText>

                        <View className='w-full h-56 overflow-hidden rounded-lg border border-subtle-border bg-background'>
                            <Image
                                source={{ uri: url }}
                                className='w-full h-full'
                                resizeMode='cover'
                            />
                        </View>
                    </Column>
                ) : (
                    <PoppinsText varient='subtext'>{emptyLabel}</PoppinsText>
                )}
            </Column>
        </Column>
    );
};

export default PublicImageUpload;
