import React from 'react';
import AppButton from '../../ui/buttons/AppButton';
import Row from '../../layout/Row';
import FontText from '../../ui/text/FontText';

interface NewspaperColumnHeaderProps {
    columnIndex: number;
    onRemove: () => void;
}

const NewspaperColumnHeader = ({ columnIndex, onRemove }: NewspaperColumnHeaderProps) => {
    return (
        <Row className='gap-2 h-12 items-center justify-between border-b border-border bg-background px-3'>
            <FontText weight='medium'>Column {columnIndex + 1}</FontText>
            <AppButton
                variant='grey'
                className='w-6 max-h-6 mr-[0.1rem]'
                onPress={onRemove}
            >
                <FontText weight='bold' color='white' className='text-xl'>-</FontText>
            </AppButton>
        </Row>
    );
};

export default NewspaperColumnHeader;
