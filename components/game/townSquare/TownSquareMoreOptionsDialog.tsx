import React from 'react';
import { View } from 'react-native';
import ConvexDialog from '../../ui/dialog/ConvexDialog';
import DialogHeader from '../../ui/dialog/DialogHeader';
import Column from '../../layout/Column';
import AppButton from '../../ui/buttons/AppButton';
import FontText from '../../ui/text/FontText';
import { MoreComposerAction } from './townSquareUtils';
import CloseButton from '../../ui/dialog/CloseButton';

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
                    <CloseButton onPress={() => onOpenChange(false)} />
                    <DialogHeader text='More formatting' />
                    <Column className='gap-3 p-5'>
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
                                <FontText weight='medium'>{option.label}</FontText>
                            </AppButton>
                        ))}
                    </Column>
                </ConvexDialog.Content>
            </ConvexDialog.Portal>
        </ConvexDialog.Root>
    );
};

export default TownSquareMoreOptionsDialog;
