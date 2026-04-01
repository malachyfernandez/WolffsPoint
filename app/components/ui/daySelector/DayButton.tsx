import React from 'react';
import { View } from 'react-native';
import AppButton from '../buttons/AppButton';
import PoppinsText from '../text/PoppinsText';
import Row from '../../layout/Row';

interface DayButtonProps {
    date: Date;
    index: number;
    isSelected: boolean;
    showCurrentDayIndicator: boolean;
    onPress: () => void;
    children?: React.ReactNode;
}

const DayButton = ({ 
    date, 
    index, 
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
            className='w-16 max-h-6'
            onPress={onPress}
        >
            <Row className='items-center' gap={2}>
                {showCurrentDayIndicator && (
                    <View className='w-1.5 h-1.5 bg-red-500 rounded-full' />
                )}
                <PoppinsText className='text-white'>{date.getMonth() + 1}/{date.getDate()}</PoppinsText>
            </Row>
        </AppButton>
    );
};

export default DayButton;
