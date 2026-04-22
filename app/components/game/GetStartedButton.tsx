import React, { useState } from 'react';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import Column from '../layout/Column';
import Animated from 'react-native-reanimated';
import { FadeInRight, FadeOutRight } from 'react-native-reanimated';
import AppButton from '../ui/buttons/AppButton';
import FontText from '../ui/text/FontText';
import FontTextInput from '../ui/forms/FontTextInput';
import SmartDateInput from '../ui/forms/SmartDateInput';
import SmartNumberInput from '../ui/forms/SmartNumberInput';
import StatusButton from '../ui/StatusButton';
import JoinHandler from '../ui/forms/JoinHandler';
import DialogHeader from '../ui/dialog/DialogHeader';
import { useUserList } from 'hooks/useUserList';

interface GetStartedButtonProps {
    gameId: string;
}

const GetStartedButton = ({ gameId }: GetStartedButtonProps) => {
    const [isHeroDialogOpen, setIsHeroDialogOpen] = useState(false);
    const [gameCode, setGameCode] = useState('');

    const [startingDate, setStartingDate] = useUserList({
        key: "startingDate",
        itemId: gameId,
    });

    const [numberOfRealDaysPerInGameDay, setNumberOfRealDaysPerInGameDay] = useUserList<number>({
        key: "numberOfRealDaysPerInGameDay",
        itemId: gameId,
        defaultValue: 2,
    });


    const formSubmit = () => {
        setStartingDate(date);
        setNumberOfRealDaysPerInGameDay(Number(realDaysPerInGameDaySTATE));
        setIsHeroDialogOpen(false);
    };

    const [date, setDate] = useState('');
    const [realDaysPerInGameDaySTATE, setRealDaysPerInGameDaySTATE] = useState('2');
    console.log("set default to 2 in GetStartedButton.tsx useState realDaysPerInGameDaySTATE");

    const [isDateValid, setIsDateValid] = useState(false);
    const [isNumberValid, setIsNumberValid] = useState(true);

    const isFormValid = isDateValid && isNumberValid;

    const todaysDate = new Date()

        return (

        <ConvexDialog.Root isOpen={isHeroDialogOpen} onOpenChange={setIsHeroDialogOpen}>
            <ConvexDialog.Trigger asChild>
                <AppButton variant="accent" className="h-12 w-40 shrink">
                    <FontText weight='medium' color="white">Get Started</FontText>
                </AppButton>
            </ConvexDialog.Trigger>
            <ConvexDialog.Portal>
                <ConvexDialog.Overlay />

                <ConvexDialog.Content>

                    <ConvexDialog.Close iconProps={{ color: 'rgb(246, 238, 219)' }} className="w-10 h-10 bg-text-inverted/10 hover:bg-text-inverted/15 rounded-full absolute right-0 top-0 z-10" />

                    <Column className='gap-4'>
                        <DialogHeader
                            text="Lets get some basics setup"
                            subtext="This can be changed later."
                        />

                        <Column className='gap-2'>

                            <FontText>Starting Date:</FontText>

                            {/* EXAMPLE USING TEXT INPUT */}
                            <SmartDateInput
                                placeholder="MM/DD/YYYY"
                                className="w-full border border-subtle-border p-2"
                                value={date}
                                onChangeText={setDate}
                                onIsValid={setIsDateValid}
                                earliestDate={todaysDate}
                            />

                        </Column>
                        <Column className='gap-2'>
                            <FontText>Real Days per In-Game Day</FontText>
                            <SmartNumberInput
                                placeholder="Enter number"
                                className="w-full border border-subtle-border p-2"
                                value={realDaysPerInGameDaySTATE}
                                onChangeText={setRealDaysPerInGameDaySTATE}
                                onIsValid={setIsNumberValid}
                                minValue={1}
                            />
                        </Column>
                        <Column className='gap-4'>


                            {isFormValid ?
                                (
                                    <AppButton variant="filled" className="h-10 w-28" onPress={formSubmit}>
                                        <FontText weight='medium' color='white'>Save</FontText>
                                    </AppButton>
                                )
                                :
                                (
                                    <StatusButton buttonText="Save" buttonAltText="invalid" />
                                )}
                        </Column>


                    </Column>
                </ConvexDialog.Content>
            </ConvexDialog.Portal>
        </ConvexDialog.Root>

    );
};

export default GetStartedButton;
