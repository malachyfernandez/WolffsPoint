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
    nightlyResponseList: string[][];
    nightlyMessagesList: string[][];
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

    const UNDOABLEupdateNightlyResponse = (dayIndex: number, userIndex: number, value: string) => {
        const previousResponseList = createUndoSnapshot(nightlyResponseList);
        const nextResponseList = createUndoSnapshot(previousResponseList);
        
        if (nextResponseList[dayIndex]) {
            nextResponseList[dayIndex][userIndex] = value;
        }

        executeCommand({
            action: () => updateNightlyResponse(dayIndex, userIndex, value),
            undoAction: () => {
                // Restore previous state by updating each changed value
                if (previousResponseList[dayIndex] && nextResponseList[dayIndex]) {
                    for (let i = 0; i < previousResponseList[dayIndex].length; i++) {
                        if (previousResponseList[dayIndex][i] !== nextResponseList[dayIndex][i]) {
                            updateNightlyResponse(dayIndex, i, previousResponseList[dayIndex][i]);
                        }
                    }
                }
            },
            description: "Update Nightly Response"
        });
    };

    const UNDOABLEupdateNightlyMessage = (dayIndex: number, userIndex: number, value: string) => {
        const previousMessagesList = createUndoSnapshot(nightlyMessagesList);
        const nextMessagesList = createUndoSnapshot(previousMessagesList);
        
        if (nextMessagesList[dayIndex]) {
            nextMessagesList[dayIndex][userIndex] = value;
        }

        executeCommand({
            action: () => updateNightlyMessage(dayIndex, userIndex, value),
            undoAction: () => {
                // Restore previous state by updating each changed value
                if (previousMessagesList[dayIndex] && nextMessagesList[dayIndex]) {
                    for (let i = 0; i < previousMessagesList[dayIndex].length; i++) {
                        if (previousMessagesList[dayIndex][i] !== nextMessagesList[dayIndex][i]) {
                            updateNightlyMessage(dayIndex, i, previousMessagesList[dayIndex][i]);
                        }
                    }
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
