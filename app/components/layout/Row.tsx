import React, { PropsWithChildren } from 'react';
import { View } from 'react-native';

interface RowProps extends PropsWithChildren {
    className?: string;
    gap?: number;
    pointerEvents?: 'none' | 'auto' | 'box-none' | 'box-only';
}

const Row = ({ children, className, gap = 4, pointerEvents }: RowProps) => {
    return (
        <View className={`flex-row ${className}`} style={{ gap: gap * 4 }} pointerEvents={pointerEvents}>
            {children}
        </View>
    );
};

export default Row;
