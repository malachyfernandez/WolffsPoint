import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView } from 'react-native';
import Column from '../layout/Column';
import PoppinsText from '../ui/text/PoppinsText';
import Row from '../layout/Row';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';
import { Usepaper } from '../../../types/usepaper';
import { useSharedListValue } from '../../../hooks/useSharedListValue';
import { useUserVariableGet } from '../../../hooks/useUserVariableGet';
import PlayerDaySelector from './PlayerDaySelector';
import { defaultGameSchedule, formatTimeLabel, getCurrentPlayableDayIndex, getDayRangeLabel, getGameScopedKey, isDayContentReleased, normalizeGameSchedule, parseStoredDayDates } from '../../../utils/multiplayer';

interface ReadOnlyNewspaperPagePLAYERProps {
    gameId: string;
}

const minimumUsepaper: Usepaper = {
    columns: ['', ''],
};

const ReadOnlyNewspaperPagePLAYER = ({ gameId }: ReadOnlyNewspaperPagePLAYERProps) => {
    const { value: dayDateStrings } = useSharedListValue<string[]>({
        key: 'dayDatesArray',
        itemId: gameId,
        defaultValue: [],
    });
    const { value: numberOfRealDaysPerInGameDay } = useSharedListValue<number>({
        key: 'numberOfRealDaysPerInGameDay',
        itemId: gameId,
        defaultValue: 2,
    });

    const scheduleRecords = useUserVariableGet({
        key: getGameScopedKey('gameSchedule', gameId),
        returnTop: 1,
    });

    const dayDates = useMemo(() => parseStoredDayDates(dayDateStrings), [dayDateStrings]);
    const currentDayIndex = useMemo(() => getCurrentPlayableDayIndex(dayDates), [dayDates]);
    const [selectedDayIndex, setSelectedDayIndex] = useState(currentDayIndex);

    useEffect(() => {
        setSelectedDayIndex((currentValue) => Math.min(currentValue, currentDayIndex));
    }, [currentDayIndex]);

    const dayKey = `day-${selectedDayIndex}`;
    const newspaperRecords = useSharedListValue<Usepaper>({
        key: 'usepaper',
        itemId: `${gameId}-${dayKey}`,
        defaultValue: minimumUsepaper,
    });

    const schedule = normalizeGameSchedule(scheduleRecords?.[0]?.value ?? defaultGameSchedule);
    const selectedDayRangeLabel = getDayRangeLabel(dayDates, selectedDayIndex, numberOfRealDaysPerInGameDay);
    const isLocked = dayDates[selectedDayIndex] ? !isDayContentReleased(dayDates, selectedDayIndex, schedule.wakeUpTime) : false;
    const usepaper = newspaperRecords.value?.columns?.length ? newspaperRecords.value : minimumUsepaper;

    return (
        <Column gap={4}>
            {dayDates.length === 0 ? (
                <Column className='rounded-xl border border-subtle-border bg-white p-4'>
                    <PoppinsText varient='subtext'>The operator has not added any game days yet.</PoppinsText>
                </Column>
            ) : (
                <>
                    <PlayerDaySelector
                        dayDates={dayDates}
                        selectedDayIndex={selectedDayIndex}
                        currentDayIndex={currentDayIndex}
                        onSelectDay={setSelectedDayIndex}
                        fallbackSpanDays={numberOfRealDaysPerInGameDay}
                    />
                    {isLocked ? (
                        <Column className='rounded-xl border border-subtle-border bg-white p-4'>
                            <PoppinsText weight='medium'>{selectedDayRangeLabel || 'This paper'} is not out yet.</PoppinsText>
                            <PoppinsText varient='subtext'>It releases at {formatTimeLabel(schedule.wakeUpTime)}.</PoppinsText>
                        </Column>
                    ) : (
                        <ScrollView horizontal={true} className='w-full'>
                            <Column gap={4} className='w-[950px] rounded-xl border border-subtle-border bg-white p-4'>
                                <Row gap={4} className='w-full'>
                                    {usepaper.columns.map((columnMarkdown, columnIndex) => (
                                        <Column key={columnIndex} className='flex-1 shrink'>
                                            {columnMarkdown.trim().length > 0 ? (
                                                <MarkdownRenderer markdown={columnMarkdown} textAlign='justify' />
                                            ) : (
                                                <PoppinsText varient='subtext' className='text-center'>Empty column</PoppinsText>
                                            )}
                                        </Column>
                                    ))}
                                </Row>
                            </Column>
                        </ScrollView>
                    )}
                </>
            )}
        </Column>
    );
};

export default ReadOnlyNewspaperPagePLAYER;
