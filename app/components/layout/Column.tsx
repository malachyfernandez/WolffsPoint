import React, { PropsWithChildren, forwardRef } from 'react';
import { View } from 'react-native';

interface ColumnProps extends PropsWithChildren {
    className?: string;
    style?: any;
    gap?: number;
    onLayout?: (event: any) => void;
}

const Column = forwardRef<any, ColumnProps>(({ children, className, style, gap = 4, onLayout }, ref) => {
    return (
        <View ref={ref} className={`flex-col ${className}`} style={{ gap: gap * 4, ...style }} onLayout={onLayout}>
            {children}
        </View>
    );
});

export default Column;
