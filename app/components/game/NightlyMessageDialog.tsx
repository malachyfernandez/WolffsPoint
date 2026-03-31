import React, { useState } from 'react';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import Column from '../layout/Column';
import AppButton from '../ui/buttons/AppButton';
import PoppinsText from '../ui/text/PoppinsText';
import PoppinsTextInput from '../ui/forms/PoppinsTextInput';
import DialogHeader from '../ui/dialog/DialogHeader';
import { View } from 'react-native';

interface NightlyMessageDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    dayIndex: number;
    userIndex: number;
    userName: string;
    currentMessage: string;
    onPress: () => void;
    updateNightlyMessage: (dayIndex: number, userIndex: number, value: string) => void;
}

const NightlyMessageDialog = ({ 
    isOpen, 
    onOpenChange, 
    dayIndex, 
    userIndex, 
    userName, 
    currentMessage, 
    onPress, 
    updateNightlyMessage 
}: NightlyMessageDialogProps) => {
    const [message, setMessage] = useState(currentMessage || '');

    const handleSubmit = () => {
        updateNightlyMessage(dayIndex, userIndex, message.trim());
        onOpenChange(false);
    };

    const handleCancel = () => {
        setMessage(currentMessage || '');
        onOpenChange(false);
    };

    return (
        <ConvexDialog.Root isOpen={isOpen} onOpenChange={onOpenChange}>
            <ConvexDialog.Trigger asChild>
                <View>
                    {/* This will be replaced by the actual pressable in NightlyDayUserRow */}
                </View>
            </ConvexDialog.Trigger>
            <ConvexDialog.Portal>
                <ConvexDialog.Overlay />

                <ConvexDialog.Content>
                    <ConvexDialog.Close iconProps={{ color: 'rgb(246, 238, 219)' }} className="w-10 h-10 bg-accent-hover absolute right-4 top-4 z-10" />

                    <Column>
                        <DialogHeader
                            text={`${userName} Nightly Message`}
                            subtext={`Set the nightly message for ${userName} on Day ${dayIndex + 1}`}
                        />
                        <Column gap={2}>
                            <PoppinsTextInput
                                placeholder="Enter nightly message..."
                                className="w-full border border-subtle-border p-2"
                                value={message}
                                onChangeText={setMessage}
                                multiline
                                numberOfLines={4}
                                style={{ minHeight: 80 }}
                            />
                        </Column>

                        <Column gap={2}>
                            <AppButton className='w-34 h-10' variant='black' onPress={handleSubmit}>
                                <PoppinsText color='white' weight='medium'>Save</PoppinsText>
                            </AppButton>
                            <AppButton className='w-34 h-10' variant='outline' onPress={handleCancel}>
                                <PoppinsText color='black' weight='medium'>Cancel</PoppinsText>
                            </AppButton>
                        </Column>
                    </Column>
                </ConvexDialog.Content>
            </ConvexDialog.Portal>
        </ConvexDialog.Root>
    );
};

export default NightlyMessageDialog;
