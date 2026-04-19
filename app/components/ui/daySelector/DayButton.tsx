import React from 'react';
import { View } from 'react-native';
import AppButton from '../buttons/AppButton';
import FontText from '../text/FontText';
import Row from '../../layout/Row';

interface DayButtonProps {
    date: Date;
    index: number;
    label?: string;
    isSelected: boolean;
    showCurrentDayIndicator: boolean;
    onPress: () => void;
    children?: React.ReactNode;
}

const DayButton = ({ 
    date, 
    index, 
    label,
    isSelected, 
    showCurrentDayIndicator, 
    onPress,
    children
}: DayButtonProps) => {
    if (children) {
        return children;
    }

    return (
        <AppButton
            key={index}
            variant={isSelected ? "black" : "grey"}
            className='min-w-28 px-2 max-h-6'
            onPress={onPress}
        >
            <Row className='items-center' gap={2}>
                {showCurrentDayIndicator && (
                    <View className='w-1.5 h-1.5 bg-red-500 rounded-full' />
                )}
                <FontText className='text-white'>{label || `${date.getMonth() + 1}/${date.getDate()}`}</FontText>
            </Row>
        </AppButton>
    );
};

export default DayButton;
