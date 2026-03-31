import React, { useState } from 'react';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import Column from '../layout/Column';
import AppButton from '../ui/buttons/AppButton';
import PoppinsText from '../ui/text/PoppinsText';
import PoppinsNumberInput from '../ui/forms/PoppinsNumberInput';
import DialogHeader from '../ui/dialog/DialogHeader';
import { View, Text } from 'react-native';

interface DaysPerGameDayDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    currentValue: number;
    onPress: () => void;
    setNumberOfRealDaysPerInGameDay: (value: number) => void;
}

const DaysPerGameDayDialog = ({ isOpen, onOpenChange, currentValue, onPress, setNumberOfRealDaysPerInGameDay }: DaysPerGameDayDialogProps) => {
    const [daysValue, setDaysValue] = useState(currentValue.toString());

    const handleSubmit = () => {
        const numericValue = parseInt(daysValue);
        if (!isNaN(numericValue) && numericValue >= 1 && numericValue <= 30) {
            setNumberOfRealDaysPerInGameDay(numericValue);
            onOpenChange(false);
        }
    };

    const handleCancel = () => {
        setDaysValue(currentValue.toString());
        onOpenChange(false);
    };

    return (
        <ConvexDialog.Root isOpen={isOpen} onOpenChange={onOpenChange}>
            <ConvexDialog.Trigger asChild>
                <View>
                    {/* This will be replaced by the actual pressable in PlayerPageOPERATOR */}
                </View>
            </ConvexDialog.Trigger>
            <ConvexDialog.Portal>
                <ConvexDialog.Overlay />

                <ConvexDialog.Content>
                    <ConvexDialog.Close iconProps={{ color: 'rgb(246, 238, 219)' }} className="w-10 h-10 bg-accent-hover absolute right-4 top-4 z-10" />

                    <Column>
                        <DialogHeader
                            text="Game Settings"
                            subtext="Configure days per game day"
                        />
                        <Column gap={2}>
                            <PoppinsText weight='medium'>Days per game day</PoppinsText>
                            <PoppinsNumberInput
                                value={currentValue}
                                onChangeText={(displayValue, isValid, numericValue) => {
                                    setDaysValue(displayValue);
                                }}
                                minValue={1}
                                maxValue={30}
                                useDefaultStyling={true}
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

export default DaysPerGameDayDialog;
