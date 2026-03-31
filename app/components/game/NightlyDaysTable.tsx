import React, { useEffect, useState } from 'react';
import PoppinsText from '../ui/text/PoppinsText';
import { useUserList } from 'hooks/useUserList';
import Column from '../layout/Column';
import Row from '../layout/Row';
import NightlyDayUserRow from './NightlyDayUserRow';
import NightlyDayTitleRow from './NightlyDayTitleRow';
import { createUndoSnapshot, useUndoRedo } from 'hooks/useUndoRedo';
import { UserTableItem } from 'types/playerTable';

interface NightlyDaysTableProps {
    gameId: string;
    dayNumber: number;
    isBeingEdited: boolean;
    setIsBeingEdited: (value: boolean) => void;
    className?: string;
    onLayout?: (event: any) => void;
    onWidthChange?: (width: number) => void;
    nightlyResponseList: Record<string, string[]>;
    nightlyMessagesList: Record<string, string[]>;
    updateNightlyResponse: (dayIndex: number, userIndex: number, value: string) => void;
    updateNightlyMessage: (dayIndex: number, userIndex: number, value: string) => void;
}

const NightlyDaysTable = ({ 
    gameId, 
    dayNumber, 
    isBeingEdited, 
    setIsBeingEdited, 
    className, 
    onLayout, 
    onWidthChange,
    nightlyResponseList,
    nightlyMessagesList,
    updateNightlyResponse,
    updateNightlyMessage
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

    const measureTableWidth = () => {
        if (tableRef.current && onWidthChange) {
            // Use setTimeout to ensure layout is updated after state changes
            setTimeout(() => {
                tableRef.current.measure((x: number, y: number, width: number, height: number) => {
                    onWidthChange(width);
                });
            }, 0);
        }
    };

    const [userTable, setUserTable] = useUserList<UserTableItem[]>({
        key: "userTable",
        itemId: gameId,
        privacy: "PUBLIC",
    });

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

    const UNDOABLEupdateNightlyResponse = (dayIndex: number, userIndex: number, value: string) => {
        const user = users[userIndex];
        if (!user) return;
        
        const previousResponseList = createUndoSnapshot(nightlyResponseList);
        const nextResponseList = createUndoSnapshot(previousResponseList);
        
        if (!nextResponseList[user.email]) {
            nextResponseList[user.email] = [];
        }
        
        const userResponses = [...nextResponseList[user.email]];
        userResponses[dayIndex] = value;
        nextResponseList[user.email] = userResponses;

        executeCommand({
            action: () => updateNightlyResponse(dayIndex, userIndex, value),
            undoAction: () => {
                // Restore previous state
                if (previousResponseList[user.email] && nextResponseList[user.email]) {
                    updateNightlyResponse(dayIndex, userIndex, previousResponseList[user.email][dayIndex] || "");
                }
            },
            description: "Update Nightly Response"
        });
    };

    const UNDOABLEupdateNightlyMessage = (dayIndex: number, userIndex: number, value: string) => {
        const user = users[userIndex];
        if (!user) return;
        
        const previousMessagesList = createUndoSnapshot(nightlyMessagesList);
        const nextMessagesList = createUndoSnapshot(previousMessagesList);
        
        if (!nextMessagesList[user.email]) {
            nextMessagesList[user.email] = [];
        }
        
        const userMessages = [...nextMessagesList[user.email]];
        userMessages[dayIndex] = value;
        nextMessagesList[user.email] = userMessages;

        executeCommand({
            action: () => updateNightlyMessage(dayIndex, userIndex, value),
            undoAction: () => {
                // Restore previous state
                if (previousMessagesList[user.email] && nextMessagesList[user.email]) {
                    updateNightlyMessage(dayIndex, userIndex, previousMessagesList[user.email][dayIndex] || "");
                }
            },
            description: "Update Nightly Message"
        });
    };

    return (
        <Column gap={0} onLayout={onLayout} ref={tableRef}>
            <Row gap={0}>
                <Column gap={0} className={`border-border border-2 rounded w-min ${className || ''}`}>
                    <NightlyDayTitleRow
                        onEditStart={() => handleRowEditStart('title')}
                        onEditEnd={handleRowEditEnd}
                        isEditing={editingRow === 'title'}
                    />

                    {users.map((user, index) => (
                        <NightlyDayUserRow
                            key={index}
                            user={user}
                            index={index}
                            isLast={index === users.length - 1}
                            dayNumber={dayNumber}
                            setVoteValue={UNDOABLEsetVoteValue}
                            setActionValue={UNDOABLEsetActionValue}
                            updateNightlyResponse={UNDOABLEupdateNightlyResponse}
                            updateNightlyMessage={UNDOABLEupdateNightlyMessage}
                            onEditStart={() => handleRowEditStart(index)}
                            onEditEnd={handleRowEditEnd}
                            isEditing={editingRow === index}
                            nightlyResponseList={nightlyResponseList}
                            nightlyMessagesList={nightlyMessagesList}
                        />
                    ))}
                </Column>
            </Row>
        </Column>
    );
};

export default NightlyDaysTable;
