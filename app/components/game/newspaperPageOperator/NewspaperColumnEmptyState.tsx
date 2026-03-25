import React from 'react';
import Column from '../../layout/Column';
import PoppinsText from '../../ui/text/PoppinsText';

const NewspaperColumnEmptyState = () => {
    return (
        <Column className='border-2 border-dashed border-border/50 p-4 rounded-lg min-h-40 items-center justify-center'>
            <PoppinsText className='text-center opacity-60'>No Story Yet!</PoppinsText>
        </Column>
    );
};

export default NewspaperColumnEmptyState;
