import React from 'react';
import { Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FontText from '../text/FontText';

interface ImagePreviewProps {
  imageUrl?: string;
}

const ImagePreview = ({ imageUrl }: ImagePreviewProps) => {
  if (imageUrl) {
    return (
      <>
        <Image source={{ uri: imageUrl }} className="h-full w-full" resizeMode="contain" />
        <LinearGradient
          colors={['rgb(165, 159, 150)', 'transparent']}
          className="absolute left-0 right-0 top-0 h-40"
          style={{ pointerEvents: 'none' }}
        />
      </>
    );
  }

  return (
    <FontText variant="subtext" className="text-muted mb-4 text-center">
      No image selected yet
    </FontText>
  );
};

export default ImagePreview;
