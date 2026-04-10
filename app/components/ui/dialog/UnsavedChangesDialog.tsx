import React from 'react';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import AppButton from '../buttons/AppButton';
import PoppinsText from '../text/PoppinsText';
import ConvexDialog from './ConvexDialog';
import DialogHeader from './DialogHeader';

interface UnsavedChangesDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onStay: () => void;
    onLeave: () => void;
}

const UnsavedChangesDialog = ({ isOpen, onOpenChange, onStay, onLeave }: UnsavedChangesDialogProps) => {
    return (
        <ConvexDialog.Root isOpen={isOpen} onOpenChange={onOpenChange}>
            <ConvexDialog.Portal>
                <ConvexDialog.Overlay />
                <ConvexDialog.Content className='max-w-md p-6'>
                    <DialogHeader text="Unsaved Changes" />
                    <Column gap={4} className='pt-4'>
                        <PoppinsText className='text-center'>
                            You have unsaved changes. Are you sure you want to leave without saving?
                        </PoppinsText>
                        <Row className='justify-center gap-4 pt-4'>
                            <AppButton variant='outline' className='w-24' onPress={onStay}>
                                <PoppinsText weight='medium'>Stay</PoppinsText>
                            </AppButton>
                            <AppButton variant='filled' className='w-24' onPress={onLeave}>
                                <PoppinsText weight='medium' color='white'>Leave</PoppinsText>
                            </AppButton>
                        </Row>
                    </Column>
                </ConvexDialog.Content>
            </ConvexDialog.Portal>
        </ConvexDialog.Root>
    );
};

export default UnsavedChangesDialog;
