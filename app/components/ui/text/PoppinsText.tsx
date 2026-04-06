import React, { PropsWithChildren } from 'react';
import { Text, TextStyle, LayoutChangeEvent } from 'react-native';
import { useFonts } from 'expo-font';
import { useCSSVariable } from 'uniwind';

type FontWeight = 'regular' | 'medium' | 'bold';
type PoppinsTextVarient = 'default' | 'heading' | 'subtext' | 'cardHeader' | 'lowercaseCardHeader';
type TextColor = 'black' | 'white' | 'red';

interface PoppinsTextProps extends PropsWithChildren {
    className?: string;
    weight?: FontWeight;
    varient?: PoppinsTextVarient;
    color?: TextColor | string | 'text-inverted';
    style?: TextStyle;
    onLayout?: (event: LayoutChangeEvent) => void;
}

const PoppinsText = ({
    children,
    className = '',
    weight = 'regular',
    varient = 'default',
    color = '',
    style,
    onLayout
}: PoppinsTextProps) => {
    const [fontsLoaded] = useFonts({
        'Poppins-Regular': require('../../../../assets/fonts/Poppins/Poppins-Regular.ttf'),
        'Poppins-Medium': require('../../../../assets/fonts/Poppins/Poppins-Medium.ttf'),
        'Poppins-Bold': require('../../../../assets/fonts/Poppins/Poppins-Bold.ttf'),
    });

    const resolvedColor = String(useCSSVariable(`--color-${color}`) || color);



    if (varient === 'subtext') {
        className += ' text-sm opacity-70';
    }

    if (varient === 'cardHeader') {
        className += ' text-xs opacity-70 uppercase tracking-wider';
    }

    if (varient === 'lowercaseCardHeader') {
        className += ' text-xs opacity-70 tracking-wider';
    }

    if (!fontsLoaded) {
        return (
        <Text
            className={`text-text ${className}`}
            style={{color: resolvedColor, ...style }}
            onLayout={onLayout}
        >
            {children}
        </Text>
    );
    }

    const getFontFamily = () => {
        switch (weight) {
            case 'medium':
                return 'Poppins-Medium';
            case 'bold':
                return 'Poppins-Bold';
            default:
                return 'Poppins-Regular';
        }
    };

    return (
        <Text
            className={`text-text ${className}`}
            style={{ fontFamily: getFontFamily(), color: resolvedColor, ...style }}
            onLayout={onLayout}
        >
            {children}
        </Text>
    );
};

export default PoppinsText;
