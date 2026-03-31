import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';

interface CheckboxProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
}

const CustomCheckbox = ({ checked, onChange }: CheckboxProps) => {
    return (
        <TouchableOpacity
            onPress={() => onChange(!checked)}
            style={[
                styles.checkbox,
                checked ? styles.checked : styles.unchecked
            ]}
        >
            {checked && (
                <View style={styles.xContainer}>
                    <Text style={styles.xText}>×</Text>
                </View>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checked: {
        backgroundColor: '#ef4444',
        borderColor: '#dc2626',
    },
    unchecked: {
        backgroundColor: '#22c55e',
        borderColor: '#16a34a',
    },
    xContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    xText: {
        color: '#991b1b',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default CustomCheckbox;
