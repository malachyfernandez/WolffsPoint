import React, { useEffect, useState } from 'react';
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

interface ChangeDateInfoProps {
    gameId: string;
    isGettingStarted: boolean;
}

const ChangeDateInfo = ({ gameId, isGettingStarted }: ChangeDateInfoProps) => {
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
    console.log("set default to 2 in ChangeDateInfo.tsx");




    const resetState = () => {
        setDate('');
        setRealDaysPerInGameDaySTATE('2');
        console.log("set default to 2 in ChangeDateInfo.tsx resetState");
        setOldDate('');
        setOldRealDaysPerInGameDay('2');
        console.log("set default to 2 in ChangeDateInfo.tsx resetState oldRealDaysPerInGameDay");
    };


    const formSubmit = () => {
        setStartingDate(date);
        setNumberOfRealDaysPerInGameDay(Number(realDaysPerInGameDaySTATE));
        setIsHeroDialogOpen(false);
        resetState();
    };

    const [date, setDate] = useState('');
    const [realDaysPerInGameDaySTATE, setRealDaysPerInGameDaySTATE] = useState('2');
    console.log("set default to 2 in ChangeDateInfo.tsx useState realDaysPerInGameDaySTATE");

    const [oldDate, setOldDate] = useState(date);
    const [oldRealDaysPerInGameDay, setOldRealDaysPerInGameDay] = useState(realDaysPerInGameDaySTATE);

    // sync with hook
    useEffect(() => {
        if (date == '' && startingDate.value != '') {
            setDate(startingDate.value as string);
            setIsDateValid(true);
            setOldDate(startingDate.value as string);
        }
    }, [startingDate]);

    useEffect(() => {
        if (realDaysPerInGameDaySTATE == '2' && numberOfRealDaysPerInGameDay.value != 2) {
            console.log("set default to 2 in ChangeDateInfo.tsx useEffect checking realDaysPerInGameDaySTATE");
            setRealDaysPerInGameDaySTATE(numberOfRealDaysPerInGameDay.value.toString());
            setIsNumberValid(true);
            setOldRealDaysPerInGameDay(numberOfRealDaysPerInGameDay.value.toString());
        }
    }, [numberOfRealDaysPerInGameDay]);

    const hasChanged = oldDate !== date || oldRealDaysPerInGameDay !== realDaysPerInGameDaySTATE;
    

    const [isDateValid, setIsDateValid] = useState(false);
    const [isNumberValid, setIsNumberValid] = useState(true);

    const isFormValid = isDateValid && isNumberValid;

    const todaysDate = new Date()

    return (

        <ConvexDialog.Root isOpen={isHeroDialogOpen} onOpenChange={setIsHeroDialogOpen}>
            <ConvexDialog.Trigger asChild>
                <AppButton variant="accent" className="h-12 w-40 shrink">
                    <FontText weight='medium' color="white">{isGettingStarted ? 'Get Started' : 'Change'}</FontText>
                </AppButton>
            </ConvexDialog.Trigger>
            <ConvexDialog.Portal>
                <ConvexDialog.Overlay />

                <ConvexDialog.Content>

                    <ConvexDialog.Close iconProps={{ color: 'rgb(246, 238, 219)' }} className="w-10 h-10 bg-accent-hover absolute right-4 top-4 z-10" />

                    <Column>
                        <DialogHeader
                            text={isGettingStarted ? "Lets get some basics setup" : "Change Date Information"}
                            subtext="This can be changed later."
                        />

                        <Column gap={2}>

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
                        <Column gap={2}>
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
                        <Column>


                            {isFormValid ?
                                (
                                    hasChanged ? (
                                        <AppButton variant="filled" className="h-10 w-20" onPress={formSubmit}>
                                            <FontText weight='medium' color='white'>Save</FontText>
                                        </AppButton>
                                    ) : (
                                        <StatusButton buttonText="Save" buttonAltText="Unchanged" />
                                    )
                                )
                                :
                                (
                                    <StatusButton buttonText="Save" buttonAltText="Invalid" />
                                )}
                        </Column>


                    </Column>
                </ConvexDialog.Content>
            </ConvexDialog.Portal>
        </ConvexDialog.Root>

    );
};

export { ChangeDateInfo };
export default ChangeDateInfo;
