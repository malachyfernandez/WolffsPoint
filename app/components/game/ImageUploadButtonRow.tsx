import React from 'react';
import { View } from 'react-native';
import Row from '../layout/Row';
import AppButton from '../ui/buttons/AppButton';
import FontText from '../ui/text/FontText';
import SimpleImageUpload from '../ui/imageUpload/SimpleImageUpload';

interface ImageUploadButtonRowProps {
    onToggleUrlInput: () => void;
    onImageUpload: (url: string) => void;
    showUrlButton?: boolean;
    urlButtonText?: string;
    uploadButtonText?: string;
    uploadButtonVariant?: 'filled' | 'accent' | 'grey' | 'outline' | 'outline-alt';
    uploadButtonClassName?: string;
    urlButtonClassName?: string;
}

const ImageUploadButtonRow = ({
    onToggleUrlInput,
    onImageUpload,
    showUrlButton = true,
    urlButtonText = 'Use URL',
    uploadButtonText = 'Choose Image',
    uploadButtonVariant = 'accent',
    uploadButtonClassName = '',
    urlButtonClassName = 'w-24 h-8',
}: ImageUploadButtonRowProps) => {
    return (
        <Row className='gap-2'>
            {showUrlButton && (
                <AppButton 
                    className={urlButtonClassName} 
                    variant='outline' 
                    onPress={onToggleUrlInput}
                >
                    <FontText color='black' weight='medium'>{urlButtonText}</FontText>
                </AppButton>
            )}
            <SimpleImageUpload
                onUpload={onImageUpload}
                buttonLabel={uploadButtonText}
                variant={uploadButtonVariant}
                className={uploadButtonClassName}
            />
        </Row>
    );
};

export default ImageUploadButtonRow;
