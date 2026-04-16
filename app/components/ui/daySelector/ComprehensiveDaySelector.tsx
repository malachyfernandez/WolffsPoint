import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ScrollView, View } from 'react-native';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import AppButton from '../buttons/AppButton';
import PoppinsText from '../text/PoppinsText';
import { useUserList } from 'hooks/useUserList';
import { ScrollShadow } from 'heroui-native';
import { LinearGradient } from 'expo-linear-gradient';
import DaySelectionDialog from '../../game/DaySelectionDialog';
import ChooseDayDialog from '../../game/ChooseDayDialog';
import DayButton from './DayButton';
import { getCurrentPlayableDayIndex, getDayRangeLabel, parseStoredDayDates } from '../../../../utils/multiplayer';

export type DaySelectorMode = 'player' | 'nightly' | 'newspaper';

interface ComprehensiveDaySelectorProps {
    gameId: string;
    showAddButton?: boolean;
    showInitialSetupDialog?: boolean;
}

const ComprehensiveDaySelector = ({ gameId, showAddButton = false, showInitialSetupDialog = false }: ComprehensiveDaySelectorProps) => {
    const scrollViewRef = useRef<ScrollView>(null);
    
    // Shared selected day index
    const [selectedDayIndex, setSelectedDayIndex] = useUserList<number>({
        key: "selectedDayIndex",
        itemId: gameId,
        privacy: "PUBLIC",
        defaultValue: 0,
    });

    // Number of real days per in-game day
    const [numberOfRealDaysPerInGameDay] = useUserList<number>({
        key: "numberOfRealDaysPerInGameDay",
        itemId: gameId,
        privacy: "PUBLIC",
        defaultValue: 2,
    });

    const [hasCompletedInitialDaySetup, setHasCompletedInitialDaySetup] = useUserList<boolean>({
        key: "hasCompletedInitialDaySetup",
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
    const fixedDayDatesArray = parseStoredDayDates(dayDatesArray.value);
    const currentPlayableDayIndex = getCurrentPlayableDayIndex(fixedDayDatesArray);

    // Clean setter that accepts Date[] and handles string conversion internally
    const setFixedDayDatesArray = useCallback((dates: Date[]) => {
        setDayDatesArray(
            dates.map((date) => `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`)
        );
    }, [setDayDatesArray]);

    useEffect(() => {
        if (dayDatesArray.value.length > 0 && hasCompletedInitialDaySetup.state.isSyncing === false && hasCompletedInitialDaySetup.value === false) {
            setHasCompletedInitialDaySetup(true);
        }
    }, [dayDatesArray.value.length, hasCompletedInitialDaySetup.state.isSyncing, hasCompletedInitialDaySetup.value, setHasCompletedInitialDaySetup]);

    // Auto-scroll to selected day
    useEffect(() => {
        if (scrollViewRef.current && selectedDayIndex.value !== undefined && fixedDayDatesArray.length > 0) {
            const dayButtonWidth = 112;
            const gapWidth = 4;
            // Calculate position in reversed order: newest days are first (after + button)
            const reversedIndex = fixedDayDatesArray.length - 1 - selectedDayIndex.value;
            const selectedDayPosition = reversedIndex * (dayButtonWidth + gapWidth);
            
            // Scroll to position with some padding to center the selected day
            const scrollPosition = Math.max(0, selectedDayPosition - 100);
            
            scrollViewRef.current.scrollTo({ x: scrollPosition, animated: true });
        }
    }, [selectedDayIndex.value, fixedDayDatesArray.length]);

    const addNewDay = (customDaysPerGameDay?: number) => {
        const currentDays = [...fixedDayDatesArray];
        if (currentDays.length === 0) {
            const firstDay = new Date();
            setFixedDayDatesArray([firstDay]);
            setSelectedDayIndex(0);
            setHasCompletedInitialDaySetup(true);
            return;
        }
        const lastDate = currentDays[currentDays.length - 1];
        const newDate = new Date(lastDate);

        const daysToAdd = customDaysPerGameDay ?? numberOfRealDaysPerInGameDay.value;
        newDate.setDate(newDate.getDate() + daysToAdd);
        setFixedDayDatesArray([...currentDays, newDate]);

        // Snap to the newest day
        setSelectedDayIndex(currentDays.length);
    };

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isChooseDayDialogOpen, setIsChooseDayDialogOpen] = useState(false);

    useEffect(() => {
        if (
            showInitialSetupDialog &&
            dayDatesArray.state.isSyncing === false &&
            hasCompletedInitialDaySetup.state.isSyncing === false &&
            dayDatesArray.value.length === 0 &&
            hasCompletedInitialDaySetup.value === false
        ) {
            setIsChooseDayDialogOpen(true);
        }
    }, [dayDatesArray.state.isSyncing, dayDatesArray.value.length, hasCompletedInitialDaySetup.state.isSyncing, hasCompletedInitialDaySetup.value, showInitialSetupDialog]);

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
        if (showAddButton === false) {
            return;
        }

        if (fixedDayDatesArray.length === 0 && showInitialSetupDialog) {
            setIsChooseDayDialogOpen(true);
            return;
        }

        addNewDay();
    };

    const handleInitialDaySetupSubmit = (daysPerGameDay: number) => {
        if (fixedDayDatesArray.length === 0) {
            setFixedDayDatesArray([new Date()]);
            setSelectedDayIndex(0);
        }

        if (daysPerGameDay !== numberOfRealDaysPerInGameDay.value && fixedDayDatesArray.length > 0) {
            setSelectedDayIndex(Math.min(selectedDayIndex.value, fixedDayDatesArray.length - 1));
        }

        setHasCompletedInitialDaySetup(true);
    };

    // Create a unique key for content based on the day index
    const getDayKey = (dayIndex: number) => {
        return `day-${dayIndex}`;
    };

    return (
        <Column>
            <ScrollShadow LinearGradientComponent={LinearGradient} className='mr-1 pr-1 max-w-min -mb-3 -mt-1'>
                <ScrollView
                    ref={scrollViewRef}
                    horizontal={true}
                    className='px-1 m-0 h-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]'
                >
                    <Row className='h-6' gap={1}>
                        {showAddButton && (
                            <AppButton variant="accent" className='max-w-6 min-w-6 max-h-6 ml-1 rounded-full' onPress={handleAddNewDay}>
                                <PoppinsText weight="bold" className='text-white'>+</PoppinsText>
                            </AppButton>
                        )}
                        {fixedDayDatesArray.slice().reverse().map((date, reverseIndex) => {
                            const index = fixedDayDatesArray.length - 1 - reverseIndex;
                            const isCurrentDay = index === currentPlayableDayIndex;
                            const isSelected = selectedDayIndex.value === index;
                            const label = getDayRangeLabel(fixedDayDatesArray, index, numberOfRealDaysPerInGameDay.value);

                            if (isSelected) {
                                return (
                                    <DayButton
                                        key={index}
                                        date={date}
                                        index={index}
                                        label={label}
                                        isSelected={true}
                                        showCurrentDayIndicator={isCurrentDay}
                                        onPress={() => handleDaySelect(index)}
                                    >
                                        <DaySelectionDialog
                                            isOpen={isDialogOpen}
                                            onOpenChange={setIsDialogOpen}
                                            index={index}
                                            dayDate={date}
                                            buttonLabel={label}
                                            previousDate={index > 0 ? fixedDayDatesArray[index - 1] : new Date()}
                                            followingDate={index < fixedDayDatesArray.length - 1 ? fixedDayDatesArray[index + 1] : undefined}
                                            onPress={() => handleDaySelect(index)}
                                            replaceDayDate={replaceDayDate}
                                            showCurrentDayIndicator={isCurrentDay}
                                        />
                                    </DayButton>
                                );
                            }

                            return (
                                <DayButton
                                    key={index}
                                    date={date}
                                    index={index}
                                    label={label}
                                    isSelected={false}
                                    showCurrentDayIndicator={isCurrentDay}
                                    onPress={() => handleDaySelect(index)}
                                />
                            );
                        })}
                    </Row>
                </ScrollView>
            </ScrollShadow>

            {/* ChooseDayDialog for initial setup */}
            <ChooseDayDialog
                isOpen={isChooseDayDialogOpen}
                onOpenChange={setIsChooseDayDialogOpen}
                gameId={gameId}
                onSubmitDaysValue={handleInitialDaySetupSubmit}
            />
        </Column>
    );
};

export default ComprehensiveDaySelector;
