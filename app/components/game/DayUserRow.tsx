import React, { useState } from 'react';
import InlineEditableText from '../ui/forms/InlineEditableText';
import Column from '../layout/Column';
import Row from '../layout/Row';
import Animated, { Easing, FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { UserTableItem } from '../../../types/playerTable';
import { getPlayerActionSummary } from '../../../utils/multiplayer';
import { getInnerTextWidth } from './playerTableColumnSizing';

interface DayUserRowProps {
    user: UserTableItem;
    index: number;
    isLast: boolean;
    dayNumber: number;
    setVoteValue?: (userIndex: number, newValue: string) => void;
    setActionValue?: (userIndex: number, newValue: string) => void;
    setExtraColumnValue?: (userIndex: number, columnIndex: number, newValue: string) => void;
    userTableColumnVisibility?: {
        extraUserColumns: boolean[];
        extraDayColumns: boolean[];
    };
    onEditStart?: () => void;
    onEditEnd?: () => void;
    isEditing?: boolean;
    dayBaseColumnWidths: {
        vote: number;
        action: number;
    };
    extraDayColumnWidths: number[];
}

const DayUserRow = ({ user, index, isLast, dayNumber, setVoteValue, setActionValue, setExtraColumnValue, userTableColumnVisibility, onEditStart, onEditEnd, isEditing, dayBaseColumnWidths, extraDayColumnWidths }: DayUserRowProps) => {
    const [editingColumns, setEditingColumns] = useState<Record<number, boolean>>({});
    const [isEditingVote, setIsEditingVote] = useState(false);

    const dayData = user.days[dayNumber] || { vote: "", action: "", extraColumns: [] };

    const handleColumnEditStart = (columnIndex: number) => {
        setEditingColumns(prev => ({ ...prev, [columnIndex]: true }));
        onEditStart?.();
    };

    const handleColumnEditEnd = (columnIndex: number) => {
        setEditingColumns(prev => ({ ...prev, [columnIndex]: false }));
        onEditEnd?.();
    };

    const handleVoteEditStart = () => {
        onEditStart?.();
        setIsEditingVote(true);
    };

    const handleVoteEditEnd = () => {
        onEditEnd?.();
        setIsEditingVote(false);
    };

    const handleActionEditStart = () => {
        onEditStart?.();
    };

    const handleActionEditEnd = () => {
        onEditEnd?.();
    };

    const actionDisplayValue = getPlayerActionSummary(dayData.action);


    return (
        <Row gap={0} className={` h-12 w-min ${isEditing ? 'z-50' : ''}`}>
            <Column className={`h-full border border-subtle-border items-center justify-center z-10 ${isLast ? 'rounded-bl-lg' : ''}`} style={{ width: dayBaseColumnWidths.vote }}>
                <InlineEditableText
                    value={dayData.vote || ''}
                    onChange={(newValue) => setVoteValue?.(index, newValue)}
                    placeholder='Vote'
                    className='text-center text-nowrap overflow-hidden'
                    style={{ width: getInnerTextWidth(dayBaseColumnWidths.vote, 16) }}
                    weight='medium'
                    onEditStart={handleVoteEditStart}
                    onEditEnd={handleVoteEditEnd}
                />
            </Column>
            <Column gap={0} className={`h-full border border-subtle-border items-center justify-center ${isEditingVote ? 'z-0' : 'z-20'}`} style={{ width: dayBaseColumnWidths.action }}>
                <InlineEditableText
                    value={actionDisplayValue}
                    onChange={(newValue) => setActionValue?.(index, newValue)}
                    placeholder='Action'
                    className='text-center text-nowrap overflow-hidden'
                    style={{ width: getInnerTextWidth(dayBaseColumnWidths.action, 16) }}
                    weight='medium'
                    onEditStart={handleActionEditStart}
                    onEditEnd={handleActionEditEnd}
                />
            </Column>

            {dayData.extraColumns?.map((column, columnIndex) => {
                if (!userTableColumnVisibility?.extraDayColumns[columnIndex]) return null;

                const visibleColumns = dayData.extraColumns?.filter((_, idx) => userTableColumnVisibility?.extraDayColumns[idx]) || [];
                const visibleIndex = visibleColumns.indexOf(column);
                const isLastVisibleColumn = visibleIndex === visibleColumns.length - 1;
                const columnWidth = extraDayColumnWidths[columnIndex] ?? 112;

                return (
                    <Animated.View
                        className={`${editingColumns[columnIndex] ? 'z-50' : ''}`}
                        key={columnIndex}
                        entering={
                            FadeInDown.duration(100).easing(Easing.ease)
                        }
                        exiting={
                            FadeOutUp.duration(100).easing(Easing.ease)
                        }
                    >
                        <Column className={`h-full border border-subtle-border items-center justify-center ${isLast && isLastVisibleColumn ? 'rounded-br-lg' : ''} `} style={{ width: columnWidth }}>
                            <InlineEditableText
                                value={column}
                                onChange={(newValue) => setExtraColumnValue?.(index, columnIndex, newValue)}
                                placeholder='UNSET'
                                className='text-center text-nowrap overflow-hidden'
                                style={{ width: getInnerTextWidth(columnWidth, 16) }}
                                weight='medium'
                                onEditStart={() => handleColumnEditStart(columnIndex)}
                                onEditEnd={() => handleColumnEditEnd(columnIndex)}
                            />
                        </Column>
                    </Animated.View>
                );
            })}
        </Row>
    );
};

export default DayUserRow;
