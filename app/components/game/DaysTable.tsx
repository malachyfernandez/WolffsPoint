import React, { useCallback, useEffect, useState, useRef } from 'react';
import PoppinsText from '../ui/text/PoppinsText';
import { useUserList } from 'hooks/useUserList';
import { useUserVariable } from 'hooks/useUserVariable';
import Column from '../layout/Column';
import AppButton from '../ui/buttons/AppButton';
import Row from '../layout/Row';
import DayUserRow from './DayUserRow';
import DayTitleRow from './DayTitleRow';
import { createUndoSnapshot, useUndoRedo } from 'hooks/useUndoRedo';
import { UserTableItem, UserTableTitle, UserTableColumnVisibility } from 'types/playerTable';
import { ColumnSizeOption, PlayerPageColumnSizes, defaultPlayerPageColumnSizes, getPlayerPageColumnSizesKey, getWidthForColumnSize } from './playerTableColumnSizing';
import { getTargetDayCount, normalizePlayerPageState } from './playerTableNormalization';

interface DaysTableProps {
    gameId: string;
    dayNumber: number;
    dayCount: number;
    isBeingEdited: boolean;
    setIsBeingEdited: (value: boolean) => void;
    className?: string;
    onLayout?: (event: any) => void;
    onWidthChange?: (width: number) => void;
}

const DaysTable = ({ gameId, dayNumber, dayCount, isBeingEdited, setIsBeingEdited, className, onLayout, onWidthChange }: DaysTableProps) => {
    const { executeCommand } = useUndoRedo();
    const [editingRow, setEditingRow] = useState<'title' | number | null>(null);
    const tableRef = useRef<any>(null);

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

    const [userTable, setUserTable] = useUserList<UserTableItem[]>({
        key: "userTable",
        itemId: gameId,
        privacy: "PUBLIC",
    });

    const users = userTable?.value ?? [];

    const [userTableTitle, setUserTableTitle] = useUserList<UserTableTitle>({
        key: "userTableTitle",
        itemId: gameId,
        privacy: "PUBLIC",
    });

    const [userTableColumnVisibility, setUserTableColumnVisibility] = useUserList<UserTableColumnVisibility>({
        key: "userTableColumnVisibility",
        itemId: gameId,
        privacy: "PUBLIC",
    });

    const [columnSizes, setColumnSizes] = useUserVariable<PlayerPageColumnSizes>({
        key: getPlayerPageColumnSizesKey(gameId),
        defaultValue: defaultPlayerPageColumnSizes,
    });

    const targetDayCount = getTargetDayCount(userTable?.value, Math.max(dayCount, dayNumber + 1));

    const getNormalizedState = useCallback((overrides?: {
        titles?: UserTableTitle;
        visibility?: UserTableColumnVisibility;
        users?: UserTableItem[];
        columnSizes?: PlayerPageColumnSizes;
    }) => {
        return normalizePlayerPageState({
            titles: overrides?.titles ?? userTableTitle?.value,
            visibility: overrides?.visibility ?? userTableColumnVisibility?.value,
            users: overrides?.users ?? userTable?.value,
            targetDayCount,
            columnSizes: overrides?.columnSizes ?? columnSizes.value,
        });
    }, [columnSizes.value, targetDayCount, userTable?.value, userTableColumnVisibility?.value, userTableTitle?.value]);

    useEffect(() => {
        const normalizedState = getNormalizedState();
        const currentTitles = userTableTitle?.value ?? { extraUserColumns: [], extraDayColumns: [] };
        const currentVisibility = userTableColumnVisibility?.value ?? { extraUserColumns: [], extraDayColumns: [] };
        const currentUsers = userTable?.value ?? [];
        const currentColumnSizes = columnSizes.value ?? defaultPlayerPageColumnSizes;

        if (JSON.stringify(currentVisibility) !== JSON.stringify(normalizedState.visibility)) {
            setUserTableColumnVisibility(normalizedState.visibility);
        }

        if (JSON.stringify(currentUsers) !== JSON.stringify(normalizedState.users)) {
            setUserTable(normalizedState.users);
        }

        if (JSON.stringify(currentColumnSizes) !== JSON.stringify(normalizedState.columnSizes)) {
            setColumnSizes(normalizedState.columnSizes);
        }

        if (JSON.stringify(currentTitles) !== JSON.stringify(normalizedState.titles)) {
            setUserTableTitle(normalizedState.titles);
        }
    }, [columnSizes.value, getNormalizedState, setColumnSizes, setUserTable, setUserTableColumnVisibility, setUserTableTitle, userTable?.value, userTableColumnVisibility?.value, userTableTitle?.value]);

    // Measure width when columns change
    useEffect(() => {
        const cleanup = measureTableWidth();
        return cleanup;
    }, [
        measureTableWidth,
        userTableTitle?.value?.extraDayColumns?.length,
        userTableColumnVisibility?.value?.extraDayColumns,
        columnSizes.value.dayBaseColumns.action,
        columnSizes.value.dayBaseColumns.vote,
        columnSizes.value.dayExtraColumns,
    ]);
    const UNDOABLEsetVoteValue = (userIndex: number, newVoteValue: string) => {
        const previousUserTable = createUndoSnapshot(userTable?.value ?? []);
        if (userIndex < 0 || userIndex >= previousUserTable.length) return;

        const nextUserTable = createUndoSnapshot(getNormalizedState({ users: previousUserTable }).users);
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

    const UNDOABLEsetActionValue = (userIndex: number, newActionValue: string) => {
        const previousUserTable = createUndoSnapshot(userTable?.value ?? []);
        if (userIndex < 0 || userIndex >= previousUserTable.length) return;

        const nextUserTable = createUndoSnapshot(getNormalizedState({ users: previousUserTable }).users);
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

    const UNDOABLEsetExtraDayColumnValue = (userIndex: number, extraColumnIndex: number, newExtraColumnValue: string) => {
        const previousUserTable = createUndoSnapshot(userTable?.value ?? []);
        if (userIndex < 0 || userIndex >= previousUserTable.length) return;

        const nextUserTable = createUndoSnapshot(getNormalizedState({ users: previousUserTable }).users);
        const user = nextUserTable[userIndex];
        const days = [...user.days];

        while (days.length <= dayNumber) {
            days.push({ vote: "", action: "", extraColumns: [] });
        }

        const day = days[dayNumber];
        const updatedExtraColumns = [...(day.extraColumns || [])];
        updatedExtraColumns[extraColumnIndex] = newExtraColumnValue;

        days[dayNumber] = {
            ...day,
            extraColumns: updatedExtraColumns
        };

        nextUserTable[userIndex] = {
            ...user,
            days
        };

        executeCommand({
            action: () => setUserTable(createUndoSnapshot(nextUserTable)),
            undoAction: () => setUserTable(createUndoSnapshot(previousUserTable)),
            description: "Set Day Column Value"
        });
    };

    const UNDOABLEsetDayColumnTitle = (columnIndex: number, newTitle: string) => {
        const previousTitles = createUndoSnapshot(userTableTitle?.value ?? { extraUserColumns: [], extraDayColumns: [] });
        const nextTitles = createUndoSnapshot(getNormalizedState({ titles: previousTitles }).titles);
        nextTitles.extraDayColumns[columnIndex] = newTitle;

        executeCommand({
            action: () => setUserTableTitle(createUndoSnapshot(nextTitles)),
            undoAction: () => setUserTableTitle(createUndoSnapshot(previousTitles)),
            description: "Set Day Column Title"
        });
    };

    const setDayBaseColumnSize = (columnKey: 'vote' | 'action', size: ColumnSizeOption) => {
        const currentSizes = columnSizes.value ?? defaultPlayerPageColumnSizes;
        setColumnSizes({
            ...currentSizes,
            dayBaseColumns: {
                ...currentSizes.dayBaseColumns,
                [columnKey]: size,
            },
        });
    };

    const setDayExtraColumnSize = (columnIndex: number, size: ColumnSizeOption) => {
        const currentSizes = columnSizes.value ?? defaultPlayerPageColumnSizes;
        const nextExtraColumnSizes = [...currentSizes.dayExtraColumns];
        nextExtraColumnSizes[columnIndex] = size;

        setColumnSizes({
            ...currentSizes,
            dayExtraColumns: nextExtraColumnSizes,
        });
    };

    const UNDOABLEaddDayColumn = () => {
        const previousTitles = createUndoSnapshot(userTableTitle?.value ?? { extraUserColumns: [], extraDayColumns: [] });
        const previousUserTable = createUndoSnapshot(userTable?.value ?? []);
        const previousVisibility = createUndoSnapshot(userTableColumnVisibility?.value ?? { extraUserColumns: [], extraDayColumns: [] });
        const previousSizes = createUndoSnapshot(columnSizes.value ?? defaultPlayerPageColumnSizes);

        const newTitle = `Column ${previousTitles.extraDayColumns.length + 1}`;
        const nextTitles = {
            ...previousTitles,
            extraDayColumns: [
                ...previousTitles.extraDayColumns,
                newTitle
            ]
        };

        const nextVisibilityInput = {
            ...previousVisibility,
            extraDayColumns: [
                ...previousVisibility.extraDayColumns,
                true
            ]
        };

        const nextSizesInput = {
            ...previousSizes,
            dayExtraColumns: [
                ...previousSizes.dayExtraColumns,
                'small' as ColumnSizeOption
            ]
        };

        const normalizedNextState = getNormalizedState({
            titles: nextTitles,
            visibility: nextVisibilityInput,
            users: previousUserTable,
            columnSizes: nextSizesInput,
        });

        executeCommand({
            action: () => {
                setUserTableTitle(createUndoSnapshot(normalizedNextState.titles));
                setUserTable(createUndoSnapshot(normalizedNextState.users));
                setUserTableColumnVisibility(createUndoSnapshot(normalizedNextState.visibility));
                setColumnSizes(createUndoSnapshot(normalizedNextState.columnSizes));
            },
            undoAction: () => {
                setUserTableTitle(createUndoSnapshot(previousTitles));
                setUserTable(createUndoSnapshot(previousUserTable));
                setUserTableColumnVisibility(createUndoSnapshot(previousVisibility));
                setColumnSizes(createUndoSnapshot(previousSizes));
            },
            description: "Add Day Column"
        });
    };

    const UNDOABLEdeleteDayColumn = (columnIndex: number) => {
        const previousTitles = createUndoSnapshot(userTableTitle?.value ?? { extraUserColumns: [], extraDayColumns: [] });
        const previousUserTable = createUndoSnapshot(userTable?.value ?? []);
        const previousVisibility = createUndoSnapshot(userTableColumnVisibility?.value ?? { extraUserColumns: [], extraDayColumns: [] });
        const previousSizes = createUndoSnapshot(columnSizes.value ?? defaultPlayerPageColumnSizes);

        const nextTitles = {
            ...previousTitles,
            extraDayColumns: previousTitles.extraDayColumns.filter((_, index) => index !== columnIndex)
        };

        const nextVisibilityInput = {
            ...previousVisibility,
            extraDayColumns: previousVisibility.extraDayColumns.filter((_, index) => index !== columnIndex)
        };

        const nextSizesInput = {
            ...previousSizes,
            dayExtraColumns: previousSizes.dayExtraColumns.filter((_, index) => index !== columnIndex)
        };

        const normalizedNextState = getNormalizedState({
            titles: nextTitles,
            visibility: nextVisibilityInput,
            users: previousUserTable,
            columnSizes: nextSizesInput,
        });

        executeCommand({
            action: () => {
                setUserTableTitle(createUndoSnapshot(normalizedNextState.titles));
                setUserTable(createUndoSnapshot(normalizedNextState.users));
                setUserTableColumnVisibility(createUndoSnapshot(normalizedNextState.visibility));
                setColumnSizes(createUndoSnapshot(normalizedNextState.columnSizes));
            },
            undoAction: () => {
                setUserTableTitle(createUndoSnapshot(previousTitles));
                setUserTable(createUndoSnapshot(previousUserTable));
                setUserTableColumnVisibility(createUndoSnapshot(previousVisibility));
                setColumnSizes(createUndoSnapshot(previousSizes));
            },
            description: "Delete Day Column"
        });
    };

    const dayBaseColumnWidths = {
        vote: getWidthForColumnSize(112, columnSizes.value.dayBaseColumns.vote),
        action: getWidthForColumnSize(112, columnSizes.value.dayBaseColumns.action),
    };

    const extraDayColumnWidths = (userTableTitle?.value?.extraDayColumns ?? []).map((_, index) => {
        return getWidthForColumnSize(112, columnSizes.value.dayExtraColumns[index]);
    });

    return (
        <>
            <Column gap={0} onLayout={onLayout} ref={tableRef}>
                <Row gap={0}>
                    <Column gap={0} className={`border-border border-2 rounded w-min ${className || ''}`}>
                        <DayTitleRow
                            userTableTitle={userTableTitle?.value}
                            userTableColumnVisibility={userTableColumnVisibility?.value}
                            setColumnTitle={UNDOABLEsetDayColumnTitle}
                            onEditStart={() => handleRowEditStart('title')}
                            onEditEnd={handleRowEditEnd}
                            isEditing={editingRow === 'title'}
                            dayBaseColumnWidths={dayBaseColumnWidths}
                            extraDayColumnWidths={extraDayColumnWidths}
                            dayBaseColumnSizes={columnSizes.value.dayBaseColumns}
                            extraDayColumnSizes={columnSizes.value.dayExtraColumns}
                            onSetDayBaseColumnSize={setDayBaseColumnSize}
                            onSetExtraDayColumnSize={setDayExtraColumnSize}
                            onDeleteExtraDayColumn={UNDOABLEdeleteDayColumn}
                        />

                        {users.map((user, index) => (
                            <DayUserRow
                                key={index}
                                user={user}
                                index={index}
                                isLast={index === users.length - 1}
                                dayNumber={dayNumber}
                                setVoteValue={UNDOABLEsetVoteValue}
                                setActionValue={UNDOABLEsetActionValue}
                                setExtraColumnValue={UNDOABLEsetExtraDayColumnValue}
                                userTableColumnVisibility={userTableColumnVisibility?.value}
                                onEditStart={() => handleRowEditStart(index)}
                                onEditEnd={handleRowEditEnd}
                                isEditing={editingRow === index}
                                dayBaseColumnWidths={dayBaseColumnWidths}
                                extraDayColumnWidths={extraDayColumnWidths}
                            />
                        ))}
                    </Column>
                    <Row className='w-12 h-12 bg-light items-center justify-center -z-10'>
                        <AppButton variant="accent" className='w-8 max-h-8 ' onPress={UNDOABLEaddDayColumn}>
                            <PoppinsText weight='bold' color='white' className='text-xl mt-[-0.1rem]'>+</PoppinsText>
                        </AppButton>
                    </Row>

                </Row>

            </Column>
        </>
    );
};

export default DaysTable;
