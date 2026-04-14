import React from 'react';
import { View } from 'react-native';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import DialogHeader from '../ui/dialog/DialogHeader';
import Column from '../layout/Column';
import Row from '../layout/Row';
import AppButton from '../ui/buttons/AppButton';
import PoppinsText from '../ui/text/PoppinsText';
import { ColumnSizeOption } from './playerTableColumnSizing';

interface ColumnActionsDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    selectedSize: ColumnSizeOption;
    onSelectSize: (size: ColumnSizeOption) => void;
    onDelete?: () => void;
}

const sizeOptions: { value: ColumnSizeOption; label: string; description: string }[] = [
    { value: 'small', label: 'Small', description: 'Default width' },
    { value: 'medium', label: '2x', description: 'Double width' },
    { value: 'large', label: '3x', description: 'Triple width' },
];

const ColumnActionsDialog = ({ isOpen, onOpenChange, title, selectedSize, onSelectSize, onDelete }: ColumnActionsDialogProps) => {
    return (
        <ConvexDialog.Root isOpen={isOpen} onOpenChange={onOpenChange}>
            <ConvexDialog.Trigger asChild>
                <View />
            </ConvexDialog.Trigger>
            <ConvexDialog.Portal>
                <ConvexDialog.Overlay />
                <ConvexDialog.Content className='max-w-md p-1'>
                    <ConvexDialog.Close iconProps={{ color: 'rgb(246, 238, 219)' }} className='absolute right-4 top-4 z-10 h-10 w-10 bg-accent-hover' />
                    <DialogHeader text={title} />
                    <Column className='p-5 pt-4' gap={3}>
                        {sizeOptions.map((option) => (
                            <AppButton
                                key={option.value}
                                className='w-full justify-between px-4'
                                variant={selectedSize === option.value ? 'filled' : 'outline'}
                                onPress={() => {
                                    onSelectSize(option.value);
                                    onOpenChange(false);
                                }}
                            >
                                <Row className='w-full items-center justify-between'>
                                    <PoppinsText color={selectedSize === option.value ? 'white' : 'black'} weight='medium'>
                                        {option.label}
                                    </PoppinsText>
                                    <PoppinsText color={selectedSize === option.value ? 'white' : 'black'} className={selectedSize === option.value ? 'opacity-80' : 'opacity-50'}>
                                        {option.description}
                                    </PoppinsText>
                                </Row>
                            </AppButton>
                        ))}

                        {onDelete ? (
                            <AppButton
                                className='w-full justify-center px-4 mt-2'
                                variant='red'
                                onPress={() => {
                                    onDelete();
                                    onOpenChange(false);
                                }}
                            >
                                <PoppinsText weight='medium' color='red'>Delete Column</PoppinsText>
                            </AppButton>
                        ) : null}
                    </Column>
                </ConvexDialog.Content>
            </ConvexDialog.Portal>
        </ConvexDialog.Root>
    );
};

export default ColumnActionsDialog;
