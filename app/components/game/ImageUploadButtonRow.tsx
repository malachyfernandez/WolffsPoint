import React from 'react';
import { View } from 'react-native';
import Row from '../layout/Row';
import AppButton from '../ui/buttons/AppButton';
import PoppinsText from '../ui/text/PoppinsText';
import SimpleImageUpload from '../ui/imageUpload/SimpleImageUpload';

interface ImageUploadButtonRowProps {
    onToggleUrlInput: () => void;
    onImageUpload: (url: string) => void;
    showUrlButton?: boolean;
    urlButtonText?: string;
    uploadButtonText?: string;
    uploadButtonVariant?: 'black' | 'green' | 'grey' | 'outline' | 'outline-alt';
    uploadButtonClassName?: string;
    urlButtonClassName?: string;
}

const ImageUploadButtonRow = ({
    onToggleUrlInput,
    onImageUpload,
    showUrlButton = true,
    urlButtonText = 'Use URL',
    uploadButtonText = 'Choose Image',
    uploadButtonVariant = 'green',
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
                    <PoppinsText color='black' weight='medium'>{urlButtonText}</PoppinsText>
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
