import React, { useState } from 'react';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import Column from '../layout/Column';
import AppButton from '../ui/buttons/AppButton';
import PoppinsText from '../ui/text/PoppinsText';
import PoppinsNumberInput from '../ui/forms/PoppinsNumberInput';
import DialogHeader from '../ui/dialog/DialogHeader';
import { View } from 'react-native';
import { useUserList } from 'hooks/useUserList';

interface ChooseDayDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    gameId: string;
    addNewDay: (customDaysPerGameDay?: number) => void;
}

const ChooseDayDialog = ({ isOpen, onOpenChange, gameId, addNewDay }: ChooseDayDialogProps) => {
    // Use the same user variable system as other components
    const [numberOfRealDaysPerInGameDay, setNumberOfRealDaysPerInGameDay] = useUserList<number | false>({
        key: "numberOfRealDaysPerInGameDay",
        itemId: gameId,
        privacy: "PUBLIC",
        defaultValue: false,
    });

    const [daysValue, setDaysValue] = useState(numberOfRealDaysPerInGameDay.value === false ? "2" : numberOfRealDaysPerInGameDay.value.toString());

    React.useEffect(() => {
        setDaysValue(numberOfRealDaysPerInGameDay.value === false ? "2" : numberOfRealDaysPerInGameDay.value.toString());
    }, [numberOfRealDaysPerInGameDay.value, isOpen]);
    // const [daysValue, setDaysValue] = useState((numberOfRealDaysPerInGameDay?.value || 2).toString());

     const handleSubmit = () => {
         const numericValue = parseInt(daysValue);
         if (!isNaN(numericValue) && numericValue >= 1 && numericValue <= 30) {
             setNumberOfRealDaysPerInGameDay(numericValue);
             addNewDay(numericValue);
             onOpenChange(false);
         }
     };

     const handleCancel = () => {
         setDaysValue(numberOfRealDaysPerInGameDay.value === false ? "2" : numberOfRealDaysPerInGameDay.value.toString());
         onOpenChange(false);
     };


    return (
        <ConvexDialog.Root isOpen={isOpen} onOpenChange={onOpenChange}>
            <ConvexDialog.Trigger asChild>
                <View>
                    {/* This will be replaced by the actual pressable in DaysTable */}
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
                                value={daysValue}
                                onChangeText={setDaysValue}
                                minValue={1}
                                maxValue={30}
                                useDefaultStyling={true}
                            />
                        </Column>

                        <Column gap={2}>
                            <AppButton className='w-34 h-10' variant='black' onPress={handleSubmit}>
                                <PoppinsText color='white' weight='medium'>Save</PoppinsText>
                            </AppButton>
                            <AppButton className='w-34 h-10' variant='outline-alt' onPress={handleCancel}>
                                <PoppinsText color='black' weight='medium'>Cancel</PoppinsText>
                            </AppButton>
                        </Column>
                    </Column>
                </ConvexDialog.Content>
            </ConvexDialog.Portal>
        </ConvexDialog.Root>
    );
};

export default ChooseDayDialog;
