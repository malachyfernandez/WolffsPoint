import React, { useCallback, useEffect, useState } from 'react';
import PoppinsText from '../ui/text/PoppinsText';
import { useUserList } from 'hooks/useUserList';
import Column from '../layout/Column';
import AppButton from '../ui/buttons/AppButton';
import Row from '../layout/Row';
import UserRow from './UserRow';
import TitleRow from './TitleRow';
import { createUndoSnapshot, useUndoRedo } from 'hooks/useUndoRedo';
import { UserTableItem, UserTableTitle, UserTableColumnVisibility } from 'types/playerTable';
import { normalizePlayerPageState } from './playerTableNormalization';

interface PlayerTableProps {
    gameId: string;
    doSync: boolean;
    setDoSync: (value: boolean) => void;
    isBeingEdited: boolean;
    setIsBeingEdited: (value: boolean) => void;
    className?: string;
    dayDatesArray: Date[];
}

const PlayerTable = ({ gameId, doSync, setDoSync, isBeingEdited, setIsBeingEdited, className, dayDatesArray }: PlayerTableProps) => {
    const { executeCommand } = useUndoRedo();
    const [editingRow, setEditingRow] = useState<'title' | number | null>(null);

    const handleRowEditStart = (rowType: 'title' | number) => {
        setEditingRow(rowType);
        setIsBeingEdited(true);
    };

    const handleRowEditEnd = () => {
        setEditingRow(null);
        setIsBeingEdited(false);
    };

    const [userTable, setUserTable] = useUserList<UserTableItem[]>({
        key: "userTable",
        itemId: gameId,
        privacy: "PUBLIC",
    });
    // User Row.tsx

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

    useEffect(() => {
        const normalizedState = normalizePlayerPageState({
            titles: userTableTitle?.value,
            visibility: userTableColumnVisibility?.value,
            users: userTable?.value,
            targetDayCount: dayDatesArray.length,
        });

        const currentTitles = userTableTitle?.value ?? { extraUserColumns: [], extraDayColumns: [] };
        const currentVisibility = userTableColumnVisibility?.value ?? { extraUserColumns: [], extraDayColumns: [] };
        const currentUsers = userTable?.value ?? [];

        if (JSON.stringify(currentTitles) !== JSON.stringify(normalizedState.titles)) {
            setUserTableTitle(normalizedState.titles);
        }

        if (JSON.stringify(currentVisibility) !== JSON.stringify(normalizedState.visibility)) {
            setUserTableColumnVisibility(normalizedState.visibility);
        }

        if (JSON.stringify(currentUsers) !== JSON.stringify(normalizedState.users)) {
            setUserTable(normalizedState.users);
        }
    }, [dayDatesArray.length, setUserTable, setUserTableColumnVisibility, setUserTableTitle, userTable?.value, userTableColumnVisibility?.value, userTableTitle?.value]);

    const syncAllColumnsToTitles = useCallback(() => {
        const normalizedState = normalizePlayerPageState({
            titles: userTableTitle?.value,
            visibility: userTableColumnVisibility?.value,
            users: userTable?.value,
            targetDayCount: dayDatesArray.length,
        });

        setUserTableColumnVisibility(normalizedState.visibility);
        setUserTable(normalizedState.users);

        return {
            updatedVisibility: normalizedState.visibility,
            updatedUsers: normalizedState.users,
        };
    }, [dayDatesArray.length, setUserTable, setUserTableColumnVisibility, userTable?.value, userTableColumnVisibility?.value, userTableTitle?.value]);

    useEffect(() => {
        if (!doSync) return;

        syncAllColumnsToTitles();
        setDoSync(false);
    }, [doSync, setDoSync, syncAllColumnsToTitles]);

    const UNDOABLEsetLivingState = (userIndex: number, newLivingState: 'alive' | 'dead') => {
        const previousUserTable = createUndoSnapshot(userTable?.value ?? []);
        if (userIndex < 0 || userIndex >= previousUserTable.length) return;

        const nextUserTable = createUndoSnapshot(previousUserTable);
        nextUserTable[userIndex] = {
            ...nextUserTable[userIndex],
            playerData: {
                ...nextUserTable[userIndex].playerData,
                livingState: newLivingState
            }
        };

        executeCommand({
            action: () => setUserTable(createUndoSnapshot(nextUserTable)),
            undoAction: () => setUserTable(createUndoSnapshot(previousUserTable)),
            description: "Change Living State"
        });
    };

    const UNDOABLEsetExtraColumnValue = (userIndex: number, extraColumnIndex: number, newExtraColumnValue: string) => {
        const previousUserTable = createUndoSnapshot(userTable?.value ?? []);
        if (userIndex < 0 || userIndex >= previousUserTable.length) return;

        const nextUserTable = createUndoSnapshot(previousUserTable);
        const currentExtraColumns = nextUserTable[userIndex].playerData.extraColumns || [];
        const updatedExtraColumns = [...currentExtraColumns];
        updatedExtraColumns[extraColumnIndex] = newExtraColumnValue;

        nextUserTable[userIndex] = {
            ...nextUserTable[userIndex],
            playerData: {
                ...nextUserTable[userIndex].playerData,
                extraColumns: updatedExtraColumns
            }
        };

        executeCommand({
            action: () => setUserTable(createUndoSnapshot(nextUserTable)),
            undoAction: () => setUserTable(createUndoSnapshot(previousUserTable)),
            description: "Set Column Value"
        });
    };

    const UNDOABLEsetColumnTitle = (columnIndex: number, newTitle: string) => {
        const previousTitles = createUndoSnapshot(userTableTitle?.value ?? { extraUserColumns: [], extraDayColumns: [] });
        const nextTitles = createUndoSnapshot(previousTitles);
        nextTitles.extraUserColumns[columnIndex] = newTitle;

        executeCommand({
            action: () => setUserTableTitle(createUndoSnapshot(nextTitles)),
            undoAction: () => setUserTableTitle(createUndoSnapshot(previousTitles)),
            description: "Set Column Title"
        });
    };

    const UNDOABLEaddColumn = () => {
        const previousTitles = createUndoSnapshot(userTableTitle?.value ?? { extraUserColumns: [], extraDayColumns: [] });
        const previousUserTable = createUndoSnapshot(userTable?.value ?? []);
        const previousVisibility = createUndoSnapshot(userTableColumnVisibility?.value ?? { extraUserColumns: [], extraDayColumns: [] });

        const newTitle = `Column ${previousTitles.extraUserColumns.length + 1}`;
        const nextTitles = {
            ...previousTitles,
            extraUserColumns: [
                ...previousTitles.extraUserColumns,
                newTitle
            ]
        };

        const nextUserTable = previousUserTable.map((user) => ({
            ...user,
            playerData: {
                ...user.playerData,
                extraColumns: [
                    ...(user.playerData.extraColumns || []),
                    ""
                ]
            }
        }));

        const nextVisibility = {
            ...previousVisibility,
            extraUserColumns: [
                ...previousVisibility.extraUserColumns,
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
            description: "Add Column"
        });
    };

    const UNDOABLEsetColumnVisibility = (columnIndex: number, visibility: boolean) => {
        const previousVisibility = createUndoSnapshot(userTableColumnVisibility?.value ?? { extraUserColumns: [], extraDayColumns: [] });
        const nextVisibility = {
            ...previousVisibility,
            extraUserColumns: previousVisibility.extraUserColumns.map((v, index) =>
                index === columnIndex ? visibility : v
            )
        };

        executeCommand({
            action: () => setUserTableColumnVisibility(createUndoSnapshot(nextVisibility)),
            undoAction: () => setUserTableColumnVisibility(createUndoSnapshot(previousVisibility)),
            description: visibility ? "Show Column" : "Hide Column"
        });
    };

    return (
        <Column gap={0}>
            <Row gap={0}>
                <Column gap={0} className={`border-border border-2 rounded w-min ${className || ''}`}>
                    <TitleRow
                        userTableTitle={userTableTitle?.value}
                        userTableColumnVisibility={userTableColumnVisibility?.value}
                        setColumnTitle={UNDOABLEsetColumnTitle}
                        setColumnVisibility={UNDOABLEsetColumnVisibility}
                        onEditStart={() => handleRowEditStart('title')}
                        onEditEnd={handleRowEditEnd}
                        isEditing={editingRow === 'title'}
                    />

                    {users.map((user, index) => (
                        <UserRow
                            key={index}
                            user={user}
                            index={index}
                            isLast={index === users.length - 1}
                            setLivingState={UNDOABLEsetLivingState}
                            setExtraColumnValue={UNDOABLEsetExtraColumnValue}
                            userTableColumnVisibility={userTableColumnVisibility?.value}
                            onEditStart={() => handleRowEditStart(index)}
                            onEditEnd={handleRowEditEnd}
                            isEditing={editingRow === index}
                            gameId={gameId}
                        />
                    ))}
                </Column>
                <Row className='w-12 h-12 bg-light items-center justify-center -z-10'>
                    <AppButton variant="accent" className='w-8 max-h-8 ' onPress={UNDOABLEaddColumn}>
                        <PoppinsText weight='bold' color='white' className='text-xl mt-[-0.1rem] '>+</PoppinsText>
                    </AppButton>
                </Row>

            </Row>

        </Column>
    );
};

export default PlayerTable;
