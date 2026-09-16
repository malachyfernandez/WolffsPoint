import React from 'react';
import { View, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FontText from '../ui/text/FontText';

interface BackgroundPreviewProps {
  imageUrl?: string;
}

const BackgroundPreview = ({ imageUrl }: BackgroundPreviewProps) => {
  return (
    <>
      {imageUrl ? (
        <>
          <Image source={{ uri: imageUrl }} className="h-full w-full" resizeMode="contain" />
          <LinearGradient
            colors={['rgb(165, 159, 150)', 'transparent']}
            className="absolute left-0 right-0 top-0 h-40"
            style={{ pointerEvents: 'none' }}
          />
        </>
      ) : (
        <FontText variant="subtext" className="text-muted mb-4 text-center">
          No image selected yet
        </FontText>
      )}
    </>
  );
};

export default BackgroundPreview;
