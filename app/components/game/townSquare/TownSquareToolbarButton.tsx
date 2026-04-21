import React, { ReactNode, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Row from '../../layout/Row';

interface TownSquareToolbarButtonProps {
    children: ReactNode;
    className?: string;
    disabled?: boolean;
    isActive?: boolean;
    isFirst?: boolean;
    isLast?: boolean;
    onPress?: () => void;
}

const TownSquareToolbarButton = ({
    children,
    className = '',
    disabled = false,
    isActive = false,
    isFirst = false,
    isLast = false,
    onPress,
}: TownSquareToolbarButtonProps) => {
    const [isPressed, setIsPressed] = useState(false);

    return (
        <TouchableOpacity
            activeOpacity={disabled ? 1 : 0.8}
            className={[
                'h-12 min-w-12 items-center justify-center border-y-2 border-border px-4 hover:bg-text/5',
                isFirst ? 'rounded-l-2xl border-l-2' : 'border-l-0',
                isLast ? 'rounded-r-2xl border-r-2' : 'border-r-0',
                isActive ? 'bg-accent/10' : '',
                isPressed ? 'brightness-75' : '',
                disabled ? 'opacity-50' : '',
                className,
            ].join(' ')}
            disabled={disabled}
            onPress={disabled ? undefined : onPress}
            onPressIn={() => !disabled && setIsPressed(true)}
            onPressOut={() => !disabled && setIsPressed(false)}
        >
            <Row className='gap-4 h-full w-full items-center justify-center' pointerEvents='none'>
                {children}
            </Row>
        </TouchableOpacity>
    );
};

interface TownSquareToolbarButtonGroupProps {
    children: ReactNode;
    className?: string;
}

export const TownSquareToolbarButtonGroup = ({ children, className = '' }: TownSquareToolbarButtonGroupProps) => {
    return <View className={`flex-row items-center ${className}`}>{children}</View>;
};

export default TownSquareToolbarButton;
