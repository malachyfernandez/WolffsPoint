import React from 'react';
import { TextInput, TextInputProps, TextStyle } from 'react-native';
import { useFonts } from 'expo-font';

type FontWeight = 'regular' | 'medium' | 'bold';

interface PoppinsTextInputProps extends TextInputProps {
    className?: string;
    weight?: FontWeight;
    style?: TextStyle;
}

const PoppinsTextInput = ({ 
    className = '', 
    weight = 'regular', 
    style,
    ...props 
}: PoppinsTextInputProps) => {
    const [fontsLoaded] = useFonts({
        'Poppins-Regular': require('../../../../assets/fonts/Poppins/Poppins-Regular.ttf'),
        'Poppins-Medium': require('../../../../assets/fonts/Poppins/Poppins-Medium.ttf'),
        'Poppins-Bold': require('../../../../assets/fonts/Poppins/Poppins-Bold.ttf'),
    });

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
        <TextInput 
            className={`${className} focus:outline-none rounded`}
            style={{ fontFamily: fontsLoaded ? getFontFamily() : undefined, color: 'text', ...style }}
            placeholderTextColor="#9CA3AF"
            {...props}
        />
    );
};

export default PoppinsTextInput;
