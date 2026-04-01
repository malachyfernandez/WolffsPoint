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

export type DaySelectorMode = 'player' | 'nightly' | 'newspaper';

interface ComprehensiveDaySelectorProps {
    gameId: string;
}

const ComprehensiveDaySelector = ({ gameId }: ComprehensiveDaySelectorProps) => {
    const scrollViewRef = useRef<ScrollView>(null);
    
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

    // Clean setter that accepts Date[] and handles string conversion internally
    const setFixedDayDatesArray = useCallback((dates: Date[]) => {
        setDayDatesArray(
            dates.map((date) => `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`)
        );
    }, [setDayDatesArray]);

    useEffect(() => {
        if (dayDatesArray.value.length === 0 && dayDatesArray.state.isSyncing === false) {
            setFixedDayDatesArray([new Date()]);
        }
    }, [dayDatesArray, setFixedDayDatesArray]);

    // Auto-scroll to selected day
    useEffect(() => {
        if (scrollViewRef.current && selectedDayIndex.value !== undefined && fixedDayDatesArray.length > 0) {
            // Each day button is approximately 64px wide (w-16) + 4px gap
            const dayButtonWidth = 64;
            const gapWidth = 4;
            const selectedDayPosition = selectedDayIndex.value * (dayButtonWidth + gapWidth);
            
            // Scroll to position with some padding to center the selected day
            const scrollPosition = Math.max(0, selectedDayPosition - 100);
            
            scrollViewRef.current.scrollTo({ x: scrollPosition, animated: true });
        }
    }, [selectedDayIndex.value, fixedDayDatesArray.length]);

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

    // Check if a date is today or the next coming day
    const isCurrentOrNextDay = (date: Date): boolean => {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to start of day
        
        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0); // Set to start of day
        
        // Check if it's today
        if (checkDate.getTime() === today.getTime()) {
            return true;
        }
        
        // Check if it's the next day after today
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (checkDate.getTime() === tomorrow.getTime()) {
            return true;
        }
        
        // If today is not in the list, check if this is the next upcoming day
        const todayIndex = fixedDayDatesArray.findIndex(date => {
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);
            return d.getTime() === today.getTime();
        });
        
        if (todayIndex === -1) {
            // Find the first day that's after today
            const futureDays = fixedDayDatesArray.filter(date => {
                const d = new Date(date);
                d.setHours(0, 0, 0, 0);
                return d.getTime() > today.getTime();
            }).sort((a, b) => a.getTime() - b.getTime());
            
            const nextDay = futureDays[0];
            if (nextDay) {
                const next = new Date(nextDay);
                next.setHours(0, 0, 0, 0);
                return checkDate.getTime() === next.getTime();
            }
        }
        
        return false;
    };

    return (
        <Column>
            <ScrollShadow LinearGradientComponent={LinearGradient} color="#fdfbf6" className='mr-1 pr-1 max-w-min -mb-3 -mt-1'>
                <ScrollView
                    ref={scrollViewRef}
                    horizontal={true}
                    className='px-1 m-0 h-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]'
                >
                    <Row className='h-6' gap={1}>
                        {fixedDayDatesArray.map((date, index) => {
                            const isCurrentDay = isCurrentOrNextDay(date);
                            const isSelected = selectedDayIndex.value === index;

                            if (isSelected) {
                                return (
                                    <DayButton
                                        key={index}
                                        date={date}
                                        index={index}
                                        isSelected={true}
                                        showCurrentDayIndicator={isCurrentDay}
                                        onPress={() => handleDaySelect(index)}
                                    >
                                        <DaySelectionDialog
                                            isOpen={isDialogOpen}
                                            onOpenChange={setIsDialogOpen}
                                            index={index}
                                            dayDate={date}
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
                                    isSelected={false}
                                    showCurrentDayIndicator={isCurrentDay}
                                    onPress={() => handleDaySelect(index)}
                                />
                            );
                        })}
                        <AppButton variant="green" className='max-w-6 min-w-6 max-h-6 ml-1 rounded-full' onPress={handleAddNewDay}>
                            <PoppinsText weight="bold" className='text-white'>+</PoppinsText>
                        </AppButton>
                    </Row>
                </ScrollView>
            </ScrollShadow>

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
