import React, { useState, useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import AppButton from '../buttons/AppButton';
import PoppinsText from '../text/PoppinsText';
import PoppinsNumberInput from '../forms/PoppinsNumberInput';
import { useUserList } from 'hooks/useUserList';
import { ScrollShadow } from 'heroui-native';
import { LinearGradient } from 'expo-linear-gradient';
import DaySelectionDialog from '../../game/DaySelectionDialog';
import ChooseDayDialog from '../../game/ChooseDayDialog';

export type DaySelectorMode = 'player' | 'nightly' | 'newspaper';

interface ComprehensiveDaySelectorProps {
    gameId: string;
}

const ComprehensiveDaySelector = ({ gameId }: ComprehensiveDaySelectorProps) => {
    // Shared selected day index
    const [selectedDayIndex, setSelectedDayIndex] = useUserList<number>({
        key: "selectedDayIndex",
        itemId: gameId,
        privacy: "PUBLIC",
        defaultValue: 0,
    });

    // Number of real days per in-game day
    const [numberOfRealDaysPerInGameDay] = useUserList<number | false>({
        key: "numberOfRealDaysPerInGameDay",
        itemId: gameId,
        privacy: "PUBLIC",
        defaultValue: false,
    });

    // Shared day dates array
    const [dayDatesArray, setDayDatesArray] = useUserList<string[]>({
        key: "dayDatesArray",
        itemId: gameId,
        privacy: "PUBLIC",
        defaultValue: [],
    });

    // Convert stored MM/DD/YYYY strings back to real Date objects for UI use
    const fixedDayDatesArray = dayDatesArray.value.map(dateStr => {
        const [month, day, year] = dateStr.split('/').map(Number);
        return new Date(year, month - 1, day);
    });

    // Helper: convert Date to MM/DD/YYYY string
    const dateToStorageString = (date: Date): string => {
        return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    };

    // Clean setter that accepts Date[] and handles string conversion internally
    const setFixedDayDatesArray = (dates: Date[]) => {
        setDayDatesArray(dates.map(dateToStorageString));
    };

    useEffect(() => {
        if (dayDatesArray.value.length === 0 && dayDatesArray.state.isSyncing === false) {
            setFixedDayDatesArray([new Date()]);
        }
    }, [dayDatesArray, setFixedDayDatesArray]);

    const addNewDay = (customDaysPerGameDay?: number) => {
        const currentDays = [...fixedDayDatesArray];
        const lastDate = currentDays[currentDays.length - 1];
        const newDate = new Date(lastDate);

        const daysToAdd = customDaysPerGameDay ?? (typeof numberOfRealDaysPerInGameDay.value === 'number' ? numberOfRealDaysPerInGameDay.value : 2);
        newDate.setDate(newDate.getDate() + daysToAdd);
        setFixedDayDatesArray([...currentDays, newDate]);

        // Snap to the newest day
        setSelectedDayIndex(currentDays.length);
    };

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isChooseDayDialogOpen, setIsChooseDayDialogOpen] = useState(false);

    const replaceDayDate = (index: number, replacementDate: Date) => {
        const currentDays = [...fixedDayDatesArray];
        if (index >= 0 && index < currentDays.length) {
            currentDays[index] = replacementDate;
            setFixedDayDatesArray(currentDays);
        }
    };

    const handleDaySelect = (index: number) => {
        setSelectedDayIndex(index);
    };

    const handleAddNewDay = () => {
        if (numberOfRealDaysPerInGameDay.value === false) {
            setIsChooseDayDialogOpen(true);
        } else {
            addNewDay();
        }
    };

    // Create a unique key for content based on the day index
    const getDayKey = (dayIndex: number) => {
        return `day-${dayIndex}`;
    };

    const currentDayKey = getDayKey(selectedDayIndex.value);

    const DaySelectorBar = () => (
        <ScrollShadow LinearGradientComponent={LinearGradient} color="#fdfbf6" className='mr-1 pr-1 max-w-min -mb-3 -mt-1'>
            <ScrollView horizontal={true} className='px-1 m-0 h-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]'>
                <Row className='h-6' gap={1}>
                    {fixedDayDatesArray.map((date, index) => (
                        selectedDayIndex.value === index ? (
                            <DaySelectionDialog
                                key={index}
                                isOpen={isDialogOpen}
                                onOpenChange={setIsDialogOpen}
                                index={index}
                                dayDate={date}
                                previousDate={index > 0 ? fixedDayDatesArray[index - 1] : new Date()}
                                followingDate={index < fixedDayDatesArray.length - 1 ? fixedDayDatesArray[index + 1] : undefined}
                                onPress={() => handleDaySelect(index)}
                                replaceDayDate={replaceDayDate}
                            />
                        ) : (
                            <AppButton
                                key={index}
                                variant="grey"
                                className='w-16 max-h-6'
                                onPress={() => handleDaySelect(index)}
                            >
                                <PoppinsText className='text-white'>{fixedDayDatesArray[index].getMonth() + 1}/{fixedDayDatesArray[index].getDate()}</PoppinsText>
                            </AppButton>
                        )
                    ))}
                    <AppButton variant="green" className='max-w-6 min-w-6 max-h-6 ml-1 rounded-full' onPress={handleAddNewDay}>
                        <PoppinsText weight="bold" className='text-white'>+</PoppinsText>
                    </AppButton>
                </Row>
            </ScrollView>
        </ScrollShadow>
    );

    return (
        <Column>
            <DaySelectorBar />

            {/* ChooseDayDialog for initial setup */}
            <ChooseDayDialog
                isOpen={isChooseDayDialogOpen}
                onOpenChange={setIsChooseDayDialogOpen}
                gameId={gameId}
                addNewDay={addNewDay}
            />
        </Column>
    );
};

export default ComprehensiveDaySelector;
