import React, { useEffect, useRef, useState } from 'react';
import { useUserList } from 'hooks/useUserList';
import Column from '../layout/Column';
import Row from '../layout/Row';
import AppButton from '../ui/buttons/AppButton';
import PoppinsText from '../ui/text/PoppinsText';
import { ScrollShadow } from 'heroui-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView } from 'react-native';
import DaySelectionDialog from './DaySelectionDialog';
import ChooseDayDialog from './ChooseDayDialog';
import DaysTable from './DaysTable';
import { getDayRangeLabel, parseStoredDayDates } from '../../../utils/multiplayer';

interface PlayerDaysSectionProps {
    gameId: string;
    addNewDay: (customDaysPerGameDay?: number) => void;
}

const PlayerDaysSection = ({ gameId, addNewDay }: PlayerDaysSectionProps) => {
    const [selectedDayIndex, setSelectedDayIndex] = useUserList<number>({
        key: "selectedDayIndex",
        itemId: gameId,
        privacy: "PUBLIC",
        defaultValue: 0,
    });

    const [numberOfRealDaysPerInGameDay] = useUserList<number>({
        key: "numberOfRealDaysPerInGameDay",
        itemId: gameId,
        privacy: "PUBLIC",
        defaultValue: 2,
    });

    const [dayDatesArray, setDayDatesArray] = useUserList<string[]>({
        key: "dayDatesArray",
        itemId: gameId,
        privacy: "PUBLIC",
        defaultValue: [],
    });

    const fixedDayDatesArray = parseStoredDayDates(dayDatesArray.value);

    const dateToStorageString = (date: Date): string => {
        return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    };

    const setFixedDayDatesArray = (dates: Date[]) => {
        setDayDatesArray(dates.map(dateToStorageString));
    };

    const [daysTableWidth, setDaysTableWidth] = useState(320);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isChooseDayDialogOpen, setIsChooseDayDialogOpen] = useState(false);
    const [isDaysTableBeingEdited, setIsDaysTableBeingEdited] = useState(false);
    const previousDayCountRef = useRef(fixedDayDatesArray.length);

    useEffect(() => {
        if (fixedDayDatesArray.length > previousDayCountRef.current) {
            setSelectedDayIndex(fixedDayDatesArray.length - 1);
        }

        if (fixedDayDatesArray.length > 0 && selectedDayIndex.value > fixedDayDatesArray.length - 1) {
            setSelectedDayIndex(fixedDayDatesArray.length - 1);
        }

        previousDayCountRef.current = fixedDayDatesArray.length;
    }, [fixedDayDatesArray.length, selectedDayIndex.value, setSelectedDayIndex]);

    const replaceDayDate = (index: number, replacementDate: Date) => {
        const currentDays = [...fixedDayDatesArray];
        if (index >= 0 && index < currentDays.length) {
            currentDays[index] = replacementDate;
            setFixedDayDatesArray(currentDays);
        }
    };

    const handleAddNewDay = () => {
        addNewDay(numberOfRealDaysPerInGameDay.value);
    };

    return (
        <>
            <Column gap={1}>
                <ScrollShadow LinearGradientComponent={LinearGradient} color="#fdfbf6" className='mr-1 pr-1 max-w-min'>
                    <ScrollView horizontal={true} className='px-1 m-0 h-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]' style={{ width: daysTableWidth }}>
                        <Row className='h-6' gap={1}>
                            {fixedDayDatesArray.map((date, index) => {
                                const label = getDayRangeLabel(fixedDayDatesArray, index, numberOfRealDaysPerInGameDay.value);

                                return selectedDayIndex.value === index ? (
                                    <DaySelectionDialog
                                        key={index}
                                        isOpen={isDialogOpen}
                                        onOpenChange={setIsDialogOpen}
                                        index={index}
                                        dayDate={date}
                                        buttonLabel={label}
                                        previousDate={index > 0 ? fixedDayDatesArray[index - 1] : new Date()}
                                        followingDate={index < fixedDayDatesArray.length - 1 ? fixedDayDatesArray[index + 1] : undefined}
                                        onPress={() => setSelectedDayIndex(index)}
                                        replaceDayDate={replaceDayDate}
                                    />
                                ) : (
                                    <AppButton
                                        key={index}
                                        variant="grey"
                                        className='min-w-28 px-2 max-h-6'
                                        onPress={() => setSelectedDayIndex(index)}
                                    >
                                        <PoppinsText className='text-white'>{label}</PoppinsText>
                                    </AppButton>
                                );
                            })}
                            <AppButton variant="accent" className='max-w-6 min-w-6 max-h-6 ml-1 rounded-full' onPress={handleAddNewDay}>
                                <PoppinsText weight="bold" className='text-white'>+</PoppinsText>
                            </AppButton>
                        </Row>
                    </ScrollView>
                </ScrollShadow>
                <Row className={`${isDaysTableBeingEdited ? 'z-10' : ''} w-min max-w-min`}>
                    <DaysTable
                        gameId={gameId}
                        dayNumber={selectedDayIndex.value}
                        isBeingEdited={isDaysTableBeingEdited}
                        setIsBeingEdited={setIsDaysTableBeingEdited}
                        onLayout={(event) => {
                            const { width } = event.nativeEvent.layout;
                            setDaysTableWidth(width);
                        }}
                        onWidthChange={(width) => {
                            setDaysTableWidth(width);
                        }}
                    />
                </Row>
            </Column>

            <ChooseDayDialog
                isOpen={isChooseDayDialogOpen}
                onOpenChange={setIsChooseDayDialogOpen}
                gameId={gameId}
                onSubmitDaysValue={(daysPerGameDay) => addNewDay(daysPerGameDay)}
            />
        </>
    );
};

export default PlayerDaysSection;
