import React from 'react';
import Column from '../../layout/Column';
import FontText from '../../ui/text/FontText';

const NewspaperColumnEmptyState = () => {
    return (
        <Column className='border-2 border-dashed border-border/50 p-4 rounded-lg min-h-40 items-center justify-center'>
            <FontText className='text-center opacity-60'>No Story Yet!</FontText>
        </Column>
    );
};

export default NewspaperColumnEmptyState;
