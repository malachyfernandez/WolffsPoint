import React from 'react';
import { View } from 'react-native';
import PoppinsText from '../../text/PoppinsText';

interface AppDropdownEmptyStateProps {
    className?: string;
    text: string;
}

const AppDropdownEmptyState = ({ className = '', text }: AppDropdownEmptyStateProps) => {
    return (
        <View className='px-4 py-4'>
            <PoppinsText varient='subtext' className={`text-center opacity-60 ${className}`.trim()}>
                {text}
            </PoppinsText>
        </View>
    );
};

export default AppDropdownEmptyState;
