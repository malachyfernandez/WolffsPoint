import React, { useState } from 'react';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import Column from '../layout/Column';
import AppButton from '../ui/buttons/AppButton';
import FontText from '../ui/text/FontText';
import FontNumberInput from '../ui/forms/FontNumberInput';
import DialogHeader from '../ui/dialog/DialogHeader';
import { View } from 'react-native';
import { useUserList } from 'hooks/useUserList';

interface ChooseDayDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    gameId: string;
    onSubmitDaysValue: (daysPerGameDay: number) => void;
    title?: string;
    subtext?: string;
}

const ChooseDayDialog = ({ isOpen, onOpenChange, gameId, onSubmitDaysValue, title = 'Game Settings', subtext = 'Configure days per game day' }: ChooseDayDialogProps) => {
    // Use the same user variable system as other components
    const [numberOfRealDaysPerInGameDay, setNumberOfRealDaysPerInGameDay] = useUserList<number>({
        key: "numberOfRealDaysPerInGameDay",
        itemId: gameId,
        privacy: "PUBLIC",
        defaultValue: 2,
    });

    const [daysValue, setDaysValue] = useState(numberOfRealDaysPerInGameDay.value.toString());

    React.useEffect(() => {
        setDaysValue(numberOfRealDaysPerInGameDay.value.toString());
    }, [numberOfRealDaysPerInGameDay.value, isOpen]);
    // const [daysValue, setDaysValue] = useState((numberOfRealDaysPerInGameDay?.value || 2).toString());

     const handleSubmit = () => {
         const numericValue = parseInt(daysValue);
         if (!isNaN(numericValue) && numericValue >= 1 && numericValue <= 30) {
             setNumberOfRealDaysPerInGameDay(numericValue);
             onSubmitDaysValue(numericValue);
             onOpenChange(false);
         }
     };

     const handleCancel = () => {
         setDaysValue(numberOfRealDaysPerInGameDay.value.toString());
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

                    <Column className='gap-4'>
                        <DialogHeader
                            text={title}
                            subtext={subtext}
                        />
                        <Column className='gap-2'>
                            <FontText weight='medium'>Days per game day</FontText>
                            <FontNumberInput
                                value={daysValue}
                                onChangeText={setDaysValue}
                                minValue={1}
                                maxValue={30}
                                useDefaultStyling={true}
                            />
                        </Column>

                        <Column className='gap-2'>
                            <AppButton className='w-34 h-10' variant='filled' onPress={handleSubmit}>
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

export default ChooseDayDialog;
