import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Pressable, View } from 'react-native';
import InlineEditableText from '../ui/forms/InlineEditableText';
import Column from '../layout/Column';
import Row from '../layout/Row';
import PoppinsText from '../ui/text/PoppinsText';
import Animated, { Easing, FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { UserTableItem } from '../../../types/playerTable';
import { getPlayerActionSummary } from '../../../utils/multiplayer';
import { getInnerTextWidth } from './playerTableColumnSizing';
import ActionPills from './ActionPills';
import ActionEditorDialog from './ActionEditorDialog';
import VoteEditorDialog, { resolveVoteEmailToName } from './VoteEditorDialog';

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
    users: UserTableItem[];
}

const DayUserRow = ({ user, index, isLast, dayNumber, setVoteValue, setActionValue, setExtraColumnValue, userTableColumnVisibility, onEditStart, onEditEnd, isEditing, dayBaseColumnWidths, extraDayColumnWidths, users }: DayUserRowProps) => {
    const [editingColumns, setEditingColumns] = useState<Record<number, boolean>>({});
    const [isEditingVote, setIsEditingVote] = useState(false);
    const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
    const [isVoteDialogOpen, setIsVoteDialogOpen] = useState(false);
    const hasMounted = useRef(false);

    useEffect(() => {
        // Mark as mounted after initial render to enable animations for add/remove
        const timer = setTimeout(() => {
            hasMounted.current = true;
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    const dayData = user.days[dayNumber] || { vote: "", action: "", extraColumns: [] };

    const handleColumnEditStart = (columnIndex: number) => {
        setEditingColumns(prev => ({ ...prev, [columnIndex]: true }));
        onEditStart?.();
    };

    const handleColumnEditEnd = (columnIndex: number) => {
        setEditingColumns(prev => ({ ...prev, [columnIndex]: false }));
        onEditEnd?.();
    };

    const handleVotePress = () => {
        setIsVoteDialogOpen(true);
    };

    const handleActionPress = () => {
        setIsActionDialogOpen(true);
    };

    // Resolve vote email to player name
    const resolvedVoteName = useMemo(() => {
        return resolveVoteEmailToName(dayData.vote || '', users);
    }, [dayData.vote, users]);


    return (
        <Row gap={0} className={` h-12 w-min ${isEditing ? 'z-50' : ''}`}>
            <Column className={`h-full border border-subtle-border items-center justify-center z-10 ${isLast ? 'rounded-bl-lg' : ''}`} style={{ width: dayBaseColumnWidths.vote }}>
                <Pressable onPress={handleVotePress} className="w-full h-full items-center justify-center px-1">
                    <PoppinsText
                        weight="medium"
                        className="text-center text-nowrap overflow-hidden"
                        style={{ width: dayBaseColumnWidths.vote - 16 }}
                    >
                        {dayData.vote ? resolvedVoteName : 'Vote'}
                    </PoppinsText>
                </Pressable>
            </Column>
            <Column gap={0} className={`h-full border border-subtle-border items-center justify-center z-20`} style={{ width: dayBaseColumnWidths.action }}>
                <Pressable onPress={handleActionPress} className="w-full h-full items-center justify-center px-1">
                    <View style={{ width: dayBaseColumnWidths.action - 8 }}>
                        <ActionPills actionText={getPlayerActionSummary(dayData.action)} />
                    </View>
                </Pressable>
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
                            hasMounted.current ? FadeInDown.duration(100).easing(Easing.ease) : undefined
                        }
                        exiting={
                            hasMounted.current ? FadeOutUp.duration(100).easing(Easing.ease) : undefined
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
            <ActionEditorDialog
                isOpen={isActionDialogOpen}
                onOpenChange={setIsActionDialogOpen}
                title={`${user.realName || 'User'} Action`}
                initialAction={getPlayerActionSummary(dayData.action)}
                onSubmit={(action) => setActionValue?.(index, action)}
                dialogSubtext={`Set the action for ${user.realName || 'User'}.`}
            />
            <VoteEditorDialog
                isOpen={isVoteDialogOpen}
                onOpenChange={setIsVoteDialogOpen}
                title={`${user.realName || 'User'} Vote`}
                initialVote={dayData.vote || ''}
                onSubmit={(vote) => setVoteValue?.(index, vote)}
                dialogSubtext={`Set the vote target for ${user.realName || 'User'}.`}
                users={users}
            />
        </Row>
    );
};

export default DayUserRow;
