import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import NewspaperColumnDialogContent from './NewspaperColumnDialogContent';

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
        setMessage(currentMarkdown || '');
        onOpenChange(false);
    };

    return (
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
                        setMessage={setMessage}
                        onSubmit={handleSubmit}
                        onCancel={handleCancel}
                    />

                </ConvexDialog.Content>
            </ConvexDialog.Portal>
        </ConvexDialog.Root >
    );
};

export default NewspaperColumnDialog;
