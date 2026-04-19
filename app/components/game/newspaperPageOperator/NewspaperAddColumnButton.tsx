import React from 'react';
import AppButton from '../../ui/buttons/AppButton';
import FontText from '../../ui/text/FontText';

interface NewspaperAddColumnButtonProps {
    onPress: () => void;
}

const NewspaperAddColumnButton = ({ onPress }: NewspaperAddColumnButtonProps) => {
    return (
        <AppButton variant='filled' className='w-40' onPress={onPress}>
            <FontText weight='bold' className='text-white text-xl'>+</FontText>
            <FontText weight='bold' className='text-white'>Add Column</FontText>
        </AppButton>
    );
};

export default NewspaperAddColumnButton;
