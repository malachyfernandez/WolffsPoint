import React from 'react';
import AppButton from '../../ui/buttons/AppButton';
import PoppinsText from '../../ui/text/PoppinsText';

interface NewspaperAddColumnButtonProps {
    onPress: () => void;
}

const NewspaperAddColumnButton = ({ onPress }: NewspaperAddColumnButtonProps) => {
    return (
        <AppButton variant='black' className='w-40 h-8' onPress={onPress}>
            <PoppinsText weight='bold' className='text-white text-xl'>+</PoppinsText>
            <PoppinsText weight='bold' className='text-white'>Add Column</PoppinsText>
        </AppButton>
    );
};

export default NewspaperAddColumnButton;
