import React, { useState, useEffect } from 'react';
import PoppinsText from '../ui/text/PoppinsText';
import InlineEditableText from '../ui/forms/InlineEditableText';
import Column from '../layout/Column';
import Row from '../layout/Row';
import CustomCheckbox from '../ui/CustomCheckbox';
import Animated, { FadeInLeft, FadeInRight, FadeOutDown, FadeOutLeft, FadeOutRight, Easing, FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { Pressable, View } from 'react-native';
import UserEditDialog from './UserEditDialog';
import { useUserList } from 'hooks/useUserList';
import { UserTableItem } from 'types/playerTable';
import { createUndoSnapshot, useUndoRedo } from 'hooks/useUndoRedo';

interface UserRowProps {
    user: {
        userId: string | "NOT-JOINED";
        realName: string;
        email: string;
        role: string;
        playerData: {
            livingState: 'alive' | 'dead';
            extraColumns?: string[];
        };
        days: Array<{
            votes?: string[];
            actions?: string[];
            extraColumns?: string[];
        }>;
    };
    index: number;
    isLast: boolean;
    setLivingState: (userIndex: number, newLivingState: 'alive' | 'dead') => void;
    setExtraColumnValue?: (userIndex: number, columnIndex: number, newValue: string) => void;
    userTableColumnVisibility?: {
        extraUserColumns: boolean[];
        extraDayColumns: boolean[];
    };
    onEditStart?: () => void;
    onEditEnd?: () => void;
    isEditing?: boolean;
    gameId: string;
}


const UserRow = ({ user, index, isLast, setLivingState, setExtraColumnValue, userTableColumnVisibility, onEditStart, onEditEnd, isEditing, gameId }: UserRowProps) => {
    const [editingColumns, setEditingColumns] = useState<Record<number, boolean>>({});
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const toggleLivingState = () => {
        const newLivingState = user.playerData.livingState === 'alive' ? 'dead' : 'alive';
        setLivingState(index, newLivingState);
    };

    const isDead = user.playerData.livingState === 'dead';

    const handleColumnEditStart = (columnIndex: number) => {
        setEditingColumns(prev => ({ ...prev, [columnIndex]: true }));
        onEditStart?.();
    };

    const handleColumnEditEnd = (columnIndex: number) => {
        setEditingColumns(prev => ({ ...prev, [columnIndex]: false }));
        onEditEnd?.();
    };


    // GREAT UNDO EXAMPLE
    const [userTable, setUserTable] = useUserList<UserTableItem[]>({
        key: "userTable",
        itemId: gameId,
        privacy: "PUBLIC",
    });
    // User Row.tsx
    // UserEditDialouge.tsx


    const deleteUser = (userIndex: number) => {
        const filteredUserTable = userTable?.value?.filter((userRow, index) => index != userIndex);
        setUserTable(filteredUserTable ?? []);
    };

    const { executeCommand } = useUndoRedo();

    const UNDOABLEdeleteUser = (userIndex: number) => {
        const previousUserTable = createUndoSnapshot(userTable?.value ?? []);
        const nextUserTable = previousUserTable.filter((_, index) => index !== userIndex);

        executeCommand({
            action: () => setUserTable(createUndoSnapshot(nextUserTable)),
            undoAction: () => setUserTable(createUndoSnapshot(previousUserTable)),
            description: "Deleted user"
        });
    };


    return (
        <>
            <Row gap={0} className={` h-12 w-min ${isEditing ? 'z-50' : ''}`}>
                <Column className={`w-12 h-full border border-subtle-border items-center justify-center ${isLast ? 'rounded-bl-lg' : ''}`}>
                    <CustomCheckbox checked={isDead} onChange={toggleLivingState} />
                </Column>
                <Column gap={0} className='w-28 h-full border border-subtle-border items-center justify-center'>
                    <Pressable onPress={() => setIsDialogOpen(true)} className='w-28 h-full items-center justify-center'>
                        <PoppinsText
                            weight='medium'
                            className='text-center text-nowrap overflow-hidden w-28'
                            style={{
                                textDecorationLine: 'underline',
                                textDecorationStyle: 'dotted',
                            }}
                        >
                            {user.realName || (
                                <PoppinsText className="opacity-50">No Name</PoppinsText>
                            )}
                        </PoppinsText>
                        <PoppinsText
                            varient='subtext'
                            className='text-center text-nowrap overflow-hidden w-28'
                            style={{
                                textDecorationLine: 'underline',
                                textDecorationStyle: 'dotted',
                            }}
                        >
                            {user.role === "UNSET" ? (
                                <PoppinsText className="opacity-50">UNSET</PoppinsText>
                            ) : user.role ? (
                                user.role
                            ) : (
                                <PoppinsText className="opacity-50">No role</PoppinsText>
                            )}
                        </PoppinsText>
                    </Pressable>
                </Column>

                {user.playerData.extraColumns?.map((column, columnIndex) => {
                    if (!userTableColumnVisibility?.extraUserColumns[columnIndex]) return null;

                    const visibleColumns = user.playerData.extraColumns?.filter((_, idx) => userTableColumnVisibility?.extraUserColumns[idx]) || [];
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
            <UserEditDialog
                isOpen={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                userIndex={index}
                currentRealName={user.realName}
                currentEmail={user.email}
                currentRole={user.role}
                onPress={() => setIsDialogOpen(true)}
                gameId={gameId}
                onDelete={() => UNDOABLEdeleteUser(index)}
            />
        </>
    );
};

export default UserRow;
