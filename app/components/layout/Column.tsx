import React, { PropsWithChildren, forwardRef } from 'react';
import { View, Text } from 'react-native';

interface ColumnProps extends PropsWithChildren {
    className?: string;
    style?: any;
    gap?: number;
    onLayout?: (event: any) => void;
}

const normalizeChildren = (children: React.ReactNode) => {
    return React.Children.map(children, (child) => {
        if (typeof child === 'string') {
            const trimmedChild = child.trim();
            return trimmedChild ? <Text>{trimmedChild}</Text> : null;
        }

        if (typeof child === 'number') {
            return <Text>{child}</Text>;
        }

        return child;
    });
};

const Column = forwardRef<any, ColumnProps>(({ children, className, style, gap = 4, onLayout }, ref) => {
    return (
        <View ref={ref} className={`flex-col ${className}`} style={{ gap: gap * 4, ...style }} onLayout={onLayout}>
            {normalizeChildren(children)}
        </View>
    );
});

export default Column;
