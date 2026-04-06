import React from 'react';
import { Image, View } from 'react-native';

interface TownSquareAvatarProps {
    size?: number;
    uri: string;
}

const TownSquareAvatar = ({ size = 52, uri }: TownSquareAvatarProps) => {
    return (
        <View className='overflow-hidden rounded-full border border-subtle-border/60' style={{ height: size, width: size }}>
            {uri ? (
                <Image source={{ uri }} style={{ height: size, width: size }} />
            ) : (
                <View className='h-full w-full bg-border/10' />
            )}
        </View>
    );
};

export default TownSquareAvatar;
