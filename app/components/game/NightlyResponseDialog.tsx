import React, { useState } from 'react';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import Column from '../layout/Column';
import AppButton from '../ui/buttons/AppButton';
import FontText from '../ui/text/FontText';
import FontTextInput from '../ui/forms/FontTextInput';
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
                    <ConvexDialog.Close iconProps={{ color: 'rgb(246, 238, 219)' }} className="w-10 h-10 bg-text-inverted/10 hover:bg-text-inverted/15 rounded-full absolute right-0 top-0 z-10" />

                    <Column className='gap-4'>
                        <DialogHeader
                            text={`${userName} Nightly Response`}
                            subtext={`Set the nightly response for ${userName} on Day ${dayIndex + 1}`}
                        />
                        <Column className='gap-2'>
                            <FontTextInput
                                placeholder="Enter nightly response..."
                                className="w-full border border-subtle-border p-2"
                                value={response}
                                onChangeText={setResponse}
                                multiline
                                numberOfLines={4}
                                style={{ minHeight: 80 }}
                            />
                        </Column>

                        <Column className='gap-2'>
                            <AppButton className='w-34 h-10' variant='black' onPress={handleSubmit}>
                                <FontText color='white' weight='medium'>Save</FontText>
                            </AppButton>
                            <AppButton className='w-34 h-10' variant='outline' onPress={handleCancel}>
                                <FontText color='black' weight='medium'>Cancel</FontText>
                            </AppButton>
                        </Column>
                    </Column>
                </ConvexDialog.Content>
            </ConvexDialog.Portal>
        </ConvexDialog.Root>
    );
};

export default NightlyResponseDialog;
