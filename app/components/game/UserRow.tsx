import React, { useRef, useState, useEffect } from 'react';
import FontText from '../ui/text/FontText';
import InlineEditableText from '../ui/forms/InlineEditableText';
import Column from '../layout/Column';
import Row from '../layout/Row';
import CustomCheckbox from '../ui/CustomCheckbox';
import Animated, { FadeInLeft, FadeInRight, FadeOutDown, FadeOutLeft, FadeOutRight, Easing, FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { Pressable, View } from 'react-native';
import UserEditDialog from './UserEditDialog';
import { useList } from 'hooks/useData';
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
    extraUserColumnWidths?: number[];
}


const UserRow = ({ 
    user, 
    index, 
    isLast, 
    setLivingState,
    onEditStart, 
    onEditEnd, 
    isEditing, 
    gameId,
    setExtraColumnValue,
    userTableColumnVisibility,
    extraUserColumnWidths
}: UserRowProps) => {
    const [editingColumns, setEditingColumns] = useState<Record<number, boolean>>({});
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const hasMounted = useRef(false);

    useEffect(() => {
        // Mark as mounted after initial render to enable animations for add/remove
        const timer = setTimeout(() => {
            hasMounted.current = true;
        }, 500);
        return () => clearTimeout(timer);
    }, []);

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
    const [userTable, setUserTable] = useList<UserTableItem[]>("userTable", gameId);
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
            <Row className={`gap-0 h-12 w-min ${isEditing ? 'z-50' : ''}`}>
                <Column className={`gap-4 w-12 h-full border border-subtle-border items-center justify-center ${isLast ? 'rounded-bl-lg' : ''}`}>
                    <CustomCheckbox checked={isDead} onChange={toggleLivingState} />
                </Column>
                <Column className='gap-0 w-28 h-full border border-subtle-border items-center justify-center'>
                    <Pressable onPress={() => setIsDialogOpen(true)} className='w-28 h-full items-center justify-center'>
                        <FontText
                            weight='medium'
                            className='text-center text-nowrap overflow-hidden w-28'
                            style={{
                                textDecorationLine: 'underline',
                                textDecorationStyle: 'dotted',
                            }}
                        >
                            {user.realName || (
                                <FontText className="opacity-50">No Name</FontText>
                            )}
                        </FontText>
                        <FontText
                            variant='subtext'
                            className='text-center text-nowrap overflow-hidden w-28'
                            style={{
                                textDecorationLine: 'underline',
                                textDecorationStyle: 'dotted',
                            }}
                        >
                            {user.role === "UNSET" ? (
                                <FontText className="opacity-50">UNSET</FontText>
                            ) : user.role ? (
                                user.role
                            ) : (
                                <FontText className="opacity-50">No role</FontText>
                            )}
                        </FontText>
                    </Pressable>
                </Column>

                {user.playerData.extraColumns?.map((column, columnIndex) => {
                    if (!userTableColumnVisibility?.extraUserColumns[columnIndex]) return null;

                    const visibleColumns = user.playerData.extraColumns?.filter((_, idx) => userTableColumnVisibility?.extraUserColumns[idx]) || [];
                    const visibleIndex = visibleColumns.indexOf(column);
                    const isLastVisibleColumn = visibleIndex === visibleColumns.length - 1;

                    const columnWidth = extraUserColumnWidths?.[columnIndex] ?? 112;

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
                            <Column className={`gap-4 h-full border border-subtle-border items-center justify-center ${isLast && isLastVisibleColumn ? 'rounded-br-lg' : ''}`} style={{ width: columnWidth }}>
                                <InlineEditableText
                                    value={column}
                                    onChange={(newValue) => setExtraColumnValue?.(index, columnIndex, newValue)}
                                    placeholder='UNSET'
                                    className='text-center text-nowrap overflow-hidden'
                                    style={{ width: columnWidth - 32 }}
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
