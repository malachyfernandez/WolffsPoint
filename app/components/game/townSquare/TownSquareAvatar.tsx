import React from 'react';
import { Image, View } from 'react-native';
import FontText from '../../ui/text/FontText';

interface TownSquareAvatarProps {
    fallbackLabel?: string;
    size?: number;
    uri: string;
}

const TownSquareAvatar = ({ fallbackLabel, size = 52, uri }: TownSquareAvatarProps) => {
    return (
        <View className='overflow-hidden rounded-full border border-subtle-border/60' style={{ height: size, width: size }}>
            {uri ? (
                <Image source={{ uri }} style={{ height: size, width: size }} />
            ) : (
                <View className='h-full w-full items-center justify-center bg-border/10'>
                    {fallbackLabel ? (
                        <FontText weight='medium'>{fallbackLabel}</FontText>
                    ) : null}
                </View>
            )}
        </View>
    );
};

export default TownSquareAvatar;
