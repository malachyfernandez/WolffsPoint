import React, { useEffect, useState, useRef } from 'react';
import PoppinsText from '../ui/text/PoppinsText';
import { useUserList } from 'hooks/useUserList';
import Column from '../layout/Column';
import AppButton from '../ui/buttons/AppButton';
import Row from '../layout/Row';
import DayUserRow from './DayUserRow';
import DayTitleRow from './DayTitleRow';
import { createUndoSnapshot, useUndoRedo } from 'hooks/useUndoRedo';
import { UserTableItem, UserTableTitle, UserTableColumnVisibility } from 'types/playerTable';

interface DaysTableProps {
    gameId: string;
    dayNumber: number;
    isBeingEdited: boolean;
    setIsBeingEdited: (value: boolean) => void;
    className?: string;
    onLayout?: (event: any) => void;
    onWidthChange?: (width: number) => void;
}

const DaysTable = ({ gameId, dayNumber, isBeingEdited, setIsBeingEdited, className, onLayout, onWidthChange }: DaysTableProps) => {
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

    const measureTableWidth = () => {
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
    };

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

    // Measure width when columns change
    useEffect(() => {
        const cleanup = measureTableWidth();
        return cleanup;
    }, [userTableTitle?.value?.extraDayColumns?.length, userTableColumnVisibility?.value?.extraDayColumns]);



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

    const setExtraDayColumnValue = (userIndex: number, extraColumnIndex: number, newExtraColumnValue: string) => {
        const updatedUsers = [...users];
        if (userIndex >= 0 && userIndex < updatedUsers.length) {
            const user = updatedUsers[userIndex];
            const days = [...user.days];

            // Ensure the day exists
            while (days.length <= dayNumber) {
                days.push({ vote: "", action: "", extraColumns: [] });
            }

            const day = days[dayNumber];
            const currentExtraColumns = day.extraColumns || [];
            const updatedExtraColumns = [...currentExtraColumns];
            updatedExtraColumns[extraColumnIndex] = newExtraColumnValue;

            days[dayNumber] = {
                ...day,
                extraColumns: updatedExtraColumns
            };

            updatedUsers[userIndex] = {
                ...user,
                days: days
            };
            setUserTable(updatedUsers);
        }
    };

    const UNDOABLEsetExtraDayColumnValue = (userIndex: number, extraColumnIndex: number, newExtraColumnValue: string) => {
        const previousUserTable = createUndoSnapshot(userTable?.value ?? []);
        if (userIndex < 0 || userIndex >= previousUserTable.length) return;

        const nextUserTable = createUndoSnapshot(previousUserTable);
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

    const setDayColumnTitle = (columnIndex: number, newTitle: string) => {
        const currentTitles = userTableTitle?.value ?? { extraUserColumns: [], extraDayColumns: [] };
        const updatedExtraDayColumns = [...currentTitles.extraDayColumns];
        updatedExtraDayColumns[columnIndex] = newTitle;

        const updatedTitles = {
            ...currentTitles,
            extraDayColumns: updatedExtraDayColumns
        };
        setUserTableTitle(updatedTitles);
    };

    const UNDOABLEsetDayColumnTitle = (columnIndex: number, newTitle: string) => {
        const previousTitles = createUndoSnapshot(userTableTitle?.value ?? { extraUserColumns: [], extraDayColumns: [] });
        const nextTitles = createUndoSnapshot(previousTitles);
        nextTitles.extraDayColumns[columnIndex] = newTitle;

        executeCommand({
            action: () => setUserTableTitle(createUndoSnapshot(nextTitles)),
            undoAction: () => setUserTableTitle(createUndoSnapshot(previousTitles)),
            description: "Set Day Column Title"
        });
    };

    const addDayColumn = (title?: string, values?: string[], index?: number | "Last") => {
        // Add new column title
        const currentTitles = userTableTitle?.value ?? { extraUserColumns: [], extraDayColumns: [] };
        const newTitle = title ?? `Column ${currentTitles.extraDayColumns.length + 1}`;

        // ALWAYS add to the end
        const updatedTitles = {
            ...currentTitles,
            extraDayColumns: [
                ...currentTitles.extraDayColumns,
                newTitle
            ]
        };
        setUserTableTitle(updatedTitles);

        // Add new column value to each user's day at the end
        const updatedUsers = users.map((user, userIndex) => {
            const days = [...user.days];

            // Ensure the day exists
            while (days.length <= dayNumber) {
                days.push({ vote: "", action: "", extraColumns: [] });
            }

            const day = days[dayNumber];
            days[dayNumber] = {
                ...day,
                extraColumns: [
                    ...(day.extraColumns || []),
                    values?.[userIndex] ?? ""
                ]
            };

            return {
                ...user,
                days: days
            };
        });
        setUserTable(updatedUsers);

        // Add visibility for new column (default to visible)
        const currentVisibility = userTableColumnVisibility?.value ?? { extraUserColumns: [], extraDayColumns: [] };
        const updatedVisibility = {
            ...currentVisibility,
            extraDayColumns: [
                ...currentVisibility.extraDayColumns,
                true
            ]
        };
        setUserTableColumnVisibility(updatedVisibility);
    };

    const UNDOABLEaddDayColumn = () => {
        const previousTitles = createUndoSnapshot(userTableTitle?.value ?? { extraUserColumns: [], extraDayColumns: [] });
        const previousUserTable = createUndoSnapshot(userTable?.value ?? []);
        const previousVisibility = createUndoSnapshot(userTableColumnVisibility?.value ?? { extraUserColumns: [], extraDayColumns: [] });

        const newTitle = `Column ${previousTitles.extraDayColumns.length + 1}`;
        const nextTitles = {
            ...previousTitles,
            extraDayColumns: [
                ...previousTitles.extraDayColumns,
                newTitle
            ]
        };

        const nextUserTable = previousUserTable.map((user) => {
            const days = [...user.days];

            while (days.length <= dayNumber) {
                days.push({ vote: "", action: "", extraColumns: [] });
            }

            const day = days[dayNumber];
            days[dayNumber] = {
                ...day,
                extraColumns: [
                    ...(day.extraColumns || []),
                    ""
                ]
            };

            return {
                ...user,
                days
            };
        });

        const nextVisibility = {
            ...previousVisibility,
            extraDayColumns: [
                ...previousVisibility.extraDayColumns,
                true
            ]
        };

        executeCommand({
            action: () => {
                setUserTableTitle(createUndoSnapshot(nextTitles));
                setUserTable(createUndoSnapshot(nextUserTable));
                setUserTableColumnVisibility(createUndoSnapshot(nextVisibility));
            },
            undoAction: () => {
                setUserTableTitle(createUndoSnapshot(previousTitles));
                setUserTable(createUndoSnapshot(previousUserTable));
                setUserTableColumnVisibility(createUndoSnapshot(previousVisibility));
            },
            description: "Add Day Column"
        });
    };

    const setDayColumnVisibility = (columnIndex: number, visibility: boolean) => {
        // Update column visibility
        const currentVisibility = userTableColumnVisibility?.value ?? { extraUserColumns: [], extraDayColumns: [] };
        const updatedVisibility = {
            ...currentVisibility,
            extraDayColumns: currentVisibility.extraDayColumns.map((v, index) =>
                index === columnIndex ? visibility : v
            )
        };
        setUserTableColumnVisibility(updatedVisibility);
    };

    const UNDOABLEsetDayColumnVisibility = (columnIndex: number, visibility: boolean) => {
        const previousVisibility = createUndoSnapshot(userTableColumnVisibility?.value ?? { extraUserColumns: [], extraDayColumns: [] });
        const nextVisibility = {
            ...previousVisibility,
            extraDayColumns: previousVisibility.extraDayColumns.map((v, index) =>
                index === columnIndex ? visibility : v
            )
        };

        executeCommand({
            action: () => setUserTableColumnVisibility(createUndoSnapshot(nextVisibility)),
            undoAction: () => setUserTableColumnVisibility(createUndoSnapshot(previousVisibility)),
            description: visibility ? "Show Day Column" : "Hide Day Column"
        });
    };

    return (
        <>
            <Column gap={0} onLayout={onLayout} ref={tableRef}>
                <Row gap={0}>
                    <Column gap={0} className={`border-border border-2 rounded w-min ${className || ''}`}>
                        <DayTitleRow
                            userTableTitle={userTableTitle?.value}
                            userTableColumnVisibility={userTableColumnVisibility?.value}
                            setColumnTitle={UNDOABLEsetDayColumnTitle}
                            setColumnVisibility={UNDOABLEsetDayColumnVisibility}
                            onEditStart={() => handleRowEditStart('title')}
                            onEditEnd={handleRowEditEnd}
                            isEditing={editingRow === 'title'}
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
                            />
                        ))}
                    </Column>
                    <Row className='w-12 h-12 bg-light items-center justify-center -z-10'>
                        <AppButton variant="green" className='w-8 max-h-8 ' onPress={UNDOABLEaddDayColumn}>
                            <PoppinsText weight='bold' color='white' className='text-xl mt-[-0.1rem]'>+</PoppinsText>
                        </AppButton>
                    </Row>

                </Row>

            </Column>
        </>
    );
};

export default DaysTable;
