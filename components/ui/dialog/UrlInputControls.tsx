import React from 'react';
import { View } from 'react-native';
import Animated, {
    ZoomInRotate,
    ZoomOutRotate,
    FadeIn,
    FadeOut,
} from 'react-native-reanimated';
import Row from '../../layout/Row';
import AppButton from '../buttons/AppButton';
import FontText from '../text/FontText';
import FontTextInput from '../forms/FontTextInput';
import ImageUploadButtonRow from '../../game/ImageUploadButtonRow';

interface UrlInputControlsProps {
    showUrlInput: boolean;
    urlInput: string;
    urlError: string;
    hasImage: boolean;
    onToggleUrlInput: () => void;
    onImageUpload: (url: string) => void;
    onUrlInputChange: (text: string) => void;
    onUrlSubmit: () => void;
    onCancelUrlInput: () => void;
}

const UrlInputControls = ({
    showUrlInput,
    urlInput,
    urlError,
    hasImage,
    onToggleUrlInput,
    onImageUpload,
    onUrlInputChange,
    onUrlSubmit,
    onCancelUrlInput,
}: UrlInputControlsProps) => {
    if (showUrlInput) {
        return (
            <Animated.View
                entering={ZoomInRotate.duration(100)}
                exiting={ZoomOutRotate.duration(100)}
                key="url-input"
                className='bg-background/95 border border-subtle-border rounded-lg p-3 shadow-lg w-full'
            >
                <FontText weight='medium' className='mb-2'>Image URL:</FontText>
                {urlError ? (
                    <FontText color='red' className='mb-2 text-sm'>{urlError}</FontText>
                ) : null}
                <Row className='gap-4 flex-wrap'>
                    <FontTextInput
                        placeholder='Enter image URL here...'
                        className='flex-1 border border-subtle-border p-2 bg-inner-background'
                        value={urlInput}
                        onChangeText={onUrlInputChange}
                    />
                    <Row className='gap-2'>
                        <AppButton className='w-16 h-8' variant='filled' onPress={onUrlSubmit}>
                            <FontText color='white' weight='medium'>Add</FontText>
                        </AppButton>
                        <AppButton className='w-16 h-8' variant='outline' onPress={onCancelUrlInput}>
                            <FontText color='black' weight='medium'>✕</FontText>
                        </AppButton>
                    </Row>
                </Row>
            </Animated.View>
        );
    }

    return (
        <Animated.View
            entering={FadeIn.duration(100)}
            exiting={FadeOut.duration(100)}
            key="upload-buttons"
            className='w-full items-center'
        >
            <Row className='w-full justify-center'>
                <ImageUploadButtonRow
                    onToggleUrlInput={onToggleUrlInput}
                    onImageUpload={onImageUpload}
                    urlButtonText="Use URL"
                    uploadButtonText={hasImage ? "Change Image" : "Upload Image"}
                    uploadButtonVariant="filled"
                    urlButtonClassName="w-32 max-w-full shrink h-12"
                    uploadButtonClassName="w-32 max-w-full shrink h-12"
                />
            </Row>
        </Animated.View>
    );
};

export default UrlInputControls;
