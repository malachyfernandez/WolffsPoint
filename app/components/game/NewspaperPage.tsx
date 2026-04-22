import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import Column from '../layout/Column';
import Row from '../layout/Row';
import AppButton from '../ui/buttons/AppButton';
import FontText from '../ui/text/FontText';
import NewspaperWritingView from './NewspaperWritingView';
import { useUserList } from 'hooks/useUserList';
import ShadowScrollView from '../ui/ShadowScrollView';
import DaySelectionDialog from './DaySelectionDialog';
import FontNumberInput from '../ui/forms/FontNumberInput';

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
        <Column className='gap-4 flex-1 w-full'>
            {/* Day Selector Bar - Same as NightlyPageOPERATOR */}
            <ShadowScrollView direction='horizontal' className='mr-1 pt-1' scrollViewClassName='px-1 py-5' horizontal>
                    <Row className='gap-4 items-center justify-between w-full'>
                        <Column className='gap-4 flex-1'>
                            <Row className='gap-4 h-6'>
                                {/* spacer to align with content */}
                            </Row>
                            <Row className='gap-4 items-center justify-between px-4'>
                                <FontText weight='bold' className='text-lg'>
                                    Day {selectedDayIndex.value + 1}
                                </FontText>
                                <Row className='gap-2'>
                                    <FontNumberInput
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
                                    <FontText className='text-muted'>days/game day</FontText>
                                </Row>
                            </Row>
                        </Column>
                        <Column className='gap-4 max-w-min'>
                            <ShadowScrollView direction='horizontal' className='mr-1 pr-1 max-w-min' scrollViewClassName='px-1 m-0 h-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]' horizontal>
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
                                        <AppButton variant="accent" className='max-w-6 min-w-6 max-h-6 ml-1 rounded-full' onPress={addNewDay}>
                                            <FontText weight="bold" className='text-white'>+</FontText>
                                        </AppButton>
                                    </Row>
                            </ShadowScrollView>
                        </Column>
                    </Row>
            </ShadowScrollView>

            {/* Newspaper Content for Selected Day */}
            <Column className='gap-4 flex-1'>
                <NewspaperWritingView gameId={`${gameId}-${currentDayKey}`} />
            </Column>
        </Column>
    );
};

export default NewspaperPage;
