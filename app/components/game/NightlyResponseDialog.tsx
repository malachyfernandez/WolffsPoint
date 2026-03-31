import React, { useState } from 'react';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import Column from '../layout/Column';
import AppButton from '../ui/buttons/AppButton';
import PoppinsText from '../ui/text/PoppinsText';
import PoppinsTextInput from '../ui/forms/PoppinsTextInput';
import DialogHeader from '../ui/dialog/DialogHeader';
import { View } from 'react-native';

interface NightlyResponseDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    dayIndex: number;
    userIndex: number;
    userName: string;
    currentResponse: string;
    onPress: () => void;
    updateNightlyResponse: (dayIndex: number, userIndex: number, value: string) => void;
}

const NightlyResponseDialog = ({ 
    isOpen, 
    onOpenChange, 
    dayIndex, 
    userIndex, 
    userName, 
    currentResponse, 
    onPress, 
    updateNightlyResponse 
}: NightlyResponseDialogProps) => {
    const [response, setResponse] = useState(currentResponse || '');

    const handleSubmit = () => {
        updateNightlyResponse(dayIndex, userIndex, response.trim());
        onOpenChange(false);
    };

    const handleCancel = () => {
        setResponse(currentResponse || '');
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
                            text={`${userName} Nightly Response`}
                            subtext={`Set the nightly response for ${userName} on Day ${dayIndex + 1}`}
                        />
                        <Column gap={2}>
                            <PoppinsTextInput
                                placeholder="Enter nightly response..."
                                className="w-full border border-subtle-border p-2"
                                value={response}
                                onChangeText={setResponse}
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

export default NightlyResponseDialog;
