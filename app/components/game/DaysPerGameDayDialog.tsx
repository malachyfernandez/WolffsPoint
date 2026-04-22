import React, { useState } from 'react';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import Column from '../layout/Column';
import AppButton from '../ui/buttons/AppButton';
import FontText from '../ui/text/FontText';
import FontNumberInput from '../ui/forms/FontNumberInput';
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
                    <ConvexDialog.Close iconProps={{ color: 'rgb(246, 238, 219)' }} className="w-10 h-10 bg-text-inverted/10 hover:bg-text-inverted/15 rounded-full absolute right-0 top-0 z-10" />

                    <Column className='gap-4'>
                        <DialogHeader
                            text="Game Settings"
                            subtext="Configure days per game day"
                        />
                        <Column className='gap-2'>
                            <FontText weight='medium'>Days per game day</FontText>
                            <FontNumberInput
                                value={currentValue}
                                onChangeText={(displayValue, isValid, numericValue) => {
                                    setDaysValue(displayValue);
                                }}
                                minValue={1}
                                maxValue={30}
                                useDefaultStyling={true}
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

export default DaysPerGameDayDialog;
