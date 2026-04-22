import React from 'react';
import ShadowScrollView from '../ui/ShadowScrollView';
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
        <Column className='gap-4'>
            <ShadowScrollView direction='horizontal' className='mr-1 pr-1 max-w-min -mb-3 -mt-1' scrollViewClassName='px-1 m-0 h-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]' horizontal>
                    <Row className='gap-1 h-6'>
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
            </ShadowScrollView>
        </Column>
    );
};

export default PlayerDaySelector;
