import React from 'react';
import Column from '../layout/Column';
import NewspaperViewingView from './NewspaperViewingView';
import NewspaperViewingHeader from './NewspaperViewingHeader';

interface NewspaperDayViewProps {
    gameId: string;
    dayIndex: number;
}

const getNewspaperKey = (dayIndex: number) => {
    return `day-${dayIndex}`;
};

const NewspaperDayView = ({ gameId, dayIndex }: NewspaperDayViewProps) => {
    return (
        <Column gap={4}>
            <NewspaperViewingHeader />
            <NewspaperViewingView itemId={`${gameId}-${getNewspaperKey(dayIndex)}`} />
        </Column>
    );
};

export default NewspaperDayView;
