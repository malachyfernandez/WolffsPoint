import React, { useState } from 'react';
import PoppinsText from '../ui/text/PoppinsText';
import InlineEditableText from '../ui/forms/InlineEditableText';
import Column from '../layout/Column';
import Row from '../layout/Row';
import Animated, { FadeInLeft, FadeInRight, FadeOutDown, FadeOutLeft, FadeOutRight, Easing, FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { UserTableItem } from '../../../types/playerTable';
import { getPlayerActionSummary } from '../../../utils/multiplayer';

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
}

const DayUserRow = ({ user, index, isLast, dayNumber, setVoteValue, setActionValue, setExtraColumnValue, userTableColumnVisibility, onEditStart, onEditEnd, isEditing }: DayUserRowProps) => {
    const [editingColumns, setEditingColumns] = useState<Record<number, boolean>>({});
    const [editingVote, setEditingVote] = useState(false);
    const [editingAction, setEditingAction] = useState(false);

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
        setEditingVote(true);
        onEditStart?.();
        setIsEditingVote(true);
    };

    const handleVoteEditEnd = () => {
        setEditingVote(false);
        onEditEnd?.();
        setIsEditingVote(false);
    };

    const handleActionEditStart = () => {
        setEditingAction(true);
        onEditStart?.();
    };

    const handleActionEditEnd = () => {
        setEditingAction(false);
        onEditEnd?.();
    };

    const [isEditingVote, setIsEditingVote] = useState(false);

    const actionDisplayValue = getPlayerActionSummary(dayData.action);


    return (
        <Row gap={0} className={` h-12 w-min ${isEditing ? 'z-50' : ''}`}>
            <Column className={`w-28 h-full border border-subtle-border items-center justify-center z-10 ${isLast ? 'rounded-bl-lg' : ''}`}>
                <InlineEditableText
                    value={dayData.vote || ''}
                    onChange={(newValue) => setVoteValue?.(index, newValue)}
                    placeholder='Vote'
                    className='w-20 text-center text-nowrap overflow-hidden'
                    weight='medium'
                    onEditStart={handleVoteEditStart}
                    onEditEnd={handleVoteEditEnd}
                />
            </Column>
            <Column gap={0} className={`w-28 h-full border border-subtle-border items-center justify-center ${isEditingVote ? 'z-0' : 'z-20'}`}>
                <InlineEditableText
                    value={actionDisplayValue}
                    onChange={(newValue) => setActionValue?.(index, newValue)}
                    placeholder='Action'
                    className='w-20 text-center text-nowrap overflow-hidden'
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
                        <Column className={`w-28 h-full border border-subtle-border items-center justify-center ${isLast && isLastVisibleColumn ? 'rounded-br-lg' : ''} `}>
                            <InlineEditableText
                                value={column}
                                onChange={(newValue) => setExtraColumnValue?.(index, columnIndex, newValue)}
                                placeholder='UNSET'
                                className='w-20 text-center text-nowrap overflow-hidden'
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
