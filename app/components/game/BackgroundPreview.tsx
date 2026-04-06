import React from 'react';
import { View, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import PoppinsText from '../ui/text/PoppinsText';

interface BackgroundPreviewProps {
    imageUrl?: string;
}

const BackgroundPreview = ({ imageUrl }: BackgroundPreviewProps) => {
    return (
        <>
            {imageUrl ? (
                <>
                    <Image
                        source={{ uri: imageUrl }}
                        className='w-full h-full'
                        resizeMode='contain'
                    />
                    <LinearGradient
                        colors={['rgb(165, 159, 150)', 'transparent']}
                        className='absolute top-0 left-0 right-0 h-40'
                        pointerEvents='none'
                    />
                </>
            ) : (
                <PoppinsText varient='subtext' className='text-muted text-center mb-4'>
                    No image selected yet
                </PoppinsText>
            )}
        </>
    );
};

export default BackgroundPreview;
