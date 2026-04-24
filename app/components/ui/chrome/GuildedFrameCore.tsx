import React from 'react';
import { View } from 'react-native';
import { type GuildedButtonVariant } from '../buttons/GuildedButton.shared';

interface GuildedFrameCoreProps {
    children: React.ReactNode;
    className?: string;
    contentClassName?: string;
    backgroundToken?: string;
    showTexture?: boolean;
    variant: GuildedButtonVariant;
}

export function GuildedFrameCore({ children, className = '', contentClassName = '' }: GuildedFrameCoreProps) {
    return (
        <View className={className}>
            <View className={contentClassName}>{children}</View>
        </View>
    );
}
export default GuildedFrameCore;
