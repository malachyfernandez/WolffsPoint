import React, { useState, useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import Column from '../layout/Column';
import Row from '../layout/Row';
import AppButton from '../ui/buttons/AppButton';
import PoppinsText from '../ui/text/PoppinsText';
import NewspaperWritingView from './NewspaperWritingView';
import { useUserList } from 'hooks/useUserList';
import { ScrollShadow } from 'heroui-native';
import { LinearGradient } from 'expo-linear-gradient';
import DaySelectionDialog from './DaySelectionDialog';
import PoppinsNumberInput from '../ui/forms/PoppinsNumberInput';

interface NewspaperPageProps {
    gameId: string;
}

const NewspaperPage = ({ gameId }: NewspaperPageProps) => {
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

    // Create a unique key for the newspaper based on the day
    const getNewspaperKey = (dayIndex: number) => {
        if (!fixedDayDatesArray || dayIndex >= fixedDayDatesArray.length) {
            return 'day-0';
        }
        const dayDate = fixedDayDatesArray[dayIndex];
        return `day-${dayDate.getFullYear()}-${dayDate.getMonth()}-${dayDate.getDate()}`;
    };

    const currentDayKey = getNewspaperKey(selectedDayIndex.value);

    return (
        <Column className='flex-1 w-full'>
            {/* Day Selector Bar - Same as NightlyPageOPERATOR */}
            <ScrollShadow LinearGradientComponent={LinearGradient} color="#fdfbf6" className='mr-1 pt-1'>
                <ScrollView horizontal={true} className='px-1 py-5'>
                    <Row className='items-center justify-between w-full'>
                        <Column className='flex-1'>
                            <Row className='h-6'>
                                {/* spacer to align with content */}
                            </Row>
                            <Row className='items-center justify-between px-4'>
                                <PoppinsText weight='bold' className='text-lg'>
                                    Day {selectedDayIndex.value + 1}
                                </PoppinsText>
                                <Row gap={2}>
                                    <PoppinsNumberInput
                                        value={numberOfRealDaysPerInGameDay.value}
                                        onChangeText={(displayValue, isValid, numericValue) => {
                                            if (isValid && numericValue !== null) {
                                                setNumberOfRealDaysPerInGameDay(numericValue);
                                            }
                                        }}
                                        minValue={1}
                                        maxValue={30}
                                        inline={true}
                                        useDefaultStyling={true}
                                    />
                                    <PoppinsText className='text-muted'>days/game day</PoppinsText>
                                </Row>
                            </Row>
                        </Column>
                        <Column className='max-w-min'>
                            <ScrollShadow LinearGradientComponent={LinearGradient} color="#fdfbf6" className='mr-1 pr-1 max-w-min'>
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
                                                    <PoppinsText className='text-white'>{fixedDayDatesArray[index].getMonth() + 1}/{fixedDayDatesArray[index].getDate()}</PoppinsText>
                                                </AppButton>
                                            )
                                        ))}
                                        <AppButton variant="green" className='max-w-6 min-w-6 max-h-6 ml-1 rounded-full' onPress={addNewDay}>
                                            <PoppinsText weight="bold" className='text-white'>+</PoppinsText>
                                        </AppButton>
                                    </Row>
                                </ScrollView>
                            </ScrollShadow>
                        </Column>
                    </Row>
                </ScrollView>
            </ScrollShadow>

            {/* Newspaper Content for Selected Day */}
            <Column className='flex-1'>
                <NewspaperWritingView gameId={`${gameId}-${currentDayKey}`} />
            </Column>
        </Column>
    );
};

export default NewspaperPage;
