import React, { PropsWithChildren } from 'react';
import { View } from 'react-native';

interface ColumnProps extends PropsWithChildren {
    className?: string;
    style?: any;
    gap?: number;
}

const Column = ({ children, className, style, gap = 4 }: ColumnProps) => {
    return (
        <View className={`flex-col ${className}`} style={{ gap: gap * 4, ...style }}>
            {children}
        </View>
    );
};

export default Column;
