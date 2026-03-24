import React, { useCallback, useLayoutEffect, useRef } from 'react';
import { Platform, TextInput, TextInputProps, TextStyle } from 'react-native';
import { useFonts } from 'expo-font';

type FontWeight = 'regular' | 'medium' | 'bold';

interface PoppinsTextInputProps extends TextInputProps {
    className?: string;
    weight?: FontWeight;
    style?: TextStyle;
    autoGrow?: boolean;
}

const PoppinsTextInput = ({
    className = '',
    weight = 'regular',
    style,
    autoGrow = false,
    onChangeText,
    value,
    placeholder,
    ...props
}: PoppinsTextInputProps) => {
    const [fontsLoaded] = useFonts({
        'Poppins-Regular': require('../../../../assets/fonts/Poppins/Poppins-Regular.ttf'),
        'Poppins-Medium': require('../../../../assets/fonts/Poppins/Poppins-Medium.ttf'),
        'Poppins-Bold': require('../../../../assets/fonts/Poppins/Poppins-Bold.ttf'),
    });
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    const resizeTextarea = useCallback((textarea: HTMLTextAreaElement | null) => {
        if (!textarea) {
            return;
        }

        textarea.style.height = '0px';
        textarea.style.height = `${textarea.scrollHeight}px`;
    }, []);

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

    useLayoutEffect(() => {
        if (Platform.OS !== 'web' || !autoGrow || !textareaRef.current) {
            return;
        }

        const animationFrame = window.requestAnimationFrame(() => {
            resizeTextarea(textareaRef.current);
        });

        return () => {
            window.cancelAnimationFrame(animationFrame);
        };
    }, [autoGrow, fontsLoaded, resizeTextarea, value]);

    if (Platform.OS === 'web' && autoGrow) {
        return (
            <textarea
                ref={textareaRef}
                placeholder={placeholder}
                value={typeof value === 'string' ? value : ''}
                onChange={(event) => {
                    resizeTextarea(event.currentTarget);
                    onChangeText?.(event.target.value);
                }}
                rows={1}
                className={`${className} focus:outline-none rounded resize-none overflow-hidden`}
                style={{ fontFamily: fontsLoaded ? getFontFamily() : undefined, ...(style as React.CSSProperties), minHeight: 44 }}
            />
        );
    }

    return (
        <TextInput
            className={`${className} focus:outline-none rounded`}
            style={{ fontFamily: fontsLoaded ? getFontFamily() : undefined, color: 'text', ...style }}
            placeholderTextColor="#9CA3AF"
            value={value}
            placeholder={placeholder}
            onChangeText={onChangeText}
            {...props}
        />
    );
};

export default PoppinsTextInput;
