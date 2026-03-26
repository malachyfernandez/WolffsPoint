/**
 * AppButton - A versatile button component with multiple visual variants
 * 
 * This component provides a consistent button interface across the app with
 * built-in press animations, multiple styling variants, and accessibility features.
 * 
 * @example Basic Usage
 * ```tsx
 * <AppButton onPress={handlePress}>
 *   <PoppinsText>Click me</PoppinsText>
 * </AppButton>
 * ```
 * 
 * @example Different Variants
 * ```tsx
 * <AppButton variant="outline" onPress={handleCancel}>
 *   <PoppinsText>Cancel</PoppinsText>
 * </AppButton>
 * 
 * <AppButton variant="green" onPress={handleSubmit}>
 *   <PoppinsText color="white">Submit</PoppinsText>
 * </AppButton>
 * 
 * <AppButton variant="grey" onPress={handleDelete}>
 *   <PoppinsText color="white">Delete</PoppinsText>
 * </AppButton>
 * ```
 * 
 * @props {React.ReactNode} children - Content to display inside the button
 * @props {'outline' | 'outline-alt' | 'black' | 'grey' | 'green'} variant - Visual style variant (default: 'outline')
 * @props {string} className - Additional CSS classes for styling
 * @props {() => void} onPress - Function called when button is pressed
 * @props {boolean} dropShadow - Whether to show drop shadow (default: true)
 * 
 * @variants
 * - outline: Transparent background with border, hover effect fills background
 * - outline-alt: Similar to outline but with lighter hover effect
 * - black: Solid black/dark background with brightness hover effect
 * - grey: Solid grey background (#374559ae) with brightness hover effect
 * - green: Solid green background (primary-accent) with brightness hover effect
 * 
 * @features
 * - Built-in press animation with brightness changes
 * - TouchableOpacity with proper active opacity
 * - Consistent sizing (h-10) and rounded corners
 * - Proper accessibility with pointerEvents handling
 * - Gap spacing for internal content layout
 * 
 * @styling Notes
 * - Uses flexbox layout for consistent content alignment
 * - Base styles include overflow-hidden and rounded corners
 * - Press states use brightness filters for visual feedback
 * - Drop shadow can be disabled for cleaner designs
 */
import React, { useState } from 'react';
import { TouchableOpacity } from 'react-native';
import Row from '../../layout/Row';

interface AppButtonProps {
    children: React.ReactNode;
    variant?: 'outline' | 'outline-alt' | 'black' | 'grey' | 'green';
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
        
    } else if (variant === 'outline-alt') {
        const bg = 'bg-none';
        extraStyles = `border-2 border-border ${bg} group hover:bg-border/10`;
        
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
