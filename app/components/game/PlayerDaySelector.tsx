import React from 'react';
import { ScrollView } from 'react-native';
import { ScrollShadow } from 'heroui-native';
import { LinearGradient } from 'expo-linear-gradient';
import Column from '../layout/Column';
import Row from '../layout/Row';
import DayButton from '../ui/daySelector/DayButton';
import { getContextualDayRangeLabel } from '../../../utils/multiplayer';

interface PlayerDaySelectorProps {
    dayDates: Date[];
    selectedDayIndex: number;
    currentDayIndex: number;
    onSelectDay: (index: number) => void;
    fallbackSpanDays?: number;
}

const PlayerDaySelector = ({ dayDates, selectedDayIndex, currentDayIndex, onSelectDay, fallbackSpanDays = 1 }: PlayerDaySelectorProps) => {
    return (
        <Column>
            <ScrollShadow LinearGradientComponent={LinearGradient} className='mr-1 pr-1 max-w-min -mb-3 -mt-1'>
                <ScrollView horizontal={true} className='px-1 m-0 h-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]'>
                    <Row className='h-6' gap={1}>
                        {dayDates.map((date, index) => {
                            const isLocked = index > currentDayIndex;
                            return (
                                <DayButton
                                    key={index}
                                    date={date}
                                    index={index}
                                    label={getContextualDayRangeLabel(dayDates, index, fallbackSpanDays)}
                                    isSelected={selectedDayIndex === index}
                                    showCurrentDayIndicator={index === currentDayIndex}
                                    onPress={() => {
                                        if (!isLocked) {
                                            onSelectDay(index);
                                        }
                                    }}
                                />
                            );
                        })}
                    </Row>
                </ScrollView>
            </ScrollShadow>
        </Column>
    );
};

export default PlayerDaySelector;
