import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import NewspaperColumnDialogContent from './NewspaperColumnDialogContent';
import Column from '../layout/Column';
import Row from '../layout/Row';
import AppButton from '../ui/buttons/AppButton';
import PoppinsText from '../ui/text/PoppinsText';
import Alert from '../ui/alert/Alert';

interface NewspaperColumnDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    columnIndex: number;
    currentMarkdown: string;
    setColumnMarkdown: (columnIndex: number, markdown: string) => void;
}

const NewspaperColumnDialog = ({
    isOpen,
    onOpenChange,
    columnIndex,
    currentMarkdown,
    setColumnMarkdown,
}: NewspaperColumnDialogProps) => {
    const [message, setMessage] = useState(currentMarkdown || '');
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setMessage(currentMarkdown || '');
        }
    }, [currentMarkdown, isOpen]);

    const handleSubmit = () => {
        setColumnMarkdown(columnIndex, message.trim());
        onOpenChange(false);
    };

    const handleCancel = () => {
        if (message.trim() !== currentMarkdown.trim()) {
            // There are unsaved changes, show confirmation dialog
            setShowConfirmDialog(true);
        } else {
            // No changes, close normally
            setMessage(currentMarkdown || '');
            onOpenChange(false);
        }
    };

    const handleConfirmCancel = () => {
        // User confirmed they want to discard changes
        setMessage(currentMarkdown || '');
        setShowConfirmDialog(false);
        onOpenChange(false);
    };

    const handleKeepEditing = () => {
        // User decided to keep editing
        setShowConfirmDialog(false);
    };

    return (
        <>
            <ConvexDialog.Root isOpen={isOpen} onOpenChange={onOpenChange}>
                <ConvexDialog.Trigger asChild>
                    <View />
                </ConvexDialog.Trigger>
                <ConvexDialog.Portal>
                    <ConvexDialog.Overlay />

                    <ConvexDialog.Content className='p-1 h-[85vh]'>
                        <ConvexDialog.Close iconProps={{ color: 'rgb(246, 238, 219)' }} className="w-10 h-10 bg-accent-hover absolute right-4 top-4 z-10" />
                        <NewspaperColumnDialogContent
                            columnIndex={columnIndex}
                            message={message}
                            originalMessage={currentMarkdown || ''}
                            setMessage={setMessage}
                            onSubmit={handleSubmit}
                            onCancel={handleCancel}
                        />

                    </ConvexDialog.Content>
                </ConvexDialog.Portal>
            </ConvexDialog.Root >

            {/* Confirmation Alert for unsaved changes */}
            <Alert
                isOpen={showConfirmDialog}
                onOpenChange={setShowConfirmDialog}
                title="Unsaved Changes"
                message="You have unsaved changes. Are you sure you want to discard them?"
                buttons={[
                    {
                        text: 'Keep Editing',
                        variant: 'black',
                        onPress: handleKeepEditing,
                    },
                    {
                        text: 'Discard',
                        variant: 'outline',
                        onPress: handleConfirmCancel,
                    }
                ]}
            />
        </>
    );
};

export default NewspaperColumnDialog;
