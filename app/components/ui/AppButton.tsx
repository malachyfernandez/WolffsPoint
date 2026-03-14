import React, { useState } from 'react';
import { TouchableOpacity, ViewStyle, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { cssInterop } from "nativewind";

// Enable NativeWind for BlurView
cssInterop(BlurView, { className: "style" });

interface AppButtonProps {
    children: React.ReactNode;
    variant?: 'outline' | 'blue' | 'grey';
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

    const getButtonStyles = (): string => {
        
        const baseStyles = 'h-10 flex items-center justify-center rounded flex-row gap-2 overflow-hidden hover:brightness-75 px-4';
        
        if (variant === 'outline') {
            const bg = isPressed ? 'bg-[#0a0d1a]' : 'bg-[#0f1627bf]';
            return `${baseStyles} border border-white/30 ${bg}`;
        } else if (variant === 'grey') {
            const bg = isPressed ? 'bg-[#47556950]' : 'bg-[#475569ae]';
            return `${baseStyles} ${bg}`;
        } else {
            const bg = isPressed ? 'bg-[#026aa0]' : 'bg-[#0284C7]';
            return `${baseStyles} ${bg}`;
        }
    };

    const shadowStyle = {
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 0,
        },
        shadowOpacity: 0.58,
        shadowRadius: 16.00,
        elevation: 24,
    };

    const needsBlur = variant === 'grey' || variant === 'outline';

    return (
        
        <View 
            // className={`rounded-sm`} 
            style={dropShadow ? shadowStyle : undefined}
        >
            <TouchableOpacity
                className={`${getButtonStyles()} ${className}`}
                // Removed shadowStyle from here
                onPressIn={() => setIsPressed(true)}
                onPressOut={() => setIsPressed(false)}
                onPress={onPress}
                activeOpacity={1}
            >
                {needsBlur && (
                    <BlurView 
                        intensity={50} 
                        tint="dark" 
                        
                        className="absolute inset-0" 
                    />
                )}
                <View className="z-10 flex-row items-center justify-center gap-2 ">
                    {children}
                </View>
            </TouchableOpacity>
        </View>
    );
};

export default AppButton;
