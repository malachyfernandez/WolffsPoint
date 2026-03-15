import React, { PropsWithChildren } from 'react';
import { View } from 'react-native';

interface RowProps extends PropsWithChildren {
    className?: string;
    gap?: number;
}

const Row = ({ children, className, gap = 4 }: RowProps) => {
    return (
        <View className={`flex-row ${className}`} style={{ gap: gap * 4 }}>
            {children}
        </View>
    );
};

export default Row;
