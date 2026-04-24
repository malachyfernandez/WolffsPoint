import React, { useEffect, useState, useCallback } from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
import FontText from '../ui/text/FontText';
import { useList, useValue } from 'hooks/useData';
import Column from '../layout/Column';
import Row from '../layout/Row';
import NightlyDayUserRow from './NightlyDayUserRow';
import NightlyDayTitleRow from './NightlyDayTitleRow';
import { createUndoSnapshot, useUndoRedo } from 'hooks/useUndoRedo';
import { UserTableItem } from 'types/playerTable';
import {
    ColumnSizeOption,
    NightlyPageColumnSizes,
    defaultNightlyPageColumnSizes,
    getNightlyPageColumnSizesKey,
    getWidthForColumnSize,
} from './nightlyTableColumnSizing';

interface NightlyDaysTableProps {
    gameId: string;
    dayNumber: number;
    isBeingEdited: boolean;
    setIsBeingEdited: (value: boolean) => void;
    className?: string;
    onLayout?: (event: any) => void;
    onWidthChange?: (width: number) => void;
    morningMessagesList: Record<string, string[]>;
    updateMorningMessage: (dayIndex: number, userIndex: number, value: string) => void;
    onColumnsReady?: (ready: boolean) => void;
}

const NightlyDaysTable = ({
    gameId,
    dayNumber,
    isBeingEdited,
    setIsBeingEdited,
    className,
    onLayout,
    onWidthChange,
    morningMessagesList,
    updateMorningMessage,
    onColumnsReady
}: NightlyDaysTableProps) => {
    const { executeCommand } = useUndoRedo();
    const [editingRow, setEditingRow] = useState<'title' | number | null>(null);
    const tableRef = React.useRef<any>(null);

    const handleRowEditStart = (rowType: 'title' | number) => {
        setEditingRow(rowType);
        setIsBeingEdited(true);
    };

    const handleRowEditEnd = () => {
        setEditingRow(null);
        setIsBeingEdited(false);
    };

    const measureTableWidth = useCallback(() => {
        if (tableRef.current && onWidthChange) {
            // Use setTimeout to ensure layout is updated after state changes
            const timeoutId = setTimeout(() => {
                if (tableRef.current) {
                    tableRef.current.measure((x: number, y: number, width: number, height: number) => {
                        onWidthChange(width);
                    });
                }
            }, 0);

            // Cleanup timeout if component unmounts
            return () => clearTimeout(timeoutId);
        }
    }, [onWidthChange]);

    // Subscribe to nightly page column sizes
    const [columnSizes, setColumnSizes] = useValue<NightlyPageColumnSizes>(
        getNightlyPageColumnSizesKey(gameId),
        { defaultValue: defaultNightlyPageColumnSizes }
    );

    // Track when column data is ready (only check isSyncing, not value presence)
    const areColumnsReady = !columnSizes?.state?.isSyncing;

    useEffect(() => {
        onColumnsReady?.(areColumnsReady);
    }, [areColumnsReady, onColumnsReady]);

    // Calculate column widths based on sizes
    const columnWidths = {
        vote: getWidthForColumnSize(112, columnSizes.value.vote),
        action: getWidthForColumnSize(112, columnSizes.value.action),
        morningMessage: getWidthForColumnSize(112, columnSizes.value.morningMessage),
    };

    // Wait for column widths to be ready before rendering to prevent flicker
    const areColumnWidthsReady = columnWidths.vote > 0 && columnWidths.action > 0 && columnWidths.morningMessage > 0;

    // Handle column size changes
    const setColumnSize = (columnKey: 'vote' | 'action' | 'morningMessage', size: ColumnSizeOption) => {
        const currentSizes = columnSizes.value ?? defaultNightlyPageColumnSizes;
        setColumnSizes({
            ...currentSizes,
            [columnKey]: size,
        });
    };

    // Measure width when column sizes change
    useEffect(() => {
        const cleanup = measureTableWidth();
        return cleanup;
    }, [measureTableWidth, columnSizes.value.vote, columnSizes.value.action, columnSizes.value.morningMessage]);

    const [userTable, setUserTable] = useList<UserTableItem[]>("userTable", gameId, { privacy: "PUBLIC" });

    const users = userTable?.value ?? [];

    const setVoteValue = (userIndex: number, newVoteValue: string) => {
        const updatedUsers = [...users];
        if (userIndex >= 0 && userIndex < updatedUsers.length) {
            const user = updatedUsers[userIndex];
            const days = [...user.days];
            
            // Ensure the day exists
            while (days.length <= dayNumber) {
                days.push({ vote: "", action: "", extraColumns: [] });
            }
            
            days[dayNumber] = {
                ...days[dayNumber],
                vote: newVoteValue
            };
            
            updatedUsers[userIndex] = {
                ...user,
                days: days
            };
            setUserTable(updatedUsers);
        }
    };

    const UNDOABLEsetVoteValue = (userIndex: number, newVoteValue: string) => {
        const previousUserTable = createUndoSnapshot(userTable?.value ?? []);
        if (userIndex < 0 || userIndex >= previousUserTable.length) return;

        const nextUserTable = createUndoSnapshot(previousUserTable);
        const user = nextUserTable[userIndex];
        const days = [...user.days];

        while (days.length <= dayNumber) {
            days.push({ vote: "", action: "", extraColumns: [] });
        }

        days[dayNumber] = {
            ...days[dayNumber],
            vote: newVoteValue
        };

        nextUserTable[userIndex] = {
            ...user,
            days
        };

        executeCommand({
            action: () => setUserTable(createUndoSnapshot(nextUserTable)),
            undoAction: () => setUserTable(createUndoSnapshot(previousUserTable)),
            description: "Set Vote"
        });
    };

    const setActionValue = (userIndex: number, newActionValue: string) => {
        const updatedUsers = [...users];
        if (userIndex >= 0 && userIndex < updatedUsers.length) {
            const user = updatedUsers[userIndex];
            const days = [...user.days];
            
            // Ensure the day exists
            while (days.length <= dayNumber) {
                days.push({ vote: "", action: "", extraColumns: [] });
            }
            
            days[dayNumber] = {
                ...days[dayNumber],
                action: newActionValue
            };
            
            updatedUsers[userIndex] = {
                ...user,
                days: days
            };
            setUserTable(updatedUsers);
        }
    };

    const UNDOABLEsetActionValue = (userIndex: number, newActionValue: string) => {
        const previousUserTable = createUndoSnapshot(userTable?.value ?? []);
        if (userIndex < 0 || userIndex >= previousUserTable.length) return;

        const nextUserTable = createUndoSnapshot(previousUserTable);
        const user = nextUserTable[userIndex];
        const days = [...user.days];

        while (days.length <= dayNumber) {
            days.push({ vote: "", action: "", extraColumns: [] });
        }

        days[dayNumber] = {
            ...days[dayNumber],
            action: newActionValue
        };

        nextUserTable[userIndex] = {
            ...user,
            days
        };

        executeCommand({
            action: () => setUserTable(createUndoSnapshot(nextUserTable)),
            undoAction: () => setUserTable(createUndoSnapshot(previousUserTable)),
            description: "Set Action"
        });
    };

    const UNDOABLEupdateMorningMessage = (dayIndex: number, userIndex: number, value: string) => {
        const user = users[userIndex];
        if (!user) return;
        
        const previousMessagesList = createUndoSnapshot(morningMessagesList);
        const nextMessagesList = createUndoSnapshot(previousMessagesList);
        
        if (!nextMessagesList[user.email]) {
            nextMessagesList[user.email] = [];
        }
        
        const userMessages = [...nextMessagesList[user.email]];
        userMessages[dayIndex] = value;
        nextMessagesList[user.email] = userMessages;

        executeCommand({
            action: () => updateMorningMessage(dayIndex, userIndex, value),
            undoAction: () => {
                if (previousMessagesList[user.email] && nextMessagesList[user.email]) {
                    updateMorningMessage(dayIndex, userIndex, previousMessagesList[user.email][dayIndex] || "");
                }
            },
            description: "Update Morning Message"
        });
    };

    return (
        <Column onLayout={onLayout} ref={tableRef} className='gap-0'>
            { !areColumnWidthsReady ? (
                <Row className='gap-0 h-12 w-min bg-text/5' />
            ) : (
                <Row className='gap-0'>
                    <Column className={`gap-0 border-border border-2 rounded w-min ${className || ''}`}>
                        <NightlyDayTitleRow
                            onEditStart={() => handleRowEditStart('title')}
                            onEditEnd={handleRowEditEnd}
                            isEditing={editingRow === 'title'}
                            columnWidths={columnWidths}
                            columnSizes={columnSizes.value}
                            onSetColumnSize={setColumnSize}
                        />
                        {users.map((user, index) => (
                            <Animated.View key={index} entering={FadeIn.duration(300).delay(index * 50)}>
                                <NightlyDayUserRow
                                    user={user}
                                    index={index}
                                    isLast={index === users.length - 1}
                                    dayNumber={dayNumber}
                                    setVoteValue={UNDOABLEsetVoteValue}
                                    setActionValue={UNDOABLEsetActionValue}
                                    updateMorningMessage={UNDOABLEupdateMorningMessage}
                                    onEditStart={() => handleRowEditStart(index)}
                                    onEditEnd={handleRowEditEnd}
                                    isEditing={editingRow === index}
                                    morningMessagesList={morningMessagesList}
                                    columnWidths={columnWidths}
                                    users={users}
                                />
                            </Animated.View>
                        ))}
                    </Column>
                </Row>
            )}
        </Column>
    );
};

export default NightlyDaysTable;
