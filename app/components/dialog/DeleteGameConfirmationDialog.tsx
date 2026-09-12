import React from 'react';
import { View } from 'react-native';
import AppButton from '../ui/buttons/AppButton';
import FontText from '../ui/text/FontText';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import DialogHeader from '../ui/dialog/DialogHeader';
import Column from '../layout/Column';
import { useKeyboardShortcuts } from '../../../hooks/useKeyboardShortcuts';
import { useKeyboardShortcutHint } from '../../../contexts/KeyboardShortcutHintContext';
import CloseButton from '../ui/dialog/CloseButton';

interface DeleteGameConfirmationDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
}

const DeleteGameConfirmationDialog = ({ isOpen, onOpenChange, onConfirm }: DeleteGameConfirmationDialogProps) => {
    const { setHint } = useKeyboardShortcutHint();

    // Enter = primary action (confirm delete), Esc = cancel
    useKeyboardShortcuts({
        onPrimaryAction: onConfirm,
        onClose: () => onOpenChange(false),
        enabled: isOpen,
    });

        return (
        <ConvexDialog.Root isOpen={isOpen} onOpenChange={onOpenChange}>
            <ConvexDialog.Portal>
                <ConvexDialog.Overlay />
                <ConvexDialog.Content>
                    <CloseButton onPress={() => onOpenChange(false)} />
                    <Column className='gap-4'>
                        <DialogHeader text='Delete Game' subtext='This action cannot be undone' />

                        <Column className='gap-4 pt-5 px-5 pb-5'>
                            <FontText className='text-center'>
                                Are you sure you want to delete this game? All game data will be permanently removed.
                            </FontText>

                            <View className='flex-row gap-3 mt-4'>
                                <AppButton
                                    variant='outline'
                                    className='flex-1 h-12'
                                    onPress={() => onOpenChange(false)}
                                    onHoverIn={() => setHint(['esc'])}
                                    onHoverOut={() => setHint(null)}
                                >
                                    <FontText weight='medium'>
                                        Cancel
                                    </FontText>
                                </AppButton>
                                <AppButton
                                    variant='red'
                                    className='flex-1 h-12'
                                    onPress={onConfirm}
                                    onHoverIn={() => setHint(['enter'])}
                                    onHoverOut={() => setHint(null)}
                                >
                                    <FontText weight='medium' color='red'>
                                        Delete Game
                                    </FontText>
                                </AppButton>
                            </View>
                        </Column>
                    </Column>
                </ConvexDialog.Content>
            </ConvexDialog.Portal>
        </ConvexDialog.Root>
    );
};

export default DeleteGameConfirmationDialog;
