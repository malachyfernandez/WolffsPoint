import React, { useEffect, useMemo, useState } from 'react';
import { TextInput, TextInputProps, TextStyle, Text, View } from 'react-native';
import { useFonts } from 'expo-font';
import Row from 'app/components/layout/Row';

type FontWeight = 'regular' | 'medium' | 'bold';

interface PoppinsNumberInputProps extends Omit<TextInputProps, 'value' | 'onChangeText' | 'keyboardType'> {
    className?: string;
    weight?: FontWeight;
    style?: TextStyle;
    value?: string | number;
    onChangeText?: (displayValue: string, isValid: boolean, numericValue: number | null) => void;
    minValue?: number;
    maxValue?: number;
    inline?: boolean;
    useDefaultStyling?: boolean;
}

const sanitizeInput = (value?: string | number) => {
    const raw = value === undefined || value === null ? '' : String(value);
    return raw.replace(/[^0-9]/g, '');
};

const PoppinsNumberInput = ({
    className = '',
    weight = 'regular',
    style,
    value = '',
    onChangeText,
    minValue,
    maxValue,
    inline,
    useDefaultStyling = false,
    ...props
}: PoppinsNumberInputProps) => {
    const [fontsLoaded] = useFonts({
        'Poppins-Regular': require('../../../../assets/fonts/Poppins/Poppins-Regular.ttf'),
        'Poppins-Medium': require('../../../../assets/fonts/Poppins/Poppins-Medium.ttf'),
        'Poppins-Bold': require('../../../../assets/fonts/Poppins/Poppins-Bold.ttf'),
    });

    const [inputValue, setInputValue] = useState(() => sanitizeInput(value));

    useEffect(() => {
        setInputValue(sanitizeInput(value));
    }, [value]);

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

    const numericValue = useMemo(() => {
        if (!inputValue.length) return null;
        const parsed = Number(inputValue);
        return Number.isNaN(parsed) ? null : parsed;
    }, [inputValue]);

    const meetsBounds = useMemo(() => {
        if (numericValue === null) return false;
        if (minValue !== undefined && numericValue < minValue) return false;
        if (maxValue !== undefined && numericValue > maxValue) return false;
        return true;
    }, [numericValue, minValue, maxValue]);

    const showError = inputValue.length > 0 && !meetsBounds;

    const helperText = useMemo(() => {
        if (showError && numericValue !== null) {
            if (minValue !== undefined && numericValue < minValue) {
                return `Value must be at least ${minValue}`;
            }
            if (maxValue !== undefined && numericValue > maxValue) {
                return `Value must be at most ${maxValue}`;
            }
        }
        if (!inputValue.length && (minValue !== undefined || maxValue !== undefined)) {
            if (minValue !== undefined && maxValue !== undefined) {
                return `Enter ${minValue}-${maxValue}`;
            }
            if (minValue !== undefined) {
                return `Minimum ${minValue}`;
            }
            if (maxValue !== undefined) {
                return `Maximum ${maxValue}`;
            }
        }
        return ' ';
    }, [showError, numericValue, minValue, maxValue, inputValue.length]);

    const handleChangeText = (text: string) => {
        const sanitized = text.replace(/[^0-9]/g, '');
        setInputValue(sanitized);

        if (onChangeText) {
            const parsed = sanitized.length ? Number(sanitized) : null;
            const isValid = Boolean(parsed !== null && !Number.isNaN(parsed) && (!minValue || parsed >= minValue) && (!maxValue || parsed <= maxValue));
            onChangeText(sanitized, isValid, parsed);
        }
    };

    const allGoodText = useMemo(() => {
         if (minValue !== undefined || maxValue !== undefined) {
            if (minValue !== undefined && maxValue !== undefined) {
                return `${minValue}-${maxValue} ✓`;
            }
            if (minValue !== undefined) {
                return `Minimum ${minValue} ✓`;
            }
            if (maxValue !== undefined) {
                return `Maximum ${maxValue} ✓`;
            }
        }
        return '';
    }, [showError, numericValue, minValue, maxValue, inputValue.length]);

    return (
        <>
            {
                inline ? (
                    <View className="w-20" >
                        <TextInput
                            className={`${className} ${useDefaultStyling ? 'h-10 pl-4 border border-subtle-border' : ''} focus:outline-none rounded ${showError ? 'border-red-500' : ''}`}
                            style={{ fontFamily: fontsLoaded ? getFontFamily() : undefined, color: 'text', ...style }}
                            placeholderTextColor="#9CA3AF"
                            keyboardType="numeric"
                            value={inputValue}
                            onChangeText={handleChangeText}
                            {...props}
                        />
                        <Row className='h-10 overflow-visible absolute -bottom-10'>
                        {helperText.length > 0 && (
                            <Text className={`text-sm text-nowrap mt-1 ${showError ? 'text-red-500' : 'text-gray-600'}`} style={{ fontFamily: fontsLoaded ? 'Poppins-Regular' : undefined }}>
                                {helperText}
                            </Text>
                        )
                        }
                        </Row>
                    </View >
                ) : (
                    <View className="w-full">
                        <TextInput
                            className={`${className} ${useDefaultStyling ? 'h-10 pl-4 border border-subtle-border' : ''} focus:outline-none rounded ${showError ? 'border-red-500' : ''}`}
                            style={{ fontFamily: fontsLoaded ? getFontFamily() : undefined, color: 'text', ...style }}
                            placeholderTextColor="#9CA3AF"
                            keyboardType="numeric"
                            value={inputValue}
                            onChangeText={handleChangeText}
                            {...props}
                        />
                        {helperText.length > 0 && (
                            <Text className={`text-sm mt-1 ${showError ? 'text-red-500' : 'text-gray-600'}`} style={{ fontFamily: fontsLoaded ? 'Poppins-Regular' : undefined }}>
                                {helperText}
                            </Text>
                        )}
                    </View>
                )}
        </>
    );
};

export default PoppinsNumberInput;
