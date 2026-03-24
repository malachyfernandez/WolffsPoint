import React from 'react';
import AppButton from '../../ui/buttons/AppButton';
import Row from '../../layout/Row';
import PoppinsText from '../../ui/text/PoppinsText';

interface NewspaperColumnHeaderProps {
    columnIndex: number;
    onRemove: () => void;
}

const NewspaperColumnHeader = ({ columnIndex, onRemove }: NewspaperColumnHeaderProps) => {
    return (
        <Row className='h-12 items-center justify-between border-b border-border bg-background px-3' gap={2}>
            <PoppinsText weight='medium'>Column {columnIndex + 1}</PoppinsText>
            <AppButton
                variant='grey'
                className='w-6 max-h-6 mr-[0.1rem]'
                onPress={onRemove}
            >
                <PoppinsText weight='bold' color='white' className='text-xl'>-</PoppinsText>
            </AppButton>
        </Row>
    );
};

export default NewspaperColumnHeader;
