import React, { useState } from 'react';
import { TouchableOpacity, ViewStyle, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { cssInterop } from "nativewind";
import Row from '../../layout/Row';

// Enable NativeWind for BlurView
cssInterop(BlurView, { className: "style" });

interface AppButtonProps {
    children: React.ReactNode;
    variant?: 'outline' | 'black' | 'grey' | 'green';
    className?: string;
    onPress?: () => void;
    dropShadow?: boolean;
}

const AppButton = ({
    children,
    variant = 'outline',
    className = '',
    onPress,
    dropShadow = true
}: AppButtonProps) => {
    const [isPressed, setIsPressed] = useState(false);

    const baseStyles = 'h-10 flex-row items-center justify-center rounded gap-2 overflow-hidden';
    let extraStyles = '';

    let pressedStyles = 'brightness-50';

    if (variant === 'outline') {
        const bg = 'bg-none';
        extraStyles = `border-2 border-border ${bg} group hover:bg-border`;
        
    } else if (variant === 'grey') {
        const bg = 'bg-[#374559ae]';
        extraStyles = bg;
        pressedStyles = 'brightness-80';
    } else if (variant === 'green') {
        const bg = 'bg-primary-accent';
        extraStyles = `${bg} group hover:brightness-125 active:brightness-50`;
    } else {
        const bg = 'bg-text';
        extraStyles = `${bg} group hover:brightness-150 active:brightness-50`;
    }

    

    return (

        <TouchableOpacity
            className={`${baseStyles} ${extraStyles} ${className} ${isPressed ? pressedStyles : ''}`}
            onPressIn={() => setIsPressed(true)}
            onPressOut={() => setIsPressed(false)}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <Row className="items-center justify-center w-full h-full" pointerEvents='none'>
                {children}
            </Row>
            
        </TouchableOpacity>

    );
};

export default AppButton;
