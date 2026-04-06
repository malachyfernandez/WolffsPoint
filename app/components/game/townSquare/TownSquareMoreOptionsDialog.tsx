import React from 'react';
import { View } from 'react-native';
import ConvexDialog from '../../ui/dialog/ConvexDialog';
import DialogHeader from '../../ui/dialog/DialogHeader';
import Column from '../../layout/Column';
import AppButton from '../../ui/buttons/AppButton';
import PoppinsText from '../../ui/text/PoppinsText';
import { MoreComposerAction } from './townSquareUtils';

interface TownSquareMoreOptionsDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSelectAction: (action: MoreComposerAction) => void;
}

const actionOptions: { action: MoreComposerAction; label: string }[] = [
    { action: 'heading', label: 'Heading' },
    { action: 'quote', label: 'Quote' },
    { action: 'bullets', label: 'Bullets' },
    { action: 'numbered', label: 'Numbered' },
    { action: 'divider', label: 'Divider' },
];

const TownSquareMoreOptionsDialog = ({ isOpen, onOpenChange, onSelectAction }: TownSquareMoreOptionsDialogProps) => {
    return (
        <ConvexDialog.Root isOpen={isOpen} onOpenChange={onOpenChange}>
            <ConvexDialog.Trigger asChild>
                <View />
            </ConvexDialog.Trigger>
            <ConvexDialog.Portal>
                <ConvexDialog.Overlay />
                <ConvexDialog.Content className='p-1 max-w-xl'>
                    <ConvexDialog.Close iconProps={{ color: 'rgb(246, 238, 219)' }} className='absolute right-4 top-4 z-10 h-10 w-10 bg-accent-hover' />
                    <DialogHeader text='More formatting' />
                    <Column className='p-5' gap={3}>
                        {actionOptions.map((option) => (
                            <AppButton
                                key={option.action}
                                className='w-full justify-start px-4'
                                variant='outline'
                                onPress={() => {
                                    onSelectAction(option.action);
                                    onOpenChange(false);
                                }}
                            >
                                <PoppinsText weight='medium'>{option.label}</PoppinsText>
                            </AppButton>
                        ))}
                    </Column>
                </ConvexDialog.Content>
            </ConvexDialog.Portal>
        </ConvexDialog.Root>
    );
};

export default TownSquareMoreOptionsDialog;
