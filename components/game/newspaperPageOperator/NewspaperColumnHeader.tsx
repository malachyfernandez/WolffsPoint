import React, { useState } from 'react';
import AppButton from '../../ui/buttons/AppButton';
import Row from '../../layout/Row';
import FontText from '../../ui/text/FontText';
import DeleteConfirmationDialog from '../DeleteRoleConfirmationDialog';

interface NewspaperColumnHeaderProps {
    columnIndex: number;
    onRemove: () => void;
    showRemove: boolean;
}

const NewspaperColumnHeader = ({ columnIndex, onRemove, showRemove }: NewspaperColumnHeaderProps) => {
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    return (
        <>
        <Row className='gap-2 h-12 items-center justify-between border-b border-border bg-background px-3'>
            <FontText weight='medium'>Column {columnIndex + 1}</FontText>
            {showRemove && (
                <AppButton
                    variant='grey'
                    className='w-6 max-h-6 mr-[0.1rem]'
                    onPress={() => setIsDeleteConfirmOpen(true)}
                >
                    <FontText weight='bold' color='white' className='text-xl'>-</FontText>
                </AppButton>
            )}
        </Row>

        <DeleteConfirmationDialog
            isOpen={isDeleteConfirmOpen}
            onOpenChange={setIsDeleteConfirmOpen}
            onConfirm={() => {
                onRemove();
            }}
            itemType="Column"
            itemName={`Column ${columnIndex + 1}`}
        />
        </>
    );
};

export default NewspaperColumnHeader;
