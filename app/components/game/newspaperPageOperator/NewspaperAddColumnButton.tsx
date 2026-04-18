import React from 'react';
import AppButton from '../../ui/buttons/AppButton';
import PoppinsText from '../../ui/text/PoppinsText';

interface NewspaperAddColumnButtonProps {
    onPress: () => void;
}

const NewspaperAddColumnButton = ({ onPress }: NewspaperAddColumnButtonProps) => {
    return (
        <AppButton variant='accent' className='w-40' guildedHeight={40} onPress={onPress}>
            <PoppinsText weight='bold' className='text-white text-xl'>+</PoppinsText>
            <PoppinsText weight='bold' className='text-white'>Add Column</PoppinsText>
        </AppButton>
    );
};

export default NewspaperAddColumnButton;
