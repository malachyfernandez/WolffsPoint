import React, { useState, useEffect } from 'react';
import { ScrollView } from 'react-native';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import AppButton from '../buttons/AppButton';
import FontText from '../text/FontText';
import { useUserList } from 'hooks/useUserList';
import { ScrollShadow } from 'heroui-native';
import { LinearGradient } from 'expo-linear-gradient';
import DaySelectionDialog from '../../game/DaySelectionDialog';

interface DaySelectorProps {
    gameId: string;
    className?: string;
    showAddButton?: boolean;
}

const DaySelector = ({ gameId, className = '', showAddButton = false }: DaySelectorProps) => {
    // Shared selected day index (same as players tab and nightly tab)
    const [selectedDayIndex, setSelectedDayIndex] = useUserList<number>({
        key: "selectedDayIndex",
        itemId: gameId,
        privacy: "PUBLIC",
        defaultValue: 0,
    });

    // Shared number of real days per in-game day (same as players tab and nightly tab)
    const [numberOfRealDaysPerInGameDay, setNumberOfRealDaysPerInGameDay] = useUserList<number>({
        key: "numberOfRealDaysPerInGameDay",
        itemId: gameId,
        privacy: "PUBLIC",
        defaultValue: 2,
    });

    // Shared day dates array (same as players tab and nightly tab)
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

    const addNewDay = () => {
        const currentDays = [...fixedDayDatesArray];
        const lastDate = currentDays[currentDays.length - 1];
        const newDate = new Date(lastDate);
        newDate.setDate(newDate.getDate() + numberOfRealDaysPerInGameDay.value);
        setFixedDayDatesArray([...currentDays, newDate]);

        // Snap to the newest day
        setSelectedDayIndex(currentDays.length);
    };

    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const replaceDayDate = (index: number, replacementDate: Date) => {
        const currentDays = [...fixedDayDatesArray];
        if (index >= 0 && index < currentDays.length) {
            currentDays[index] = replacementDate;
            setFixedDayDatesArray(currentDays);
        }
    };

    // Create a unique key for content based on the day index (not date)
    const getDayKey = (dayIndex: number) => {
        return `day-${dayIndex}`;
    };

    // Expose the current day key and selected index for parent components
    const currentDayKey = getDayKey(selectedDayIndex.value);

    return (
        <Column className={`gap-4 ${className ?? ''}`.trim()}>
            <ScrollShadow LinearGradientComponent={LinearGradient} className='mr-1 pt-1'>
                <ScrollView horizontal={true} className='px-1 py-5'>
                    <Row className='gap-4 items-center justify-center w-full'>
                        <Column className='gap-4 max-w-min'>
                            <ScrollShadow LinearGradientComponent={LinearGradient} className='mr-1 pr-1 max-w-min'>
                                <ScrollView horizontal={true} className='px-1 m-0 h-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]'>
                                    <Row className='gap-1 h-6'>
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
                                                    onPress={() => setSelectedDayIndex(index)}
                                                    replaceDayDate={replaceDayDate}
                                                />
                                            ) : (
                                                <AppButton
                                                    key={index}
                                                    variant="grey"
                                                    className='w-16 max-h-6'
                                                    onPress={() => setSelectedDayIndex(index)}
                                                >
                                                    <FontText className='text-white'>{fixedDayDatesArray[index].getMonth() + 1}/{fixedDayDatesArray[index].getDate()}</FontText>
                                                </AppButton>
                                            )
                                        ))}
                                        {showAddButton && (
                                            <AppButton variant="filled" className='h-6 w-6 min-w-6 ml-1 rounded-md' onPress={addNewDay}>
                                                <FontText weight="bold" className='text-white'>+</FontText>
                                            </AppButton>
                                        )}
                                    </Row>
                                </ScrollView>
                            </ScrollShadow>
                        </Column>
                    </Row>
                </ScrollView>
            </ScrollShadow>
        </Column>
    );
};

export default DaySelector;
