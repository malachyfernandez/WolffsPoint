import React from 'react';
import { View } from 'react-native';
import Animated, {
    ZoomInRotate,
    ZoomOutRotate,
    FadeIn,
    FadeOut,
} from 'react-native-reanimated';
import Row from '../layout/Row';
import AppButton from '../ui/buttons/AppButton';
import PoppinsText from '../ui/text/PoppinsText';
import PoppinsTextInput from '../ui/forms/PoppinsTextInput';
import ImageUploadButtonRow from './ImageUploadButtonRow';

interface ForegroundControlsProps {
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

const ForegroundControls = ({
    showUrlInput,
    urlInput,
    urlError,
    hasImage,
    onToggleUrlInput,
    onImageUpload,
    onUrlInputChange,
    onUrlSubmit,
    onCancelUrlInput,
}: ForegroundControlsProps) => {
    if (showUrlInput) {
        return (
            <Animated.View
                entering={ZoomInRotate.duration(100)}
                exiting={ZoomOutRotate.duration(100)}
                key="url-input"
                className='bg-background/95 border border-subtle-border rounded-lg p-3 shadow-lg w-full'
            >
                <PoppinsText weight='medium' className='mb-2'>Image URL:</PoppinsText>
                {urlError ? (
                    <PoppinsText color='red' className='mb-2 text-sm'>{urlError}</PoppinsText>
                ) : null}
                <Row className='gap-2'>
                    <PoppinsTextInput
                        placeholder='https://example.com/image.jpg'
                        className='flex-1 border border-subtle-border p-2 bg-inner-background'
                        value={urlInput}
                        onChangeText={onUrlInputChange}
                    />
                    <AppButton className='w-16 h-8' variant='green' onPress={onUrlSubmit}>
                        <PoppinsText color='white' weight='medium'>Add</PoppinsText>
                    </AppButton>
                    <AppButton className='w-16 h-8' variant='outline' onPress={onCancelUrlInput}>
                        <PoppinsText color='black' weight='medium'>✕</PoppinsText>
                    </AppButton>
                </Row>
            </Animated.View>
        );
    }

    return (
        <Animated.View
            entering={FadeIn.duration(100)}
            exiting={FadeOut.duration(100)}
            key="upload-buttons"
        >
            <ImageUploadButtonRow
                onToggleUrlInput={onToggleUrlInput}
                onImageUpload={onImageUpload}
                urlButtonText="Use URL"
                uploadButtonText={hasImage ? "Change Image" : "Upload Image"}
                uploadButtonVariant="black"
                urlButtonClassName="w-36 h-12"
                uploadButtonClassName="w-36 h-12"
            />
        </Animated.View>
    );
};

export default ForegroundControls;
